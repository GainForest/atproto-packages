import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    geojson: "src/geojson/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
