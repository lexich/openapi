import { API, TestAuthSerializer } from './codegen';

class Client extends API {
  call(param: any) {
    if (param.url.indexOf('/v1/auth/') === 0) {
      const result: TestAuthSerializer = {
        data: {
          id: '1',
          type: 'test',
          attributes: {
            first_name: 'Hello',
            last_name: 'World',
            slug: 'test',
            avatar_url: '',
            jwt_token: '',
            need_set_password: false,
          },
        },
      };
      return Promise.resolve(result);
    } else {
      return Promise.resolve(param);
    }
  }
}

const client = new Client();

export function test1() {
  return client.request({
    method: 'GET',
    url: '/v1/offerings/{slug}',
    path: { slug: 'test' },
    query: { include: '1234' },
  });
}

export async function test2() {
  const {
    data: {
      attributes: { first_name, last_name },
    },
  } = await client.request({
    method: 'POST',
    url: '/v1/auth/{provider}/oauth',
    path: { provider: 'twitter' },
    formData: {
      oauth_token: '',
    },
  });
  return `${first_name} ${last_name}`;
}
