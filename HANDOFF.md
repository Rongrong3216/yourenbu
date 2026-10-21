# 友人簿 · 交接说明

## 一、项目是什么

手机优先的 PWA 朋友记录应用。纯静态 HTML/CSS/JS，无构建工具，无框架，无后端。数据存在浏览器 localStorage，用户是一个人自用+小范围朋友测评。

## 二、项目位置

```
C:\Users\ASUS\Desktop\友人簿
```

## 三、技术栈与运行环境

- **前端**：原生 HTML5 + CSS3 + 原生 JavaScript（ES6），无 React/Vue/构建工具
- **数据存储**：纯 localStorage（key 前缀 `yourenbu_`），四个 store：friends / moments / gifts / meta
- **同步**：坚果云 WebDAV（代码已写，浏览器 CORS 未解决，未真机测通）
- **PWA**：manifest.json + sw.js（network-first 策略）
- **运行方式**：`python -m http.server 8765`，工作目录即项目根
- **Git**：已初始化，作者 Rongrong3126 <rongrong3126@qq.com>

## 四、当前版本

- **v1.1.2.5**（2026-10-17）
- Git tag 列表：v1.0 / v1.1-stable / v1.1.1 / v1.1.2 / v1.1.2.1 / v1.1.2.2 / v1.1.2.3 / v1.1.2.4 / v1.1.2.5
- v1.1.3 / v1.1.4 是废弃 tag，不要用

## 五、本地预览

```powershell
cd C:\Users\ASUS\Desktop\友人簿
python -m http.server 8765
```

电脑端：浏览器打开 `http://127.0.0.1:8765`
手机端：和电脑连同一 WiFi，访问 `http://<电脑局域网IP>:8765`

- 查电脑 IP：`Get-NetIPAddress -AddressFamily IPv4 | ? {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -like "192.168.*"}`
- 注意：IP 经常变，每次重启手机连不上先查 IP

## 六、目录结构

```
友人簿/
├── index.html              # 唯一入口，引入所有 js
├── manifest.json           # PWA 清单
├── sw.js                   # Service Worker（当前 CACHE=yourenbu-v6）
├── PRD.md                  # 产品需求文档
├── CHANGELOG.md            # 版本记录
├── HANDOFF.md              # 本文件
├── css/
│   ├── main.css            # 全局样式 + CSS 变量
│   ├── card-flip.css       # 卡片翻转动画
│   ├── pin-lock.css        # 密码锁屏样式
│   └── print.css           # 打印样式
├── js/
│   ├── app.js              # 路由（home/list/detail/settings/form/fc）
│   ├── db.js               # localStorage 封装
│   ├── utils.js            # YB 工具对象（含自定义 alert/confirm）
│   ├── sample-data.js      # 首次启动写入两个示例朋友
│   ├── pin.js              # 密码锁屏
│   ├── home.js             # 首页
│   ├── card.js             # 首页横向轮播卡片
│   ├── friend-list.js      # 友人列表
│   ├── friend-detail.js    # 朋友档案页（基础/点滴/偏好）
│   ├── friend-form.js      # 新朋友/编辑朋友表单（含头像裁剪）
│   ├── quick-note.js       # 记一笔弹窗（小事/承诺）
│   ├── moment.js           # 点滴时间轴
│   ├── gift.js             # 送礼弹窗
│   ├── settings.js         # 设置页 + 迷你月历
│   ├── full-calendar.js    # 全屏日历（月视图/年视图）
│   ├── webdav.js           # 坚果云 WebDAV 客户端
│   └── sync.js             # 同步调度
├── icons/
│   ├── icon-192.png        # PWA 图标
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── data/
    └── friends.json        # 导出备份示例
```

## 七、数据结构

### friends

```js
{
  id: 'f_xxx',
  name: '真实姓名',
  nickname: '昵称',
  gender: 'female' | 'male',
  birthday: 'YYYY-MM-DD',       // 可空，滚轮选择
  contact: '联系方式',
  occupation: '职业',
  how_we_met: '怎么认识的',
  known_anniversary: 'YYYY-MM-DD',
  custom_dates: [{ label: '她妈妈生日', date: 'YYYY-MM-DD' }],
  tags: ['好友', '大学室友'],
  relations: ['friend', 'custom_xxx'],  // 关系类型，可多选
  preferences: '喜欢/雷区记录',
  avatar: 'data:image/...' 或 '',       // base64 或空（默认头像）
  last_contact_at: ISO string,
  created_at: ISO string,
  updated_at: ISO string
}
```

### moments（点滴）

```js
{
  id: 'm_xxx',
  friend_id: 'f_xxx',
  type: 'moment' | 'promise',
  date: 'YYYY-MM-DD',           // 发生日期
  content: '内容',
  due_date: 'YYYY-MM-DD',       // 仅 promise 有，截止日期
  done: false,                  // 仅 promise 有，是否完成
  created_at: ISO string
}
```

### gifts

```js
{
  id: 'g_xxx',
  friend_id: 'f_xxx',
  date: 'YYYY-MM-DD',
  gift_name: '送了什么',
  reaction: '朋友反应'
}
```

### meta（key-value）

