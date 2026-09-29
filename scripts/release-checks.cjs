const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateVersions, prepare, draft, assetNames } = require('./release.cjs');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gphoto-release-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, value) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); };
  write('package.json', JSON.stringify({ version: '0.3.2' }));
  write('package-lock.json', JSON.stringify({ version: '0.3.2', packages: { '': { version: '0.3.2' } } }));
  write('src-tauri/tauri.conf.json', JSON.stringify({ version: '0.3.2' }));
  write('src-tauri/Cargo.toml', '[package]\nname = "gphoto-frame"\nversion = "0.3.2"\n');
  write('src-tauri/Cargo.lock', '[[package]]\nname = "gphoto-frame"\nversion = "0.3.2"\n');
  write('release-notes/v0.3.2.md', 'Test release');
  write('src-tauri/target/release/gphoto-frame.exe', 'MZportable');
  return { root, write };
}
test('all versions and strict release tags must agree', t => {
  const { root, write } = fixture(t);
  assert.equal(validateVersions(root, 'v0.3.2'), '0.3.2');
  for (const tag of ['v0.3.1', 'v0.3.2-rc1', '0.3.2', 'v0.3.2/extra']) assert.throws(() => validateVersions(root, tag));
  write('src-tauri/Cargo.lock', '[[package]]\nname = "gphoto-frame"\nversion = "0.3.1"\n');
  assert.throws(() => validateVersions(root), /disagree/);
});
test('packaging selects exact version, preserves old files and hashes identical copies', t => {
  const { root, write } = fixture(t);
  const folder = 'src-tauri/target/release/bundle/nsis/';
  write(`${folder}GPhoto Frame_0.3.1_x64-setup.exe`, 'MZold');
  assert.throws(() => prepare(root, 'v0.3.2'), /ENOENT/);
  write(`${folder}GPhoto Frame_0.3.2_x64-setup.exe`, 'MZnew');
  const result = prepare(root, 'v0.3.2');
  const [a, b, c, d, sums] = assetNames('0.3.2');
  assert.deepEqual(fs.readFileSync(path.join(root, a)), fs.readFileSync(path.join(root, b)));
  assert.equal(result.assets.length, 5);
  assert.deepEqual(fs.readFileSync(path.join(root, c)), fs.readFileSync(path.join(root, d)));
  assert.notDeepEqual(fs.readFileSync(path.join(root, a)), fs.readFileSync(path.join(root, c)));
  const crypto = require('node:crypto');
  const expected = [a, b, c, d].map(name => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')}  ${name}\n`).join('');
  assert.equal(fs.readFileSync(path.join(root, sums), 'utf8'), expected);
  assert.equal(fs.readFileSync(path.join(root, folder, 'GPhoto Frame_0.3.1_x64-setup.exe'), 'utf8'), 'MZold');
});
test('published release and API errors cannot trigger remote mutations', t => {
  const { root } = fixture(t);
  const calls = [];
  assert.throws(() => draft(root, 'v0.3.2', 'owner/repo', args => {
    calls.push(args); return JSON.stringify([[{ tag_name: 'v0.3.2', draft: false }]]);
  }), /published/);
  assert.equal(calls.length, 1);
  assert.throws(() => draft(root, 'v0.3.2', 'owner/repo', () => { throw new Error('Network unavailable'); }), /Network/);
});
test('missing or invalid portable input never replaces delivery assets', t => {
  const { root, write } = fixture(t);
  write('src-tauri/target/release/bundle/nsis/GPhoto Frame_0.3.2_x64-setup.exe', 'MZnew');
  write('GPhoto-Frame-windows-x64-setup.exe', 'previous delivery');
  fs.unlinkSync(path.join(root, 'src-tauri/target/release/gphoto-frame.exe'));
  assert.throws(() => prepare(root), /ENOENT/);
  write('src-tauri/target/release/gphoto-frame.exe', 'not-exe');
  assert.throws(() => prepare(root), /Not a Windows executable/);
  assert.equal(fs.readFileSync(path.join(root, 'GPhoto-Frame-windows-x64-setup.exe'), 'utf8'), 'previous delivery');
  assert.equal(fs.existsSync(path.join(root, 'SHA256SUMS.txt')), false);
});
for (const exists of [false, true]) test(`draft ${exists ? 'rerun updates' : 'creation creates'} without publishing`, t => {
  const { root, write } = fixture(t);
  write('src-tauri/target/release/bundle/nsis/GPhoto Frame_0.3.2_x64-setup.exe', 'MZtest');
  prepare(root, 'v0.3.2');
  const calls = [];
  draft(root, 'v0.3.2', 'owner/repo', args => {
    calls.push(args);
    if (args[0] === 'api') return JSON.stringify([exists ? [{ tag_name: 'v0.3.2', draft: true }] : []]);
    if (args[1] === 'view') return JSON.stringify({ isDraft: true });
    return '';
  });
  assert.equal(calls[1][1], exists ? 'edit' : 'create');
  if (!exists) assert.ok(calls[1].includes('--draft'));
  assert.equal(calls.at(-1)[1], 'upload');
  assert.ok(!calls.flat().includes('--latest'));
});
test('draft becoming published before upload stops the upload', t => {
  const { root, write } = fixture(t);
  write('src-tauri/target/release/bundle/nsis/GPhoto Frame_0.3.2_x64-setup.exe', 'MZtest');
  prepare(root);
  const calls = [];
  assert.throws(() => draft(root, 'v0.3.2', 'owner/repo', args => {
    calls.push(args);
    if (args[0] === 'api') return '[[{"tag_name":"v0.3.2","draft":true}]]';
    return args[1] === 'view' ? '{"isDraft":false}' : '';
  }), /no longer a draft/);
  assert.ok(!calls.some(args => args[1] === 'upload'));
});
