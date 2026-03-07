#!/usr/bin/env node

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const packageName = packageJson.name;
const packageVersion = packageJson.version;
const excludePackage = `${packageName}@${packageVersion}`;

try {
  execSync(
    `npm audit --audit-level=low && npx audit-ci --moderate && npx license-checker --excludePackages ${excludePackage} --failOn 'UNLICENSED;UNKNOWN'`,
    { stdio: 'inherit' }
  );
} catch (error) {
  process.exit(error.status || 1);
}
