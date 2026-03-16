import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "app/index": "src/app/index.ts",
  },
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  dts: false,
  shims: false,
});
