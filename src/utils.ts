import prettier from 'prettier';
import * as http from 'http';
import * as fs from 'fs';
import type * as Swagger from 'swagger-schema-official';
import { generate } from './generate';

export function readByPath(path: string) {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, file) => {
      if (err) {
        reject(err);
      } else {
        resolve(file);
      }
    });
  });
}

export function readByUrl(url: string) {
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

export function transform(schemaData: string) {
    const docs: Swagger.Spec = JSON.parse(schemaData);
    const code = generate(docs);
    return prettier.format(code, {
      tabWidth: 2,
      semi: true,
      singleQuote: true,
      parser: 'typescript',
    });
}
