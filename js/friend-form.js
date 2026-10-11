// friend-form.js —— 新增/编辑朋友

// 通用裁剪函数：选完图后弹裁剪层，返回 Promise<dataURL>
function cropImage(src) {
  return new Promise((resolve) => {
    const mask = document.createElement('div');
    mask.style.cssText = 'position:fixed;inset:0;background:#000;z-index:400;display:flex;flex-direction:column;';
    mask.innerHTML = `
      <div style="display:flex;justify-content:space-between;padding:16px;align-items:center;color:#fff;">
        <button id="cropCancel" style="background:none;border:none;color:#fff;font-size:16px;cursor:pointer;">取消</button>
        <div style="font-size:16px;">调整头像</div>
        <button id="cropOk" style="background:none;border:none;color:#fff;font-size:16px;cursor:pointer;font-weight:600;">完成</button>
      </div>
      <div id="cropStage" style="flex:1;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;">
        <img id="cropImg" style="position:absolute;max-width:none;user-select:none;-webkit-user-drag:none;">
        <div style="position:absolute;width:250px;height:250px;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,0.5);pointer-events:none;border-radius:8px;"></div>
      </div>
    `;
    document.body.appendChild(mask);

    const img = mask.querySelector('#cropImg');
    const stage = mask.querySelector('#cropStage');
    let scale = 1, tx = 0, ty = 0;

    img.onload = () => {
      // 初始缩放：让图片短边填满 250 方框
      const boxSize = 250;
      const s = boxSize / Math.min(img.width, img.height);
      scale = s;
      applyTransform();
    };
    img.src = src;

    function applyTransform() {
      img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }

    // 拖动
    let startX = 0, startY = 0, startTx = 0, startTy = 0;
    stage.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTx = tx; startTy = ty;
    }, { passive: true });
    stage.addEventListener('touchmove', (e) => {
      tx = startTx + (e.touches[0].clientX - startX);
      ty = startTy + (e.touches[0].clientY - startY);
      applyTransform();
    }, { passive: true });

    // 鼠标也支持（电脑调试用）
    let mouseDown = false;
    stage.addEventListener('mousedown', (e) => {
      mouseDown = true;
      startX = e.clientX; startY = e.clientY;
      startTx = tx; startTy = ty;
    });
    window.addEventListener('mousemove', (e) => {
      if (!mouseDown) return;
      tx = startTx + (e.clientX - startX);
      ty = startTy + (e.clientY - startY);
      applyTransform();
    });
    window.addEventListener('mouseup', () => mouseDown = false);

    mask.querySelector('#cropCancel').onclick = () => { mask.remove(); resolve(null); };
    mask.querySelector('#cropOk').onclick = () => {
      // 裁剪：canvas 200x200
      const canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 200;
      const ctx = canvas.getContext('2d');
      // 方框在屏幕上的大小是250，对应输出200
      const boxSize = 250;
      const outSize = 200;
      // 原图中对应的区域
      const sx = (-tx / scale) + ((img.width * scale - boxSize) / 2 / scale);
      const sy = (-ty / scale) + ((img.height * scale - boxSize) / 2 / scale);
      const sw = boxSize / scale;
      const sh = boxSize / scale;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outSize, outSize);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      mask.remove();
      resolve(dataUrl);
    };
  });
}

