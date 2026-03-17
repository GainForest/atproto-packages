import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync } from "fs";
import { resolve } from "path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "renderer/index": "src/renderer/index.ts",
    "editor/index": "src/editor/index.ts",
    "serializer/index": "src/serializer/index.ts",
    "utils/index": "src/utils/index.ts",
    "schemas/index": "src/schemas/index.ts",
    "richtext/index": "src/richtext/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
  external: [
    "react",
    "react-dom",
    "@gainforest/generated",
    "zod",
  ],
  async onSuccess() {
    // Copy editor.css to dist so consumers can import it as:
    //   import "@gainforest/leaflet-react/editor.css"
    mkdirSync(resolve("dist"), { recursive: true });
    copyFileSync(
      resolve("src/editor/editor.css"),
      resolve("dist/editor.css")
    );
    console.log("Copied editor.css → dist/editor.css");
  },
});
