use futures::{stream, StreamExt};
use regex::Regex;
use reqwest::{header::CONTENT_TYPE, redirect::Policy, Client};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{ipc::Channel, AppHandle, Manager};
use tokio::time::sleep;
use url::Url;

const CACHE_LIMIT_BYTES: u64 = 2 * 1024 * 1024 * 1024;
const MAX_IMAGE_BYTES: usize = 25 * 1024 * 1024;
const DOWNLOAD_CONCURRENCY: usize = 4;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CacheItem {
    media_id: String,
    remote_url: String,
    local_path: String,
    last_accessed: u64,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AlbumManifest {
    album_url: String,
    items: Vec<CacheItem>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SyncEvent {
    Cached { paths: Vec<String>, #[serde(rename = "folderPath")] folder_path: String },
    Manifest { total: usize },
    PhotoReady { path: String, media_id: String },
    Progress { ready: usize, total: usize },
    Warning { message: String },
    Complete { added: usize, removed: usize },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSummary {
    pub added: usize,
    pub removed: usize,
    pub paths: Vec<String>,
}

fn now_unix() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
}

fn hash_text(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}

fn allowed_album_url(url: &Url) -> bool {
    url.scheme() == "https"
        && matches!(url.host_str(), Some("photos.app.goo.gl" | "photos.google.com"))
}

fn allowed_image_url(url: &Url) -> bool {
    url.scheme() == "https"
        && url.host_str().is_some_and(|host| {
            host.starts_with("lh") && host.ends_with(".googleusercontent.com")
        })
}

pub fn validate_album_url(value: &str) -> Result<Url, String> {
    let url = Url::parse(value).map_err(|_| "Google Photos 網址格式無效。".to_string())?;
    if !allowed_album_url(&url) {
        return Err("只允許 photos.app.goo.gl 或 photos.google.com 的 HTTPS 分享網址。".into());
    }
    Ok(url)
}

pub fn parse_media_urls(html: &str) -> Vec<(String, String)> {
    let regex = Regex::new(
        r#"https://lh\d+\.googleusercontent\.com/pw/([A-Za-z0-9_-]+)(?:=[^\"'\\< )]*)?"#,
    ).expect("static media regex must compile");
    let mut seen = HashSet::new();
    regex.captures_iter(html).filter_map(|captures| {
        let full = captures.get(0)?.as_str();
        let media_id = captures.get(1)?.as_str().to_string();
        if !seen.insert(media_id.clone()) { return None; }
        let base = full.split('=').next()?.to_string();
        Some((media_id, format!("{base}=w3840-h2160-no")))
    }).collect()
}

fn cache_paths(app: &AppHandle, album_url: &str) -> Result<(PathBuf, PathBuf), String> {
    let root = app.path().app_local_data_dir()
        .map_err(|error| format!("無法取得快取目錄：{error}"))?
        .join("photo-cache");
    let manifest = root.join("manifests").join(format!("{}.json", hash_text(album_url)));
    Ok((root, manifest))
}

pub fn cache_files_directory(app: &AppHandle) -> Result<PathBuf, String> {
    let folder = app.path().app_local_data_dir()
        .map_err(|error| format!("無法取得快取目錄：{error}"))?
        .join("photo-cache").join("files");
    fs::create_dir_all(&folder).map_err(|error| format!("無法建立快取資料夾：{error}"))?;
    Ok(folder)
}

fn read_manifest(path: &Path) -> AlbumManifest {
    fs::read(path).ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

fn write_manifest(path: &Path, manifest: &AlbumManifest) -> Result<(), String> {
    let parent = path.parent().ok_or("快取 manifest 路徑無效")?;
    fs::create_dir_all(parent).map_err(|error| format!("無法建立快取目錄：{error}"))?;
    let data = serde_json::to_vec_pretty(manifest).map_err(|error| error.to_string())?;
    crate::atomic_file::write(path, &data).map_err(|error| format!("無法完成快取索引：{error}"))
}

fn page_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("Mozilla/5.0 GPhotoFrame/0.1")
        .timeout(Duration::from_secs(30))
        .redirect(Policy::custom(|attempt| {
            if allowed_album_url(attempt.url()) { attempt.follow() } else { attempt.stop() }
        }))
        .build().map_err(|error| error.to_string())
}

fn image_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("GPhotoFrame/0.1")
        .timeout(Duration::from_secs(30))
        .redirect(Policy::custom(|attempt| {
            if allowed_image_url(attempt.url()) { attempt.follow() } else { attempt.stop() }
        }))
        .build().map_err(|error| error.to_string())
}

async fn download_image(client: &Client, url: &str, file_root: &Path, media_id: &str) -> Result<CacheItem, String> {
    let parsed = Url::parse(url).map_err(|error| error.to_string())?;
    if !allowed_image_url(&parsed) { return Err("圖片來源網域不受信任。".into()); }

    let mut last_error = String::new();
    for attempt in 0..3 {
        match client.get(url).send().await {
            Ok(response) if response.status().is_success() => {
                let content_type = response.headers().get(CONTENT_TYPE)
                    .and_then(|value| value.to_str().ok()).unwrap_or("")
                    .split(';').next().unwrap_or("");
                let extension = match content_type {
                    "image/jpeg" => "jpg",
                    "image/png" => "png",
                    "image/webp" => "webp",
                    _ => return Err(format!("不支援的圖片格式：{content_type}")),
                };
                if response.content_length().is_some_and(|size| size as usize > MAX_IMAGE_BYTES) {
                    return Err("圖片超過 25 MB 安全限制。".into());
                }
                let bytes = response.bytes().await.map_err(|error| error.to_string())?;
                if bytes.len() > MAX_IMAGE_BYTES { return Err("圖片超過 25 MB 安全限制。".into()); }
                tokio::fs::create_dir_all(file_root).await.map_err(|error| error.to_string())?;
                let final_path = file_root.join(format!("{}.{}", hash_text(media_id), extension));
                let temporary = final_path.with_extension(format!("{extension}.part"));
                tokio::fs::write(&temporary, &bytes).await.map_err(|error| error.to_string())?;
                if final_path.exists() { let _ = tokio::fs::remove_file(&final_path).await; }
                tokio::fs::rename(&temporary, &final_path).await.map_err(|error| error.to_string())?;
                return Ok(CacheItem {
                    media_id: media_id.into(), remote_url: url.into(),
                    local_path: final_path.to_string_lossy().into_owned(), last_accessed: now_unix(),
                });
            }
            Ok(response) => last_error = format!("HTTP {}", response.status()),
            Err(error) => last_error = error.to_string(),
        }
        if attempt < 2 { sleep(Duration::from_millis(500 * (attempt + 1) as u64)).await; }
    }
    Err(last_error)
}

fn prune_inactive_cache(root: &Path, active_paths: &HashSet<PathBuf>) {
    let files_root = root.join("files");
    let Ok(entries) = fs::read_dir(&files_root) else { return; };
    let mut total = 0_u64;
    let mut candidates = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(metadata) = entry.metadata() else { continue; };
        if !metadata.is_file() { continue; }
        total += metadata.len();
        if !active_paths.contains(&path) {
            let modified = metadata.modified().unwrap_or(UNIX_EPOCH);
            candidates.push((modified, metadata.len(), path));
        }
    }
    candidates.sort_by_key(|item| item.0);
    for (_, size, path) in candidates {
        if total <= CACHE_LIMIT_BYTES { break; }
        if fs::remove_file(path).is_ok() { total = total.saturating_sub(size); }
    }
}

pub async fn sync_album(app: &AppHandle, album_url: &str, channel: Channel<SyncEvent>) -> Result<SyncSummary, String> {
    let requested_url = validate_album_url(album_url)?;
    let (cache_root, manifest_path) = cache_paths(app, album_url)?;
    let old_manifest = read_manifest(&manifest_path);
    let cached_paths = old_manifest.items.iter().map(|item| item.local_path.clone())
        .filter(|path| Path::new(path).is_file()).collect::<Vec<_>>();
    let files_root = cache_files_directory(app)?;
    let _ = channel.send(SyncEvent::Cached { paths: cached_paths, folder_path: files_root.to_string_lossy().into_owned() });

    let client = page_client()?;
    let response = client.get(requested_url).send().await.map_err(|error| format!("無法連線 Google Photos：{error}"))?;
    if !response.status().is_success() { return Err(format!("Google Photos 回傳 HTTP {}", response.status())); }
    if !allowed_album_url(response.url()) { return Err("Google Photos 重新導向到不受信任的網域。".into()); }
    let html = response.text().await.map_err(|error| format!("無法讀取相簿頁面：{error}"))?;
    let media = parse_media_urls(&html);
    if media.is_empty() { return Err("相簿頁面中找不到可播放照片。".into()); }
    let total = media.len();
    let _ = channel.send(SyncEvent::Manifest { total });

    let old_by_id = old_manifest.items.into_iter()
        .map(|item| (item.media_id.clone(), item)).collect::<HashMap<_, _>>();
    let remote_ids = media.iter().map(|item| item.0.clone()).collect::<HashSet<_>>();
    let removed = old_by_id.keys().filter(|id| !remote_ids.contains(*id)).count();
    let image_client = image_client()?;

    let tasks = stream::iter(media.into_iter().enumerate().map(|(index, (media_id, remote_url))| {
        let existing = old_by_id.get(&media_id).cloned();
        let client = image_client.clone();
        let root = files_root.clone();
        async move {
            if let Some(mut item) = existing {
                if Path::new(&item.local_path).is_file() {
                    item.last_accessed = now_unix();
                    return (index, Ok(item), false);
                }
            }
            let result = download_image(&client, &remote_url, &root, &media_id).await;
            (index, result, true)
        }
    })).buffer_unordered(DOWNLOAD_CONCURRENCY);

    tokio::pin!(tasks);
    let mut ordered: Vec<Option<CacheItem>> = vec![None; total];
    let mut ready = 0;
    let mut added = 0;
    while let Some((index, result, was_new)) = tasks.next().await {
        match result {
            Ok(item) => {
                ready += 1;
                if was_new {
                    added += 1;
                    let _ = channel.send(SyncEvent::PhotoReady { path: item.local_path.clone(), media_id: item.media_id.clone() });
                }
                ordered[index] = Some(item);
            }
            Err(error) => { let _ = channel.send(SyncEvent::Warning { message: format!("第 {} 張照片略過：{error}", index + 1) }); }
        }
        let _ = channel.send(SyncEvent::Progress { ready, total });
    }

    let items = ordered.into_iter().flatten().collect::<Vec<_>>();
    let paths = items.iter().map(|item| item.local_path.clone()).collect::<Vec<_>>();
    write_manifest(&manifest_path, &AlbumManifest { album_url: album_url.into(), items: items.clone() })?;
    let active = items.iter().map(|item| PathBuf::from(&item.local_path)).collect::<HashSet<_>>();
    prune_inactive_cache(&cache_root, &active);
    let _ = channel.send(SyncEvent::Complete { added, removed });
    Ok(SyncSummary { added, removed, paths })
}

#[cfg(test)]
mod tests {
    use super::{allowed_image_url, page_client, parse_media_urls, validate_album_url};
    use reqwest::header::CONTENT_TYPE;
    use url::Url;

    #[test]
    fn cache_event_exposes_local_folder_in_frontend_format() {
        let event = super::SyncEvent::Cached { paths: vec![], folder_path: "cache/files".into() };
        let value = serde_json::to_value(event).unwrap();
        assert_eq!(value["folderPath"], "cache/files");
        assert_eq!(value["type"], "cached");
    }

    #[test]
    fn validates_only_google_photos_https_urls() {
        assert!(validate_album_url("https://photos.app.goo.gl/example").is_ok());
        assert!(validate_album_url("https://photos.google.com/share/example").is_ok());
        assert!(validate_album_url("http://photos.google.com/share/example").is_err());
        assert!(validate_album_url("https://example.com/photos").is_err());
    }

    #[test]
    fn parses_media_in_order_and_deduplicates_variants() {
        let html = r#"
          https://lh3.googleusercontent.com/pw/AAA=w96-h72-no
          https://lh3.googleusercontent.com/pw/BBB=w1200-h1500-p-k-no
          https://lh3.googleusercontent.com/pw/AAA=w3840-no
          https://lh3.googleusercontent.com/ogw/avatar=s83
        "#;
        let parsed = parse_media_urls(html);
        assert_eq!(parsed.len(), 2);
        assert_eq!(parsed[0].0, "AAA");
        assert_eq!(parsed[1].0, "BBB");
        assert!(parsed[0].1.ends_with("=w3840-h2160-no"));
    }

    #[tokio::test]
    #[ignore = "requires the public Google Photos album and network access"]
    async fn live_shared_album_smoke_test() {
        let album_url = std::env::var("GPHOTO_TEST_ALBUM_URL")
            .expect("Set GPHOTO_TEST_ALBUM_URL to your own public test album");
        validate_album_url(&album_url).unwrap();
        let response = page_client().unwrap().get(album_url).send().await.unwrap();
        assert!(response.status().is_success());
        let media = parse_media_urls(&response.text().await.unwrap());
        assert!(!media.is_empty());
        assert!(allowed_image_url(&Url::parse(&media[0].1).unwrap()));
        let image = reqwest::get(&media[0].1).await.unwrap();
        assert!(image.status().is_success());
        assert!(image.headers().get(CONTENT_TYPE).unwrap().to_str().unwrap().starts_with("image/"));
    }
}
