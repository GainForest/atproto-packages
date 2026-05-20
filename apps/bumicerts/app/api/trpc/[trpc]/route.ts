import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Layer } from "effect";
import { appRouter, logTRPCError } from "@gainforest/atproto-mutations-next/trpc";
import {
  makeServiceAgentLayer,
  SessionExpiredError,
  UnauthorizedError,
} from "@gainforest/atproto-mutations-next/server";
import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/current-session";

async function createContext() {
  const session = await getCurrentSession();

  if (!session.did) {
    return {
      agentLayer: Layer.fail(
        new UnauthorizedError({ message: "No active session — user is not logged in" }),
      ),
    };
  }

  const agent = await auth.session.getAuthenticatedAgent(session.did);
  if (!agent) {
    return {
      agentLayer: Layer.fail(
        new SessionExpiredError({
          message: `OAuth session not found for ${session.did} — please log in again`,
        }),
      ),
    };
  }

  const mutationAgent = agent as unknown as Parameters<typeof makeServiceAgentLayer>[0];

  return {
    agentLayer: makeServiceAgentLayer(mutationAgent),
  };
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError: logTRPCError,
  });

export { handler as GET, handler as POST };