const FriendForm = (() => {
  async function render(container, params, onDone) {
    const f = params.friend || {};
    const isEdit = !!f.id;
    window.__onFormDone = onDone;

    const customRels = (await DB.getMeta('customRelations')) || [];
    const presetRels = [{name:'家人',icon:'👨‍👩‍👧'},{name:'好友',icon:'💛'},{name:'同学',icon:'🎓'},{name:'同事',icon:'💼'}];
    const allRels = [...presetRels, ...customRels];

    container.innerHTML = `
      <div class="page">
        <div class="topbar" style="position:relative;justify-content:center;">
          <button class="icon-btn" onclick="window.__onFormDone()" style="position:absolute;left:16px;font-size:16px;">‹ 取消</button>
          <div style="font-size:16px;font-weight:600;">${isEdit ? '编辑朋友' : '新朋友'}</div>
          <button class="icon-btn" id="saveFriendBtn" style="position:absolute;right:16px;">✓</button>
        </div>

        ${isEdit ? `
        <div style="text-align:center;padding:16px 0;">
          <div id="fAvatar" style="width:80px;height:80px;border-radius:50%;background:${f.avatar ? 'none' : YB.colorHash(f.name || '?')};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:32px;cursor:pointer;overflow:hidden;">
            ${f.avatar ? `<img src="${f.avatar}" style="width:100%;height:100%;object-fit:cover;">` : YB.esc((f.nickname || f.name || '?').charAt(0))}
          </div>
          <div style="font-size:12px;color:var(--ink-light);margin-top:8px;">点击更换头像</div>
          <input type="file" id="fAvatarInput" accept="image/*" style="display:none;">
        </div>
        ` : ''}

        <div class="form-group"><label>姓名 *</label><input id="fName" value="${YB.esc(f.name || '')}"></div>
        <div class="form-group"><label>昵称</label><input id="fNickname" value="${YB.esc(f.nickname || '')}"></div>
        <div class="form-group"><label>生日</label>
          <input type="hidden" id="fBirthday" value="${YB.esc(f.birthday || '')}">
          <div id="fBirthdayDisplay" style="padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--paper);cursor:pointer;color:${f.birthday ? 'var(--ink)' : 'var(--ink-light)'};">
            ${f.birthday ? YB.esc(f.birthday) : '点击选择生日（可选）'}
          </div>
        </div>
        <div class="form-group"><label>微信/电话</label><input id="fContact" value="${YB.esc(f.contact || '')}"></div>
        <div class="form-group"><label>职业</label><input id="fOccupation" value="${YB.esc(f.occupation || '')}"></div>
        <div class="form-group"><label>怎么认识的</label><input id="fMet" value="${YB.esc(f.how_we_met || '')}"></div>
        <div class="form-group"><label>认识纪念日</label><input type="date" id="fKnown" value="${YB.esc(f.known_anniversary || '')}"></div>
        <div class="form-group"><label>关系类型（可多选）</label>
          <div id="relationPick" style="display:flex;gap:10px;flex-wrap:wrap;">
            ${allRels.map(r => `
              <div class="relation-opt" data-rel="${YB.esc(r.name)}" style="padding:10px 16px;border:1px solid var(--line);border-radius:12px;cursor:pointer;text-align:center;font-size:13px;${(f.relation||[]).includes(r.name) ? 'border-color:var(--accent);background:rgba(195,141,158,0.1);' : ''}">
                <div style="font-size:20px;">${r.icon || '📌'}</div>
                <div style="margin-top:4px;">${YB.esc(r.name)}</div>
              </div>
            `).join('')}
            <div id="addRelBtn" style="padding:10px 16px;border:1px dashed var(--line);border-radius:12px;cursor:pointer;text-align:center;font-size:13px;color:var(--ink-light);">
              <div style="font-size:20px;">＋</div>
              <div style="margin-top:4px;">添加</div>
            </div>
          </div>
        </div>
        <div class="form-group"><label>标签（逗号分隔，自由补充）</label><input id="fTags" value="${YB.esc((f.tags || []).join(','))}"></div>
        <div class="form-group"><label>喜爱（口味、爱好、喜欢的礼物类型）</label><textarea id="fLikes">${YB.esc(f.likes || (f.preferences && f.preferences.includes('；') ? '' : f.preferences) || '')}</textarea></div>
        <div class="form-group"><label>雷区（别送什么、别聊什么）</label><textarea id="fDislikes">${YB.esc(f.dislikes || '')}</textarea></div>

        ${isEdit ? `<div style="padding:16px;"><button class="btn danger block" id="delFriendBtn">删除这个朋友</button></div>` : ''}
      </div>
    `;

    // 关系类型点选
    const pickedRel = new Set(f.relation || []);
    document.querySelectorAll('.relation-opt').forEach(el => {
      el.addEventListener('click', () => {
        const r = el.dataset.rel;
        if (pickedRel.has(r)) { pickedRel.delete(r); el.style.borderColor = ''; el.style.background = ''; }
        else { pickedRel.add(r); el.style.borderColor = 'var(--accent)'; el.style.background = 'rgba(195,141,158,0.1)'; }
      });
    });

    // 自定义添加关系
    // 头像选择（仅编辑时）
    let newAvatar = f.avatar || '';
    if (isEdit) {
      document.getElementById('fAvatar').addEventListener('click', () => {
        const mask = document.createElement('div');
        mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:300;display:flex;align-items:flex-end;';
        mask.innerHTML = `
          <div style="background:var(--paper);width:100%;border-radius:16px 16px 0 0;padding:16px;">
            <button id="avatarUpload" style="width:100%;padding:14px;border:none;background:none;font-size:16px;cursor:pointer;border-bottom:1px solid var(--line);">📷 上传新头像</button>
            <button id="avatarReset" style="width:100%;padding:14px;border:none;background:none;font-size:16px;cursor:pointer;color:var(--danger);">↩️ 恢复默认头像</button>
            <button id="avatarCancel" style="width:100%;padding:14px;border:none;background:var(--bg);font-size:16px;cursor:pointer;margin-top:8px;border-radius:10px;">取消</button>
          </div>
        `;
        document.body.appendChild(mask);
        mask.querySelector('#avatarCancel').onclick = () => mask.remove();
        mask.querySelector('#avatarReset').onclick = () => {
          mask.remove();
          newAvatar = '';
          const avatarEl = document.getElementById('fAvatar');
          avatarEl.style.background = YB.colorHash(f.name || '?');
          avatarEl.textContent = (f.nickname || f.name || '?').charAt(0);
        };
        mask.querySelector('#avatarUpload').onclick = () => {
          mask.remove();
          document.getElementById('fAvatarInput').click();
        };
      });
      document.getElementById('fAvatarInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = await cropImage(ev.target.result);
          if (!dataUrl) return;
          newAvatar = dataUrl;
          const avatarEl = document.getElementById('fAvatar');
          avatarEl.style.background = 'none';
          avatarEl.innerHTML = `<img src="${newAvatar}" style="width:100%;height:100%;object-fit:cover;">`;
        };
        reader.readAsDataURL(file);
      });
    }

    // 生日滚轮选择器
    document.getElementById('fBirthdayDisplay').addEventListener('click', () => {
      const current = document.getElementById('fBirthday').value;
      const curY = current ? parseInt(current.slice(0,4)) : 2003;
      const curM = current ? parseInt(current.slice(5,7)) : 1;
      const curD = current ? parseInt(current.slice(8,10)) : 1;

      const years = []; for (let y = 1950; y <= 2099; y++) years.push(y);
      const months = Array.from({length:12}, (_,i) => i+1);
      const daysInMonth = (y,m) => new Date(y, m, 0).getDate();

      const mask = document.createElement('div');
      mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:300;display:flex;align-items:flex-end;';
      mask.innerHTML = `
        <div style="background:var(--paper);width:100%;border-radius:20px 20px 0 0;padding:16px;max-height:60vh;">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <button id="bdCancel" style="border:none;background:none;font-size:15px;color:var(--ink-light);cursor:pointer;">取消</button>
            <button id="bdOk" style="border:none;background:none;font-size:15px;color:var(--accent);font-weight:600;cursor:pointer;">确定</button>
          </div>
          <div style="display:flex;height:180px;overflow:hidden;position:relative;">
            <div style="position:absolute;top:50%;left:0;right:0;height:36px;background:rgba(0,0,0,0.05);transform:translateY(-50%);pointer-events:none;"></div>
            <div id="bdY" style="flex:1;overflow-y:scroll;text-align:center;scrollbar-width:none;"></div>
            <div id="bdM" style="flex:1;overflow-y:scroll;text-align:center;scrollbar-width:none;"></div>
            <div id="bdD" style="flex:1;overflow-y:scroll;text-align:center;scrollbar-width:none;"></div>
          </div>
        </div>
      `;
      document.body.appendChild(mask);

      function fillWheel(el, items, selected, unit) {
        el.innerHTML = items.map(i => `<div data-v="${i}" style="height:36px;line-height:36px;font-size:16px;cursor:pointer;">${i}${unit}</div>`).join('');
        const idx = items.indexOf(selected);
        const centerOffset = (180 - 36) / 2; // 高亮框居中偏移
        requestAnimationFrame(() => { el.scrollTop = idx * 36 - centerOffset; });
      }

      fillWheel(mask.querySelector('#bdY'), years, curY, '年');
      fillWheel(mask.querySelector('#bdM'), months, curM, '月');
      fillWheel(mask.querySelector('#bdD'), Array.from({length:daysInMonth(curY,curM)},(_,i)=>i+1), curD > daysInMonth(curY,curM) ? daysInMonth(curY,curM) : curD, '日');

      let selY = curY, selM = curM, selD = curD;

      function bindScroll(el, unit, cb) {
        el.addEventListener('scroll', () => {
          const centerOffset = (180 - 36) / 2;
          const idx = Math.round((el.scrollTop + centerOffset) / 36);
          const items = el.querySelectorAll('[data-v]');
          if (items[idx]) cb(parseInt(items[idx].dataset.v));
        });
        el.querySelectorAll('[data-v]').forEach(d => {
          d.onclick = () => {
            const centerOffset = (180 - 36) / 2;
            const idx = [...el.children].indexOf(d);
            el.scrollTo({top: idx * 36 - centerOffset, behavior:'smooth'});
          };
        });
      }

      bindScroll(mask.querySelector('#bdY'), '年', v => { selY = v; const dd = mask.querySelector('#bdD'); fillWheel(dd, Array.from({length:daysInMonth(v,selM)},(_,i)=>i+1), Math.min(selD, daysInMonth(v,selM)), '日'); });
      bindScroll(mask.querySelector('#bdM'), '月', v => { selM = v; const dd = mask.querySelector('#bdD'); fillWheel(dd, Array.from({length:daysInMonth(selY,v)},(_,i)=>i+1), Math.min(selD, daysInMonth(selY,v)), '日'); });
      bindScroll(mask.querySelector('#bdD'), '日', v => selD = v);

      mask.querySelector('#bdCancel').onclick = () => mask.remove();
      mask.onclick = (e) => { if (e.target === mask) mask.remove(); };
      mask.querySelector('#bdOk').onclick = () => {
        const val = `${selY}-${String(selM).padStart(2,'0')}-${String(selD).padStart(2,'0')}`;
        document.getElementById('fBirthday').value = val;
        const disp = document.getElementById('fBirthdayDisplay');
        disp.textContent = val;
        disp.style.color = 'var(--ink)';
        mask.remove();
      };
    });

    document.getElementById('addRelBtn').addEventListener('click', () => {
      // 自定义弹窗，不用浏览器原生 prompt
      const mask = document.createElement('div');
      mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;';
      mask.innerHTML = `
        <div style="background:var(--paper);border-radius:16px;padding:20px;width:100%;max-width:320px;">
          <div style="font-weight:600;margin-bottom:16px;">添加关系类型</div>
          <input id="newRelName" placeholder="关系名称，比如：球友、闺蜜" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;margin-bottom:10px;font-size:16px;">
          <input id="newRelIcon" placeholder="选一个 emoji，比如 🏸" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;margin-bottom:16px;font-size:16px;">
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="newRelCancel" style="padding:10px 16px;border:none;background:var(--bg);border-radius:10px;cursor:pointer;">取消</button>
            <button id="newRelOk" style="padding:10px 16px;border:none;background:var(--accent);color:#fff;border-radius:10px;cursor:pointer;">确定</button>
          </div>
        </div>
      `;
      document.body.appendChild(mask);
      mask.querySelector('#newRelName').focus();

      mask.querySelector('#newRelCancel').onclick = () => mask.remove();
      mask.onclick = (e) => { if (e.target === mask) mask.remove(); };
      mask.querySelector('#newRelOk').onclick = async () => {
        const name = mask.querySelector('#newRelName').value.trim();
        const icon = mask.querySelector('#newRelIcon').value.trim() || '📌';
        if (!name) return;
        const customRels = (await DB.getMeta('customRelations')) || [];
        customRels.push({ name, icon });
        await DB.setMeta('customRelations', customRels);
        mask.remove();
        render(container, params, onDone);
      };
    });

    document.getElementById('saveFriendBtn').addEventListener('click', async () => {
      const name = document.getElementById('fName').value.trim();
      const birthday = document.getElementById('fBirthday').value;
      if (!name) return YB.alert('姓名必填');

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
        relation: [...pickedRel],
        avatar: newAvatar,
        likes: document.getElementById('fLikes').value.trim(),
        dislikes: document.getElementById('fDislikes').value.trim(),
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
        await YB.alert('保存失败：数据没有真正写入本地存储，请截图告诉我');
        return;
      }
      const savedData = data;
      const all = await DB.getAll('friends');
      console.log('保存后朋友总数：', all.length);
      if (!isEdit) {
        // 弹自定义提示
        const mask = document.createElement('div');
        mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;';
        mask.innerHTML = `
          <div style="background:var(--paper);border-radius:16px;padding:24px;width:100%;max-width:300px;text-align:center;">
            <div style="font-size:40px;margin-bottom:12px;">🎉</div>
            <div style="font-weight:600;margin-bottom:8px;">朋友已保存！</div>
            <div style="font-size:14px;color:var(--ink-light);margin-bottom:20px;">要现在加个头像吗？</div>
            <div style="display:flex;gap:10px;">
              <button id="avatarNo" style="flex:1;padding:12px;border:none;background:var(--bg);border-radius:10px;cursor:pointer;">先不了</button>
              <button id="avatarYes" style="flex:1;padding:12px;border:none;background:var(--accent);color:#fff;border-radius:10px;cursor:pointer;">确定</button>
            </div>
          </div>
        `;
        document.body.appendChild(mask);
        mask.querySelector('#avatarNo').onclick = () => { mask.remove(); onDone(); };
        mask.querySelector('#avatarYes').onclick = () => {
          mask.remove();
          // 临时创建一个文件输入
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return onDone();
            const reader = new FileReader();
            reader.onload = async (ev) => {
              const avatarData = await cropImage(ev.target.result);
              if (!avatarData) return onDone();
              savedData.avatar = avatarData;
              await DB.put('friends', savedData);
              Sync.markLocalModified();
              Sync.schedulePush();
              onDone();
            };
            reader.readAsDataURL(file);
          };
          input.click();
        };
      } else {
        onDone();
      }
    });

    if (isEdit) {
      document.getElementById('delFriendBtn').addEventListener('click', async () => {
        if (!await YB.confirm('相关的所有记录都会被删掉，是否确定删除这个朋友？', '删除', '取消')) return;
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
