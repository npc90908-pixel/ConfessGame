import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The engine layer is deliberately imperative: react-three-fiber's
    // `useFrame` mutates three.js objects, shader uniforms and the shared
    // runtime every frame. The React Compiler purity rules assume
    // declarative React and misfire on that pattern, so they are relaxed
    // for the game engine only — UI components keep the strict rules.
    files: ["src/game/**/*.{ts,tsx}", "src/components/game/GameCanvas.tsx", "src/components/game/Effects.tsx"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "scripts/**"]),
]);

export default eslintConfig;
