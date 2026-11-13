import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/hikcentral/**",
      "src/lib/vms/hikcentral-*-adapter.ts",
      "src/lib/vms/hikcentral-*-adapter.test.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name='receptionistId']",
          message:
            "Upstream HikCentral 'receptionistId' is restricted to HikCentral adapters. Domain models, UI, and services must use 'hostId'.",
        },
      ],
    },
  },
];

export default eslintConfig;

