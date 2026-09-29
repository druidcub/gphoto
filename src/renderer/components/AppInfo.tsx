import { useEffect, useRef, useState } from 'react';
import { changelog } from '../../shared/changelog';
import { appVersion, openExternal } from '../core/appInfo';

export function AppInfo() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [version, setVersion] = useState('讀取中…');
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  useEffect(() => {
    let active = true;
    void appVersion().then(value => { if (active) setVersion(value); }).catch(() => { if (active) setVersion('無法取得版本'); });
    return () => { active = false; };
  }, []);
  const open = async (destination: 'support' | 'releases') => {
    const report = destination === 'support' ? setError : setDialogError;
    report('');
    try { await openExternal(destination); }
    catch { report('無法開啟瀏覽器，請稍後再試。'); }
  };
  return <div className="app-info">
    <div className="app-info-actions">
      <button type="button" onClick={() => void open('support')}>支持開發 ↗</button>
      <button type="button" ref={trigger} onClick={() => { setDialogError(''); dialog.current?.showModal(); }}>版本資訊</button>
    </div>
    {error && <p role="alert">{error}</p>}
    <dialog className="version-dialog" ref={dialog} aria-labelledby="version-title"
      onClose={() => trigger.current?.focus()}>
      <div className="version-heading"><h2 id="version-title">版本資訊</h2>
        <button type="button" autoFocus onClick={() => dialog.current?.close()}>關閉</button></div>
      <p>GPhoto Frame · {version}</p>
      <p>支持開發為自願贊助，不影響免費使用功能。</p>
      <button type="button" onClick={() => void open('releases')}>查看線上版本 ↗</button>
      {dialogError && <p role="alert">{dialogError}</p>}
      {changelog.map(entry => <section key={entry.version}>
        <h3>{entry.version}</h3><ul>{entry.zh.map(item => <li key={item}>{item}</li>)}</ul>
      </section>)}
    </dialog>
  </div>;
}
