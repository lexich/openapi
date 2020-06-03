import { readByUrl, readByPath, transform } from './utils';

if (process.argv.length !== 4) {
  process.exit(1);
}

const command: any = process.argv[2];
const filepath = process.argv[3];

const config: Partial<Record<string, (p: string) => Promise<string>>> = {
  ['--url'](filepath: string) {
    return readByUrl(filepath)
  },
  ['--file'](filepath: string) {
    return readByPath(filepath);
  }
}

const fn = config[command];
if (!fn) {
  process.exit(1);
}

fn(filepath).then(transform).then(console.log);
