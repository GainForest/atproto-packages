import { NextResponse } from "next/server";
import { DEFAULT_OAUTH_SCOPE } from "../oauth-client";

export type ClientMetadataOptions = {
  clientName: string;
  /** Extra redirect URIs to include (e.g. ePDS callback). */
  extraRedirectUris?: string[];
  scope?: string;
};

/**
 * Creates a GET handler that serves the OAuth client metadata JSON.
 *
 * The client_id for web clients points to this endpoint. It must be publicly
 * accessible (i.e. not behind auth).
 *
 * Not used for loopback (127.0.0.1) clients — those embed metadata in the
 * client_id URL query string.
 */
export function createClientMetadataHandler(
  publicUrl: string,
  options: ClientMetadataOptions
) {
  const url = publicUrl.replace(/\/$/, "");
  const redirectUris = [
    `${url}/api/oauth/callback`,
    ...(options.extraRedirectUris ?? []),
  ];

  const metadata = {
    client_id: `${url}/client-metadata.json`,
    client_name: options.clientName,
    client_uri: url,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: options.scope ?? DEFAULT_OAUTH_SCOPE,
    token_endpoint_auth_method: "private_key_jwt",
    token_endpoint_auth_signing_alg: "ES256",
    application_type: "web",
    dpop_bound_access_tokens: true,
    jwks_uri: `${url}/.well-known/jwks.json`,
  };

  return function GET() {
    return NextResponse.json(metadata, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  };
}

/**
 * Creates a GET handler that serves the public JWKS (JSON Web Key Set).
 *
 * Derives the public key from the private JWK (strips the `d` parameter).
 * Must be publicly accessible.
 */
export function createJwksHandler(privateKeyJwk: string) {
  const { d: _d, ...publicKey } = JSON.parse(privateKeyJwk) as Record<
    string,
    unknown
  >;

  return function GET() {
    return NextResponse.json(
      { keys: [publicKey] },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  };
}
