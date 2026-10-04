// webdav.js —— 坚果云 WebDAV 客户端

const WebDAV = (() => {
  let config = null;

  async function loadConfig() {
    config = {
      url: await DB.getMeta('dav_url') || 'https://dav.jianguoyun.com/dav/',
      username: await DB.getMeta('dav_username') || '',
      password: await DB.getMeta('dav_password') || '',
      enabled: await DB.getMeta('dav_enabled') || false
    };
    return config;
  }

  async function saveConfig(cfg) {
    config = cfg;
    await DB.setMeta('dav_url', cfg.url);
    await DB.setMeta('dav_username', cfg.username);
    await DB.setMeta('dav_password', cfg.password);
    await DB.setMeta('dav_enabled', !!cfg.enabled);
  }

  function authHeader() {
    return 'Basic ' + btoa(config.username + ':' + config.password);
  }

  function filePath() {
    // 确保 url 末尾有 /
    const base = config.url.endsWith('/') ? config.url : config.url + '/';
    return base + 'yourenbu/friends.json';
  }

  async function testConnection(url, username, password) {
    const base = url.endsWith('/') ? url : url + '/';
    const res = await fetch(base, {
      method: 'OPTIONS',
      headers: { 'Authorization': 'Basic ' + btoa(username + ':' + password) }
    });
    if (res.status === 401) throw new Error('账号或应用密码错误');
    if (res.ok || res.status === 200 || res.status === 204 || res.status === 405) return true;
    throw new Error('连接失败：' + res.status);
  }

  async function pull() {
    if (!config || !config.enabled) return null;
    const res = await fetch(filePath(), {
      headers: { 'Authorization': authHeader() }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('拉取失败：' + res.status);
    return res.json();
  }

  async function push(data) {
    if (!config || !config.enabled) return;
    const res = await fetch(filePath(), {
      method: 'PUT',
      headers: {
        'Authorization': authHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('推送失败：' + res.status);
    await DB.setMeta('last_sync_at', YB.nowISO());
  }

  return { loadConfig, saveConfig, testConnection, pull, push, isEnabled: () => !!(config && config.enabled) };
})();
