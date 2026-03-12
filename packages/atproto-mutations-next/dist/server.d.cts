import * as effect_Cause from 'effect/Cause';
import * as effect_Types from 'effect/Types';
import { Layer } from 'effect';
import { Agent } from '@atproto/api';
import { AtprotoAgent } from '@gainforest/atproto-mutations-core';
import { NodeOAuthClient, AuthSetup } from '@gainforest/atproto-auth-next';
import { SessionConfig } from '@gainforest/atproto-auth-next/server';

declare const UnauthorizedError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "UnauthorizedError";
} & Readonly<A>;
declare class UnauthorizedError extends UnauthorizedError_base<{
    message?: string;
}> {
}
declare const SessionExpiredError_base: new <A extends Record<string, any> = {}>(args: effect_Types.Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => effect_Cause.YieldableError & {
    readonly _tag: "SessionExpiredError";
} & Readonly<A>;
declare class SessionExpiredError extends SessionExpiredError_base<{
    message?: string;
}> {
}
/**
 * Low-level config accepted by makeUserAgentLayer.
 * Use this when you are constructing the OAuth client manually.
 */
type UserAgentConfig = {
    oauthClient: NodeOAuthClient;
    sessionConfig: SessionConfig;
};
/**
 * Build an AtprotoAgent Layer from the current user's OAuth session stored in
 * Next.js iron-session cookies.
 *
 * Accepts either:
 *   - An `AuthSetup` object from `createAuthSetup()` — the recommended pattern
 *   - A `{ oauthClient, sessionConfig }` object — for manual / advanced setups
 *
 * Fails with:
 *   - `UnauthorizedError` — no session cookie / user is not logged in
 *   - `SessionExpiredError` — session exists but OAuth tokens could not be restored
 *
 * @example
 * // Recommended — pass auth directly from createAuthSetup()
 * import { auth } from "@/lib/auth";
 * import { makeUserAgentLayer } from "@gainforest/atproto-mutations-next/server";
 *
 * export function getUserAgentLayer() {
 *   return makeUserAgentLayer(auth);
 * }
 *
 * @example
 * // Advanced — pass individual primitives
 * makeUserAgentLayer({ oauthClient: auth.oauthClient, sessionConfig: auth.sessionConfig })
 */
declare function makeUserAgentLayer(config: AuthSetup | UserAgentConfig): Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>;
/**
 * Build an AtprotoAgent Layer from a pre-constructed Agent instance.
 *
 * Use this for service-account / server-initiated mutations where you already
 * hold a fully authenticated Agent (e.g. a CredentialSession agent created
 * at startup, or an agent injected via DI in tests).
 *
 * @example
 * const agent = new Agent(credentialSession);
 * const layer = makeServiceAgentLayer(agent);
 * Effect.runPromise(myMutation().pipe(Effect.provide(layer)));
 */
declare function makeServiceAgentLayer(agent: Agent): Layer.Layer<AtprotoAgent>;

export { SessionExpiredError, UnauthorizedError, type UserAgentConfig, makeServiceAgentLayer, makeUserAgentLayer };
