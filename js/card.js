// card.js —— 横向平铺轮播 + 翻卡

const Card = (() => {
  let stage = null;

  async function render(container, list, openDetail) {
    stage = container;

    if (!list || list.length === 0) {
      stage.innerHTML = '<div style="text-align:center;color:var(--ink-light);">还没有朋友，点右下角 + 添加第一个吧</div>';
      return;
    }

    const [allMoments, allGifts] = await Promise.all([DB.getAll('moments'), DB.getAll('gifts')]);

    stage.innerHTML = list.map(f => buildCardHTML(f, allMoments, allGifts)).join('');

    // 每张卡片绑定事件
    stage.querySelectorAll('.flip-card').forEach((card, i) => {
      const f = list[i];

      card.addEventListener('click', (e) => {
        if (e.target.dataset.btn) return;
        card.classList.toggle('flipped');
      });

      const noteBtn = card.querySelector('[data-btn="note"]');
      if (noteBtn) noteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        QuickNote.open(f, () => render(container, list, openDetail));
      });

      const detailBtn = card.querySelector('[data-btn="detail"]');
      if (detailBtn) detailBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        App.navigate('detail', { id: f.id });
      });

      const markBtn = card.querySelector('[data-btn="mark"]');
      if (markBtn) markBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const alreadyMarked = f.last_contact_at && f.last_contact_at.slice(0, 10) === YB.todayStr();
        if (alreadyMarked) {
          if (!confirm('取消今天的联系标记？')) return;
          f.last_contact_at = null;
        } else {
          f.last_contact_at = YB.nowISO();
        }
        await DB.put('friends', f);
        Sync.markLocalModified();
        Sync.schedulePush();
        // 只更新按钮状态，不重新渲染（避免翻回正面）
        const nowMarked = f.last_contact_at && f.last_contact_at.slice(0, 10) === YB.todayStr();
        markBtn.style.opacity = nowMarked ? '0.4' : '';
        markBtn.textContent = nowMarked ? '✓ 今天已联系' : '✓ 标记今天联系过';
      });
    });
  }

  function buildCardHTML(f, allMoments, allGifts) {
    const bd = YB.daysUntilBirthday(f.birthday);
    const last = YB.formatRelative(f.last_contact_at);
    const bg = YB.colorHash(f.name);
    const initial = (f.nickname || f.name).charAt(0);
    const myMoments = allMoments.filter(m => m.friend_id === f.id).sort((a, b) => b.date.localeCompare(a.date));
    const lastMoment = myMoments.find(m => m.type !== 'promise');
    const myGifts = allGifts.filter(g => g.friend_id === f.id).sort((a, b) => b.date.localeCompare(a.date));
    const lastGift = myGifts[0];
    const myPromises = myMoments.filter(m => m.type === 'promise' && !m.done);
    const known = YB.calcKnownDuration(f.known_anniversary);
    const prefFirst = (f.likes || f.preferences || '').split('；')[0] || (f.likes || f.preferences || '').slice(0, 30);
    const isMarkedToday = f.last_contact_at && f.last_contact_at.slice(0, 10) === YB.todayStr();

    return `
      <div class="card-snap">
        <div class="flip-card">
          <div class="flip-face front face-front">
            <div class="avatar" style="background:${f.avatar ? 'none' : bg};overflow:hidden;">${f.avatar ? `<img src="${f.avatar}" style="width:100%;height:100%;object-fit:cover;">` : YB.esc(initial)}</div>
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
            ${lastMoment ? `<div class="moment-snippet">"${YB.esc(lastMoment.content.slice(0, 50))}${lastMoment.content.length > 50 ? '…' : ''}"</div>` : ''}
            <button class="btn ghost quick-note-btn" data-btn="note">+ 记一笔</button>
          </div>
          <div class="flip-face back face-back">
            <div class="back-header">
              <div class="name">${YB.esc(f.nickname || f.name)}</div>
              <div>${(f.tags || []).slice(0, 2).map(t => `<span class="tag-pill">${YB.esc(t)}</span>`).join('')}</div>
              ${known ? `<div style="margin-top:8px;font-size:13px;color:var(--ink-light);text-align:center;">📅 ${YB.esc(known)}</div>` : ''}
            </div>
            ${prefFirst ? `<div class="back-block"><div class="lbl">💝 偏好</div>${YB.esc(prefFirst)}</div>` : ''}
            ${lastGift ? `<div class="back-block"><div class="lbl">🎁 最近送礼</div>${YB.esc(lastGift.gift_name)} · ${YB.esc(lastGift.date)}</div>` : ''}
            ${myPromises.length > 0 ? `<div class="back-block"><div class="lbl">📌 待履行承诺</div>${myPromises.slice(0,2).map(p => `<div style="margin-top:4px;">• ${YB.esc(p.content)}${p.due_date ? ` <span style="color:var(--danger);font-size:12px;">（${p.due_date}前）</span>` : ''}</div>`).join('')}</div>` : ''}
            <button class="btn ghost block" data-btn="mark" style="margin-top:auto;${isMarkedToday ? 'opacity:0.4;' : ''}">${isMarkedToday ? '✓ 今天已联系' : '✓ 标记今天联系过'}</button>
            <div class="enter-detail-btn" data-btn="detail" style="margin-top:6px;">查看完整档案 →</div>
          </div>
        </div>
      </div>
    `;
  }

  return { render };
})();
