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

function normalize(modelName?: string) {
  return modelName?.replace(/[^a-zA-Z0-9]/g, '');
}

function getRefName(ref?: string) {
  return normalize(ref?.replace(/^#\/definitions\//, ''));
}

function isAnyLeafRequired(leaf: Leaf) {
  if (leaf.required) {
    return true;
  }
  if (leaf.required === false) {
    return false;
  }
  if (Array.isArray(leaf.value)) {
    if (leaf.value.find(isAnyLeafRequired)) {
      return true;
    }
  }
  return false;
}

function stringifyLeafs(leafs: Leaf[]): string {
  const result: string[] = ['{'];

  leafs.forEach((leaf) => {
    result.push(JSON.stringify(leaf.name));
    result.push(isAnyLeafRequired(leaf) ? ':' : '?:');
    if (Array.isArray(leaf.value)) {
      result.push(`${stringifyLeafs(leaf.value)};`);
    } else {
      result.push(`${leaf.value};`);
    }
    if (leaf.description) {
      result.push(` /* ${leaf.description} */\n`);
    }
  });
  result.push('}');
  return result.join('');
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
    result.push(getRefName(schema.$ref)!);
  }

  switch (schema.type as string) {
    case 'object':
      {
        result.push('{');
        const props = schema.properties ?? {};
        const required = schema.required;
        Object.keys(props).forEach((key) => {
          const p = props[key];
          const optional = !required || required.indexOf(key) >= 0 ? '' : '?';
          const line = `${key}${optional}: ${generateProperties(p)};`
          result.push(line);
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
    case 'text':
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
      break;

    case undefined:
      const ptr = (schema as any);
      if (ptr.schema) {
        result.push(getRefName(ptr.schema.$ref)!);
      }
      break;
    default:
      break;
  }

  return result.join('\n');
}

type TSchema = Swagger.BaseSchema & { name: string; required: boolean };

interface Leaf {
  name: string;
  value: string | Leaf[];
  description: string | undefined;
  required: boolean | undefined;
}

function transformSchema2Leafs<T extends TSchema>(
  params: T[] | undefined,
  def = 'null'
) {
  if (!params || !params.length) {
    return def;
  }
  const obj = params.reduce(
    (memo: Leaf, param: T) => {
      const namePath = stringToPath(param.name);
      const value = generateProperties(param as any);
      let ptr = memo;

      for (let i = 0, iLen = namePath.length; i < iLen; i++) {
        const name = namePath[i];
        let item: Leaf = Array.isArray(ptr.value)
          ? ptr.value.find((it) => it.name === name)
          : // it's ok :)
            (undefined as any);
        if (!item) {
          const leaf: Leaf = {
            name: namePath[i],
            required: !!param.required,
            description: param.description,
            value,
          };
          item = leaf;
          if (Array.isArray(ptr.value)) {
            ptr.value.push(leaf);
          } else {
            // sorry I override it
            ptr.description = undefined;
            ptr.value = [leaf];
          }
        } else {
          if (!item.required) {
            item.required = param.required;
          }
        }
        ptr = item;
      }
      return memo;
    },
    {
      name: 'root',
      description: undefined,
      required: undefined,
      value: [],
    } as Leaf
  );
  return obj.value as Leaf[];
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
          memo.push(getRefName(ref.$ref)!);
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

  result.push(
    `request(param: ${requestName} & TOptions): Promise<${resultType}>;`
  );

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
        const schema = groups[groupName];
        const leafs = transformSchema2Leafs(schema);
        if (typeof leafs !== 'string') {
          const val = stringifyLeafs(leafs);
          if (val !== 'null') {
            const name = `I${upperFirst(groupName)}${NameParam}`;
            typesResult.push(`export interface ${name} ${val}`);
            const isRequired = !!leafs.find(isAnyLeafRequired);
            memo.push({
              name: groupName,
              value: name,
              description: undefined,
              required: isRequired,
            });
          }
        }
        return memo;
      }, [] as Leaf[]);

      const RequestName = `I${NameParam}Request`;
      const typeParamsList = [
        {
          name: 'method',
          description: undefined,
          value: JSON.stringify(method.toUpperCase()),
          required: true,
        },
        {
          name: 'url',
          value: JSON.stringify(url),
          required: true,
          description: undefined,
        },
        ...options,
      ];
      const typeParams = stringifyLeafs(typeParamsList);
      typesResult.push(`export interface ${RequestName} ${typeParams}`);

      const res = generateMethod(RequestName, path[method]!);
      result.push(res);
    });
  });

  result.push(
    `request(params: IOptionsBaseT<{}> & TOptions): Promise<any> {
        const options: any = params;
        if (options.path) {
          options.url = Object.keys(options.path).reduce(
            (memo, key) =>
              memo.replace(new RegExp('{' + key + '}'), options.path[key]),
            options.url
          );
        }
        if (options.query) {
          const query = Object.keys(options.query).reduce((memo, key) => {
            memo.push(key + '=' + options.query[key]);
            return memo;
          }, [] as string[]);
          if (query.length) {
            options.url +=
              (options.url.indexOf('?') === -1 ? '?' : '') + query.join('&');
          }
        }
        return this.call(options);
    }`
  );

  return [
    typesResult.join('\n'),
    'export type IFileType$$ = string;',
    'export interface IOptionsBaseT<T> { body?: T; query?: T; header?: T; formData?: T; path?: T; url: string; method: string }',
    'export abstract class API<TOptions = {}> {',
    'abstract call(param: IOptionsBaseT<any> & TOptions): Promise<any>;\n',
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
        `export interface ${normalize(def)}` + generateProperties(schema),
      ]
        .filter((p) => p)
        .join('\n');
      result.push(code);
    });
  }
  result.push(generateAPI(docs));

  return result.join('\n');
}
