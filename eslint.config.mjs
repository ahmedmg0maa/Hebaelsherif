import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // cPanel's Passenger entry point must remain CommonJS so Setup Node.js App
  // can load it directly. Application code remains under the normal TS rules.
  {
    files: ["server.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "dist/**",
    ".vinext/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Playwright evidence is not application source and may contain
    // bundled browser assets that make lint needlessly scan megabytes of code.
    "playwright-report/**",
    "test-results/**",
    // Release archives are generated delivery artifacts. Their source mirror
    // intentionally includes the cPanel CommonJS startup file, but that copy
    // is not part of the editable application source tree.
    "release/**",
    // Restricted launch recovery tooling and artifacts are not application
    // source. Keeping them outside lint also prevents bundled third-party
    // pgAdmin assets from being evaluated as project code.
    ".launch-tools/**",
    ".launch-backups/**",
    ".namecheap-standalone/**",
  ]),
]);

export default eslintConfig;
