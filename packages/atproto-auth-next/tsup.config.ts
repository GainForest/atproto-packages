import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server.ts",
    stores: "src/stores.ts",
    oauth: "src/oauth.ts",
    client: "src/client.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["next", "react", "@supabase/supabase-js"],
});
