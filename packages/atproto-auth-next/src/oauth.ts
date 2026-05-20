// @gainforest/atproto-auth-next/oauth
//
// Next-free OAuth client exports for standalone Node services.

export {
  createOAuthClient,
  DEFAULT_OAUTH_SCOPE,
  NodeOAuthClient,
} from "./oauth-client";
export type { OAuthClientConfig } from "./oauth-client";
export { isLoopback, resolvePublicUrl } from "./utils/url";
