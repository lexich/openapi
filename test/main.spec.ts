import * as fs from 'fs';
import * as path from 'path';
import { transform } from '../src/utils';

describe('openapi', () => {
  let data: string;
  beforeAll(async () => {
    const filePath = path.resolve(__dirname, 'fixture', 'schema.json');
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      fs.readFile(filePath, (err, data) => (err ? reject(err) : resolve(data)));
    });
    data = buffer.toString('utf-8');
  });

  it('generate', async () => {
    const code = transform(data);
    expect(code).toMatchSnapshot();
    const filePath = path.resolve(__dirname, 'fixture', 'codegen.ts');
    await new Promise((resolve, reject) => {
      fs.writeFile(filePath, code, (err) => {
        err ? reject(err) : resolve();
      });
    });
    const example = require('./fixture/example');
    const result = await example.test1();
    expect(result).toMatchSnapshot();

    const fullname = await example.test2();
    expect('Hello World').toBe(fullname);
  });
});
