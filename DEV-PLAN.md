# 友人簿 · 开发执行计划 v1.0

> 依据：PRD v1.2（唯一需求来源）
> 制定日期：2026-10-04
> 已确认的技术决策：同步走「坚果云 + Cloudflare Worker 转发代理 + 本地端到端加密」；部署走「内置一键发布（HTTPS 静态站点）」
> 本计划变更 PRD 的任何部分，见文末 §11「需要回填到 PRD 的差异」

---

## 0. 开工前必须知道的 4 件事

### 0.1 ⚠️ 已确认的重大技术阻断：坚果云不支持浏览器跨域

坚果云 WebDAV 服务器 `https://dav.jianguoyun.com/dav/` **不返回 `Access-Control-Allow-Origin` 响应头**（已有多个开源项目踩坑记录：KenNav issue #4 等，浏览器 `fetch` 一律拿不到响应）。

因此 PRD 7.2 描述的「浏览器直接 PUT/GET 坚果云」在纯前端 PWA 中**无法实现**。这不是配置问题，是服务端的硬限制。

**定案**（用户已选）：加一层 **Cloudflare Worker 转发代理**，同时把上传内容在手机本地做 **AES-GCM 端到端加密**。

这个 Worker 的设计原则：

- **Worker 不保存任何凭证**，账号和应用密码仍然只在手机本地
- Worker **无法读取明文**，因为数据在离开手机前已加密（IV + 密文），代理只搬运字节
- Worker **限制目标白名单**，只能转发到 `dav.jianguoyun.com`，不会被当成开放代理滥用

代价：需要一个免费 Cloudflare 账号，一次性配置约 15 分钟。之后永久免运维。

### 0.2 现有代码是空的

`css/`、`js/` 为空目录，`index.html` 不存在。**没有需要重构的存量代码**，全部从零写。

### 0.3 现有文件需要处理的遗留问题

| 文件 | 现状 | 处理 |
|---|---|---|
| `README.md` | 还在讲 v1.0 的「双击 index.html + 浏览器读文件夹」方案 | 阶段 8 整体重写为 PWA 版说明 |
| `data/friends.json` | 是 v1.0 的运行时数据文件 | 改名为 `data/sample-friends.json`，作为**示例种子数据**只读内嵌（PRD 7.5 明确 data/ 不存运行时数据） |
| `data/friends.json` 的 meta | 只有 `version/exportedAt/pinHash`，**缺 PRD 1.5 要求的 `schema_version`** | 新数据结构补 `schema_version`，并写迁移函数兜底老格式 |

### 0.4 🔐 关键安全设计：PIN 和云端加密密钥必须分开

这是一个容易写错的点，先钉死：

- **PIN（4 位数字）**：只用于本地解锁。即便加盐做 PBKDF2 拉伸，4 位只有 1 万种组合，**绝对不能**拿来派生云端加密密钥——密文一旦落地云端，离线暴力破解只需几秒。
- **同步密钥（Sync Key）**：独立生成的 160 位高熵随机密钥，只存在手机本地，**生成后必须让使用者抄写一份**并妥善保存。它才是加密云数据的钥匙。

推论：PIN 改了不影响密文；但清了浏览器缓存又没有恢复密钥，云端数据就永久打不开。所以「导出含密钥的完整备份」和「显示同步密钥」两个功能是**必做**，不是可选项。

---

## 1. 技术选型

| 项 | 选型 | 理由 |
|---|---|---|
| 前端框架 | **原生 JS + ES Modules，零构建** | PRD 7.5 要求源码放桌面随时改样式。任何打包器都会引入「改完要重新 build」的心智负担 |
| 本地存储 | **IndexedDB**（手写轻量封装，不引第三方库） | 手机上限远高于 LocalStorage，支持结构化索引；离线可用 |
| 加密 | **Web Crypto API**（PBKDF2-SHA256 + AES-GCM 256） | 浏览器原生，无依赖，离线可用 |
| 云同步 | Cloudflare Worker 代理 → 坚果云 WebDAV | 见 §0.1 |
| PDF 导出 | **`window.print()` + 专用打印样式表** | 零依赖、离线可用、中文排版可靠；html2canvas 截图方案在手机上字体和分页不可控 |
| PWA | manifest + Service Worker（手写） | 体积小于 1KB，不需要 Workbox |
| 部署 | 内置一键发布 → HTTPS 静态站点 | 用户已选；改完代码重发一次 |

