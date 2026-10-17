// settings.js —— 设置页

const Settings = (() => {

  // 当前迷你月历显示的年月（本地状态）
  let calYear, calMonth; // 0-11
  let selectedDate = null; // 'YYYY-MM-DD'

  // ============ 收集日历事件 ============
  async function collectEvents() {
    const friends = await DB.getAll('friends');
    const moments = await DB.getAll('moments');
    const gifts = await DB.getAll('gifts');
    const friendMap = {};
    friends.forEach(f => friendMap[f.id] = f);

    // eventsByDate: { 'YYYY-MM-DD': [{type, friend, friendId, text}] }
    const map = {};
    function push(date, ev) {
      if (!date) return;
      (map[date] = map[date] || []).push(ev);
    }

    // 生日（每年重复，MM-DD 套到 calYear）
    friends.forEach(f => {
      if (!f.birthday) return;
      const mmdd = f.birthday.slice(5); // '05-12'
      // 当前 calYear 的生日
      push(`${calYear}-${mmdd}`, { type: 'birthday', friendId: f.id, friend: f.nickname || f.name, text: '🎂 生日' });
      // 跨年底：如果当前月是1月，去年12月的生日不在本月，不用管；月历切到哪年算哪年
    });

    // custom_dates（认识纪念日等，每年重复）
    friends.forEach(f => {
      (f.custom_dates || []).forEach(cd => {
        if (!cd.date) return;
        const mmdd = cd.date.slice(5);
        push(`${calYear}-${mmdd}`, { type: 'custom', friendId: f.id, friend: f.nickname || f.name, text: `💝 ${cd.label || '纪念日'}` });
      });
    });

    // 小事
    moments.forEach(m => {
      if (m.type === 'promise') return;
      const f = friendMap[m.friend_id];
      push(m.date, { type: 'moment', friendId: f?.id, friend: f?.nickname || f?.name || '?', text: m.content || '' });
    });

    // 承诺（按截止日）
    moments.forEach(m => {
      if (m.type !== 'promise') return;
      if (!m.due_date) return;
      const f = friendMap[m.friend_id];
      push(m.due_date, { type: 'promise', friendId: f?.id, friend: f?.nickname || f?.name || '?', text: '📌 ' + (m.content || ''), done: m.done });
    });

    // 礼物
    gifts.forEach(g => {
      const f = friendMap[g.friend_id];
      push(g.date, { type: 'gift', friendId: f?.id, friend: f?.nickname || f?.name || '?', text: `🎁 ${g.gift_name || ''}` });
    });

    return map;
  }

  // ============ 渲染迷你月历 ============
  async function renderMiniCal(container) {
    const events = await collectEvents();
    const today = new Date();
    const todayStr = toISODate(today);

    // 月历格子：第一天是周几
    const firstDay = new Date(calYear, calMonth, 1);
    const startWeekday = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const dotColors = {
      birthday: '#E57373',
      custom: '#C38D9E',
      moment: '#C38D9E',
      promise: '#7986CB',
      gift: '#E8B86D'
    };

    // 构造格子
    let cells = '';
    for (let i = 0; i < startWeekday; i++) cells += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events[dateStr] || [];
      const uniqueTypes = [...new Set(dayEvents.map(e => e.type))];
      const dots = uniqueTypes.map(t => `<span style="width:5px;height:5px;border-radius:50%;background:${dotColors[t]};display:inline-block;"></span>`).join('');
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;
      cells += `
        <div class="cal-cell" data-date="${dateStr}" style="
          aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
          border-radius:10px;font-size:13px;cursor:pointer;
          ${isToday ? 'background:#C38D9E;color:#fff;font-weight:600;' : ''}
          ${isSelected && !isToday ? 'background:#E8D5D9;' : ''}
        ">
          <div>${d}</div>
          <div style="display:flex;gap:2px;margin-top:2px;min-height:6px;">${dots}</div>
        </div>
      `;
    }

    // 选中日的事件列表
    let dayList = '';
    if (selectedDate) {
      const list = events[selectedDate] || [];
      let listHtml;
      if (list.length === 0) {
        listHtml = `<div style="font-size:12px;color:var(--ink-light);text-align:center;padding:8px 0;">这一天没有安排</div>`;
      } else {
        // 按朋友分组
        const byFriend = {};
        list.forEach(e => {
          const key = e.friend || '其他';
          (byFriend[key] = byFriend[key] || []).push(e);
        });
        listHtml = Object.entries(byFriend).map(([friend, evs]) => `
          <div style="margin-bottom:10px;">
            <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:4px;">${friend}</div>
            ${evs.map(e => `<div style="font-size:12px;color:var(--ink-light);padding-left:8px;${e.done ? 'text-decoration:line-through;opacity:0.5;' : ''}">${e.text}</div>`).join('')}
          </div>
        `).join('');
      }
      dayList = `
        <div id="miniCalDayList" style="margin-top:12px;padding-top:12px;border-top:1px solid #eee;">
          <div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">${selectedDate} 的安排</div>
          ${listHtml}
        </div>
      `;
    }

    return `
      <div id="miniCalBox" style="margin:16px;background:var(--paper);border-radius:16px;padding:16px;box-shadow:var(--shadow);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <button class="icon-btn" id="miniCalPrev" style="font-size:18px;padding:4px 10px;">‹</button>
          <div id="miniCalTitle" style="font-size:14px;font-weight:600;cursor:pointer;color:var(--ink);">${calYear}年${calMonth + 1}月</div>
          <button class="icon-btn" id="miniCalNext" style="font-size:18px;padding:4px 10px;">›</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);font-size:11px;color:var(--ink-light);text-align:center;margin-bottom:4px;">
          <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
        </div>
        <div id="miniCalGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">
          ${cells}
        </div>
        ${dayList}
      </div>
    `;
  }

  function toISODate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // 绑定迷你月历事件
  async function bindMiniCal(container) {
    document.getElementById('miniCalPrev').addEventListener('click', () => {
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      rerenderMiniCal(container, -1);
    });
    document.getElementById('miniCalNext').addEventListener('click', () => {
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      rerenderMiniCal(container, +1);
    });
    document.getElementById('miniCalTitle').addEventListener('click', () => {
      // TODO: 进入全屏日历页（下一步做）
    });
    container.querySelectorAll('.cal-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const d = cell.dataset.date;
        selectedDate = (selectedDate === d) ? null : d;
        rerenderMiniCal(container);
      });
    });

    // 左右滑动切月
    const box = document.getElementById('miniCalBox');
    let touchX = 0;
    box.addEventListener('touchstart', (e) => {
      touchX = e.touches[0].clientX;
    }, { passive: true });
    box.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) < 50) return; // 滑动距离太短忽略
      if (dx > 0) {
        // 右滑 → 上月
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        rerenderMiniCal(container, -1);
      } else {
        // 左滑 → 下月
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        rerenderMiniCal(container, +1);
      }
    });
  }

  async function rerenderMiniCal(container, direction = 0) {
    const old = document.getElementById('miniCalBox');
    if (!old) return;
    old.outerHTML = await renderMiniCal(container);
    bindMiniCal(container);
    if (direction !== 0) {
      const box = document.getElementById('miniCalBox');
      // direction: +1 = 切到下月（新内容从右滑入），-1 = 上月（从左滑入）
      box.classList.add(direction > 0 ? 'mini-cal-slide-right' : 'mini-cal-slide-left');
      setTimeout(() => box.classList.remove('mini-cal-slide-right', 'mini-cal-slide-left'), 300);
    }
  }


  // ============ 主菜单 ============
  async function render(container, onBack) {
    window.__onSettingsBack = onBack;

    // 初始化月历显示当前月
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
    selectedDate = null;

    const miniCalHtml = await renderMiniCal(container);

    const davEnabled = await DB.getMeta('dav_enabled') || false;
    const lastSync = await DB.getMeta('last_sync_at');
    let syncSub = '未开启';
    if (davEnabled) {
      syncSub = lastSync ? '已开启 · 上次同步 ' + new Date(lastSync).toLocaleDateString() : '已开启 · 未同步过';
    }

    container.innerHTML = `
      <div class="page">
        <div class="topbar" style="position:relative;justify-content:center;">
          <button class="icon-btn" onclick="window.__onSettingsBack()" style="position:absolute;left:16px;font-size:16px;">‹ 返回</button>
          <div style="font-size:16px;font-weight:600;">设置</div>
        </div>

        ${miniCalHtml}

        <div id="settingsMenu" style="padding:16px;">
          <div class="setting-entry" data-entry="cloud" style="background:var(--paper);border-radius:16px;padding:16px;margin-bottom:12px;box-shadow:var(--shadow);display:flex;align-items:center;gap:14px;cursor:pointer;">
            <div style="font-size:28px;">☁️</div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:600;">云同步</div>
              <div style="font-size:12px;color:var(--ink-light);margin-top:2px;">${YB.esc(syncSub)}</div>
            </div>
            <div style="color:var(--ink-light);">›</div>
          </div>

          <div class="setting-entry" data-entry="backup" style="background:var(--paper);border-radius:16px;padding:16px;margin-bottom:12px;box-shadow:var(--shadow);display:flex;align-items:center;gap:14px;cursor:pointer;">
            <div style="font-size:28px;">💾</div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:600;">备份与恢复</div>
              <div style="font-size:12px;color:var(--ink-light);margin-top:2px;">导出 / 导入 / 打印手账</div>
            </div>
            <div style="color:var(--ink-light);">›</div>
          </div>

          <div class="setting-entry" data-entry="security" style="background:var(--paper);border-radius:16px;padding:16px;margin-bottom:12px;box-shadow:var(--shadow);display:flex;align-items:center;gap:14px;cursor:pointer;">
            <div style="font-size:28px;">🔒</div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:600;">安全</div>
              <div style="font-size:12px;color:var(--ink-light);margin-top:2px;">修改密码 / 清空数据</div>
            </div>
            <div style="color:var(--ink-light);">›</div>
          </div>
        </div>

        <div style="text-align:center;font-size:12px;color:var(--ink-light);padding:20px;">
          友人簿 v1.1.2.4 · 数据存在你自己的设备和坚果云
        </div>
      </div>

      <div class="bottom-tabbar">
        <div class="tab" onclick="App.navigate('home')"><span class="icon">🏠</span>首页</div>
        <div class="tab" onclick="App.navigate('list')"><span class="icon">📋</span>友人</div>
        <div class="tab active" onclick="App.navigate('settings')"><span class="icon">⚙️</span>设置</div>
      </div>
    `;

    container.querySelectorAll('.setting-entry').forEach(el => {
      el.addEventListener('click', () => {
        const which = el.dataset.entry;
        if (which === 'cloud') renderCloud(container);
        else if (which === 'backup') renderBackup(container);
        else if (which === 'security') renderSecurity(container);
      });
    });

    bindMiniCal(container);
  }

  // 通用子页面外壳
  function subShell(container, title, innerHTML) {
    container.innerHTML = `
      <div class="page">
        <div class="topbar" style="position:relative;justify-content:center;">
          <button class="icon-btn" onclick="Settings.backToMenu()" style="position:absolute;left:16px;font-size:16px;">‹ 返回</button>
          <div style="font-size:16px;font-weight:600;">${title}</div>
        </div>
        <div style="padding:16px;">${innerHTML}</div>
      </div>
    `;
  }

  function backToMenu() {
    const container = document.getElementById('app');
    render(container, window.__onSettingsBack);
  }

  // ============ 云同步 ============
  async function renderCloud(container) {
    const cfg = {
      url: await DB.getMeta('dav_url') || 'https://dav.jianguoyun.com/dav/',
      username: await DB.getMeta('dav_username') || '',
      password: await DB.getMeta('dav_password') || '',
      enabled: await DB.getMeta('dav_enabled') || false
    };
    const lastSync = await DB.getMeta('last_sync_at');

    subShell(container, '云同步', `
      <div style="background:var(--paper);border-radius:16px;padding:16px;box-shadow:var(--shadow);">
        <div class="form-group"><label>服务器地址</label><input id="sDavUrl" value="${YB.esc(cfg.url)}"></div>
        <div class="form-group"><label>坚果云邮箱</label><input id="sDavUser" value="${YB.esc(cfg.username)}"></div>
        <div class="form-group"><label>应用密码（不是登录密码）</label><input type="password" id="sDavPass" value="${YB.esc(cfg.password)}" placeholder="在坚果云「安全选项」里生成"></div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <button class="btn ghost" id="testDavBtn">测试连接</button>
          <label style="font-size:13px;display:flex;align-items:center;gap:6px;">
            <input type="checkbox" id="sDavEnabled" ${cfg.enabled ? 'checked' : ''}> 开启自动同步
          </label>
        </div>
        <div id="sDavMsg" style="font-size:12px;color:var(--ink-light);margin-top:8px;">
          ${lastSync ? '上次同步：' + new Date(lastSync).toLocaleString() : '还没同步过'}
        </div>
      </div>
    `);

    document.getElementById('testDavBtn').addEventListener('click', async () => {
      const msg = document.getElementById('sDavMsg');
      msg.textContent = '测试中…';
      try {
        await WebDAV.testConnection(
          document.getElementById('sDavUrl').value.trim(),
          document.getElementById('sDavUser').value.trim(),
          document.getElementById('sDavPass').value.trim()
        );
        msg.textContent = '✅ 连接成功';
      } catch (e) {
        msg.textContent = '❌ ' + e.message;
      }
    });

    document.getElementById('sDavEnabled').addEventListener('change', saveDav);
    document.getElementById('sDavUrl').addEventListener('change', saveDav);
    document.getElementById('sDavUser').addEventListener('change', saveDav);
    document.getElementById('sDavPass').addEventListener('change', saveDav);
    async function saveDav() {
      await WebDAV.saveConfig({
        url: document.getElementById('sDavUrl').value.trim(),
        username: document.getElementById('sDavUser').value.trim(),
        password: document.getElementById('sDavPass').value.trim(),
        enabled: document.getElementById('sDavEnabled').checked
      });
      if (document.getElementById('sDavEnabled').checked) Sync.pushNow();
    }
  }

  // ============ 备份与恢复 ============
  function renderBackup(container) {
    subShell(container, '备份与恢复', `
      <div style="background:var(--paper);border-radius:16px;padding:16px;box-shadow:var(--shadow);">
        <button class="btn ghost block" id="exportJsonBtn" style="margin-bottom:10px;">导出 JSON 备份</button>
        <button class="btn ghost block" id="importJsonBtn" style="margin-bottom:10px;">导入 JSON 恢复</button>
        <input type="file" id="importFile" accept=".json" class="hidden">
        <button class="btn ghost block" id="exportPdfBtn">导出 PDF（打印手账）</button>
      </div>
    `);

    document.getElementById('exportJsonBtn').addEventListener('click', async () => {
      const data = await DB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `友人簿备份_${YB.todayStr()}.json`;
      a.click();
    });

    document.getElementById('importJsonBtn').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!await YB.confirm('导入将覆盖当前所有数据，确定继续？', '导入', '取消')) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        await DB.importAll(data);
        await YB.alert('导入成功');
        location.reload();
      } catch (err) {
        await YB.alert('文件格式错误：' + err.message);
      }
    });

    document.getElementById('exportPdfBtn').addEventListener('click', async () => {
      const friends = await DB.getAll('friends');
      const moments = await DB.getAll('moments');
      const gifts = await DB.getAll('gifts');
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>友人簿</title></head><body>');
      for (const f of friends) {
        const fm = moments.filter(m => m.friend_id === f.id).sort((a, b) => b.date.localeCompare(a.date));
        const fg = gifts.filter(g => g.friend_id === f.id).sort((a, b) => b.date.localeCompare(a.date));
        w.document.write(`
          <div class="print-friend">
            <h2>${f.nickname || f.name}</h2>
            <div>生日：${f.birthday} · 标签：${(f.tags||[]).join(',')}</div>
            <h4>偏好</h4><div>${f.preferences || '—'}</div>
            <h4>温情小事</h4>
            ${fm.map(m => `<div>${m.date}：${m.content}</div>`).join('')}
            <h4>送礼</h4>
            ${fg.map(g => `<div>${g.date}：${g.gift_name}${g.reaction ? '（反应：'+g.reaction+'）' : ''}</div>`).join('')}
          </div>
        `);
      }
      w.document.write('</body></html>');
      w.document.close();
      setTimeout(() => w.print(), 300);
    });
  }

  // ============ 安全 ============
  function renderSecurity(container) {
    subShell(container, '安全', `
      <div style="background:var(--paper);border-radius:16px;padding:16px;box-shadow:var(--shadow);">
        <button class="btn ghost block" id="changePinBtn" style="margin-bottom:10px;">修改密码</button>
        <button class="btn danger block" id="clearAllBtn">清空所有数据</button>
      </div>
    `);

    document.getElementById('changePinBtn').addEventListener('click', async () => {
      await DB.setMeta('pinHash', null);
      PIN.show(container, () => App.navigate('home'));
    });

    document.getElementById('clearAllBtn').addEventListener('click', async () => {
      if (!await YB.confirm('确定清空所有数据？此操作不可恢复', '清空', '取消')) return;
      await DB.clearAll();
      location.reload();
    });
  }

  return { render, backToMenu };
})();
