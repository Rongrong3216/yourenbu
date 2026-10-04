// friend-list.js —— 通讯录列表视图

const FriendList = (() => {
  let friends = [];
  let allTags = [];
  let activeTag = 'all';

  async function render(container, onOpen) {
    friends = await DB.getAll('friends');
    const tagSet = new Set();
    friends.forEach(f => (f.tags || []).forEach(t => tagSet.add(t)));
    allTags = ['all', ...tagSet];

    container.innerHTML = `
      <div class="page">
        <div class="topbar">
          <div class="greet">友人列表 <span style="font-size:13px;color:var(--ink-light);font-weight:normal;">（共 ${friends.length} 人）</span></div>
        </div>
        <div style="padding:0 16px;overflow-x:auto;white-space:nowrap;">
          ${allTags.map(t => `<span class="tag-pill ${t === activeTag ? '' : ''}" data-tag="${YB.esc(t)}" style="cursor:pointer;padding:6px 14px;">${t === 'all' ? '全部' : YB.esc(t)}</span>`).join(' ')}
        </div>
        <div style="padding:12px 16px;">
          <input type="search" id="flSearch" placeholder="🔍 搜索名字或昵称" style="width:100%;padding:10px 14px;border:1px solid var(--line);border-radius:20px;background:var(--paper);">
        </div>
        <div id="flBody"></div>
      </div>
      <button class="fab" onclick="App.navigate('form', {from:'list'})">+</button>
      ${bottomTab('list')}
    `;

    container.querySelectorAll('[data-tag]').forEach(el => {
      el.addEventListener('click', () => { activeTag = el.dataset.tag; render(container, onOpen); });
    });
    document.getElementById('flSearch').addEventListener('input', (e) => draw(e.target.value));

    draw('');

    function draw(keyword) {
      let list = friends;
      if (activeTag !== 'all') list = list.filter(f => (f.tags || []).includes(activeTag));
      if (keyword) {
        const k = keyword.toLowerCase();
        list = list.filter(f => (f.name + (f.nickname || '')).toLowerCase().includes(k));
      }
      list.sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name, 'zh'));

      document.getElementById('flBody').innerHTML = list.map(f => {
        const bd = YB.daysUntilBirthday(f.birthday);
        const since = YB.daysSince(f.last_contact_at);
        const bg = YB.colorHash(f.name);
        const initial = (f.nickname || f.name).charAt(0);
        return `
          <div class="fl-row" data-id="${f.id}" style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line);cursor:pointer;">
            <div style="width:40px;height:40px;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;margin-right:12px;font-weight:600;">${YB.esc(initial)}</div>
            <div style="flex:1;">
              <div style="font-weight:500;">${YB.esc(f.nickname || f.name)}</div>
              <div style="font-size:12px;color:var(--ink-light);">${YB.esc((f.tags || []).join(' · '))}</div>
            </div>
            <div style="font-size:12px;color:${since > 90 ? 'var(--danger)' : 'var(--ink-light)'};">
              ${since > 90 ? '⚠️久未联系' : `🎂${bd}天`}
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.fl-row').forEach(el => {
        el.addEventListener('click', () => onOpen(el.dataset.id));
      });
    }
  }

  function bottomTab(active) {
    return `
      <div class="bottom-tabbar">
        <div class="tab" onclick="App.navigate('home')"><span class="icon">🏠</span>首页</div>
        <div class="tab active" onclick="App.navigate('list')"><span class="icon">📋</span>友人</div>
        <div class="tab" onclick="App.navigate('settings')"><span class="icon">⚙️</span>设置</div>
      </div>
    `;
  }

  return { render };
})();