**不用**的东西（避免后期被提议引入）：任何 npm 包、任何框架、任何 CDN 外链（否则离线失效）、任何后台/服务端数据库。

---

## 2. 目录结构（阶段 1 一次性建好）

```
友人簿/
├── index.html                  应用唯一入口（单页 + 视图容器）
├── manifest.webmanifest        PWA 清单
├── sw.js                       Service Worker
├── css/
│   ├── base.css                设计变量 / 重置 / 字体 / 色彩（浅色主题）
│   ├── layout.css              页面框架 / 顶栏 / 底部 Tab / 网格
│   ├── components.css          按钮 / 表单 / 弹窗 / 底部浮层 / 徽标
│   ├── card.css                朋友卡 + 3D 翻面动画 + 滑动容器
│   └── print.css               PDF 打印专用（含 @page）
├── js/
│   ├── main.js                 启动引导流程
│   ├── core/
│   │   ├── db.js               IndexedDB 封装（增删查 + 事务）
│   │   ├── schema.js           schema_version 定义与迁移
│   │   ├── crypto.js           PBKDF2 / AES-GCM / Sync Key 生成与编解码
│   │   ├── store.js            内存缓存 + 变更事件总线 + 统一写入口
│   │   └── date.js             生日/纪念日/天数计算（本地时区）
│   ├── services/
│   │   ├── sync-provider.js    同步层接口定义（含 mock 实现，便于离线开发）
│   │   ├── provider-nutstore.js Worker 代理实现
│   │   ├── sync-engine.js      防抖推送 / 启动拉取 / 冲突判定 / 重试队列
│   │   ├── backup.js           JSON 导出 / 导入 / 恢复密钥包
│   │   └── pdf.js              打印渲染与触发
│   ├── features/
│   │   ├── lock.js             PIN 首次设置 / 解锁 / 修改
│   │   ├── home.js             今日提醒聚合 + 首页容器
│   │   ├── card-wall.js        翻卡墙：滑动切换 + 翻面
│   │   ├── contacts.js         通讯录列表 + 标签筛选
│   │   ├── friend-detail.js    档案页四 Tab 容器 + 快速回顾区
│   │   ├── moments.js          温情小事时间线
│   │   ├── gifts.js            送礼流水账
│   │   └── settings.js         设置页全部功能
│   └── ui/
│       ├── router.js           视图栈管理（含返回键处理）
│       ├── dom.js              h() 元素创建小工具
│       ├── sheet.js            底部半屏浮层 / 确认框
│       └── toast.js            轻提示
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-512-maskable.png
│   └── apple-touch-icon.png
├── worker/
│   └── jianguoyun-proxy.js     Cloudflare Worker 源码（单独部署，不进静态站点）
├── data/
│   └── sample-friends.json     示例种子（原 friends.json 改名）
├── PRD.md
├── DEV-PLAN.md                 本文件
└── README.md                   使用说明（阶段 8 重写）
```

---

## 3. 数据模型

### 3.1 IndexedDB —— 库名 `yourenbu`，version 1

| 表 | keyPath | 索引 | 内容 |
|---|---|---|---|
| `friends` | `id` | `updated_at` | 朋友档案 |
| `moments` | `id` | `friend_id`, `date` | 温情小事 |
| `gifts` | `id` | `friend_id`, `date` | 送礼记录 |
| `settings` | `key` | — | PIN 哈希/盐、WebDAV 配置、同步密钥、视图偏好、`seeded` 标记 |
| `sync_meta` | `key` | — | `last_sync_at`、`last_pushed_at`、`device_id`、`last_error` |

**重要**：`settings` 与 `sync_meta` **永远不参与云同步**（PIN 哈希、应用密码属于本机凭证）。同步的只有 `friends` + `moments` + `gifts`。

### 3.2 friend 实体

```js
{
  id: "f_" + crypto.randomUUID(),
  name: "林小满",                    // 必填
  nickname: "阿May",
  gender: "female" | "male" | "other" | "",
  birthday: "1998-05-12",            // 必填，纯日期字符串，按本地时区解析
  contact: "微信 amey_lin",
  occupation: "幼儿园老师",
  how_we_met: "大学室友，上下铺睡了四年",
  known_anniversary: "2017-09-15",   // 可选
  custom_dates: [{ label: "她妈妈生日", date: "1968-03-20" }],
  tags: ["大学室友", "闺蜜"],
  preferences: "喜欢吃辣、不吃香菜……",
  avatar: "",                        // dataURL 字符串或空
  last_contact_at: "2026-09-11T00:00:00.000Z",
  created_at: "...Z",
  updated_at: "...Z",
  is_sample: true                    // 示例数据标记，用于「一键删除示例」
}
```

