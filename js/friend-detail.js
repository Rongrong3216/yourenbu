// friend-detail.js —— 朋友档案详情页

const FriendDetail = (() => {
  let friend = null;
  let activeTab = 'basic';

  async function render(container, id, onBack) {
    friend = await DB.getById('friends', id);
    if (!friend) { onBack(); return; }
    window.__onDetailBack = onBack;

    container.innerHTML = `
      <div class="page">
        <div class="topbar" style="position:relative;justify-content:center;">
          <button class="icon-btn" onclick="window.__onDetailBack()" style="position:absolute;left:16px;">‹ 返回</button>
          <div style="font-size:16px;font-weight:600;color:var(--ink-light);">档案</div>
          <button class="icon-btn" onclick="FriendDetail.edit()" style="position:absolute;right:16px;">✏️</button>
        </div>

        <div style="text-align:center;margin-bottom:16px;">
          <div style="width:64px;height:64px;border-radius:50%;background:${YB.colorHash(friend.name)};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:600;">${YB.esc((friend.nickname || friend.name).charAt(0))}</div>
          <div style="font-size:20px;font-weight:600;margin-top:8px;">${YB.esc(friend.nickname || friend.name)}</div>
          <div>${(friend.tags || []).map(t => `<span class="tag-pill">${YB.esc(t)}</span>`).join('')}</div>
        </div>

        <div style="margin:0 16px;background:var(--paper);border-radius:12px;padding:12px;box-shadow:var(--shadow);">
          <div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">📌 快速回顾</div>
          ${quickReviewHTML()}
        </div>

        <div id="detailTabContent" style="margin-top:16px;"></div>
      </div>

      <div class="bottom-tabbar" style="position:fixed;">
        <div class="tab ${activeTab === 'basic' ? 'active' : ''}" data-tab="basic"><span class="icon">👤</span>基础</div>
        <div class="tab ${activeTab === 'moments' ? 'active' : ''}" data-tab="moments"><span class="icon">💭</span>点滴</div>
        <div class="tab ${activeTab === 'gifts' ? 'active' : ''}" data-tab="gifts"><span class="icon">🎁</span>送礼</div>
        <div class="tab ${activeTab === 'prefs' ? 'active' : ''}" data-tab="prefs"><span class="icon">💝</span>偏好</div>
      </div>
    `;

    container.querySelectorAll('#detailTabContent').forEach(el => {});
    container.querySelectorAll('.bottom-tabbar .tab[data-tab]').forEach(t => {
      t.addEventListener('click', () => { activeTab = t.dataset.tab; render(container, id, onBack); });
    });

    await renderTab();
  }

  async function quickReviewHTML() {
    const bd = YB.daysUntilBirthday(friend.birthday);
    const moments = (await DB.getAll('moments')).filter(m => m.friend_id === friend.id).sort((a, b) => b.date.localeCompare(a.date));
    const gifts = (await DB.getAll('gifts')).filter(g => g.friend_id === friend.id).sort((a, b) => b.date.localeCompare(a.date));
    return `
      <div style="font-size:13px;line-height:1.8;">
        🎂 距生日 <b>${bd} 天</b><br>
        💬 上次联系 <b>${YB.formatRelative(friend.last_contact_at)}</b><br>
        ${gifts[0] ? `🎁 最近送礼：${YB.esc(gifts[0].gift_name)}<br>` : ''}
        ${moments[0] ? `💭 "${YB.esc(moments[0].content.slice(0, 40))}…"` : ''}
      </div>
    `;
  }

  async function renderTab() {
    const el = document.getElementById('detailTabContent');
    if (!el) return;
    if (activeTab === 'basic') {
      el.innerHTML = `
        <div class="form-group"><label>姓名</label><div>${YB.esc(friend.name)}</div></div>
        <div class="form-group"><label>生日</label><div>${YB.esc(friend.birthday)}</div></div>
        <div class="form-group"><label>联系方式</label><div>${YB.esc(friend.contact || '—')}</div></div>
        <div class="form-group"><label>职业</label><div>${YB.esc(friend.occupation || '—')}</div></div>
        <div class="form-group"><label>怎么认识的</label><div>${YB.esc(friend.how_we_met || '—')}</div></div>
        <div class="form-group"><label>认识纪念日</label><div>${YB.esc(friend.known_anniversary || '—')}</div></div>
        ${(friend.custom_dates || []).map(cd => `<div class="form-group"><label>自定义日子</label><div>${YB.esc(cd.label)} · ${YB.esc(cd.date)}</div></div>`).join('')}
      `;
    } else if (activeTab === 'moments') {
      await renderMoments(el);
    } else if (activeTab === 'gifts') {
      await renderGifts(el);
    } else if (activeTab === 'prefs') {
      el.innerHTML = `
        <div style="padding:16px;">
          <div style="margin-bottom:16px;">
            <div style="font-weight:600;margin-bottom:6px;color:var(--accent);">💚 喜爱</div>
            <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;">${YB.esc(friend.likes || friend.preferences || '（还没记录）')}</div>
          </div>
          <div>
            <div style="font-weight:600;margin-bottom:6px;color:var(--danger);">🚫 雷区</div>
            <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;">${YB.esc(friend.dislikes || '（还没记录）')}</div>
          </div>
        </div>
      `;
    }
  }

  async function renderMoments(el) {
    const all = await DB.getAll('moments');
    const list = all.filter(m => m.friend_id === friend.id).sort((a, b) => b.date.localeCompare(a.date));
    el.innerHTML = `
      <div style="padding:0 16px;">
        <button class="btn ghost block" id="addMomentBtn" style="margin-bottom:12px;">+ 加一条</button>
        ${list.map(m => `
          <div style="background:var(--paper);border-radius:12px;padding:12px;margin-bottom:8px;box-shadow:var(--shadow);">
            <div style="font-size:12px;color:var(--ink-light);margin-bottom:4px;">${YB.esc(m.date)}</div>
            <div style="font-size:14px;">${YB.esc(m.content)}</div>
          </div>
        `).join('') || '<div style="text-align:center;color:var(--ink-light);padding:20px;">还没记录，点上面加一条</div>'}
      </div>
    `;
    document.getElementById('addMomentBtn').addEventListener('click', () => QuickNote.open(friend, () => render(document.getElementById('app'), friend.id, () => {})));
  }

  async function renderGifts(el) {
    const all = await DB.getAll('gifts');
    const list = all.filter(g => g.friend_id === friend.id).sort((a, b) => b.date.localeCompare(a.date));
    el.innerHTML = `
      <div style="padding:0 16px;">
        <button class="btn ghost block" id="addGiftBtn" style="margin-bottom:12px;">+ 记一笔送礼</button>
        ${list.map(g => `
          <div style="background:var(--paper);border-radius:12px;padding:12px;margin-bottom:8px;box-shadow:var(--shadow);">
            <div style="font-size:12px;color:var(--ink-light);">${YB.esc(g.date)}${g.cost ? ' · ¥' + g.cost : ''}</div>
            <div style="font-weight:500;margin:4px 0;">${YB.esc(g.gift_name)}</div>
            ${g.reaction ? `<div style="font-size:13px;color:var(--ink-light);">对方反应：${YB.esc(g.reaction)}</div>` : ''}
          </div>
        `).join('') || '<div style="text-align:center;color:var(--ink-light);padding:20px;">还没送礼记录</div>'}
      </div>
    `;
    document.getElementById('addGiftBtn').addEventListener('click', () => GiftForm.open(friend, () => render(document.getElementById('app'), friend.id, () => {})));
  }

  function edit() {
    App.navigate('form', { friend, from: 'home' });
  }

  return { render, edit };
})();
