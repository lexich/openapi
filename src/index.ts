import prettier from 'prettier';
import * as http from 'http';
import type * as Swagger from 'swagger-schema-official';
import { generate } from './generate';

function readByUrl(url: string) {
  return new Promise<any>((resolve, reject) => {
    http.get(url, (res) => {
      const data: string[] = [];
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
    const docs: Swagger.Spec = JSON.parse(data);
    const code = generate(docs);
    return prettier.format(code, {
      tabWidth: 2,
      semi: true,
      singleQuote: true,
      parser: 'typescript',
    });
  })
  .then(console.log);
