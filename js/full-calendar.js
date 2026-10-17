// full-calendar.js —— 全屏日历

const FullCalendar = (() => {
  let calYear, calMonth;
  let selectedDate = null;
  let viewMode = 'month'; // 'month' | 'year'
  let onBack = null;

  const dotColors = {
    birthday: '#E57373',
    custom: '#C38D9E',
    moment: '#90BE6D',
    promise: '#7986CB',
    gift: '#E8B86D'
  };
  const typeIcons = {
    birthday: '🎂',
    custom: '💝',
    moment: '✏️',
    promise: '📌',
    gift: '🎁'
  };

  function toISODate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function collectEvents(year) {
    const friends = await DB.getAll('friends');
    const moments = await DB.getAll('moments');
    const gifts = await DB.getAll('gifts');
    const friendMap = {};
    friends.forEach(f => friendMap[f.id] = f);

    const map = {};
    function push(date, ev) {
      if (!date) return;
      (map[date] = map[date] || []).push(ev);
    }

    friends.forEach(f => {
      if (!f.birthday) return;
      const mmdd = f.birthday.slice(5);
      push(`${year}-${mmdd}`, { type: 'birthday', friendId: f.id, friend: f.nickname || f.name, text: '🎂 生日' });
    });
    friends.forEach(f => {
      (f.custom_dates || []).forEach(cd => {
        if (!cd.date) return;
        const mmdd = cd.date.slice(5);
        push(`${year}-${mmdd}`, { type: 'custom', friendId: f.id, friend: f.nickname || f.name, text: `💝 ${cd.label || '纪念日'}` });
      });
    });
    moments.forEach(m => {
      if (m.type === 'promise') return;
      const f = friendMap[m.friend_id];
      push(m.date, { type: 'moment', friendId: f?.id, friend: f?.nickname || f?.name || '?', text: m.content || '' });
    });
    moments.forEach(m => {
      if (m.type !== 'promise') return;
      if (!m.due_date) return;
      const f = friendMap[m.friend_id];
      push(m.due_date, { type: 'promise', friendId: f?.id, friend: f?.nickname || f?.name || '?', text: '📌 ' + (m.content || ''), done: m.done });
    });
    gifts.forEach(g => {
      const f = friendMap[g.friend_id];
      push(g.date, { type: 'gift', friendId: f?.id, friend: f?.nickname || f?.name || '?', text: `🎁 ${g.gift_name || ''}` });
    });
    return map;
  }

  async function render(container, startDate, backFn) {
    onBack = backFn;
    const d = startDate ? new Date(startDate) : new Date();
    calYear = d.getFullYear();
    calMonth = d.getMonth();
    selectedDate = startDate || toISODate(new Date());
    viewMode = 'month';

    window.__fcBack = () => { onBack && onBack(); };

    await draw(container);
  }

  async function draw(container) {
    if (viewMode === 'year') await drawYear(container);
    else await drawMonth(container);
  }

  // ============ 月视图 ============
  async function drawMonth(container) {
    const events = await collectEvents(calYear);
    const todayStr = toISODate(new Date());

    const firstDay = new Date(calYear, calMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    let cells = '';
    for (let i = 0; i < startWeekday; i++) cells += '<div></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const evs = events[dateStr] || [];
      const hasEvent = evs.length > 0;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;
      cells += `
        <div class="fc-cell" data-date="${dateStr}" style="
          aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
          border-radius:12px;font-size:16px;cursor:pointer;position:relative;
          ${isToday ? 'background:#C38D9E;color:#fff;font-weight:600;' : hasEvent ? 'background:#E8D5D9;color:var(--ink);' : ''}
          ${isSelected && !isToday ? 'outline:2px solid #C38D9E;' : ''}
        ">
          <div>${day}</div>
        </div>
      `;
    }

    // 选中日事件列表
    let dayList = '';
    const selEvs = events[selectedDate] || [];
    let listHtml;
    if (selEvs.length === 0) {
      listHtml = `<div style="font-size:13px;color:var(--ink-light);text-align:center;padding:16px 0;">这一天没有安排</div>`;
    } else {
      const byFriend = {};
      selEvs.forEach(e => {
        const key = e.friend || '其他';
        (byFriend[key] = byFriend[key] || []).push(e);
      });
      listHtml = Object.entries(byFriend).map(([friend, evs]) => `
        <div style="margin-bottom:14px;">
          <div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:6px;">${friend}</div>
          ${evs.map(e => `<div style="font-size:13px;color:var(--ink-light);padding-left:10px;line-height:1.6;${e.done ? 'text-decoration:line-through;opacity:0.5;' : ''}">${e.text}</div>`).join('')}
        </div>
      `).join('');
    }
    dayList = `
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid #eee;">
        <div style="font-size:13px;color:var(--ink-light);margin-bottom:10px;">${selectedDate} 的安排</div>
        ${listHtml}
      </div>
    `;

    container.innerHTML = `
      <div class="page" style="display:flex;flex-direction:column;height:100%;">
        <div class="topbar" style="position:relative;justify-content:center;flex-shrink:0;">
          <button class="icon-btn" onclick="window.__fcBack()" style="position:absolute;left:16px;font-size:16px;">‹ 返回</button>
          <div style="font-size:16px;font-weight:600;">日历</div>
          <button class="icon-btn" id="fcYearToggle" style="position:absolute;right:16px;font-size:18px;" title="年视图">📅</button>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px 0;">
          <button class="icon-btn" id="fcPrev" style="font-size:20px;padding:4px 12px;">‹</button>
          <div style="font-size:15px;font-weight:600;">${calYear}年${calMonth + 1}月</div>
          <button class="icon-btn" id="fcNext" style="font-size:20px;padding:4px 12px;">›</button>
        </div>

        <div id="fcBody" style="flex:1;overflow-y:auto;padding:16px;">
          <div style="display:grid;grid-template-columns:repeat(7,1fr);font-size:12px;color:var(--ink-light);text-align:center;margin-bottom:6px;">
            <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
          </div>
          <div id="fcGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">
            ${cells}
          </div>
          ${dayList}
        </div>
      </div>
    `;

    // 绑定
    document.getElementById('fcPrev').addEventListener('click', () => {
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      drawMonth(container).then(() => bindSwipe(container, +1));
    });
    document.getElementById('fcNext').addEventListener('click', () => {
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      drawMonth(container).then(() => bindSwipe(container, -1));
    });
    document.getElementById('fcYearToggle').addEventListener('click', () => {
      viewMode = 'year';
      draw(container);
    });
    container.querySelectorAll('.fc-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        selectedDate = cell.dataset.date;
        drawMonth(container);
      });
    });
    bindSwipe(container, 0);
  }

  function bindSwipe(container, dir) {
    const body = document.getElementById('fcBody');
    if (!body) return;
    let tx = 0;
    body.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
    body.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) < 60) return;
      if (dx > 0) {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
      } else {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
      }
      drawMonth(container);
    }, { passive: true });
  }

  // ============ 年视图 ============
  async function drawYear(container) {
    const events = await collectEvents(calYear);
    const today = new Date();
    const todayStr = toISODate(today);

    let monthsHtml = '';
    for (let m = 0; m < 12; m++) {
      const firstDay = new Date(calYear, m, 1).getDay();
      const dim = new Date(calYear, m + 1, 0).getDate();
      let miniCells = '';
      for (let i = 0; i < firstDay; i++) miniCells += '<span></span>';
      for (let d = 1; d <= dim; d++) {
        const ds = `${calYear}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const has = events[ds] && events[ds].length > 0;
        const isToday = ds === todayStr;
        miniCells += `<span style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:9px;border-radius:50%;${isToday ? 'background:#C38D9E;color:#fff;' : has ? 'background:#E8D5D9;' : ''}">${d}</span>`;
      }
      monthsHtml += `
        <div class="fc-year-month" data-month="${m}" style="background:var(--paper);border-radius:12px;padding:10px;box-shadow:var(--shadow);cursor:pointer;">
          <div style="font-size:12px;font-weight:600;text-align:center;margin-bottom:6px;">${m + 1}月</div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;">${miniCells}</div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="page">
        <div class="topbar" style="position:relative;justify-content:center;flex-shrink:0;">
          <button class="icon-btn" onclick="window.__fcBack()" style="position:absolute;left:16px;font-size:16px;">‹ 返回</button>
          <div style="font-size:16px;font-weight:600;">年视图</div>
          <button class="icon-btn" id="fcMonthToggle" style="position:absolute;right:16px;font-size:18px;" title="月视图">📅</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px 0;">
          <button class="icon-btn" id="fcYearPrev" style="font-size:20px;padding:4px 12px;">‹</button>
          <div style="font-size:15px;font-weight:600;">${calYear}年</div>
          <button class="icon-btn" id="fcYearNext" style="font-size:20px;padding:4px 12px;">›</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:16px 16px 20px;">
          ${monthsHtml}
        </div>
      </div>
    `;

    document.getElementById('fcMonthToggle').addEventListener('click', () => {
      viewMode = 'month';
      draw(container);
    });
    document.getElementById('fcYearPrev').addEventListener('click', () => { calYear--; drawYear(container); });
    document.getElementById('fcYearNext').addEventListener('click', () => { calYear++; drawYear(container); });
    container.querySelectorAll('.fc-year-month').forEach(el => {
      el.addEventListener('click', () => {
        calMonth = parseInt(el.dataset.month);
        viewMode = 'month';
        draw(container);
      });
    });
  }

  return { render };
})();
