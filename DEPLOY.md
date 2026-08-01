# VINTAGE 部署与多设备同步指南

> 架构定调：**电脑端用网页版（PWA），不单独做原生 PC 程序**。
> 一套代码 = PC / Mac / 手机 / 平板浏览器都能开；手机用浏览器「添加到主屏幕」即变成近似原生 App；桌面端 Chrome/Edge 也能「安装」成独立窗口。
> 真账号云同步由一个**零依赖 Node 后端**提供，部署一次即可让所有设备登录同一账号、数据自动同步。

---

## 一、本地先跑通（3 分钟验证）

```bash
cd <项目目录>
node server/server.js
# 浏览器打开 http://localhost:3000
```

- 注册一个邮箱账号 → 进入应用 → 随便加一条任务
- 打开**无痕窗口**（模拟另一台设备）→ 同一账号登录 → 应能看到刚才的任务（云同步生效）
- 后端数据文件在 `server/data/users.json`（请妥善备份，勿提交到公开仓库）

> 纯本地打开 `app/index.html`（file://）也能用，但会**自动降级为本机存储模式**（无云同步）。
> 只要经由 `server/server.js` 访问，前端会自动探测到 `/api` 并启用云端同步，无需任何配置。

---

## 二、部署到云端（让手机也能装、跨设备同步）

任选一个免费/低价平台。**必须 HTTPS**（手机 PWA 安装要求）。

### 方案 A：Render.com（推荐，最简单，免费额度够个人用）

1. 把本项目推到 GitHub 私有仓库（含 `app/`、`server/`、`package.json`）。
2. 打开 https://render.com → 注册 → **New → Web Service** → 关联该仓库。
3. 配置：
   - **Build Command**：留空（零依赖，无需安装）
   - **Start Command**：`node server/server.js`
   - **Instance Type**：Free
4. 高级设置里设置环境变量（可选）：`PORT` 留空（Render 会自动注入）。
5. 创建后等待部署完成，得到形如 `https://vintage-xxxx.onrender.com` 的公网地址。

### 方案 B：CloudStudio（你已有的腾讯云工作区）

1. 在 CloudStudio 中打开本项目目录，打开终端运行 `node server/server.js`。
2. CloudStudio 会提供一个**预览/公网访问地址**（在「预览」或「访问设置」里开启「公网访问」并选 HTTPS）。
3. 用该地址在手机上打开即可。

> 注意：CloudStudio 工作区关闭后进程会停。若需 7×24 常驻，建议用 Render / Railway / Fly.io 等常驻托管。

### 方案 C：自有服务器 / 树莓派 / 内网穿透

```bash
# 生产环境建议加进程守护（pm2）
npm i -g pm2
pm2 start server/server.js --name vintage
pm2 save
```
再用 Nginx 反代 + 免费证书（Let's Encrypt）提供 HTTPS。

---

## 三、手机端「安装成 App」（PWA）

部署拿到 **HTTPS 公网地址**后：

**Android（Chrome / Edge）：**
1. 浏览器打开地址 → 点右上角 `⋮` 菜单 → **「添加到主屏幕」**（Add to Home screen）
2. 命名 `Vintage` → 确认 → 桌面出现图标，点开就是全屏独立 App（无地址栏）

**iPhone / iPad（Safari）：**
1. Safari 打开地址 → 点底部「分享」按钮 → **「添加到主屏幕」**
2. 主屏图标即 App，支持Face ID 解锁后直接使用

> 安装前提：必须是 **HTTPS** 且 `manifest.json` + `service-worker.js` 可达（本项目已配好）。

---

## 四、多设备同步怎么用

1. 在电脑浏览器（或桌面端「安装」的窗口）用邮箱注册/登录 → 数据自动存云端。
2. 手机上打开同一地址 → 登录**同一账号** → 自动拉取云端数据。
3. 任意一端修改后：
   - 保存即自动推送（防抖 600ms 上传云端）
   - 个人页 RING → **「⟳ 立即同步」**可手动拉取另一端最新数据
   - 个人页顶部状态点：绿=已连云端 / 红=离线（会重试）/ 灰=本机模式
4. 切换账号：RING → **「⇄ 切换账号」** → 退出后登录其他账号。

> 同步策略为「最后写入者优先」（个人单活跃设备场景足够）。两端同时狂改同一字段时以最后保存为准。

---

## 五、安全与数据说明

- 密码用 `scrypt` 加盐散列存储，服务端**不存明文密码**。
- 会话用随机 token（Bearer），存于 `localStorage`，登出即作废。
- 数据文件 `server/data/users.json` 含全部账号数据，**请设为私密、定期备份、勿提交到公开 Git**。
- 想换数据库（如 Postgres / SQLite 文件库）只需改 `server/server.js` 的存储函数，前端无需改动。

---

## 六、目录结构

```
app/                  前端（网页 + PWA）
  index.html
  manifest.json       PWA 配置
  service-worker.js   离线缓存（已放行 /api）
  css/app.css
  js/sync.js          云同步客户端（自动探测 /api）
  js/store.js         账号 + 数据（云/本机双模）
  js/views.js views2.js fx.js app.js
  icons/              PWA 图标
server/               零依赖云同步后端
  server.js           HTTP 服务 + /api 认证与数据同步
  data/users.json     运行时生成（账号数据）
package.json          启动脚本（node server/server.js）
```
