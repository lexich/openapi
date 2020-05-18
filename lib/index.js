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
const generate_1 = require("./generate");
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
if (process.argv.length !== 3) {
    process.exit(1);
}
readByUrl(process.argv[2])
    .then((data) => {
    const docs = JSON.parse(data);
    const code = generate_1.generate(docs);
    return prettier_1.default.format(code, {
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        parser: 'typescript',
    });
})
    .then(console.log);
//# sourceMappingURL=index.js.map