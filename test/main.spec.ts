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
    const filePath = path.resolve(__dirname, 'code.ts');

    fs.writeFileSync(filePath, code);

    const API = require(filePath).API;
    class Client extends API {
        obj: any = null;
        call(param: any) {
            this.obj = param;
            return Promise.resolve();
        }
    }
    const client = new Client();
    await client.get({
        method: 'GET',
        url: '/v1/offerings/{slug}',
        path: { slug: 'test' },
        query: { include: 'test' }
    });
    expect(client.obj).toMatchSnapshot();
  });
});