> `is_sample` 是 PRD 验收标准 I 组「示例朋友能一键删除」需要的字段，PRD 5.1 未列出，属于实现所需的最小补充。

### 3.3 云端文件格式 `yourenbu/friends.json`

加密模式（默认）：

```json
{
  "schema_version": 1,
  "app": "yourenbu",
  "mode": "encrypted",
  "updated_at": "2026-10-04T06:00:00.000Z",
  "device_id": "d_xxxxxx",
  "alg": "AES-GCM-256",
  "iv": "<base64 12 bytes>",
  "payload": "<base64 ciphertext of {friends,moments,gifts}>"
}
```

明文模式（设置页可切换，用于用户自己肉眼核对云端内容）：

```json
{
  "schema_version": 1,
  "app": "yourenbu",
  "mode": "plain",
  "updated_at": "...",
  "device_id": "...",
  "friends": [], "moments": [], "gifts": []
}
```

---

## 4. 核心算法约定（先写好再写界面，避免返工）

### 4.1 `core/date.js`

```js
// 全部基于本地日期，禁止用 UTC 参与生日判断
nextBirthday(birthdayStr)      // 返回下一次生日的本地 Date（已过今年生日则取明年）
daysUntilBirthday(birthdayStr) // 0 = 就是今天
daysSince(isoString)           // 与今天 00:00 的自然日差值，无记录返回 null
knownDuration(anniversaryStr)  // → "认识 9 年 0 个月" / "认识 8 个月"
isLeapFeb29(birthdayStr)       // 2/29 在非闰年按 3/1 处理（PRD 未提，按通用惯例）
formatRelative(isoString)      // → "3 天前" / "上周" / "3 个月前"
```

坑点：所有生日字段**禁止**用 `new Date("1998-05-12")` 解析（会按 UTC 处理导致差一天）。统一写 `parseLocalDate(s)`：`const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d)`。

### 4.2 `home.js` 提醒聚合

```js
buildReminders(friends) {
  // 1) 生日：0 <= daysUntilBirthday <= 14
  // 2) 纪念日（known_anniversary + custom_dates[]）：0 <= days <= 14
  // 3) 久未联系：daysSince(last_contact_at) > 90，或无记录且 created_at > 90 天
  // 优先级：今天生日 > 生日/纪念日临近（按天数升序）> 久未联系
  // 每类返回 { type, friendId, text, days, level: 'urgent'|'normal'|'silent' }
}
```

久未联系提醒的 UI 是黄色底色（PRD 3.2）。同一朋友同时命中多条提醒时**只显示优先级最高的一条**，避免刷屏。

### 4.3 翻卡墙排序

```js
sortForWall(friends) // 按 daysUntilBirthday 升序；今天生日排最前
```

### 4.4 写操作统一入口（所有 UI 必须走这里）

`store.js` 暴露唯一写方法 `commit(entity, op, payload)`，内部做四件事，缺一不可：

1. 更新 `updated_at`
2. 写入 IndexedDB
3. 更新内存缓存并 `emit('change')` 让所有视图重渲染
4. `syncEngine.schedulePush()`（防抖 2 秒）

**任何绕过 `commit()` 直接改数据的地方都是 bug**——这是「改了数据没同步 / 界面不刷新」的唯一根因。

### 4.5 `sync-engine.js` 状态机

```
idle → pulling / pushing → ok(last_sync_at 更新) → idle
                        → error(last_error 记录) → idle（等 online 事件重试）
```

- 启动：解锁后立即 `pull()` 一次
- 推送：任意写操作后防抖 2000ms → `push()`
- 冲突：`remote.updated_at > local.updated_at` 且两边都有新变更 → **本地为准**，弹 toast「检测到云端有更新，已保留本地版本」（PRD 7.2 明确策略）
- 覆盖保护：`push()` 前先 `GET` 一次，若远端比本地新，先把远端另存为 `yourenbu/backup/friends-<timestamp>.json` 再推
- 断网：捕获 `TypeError: Failed to fetch` → 标记 `offline`，监听 `window.online` 事件自动重试

### 4.6 Sync Key 与加密

