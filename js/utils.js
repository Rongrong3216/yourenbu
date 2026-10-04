// utils.js —— 通用工具函数

const YB = (() => {
  function genId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // 距离下次生日还有几天（今年已过则算明年）
  function daysUntilBirthday(birthdayStr) {
    if (!birthdayStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = birthdayStr.split('-').map(Number);
    let next = new Date(today.getFullYear(), m - 1, d);
    if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
    return Math.round((next - today) / 86400000);
  }

  // 距离某个固定日期还有几天（用于纪念日/自定义日子）
  function daysUntil(dateStr, anchorDate = null) {
    if (!dateStr) return null;
    const today = anchorDate || new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split('-').map(Number);
    let next = new Date(today.getFullYear(), m - 1, d);
    if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
    return Math.round((next - today) / 86400000);
  }

  // 上次联系距今多久
  function daysSince(dateStr) {
    if (!dateStr) return null;
    const then = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - then) / 86400000);
  }

  // "3 天前 / 2 个月前 / 1 年前"
  function formatRelative(dateStr) {
    if (!dateStr) return '从未';
    const days = daysSince(dateStr);
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 30) return `${days} 天前`;
    if (days < 365) return `${Math.floor(days / 30)} 个月前`;
    return `${(days / 365).toFixed(1).replace(/\.0$/, '')} 年前`;
  }

  // 认识了几年几个月
  function calcKnownDuration(startDateStr) {
    if (!startDateStr) return null;
    const start = new Date(startDateStr);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (now.getDate() < start.getDate()) months -= 1;
    if (months < 0) { years -= 1; months += 12; }
    if (years <= 0 && months <= 0) return '认识不到 1 个月';
    if (years === 0) return `认识 ${months} 个月`;
    if (months === 0) return `认识 ${years} 年`;
    return `认识 ${years} 年 ${months} 个月`;
  }

  // 根据名字生成头像底色
  function colorHash(name) {
    const palette = [
      '#E8A87C', '#C38D9E', '#85CDCA', '#A8D8B9',
      '#F7CAC9', '#B8B8D1', '#F4D35E', '#90BE6D',
      '#F8AD9D', '#CDB4DB', '#A0C4FF', '#FFC8DD'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }

  // 简单哈希（不依赖 crypto.subtle，兼容 HTTP 局域网访问）
  async function hashPin(pin) {
    const s = 'yourenbu_' + pin;
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  // 转义 HTML，防 XSS
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  return { genId, daysUntilBirthday, daysUntil, daysSince, formatRelative, calcKnownDuration, colorHash, hashPin, todayStr, nowISO, esc };
})();
