const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const FIXED_NAME = 'GPhoto-Frame-windows-x64-setup.exe';
const readJson = (root, file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

function validateVersions(root, tag) {
  const pkg = readJson(root, 'package.json');
  const lock = readJson(root, 'package-lock.json');
  const config = readJson(root, 'src-tauri/tauri.conf.json');
  const cargo = fs.readFileSync(path.join(root, 'src-tauri/Cargo.toml'), 'utf8');
  const cargoLock = fs.readFileSync(path.join(root, 'src-tauri/Cargo.lock'), 'utf8');
  const blockVersion = (text, header, name) => {
    const block = text.split(header).find(section => new RegExp(`^\\s*name\\s*=\\s*"${name}"`, 'm').test(section));
    return block?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  };
  const versions = [pkg.version, lock.version, lock.packages[''].version, config.version,
    blockVersion(cargo, /\[package\]/, 'gphoto-frame'),
    blockVersion(cargoLock, /\[\[package\]\]/, 'gphoto-frame')];
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version) || versions.some(v => v !== pkg.version)) {
    throw new Error(`Project versions disagree: ${JSON.stringify(versions)}`);
  }
  if (tag !== undefined && (!/^v\d+\.\d+\.\d+$/.test(tag) || tag !== `v${pkg.version}`)) {
    throw new Error(`Tag ${tag} must equal v${pkg.version}`);
  }
  return pkg.version;
}

function assetNames(version, platform = 'windows') {
  const windows = [`GPhoto Frame_${version}_x64-setup.exe`, FIXED_NAME,
    `GPhoto Frame_${version}_x64-portable.exe`, 'GPhoto-Frame-windows-x64-portable.exe'];
  const macos = [`GPhoto-Frame_${version}_macos-universal.dmg`, 'GPhoto-Frame-macos-universal.dmg'];
  if (!['windows', 'macos', 'all'].includes(platform)) throw new Error(`Unknown platform: ${platform}`);
  return [...(platform === 'macos' ? macos : platform === 'all' ? [...windows, ...macos] : windows), 'SHA256SUMS.txt'];
}

function prepare(root, tag, options = {}) {
  const version = validateVersions(root, tag);
  if (options.platform === 'macos') return prepareMac(root, tag, options);
  if (options.platform && options.platform !== 'windows') throw new Error('Unsupported packaging platform');
  const output = options.output || root;
  const [versioned, fixed, portable, portableFixed, sums] = assetNames(version);
  const build = options.buildRoot || path.join(root, 'src-tauri/target/release');
  const source = path.join(build, 'bundle/nsis', versioned);
  const inputs = [
    { source, names: [versioned, fixed] },
    { source: path.join(build, 'gphoto-frame.exe'), names: [portable, portableFixed] },
  ].map(item => {
    const bytes = fs.readFileSync(item.source);
    if (bytes.length < 2 || bytes.subarray(0, 2).toString() !== 'MZ') throw new Error(`Not a Windows executable: ${item.source}`);
    return { ...item, hash: crypto.createHash('sha256').update(bytes).digest('hex') };
  });
  // Validate every input before replacing any previous delivery assets.
  fs.mkdirSync(output, { recursive: true });
  const lines = [];
  for (const input of inputs) for (const name of input.names) {
    fs.copyFileSync(input.source, path.join(output, name));
    lines.push(`${input.hash}  ${name}\n`);
  }
  fs.writeFileSync(path.join(output, sums), lines.join(''));
  return { version, assets: assetNames(version) };
}

const runNative = (command, args) => execFileSync(command, args, { encoding: 'utf8' }).trim();
function prepareMac(root, tag, options = {}, run = runNative) {
  const version = validateVersions(root, tag);
  const build = options.buildRoot || path.join(root, 'src-tauri/target/universal-apple-darwin/release');
  const app = path.join(build, 'bundle/macos/GPhoto Frame.app');
  const plist = path.join(app, 'Contents/Info.plist');
  const executable = path.join(app, 'Contents/MacOS/gphoto-frame');
  [plist, executable].forEach(file => { if (!fs.statSync(file).isFile()) throw new Error(`Missing bundle input: ${file}`); });
  const readPlist = key => run('plutil', ['-extract', key, 'raw', '-o', '-', plist]);
  if (readPlist('CFBundleShortVersionString') !== version || readPlist('CFBundleIdentifier') !== 'io.gphotoframe.desktop' || readPlist('LSMinimumSystemVersion') !== '12.0') {
    throw new Error('macOS bundle version, identifier or minimum OS mismatch');
  }
  const architectures = run('lipo', ['-archs', executable]).split(/\s+/).sort();
  if (architectures.join(',') !== 'arm64,x86_64') throw new Error('Universal bundle must contain arm64 and x86_64');
  run('codesign', ['--verify', '--deep', '--strict', app]);
  const directory = path.join(build, 'bundle/dmg');
  const candidates = fs.readdirSync(directory).filter(name => name.endsWith('.dmg') && name.includes(`_${version}_`));
  if (candidates.length !== 1) throw new Error('Expected exactly one current-version DMG');
  const source = path.join(directory, candidates[0]);
  if (!fs.statSync(source).size) throw new Error('Empty DMG');
  run('hdiutil', ['verify', source]);
  const output = options.output || root;
  const assets = assetNames(version, 'macos');
  const hash = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  fs.mkdirSync(output, { recursive: true });
  for (const name of assets.slice(0, -1)) fs.copyFileSync(source, path.join(output, name));
  fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), assets.slice(0, -1).map(name => `${hash}  ${name}\n`).join(''));
  return { version, assets };
}

