// card.js —— 翻卡组件

const Card = (() => {
  let friends = [];
  let idx = 0;
  let stage = null;
  let onOpenDetail = null;

  async function render(container, list, openDetail) {
    stage = container;
    friends = list;
    idx = 0;
    onOpenDetail = openDetail;

    if (friends.length === 0) {
      stage.innerHTML = '<div style="text-align:center;color:var(--ink-light);">还没有朋友，点右下角 + 添加第一个吧</div>';
      return;
    }

    draw();
  }

  async function draw() {
    const f = friends[idx];
    if (!f) return;

    const bd = YB.daysUntilBirthday(f.birthday);
    const last = YB.formatRelative(f.last_contact_at);
    const bg = YB.colorHash(f.name);
    const initial = (f.nickname || f.name).charAt(0);

    // 最近一条温情
    const moments = await DB.getAll('moments');
    const myMoments = moments.filter(m => m.friend_id === f.id).sort((a, b) => b.date.localeCompare(a.date));
    const lastMoment = myMoments[0];

    // 最近送礼
    const gifts = await DB.getAll('gifts');
    const myGifts = gifts.filter(g => g.friend_id === f.id).sort((a, b) => b.date.localeCompare(a.date));
    const lastGift = myGifts[0];

    const known = YB.calcKnownDuration(f.known_anniversary);
    const prefFirst = (f.preferences || '').split('；')[0] || (f.preferences || '').slice(0, 30);

    stage.innerHTML = `
      <div class="flip-card" id="flipCard">
        <div class="flip-face front face-front">
          <div class="avatar" style="background:${bg}">${YB.esc(initial)}</div>
          <div class="name">${YB.esc(f.nickname || f.name)}</div>
          <div class="tags">${(f.tags || []).slice(0, 2).map(t => `<span class="tag-pill">${YB.esc(t)}</span>`).join('')}</div>
          <div class="stats">
            <div class="stat">
              <div class="num">${bd === 0 ? '今天' : bd + '天'}</div>
              <div class="lbl">距生日</div>
            </div>
            <div class="stat">
              <div class="num">${YB.esc(last)}</div>
              <div class="lbl">上次联系</div>
            </div>
          </div>
          ${lastMoment ? `<div class="moment-snippet">"${YB.esc(lastMoment.content.slice(0, 50))}${lastMoment.content.length > 50 ? '…' : ''}"</div>` : '<div class="moment-snippet"></div>'}
          <button class="btn ghost quick-note-btn" id="quickNoteBtn">+ 记一笔</button>
        </div>

        <div class="flip-face back face-back">
          <div class="back-header">
            <div class="name">${YB.esc(f.nickname || f.name)}</div>
            <div>${(f.tags || []).slice(0, 2).map(t => `<span class="tag-pill">${YB.esc(t)}</span>`).join('')}</div>
          </div>
          ${prefFirst ? `<div class="back-block"><div class="lbl">💝 偏好</div>${YB.esc(prefFirst)}</div>` : ''}
          ${lastGift ? `<div class="back-block"><div class="lbl">🎁 最近送礼</div>${YB.esc(lastGift.gift_name)} · ${YB.esc(lastGift.date)}</div>` : ''}
          ${known ? `<div class="back-block"><div class="lbl">📅 ${YB.esc(known)}</div></div>` : ''}
          <div class="enter-detail-btn" id="enterDetailBtn">查看完整档案 →</div>
        </div>
      </div>
      <div class="swipe-hint" style="${f.id && f.id.startsWith('sample_') ? '' : 'display:none;'}">‹ 左右滑动切换 · 点卡片翻面 ›</div>
    `;

    const card = document.getElementById('flipCard');

    // 点卡片翻面
    card.addEventListener('click', (e) => {
      if (e.target.id === 'quickNoteBtn' || e.target.id === 'enterDetailBtn') return;
      card.classList.toggle('flipped');
    });

    // 快捷记一笔
    document.getElementById('quickNoteBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      QuickNote.open(f, () => draw());
    });

    // 进档案
    document.getElementById('enterDetailBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      App.navigate('detail', { id: f.id });
    });

    // 左右滑
    const hammer = new Hammer(card);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_HORIZONTAL });
    hammer.on('swipeleft', () => move(1));
    hammer.on('swiperight', () => move(-1));
  }

  function move(delta) {
    idx = (idx + delta + friends.length) % friends.length;
    draw();
  }

  return { render };
})();