```js
generateSyncKey()        // getRandomValues(20 bytes) → Crockford Base32，展示为
                         // "XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"（8 组 × 4 字符）
deriveKey(syncKey, salt) // PBKDF2-SHA256, 210000 次迭代 → AES-GCM 256 key
encrypt(json, key)       // 随机 12 字节 IV → {iv, payload}
decrypt(env, key)        // 失败统一抛 InvalidKey，UI 提示「同步密钥不正确」
hashPin(pin, salt)       // PBKDF2-SHA256, 210000 次迭代，只比对不存储明文
```

PIN 输入失败 5 次 → 锁定 30 秒（4 位 PIN 强度低，这个是必要的补偿措施）。

---

## 5. 阶段拆解

每个阶段都可独立验收，**前一阶段不通过不进入下一阶段**。

---

### 阶段 0 · 可行性验证（务必最先做）

**目标**：把最大的不确定性打掉。这一阶段不写应用代码，只验证「手机 → Worker → 坚果云」链路真的通。

**任务**

1. 准备坚果云应用密码
   - 登录 jianguoyun.com → 右上角账户 → 账户信息 → 安全选项 → 第三方应用管理 → 添加应用密码（名称填 `友人簿`）
   - 记录：账号邮箱、生成的密码、`https://dav.jianguoyun.com/dav/`

2. 部署 Cloudflare Worker（源码草案见下方，`worker/jianguoyun-proxy.js`）
   - 注册 cloudflare.com（免费，无需信用卡）→ Workers 和 Pages → 创建 Worker → 粘贴源码 → 部署
   - 记下得到的 URL：`https://<name>.<subdomain>.workers.dev`

3. 写一次性验证页 `probe.html`（临时文件，验证完删掉），依次测：
   - `PUT https://worker/yourenbu/friends.json` body `{"probe":1}` → 期望 201/204
   - `GET` 同一路径 → 期望拿到原内容
   - 故意填错密码 → 期望拿到 401
   - 用手机浏览器打开这个验证页跑一遍（手机网络环境和电脑不同，必须在手机上也验一次）

4. 验证完成后，新建一个 `yourenbu` 目录是否自动创建（WebDAV PUT 到不存在目录会 409，Worker 源码里已处理 MKCOL）

**验收**：坚果云网页端能看到 `yourenbu/friends.json`；手机和电脑都能 GET/PUT 成功。

**回滚**：若 CF 账号注册受阻，立刻回到 §0.1 重选路线（GitHub 私有仓库是最省事的备选）。

**Worker 源码草案**（阶段 0 直接可用）：

```js
// worker/jianguoyun-proxy.js
const UPSTREAM = 'https://dav.jianguoyun.com/dav/';
const ALLOW_METHODS = ['GET', 'PUT', 'PROPFIND', 'MKCOL', 'DELETE', 'HEAD'];

function cors(res) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', ALLOW_METHODS.join(','));
  h.set('Access-Control-Allow-Headers', 'Authorization,Content-Type,Depth');
  h.set('Access-Control-Expose-Headers', 'ETag,Last-Modified');
  return new Response(res.body, { status: res.status, headers: h });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': ALLOW_METHODS.join(','),
        'Access-Control-Allow-Headers': 'Authorization,Content-Type,Depth',
        'Access-Control-Max-Age': '86400'
      }});
    }
    if (!ALLOW_METHODS.includes(request.method)) return new Response('method denied', { status: 405 });

    const path = new URL(request.url).pathname.replace(/^\//, '').replace(/\.\./g, '');
    // 转发 Authorization（凭证不过 Worker，Worker 无状态无密钥）
    const auth = request.headers.get('Authorization') || '';
    const target = new URL(UPSTREAM + path).toString();

    let res = await fetch(target, {
      method: request.method,
      headers: { Authorization: auth, 'Content-Type': request.headers.get('Content-Type') || 'application/json' },
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer()
    });

    // 目标目录不存在 → 自动建目录后重试（坚果云同样需要 CORS，故由 Worker 完成）
    if (res.status === 409 && request.method === 'PUT') {
      const dir = target.substring(0, target.lastIndexOf('/') + 1);
      await fetch(dir, { method: 'MKCOL', headers: { Authorization: auth } });
      res = await fetch(target, {
        method: 'PUT',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: await request.arrayBuffer()
      });
    }
    return cors(res);
  }
};
```

> 注意 `body` 读取两次的问题：正式版要先把 body 缓存到变量（`const body = await request.arrayBuffer()`），上面草案为简洁起见复用了 await，实现时改为变量缓存一次。

---

