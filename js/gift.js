// gift.js —— 送礼记录弹窗

const GiftForm = (() => {
  function open(friend, onSaved) {
    const mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = `
      <div class="modal-sheet">
        <h3>记一笔送礼 · ${YB.esc(friend.nickname || friend.name)}</h3>
        <div class="form-group"><label>日期</label><input type="date" id="gDate" value="${YB.todayStr()}"></div>
        <div class="form-group"><label>送了什么 *</label><input id="gName" placeholder="比如：香水"></div>
        <div class="form-group"><label>花费</label><input type="number" id="gCost" placeholder="可选"></div>
        <div class="form-group"><label>对方反应</label><input id="gReaction" placeholder="可选"></div>
        <div style="display:flex;gap:12px;margin-top:16px;">
          <button class="btn ghost block" id="gCancel">取消</button>
          <button class="btn block" id="gSave">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(mask);
    mask.addEventListener('click', e => { if (e.target === mask) mask.remove(); });
    document.getElementById('gCancel').addEventListener('click', () => mask.remove());
    document.getElementById('gSave').addEventListener('click', async () => {
      const name = document.getElementById('gName').value.trim();
      if (!name) return alert('送了什么必填');
      await DB.put('gifts', {
        id: YB.genId('g'),
        friend_id: friend.id,
        date: document.getElementById('gDate').value,
        gift_name: name,
        cost: Number(document.getElementById('gCost').value) || null,
        reaction: document.getElementById('gReaction').value.trim()
      });
      Sync.markLocalModified();
      Sync.schedulePush();
      mask.remove();
      onSaved && onSaved();
    });
  }
  return { open };
})();
