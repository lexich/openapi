import { API } from './generate';

class Client extends API {
  call(param: any) {
    return Promise.resolve(param);
  }
}

const client = new Client();

export function test() {
  return client.get({
    method: 'GET',
    url: '/v1/offerings/{slug}',
    path: { slug: 'test' },
    query: { include: '1234' },
  });
}
