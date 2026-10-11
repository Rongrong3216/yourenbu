// quick-note.js —— 快速记一笔（小事 / 承诺）

const QuickNote = (() => {
  function open(friend, onSaved, editItem) {
    const isEdit = !!editItem;
    const initialType = editItem ? (editItem.type === 'promise' ? 'promise' : 'moment') : 'moment';
    const initialDate = editItem ? editItem.date : YB.todayStr();
    const initialContent = editItem ? editItem.content : '';
    const initialDue = editItem ? (editItem.due_date || '') : '';

    const mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = `
      <div class="modal-sheet">
        <h3>${isEdit ? '编辑' : '记一笔'} · ${YB.esc(friend.nickname || friend.name)}</h3>
        <div style="display:flex;gap:10px;margin-bottom:16px;">
          <div id="typeMoment" style="flex:1;text-align:center;padding:10px;border:1px solid var(--accent);border-radius:10px;cursor:pointer;background:rgba(195,141,158,0.1);">
            <div style="font-size:20px;">📝</div>
            <div style="font-size:13px;margin-top:4px;">小事</div>
          </div>
          <div id="typePromise" style="flex:1;text-align:center;padding:10px;border:1px solid var(--line);border-radius:10px;cursor:pointer;">
            <div style="font-size:20px;">📌</div>
            <div style="font-size:13px;margin-top:4px;">承诺</div>
          </div>
        </div>
        <div class="form-group">
          <label>日期</label>
          <input type="date" id="qnDate" value="${initialDate}">
        </div>
        <div class="form-group" id="dueGroup" style="display:none;">
          <label>截止日期（可选）</label>
          <input type="date" id="qnDue" value="${initialDue}">
        </div>
        <div class="form-group">
          <label>写点什么</label>
          <textarea id="qnContent" placeholder="你们今天做了什么？他说的哪句话让你感动？">${YB.esc(initialContent)}</textarea>
        </div>
        <div style="display:flex;gap:12px;margin-top:16px;">
          <button class="btn ghost block" id="qnCancel">取消</button>
          <button class="btn block" id="qnSave">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(mask);

    let currentType = initialType;

    const typeMoment = mask.querySelector('#typeMoment');
    const typePromise = mask.querySelector('#typePromise');
    const dueGroup = mask.querySelector('#dueGroup');

    function switchType(t) {
      currentType = t;
      if (t === 'moment') {
        typeMoment.style.background = 'rgba(195,141,158,0.1)';
        typeMoment.style.borderColor = 'var(--accent)';
        typePromise.style.background = '';
        typePromise.style.borderColor = 'var(--line)';
        dueGroup.style.display = 'none';
      } else {
        typePromise.style.background = 'rgba(195,141,158,0.1)';
        typePromise.style.borderColor = 'var(--accent)';
        typeMoment.style.background = '';
        typeMoment.style.borderColor = 'var(--line)';
        dueGroup.style.display = 'block';
      }
    }
    if (initialType === 'promise') switchType('promise');

    typeMoment.addEventListener('click', () => switchType('moment'));
    typePromise.addEventListener('click', () => switchType('promise'));

    mask.addEventListener('click', (e) => { if (e.target === mask) mask.remove(); });
    mask.querySelector('#qnCancel').addEventListener('click', () => mask.remove());

    mask.querySelector('#qnSave').addEventListener('click', async () => {
      const content = mask.querySelector('#qnContent').value.trim();
      const date = mask.querySelector('#qnDate').value;
      if (!content) return alert('写点什么再保存');

      const data = {
        id: isEdit ? editItem.id : YB.genId('m'),
        friend_id: friend.id,
        date,
        content,
        type: currentType,
        created_at: isEdit ? editItem.created_at : YB.nowISO()
      };
      if (currentType === 'promise') {
        const due = mask.querySelector('#qnDue').value;
        if (due) data.due_date = due;
        data.done = isEdit ? !!editItem.done : false;
      }

      await DB.put('moments', data);
      if (!isEdit) {
        friend.last_contact_at = new Date(date).toISOString();
        await DB.put('friends', friend);
      }
      Sync.markLocalModified();
      Sync.schedulePush();
      mask.remove();
      onSaved && onSaved();
    });
  }

  return { open };
})();
