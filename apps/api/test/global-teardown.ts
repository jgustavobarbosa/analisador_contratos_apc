import path from 'path';
import fs from 'fs';

const STATE_FILE = path.join(__dirname, '.pg-test-state.json');

export default async function globalTeardown() {
  const pg = (globalThis as unknown as { __EMBEDDED_PG__?: { stop: () => Promise<void> } })
    .__EMBEDDED_PG__;
  if (pg) {
    try {
      await pg.stop();
    } catch {
      // ignore
    }
  }
  const statePath = STATE_FILE;
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as {
      databaseDir: string;
    };
    fs.rmSync(state.databaseDir, { recursive: true, force: true });
    fs.rmSync(statePath, { force: true });
  }
}
