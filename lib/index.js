"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
if (process.argv.length !== 4) {
    process.exit(1);
}
const command = process.argv[2];
const filepath = process.argv[3];
const config = {
    ['--url'](filepath) {
        return utils_1.readByUrl(filepath);
    },
    ['--file'](filepath) {
        return utils_1.readByPath(filepath);
    }
};
const fn = config[command];
if (!fn) {
    process.exit(1);
}
fn(filepath).then(utils_1.transform).then(console.log);
//# sourceMappingURL=index.js.map