// friend-list.js —— 通讯录列表（顶部三入口 + 右侧抽屉分类）

const FriendList = (() => {
  let friends = [];
  let activeFilter = { type: 'all', value: '' }; // type: all / rel / tag

  async function render(container, onOpen) {
    friends = await DB.getAll('friends');
    const customRels = (await DB.getMeta('customRelations')) || [];
    const presetRels = [{name:'家人',icon:'👨‍👩‍👧'},{name:'好友',icon:'💛'},{name:'同学',icon:'🎓'},{name:'同事',icon:'💼'}];
    const allRels = [...presetRels, ...customRels];

    const tagSet = new Set();
    friends.forEach(f => (f.tags || []).forEach(t => tagSet.add(t)));
    const allTags = [...tagSet];

    container.innerHTML = `
      <div class="page">
        <div class="topbar">
          <div class="greet">友人列表 <span style="font-size:13px;color:var(--ink-light);font-weight:normal;">（共 ${friends.length} 人）</span></div>
        </div>

        <div style="display:flex;gap:8px;padding:0 16px;">
          <div class="filter-tab ${activeFilter.type==='all' ? 'active' : ''}" data-tab="all" style="padding:8px 16px;border-radius:20px;cursor:pointer;font-size:14px;background:${activeFilter.type==='all' ? 'var(--accent)' : 'var(--paper)'};color:${activeFilter.type==='all' ? '#fff' : 'var(--ink)'};">全部</div>
          <div class="filter-tab" data-tab="rel" style="padding:8px 16px;border-radius:20px;cursor:pointer;font-size:14px;background:${activeFilter.type==='rel' ? 'var(--accent)' : 'var(--paper)'};color:${activeFilter.type==='rel' ? '#fff' : 'var(--ink)'};">👥 关系</div>
          <div class="filter-tab" data-tab="tag" style="padding:8px 16px;border-radius:20px;cursor:pointer;font-size:14px;background:${activeFilter.type==='tag' ? 'var(--accent)' : 'var(--paper)'};color:${activeFilter.type==='tag' ? '#fff' : 'var(--ink)'};">🏷️ 标签</div>
        </div>

        <div style="padding:12px 16px;">
          <input type="search" id="flSearch" placeholder="🔍 搜索名字或昵称" style="width:100%;padding:10px 14px;border:1px solid var(--line);border-radius:20px;background:var(--paper);font-size:16px;">
        </div>
        <div id="flBody"></div>
      </div>

      <!-- 右侧抽屉 -->
      <div id="drawerMask" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.2);z-index:200;"></div>
      <div id="drawer" style="position:fixed;top:0;right:0;bottom:0;width:70%;max-width:280px;background:var(--paper);z-index:201;transform:translateX(100%);transition:transform 0.25s ease;box-shadow:-4px 0 20px rgba(0,0,0,0.1);padding:20px;overflow-y:auto;">
        <div id="drawerContent"></div>
      </div>

      <button class="fab" onclick="App.navigate('form', {from:'list'})">+</button>
      ${bottomTab('list')}
    `;

    // 顶部三个 tab
    container.querySelectorAll('.filter-tab').forEach(el => {
      el.addEventListener('click', () => {
        const tab = el.dataset.tab;
        if (tab === 'all') {
          activeFilter = { type: 'all', value: '' };
          render(container, onOpen);
        } else {
          openDrawer(tab);
        }
      });
    });

    document.getElementById('flSearch').addEventListener('input', (e) => draw(e.target.value));
    draw('');

    function openDrawer(tab) {
      const drawer = document.getElementById('drawer');
      const mask = document.getElementById('drawerMask');
      const dc = document.getElementById('drawerContent');

      if (tab === 'rel') {
        dc.innerHTML = `
          <div style="font-weight:600;margin-bottom:16px;">选择关系类型</div>
          ${allRels.map(r => `
            <div data-val="${YB.esc(r.name)}" style="padding:12px;border-radius:10px;margin-bottom:8px;cursor:pointer;background:${activeFilter.type==='rel' && activeFilter.value===r.name ? 'rgba(195,141,158,0.15)' : 'var(--bg)'};display:flex;align-items:center;">
              <span style="font-size:20px;margin-right:10px;">${r.icon}</span>
              <span>${YB.esc(r.name)}</span>
            </div>
          `).join('')}
        `;
      } else {
        dc.innerHTML = `
          <div style="font-weight:600;margin-bottom:16px;">选择标签</div>
          ${allTags.length === 0 ? '<div style="color:var(--ink-light);font-size:13px;">还没有标签</div>' :
            allTags.map(t => `
              <div data-val="${YB.esc(t)}" style="padding:12px;border-radius:10px;margin-bottom:8px;cursor:pointer;background:${activeFilter.type==='tag' && activeFilter.value===t ? 'rgba(195,141,158,0.15)' : 'var(--bg)'};">
                # ${YB.esc(t)}
              </div>
            `).join('')}
        `;
      }

      mask.style.display = 'block';
      requestAnimationFrame(() => { drawer.style.transform = 'translateX(0)'; });

      dc.querySelectorAll('[data-val]').forEach(el => {
        el.addEventListener('click', () => {
          activeFilter = { type: tab, value: el.dataset.val };
          closeDrawer();
          render(container, onOpen);
        });
      });
      mask.onclick = closeDrawer;
    }

    function closeDrawer() {
      document.getElementById('drawer').style.transform = 'translateX(100%)';
      document.getElementById('drawerMask').style.display = 'none';
    }

    function draw(keyword) {
      let list = friends;
      if (activeFilter.type === 'rel') {
        list = list.filter(f => (f.relation || []).includes(activeFilter.value));
      } else if (activeFilter.type === 'tag') {
        list = list.filter(f => (f.tags || []).includes(activeFilter.value));
      }
      if (keyword) {
        const k = keyword.toLowerCase();
        list = list.filter(f => (f.name + (f.nickname || '')).toLowerCase().includes(k));
      }
      list.sort((a, b) => {
        const sa = a.sortOrder ?? 9999;
        const sb = b.sortOrder ?? 9999;
        if (sa !== sb) return sa - sb;
        return (a.nickname || a.name).localeCompare(b.nickname || b.name, 'zh');
      });

      document.getElementById('flBody').innerHTML = list.map(f => {
        const bd = YB.daysUntilBirthday(f.birthday);
        const since = YB.daysSince(f.last_contact_at);
        const bg = YB.colorHash(f.name);
        const initial = (f.nickname || f.name).charAt(0);
        return `
          <div class="fl-row" data-id="${f.id}" style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line);cursor:pointer;background:var(--paper);">
            <div style="width:40px;height:40px;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;margin-right:12px;font-weight:600;flex-shrink:0;">${YB.esc(initial)}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:500;">${YB.esc(f.nickname || f.name)}</div>
              <div style="font-size:12px;color:var(--ink-light);">${YB.esc((f.relation||[]).join(' · ') || (f.tags||[]).join(' · '))}</div>
            </div>
            <div style="font-size:12px;color:${since > 90 ? 'var(--danger)' : 'var(--ink-light)'};flex-shrink:0;">
              ${since > 90 ? '⚠️久未联系' : `🎂${bd}天`}
            </div>
          </div>
        `;
      }).join('') || '<div style="text-align:center;color:var(--ink-light);padding:40px;">没有匹配的朋友</div>';

      container.querySelectorAll('.fl-row').forEach(el => {
        el.addEventListener('click', () => {
          if (justDragged) return;
          onOpen(el.dataset.id);
        });
      });

      // 长按拖动排序
      let longPressTimer = null;
      let draggingRow = null;
      let touchStartY = 0;
      let justDragged = false;

      container.querySelectorAll('.fl-row').forEach(row => {
        row.addEventListener('touchstart', (e) => {
          if (draggingRow) return;
          touchStartY = e.touches[0].clientY;
          longPressTimer = setTimeout(() => startDrag(row), 500);
        }, { passive: true });

        row.addEventListener('touchmove', (e) => {
          if (Math.abs(e.touches[0].clientY - touchStartY) > 10) {
            clearTimeout(longPressTimer);
          }
        }, { passive: true });

        row.addEventListener('touchend', () => clearTimeout(longPressTimer));
      });

      function startDrag(row) {
        draggingRow = row;
        row.style.opacity = '1';
        row.style.transform = 'scale(1.03)';
        row.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        row.style.borderRadius = '12px';
        row.style.zIndex = '100';
        row.style.transition = 'transform 0.15s, box-shadow 0.15s';

        // 其他行变半透明
        container.querySelectorAll('.fl-row').forEach(r => {
          if (r !== row) r.style.opacity = '0.6';
        });

        const onMove = (e) => {
          const touch = e.touches[0];
          const rows = [...container.querySelectorAll('.fl-row')];
          const currentIdx = rows.indexOf(row);
          const rowH = row.offsetHeight;
          const dy = touch.clientY - touchStartY;
          const steps = Math.round(dy / rowH);

          if (steps !== 0) {
            const targetIdx = currentIdx + steps;
            if (targetIdx >= 0 && targetIdx < rows.length) {
              const ref = rows[targetIdx];
              if (steps > 0) {
                container.querySelector('#flBody').insertBefore(row, ref.nextSibling);
              } else {
                container.querySelector('#flBody').insertBefore(row, ref);
              }
              touchStartY = touch.clientY;
            }
          }
        };

        const onEnd = () => {
          row.style.opacity = '';
          row.style.transform = '';
          row.style.boxShadow = '';
          row.style.borderRadius = '';
          row.style.zIndex = '';
          row.style.transition = '';
          // 恢复其他行
          container.querySelectorAll('.fl-row').forEach(r => r.style.opacity = '');
          draggingRow = null;
          justDragged = true;
          setTimeout(() => { justDragged = false; }, 200);
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('touchend', onEnd);
          saveOrder();
        };

        document.addEventListener('touchmove', onMove, { passive: true });
        document.addEventListener('touchend', onEnd);
      }

      async function saveOrder() {
        const rows = container.querySelectorAll('.fl-row');
        rows.forEach((row, i) => {
          const f = friends.find(x => x.id === row.dataset.id);
          if (f) f.sortOrder = i;
        });
        for (const f of friends) await DB.put('friends', f);
        Sync.markLocalModified();
        Sync.schedulePush();
      }
    }
  }

  function bottomTab(active) {
    return `
      <div class="bottom-tabbar">
        <div class="tab" onclick="App.navigate('home')"><span class="icon">🏠</span>首页</div>
        <div class="tab active" onclick="App.navigate('list')"><span class="icon">📋</span>友人</div>
        <div class="tab" onclick="App.navigate('settings')"><span class="icon">⚙️</span>设置</div>
      </div>
    `;
  }

  return { render };
})();
