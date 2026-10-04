// moment.js —— 温情小事模块（实际逻辑散在 quick-note.js 和 friend-detail.js 里）
// 这里保留统一导出，便于以后扩展
const Moment = (() => {
  return { open: (f, cb) => QuickNote.open(f, cb) };
})();
