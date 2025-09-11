import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  testEnvironment: 'node',
  verbose: true,
  moduleFileExtensions: [
    "ts",
    "js",
    "json",
    "node"
  ],
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|js)$",
}

export default config;