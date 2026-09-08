/** OAuth token endpoint success (RFC 6749). */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthAddress {
  oxid?: string;
  salutation?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  street?: string;
  street_no?: string;
  addinfo?: string;
  zip?: string;
  city?: string;
  country_id?: string;
  state_id?: string;
  phone?: string;
  fax?: string;
  ustid?: string;
}

/** Child account under a parent profile (`oauthme getProfile`). */
export interface OAuthChild {
  oxid?: string;
  salutation?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  custnr?: string;
  company?: string;
  street?: string;
  street_no?: string;
  addinfo?: string;
  zip?: string;
  city?: string;
  country_id?: string;
  state_id?: string;
  phone?: string;
  active?: boolean;
}

/** `GET oauthme getProfile` data block. */
export interface OAuthProfile {
  oxid?: string;
  sub?: string;
  email?: string;
  salutation?: string;
  first_name?: string;
  last_name?: string;
  custnr?: string;
  company?: string;
  street?: string;
  street_no?: string;
  addinfo?: string;
  zip?: string;
  city?: string;
  country_id?: string;
  state_id?: string;
  phone?: string;
  parent?: boolean;
  parent_id?: string | null;
  childs?: OAuthChild[];
  billing?: OAuthAddress;
  addresses?: OAuthAddress[];
}

export interface OAuthProfileResponse {
  status: "success" | string;
  data?: OAuthProfile;
  message?: string;
  error?: string;
  error_description?: string;
}
