// home.js —— 首页

const Home = (() => {
  let allFriends = [];

  async function loadData() {
    allFriends = await DB.getAll('friends');
  }

  function sortedFriends() {
    // 默认按距离下次生日天数升序
    return [...allFriends].sort((a, b) => {
      const da = YB.daysUntilBirthday(a.birthday) ?? 9999;
      const db = YB.daysUntilBirthday(b.birthday) ?? 9999;
      return da - db;
    });
  }

  function buildReminders() {
    const items = [];
    for (const f of allFriends) {
      const bd = YB.daysUntilBirthday(f.birthday);
      if (bd !== null && bd <= 14) {
        items.push({ type: 'birthday', friend: f, text: `🎂 ${f.nickname || f.name} · ${bd === 0 ? '今天生日！' : bd + ' 天后生日'}` });
      }
      if (f.known_anniversary) {
        const d = YB.daysUntil(f.known_anniversary);
        if (d <= 14) items.push({ type: 'anniv', friend: f, text: `📅 认识 ${f.nickname || f.name} · ${d === 0 ? '今天！' : d + ' 天后'}` });
      }
      for (const cd of (f.custom_dates || [])) {
        const d = YB.daysUntil(cd.date);
        if (d <= 14) items.push({ type: 'custom', friend: f, text: `✨ ${cd.label} · ${d === 0 ? '今天！' : d + ' 天后'}` });
      }
      const since = YB.daysSince(f.last_contact_at);
      if (since !== null && since > 90) {
        items.push({ type: 'stale', friend: f, text: `⚠️ ${f.nickname || f.name} · ${since} 天没联系了`, warn: true });
      }
    }
    return items.slice(0, 8);
  }

  async function render(container, onOpenDetail) {
    await loadData();
    const reminders = buildReminders();

    container.innerHTML = `
      <div class="page">
        <div class="topbar">
          <div class="greet">今天也要好好维系感情哦</div>
          <div class="top-actions">
            <span class="sync-dot" id="syncDot"></span>
            <button class="icon-btn" onclick="App.navigate('settings')">⚙️</button>
          </div>
        </div>

        <div class="reminders">
          <h3>🔔 本周该上心的</h3>
          ${reminders.length === 0 ? '<div style="font-size:13px;color:var(--ink-light);padding:8px 0;">最近没什么紧急的，去翻翻卡片吧</div>' : ''}
          ${reminders.map(r => `<div class="reminder-item ${r.warn ? 'warn' : ''}" data-id="${r.friend.id}">
            <span>${YB.esc(r.text)}</span>
          </div>`).join('')}
        </div>

        <div class="card-stage" id="cardStage"></div>
      </div>

      ${bottomTabbar('home')}
    `;

    container.querySelectorAll('.reminder-item').forEach(el => {
      el.addEventListener('click', () => onOpenDetail({ id: el.dataset.id }));
    });

    Card.render(document.getElementById('cardStage'), sortedFriends(), onOpenDetail);
  }

  function bottomTabbar(active) {
    return `
      <div class="bottom-tabbar">
        <div class="tab active" onclick="App.navigate('home')"><span class="icon">🏠</span>首页</div>
        <div class="tab" onclick="App.navigate('list')"><span class="icon">📋</span>友人</div>
        <div class="tab" onclick="App.navigate('settings')"><span class="icon">⚙️</span>设置</div>
      </div>
    `;
  }

  return { render, reload: loadData };
})();
