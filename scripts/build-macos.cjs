const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { validateVersions } = require('./release.cjs');
const root = path.resolve(__dirname, '..');

function signingConfig(mode, env) {
  if (mode === 'test') return { signingIdentity: '-' };
  if (mode !== 'formal') throw new Error('MACOS_SIGNING_MODE must be test or formal');
  for (const name of ['APPLE_SIGNING_IDENTITY', 'APPLE_CERTIFICATE', 'APPLE_CERTIFICATE_PASSWORD', 'APPLE_API_ISSUER', 'APPLE_API_KEY', 'APPLE_API_KEY_PATH']) {
    if (!env[name]) throw new Error(`Formal signing requires ${name}`);
  }
  if (!env.APPLE_SIGNING_IDENTITY.startsWith('Developer ID Application:')) throw new Error('Developer ID Application identity required');
  return { signingIdentity: env.APPLE_SIGNING_IDENTITY };
}
function build() {
  if (process.platform !== 'darwin') throw new Error('Build macOS bundles on a Mac runner');
  validateVersions(root, process.env.RELEASE_TAG);
  const mode = process.env.MACOS_SIGNING_MODE;
  const macOS = signingConfig(mode, process.env);
  const env = { ...process.env, MACOSX_DEPLOYMENT_TARGET: '12.0' };
  if (mode === 'test') {
    // A maintainer's ambient credentials must not silently notarize test builds.
    for (const key of Object.keys(env)) if (key.startsWith('APPLE_')) delete env[key];
  }
  const run = (command, args) => execFileSync(command, args, { cwd: root, env, stdio: 'inherit' });
  run('rustup', ['target', 'add', 'aarch64-apple-darwin', 'x86_64-apple-darwin']);
  run('node', ['node_modules/@tauri-apps/cli/tauri.js', 'build', '--target', 'universal-apple-darwin', '--bundles', 'app,dmg', '--config', JSON.stringify({ bundle: { macOS } }), '--', '--locked']);
  if (mode === 'formal') {
    const app = path.join(root, 'src-tauri/target/universal-apple-darwin/release/bundle/macos/GPhoto Frame.app');
    run('codesign', ['--verify', '--deep', '--strict', app]);
    run('spctl', ['--assess', '--type', 'execute', '--verbose', app]);
    run('xcrun', ['stapler', 'validate', app]);
  }
}
if (require.main === module) { try { build(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { signingConfig };