- `dav_url` / `dav_username` / `dav_password` / `dav_enabled`：坚果云配置
- `last_sync_at`：上次同步时间
- `pinHash`：锁屏密码 hash

## 八、设计规范

- **主色**：`#C38D9E`（粉），用于强调、按钮、选中态
- **背景色**：`#F5EFE6`（米色暖调）
- **卡片纸色**：`#FFFDF8`
- **文字主色**：`#3E3229`，浅色 `#8A7B6E`
- **卡片尺寸**：首页卡片锁定 `max-width:340px; height:480px`
- **圆角**：卡片 16px，按钮 12px
- **字体**：系统默认（PingFang / 微软雅黑）
- **事件圆点颜色**：生日红 `#E57373` / 纪念日粉 `#C38D9E` / 小事绿 `#90BE6D` / 承诺蓝紫 `#7986CB` / 礼物橙黄 `#E8B86D`

## 九、已完成功能清单

1. **首页**：横向平铺轮播卡片（CSS scroll-snap），中间卡片完整，左右露边
2. **卡片翻转**：点卡片翻面，反面有"标记今天联系过"+"查看完整档案"
3. **朋友档案**：三个 tab —— 基础 / 点滴 / 偏好
4. **点滴页**：
   - 子标签：小事 / 承诺 / 礼物（均匀排布）
   - 时间轴倒序，左滑出"编辑/删除"按钮
   - 承诺右滑直接标记完成/恢复（10ms 震动反馈）
5. **朋友列表**：长按 0.5 秒拖动排序，关系类型分类（家人/好友/同学/同事+自定义）
6. **新朋友表单**：生日滚轮选择器（1950-2099，初始 2003），关系图标点选可多选
7. **头像系统**：圆形头像 + 200×200 裁剪器，支持上传/恢复默认
8. **设置页**：
   - 三个入口按钮（云同步/备份/安全），点进去才显示详情
   - 迷你月历：左右切月+手势滑动，今天高亮，有事件日子浅粉高亮
   - 点某天下方展开当天事件，按朋友分组
9. **全屏日历**：
   - 从迷你月历标题或"安排"区域进入
   - 月视图：大格子，有事件日子浅粉高亮
   - 年视图：12 个月小方块，点月跳回月视图
10. **弹窗**：所有原生 alert/confirm 已替换为自定义居中弹窗
11. **PWA**：manifest + sw.js + 应用图标（翻开小本子）

## 十、已知坑与注意事项

1. **Sw.js 缓存**：每次改 JS/CSS 后必须升 `sw.js` 里的 `CACHE` 版本号（当前 v6），否则手机强刷也看不到新代码
2. **夸克浏览器**：缓存特别顽固，测试建议用 Edge
3. **坚果云 CORS**：纯前端 fetch WebDAV 会被浏览器跨域拦截，报 "Failed to fetch"。要解决需加代理（Vercel Serverless 或自己搭后端）
4. **IP 经常变**：电脑局域网 IP 每次重启可能变，手机连不上先 `ipconfig` 查新 IP
5. **localStorage 在 Quark 上有读写不全的 bug**：之前踩过，已改成纯 localStorage（不用 IndexedDB）
6. **crypto.subtle 在 HTTP 局域网不可用**：自实现字符串 hash
7. **返回逻辑**：app.js 记录 prevView，编辑朋友/点滴保存后要回到上一页而不是首页
8. **sw.js 里的 ASSETS 数组**：新增 JS 文件后要加进去

## 十一、用户偏好与约束

- **不要擅自打 git tag / 保存版本**，每次改完要先问用户是否保存
- 用户在江苏徐州，手机测试用 Edge，夸克缓存问题多
- 用户是汉语言文学专业出身，在做这个 PWA 副业项目，不熟悉前端工程化
- 改 UI 要一步一步来，每次改一个小功能让用户手机上看效果
- 用户喜欢先讨论方案再动手，不要直接写代码
- 每次保存新版本，CHANGELOG.md 顶部加日期（YYYY-MM-DD），最新版后括号标"（当前版本）"

## 十二、下一步待办

### 紧急（朋友要测评前）

1. **部署到 GitHub Pages**
   - GitHub 账号：Rongrong3126
   - 仓库名建议：yourenbu
   - 需要建公开仓库，开启 Pages
   - 部署后手机访问 `https://rongrong3126.github.io/yourenbu`
2. **解决坚果云 CORS**（可选）：用 Vercel Serverless 做代理

### 中期

3. 以后加账号系统（倾向 Supabase，自带用户+数据库）
4. 朋友测评后收集反馈迭代

### 长期

5. 考虑用 PWABuilder 打包成安卓 apk

## 十三、关键文件速查

| 要改什么     | 改哪个文件                    |
| -------- | ------------------------ |
| 首页卡片     | js/card.js, js/home.js   |
| 朋友档案     | js/friend-detail.js      |
| 记一笔弹窗    | js/quick-note.js         |
| 设置页      | js/settings.js           |
| 全屏日历     | js/full-calendar.js      |
| 朋友表单     | js/friend-form.js        |
| 全局样式     | css/main.css             |
| PWA 缓存版本 | sw.js 第3行 CACHE          |
| 同步配置     | js/webdav.js, js/sync.js |
| 路由       | js/app.js                |
| 数据读写     | js/db.js                 |
