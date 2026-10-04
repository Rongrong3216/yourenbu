// quick-note.js —— 快速记一笔温情小事

const QuickNote = (() => {
  function open(friend, onSaved) {
    const mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = `
      <div class="modal-sheet">
        <h3>记一笔 · ${YB.esc(friend.nickname || friend.name)}</h3>
        <div class="form-group">
          <label>日期</label>
          <input type="date" id="qnDate" value="${YB.todayStr()}">
        </div>
        <div class="form-group">
          <label>写点什么</label>
          <textarea id="qnContent" placeholder="你们今天做了什么？他说的哪句话让你感动？"></textarea>
        </div>
        <div style="display:flex;gap:12px;margin-top:16px;">
          <button class="btn ghost block" id="qnCancel">取消</button>
          <button class="btn block" id="qnSave">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(mask);

    mask.addEventListener('click', (e) => { if (e.target === mask) mask.remove(); });
    document.getElementById('qnCancel').addEventListener('click', () => mask.remove());

    document.getElementById('qnSave').addEventListener('click', async () => {
      const content = document.getElementById('qnContent').value.trim();
      const date = document.getElementById('qnDate').value;
      if (!content) return alert('写点什么再保存');
      await DB.put('moments', {
        id: YB.genId('m'),
        friend_id: friend.id,
        date,
        content,
        created_at: YB.nowISO()
      });
      friend.last_contact_at = new Date(date).toISOString();
      await DB.put('friends', friend);
      Sync.markLocalModified();
      Sync.schedulePush();
      mask.remove();
      onSaved && onSaved();
    });
  }

  return { open };
})();
