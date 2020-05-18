"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const groupBy_1 = __importDefault(require("lodash/groupBy"));
const upperFirst_1 = __importDefault(require("lodash/upperFirst"));
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
        if (k[k.length - 1] === '?') {
            result.push(JSON.stringify(k.slice(0, k.length - 1)) + '?:');
        }
        else {
            result.push(JSON.stringify(k) + ':');
        }
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
function generateProperties(schema) {
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
function transformInputSchema(params, def = 'null') {
    if (!params || !params.length) {
        return def;
    }
    const obj = params.reduce((memo, param) => {
        var _a;
        const namePath = stringToPath(param.name);
        let ptr = memo;
        const value = generateProperties(param);
        for (let i = 0, iLen = namePath.length; i < iLen; i++) {
            if (i + 1 === iLen) {
                const name = param.required ? namePath[i] : `${namePath[i]}?`;
                ptr[name] = value;
            }
            else {
                ptr = (_a = ptr[namePath[i]]) !== null && _a !== void 0 ? _a : (ptr[namePath[i]] = {});
            }
        }
        return memo;
    }, {});
    return objToString(obj);
}
function generateMethod(requestName, operation) {
    const result = [];
    if (operation.description) {
        result.push(`\n// ${operation.description}`);
    }
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
                const name = generateProperties(res.schema);
                memo.push(name);
            }
        }
        return memo;
    }, [])
        .join('|') || 'unknown';
    result.push(`get(param: ${requestName} & TOptions): Promise<${resultType}>;`);
    return result.join('\n');
}
function generateAPI(docs) {
    const result = [];
    const typesResult = [];
    const paths = docs.paths;
    Object.keys(paths).forEach((url) => {
        const path = paths[url];
        TMETHOD.forEach((method) => {
            var _a, _b;
            if (path[method] === undefined) {
                return;
            }
            const operation = path[method];
            const groups = groupBy_1.default((_b = (_a = operation.parameters) === null || _a === void 0 ? void 0 : _a.filter((p) => p.in)) !== null && _b !== void 0 ? _b : [], (p) => p.in);
            const NameParam = upperFirst_1.default(operation.operationId);
            const options = Object.keys(groups).reduce((memo, groupName) => {
                const val = transformInputSchema(groups[groupName]);
                if (val !== 'null') {
                    const name = `I${upperFirst_1.default(groupName)}${NameParam}`;
                    typesResult.push(`export interface ${name} ${val}`);
                    memo[groupName] = name;
                }
                return memo;
            }, {});
            const RequestName = `I${NameParam}Request`;
            const typeParams = objToString(Object.assign({ method: JSON.stringify(method.toUpperCase()), url: JSON.stringify(url) }, options));
            typesResult.push(`export interface ${RequestName} ${typeParams}`);
            const res = generateMethod(RequestName, path[method]);
            result.push(res);
        });
    });
    result.push(`get(options: IOptionsBaseT<{}> & TOptions): Promise<any> {`, `options.url = !options.path ? options.url : Object.keys(options.path).reduce((memo, key) => memo.replace(new RegExp('{' + key + '}'), (options.path as any)[key]), options.url);`, `return this.call(options);`, `}`);
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
function generate(docs) {
    const result = [];
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
exports.generate = generate;
//# sourceMappingURL=generate.js.map