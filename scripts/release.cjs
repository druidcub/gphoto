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

function assetNames(version) {
  return [`GPhoto Frame_${version}_x64-setup.exe`, FIXED_NAME,
    `GPhoto Frame_${version}_x64-portable.exe`, 'GPhoto-Frame-windows-x64-portable.exe', 'SHA256SUMS.txt'];
}

function prepare(root, tag) {
  const version = validateVersions(root, tag);
  const [versioned, fixed, portable, portableFixed, sums] = assetNames(version);
  const source = path.join(root, 'src-tauri/target/release/bundle/nsis', versioned);
  const inputs = [
    { source, names: [versioned, fixed] },
    { source: path.join(root, 'src-tauri/target/release/gphoto-frame.exe'), names: [portable, portableFixed] },
  ].map(item => {
    const bytes = fs.readFileSync(item.source);
    if (bytes.length < 2 || bytes.subarray(0, 2).toString() !== 'MZ') throw new Error(`Not a Windows executable: ${item.source}`);
    return { ...item, hash: crypto.createHash('sha256').update(bytes).digest('hex') };
  });
  // Validate every input before replacing any previous delivery assets.
  const lines = [];
  for (const input of inputs) for (const name of input.names) {
    fs.copyFileSync(input.source, path.join(root, name));
    lines.push(`${input.hash}  ${name}\n`);
  }
  fs.writeFileSync(path.join(root, sums), lines.join(''));
  return { version, assets: assetNames(version) };
}

// All remote operations are isolated here so release safety can be tested without GitHub.
function draft(root, tag, repo, gh) {
  const version = validateVersions(root, tag);
  if (!tag || !/^[\w.-]+\/[\w.-]+$/.test(repo || '')) throw new Error('Explicit tag and owner/repo required');
  // Paginated listing distinguishes absent releases from authentication/network failures.
  const pages = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repo}/releases?per_page=100`]));
  const existing = pages.flat().find(release => release.tag_name === tag);
  if (existing && !existing.draft) throw new Error('Refusing to modify a published release');
  const assets = assetNames(version).map(name => path.join(root, name));
  assets.forEach(file => { if (!fs.existsSync(file)) throw new Error(`Missing asset: ${file}`); });
  const notes = path.join(root, 'release-notes', `${tag}.md`);
  if (!fs.existsSync(notes)) throw new Error(`Missing release notes: ${notes}`);
  if (existing) {
    gh(['release', 'edit', tag, '--repo', repo, '--title', `GPhoto Frame ${version}`, '--notes-file', notes]);
  } else {
    gh(['release', 'create', tag, '--repo', repo, '--verify-tag', '--draft', '--title', `GPhoto Frame ${version}`, '--notes-file', notes]);
  }
  // Recheck immediately before upload, including on reruns. Never auto-publish.
  const state = JSON.parse(gh(['release', 'view', tag, '--repo', repo, '--json', 'isDraft']));
  if (!state.isDraft) throw new Error('Release is no longer a draft; upload cancelled');
  gh(['release', 'upload', tag, ...assets, '--repo', repo, '--clobber']);
}

if (require.main === module) {
  try {
    const [command, tag] = process.argv.slice(2);
    if (command === 'check') console.log(`Version validated: ${validateVersions(ROOT, tag)}`);
    else if (command === 'prepare') console.log(prepare(ROOT, tag));
    else if (command === 'draft') draft(ROOT, tag, process.env.GITHUB_REPOSITORY,
      args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
    else throw new Error('Usage: node scripts/release.cjs check|prepare|draft [vX.Y.Z]');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validateVersions, prepare, draft, assetNames };
