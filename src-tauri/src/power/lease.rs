#[derive(Default)]
pub struct Lease(pub Option<u32>);
impl Lease {
    pub fn update(&mut self, enabled: bool, create: impl FnOnce() -> Result<u32, String>,
        release: impl FnOnce(u32) -> Result<(), String>) -> Result<(), String> {
        match (enabled, self.0) {
            (true, None) => self.0 = Some(create()?),
            (false, Some(id)) => { release(id)?; self.0 = None; }
            _ => {}
        }
        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use super::Lease;
    #[test]
    fn assertion_is_idempotent_and_released_once() {
        let mut lease = Lease::default();
        lease.update(true, || Ok(42), |_| panic!("unexpected release")).unwrap();
        lease.update(true, || panic!("duplicate assertion"), |_| panic!()).unwrap();
        lease.update(false, || panic!(), |id| { assert_eq!(id, 42); Ok(()) }).unwrap();
        lease.update(false, || panic!(), |_| panic!("duplicate release")).unwrap();
        assert!(lease.0.is_none());
    }
    #[test]
    fn failed_create_or_release_keeps_consistent_state() {
        let mut lease = Lease::default();
        assert!(lease.update(true, || Err("create failed".into()), |_| Ok(())).is_err());
        assert!(lease.0.is_none());
        lease.update(true, || Ok(7), |_| Ok(())).unwrap();
        assert!(lease.update(false, || Ok(8), |_| Err("release failed".into())).is_err());
        assert_eq!(lease.0, Some(7));
    }
}
