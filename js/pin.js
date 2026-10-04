// pin.js —— PIN 密码锁

const PIN = (() => {
  let input = '';
  let mode = 'check'; // check | setup | confirm
  let firstPin = '';
  let onSuccess = null;
  let el = null;

  async function hasPin() {
    return !!(await DB.getMeta('pinHash'));
  }

  function render(container) {
    el = container;
    input = '';
    el.innerHTML = `
      <div class="pin-lock">
        <div class="pin-logo">📖</div>
        <div class="pin-title" id="pinTitle">友人簿</div>
        <div class="pin-sub" id="pinSub">请输入密码</div>
        <div class="pin-dots" id="pinDots">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="pin-msg" id="pinMsg"></div>
        <div class="pin-pad">
          ${['1','2','3','4','5','6','7','8','9','','0','del'].map(k =>
            k === '' ? '<div class="pin-key empty"></div>' :
            k === 'del' ? '<div class="pin-key" data-k="del">⌫</div>' :
            `<div class="pin-key" data-k="${k}">${k}</div>`
          ).join('')}
        </div>
      </div>
    `;
    el.querySelectorAll('.pin-key[data-k]').forEach(k => {
      k.addEventListener('click', () => onKey(k.dataset.k));
    });
  }

  async function show(container, cb) {
    onSuccess = cb;
    const exists = await hasPin();
    mode = exists ? 'check' : 'setup';
    render(container);
    document.getElementById('pinSub').textContent = exists ? '请输入密码' : '设置 4 位数字密码';
  }

  function onKey(k) {
    if (k === 'del') {
      input = input.slice(0, -1);
    } else if (/^\d$/.test(k)) {
      if (input.length >= 4) return;
      input += k;
    }
    updateDots();
    if (input.length === 4) setTimeout(verify, 150);
  }

  function updateDots() {
    const dots = document.querySelectorAll('#pinDots span');
    dots.forEach((d, i) => d.classList.toggle('filled', i < input.length));
  }

  async function verify() {
    const msg = document.getElementById('pinMsg');
    if (mode === 'check') {
      const hash = await YB.hashPin(input);
      const saved = await DB.getMeta('pinHash');
      if (hash === saved) { onSuccess && onSuccess(); }
      else {
        msg.textContent = '密码错误';
        msg.classList.add('shake');
        setTimeout(() => { msg.classList.remove('shake'); input = ''; updateDots(); }, 400);
      }
    } else if (mode === 'setup') {
      firstPin = input;
      input = '';
      updateDots();
      mode = 'confirm';
      document.getElementById('pinSub').textContent = '再输一次确认';
    } else if (mode === 'confirm') {
      if (input === firstPin) {
        await DB.setMeta('pinHash', await YB.hashPin(input));
        onSuccess && onSuccess();
      } else {
        msg.textContent = '两次不一致，请重新设置';
        msg.classList.add('shake');
        setTimeout(() => {
          msg.classList.remove('shake');
          mode = 'setup';
          input = '';
          updateDots();
          document.getElementById('pinSub').textContent = '设置 4 位数字密码';
        }, 800);
      }
    }
  }

  return { show, hasPin };
})();
