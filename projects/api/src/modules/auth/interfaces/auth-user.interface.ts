export interface ZitadelJwtPayload {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  // Custom claim populated by the addPermissionsToToken Action (flat array)
  permissions?: string[];
  // Native Zitadel role assertion claim — present when accessTokenRoleAssertion=true.
  // Structure: { "role:key": { "orgId": "orgDomain" } }
  'urn:zitadel:iam:org:project:roles'?: Record<string, Record<string, string>>;
}

export interface AuthUser {
  sub: string;
  permissions: string[];
}