### 阶段 1 · 工程骨架与数据层

**产出文件**：`index.html`、`css/base.css`、`js/core/{db,schema,store,date,crypto}.js`、`data/sample-friends.json`

**任务**

1. 把旧 `data/friends.json` 改名为 `data/sample-friends.json`，补 `schema_version: 1`、给两个示例加 `is_sample: true`
2. `index.html`：单文件容器 `#app`，含 `#lock-view`、`#home-view`、`#detail-view`、`#list-view`、`#settings-view` 五个占位与底部 Tab 结构
3. `base.css`：定义设计变量（浅色）

```css
:root{
  --bg:#FBF7F2; --surface:#FFFFFF; --text:#2A2520; --text-sub:#7A7068;
  --brand:#C98A6B; --brand-soft:#F3E3D8; --accent:#8FA98C;
  --warn:#F2C94C; --warn-soft:#FFF6DA; --danger:#C4544B; --line:#ECE4DA;
  --radius:16px; --shadow:0 4px 16px rgba(60,45,35,.08);
  --safe-b: env(safe-area-inset-bottom, 0px);
}
```

4. `db.js`：封装 `open()`（含 onupgradeneeded 建表）、`getAll/get/put/del/bulkPut`
5. `schema.js`：`SCHEMA_VERSION = 1` + `migrateIfNeeded()`，读到 `version` 而无 `schema_version` 的老文件时按 v1 处理
6. `date.js`、`crypto.js`：按 §4.1 / §4.6 实现
7. `store.js`：内存态 + `commit()` + `on(event, cb)`
8. 种子逻辑：首次启动（`settings.seeded !== true`）从 `data/sample-friends.json` 拉示例入库，写完立刻置 `seeded=true`

**验收**：控制台执行 `await store.getAll('friends')`，返回 2 条示例；`date.js` 的 `daysUntilBirthday` 对一个 3 天后的生日返回 3。

---

### 阶段 2 · PIN 密码锁与路由骨架

**产出**：`js/features/lock.js`、`js/ui/{router,dom,sheet,toast}.js`、`css/layout.css`、`css/components.css`

**任务**

1. `lock.js`：首次启动强制设置 4 位 PIN → 生成随机 salt → PBKDF2 哈希存 `settings.pin_hash`；二次输入确认
2. 解锁界面：4 位数字点阵，输错抖动 + 计数，5 次失败锁 30 秒
3. `router.js`：视图栈 push/pop，`popstate` 绑定手机物理返回键
4. 底部 3 Tab（首页 / 列表 / 设置）常驻，选中态高亮，避开 iOS 安全区（`padding-bottom: var(--safe-b)`）
5. `toast.js`、`sheet.js`：轻提示与底部半屏浮层（后续所有弹输入都是这个组件）

**验收**：对应 PRD 第 10 节 A 组三条（首次强制设置、输错进不去、设置页可改 PIN——改 PIN 在阶段 7 完成）。

---

### 阶段 3 · 朋友档案 CRUD + 通讯录列表

**产出**：`js/features/contacts.js`、朋友编辑表单组件

**任务**

1. 通讯录列表：按姓名首字 letters 分组 + 右侧字母索引条；顶部标签筛选（多选 Chip）
2. 新增/编辑表单：字段对齐 PRD 5.1 全量；`name` 与 `birthday` 标必填；`tags` 输入框支持回车添加、跨朋友复用已有标签下拉补全
3. 删除：二次确认弹窗（`sheet.js` 的 confirm），级联删除该朋友的 `moments` 与 `gifts`
4. 头像：`<input type="file" accept="image/*">` → 压缩到 256px → dataURL 存 `avatar`；无头像用姓名首字 + 由 id 哈希出的固定色相做彩色圆底
5. 悬浮 `+` 按钮进新增页

**验收**：PRD 10-B 三条。

---

### 阶段 4 · 首页翻卡墙 + 今日提醒

**产出**：`js/features/{home,card-wall}.js`、`css/card.css`

**任务**

