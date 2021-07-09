// Set user password
export interface TestAuthSerializer {
  data: {
    id: string;
    type: string;
    attributes: {
      first_name: string;
      last_name: string;
      slug: string;
      avatar_url: string;
      jwt_token: string;
      need_set_password: boolean;
    };
  };
}
// Get all offerings
export interface OfferingSerializer {
  data: {
    id: string;
    type: string;
    attributes: {
      company_name: string;
      state: string;
      pitch: string;
      max_raise_amount_cents: string;
      description: string;
      logo_url: string;
      cover_url: string;
      supported_by_ios_app: string;
      pitch_highlights: string;
      requires_w9: boolean;
      requires_alcohol_reps: boolean;
      reached_max_raise_amount: boolean;
      reached_min_raise_amount: boolean;
      min_investment_amount_cents: number;
      max_investment_amount_cents: number;
      min_raise_amount_cents: number;
      min_wire_amount_cents: number;
      investment_amount_multiplier_cents: number;
      investors_count: number;
      discussions_count: number;
      reviews_count: number;
      follows_count: number;
      updates_count: number;
      avatar_extra_small_url: string;
      avatar_extra_small_2x_url: string;
      avatar_small_url: string;
      avatar_small_2x_url: string;
      avatar_medium_url: string;
      avatar_medium_2x_url: string;
      avatar_large_url: string;
      avatar_large_2x_url: string;
      card_image_url: string;
      video_url: string;
      deadline: number;
      investment_change_deadline: number;
      card_enabled: boolean;
      published_at: number;
      amount_raised_cents: number;
      amount_raised_this_week_cents: number;
      custodial: boolean;
    };
    relationships: {
      security: {
        data: {
          id: string;
          type: string;
        };
      };
      perks: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
      faqs: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
      previous_campaigns: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
      investment_reasons: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
      documents: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
      risks: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
      questions: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
      press: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
      roles_team_members: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
      tags: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
      pitch_sections: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
      exit: {
        data: {
          id: string;
          type: string;
        };
      };
      form_c: {
        data: {
          id: string;
          type: string;
        };
      };
      issuer_profile: {
        data: {
          id: string;
          type: string;
        };
      };
    };
  };
}
export interface patchV1OfferingsOfferingSlugTerms {
  custom_terms_batch: Array<{
    text: string;
    checkbox?: boolean;
    spv_deal?: string;
    republic_funding_portal?: boolean;
    capital_r?: boolean;
    republic_advisory_services?: boolean;
    republic_core?: boolean;
    republic_real_estate?: boolean;
    fig?: boolean;
    republic_labs?: boolean;
  }>;
}
export interface IPathPostV1AuthProviderOauth {
  provider: 'facebook' | 'twitter' /* Provider */;
}
export interface IFormDataPostV1AuthProviderOauth {
  oauth_token: string /* oAuth Token */;
  oauth_token_secret?: string /* twitter oAuth token secret */;
  test?: { test1?: string /* test1 */; test2?: string /* test2 */ };
  referral_token?: string /* User referral token */;
}
export interface IHeaderPostV1AuthProviderOauth {
  'X-User-Token'?: string /* User JWT */;
}
export interface IPostV1AuthProviderOauthRequest {
  method: 'POST';
  url: '/v1/auth/{provider}/oauth';
  path: IPathPostV1AuthProviderOauth;
  formData: IFormDataPostV1AuthProviderOauth;
  header?: IHeaderPostV1AuthProviderOauth;
}
export interface IPathGetV1OfferingsSlug {
  slug: string /* Offering Slug */;
}
export interface IQueryGetV1OfferingsSlug {
  include?: string /* perks, documents, location_restricted,
                        tags, press, pitch_sections, faqs,
                        risks, roles_team_members, questions,
                        form_c, investment_reasons, investment_reasons.user including. Pass separated with `,` in any order */;
}
export interface IGetV1OfferingsSlugRequest {
  method: 'GET';
  url: '/v1/offerings/{slug}';
  path: IPathGetV1OfferingsSlug;
  query?: IQueryGetV1OfferingsSlug;
}
export interface IHeaderPatchV1OfferingsOfferingSlugTerms {
  'X-User-Token': string /* User JWT */;
  'X-Csrf-Token'?: string /* CSRF Token */;
}
export interface IPathPatchV1OfferingsOfferingSlugTerms {
  offering_slug: string /* Offering`s slug */;
}
export interface IBodyPatchV1OfferingsOfferingSlugTerms {
  V1OfferingsOfferingSlugTerms: patchV1OfferingsOfferingSlugTerms;
}
export interface IPatchV1OfferingsOfferingSlugTermsRequest {
  method: 'PATCH';
  url: '/v1/offerings/{offering_slug}/terms';
  header: IHeaderPatchV1OfferingsOfferingSlugTerms;
  path: IPathPatchV1OfferingsOfferingSlugTerms;
  body: IBodyPatchV1OfferingsOfferingSlugTerms;
}
export type IFileType$$ = string;
export interface IOptionsBaseT<T> {
  body?: T;
  query?: T;
  header?: T;
  formData?: T;
  path?: T;
  url: string;
  method: string;
}
export abstract class API<TOptions = {}> {
  abstract call(param: IOptionsBaseT<any> & TOptions): Promise<any>;

  // auth with social networks
  request(
    param: IPostV1AuthProviderOauthRequest & TOptions
  ): Promise<TestAuthSerializer>;

  // Get Offering
  request(
    param: IGetV1OfferingsSlugRequest & TOptions
  ): Promise<OfferingSerializer>;

  // Add or Update Custom Terms for Offering
  request(
    param: IPatchV1OfferingsOfferingSlugTermsRequest & TOptions
  ): Promise<patchV1OfferingsOfferingSlugTerms>;
  request(params: IOptionsBaseT<{}> & TOptions): Promise<any> {
    const options: any = params;
    if (options.path) {
      options.url = Object.keys(options.path).reduce(
        (memo, key) =>
          memo.replace(new RegExp('{' + key + '}'), options.path[key]),
        options.url
      );
    }
    if (options.query) {
      const query = Object.keys(options.query).reduce((memo, key) => {
        memo.push(key + '=' + options.query[key]);
        return memo;
      }, [] as string[]);
      if (query.length) {
        options.url +=
          (options.url.indexOf('?') === -1 ? '?' : '') + query.join('&');
      }
    }
    return this.call(options);
  }
}
