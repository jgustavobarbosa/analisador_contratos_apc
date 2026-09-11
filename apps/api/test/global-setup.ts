import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const STATE_FILE = path.join(__dirname, '.pg-test-state.json');

type PgState = {
  port: number;
  databaseDir: string;
  connectionString: string;
};

export default async function globalSetup() {
  // Dynamic import — package is CJS/ESM mixed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const EmbeddedPostgres = require('embedded-postgres').default as new (opts: {
    databaseDir: string;
    user: string;
    password: string;
    port: number;
    persistent: boolean;
  }) => {
    initialise: () => Promise<void>;
    start: () => Promise<void>;
    createDatabase: (name: string) => Promise<void>;
    stop: () => Promise<void>;
  };

  const databaseDir = path.join(__dirname, '.embedded-pg');
  fs.rmSync(databaseDir, { recursive: true, force: true });
  fs.mkdirSync(databaseDir, { recursive: true });

  const port = 55432;
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase('rayia_test');

  const connectionString = `postgresql://postgres:postgres@127.0.0.1:${port}/rayia_test?schema=public`;
  process.env.DATABASE_URL = connectionString;
  process.env.NODE_ENV = 'test';
  process.env.COOKIE_SECURE = 'false';
  process.env.SESSION_SECRET = 'test-session-secret-min-32-chars!!';

  const apiRoot = path.join(__dirname, '..');
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: connectionString },
    stdio: 'inherit',
  });

  const state: PgState = { port, databaseDir, connectionString };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));

  // Stash instance for teardown via global
  (globalThis as unknown as { __EMBEDDED_PG__: typeof pg }).__EMBEDDED_PG__ = pg;
}
