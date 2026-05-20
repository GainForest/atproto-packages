import { configureEnv } from "./env.js";

type WorkerEnv = Record<string, string | undefined>;

export default {
  async fetch(request: Request, bindings: WorkerEnv): Promise<Response> {
    try {
      configureEnv({
        ...bindings,
        NODE_ENV: bindings.NODE_ENV ?? "production",
        PORT: bindings.PORT,
      });

      const { route } = await import("./app.js");
      return route(request);
    } catch (error) {
      console.error("[auth-worker] request failed", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
};
