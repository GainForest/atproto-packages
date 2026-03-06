// ePDS (email-based PDS) OAuth support
// All OAuth complexity is handled by the @atproto/oauth-client-node SDK.
// The handler factories are exported from the handlers layer.
export {
  createEpdsLoginHandler,
  createEpdsCallbackHandler,
  type EpdsLoginHandlerConfig,
  type EpdsCallbackHandlerConfig,
} from "../handlers/epds";