1. 顶部问候条：按时间段给问候语（早上好 / 午安 / 晚上好…）+ 同步状态图标 + 齿轮入口
2. 今日提醒区：`buildReminders()` 渲染三条类型，点击跳对应朋友档案；久未联系条黄色底 `--warn-soft`
3. 翻卡墙（核心交互）：
   - 容器横向 flex，`scroll-snap-type: x mandatory` + 一屏一卡，天然支持左右滑动且两面的面板都在横向滚动容器内
   - 卡片结构 `.flip-card > .flip-inner > (.face-front, .face-back)`，`transform: rotateY(180deg)` + `transition .5s` + `transform-style: preserve-3d`
   - **点卡片中央翻面**：注意不要和滑动冲突——用 `touchstart/touchend` 判断位移 < 10px 且时长 < 300ms 才算点击
   - 正面：头像 / 昵称 / ≤2 个标签 / 生日倒计时 / 上次联系天数 / 最新一条温情小事摘要（无记录整块留白，**不显示「暂无记录」**）/ `[+ 记一笔]`
   - 反面：昵称 + 标签 / 偏好首行摘要 / 最近一次送礼（礼物名 + 大致时间）/ 认识时长 / `[查看完整档案 →]`
4. `[+ 记一笔]` → 底部快速输入浮层（日期默认今天 + 多行文本 + 保存）→ 写入 `moments` → 自动更新 `last_contact_at` → 触发同步（走 `commit()`）

**验收**：PRD 10-C 前三条、10-D、10-E 前四条。

> 这是全项目最容易出交互 bug 的一块（滑动与翻面争抢手势），务必真机测试。

---

### 阶段 5 · 朋友档案详情页

**产出**：`js/features/{friend-detail,moments,gifts}.js`

**任务**

1. 顶部：头像 / 昵称 / **快速回顾区**（"最近在忙"、"上次聊到"类自动聚合——由最近一条 moment + occupation + tags 拼一句自然语言摘要）
2. 底部四 Tab：**基础信息**（可编辑）/ **温情小事时间线**（倒序）/ **送礼流水账** / **偏好与雷区**（长文本）
3. `[标记已联系]` 按钮 → `last_contact_at = 今天` → 首页该朋友的久未联系提醒立即消失
4. 温情小事：新增 / 编辑 / 删除，新增时同步刷新 `last_contact_at`
5. 送礼记录：礼物名 / 日期 / 金额（¥）/ reaction，支持增删改，底部显示合计金额（只做数字合计，**不做图表**，PRD 第 9 节明令不做）

**验收**：PRD 10-C 剩余条目。

---

### 阶段 6 · 同步引擎（在真数据上跑通）

**产出**：`js/services/{sync-provider,provider-nutstore,sync-engine}.js`

**任务**

1. `sync-provider.js` 接口：`pull() -> {raw, updated_at}`、`push(payload)`、`test()`；再写一个 `mockProvider` 便于阶段 1-5 离线开发
2. `provider-nutstore.js`：Basic Auth = `btoa(username + ":" + appPassword)`，路径 `${dav_url}yourenbu/friends.json`
3. `sync-engine.js`：按 §4.5 实现拉/推/冲突/重试/状态广播
4. 首页同步图标四态：`同步中（转圈）/ 已同步（显示相对时间）/ 失败（红色）/ 离线（灰）`
5. 设置页填三项 + `[测试连接]` → `test()` 走 `PROPFIND` 或 GET，明确区分「401 账号密码错」与「网络不通」两种错误文案

**验收**：PRD 10-F，但注意 F 组第 4 条需调整——默认加密模式下你在坚果云网页端看到的是密文，肉眼读不出内容。验收方式改为「文件内容变化 + 用另一台设备/清缓存后还原校验」；若想肉眼核对，设置页可切「明文模式」（见 §11）。

---

### 阶段 7 · 设置页与备份导出

**产出**：`js/features/settings.js`、`js/services/{backup,pdf}.js`、`css/print.css`

**任务**

1. WebDAV 配置（URL / 账号 / 应用密码 / 启用开关 / 测试连接 / 上次同步时间）
2. 同步密钥区：**显示/隐藏 + 一键复制**，首次同步前强制提示抄写；提供「从他人设备导入密钥」入口
3. 修改 PIN
4. 导出 JSON：两种——「数据备份（不含密钥）」和「完整恢复包（含密钥）」，后者文件名带 `RECOVERY-KEY` 警示
5. 导入 JSON：解析后做 `schema_version` 迁移，提供「覆盖 / 合并」两种选择（合并按 `updated_at` 取新）
6. 导出 PDF：`window.print()` 方案——`pdf.js` 渲染一张隐藏 DOM（按朋友分组：档案摘要 + 温情时间线 + 送礼记录），加载 `print.css`，`@media print` 隐藏 App 其余部分，`@page { size: A4; margin: 14mm }`，每个朋友 `break-inside: avoid`
7. 清空数据：二次确认（输入 PIN 才执行）
8. 关于：版本号、PRD 摘要、隐私说明（数据在哪、如何加密）

