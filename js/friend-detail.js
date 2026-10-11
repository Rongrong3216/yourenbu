// friend-detail.js —— 朋友档案详情页

const FriendDetail = (() => {
  let friend = null;
  let activeTab = 'basic';
  let momentFilter = 'moment';
  let currentOnBack = null;

  async function render(container, id, onBack) {
    friend = await DB.getById('friends', id);
    if (!friend) { onBack(); return; }
    currentOnBack = onBack;
    window.__onDetailBack = onBack;

    container.innerHTML = `
      <div class="page">
        <div class="topbar" style="position:relative;justify-content:center;">
          <button class="icon-btn" onclick="window.__onDetailBack()" style="position:absolute;left:16px;">‹ 返回</button>
          <div style="font-size:16px;font-weight:600;color:var(--ink-light);">档案</div>
          ${activeTab !== 'moments' ? `<button class="icon-btn" onclick="FriendDetail.edit()" style="position:absolute;right:16px;">✏️</button>` : ''}
        </div>

        <div style="text-align:center;margin-bottom:16px;">
          <div style="width:64px;height:64px;border-radius:50%;background:${friend.avatar ? 'none' : YB.colorHash(friend.name)};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:600;overflow:hidden;">${friend.avatar ? `<img src="${friend.avatar}" style="width:100%;height:100%;object-fit:cover;">` : YB.esc((friend.nickname || friend.name).charAt(0))}</div>
          <div style="font-size:20px;font-weight:600;margin-top:8px;">${YB.esc(friend.nickname || friend.name)}</div>
          <div>${(friend.tags || []).map(t => `<span class="tag-pill">${YB.esc(t)}</span>`).join('')}</div>
        </div>

        <div id="detailTabContent" style="margin-top:16px;"></div>
      </div>

      <div class="bottom-tabbar" style="position:fixed;">
        <div class="tab ${activeTab === 'basic' ? 'active' : ''}" data-tab="basic"><span class="icon">👤</span>基础</div>
        <div class="tab ${activeTab === 'moments' ? 'active' : ''}" data-tab="moments"><span class="icon">💭</span>点滴</div>
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
    const moments = (await DB.getAll('moments')).filter(m => m.friend_id === friend.id);
    const gifts = (await DB.getAll('gifts')).filter(g => g.friend_id === friend.id);
    // 合并成统一时间轴
    const events = [
      ...moments.map(m => ({
        type: m.type === 'promise' ? 'promise' : 'moment',
        date: m.date,
        content: m.content,
        done: m.done,
        due_date: m.due_date,
        raw: m
      })),
      ...gifts.map(g => ({
        type: 'gift',
        date: g.date,
        content: g.gift_name + (g.reaction ? '（' + g.reaction + '）' : ''),
        cost: g.cost,
        raw: g
      }))
    ].sort((a, b) => b.date.localeCompare(a.date));

    const filterTabs = ['小事', '承诺', '礼物'].map(t => {
      const key = t === '小事' ? 'moment' : t === '承诺' ? 'promise' : 'gift';
      return `<div class="sub-tab ${momentFilter === key ? 'active' : ''}" data-filter="${key}" style="flex:1;text-align:center;padding:6px 0;border-radius:16px;font-size:13px;cursor:pointer;background:${momentFilter === key ? 'var(--accent)' : 'var(--bg)'};color:${momentFilter === key ? '#fff' : 'var(--ink-light)'};">${t}</div>`;
    }).join('');

    const filtered = events.filter(e => e.type === momentFilter);

    el.innerHTML = `
      <div style="padding:0 16px;">
        <div style="display:flex;gap:8px;margin-bottom:12px;overflow-x:auto;padding-bottom:4px;">${filterTabs}</div>
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          ${momentFilter !== 'gift' ? `<button class="btn ghost" id="addMomentBtn" style="flex:1;padding:10px;font-size:14px;">+ 记一笔</button>` : ''}
          ${momentFilter === 'gift' ? `<button class="btn ghost" id="addGiftBtn" style="flex:1;padding:10px;font-size:14px;">+ 送礼物</button>` : ''}
        </div>
        ${filtered.length === 0 ? '<div style="text-align:center;color:var(--ink-light);padding:20px;">还没有记录</div>' : `
        <div style="position:relative;padding-left:20px;">
          <div style="position:absolute;left:6px;top:8px;bottom:8px;width:2px;background:var(--line);"></div>
          ${filtered.map((e, idx) => {
            const icon = e.type === 'moment' ? '💬' : e.type === 'promise' ? '📌' : '🎁';
            const color = e.type === 'promise' ? 'var(--accent)' : e.type === 'gift' ? '#e67e22' : 'var(--ink)';
            return `
            <div class="swipe-item" style="position:relative;margin-bottom:16px;" data-idx="${idx}">
              <div style="position:absolute;left:-18px;top:4px;width:10px;height:10px;border-radius:50%;background:${color};border:2px solid var(--paper);z-index:2;"></div>
              ${e.type === 'promise' ? `<div class="swipe-actions-left" style="position:absolute;left:0;top:0;bottom:0;display:flex;border-radius:12px;overflow:hidden;">
                <button class="swipe-done" style="width:80px;border:none;${e.done ? 'background:#95a5a6;' : 'background:#27ae60;'}color:#fff;cursor:pointer;font-size:14px;">${e.done ? '↩️ 恢复' : '✓ 完成'}</button>
              </div>` : ''}
              <div class="swipe-actions" style="position:absolute;right:0;top:0;bottom:0;display:flex;border-radius:12px;overflow:hidden;">
                <button class="swipe-edit" style="width:60px;border:none;background:#3498db;color:#fff;cursor:pointer;font-size:14px;">编辑</button>
                <button class="swipe-del" style="width:60px;border:none;background:#e74c3c;color:#fff;cursor:pointer;font-size:14px;">删除</button>
              </div>
              <div class="swipe-card" style="background:var(--paper);border-radius:12px;padding:12px;box-shadow:var(--shadow);position:relative;z-index:1;transition:transform 0.2s ease;">
                <div style="font-size:12px;color:var(--ink-light);margin-bottom:4px;">${e.date} ${icon}${e.type === 'promise' && e.done ? ' ✓已完成' : ''}</div>
                <div style="font-size:14px;${e.type === 'promise' && e.done ? 'text-decoration:line-through;opacity:0.5;' : ''}">${YB.esc(e.content)}</div>
                ${e.type === 'promise' && e.due_date ? `<div style="font-size:12px;color:var(--danger);margin-top:4px;">截止：${e.due_date}</div>` : ''}
                ${e.type === 'gift' && e.cost ? `<div style="font-size:12px;color:var(--ink-light);margin-top:4px;">¥${e.cost}</div>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>`}
      </div>
    `;

    // 左滑/右滑操作
    el.querySelectorAll('.swipe-item').forEach(item => {
      const card = item.querySelector('.swipe-card');
      const idx = parseInt(item.dataset.idx);
      const e = filtered[idx];
      const canRightSwipe = e.type === 'promise';
      let startX = 0, currentX = 0;

      item.addEventListener('touchstart', (ev) => {
        startX = ev.touches[0].clientX;
        card.style.transition = 'none';
      }, { passive: true });

      item.addEventListener('touchmove', (ev) => {
        currentX = ev.touches[0].clientX - startX;
        if (currentX < 0) {
          // 左滑：露出编辑/删除
          const x = Math.max(-120, currentX);
          card.style.transform = `translateX(${x}px)`;
        } else if (canRightSwipe && currentX > 0) {
          // 右滑：露出完成/恢复
          const x = Math.min(80, currentX);
          card.style.transform = `translateX(${x}px)`;
        }
      }, { passive: true });

      item.addEventListener('touchend', () => {
        card.style.transition = 'transform 0.2s ease';
        if (currentX < -60) {
          card.style.transform = 'translateX(-120px)';
        } else if (canRightSwipe && currentX > 40) {
          // 右滑直接触发完成/恢复，不露出按钮
          card.style.transform = 'translateX(0)';
          toggleDone();
        } else {
          card.style.transform = 'translateX(0)';
        }
        currentX = 0;
      });

      async function toggleDone() {
        e.raw.done = !e.raw.done;
        await DB.put('moments', e.raw);
        Sync.markLocalModified();
        Sync.schedulePush();
        render(document.getElementById('app'), friend.id, currentOnBack);
      }

      // 点完成/恢复（仅承诺）——保留按钮作为可点区域，但右滑已直接触发
      const doneBtn = item.querySelector('.swipe-done');
      if (doneBtn) doneBtn.addEventListener('click', toggleDone);

      // 点编辑
      item.querySelector('.swipe-edit').addEventListener('click', async () => {
        if (e.type === 'gift') {
          GiftForm.open(friend, () => render(document.getElementById('app'), friend.id, currentOnBack), e.raw);
        } else {
          QuickNote.open(friend, () => render(document.getElementById('app'), friend.id, currentOnBack), e.raw);
        }
      });

      // 点删除
      item.querySelector('.swipe-del').addEventListener('click', () => {
        const delMask = document.createElement('div');
        delMask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;';
        delMask.innerHTML = `
          <div style="background:var(--paper);border-radius:16px;padding:24px;width:100%;max-width:300px;text-align:center;">
            <div style="font-weight:600;margin-bottom:20px;">是否确定要删除？</div>
            <div style="display:flex;gap:10px;">
              <button id="delNo" style="flex:1;padding:12px;border:none;background:var(--bg);border-radius:10px;cursor:pointer;">否</button>
              <button id="delYes" style="flex:1;padding:12px;border:none;background:var(--danger);color:#fff;border-radius:10px;cursor:pointer;">是</button>
            </div>
          </div>
        `;
        document.body.appendChild(delMask);
        delMask.querySelector('#delNo').onclick = () => delMask.remove();
        delMask.querySelector('#delYes').onclick = async () => {
          delMask.remove();
          if (e.type === 'gift') {
            await DB.remove('gifts', e.raw.id);
          } else {
            await DB.remove('moments', e.raw.id);
          }
          Sync.markLocalModified();
          Sync.schedulePush();
          render(document.getElementById('app'), friend.id, currentOnBack);
        };
      });
    });

    // 筛选切换
    el.querySelectorAll('.sub-tab').forEach(t => {
      t.addEventListener('click', () => {
        momentFilter = t.dataset.filter;
        renderMoments(el);
      });
    });

    const addMomentBtn = document.getElementById('addMomentBtn');
    if (addMomentBtn) addMomentBtn.addEventListener('click', () => QuickNote.open(friend, () => render(document.getElementById('app'), friend.id, currentOnBack), null, momentFilter === 'promise' ? 'promise' : 'moment'));
    const addGiftBtn = document.getElementById('addGiftBtn');
    if (addGiftBtn) addGiftBtn.addEventListener('click', () => GiftForm.open(friend, () => render(document.getElementById('app'), friend.id, currentOnBack)));
  }

  function edit() {
    App.navigate('form', { friend, from: 'detail', id: friend.id });
  }

  return { render, edit };
})();
