import path from 'path';
import fs from 'fs';

const STATE_FILE = path.join(__dirname, '.pg-test-state.json');

if (fs.existsSync(STATE_FILE)) {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as {
    connectionString: string;
  };
  process.env.DATABASE_URL = state.connectionString;
}

process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ?? 'test-session-secret-min-32-chars!!';
process.env.PASSWORD_RESET_TTL_MINUTES = '30';