**验收**：PRD 10-A 第三条、10-G、10-I。

---

### 阶段 8 · PWA 与上线

**产出**：`manifest.webmanifest`、`sw.js`、`icons/*`、`README.md` 重写

**任务**

1. `manifest.webmanifest`：`name: 友人簿`、`short_name: 友人簿`、`display: standalone`、`orientation: portrait`、`theme_color: '#C98A6B'`、`background_color: '#FBF7F2'`、`start_url: './'`、`icons`（192/512/maskable）
2. 图标：先用纯色底 + 「友」字生成 PNG（192/512/512-maskable/apple-touch-icon）；后续可用 AI 生成更好的版本替换，**不要引 CDN**
3. `sw.js` 缓存策略：
   - App Shell（html/css/js/icons）→ **Cache First**
   - `data/sample-friends.json` → Cache First
   - **云端同步请求永不缓存**（Worker 域名不进 SW 拦截）
   - `self.addEventListener('activate')` 里清理旧缓存桶；版本号放常量 `CACHE = 'yourenbu-v1'`
4. `index.html` 加移动端必需 meta：`viewport`（`viewport-fit=cover`）、`theme-color`、`apple-mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style`
5. `registerServiceWorker()` 放在 `main.js`，且仅在 `location.protocol === 'https:' || hostname === 'localhost'` 时注册（局域网调试时跳过）
6. 内置发布 → 得到 HTTPS 链接 → 手机 Chrome/Safari 打开 → 「添加到主屏幕」
7. **重写 README.md**：删掉所有 v1.0 的「双击 index.html / 允许读取文件夹」描述，换成 PWA 安装、坚果云配置、同步密钥保管、恢复流程

**验收**：PRD 10-H。

---

### 阶段 9 · 真机全量验收

按 PRD 第 10 节 A→I 九组逐条打勾。重点复测这些容易在桌面测试里漏掉的点：

- [ ] iOS Safari 上愧性滑动手感与 `scroll-snap` 表现
- [ ] 手机断网（飞行模式）打开 App 能看数据并记录一笔，恢复网络后自动补同步
- [ ] 清除浏览器数据后重装 PWA，用同步密钥从坚果云完整还原
- [ ] 联系人数量上升到 50+ 时列表滚动与首页聚合是否有明显卡顿（若卡，给翻卡墙加「只渲染当前 ±2 张」的窗口化渲染）

---

## 6. 本地开发与调试方式

桌面改代码，手机真机看效果。因为 Service Worker 和 ES Modules 都不支持 `file://`，**必须起本地静态服务**：

```bash
C:/Users/ASUS/.workbuddy/binaries/python/versions/3.13.12/python.exe -m http.server 8000
```

然后用 `ipconfig` 查本机局域网 IP，手机连同一 Wi-Fi 访问 `http://192.168.x.x:8000`。

注意两点：

1. 局域网 IP 是**非安全上下文**，Service Worker 不会注册（这是浏览器规定，不是 bug），所以阶段 8 的离线能力必须部署后才能验
2. 项目路径含中文「友人簿」，**不要写 `.bat`/`.ps1` 脚本**去包装上面的命令，容易出编码问题；每次手动敲这一行即可

真机手势调试建议用 Chrome DevTools 远程调试（`chrome://inspect`），否则纯看日志很难定位滑动/点击冲突。

---

## 7. 工作量铺排

以「一次专注工作会话」为单位估算：

| 阶段 | 大致会话数 | 能否并行 |
|---|---|---|
| 0 可行性验证 | 1 | ❌ 必须先做，结果决定架构 |
| 1 骨架与数据层 | 1 | ❌ 所有后续依赖 |
| 2 PIN 与路由 | 1 | 可与阶段 3 部分并行 |
| 3 档案 CRUD + 列表 | 2 | 部分 |
| 4 翻卡墙 + 提醒 | 2 | ❌ 与阶段 5 顺序做更安全 |
| 5 档案详情四 Tab | 2 | |
| 6 同步引擎 | 1.5 | 依赖 0 + 1 |
| 7 设置与备份导出 | 1.5 | |
| 8 PWA 与上线 | 1 | |
| 9 真机验收修补 | 1–2 | |

合计约 **14–16 个会话**。最重的是阶段 4（手势交互）和阶段 6（同步状态机），这两块不要压缩。

