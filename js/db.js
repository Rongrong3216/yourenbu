// db.js —— 极简 localStorage 封装（兼容所有浏览器）

const DB = (() => {
  const PREFIX = 'yourenbu_';
  let ready = false;

  function _read(store) {
    try {
      const raw = localStorage.getItem(PREFIX + store);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function _write(store, obj) {
    localStorage.setItem(PREFIX + store, JSON.stringify(obj));
  }

  function init() {
    ready = true;
  }

  async function getAll(store) {
    const obj = _read(store);
    return Object.values(obj);
  }

  async function getById(store, id) {
    const obj = _read(store);
    return obj[id] || null;
  }

  async function put(store, item) {
    const obj = _read(store);
    obj[item.id] = item;
    _write(store, obj);
    return item;
  }

  async function remove(store, id) {
    const obj = _read(store);
    delete obj[id];
    _write(store, obj);
  }

  async function clearAll() {
    ['friends', 'moments', 'gifts', 'meta'].forEach(s => localStorage.removeItem(PREFIX + s));
  }

  async function getMeta(key) {
    const obj = _read('meta');
    return obj[key] || null;
  }

  async function setMeta(key, val) {
    const obj = _read('meta');
    obj[key] = val;
    _write('meta', obj);
  }

  async function exportAll() {
    return {
      meta: {
        version: 1,
        exportedAt: new Date().toISOString(),
        pinHash: await getMeta('pinHash') || '',
        dav: {
          url: await getMeta('dav_url') || '',
          username: await getMeta('dav_username') || ''
        }
      },
      friends: await getAll('friends'),
      moments: await getAll('moments'),
      gifts: await getAll('gifts')
    };
  }

  async function importAll(data) {
    await clearAll();
    if (data.friends) for (const f of data.friends) await put('friends', f);
    if (data.moments) for (const m of data.moments) await put('moments', m);
    if (data.gifts) for (const g of data.gifts) await put('gifts', g);
    if (data.meta && data.meta.pinHash) await setMeta('pinHash', data.meta.pinHash);
  }

  return { init, getAll, getById, put, remove, clearAll, getMeta, setMeta, exportAll, importAll };
})();
