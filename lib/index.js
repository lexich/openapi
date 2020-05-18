"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
if (process.argv.length !== 3) {
    process.exit(1);
}
utils_1.readByUrl(process.argv[2]).then(utils_1.transform).then(console.log);
//# sourceMappingURL=index.js.map