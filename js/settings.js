// settings.js —— 设置页

const Settings = (() => {
  async function render(container, onBack) {
    window.__onSettingsBack = onBack;
    const cfg = {
      url: await DB.getMeta('dav_url') || 'https://dav.jianguoyun.com/dav/',
      username: await DB.getMeta('dav_username') || '',
      password: await DB.getMeta('dav_password') || '',
      enabled: await DB.getMeta('dav_enabled') || false
    };
    const lastSync = await DB.getMeta('last_sync_at');

    container.innerHTML = `
      <div class="page">
        <div class="topbar" style="position:relative;justify-content:center;">
          <button class="icon-btn" onclick="window.__onSettingsBack()" style="position:absolute;left:16px;font-size:16px;">‹ 返回</button>
          <div style="font-size:16px;font-weight:600;">设置</div>
        </div>

        <div style="margin:0 16px 16px;background:var(--paper);border-radius:16px;padding:16px;box-shadow:var(--shadow);">
          <h3 style="font-size:14px;margin-bottom:12px;">☁️ 云同步（坚果云 WebDAV）</h3>
          <div class="form-group"><label>服务器地址</label><input id="sDavUrl" value="${YB.esc(cfg.url)}"></div>
          <div class="form-group"><label>坚果云邮箱</label><input id="sDavUser" value="${YB.esc(cfg.username)}"></div>
          <div class="form-group"><label>应用密码（不是登录密码）</label><input type="password" id="sDavPass" value="${YB.esc(cfg.password)}" placeholder="在坚果云「安全选项」里生成"></div>
          <div style="display:flex;gap:10px;align-items:center;">
            <button class="btn ghost" id="testDavBtn">测试连接</button>
            <label style="font-size:13px;display:flex;align-items:center;gap:6px;">
              <input type="checkbox" id="sDavEnabled" ${cfg.enabled ? 'checked' : ''}> 开启自动同步
            </label>
          </div>
          <div id="sDavMsg" style="font-size:12px;color:var(--ink-light);margin-top:8px;">
            ${lastSync ? '上次同步：' + new Date(lastSync).toLocaleString() : '还没同步过'}
          </div>
        </div>

        <div style="margin:0 16px 16px;background:var(--paper);border-radius:16px;padding:16px;box-shadow:var(--shadow);">
          <h3 style="font-size:14px;margin-bottom:12px;">💾 备份与恢复</h3>
          <button class="btn ghost block" id="exportJsonBtn" style="margin-bottom:8px;">导出 JSON 备份</button>
          <button class="btn ghost block" id="importJsonBtn" style="margin-bottom:8px;">导入 JSON 恢复</button>
          <input type="file" id="importFile" accept=".json" class="hidden">
          <button class="btn ghost block" id="exportPdfBtn">导出 PDF（打印手账）</button>
        </div>

        <div style="margin:0 16px 16px;background:var(--paper);border-radius:16px;padding:16px;box-shadow:var(--shadow);">
          <h3 style="font-size:14px;margin-bottom:12px;">🔒 安全</h3>
          <button class="btn ghost block" id="changePinBtn" style="margin-bottom:8px;">修改密码</button>
          <button class="btn danger block" id="clearAllBtn">清空所有数据</button>
        </div>

        <div style="text-align:center;font-size:12px;color:var(--ink-light);padding:20px;">
          友人簿 v1.0 · 数据存在你自己的设备和坚果云
        </div>
      </div>

      <div class="bottom-tabbar">
        <div class="tab" onclick="App.navigate('home')"><span class="icon">🏠</span>首页</div>
        <div class="tab" onclick="App.navigate('list')"><span class="icon">📋</span>友人</div>
        <div class="tab active" onclick="App.navigate('settings')"><span class="icon">⚙️</span>设置</div>
      </div>
    `;

    // 测试连接
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

    // 保存 WebDAV 配置
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

    // 导出 JSON
    document.getElementById('exportJsonBtn').addEventListener('click', async () => {
      const data = await DB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `友人簿备份_${YB.todayStr()}.json`;
      a.click();
    });

    // 导入 JSON
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

    // 导出 PDF
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

    // 修改 PIN
    document.getElementById('changePinBtn').addEventListener('click', async () => {
      await DB.setMeta('pinHash', null);
      PIN.show(container, () => App.navigate('home'));
    });

    // 清空
    document.getElementById('clearAllBtn').addEventListener('click', async () => {
      if (!await YB.confirm('确定清空所有数据？此操作不可恢复', '清空', '取消')) return;
      await DB.clearAll();
      location.reload();
    });
  }

  return { render };
})();
