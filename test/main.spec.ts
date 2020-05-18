import * as fs from 'fs';
import * as path from 'path';
import { transform } from '../src/utils';

describe('main', () => {
  let data: string;
  beforeAll(() => {
    const filePath = path.resolve(__dirname, 'fixture', 'schema.json');
    data = fs.readFileSync(filePath).toString('utf-8');
  });

  it('generate', async () => {
    const code = transform(data);
    expect(code).toMatchSnapshot();
    const filePath = path.resolve(__dirname, 'fixture', 'generate.ts');
    await new Promise((resolve, reject) => {
        fs.writeFile(filePath, code, (err) => {
            err ? reject(err) : resolve();
        });
    });
    const test = require('./fixture/impl').test;
    const result = await test();
    expect(result).toMatchSnapshot();
  });
});