function assemble(root, tag, input, output = root) {
  const version = validateVersions(root, tag);
  const names = assetNames(version, 'all').slice(0, -1);
  // Require per-platform manifests; verify bytes, exact files and identical aliases.
  const staged = new Map();
  for (const platform of ['windows', 'macos']) {
    const directory = path.join(input, platform);
    const expected = assetNames(version, platform).slice(0, -1);
    const lines = fs.readFileSync(path.join(directory, 'SHA256SUMS.txt'), 'utf8').trim().split('\n');
    if (lines.length !== expected.length) throw new Error('Unexpected checksum manifest entries');
    for (const name of expected) {
      const bytes = fs.readFileSync(path.join(directory, name));
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      if (!lines.includes(`${hash}  ${name}`)) throw new Error(`Checksum mismatch: ${name}`);
      staged.set(name, { bytes, hash });
    }
    for (let i = 0; i < expected.length; i += 2) {
      if (staged.get(expected[i]).hash !== staged.get(expected[i + 1]).hash) throw new Error('Alias contents differ');
    }
  }
  fs.mkdirSync(output, { recursive: true });
  for (const name of names) fs.writeFileSync(path.join(output, name), staged.get(name).bytes);
  fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), names.map(name => `${staged.get(name).hash}  ${name}\n`).join(''));
  return { version, assets: [...names, 'SHA256SUMS.txt'] };
}

function validateDelivery(root, version) {
  const names = assetNames(version, 'all').slice(0, -1);
  const lines = fs.readFileSync(path.join(root, 'SHA256SUMS.txt'), 'utf8').trim().split('\n');
  if (lines.length !== names.length) throw new Error('Incomplete release checksums');
  for (const name of names) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
    if (!lines.includes(`${hash}  ${name}`)) throw new Error(`Invalid release asset: ${name}`);
  }
  for (let i = 0; i < names.length; i += 2) {
    if (!fs.readFileSync(path.join(root, names[i])).equals(fs.readFileSync(path.join(root, names[i + 1])))) throw new Error('Release alias contents differ');
  }
}

// All remote operations are isolated here so release safety can be tested without GitHub.
function draft(root, tag, repo, gh, delivery = root) {
  const version = validateVersions(root, tag);
  if (!tag || !/^[\w.-]+\/[\w.-]+$/.test(repo || '')) throw new Error('Explicit tag and owner/repo required');
  // Paginated listing distinguishes absent releases from authentication/network failures.
  const pages = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repo}/releases?per_page=100`]));
  const existing = pages.flat().find(release => release.tag_name === tag);
  if (existing && !existing.draft) throw new Error('Refusing to modify a published release');
  const assets = assetNames(version, 'all').map(name => path.join(delivery, name));
  assets.forEach(file => { if (!fs.existsSync(file)) throw new Error(`Missing asset: ${file}`); });
  validateDelivery(delivery, version);
  const notes = path.join(root, 'release-notes', `${tag}.md`);
  if (!fs.existsSync(notes)) throw new Error(`Missing release notes: ${notes}`);
  if (existing) {
    gh(['release', 'edit', tag, '--repo', repo, '--prerelease', '--latest=false', '--title', `GPhoto Frame ${version}`, '--notes-file', notes]);
  } else {
    gh(['release', 'create', tag, '--repo', repo, '--verify-tag', '--draft', '--prerelease', '--latest=false', '--title', `GPhoto Frame ${version}`, '--notes-file', notes]);
  }
  // Recheck immediately before upload, including on reruns. Never auto-publish.
  const state = JSON.parse(gh(['release', 'view', tag, '--repo', repo, '--json', 'isDraft']));
  if (!state.isDraft) throw new Error('Release is no longer a draft; upload cancelled');
  gh(['release', 'upload', tag, ...assets, '--repo', repo, '--clobber']);
}

if (require.main === module) {
  try {
    const [command, tag, platform, source, output] = process.argv.slice(2);
    if (command === 'check') console.log(`Version validated: ${validateVersions(ROOT, tag)}`);
    else if (command === 'prepare') console.log(prepare(ROOT, tag, { platform, buildRoot: source, output }));
    else if (command === 'assemble') console.log(assemble(ROOT, tag, platform, source));
    else if (command === 'draft') draft(ROOT, tag, process.env.GITHUB_REPOSITORY,
      args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }), process.env.RELEASE_DELIVERY || ROOT);
    else throw new Error('Usage: release.cjs check|draft TAG; prepare TAG PLATFORM [BUILD_ROOT OUTPUT]; assemble TAG INPUT OUTPUT');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validateVersions, prepare, prepareMac, assemble, draft, assetNames };
