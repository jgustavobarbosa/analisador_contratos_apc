#!/usr/bin/env node
/**
 * Ensures @embedded-postgres platform package hydrates dylib symlinks
 * (required on macOS after pnpm allowBuilds install).
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function findHydrateScripts(root) {
  const scripts = [];
  const pnpmDir = path.join(root, 'node_modules', '.pnpm');
  if (!fs.existsSync(pnpmDir)) return scripts;
  for (const entry of fs.readdirSync(pnpmDir)) {
    if (!entry.startsWith('@embedded-postgres+')) continue;
    const candidate = path.join(
      pnpmDir,
      entry,
      'node_modules',
      '@embedded-postgres',
      entry.split('+')[1]?.split('@')[0] ?? '',
      'scripts',
      'hydrate-symlinks.js',
    );
    // entry like @embedded-postgres+darwin-arm64@17.6.0-beta.15
    const match = entry.match(/^@embedded-postgres\+([^@]+)@/);
    if (!match) continue;
    const platform = match[1];
    const script = path.join(
      pnpmDir,
      entry,
      'node_modules',
      '@embedded-postgres',
      platform,
      'scripts',
      'hydrate-symlinks.js',
    );
    if (fs.existsSync(script)) scripts.push(script);
  }
  return scripts;
}

const roots = [
  path.resolve(__dirname, '../../..'),
  path.resolve(__dirname, '..'),
];

const seen = new Set();
for (const root of roots) {
  for (const script of findHydrateScripts(root)) {
    if (seen.has(script)) continue;
    seen.add(script);
    spawnSync(process.execPath, [script], { stdio: 'inherit' });
  }
}
