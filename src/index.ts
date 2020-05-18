import { readByUrl, transform } from './utils';

if (process.argv.length !== 3) {
  process.exit(1);
}

readByUrl(process.argv[2]).then(transform).then(console.log);