---

## 8. 质量红线

写代码时必须守住，否则后期全是债：

1. **所有数据写入必须走 `store.commit()`**（§4.4），任何直接操作 IndexedDB 的 UI 代码视为 bug
2. **全局零外链**：无 CDN、无 Google Fonts、无远程图片。所有资源都在项目目录内，否则离线验收过不了
3. **所有日期本地化解析**，禁止 `new Date("YYYY-MM-DD")`（§4.1 坑点）
4. **浮点金额参与合计前先转整数分**，避免 `620 + 799 = 1419.0000000000002` 这种展示问题
5. **`settings` / `sync_meta` 永不上云**
6. **任何涉及手势（滑动、点击、长按）的改动**，改完必须在真机上验证，不在桌面模拟器上下结论
7. 改任何需求前先改 `PRD.md`，再改代码（PRD §11 原话）

---

## 9. 风险登记册

| # | 风险 | 等级 | 应对 |
|---|---|---|---|
| R1 | 坚果云无 CORS | 🔴 已发生 | 已定案 Worker 代理 + 本地加密，阶段 0 先验证 |
| R2 | Cloudflare 账号注册失败/不顺畅 | 🟡 中 | 回退到 GitHub 私有仓库路线（REST API 原生跨域），`sync-provider.js` 的接口设计已保证可替换，切换只改一个文件 |
| R3 | 坚果云 WebDAV 频率限制（免费版 600 次/30 分钟） | 🟡 中 | 单次 PUT + 2 秒防抖，正常使用每日请求数在 10 次量级，远低于限制；但不要在设置页做「立即同步」频繁点击测试 |
| R4 | 同步密钥丢失导致云端数据永久不可读 | 🔴 高 | 首次同步强制抄写；导出「完整恢复包」；设置页可随时查看密钥 |
| R5 | iOS 长期未访问会清理 PWA 的 IndexedDB | 🟡 中 | 无法从技术上根治，靠 R4 的备份链路兜底；设置页提醒用户每月导出一次 |
| R6 | 4 位 PIN 强度不足 | 🟡 中 | 5 次失败锁 30 秒；PIN 仅管本地解锁，**不参与云端加密**（§0.4） |
| R7 | Service Worker 缓存导致改代码后不生效 | 🟢 低 | `CACHE` 版本号常量每次部署 +1；`sw.js` 的 activate 里清旧桶 |
| R8 | 部署平台的数据是否被第三方看到 | 🟢 低 | 静态站点只托管代码，**数据从不走部署平台**；云数据只有加密后的密文经过 Worker |

---

## 10. PRD 第 10 节验收 → 阶段映射

| 验收组 | 对应阶段 |
|---|---|
| A 隐私与启动 | 阶段 2（含阶段 7 的改 PIN） |
| B 朋友管理 | 阶段 3 |
| C 温情与送礼 | 阶段 4（记一笔）+ 阶段 5 |
| D 首页提醒 | 阶段 4 |
| E 翻卡与列表 | 阶段 4 + 阶段 3 |
| F WebDAV 同步 | 阶段 6（依赖阶段 0） |
| G 备份与恢复 | 阶段 7 |
| H PWA 形态 | 阶段 8 |
| I 示例数据 | 阶段 1 + 阶段 7（一键删除） |

---

## 11. 需要回填到 PRD 的差异

本计划引入了 PRD 尚未记载的内容，建议在阶段 0 通过后、阶段 1 开始前**更新 PRD v1.3**，保持「文档先行」的一致性：

1. **7.2 同步路径**：改为「经一层用户自有的 Cloudflare Worker 转发代理访问坚果云」，并说明 Worker 无状态、无凭证、不可读明文
2. **新增 7.6 端到端加密**：同步文件默认 AES-GCM 加密；新增「同步密钥」数据与强制备份流程；设置页提供明文模式开关
3. **5.5 PIN**：补充说明 PIN 不参与云端加密，仅用于本地解锁，并增加 5 次失败锁定机制
4. **10-F 第 4 条验收标准**：加密模式下云端文件不可肉眼阅读，验收方式相应调整
5. **5.1 朋友字段**：补充 `is_sample`（支持示例数据一键删除）
6. **1.5 预留**：`schema_version` 已落到数据模型：DB 结构与云端 envelope 双处体现

---

**执行原则：阶段 0 不通过，不进入阶段 1。任何阶段完成后，按该阶段的「验收」清单逐条打勾再往下走。**
