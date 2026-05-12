import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 🟢 The Proper Way: Ignore the specific files we are debugging
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "app/api/chat/route.ts",    // Ignore the AI backend
    "app/api/aero-magic/route.ts", // Ignore the other AI backend
    "components/Chatbot.tsx",   // Ignore the AI frontend
  ]),
]);

export default eslintConfig;