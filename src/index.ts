import * as Swagger from 'swagger-schema-official';
import prettier from 'prettier';
import * as http from 'http';

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

function convert<
  T extends Swagger.BaseSchema & { name: string; required: boolean }
>(params: T[] | undefined, def = 'null') {
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

function generateInterface(name: string, schema: Swagger.Schema): string {
  return [
    schema.description ? `// ${schema.description}` : '',
    `export interface ${name}` + generateProperties(schema),
  ]
    .filter((p) => p)
    .join('\n');
}

function generateMethod(
  method: string,
  url: string,
  operation: Swagger.Operation
) {
  const result: string[] = [];
  if (operation.description) {
    result.push(`\n// ${operation.description}`);
  }
  const paramsType = convert(
    operation.parameters?.filter((p: any) => p.in === 'path') as any
  );
  const bodyType = convert(
    operation.parameters?.filter((p: any) => p.in === 'formData') as any
  );

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

  const paramTocken =
    paramsType === 'null' && bodyType === 'null'
      ? 'param?: null'
      : `param: ${paramsType}`;

  const bodyTocken = bodyType === 'null' ? 'body?: null' : `body: ${bodyType}`;

  result.push(
    `get(m: '${method}', url: '${url}', ${paramTocken}, ${bodyTocken}): Promise<${resultType}>;`
  );

  return result.join('\n');
}

function generateAPI(docs: Swagger.Spec) {
  const result: string[] = [];
  const paths = docs.paths;

  Object.keys(paths).forEach((url) => {
    const path = paths[url];
    TMETHOD.forEach((method) => {
      if (path[method] === undefined) {
        return;
      }
      const res = generateMethod(method, url, path[method]!);
      result.push(res);
    });
  });

  result.push(
    `get(m: string, url: string, param: any, body: any): Promise<any> {`,
    `url = !param ? url : Object.keys(param).reduce((memo, key) => memo.replace(new RegExp('{' + key + '}'), param[key]), url);`,
    `return this.call(m, url, body);`,
    `}`
  );

  return [
    'export type IFileType$$ = string;',
    'export abstract class API {',
    'abstract call(m: string, url: string, body: any): Promise<any>;\n',
    result.join('\n'),
    '}',
  ].join('\n');
}

function generate(docs: Swagger.Spec) {
  const result: string[] = [];
  const definitions = docs.definitions;
  if (definitions) {
    Object.keys(definitions).forEach((def) => {
      const body = definitions[def];
      result.push(generateInterface(def, body));
    });
  }
  result.push(generateAPI(docs));

  return result.join('\n');
}

function read(url: string) {
  return new Promise<any>((resolve, reject) => {
    http.get(url, (res) => {
      const data: string[] = [];
      res.on('data', (chunk) => {
        data.push(chunk);
      });
      res.on('close', () => {
        resolve(data.join(''));
      });
      res.on('error', (err) => reject(err));
    });
  });
}

if (process.argv.length !== 3) {
  process.exit(1);
}

read(process.argv[2])
  .then((data) => {
    const docs: Swagger.Spec = JSON.parse(data);
    const code = generate(docs);
    return prettier.format(code, {
      tabWidth: 2,
      semi: true,
      singleQuote: true,
      parser: 'typescript',
    });
  })
  .then(console.log);
