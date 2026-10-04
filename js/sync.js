// sync.js —— 同步调度

const Sync = (() => {
  let timer = null;
  let listeners = [];

  function setState(state, msg = '') {
    // state: idle | syncing | success | error
    listeners.forEach(fn => fn(state, msg));
  }

  function onChange(fn) { listeners.push(fn); }

  function schedulePush() {
    if (!WebDAV.isEnabled()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => pushNow(), 2000);
  }

  async function pushNow() {
    if (!WebDAV.isEnabled()) return;
    setState('syncing');
    try {
      const data = await DB.exportAll();
      await WebDAV.push(data);
      setState('success');
    } catch (e) {
      setState('error', e.message);
      console.warn('push failed', e);
    }
  }

  // 启动时拉一次
  async function pullOnStart() {
    if (!WebDAV.isEnabled()) return;
    setState('syncing');
    try {
      const remote = await WebDAV.pull();
      if (!remote) { setState('idle'); return; }
      const localLast = await DB.getMeta('local_last_modified') || 0;
      const remoteTime = new Date(remote.meta?.exportedAt || 0).getTime();
      if (remoteTime > localLast) {
        await DB.importAll(remote);
      }
      setState('success');
    } catch (e) {
      setState('error', e.message);
    }
  }

  function markLocalModified() {
    DB.setMeta('local_last_modified', Date.now());
  }

  return { schedulePush, pushNow, pullOnStart, onChange, markLocalModified };
})();
