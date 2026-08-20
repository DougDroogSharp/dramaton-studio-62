import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// The alarm that actually rings.
//
// eslint.config.js enables react-hooks/rules-of-hooks, which statically
// catches a hook called conditionally or below an early return. On
// 20 Aug 2026 exactly that bug — a useMemo under four early returns in
// Theater.tsx — crashed the app on the START button. The rule was
// installed and would have caught it. Nobody ran it, because
// `npm run lint` reports 51 pre-existing style errors and drowns any
// real signal, so it was never wired into `npm run verify`.
//
// This config enables ONE rule class: the hook rules, which are
// correctness, not style. It is clean today, so it can gate the build
// today, and it stays useful while the 51 style errors get worked
// through separately.
export default tseslint.config({
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
  // The TS plugin is registered but its rules stay off. Source files
  // carry inline `eslint-disable @typescript-eslint/...` comments; without
  // the plugin present those names do not resolve and ESLint errors on the
  // disable comment itself.
  plugins: { "react-hooks": reactHooks, "@typescript-eslint": tseslint.plugin },
  linterOptions: { reportUnusedDisableDirectives: "off" },
  rules: {
    "react-hooks/rules-of-hooks": "error",
  },
});
