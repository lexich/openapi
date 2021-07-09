"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = exports.readByUrl = exports.readByPath = void 0;
const prettier_1 = __importDefault(require("prettier"));
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const generate_1 = require("./generate");
function readByPath(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf-8', (err, file) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(file);
            }
        });
    });
}
exports.readByPath = readByPath;
function readByUrl(url) {
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
exports.readByUrl = readByUrl;
function transform(schemaData) {
    const docs = JSON.parse(schemaData);
    const code = generate_1.generate(docs);
    return prettier_1.default.format(code, {
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        parser: 'typescript',
    });
}
exports.transform = transform;
//# sourceMappingURL=utils.js.map