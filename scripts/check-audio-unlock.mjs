/**
 * Unit-ish static check: unlock() must stay sync through the iOS gesture chain.
 * Fails the build if we regress into await-before-resume / create-on-load patterns.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const am = readFileSync(join(root, 'src/AudioManager.js'), 'utf8');
const main = readFileSync(join(root, 'src/main.js'), 'utf8');

const errors = [];

// unlock must not be async
if (/async\s+unlock\s*\(/.test(am)) {
  errors.push('unlock() must not be async — await breaks the iOS gesture chain');
}

// ensureContext / new AudioContext should exist for lazy create
if (!/ensureContext\s*\(/.test(am) || !/webkitAudioContext/.test(am)) {
  errors.push('expected lazy ensureContext() that constructs AudioContext');
}

// init() must not construct AudioContext (look for new AC / AudioContext inside init body roughly)
const initMatch = am.match(/init\s*\(\s*\)\s*\{([\s\S]*?)\n  \}/);
if (initMatch) {
  const body = initMatch[1];
  if (/new\s+(AC|AudioContext|\(window\.AudioContext)/.test(body)) {
    errors.push('init() must NOT create AudioContext — only soft setup');
  }
}

// Extract unlock() with brace matching (avoid swallowing later async methods)
function methodBody(src, name) {
  const re = new RegExp(`${name}\\s*\\([^)]*\\)\\s*\\{`);
  const m = re.exec(src);
  if (!m) return null;
  let i = m.index + m[0].length;
  let depth = 1;
  while (i < src.length && depth > 0) {
    const ch = src[i++];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  return src.slice(m.index + m[0].length, i - 1);
}

const body = methodBody(am, 'unlock');
if (!body) {
  errors.push('could not find unlock() method body');
} else {
  // Strip line comments so "do NOT await" docs don't false-positive
  const codeOnly = body.replace(/\/\/.*$/gm, '');
  if (/\bawait\b/.test(codeOnly)) {
    errors.push('unlock() body must not use await');
  }
  const resumeIdx = body.search(/\.resume\s*\(/);
  const finishIdx = body.search(/const finish\s*=/);
  // startMusic only allowed inside finish (after resume), not in the sync preamble
  const preamble = finishIdx >= 0 ? body.slice(0, finishIdx) : body;
  if (/this\.startMusic\s*\(/.test(preamble)) {
    errors.push('startMusic() must not run before finish/resume resolves');
  }
  if (resumeIdx < 0) {
    errors.push('unlock() must call ctx.resume()');
  }
  if (!/_primeSilentBuffer\s*\(/.test(body)) {
    errors.push('unlock() must prime silent buffer synchronously');
  }
  if (!/_primeHtmlAudios\s*\(/.test(body)) {
    errors.push('unlock() must prime HTMLAudio synchronously');
  }
}

// main.js: splash must not create context via paths that call ensureContext
if (/game\.audio\.ensureContext\s*\(/.test(main)) {
  errors.push('main.js must not call ensureContext on load');
}
if (!/unlockFromGesture|audio\.unlock/.test(main)) {
  errors.push('main.js must unlock from Begin Defense click');
}
if (!/forceUnmute:\s*true|forceUnmute\s*,\s*true|unlockFromGesture\(true,\s*true\)/.test(main)) {
  errors.push('Begin Defense should forceUnmute on first start');
}

if (errors.length) {
  console.error('check-audio-unlock FAILED:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log('check-audio-unlock OK: unlock stays sync; no AudioContext on load');
