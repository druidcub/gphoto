use std::{io::Write, path::Path};

// Same-directory temporary file and platform-native atomic replacement. Never unlink
// the previous destination first; failed replacement leaves its bytes untouched.
pub fn write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or("無效的檔案路徑")?;
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    temporary.write_all(bytes).map_err(|e| e.to_string())?;
    temporary.as_file().sync_all().map_err(|e| e.to_string())?;
    temporary.persist(path).map_err(|e| e.error.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn replaces_existing_file_without_delete_gap() {
        let folder = tempfile::tempdir().unwrap();
        let path = folder.path().join("settings.json");
        super::write(&path, b"old").unwrap();
        super::write(&path, b"new").unwrap();
        assert_eq!(std::fs::read(path).unwrap(), b"new");
        assert_eq!(std::fs::read_dir(folder.path()).unwrap().count(), 1);
    }

    #[test]
    fn failed_replacement_preserves_existing_destination() {
        let folder = tempfile::tempdir().unwrap();
        let destination = folder.path().join("occupied");
        std::fs::create_dir(&destination).unwrap();
        std::fs::write(destination.join("old"), b"original").unwrap();
        assert!(super::write(&destination, b"replacement").is_err());
        assert_eq!(std::fs::read(destination.join("old")).unwrap(), b"original");
        assert_eq!(std::fs::read_dir(folder.path()).unwrap().count(), 1);
    }

    #[cfg(windows)]
    #[test]
    fn locked_file_replacement_keeps_previous_bytes() {
        use std::os::windows::fs::OpenOptionsExt;
        let folder = tempfile::tempdir().unwrap();
        let path = folder.path().join("settings.json");
        super::write(&path, b"old-settings").unwrap();
        let _locked = std::fs::OpenOptions::new().read(true).share_mode(1).open(&path).unwrap();
        assert!(super::write(&path, b"new-settings").is_err());
        assert_eq!(std::fs::read(&path).unwrap(), b"old-settings");
    }
}
