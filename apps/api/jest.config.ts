import type { Config } from 'jest';
import path from 'path';

/**
 * apps/api/src/simulation is a symlink → ../../../src/simulation.
 * TypeScript/Jest realpath that tree outside apps/api, so bare imports
 * like @prisma/client no longer resolve via apps/api/node_modules.
 */
const prismaClient = path.join(__dirname, 'node_modules', '@prisma', 'client');

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@prisma/client$': prismaClient,
  },
  modulePaths: ['<rootDir>/node_modules'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/test/setup-after-env.ts'],
  testTimeout: 120000,
};

export default config;
