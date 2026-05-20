import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getCurrentSession } from "@/lib/current-session";
import { localQueryRouter } from "@/lib/trpc/query-router/router";

/**
 * tRPC endpoint for indexer read queries.
 *
 * Served at /api/indexer/trpc — separate from the mutation endpoint at /api/trpc.
 * Procedures are read-only indexer-backed queries. Most are public; a small
 * number (such as account.current) can use the optional signed-in session DID.
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/indexer/trpc",
    req,
    router: localQueryRouter,
    createContext: async () => {
      const session = await getCurrentSession();

      return {
        sessionDid: session.did,
      };
    },
    onError: ({ path, error }) => {
      console.error(`Indexer tRPC error on ${path ?? "<no-path>"}:`, {
        code: error.code,
        message: error.message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      });
    },
  });

export { handler as GET, handler as POST };
