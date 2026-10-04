// friend-form.js —— 新增/编辑朋友

const FriendForm = (() => {
  async function render(container, params, onDone) {
    const f = params.friend || {};
    const isEdit = !!f.id;
    window.__onFormDone = onDone;

    container.innerHTML = `
      <div class="page">
        <div class="topbar">
          <button class="icon-btn" onclick="window.__onFormDone()">‹ 取消</button>
          <div style="font-size:16px;font-weight:600;">${isEdit ? '编辑朋友' : '新朋友'}</div>
          <button class="icon-btn" id="saveFriendBtn">✓</button>
        </div>

        <div class="form-group"><label>姓名 *</label><input id="fName" value="${YB.esc(f.name || '')}"></div>
        <div class="form-group"><label>昵称</label><input id="fNickname" value="${YB.esc(f.nickname || '')}"></div>
        <div class="form-group"><label>生日 *</label><input type="date" id="fBirthday" value="${YB.esc(f.birthday || '')}"></div>
        <div class="form-group"><label>微信/电话</label><input id="fContact" value="${YB.esc(f.contact || '')}"></div>
        <div class="form-group"><label>职业</label><input id="fOccupation" value="${YB.esc(f.occupation || '')}"></div>
        <div class="form-group"><label>怎么认识的</label><input id="fMet" value="${YB.esc(f.how_we_met || '')}"></div>
        <div class="form-group"><label>认识纪念日</label><input type="date" id="fKnown" value="${YB.esc(f.known_anniversary || '')}"></div>
        <div class="form-group"><label>标签（逗号分隔）</label><input id="fTags" value="${YB.esc((f.tags || []).join(','))}"></div>
        <div class="form-group"><label>偏好与雷区</label><textarea id="fPrefs">${YB.esc(f.preferences || '')}</textarea></div>

        ${isEdit ? `<div style="padding:16px;"><button class="btn danger block" id="delFriendBtn">删除这个朋友</button></div>` : ''}
      </div>
    `;

    document.getElementById('saveFriendBtn').addEventListener('click', async () => {
      const name = document.getElementById('fName').value.trim();
      const birthday = document.getElementById('fBirthday').value;
      if (!name || !birthday) return alert('姓名和生日必填');

      const data = {
        ...f,
        id: f.id || YB.genId('f'),
        name,
        nickname: document.getElementById('fNickname').value.trim(),
        birthday,
        contact: document.getElementById('fContact').value.trim(),
        occupation: document.getElementById('fOccupation').value.trim(),
        how_we_met: document.getElementById('fMet').value.trim(),
        known_anniversary: document.getElementById('fKnown').value,
        tags: document.getElementById('fTags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
        preferences: document.getElementById('fPrefs').value,
        updated_at: YB.nowISO()
      };
      if (!data.created_at) {
        data.created_at = YB.nowISO();
        data.last_contact_at = YB.nowISO();
      }
      await DB.put('friends', data);
      Sync.markLocalModified();
      Sync.schedulePush();
      // 立即验证是否真的写进去了
      const verify = await DB.getById('friends', data.id);
      if (!verify) {
        alert('保存失败：数据没有真正写入本地存储，请截图告诉我');
        return;
      }
      const all = await DB.getAll('friends');
      console.log('保存后朋友总数：', all.length);
      onDone();
    });

    if (isEdit) {
      document.getElementById('delFriendBtn').addEventListener('click', async () => {
        if (!confirm('确定删除这个朋友？相关的温情小事和送礼记录也会删掉')) return;
        await DB.remove('friends', f.id);
        const moments = await DB.getAll('moments');
        for (const m of moments.filter(m => m.friend_id === f.id)) await DB.remove('moments', m.id);
        const gifts = await DB.getAll('gifts');
        for (const g of gifts.filter(g => g.friend_id === f.id)) await DB.remove('gifts', g.id);
        Sync.markLocalModified();
        Sync.schedulePush();
        onDone();
      });
    }
  }

  return { render };
})();
