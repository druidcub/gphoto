# GPhoto Frame

[繁體中文](README.md) | English

[Download standalone EXE (Windows x64)](https://github.com/druidcub/gphoto/releases/latest/download/GPhoto-Frame-windows-x64-portable.exe) · [Support development (PayPal)](https://paypal.me/druidcub)

### Standalone edition and support

The standalone download becomes available after **0.3.3 is publicly released**. Choose setup or portable; each format has identical versioned and stable-name copies. The standalone EXE runs directly, without creating shortcuts or an uninstall entry. It still requires [Microsoft WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/); install the runtime first if missing, or use the setup edition.

Both editions share settings and photo cache in `%LOCALAPPDATA%\io.gphotoframe.desktop`. This is not USB-portable data stored beside the EXE. Do not run both editions simultaneously. Standalone executables are also unsigned; verify the source and SHA-256.

Support development (支持開發) and Version information (版本資訊) appear below the branding on the left, separate from functional settings on the right. Bundled history from 0.3.0 is readable offline, with a link to online releases; automatic updating is not included. PayPal support is voluntary and all features remain free. The application does not process payments or track sponsors.

[Download Windows x64 installer](https://github.com/druidcub/gphoto/releases/latest/download/GPhoto-Frame-windows-x64-setup.exe) · [Release notes and older versions](https://github.com/druidcub/gphoto/releases) · [SHA-256 checksums](https://github.com/druidcub/gphoto/releases/latest/download/SHA256SUMS.txt)

Download the `.exe`, not Source code ZIP. Download links become available after the first public release; drafts do not update the latest download. Installers are currently unsigned and Windows may show a security warning. Verify the source and checksums; do not disable security protection.

A Windows photo player built with Tauri 2, Rust, React and TypeScript. Play photos from a public Google Photos shared album or a local folder, in full screen or a draggable mini window. The application UI currently uses Traditional Chinese; key labels are included below.

## Features

- Full-photo foreground with a blurred background from the same image; foreground enlargement is capped at 2× the original dimensions.
- Automatic landscape, portrait-pair and Pan & Zoom layouts. Paired backgrounds blend without a central black divider.
- Soft mode feathers photo edges into the background. Immersive mode hides full-screen controls and the cursor. Both are enabled by default.
- Numbered slide previews and playback from a selected thumbnail.
- Intervals of 10, 15 or 30 seconds, or 1, 2 or 5 minutes; default: 15 seconds. Preloading and 1.2-second crossfades.
- Background Google Photos synchronization, local caching and offline playback.
- A configurable, draggable mini window with pin-on-top control; Windows keep-awake requests during full-screen playback.

## Installation and first launch

1. On Windows 10/11 x64, run `GPhoto Frame_<version>_x64-setup.exe` from a trusted distributor.
2. Launch GPhoto Frame. Microsoft Edge WebView2 Runtime is required; installation may need internet access to download it if missing.
3. Choose Google Photos or a local folder, load photos, then preview or start playback.

Google Photos is selected on first launch, but **the URL field is blank**. No real shared album is built in. Your URL and preferences are saved automatically and restored on subsequent launches. Updating the app does not erase an existing saved URL.

## Playing a public Google Photos album

1. Sign in to the Google Photos website or mobile app.
2. Open the album you want to display, or create one and add photos.
3. Use its sharing controls to enable link sharing and copy the link. Labels vary by device; see [Google's sharing instructions](https://support.google.com/photos/answer/6131416).
4. Open the link in a signed-out private/incognito window to confirm visitors can view it.
5. In GPhoto Frame, choose Google Photos, paste the link into “公開分享相簿網址” (public shared album URL), and load/resync.
6. Playback can begin once the first usable photo is ready; the entire album need not finish downloading.

Only HTTPS URLs on `photos.app.goo.gl` or `photos.google.com` are accepted. The app does not offer Google sign-in. Only anonymously accessible albums and still images are supported—not private albums, OAuth, videos or Motion Photo animation.

With Google Photos selected, synchronization runs on startup and every five minutes. Updated playlists take effect on the next playback cycle without interrupting the current photo. Downloaded photos remain usable offline or after a synchronization failure; playback requires at least one usable photo.

> Anyone holding the sharing link may be able to view your album. Disabling sharing does not remove photos already downloaded to this computer. This feature parses public sharing pages, not an official public Google API; page changes may break synchronization.

## Playing a local folder

Select “本機資料夾” (local folder), use the default cache folder or browse to your own folder, then preview or play after loading.

Supported formats: JPG, JPEG, PNG and WebP. Only files directly inside the selected folder are scanned; subfolders are not scanned recursively. Google Photos synchronization sets its downloaded-photo folder as the default local source. This folder is also used when no local path has been saved.

The shared cache may retain photos from multiple previous albums; **it is not the current album's exact playlist**. To play the current album offline, keep Google Photos selected and use its cached playlist.

## Playback settings and previews

| Setting / UI label | Behavior |
| --- | --- |
| Slide duration / 播放秒數 | 10, 15 or 30 seconds; 1, 2 or 5 minutes. Default: 15 seconds. |
| Immersive mode / 沉浸模式 | Enabled by default. No full-screen HUD; when disabled, moving the pointer or pausing reveals controls. |
| Soft mode / 柔和模式 | Enabled by default. Feathers foreground edges; disable for edge-detail inspection. |
| Mini-window mode / 小視窗模式 | Disabled by default. Plays at a configurable size and position. |

Previews show slide/source-photo numbers at the top right, with notes about empty-space direction, motion and cropping below. Click a thumbnail to start there. The list is frozen while open so background updates do not change inspection numbers; return to settings and reopen to refresh.

Landscape photos are generally static; portraits are paired when possible. Other aspect ratios and unpaired portraits can use Pan & Zoom. Only the foreground moves: slight zoom and vertical movement return to the full-photo view at both ends. Edges may temporarily extend beyond the frame during motion. Images already at the 2× enlargement limit remain static. Pausing stops animation, and the system's reduced-motion preference may disable it. Preview thumbnails are static.

## Mini-window controls

1. Enable “小視窗模式” and choose “設定大小與位置” (set size and position).
2. Drag inside to move; drag edges/corners to resize. Save to apply, or cancel/press `Esc` to discard the adjustment.
3. During playback, drag the photo to move the window.
4. Top-right controls appear **only while hovering over the player**: 📌 toggles always-on-top; × returns to settings/preview rather than quitting the application.
5. `Esc` also leaves playback. The last size and position are remembered, and the original settings window is restored.

Hover controls remain available in immersive mode. Mini-window playback does not prevent sleep, and `F11` is ignored.

## Keyboard shortcuts and keep-awake behavior

| Key | Action |
| --- | --- |
| `Space` | Pause / resume |
| `→` / `←` | Next / previous slide |
| `Esc` | Leave playback for the originating page; leave preview for settings |
| `F11` | Toggle full screen, except in mini-window mode |

Full-screen playback requests that Windows keep the display and system awake. The request is released when leaving full screen, minimizing or closing the app; power plans are not modified. This does not prevent manual sleep, lid-close actions, screen savers or enforced locking. Check device policies before unattended displays.

## Settings, cache and privacy

Windows user data is stored at:

```text
%LOCALAPPDATA%\io.gphotoframe.desktop\
├── settings.json       # Last source, URL, playback and window preferences
└── photo-cache\        # Downloaded photos and cache manifests
    └── files\          # Default local photo folder
```

The cache targets a 2 GB limit, evicting older inactive-album data first. The current album is protected, so usage may temporarily exceed the limit. Downloads fit within a 3840×2160 bounding box without requesting a crop.

To reset preferences, close the app, back up settings, then delete `settings.json`. To remove downloaded photos, close the app and delete the `photo-cache` folder above. Offline photos will be lost and synchronization will be required again. This does not delete cloud albums or other local photo folders you selected.

Never publish personal settings, cache files or real shared-album links in source code. `.gitignore` excludes settings, caches, installers, dependencies and build outputs.

## Troubleshooting

- **Album cannot synchronize:** Check the link while signed out, network connectivity and the supported URL hosts. Google page changes may require an app update.
- **Other albums appear in the local source:** The shared cache can retain previous albums. Select your own folder or return to Google Photos for the current album's cached playlist.
- **Dark edges remain:** Backgrounds inherit photo colors. Built-in black borders or dark scenes can still look dark; soft mode blends boundaries but does not repair source images.
- **Installer/build reports a locked file:** Close the running GPhoto Frame application and retry.

## Development and tests

Windows development requires Node.js compatible with Vite 6, npm, Rust stable MSVC, Microsoft C++ Build Tools with “Desktop development with C++”, and WebView2 Runtime. React/Vite provides the frontend; Rust handles desktop and network functionality. There is no Electron or Node backend.

From the project root:

```powershell
npm ci
npm run dev
```

```powershell
npm test
npm run test:release
npm run typecheck
cargo test --manifest-path src-tauri/Cargo.toml
```

Normal tests do not require a real album. For the optional network test, first set the `GPHOTO_TEST_ALBUM_URL` environment variable to your own public test album, then run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml live_shared_album_smoke_test -- --ignored
```

`npm run dev:web` starts only Vite and does not replace native Tauri testing. Do not expose development/test servers to the public internet. Historical validation and remaining manual checks are in [the 0.3.0 verification notes](VERIFICATION-0.3.0.md) (Traditional Chinese).

## Building and distribution

```powershell
npm run release:check -- v0.3.3
npm run build -- --bundles nsis -- --locked
npm run release:prepare -- v0.3.3
```

The installer is generated in `src-tauri/target/release/bundle/nsis/`. `release:prepare` copies the exact-version installer, an identical `GPhoto-Frame-windows-x64-setup.exe`, and `SHA256SUMS.txt` to the project root. These files are excluded from Git; older installers are preserved. Preparation only organizes existing output: run a successful build first, rather than treating stale output as a new build.

For public distribution, use 0.3.2 or later with the built-in album removed. Verify the blank URL with fresh user data and ensure packages contain no personal settings or cached photos. Compare `Get-FileHash -Algorithm SHA256 .\GPhoto-Frame-windows-x64-setup.exe` against the checksum file.

### Publishing to GitHub (maintainers)

Confirm that origin is `https://github.com/druidcub/gphoto.git`, the GitHub repository exists, and Actions is enabled. Commit all changes before running (never overwrite existing version tags):

```powershell
git push -u origin main
git tag -a v0.3.3 -m "GPhoto Frame 0.3.3"
git push origin v0.3.3
```

Pushing a version tag triggers Windows tests and packaging, then creates or updates a **draft release**, without publishing it. Normal tests do not access real albums. Version mismatches and failed tests stop the workflow; published releases cannot be overwritten by this process.

Check Actions, open the draft under Releases, download/test its assets and verify checksums. Then manually publish it as a stable release and mark it Latest; README download links will serve the new version. Do not publish a draft while the workflow is still running.

For subsequent releases, update the npm/Tauri/Cargo project versions and lockfiles together, add bilingual `release-notes/vX.Y.Z.md`, and push the matching tag. The workflow uses the built-in `GITHUB_TOKEN` with `contents: write`, not a personal token. In-app automatic updates and code signing are not included.

Preparation also copies `src-tauri/target/release/gphoto-frame.exe` from the same build into two standalone executables. All four EXEs are listed in `SHA256SUMS.txt`; missing inputs stop preparation. A release draft should contain four EXEs and the checksum file. Maintain bilingual summaries in `src/shared/changelog.ts` for future versions.

The Sponsor button uses the PayPal custom link in `.github/FUNDING.yml`. After pushing to the default branch, ensure Sponsorships is enabled under GitHub Settings → General → Features.

## Project structure

```text
src/renderer/         React pages, photo layouts, playback and previews
src/shared/           Shared TypeScript types
src-tauri/src/        Rust settings, album synchronization/cache, Windows power control
src-tauri/icons/      Application icons
tests/                Frontend unit and component tests
assets/               Source icon artwork
```

## License

[MIT License](LICENSE). This is not an official Google product and is not affiliated with Google Photos. Photo usage and sharing remain subject to their owners' permissions.
