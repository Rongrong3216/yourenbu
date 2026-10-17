// app.js —— 主入口与路由

const App = (() => {
  const app = document.getElementById('app');
  let currentView = 'home';
  let prevView = null;

  async function boot() {
    DB.init();
    await WebDAV.loadConfig();
    await SampleData.seedIfEmpty();
    await Sync.pullOnStart();
    Sync.onChange(renderSyncDot);

    PIN.show(app, enterMain);
  }

  function renderSyncDot(state) {
    const dot = document.getElementById('syncDot');
    if (!dot) return;
    dot.className = 'sync-dot ' + state;
    dot.title = state;
  }

  function enterMain() {
    navigate('home');
  }

  function navigate(view, params = {}) {
    prevView = currentView;
    currentView = view;
    if (view === 'home') Home.render(app, (p) => navigate('detail', p));
    else if (view === 'list') FriendList.render(app, (id) => navigate('detail', { id }));
    else if (view === 'detail') FriendDetail.render(app, params.id, () => navigate(prevView === 'list' ? 'list' : 'home'));
    else if (view === 'settings') Settings.render(app, () => navigate(prevView || 'home'));
    else if (view === 'fc') FullCalendar.render(app, params.date, () => navigate('settings'));
    else if (view === 'form') FriendForm.render(app, params, () => {
      if (params.from === 'detail' && params.id) navigate('detail', { id: params.id });
      else navigate(params.from || prevView || 'home');
    });
  }

  return { boot, navigate };
})();

document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  App.boot();
});
