import type * as Swagger from 'swagger-schema-official';

import groupBy from 'lodash/groupBy';
import upperFirst from 'lodash/upperFirst';

type TKey = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
const TMETHOD: TKey[] = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
];

function getRefName(ref: string) {
  return ref.replace(/^#\/definitions\//, '');
}

function objToString(obj: any): string {
  const result: string[] = ['{'];
  Object.keys(obj).forEach((k) => {
    const val = obj[k];
    if (k[k.length - 1] === '?') {
      result.push(JSON.stringify(k.slice(0, k.length - 1)) + '?:');
    } else {
      result.push(JSON.stringify(k) + ':');
    }

    if (typeof val !== 'object') {
      result.push(`${val};`);
    } else {
      result.push(`${objToString(val)};`);
    }
  });
  return result.concat('}').join('');
}

/** Used to match property names within property paths. */
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
const stringToPath = function (str: string) {
  var result = [];
  if (str.charCodeAt(0) === 46 /* . */) {
    result.push('');
  }
  str.replace(
    rePropName,
    (match: any, num: any, quote: any, subString: any) => {
      result.push(quote ? subString.replace(reEscapeChar, '$1') : num || match);
      return '';
    }
  );
  return result;
};

function generateProperties(schema: Swagger.Schema): string {
  const result: string[] = [];

  if (schema.$ref) {
    result.push(getRefName(schema.$ref));
  }

  switch (schema.type as string) {
    case 'object':
      {
        result.push('{');
        const props = schema.properties ?? {};
        Object.keys(props).forEach((key) => {
          const p = props[key];
          result.push(`${key}: ${generateProperties(p)};`);
        });
        result.push('}');
      }
      break;
    case 'array':
      {
        const items = schema.items;
        const itemType = Array.isArray(items)
          ? items.map((item) => generateProperties(item)).join(' | ')
          : items
          ? generateProperties(items)
          : 'unknown';
        result.push(`Array<${itemType}>`);
      }
      break;

    case 'string':
      if (schema.enum) {
        result.push(schema.enum.map((p) => JSON.stringify(p)).join('|'));
      } else {
        result.push('string');
      }
      break;

    case 'boolean':
    case 'Boolean':
      if (schema.enum) {
        result.push(schema.enum.join('|'));
      } else {
        result.push('boolean');
      }
      break;

    case 'number':
    case 'integer':
    case 'float':
      if (schema.enum) {
        result.push(schema.enum.join('|'));
      } else {
        result.push('number');
      }
      break;

    case 'file':
      result.push('IFileType$$');
    default:
      break;
  }

  return result.join('\n');
}

type TSchema = Swagger.BaseSchema & { name: string; required: boolean };

function transformInputSchema<T extends TSchema>(
  params: T[] | undefined,
  def = 'null'
) {
  if (!params || !params.length) {
    return def;
  }
  const obj = params.reduce((memo: any, param: T) => {
    const namePath = stringToPath(param.name);
    let ptr = memo;
    const value = generateProperties(param);
    for (let i = 0, iLen = namePath.length; i < iLen; i++) {
      if (i + 1 === iLen) {
        const name = param.required ? namePath[i] : `${namePath[i]}?`;
        ptr[name] = value;
      } else {
        ptr = ptr[namePath[i]] ?? (ptr[namePath[i]] = {});
      }
    }
    return memo;
  }, {} as any);
  return objToString(obj);
}

function generateMethod(requestName: string, operation: Swagger.Operation) {
  const result: string[] = [];
  if (operation.description) {
    result.push(`\n// ${operation.description}`);
  }

  const resultType =
    Object.keys(operation.responses)
      .reduce((memo, key) => {
        const item = operation.responses[key];

        const ref = item as Swagger.Reference;

        if (ref.$ref) {
          memo.push(getRefName(ref.$ref));
        } else {
          const res = item as Swagger.Response;

          if (res.schema) {
            const name = generateProperties(res.schema);
            memo.push(name);
          }
        }

        return memo;
      }, [] as string[])
      .join('|') || 'unknown';

  result.push(`get(param: ${requestName} & TOptions): Promise<${resultType}>;`);

  return result.join('\n');
}

function generateAPI(docs: Swagger.Spec) {
  const result: string[] = [];
  const typesResult: string[] = [];

  const paths = docs.paths;

  Object.keys(paths).forEach((url) => {
    const path = paths[url];
    TMETHOD.forEach((method) => {
      if (path[method] === undefined) {
        return;
      }
      const operation = path[method]!;

      const groups = groupBy<TSchema>(
        (operation.parameters?.filter((p: any) => p.in) as any) ?? [],
        (p: any) => p.in
      );

      const NameParam = upperFirst(operation.operationId!);
      const options = Object.keys(groups).reduce((memo, groupName) => {
        const val = transformInputSchema(groups[groupName]);
        if (val !== 'null') {
          const name = `I${upperFirst(groupName)}${NameParam}`;
          typesResult.push(`export interface ${name} ${val}`);
          memo[groupName] = name;
        }
        return memo;
      }, {} as Record<string, string>);

      const RequestName = `I${NameParam}Request`;
      const typeParams = objToString({
        method: JSON.stringify(method.toUpperCase()),
        url: JSON.stringify(url),
        ...options,
      });
      typesResult.push(`export interface ${RequestName} ${typeParams}`);

      const res = generateMethod(RequestName, path[method]!);
      result.push(res);
    });
  });

  result.push(
    `get({ path, ...options}: any): Promise<any> {`,
    `options.url = !path ? options.url : Object.keys(path).reduce((memo, key) => memo.replace(new RegExp('{' + key + '}'), path[key]), options.url);`,
    `return this.call(options);`,
    `}`
  );

  return [
    typesResult.join('\n'),
    'export type IFileType$$ = string;',
    'export interface IOptionsBase$$ { body?: any; query?: any; header?: any; formData?: any; }',
    'export abstract class API<TOptions = {}> {',
    'abstract call(param: any & TOptions): Promise<any>;\n',
    result.join('\n'),
    '}',
  ].join('\n');
}

export function generate(docs: Swagger.Spec) {
  const result: string[] = [];
  const definitions = docs.definitions;
  if (definitions) {
    Object.keys(definitions).forEach((def) => {
      const schema = definitions[def];
      const code = [
        schema.description ? `// ${schema.description}` : '',
        `export interface ${def}` + generateProperties(schema),
      ]
        .filter((p) => p)
        .join('\n');
      result.push(code);
    });
  }
  result.push(generateAPI(docs));

  return result.join('\n');
}
