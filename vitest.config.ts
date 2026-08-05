import { defineConfig } from "vitest/config";
import path from "node:path";

// Zonder dit lost vitest de "@/*" -> "./*"-alias uit tsconfig.json niet op
// (dat is puur een TypeScript-compiler-instelling, geen Vite/Vitest-gedrag) —
// tests die alleen `import type` uit een @/-pad halen merkten dat nooit
// (die imports worden vóór runtime al weggecompileerd), maar zodra een test
// transitief een échte (waarde-)import via een @/-pad binnenhaalt, faalt de
// module-resolutie zonder deze alias.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
