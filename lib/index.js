"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const prettier_1 = __importDefault(require("prettier"));
const http = __importStar(require("http"));
const TMETHOD = [
    'get',
    'put',
    'post',
    'delete',
    'options',
    'head',
    'patch',
];
function getRefName(ref) {
    return ref.replace(/^#\/definitions\//, '');
}
function objToString(obj) {
    const result = ['{'];
    Object.keys(obj).forEach((k) => {
        const val = obj[k];
        result.push(JSON.stringify(k) + ':');
        if (typeof val !== 'object') {
            result.push(`${val};`);
        }
        else {
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
const stringToPath = function (str) {
    var result = [];
    if (str.charCodeAt(0) === 46 /* . */) {
        result.push('');
    }
    str.replace(rePropName, (match, num, quote, subString) => {
        result.push(quote ? subString.replace(reEscapeChar, '$1') : num || match);
        return '';
    });
    return result;
};
class Generator {
    constructor(data) {
        this.docs = JSON.parse(data);
    }
    generate() {
        const result = [];
        const definitions = this.docs.definitions;
        if (definitions) {
            Object.keys(definitions).forEach((def) => {
                const body = definitions[def];
                result.push(this.generateInterface(def, body));
            });
        }
        result.push(this.generateAPI());
        return result.join('\n');
    }
    generateAPI() {
        const result = [];
        const paths = this.docs.paths;
        Object.keys(paths).forEach((url) => {
            const path = paths[url];
            TMETHOD.forEach((method) => {
                if (path[method] === undefined) {
                    return;
                }
                const res = this.generateMethod(method, url, path[method]);
                result.push(res);
            });
        });
        result.push(`get(m: string, url: string, param: any, body: any): Promise<any> {`, `url = !param ? url : Object.keys(param).reduce((memo, key) => memo.replace(new RegExp('{' + key + '}'), param[key]), url);`, `return this.call(m, url, body);`, `}`);
        return [
            'export type IFileType$$ = string;',
            'export abstract class API {',
            'abstract call(m: string, url: string, body: any): Promise<any>;\n',
            result.join('\n'),
            '}',
        ].join('\n');
    }
    generateInterface(name, schema) {
        return [
            schema.description ? `// ${schema.description}` : '',
            `export interface ${name}` + this.generateProperties(schema),
        ]
            .filter((p) => p)
            .join('\n');
    }
    generateProperties(schema) {
        var _a;
        const result = [];
        if (schema.$ref) {
            result.push(getRefName(schema.$ref));
        }
        switch (schema.type) {
            case 'object':
                {
                    result.push('{');
                    const props = (_a = schema.properties) !== null && _a !== void 0 ? _a : {};
                    Object.keys(props).forEach((key) => {
                        const p = props[key];
                        result.push(`${key}: ${this.generateProperties(p)};`);
                    });
                    result.push('}');
                }
                break;
            case 'array':
                {
                    const items = schema.items;
                    const itemType = Array.isArray(items)
                        ? items.map((item) => this.generateProperties(item)).join(' | ')
                        : items
                            ? this.generateProperties(items)
                            : 'unknown';
                    result.push(`Array<${itemType}>`);
                }
                break;
            case 'string':
                if (schema.enum) {
                    result.push(schema.enum.map((p) => JSON.stringify(p)).join('|'));
                }
                else {
                    result.push('string');
                }
                break;
            case 'boolean':
            case 'Boolean':
                if (schema.enum) {
                    result.push(schema.enum.join('|'));
                }
                else {
                    result.push('boolean');
                }
                break;
            case 'number':
            case 'integer':
            case 'float':
                if (schema.enum) {
                    result.push(schema.enum.join('|'));
                }
                else {
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
    generateMethod(method, url, operation) {
        const result = [];
        if (operation.description) {
            result.push(`\n// ${operation.description}`);
        }
        const params = operation.parameters
            ? operation.parameters.filter((p) => p.in === 'path')
            : [];
        let paramsType = 'null';
        if (params.length) {
            const obj = params.reduce((memo, param) => {
                var _a;
                const namePath = stringToPath(param.name);
                let ptr = memo;
                const value = this.generateProperties(param);
                for (let i = 0, iLen = namePath.length; i < iLen; i++) {
                    if (i + 1 === iLen) {
                        ptr[namePath[i]] = value;
                    }
                    else {
                        ptr = (_a = ptr[namePath[i]]) !== null && _a !== void 0 ? _a : (ptr[namePath[i]] = {});
                    }
                }
                return memo;
            }, {});
            paramsType = objToString(obj);
        }
        const body = operation.parameters
            ? operation.parameters.filter((p) => p.in === 'formData')
            : [];
        const resultType = Object.keys(operation.responses)
            .reduce((memo, key) => {
            const item = operation.responses[key];
            const ref = item;
            if (ref.$ref) {
                memo.push(getRefName(ref.$ref));
            }
            else {
                const res = item;
                if (res.schema) {
                    const name = this.generateProperties(res.schema);
                    memo.push(name);
                }
            }
            return memo;
        }, [])
            .join('|') || 'unknown';
        let bodyType = 'null';
        if (body.length) {
            const obj = body.reduce((memo, param) => {
                var _a;
                const namePath = stringToPath(param.name);
                let ptr = memo;
                const value = this.generateProperties(param);
                for (let i = 0, iLen = namePath.length; i < iLen; i++) {
                    if (i + 1 === iLen) {
                        ptr[namePath[i]] = value;
                    }
                    else {
                        ptr = (_a = ptr[namePath[i]]) !== null && _a !== void 0 ? _a : (ptr[namePath[i]] = {});
                    }
                }
                return memo;
            }, {});
            bodyType = objToString(obj);
        }
        const paramTocken = paramsType === 'null' && bodyType === 'null'
            ? 'param?: null'
            : `param: ${paramsType}`;
        const bodyTocken = bodyType === 'null' ? 'body?: null' : `body: ${bodyType}`;
        result.push(`get(m: '${method}', url: '${url}', ${paramTocken}, ${bodyTocken}): Promise<${resultType}>;`);
        return result.join('\n');
    }
}
function read(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            const data = [];
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
read(process.argv[2]).then((data) => {
    const gen = new Generator(data);
    const code = gen.generate();
    return prettier_1.default.format(code, {
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        parser: 'typescript',
    });
}).then(console.log);
//# sourceMappingURL=index.js.map