import { readFileSync, writeFileSync } from 'node:fs';

const lcovPath = 'coverage/lcov.info';
const content = readFileSync(lcovPath, 'utf-8');
const fixed = content.replace(/^SF:(.+)$/gm, (_, path) => `SF:${path.replaceAll('\\', '/')}`);
writeFileSync(lcovPath, fixed);
