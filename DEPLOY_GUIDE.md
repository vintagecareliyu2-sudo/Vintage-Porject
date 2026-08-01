# VINTAGE 部署实操手册 · 方案 A（GitHub + Render 一键云同步）

目标：把 VINTAGE 推到 GitHub，再用 Render 部署成一个 **HTTPS 公网地址**，
手机浏览器打开即可「添加到主屏幕」变成独立 App，且多设备登录同一账号自动云同步。

---

## 一、你需要提前准备的（全部免费）

| 项目 | 用途 | 获取方式 |
|------|------|----------|
| GitHub 账号 | 托管代码 | https://github.com 注册（已有可跳过） |
| Render 账号 | 免费托管 Node 服务 + 自动 HTTPS | https://render.com 注册，**用 GitHub 登录最省事** |
| 本机 Git | 推送代码 | Windows 装 [Git for Windows](https://git-scm.com/download/win)；Mac 装 Xcode Command Line Tools（`xcode-select --install`）；Linux `apt install git` |
| 本机 Node 22 | 本地验证用，部署不需要 | 已用于开发，可跳过 |

> 总计耗时约 **15 分钟**，其中 Render 首次构建约 2–3 分钟。

---

## 二、第 0 步：本地代码已为你备好 ✅

我已经在项目目录完成了以下事情，你不用再动代码：

- `git init` 初始化仓库（见下方「第 4 步」会提交）
- `server/server.js` 已绑定 `0.0.0.0`（Render 健康检查需要）
- `server/data/` 测试账号已清理、且被 `.gitignore` 排除（**账号数据不会上传**）
- `render.yaml` 已就位（可一键 Blueprint 部署）
- `package.json` 的 `start` 已指向 `node server/server.js`

你只需做「第 3~4 步」把代码推上去。

---

## 三、第 1 步：注册 / 登录 GitHub

1. 打开 https://github.com
2. 右上角 **Sign up**（或登录）
3. 验证邮箱（否则不能创建仓库）

---

## 四、第 2 步：本机配置 Git（只需一次）

打开终端（Windows：Git Bash 或 PowerShell），逐行执行，把中文换成你自己的：

```bash
git config --global user.name  "你的名字"
git config --global user.email "你注册GitHub用的邮箱"
```

> 不需配置 SSH 也能推（用 HTTPS + 浏览器令牌）。下文第 4 步会说明登录方式。

---

## 五、第 3 步：在 GitHub 网页上创建空仓库

1. 登录 GitHub → 右上角 **＋** → **New repository**
2. Repository name 填：`vintage` （可自定义，记住它）
3. Description（可选）：`深空复古个人效率工作台 + 云同步`
4. 选 **Public**（免费；代码不含任何账号数据，安全）
5. **不要**勾选 "Add a README file" / ".gitignore" / "License"（我们本地已有）
6. 点 **Create repository**
7. 创建后会看到一个页面，复制其中的仓库地址，形如：
   ```
   https://github.com/<你的用户名>/vintage.git
   ```
   把它保存好，第 4 步要用。

---

## 六、第 4 步：把代码推送到 GitHub

回到本项目目录的终端，逐行执行（**只改第 2 行的地址**）：

```bash
# 进入项目目录（路径按你实际位置改）
cd "/c/Users/31313610/WorkBuddy/Create a Skill"

# 关联远程仓库（把 <> 里的换成你第3步复制的地址）
git remote add origin https://github.com/<你的用户名>/vintage.git

# 提交全部代码
git add -A
git commit -m "VINTAGE: app + cloud sync server"

# 推送（首次会要求登录 GitHub）
git push -u origin main
```

**关于登录（第一次 push 会弹窗 / 要求输入）：**
- **推荐**：用 GitHub 个人令牌（PAT）当密码。
  生成地址：GitHub → 头像 → **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token**
  勾选 `repo` 权限，Note 随便写，过期选 90 天，点 Generate。
  复制令牌；`git push` 用户名填你的 GitHub 用户名，**密码填这个令牌**（不是账号密码）。
- 或在弹出的浏览器里直接授权（GitHub 新版 Git Credential 会记住）。

推送成功后，刷新 GitHub 仓库页面，能看到 `app/`、`server/`、`render.yaml` 等文件即成功。

> 万一你的默认分支叫 `master` 而非 `main`：把最后一行改成
> `git push -u origin master`，并同步把 `render.yaml` 里的 `branch: main` 改为 `branch: master`。

---

## 七、第 5 步：注册 Render（用 GitHub 登录）

1. 打开 https://render.com
2. 点 **Sign Up** → 选 **Continue with GitHub** → 授权
3. 邮箱验证完成即可。

---

## 八、第 6 步：在 Render 部署（两种方法，任选其一）

### 方法 A：Blueprint 一键部署（最省事，推荐）

1. Render 控制台左上角 **New** → **Blueprint**
2. 连接 GitHub 后，在列表里选中 `vintage` 仓库
3. Render 会自动读取 `render.yaml`，显示将要创建的服务 `vintage`
4. 直接点 **Apply**
5. 跳到方法 C 等构建。

### 方法 B：手动 New Web Service（更可控）

1. Render 控制台左上角 **New** → **Web Service**
2. 连接 GitHub → 选中 `vintage` 仓库 → **Connect**
3. 按以下逐字段填写（其余保持默认）：

| 字段 | 填什么 |
|------|--------|
| Name | `vintage`（随意） |
| Region | `Oregon`（或 `Singapore` 离国内近） |
| Branch | `main`（或 `master`） |
| Runtime | `Node` |
| Build Command | **留空**（零依赖，不需要 build） |
| Start Command | `node server/server.js` |
| Instance Type | **Free** |

4. 页面底部点 **Create Web Service**
5. 跳到方法 C 等构建。

### 方法 C：等构建完成，拿到地址

- 控制台会显示实时日志，**约 2–3 分钟**后状态变成 **Live（绿色）**
- 顶部出现一个地址，形如：
  ```
  https://vintage-xxxx.onrender.com
  ```
- **第一次打开可能慢几秒**（免费实例休眠后冷启动），刷新一次即可。

---

## 九、第 7 步：手机安装成 App（iOS / Android）

### iPhone（Safari）
1. 用 Safari 打开上面的 `https://vintage-xxxx.onrender.com`
2. 点底部**分享按钮**（方块带向上箭头）
3. 下滑找到 **「添加到主屏幕」**
4. 名称填 `Vintage` → **添加**
5. 桌面出现图标，点开即**全屏独立 App**（无地址栏）

### Android（Chrome）
1. 用 Chrome 打开地址
2. 地址栏右侧会出现 **「安装」** 提示（或右上角 ⋮ → **安装应用 / 添加到主屏幕**）
3. 确认 → 桌面出现图标
4. 点开即独立 App

> 电脑端（Win/Mac）Chrome / Edge 打开地址后，地址栏右侧也会有「安装」图标，
> 点一下就能变成桌面独立窗口，体感等同原生 PC 软件。

---

## 十、第 8 步：验证多设备云同步

1. 手机或电脑浏览器打开你的地址 → 注册账号 A（邮箱+密码）
2. 随便加一个「观影」任务并保存
3. 换一台设备（或开无痕窗口）→ 用**同一账号 A** 登录
4. 能看到刚才的任务 = **云同步成功** ✅
5. 个人页 RING 区有同步状态点：
   - 🟢 绿 = 已连云端，保存即上传
   - 🔴 红 = 离线，恢复网络后自动重试
   - ⚪ 灰 = 纯本机模式（没连后端时）
   也可点 **「⟳ 立即同步」** 手动刷新。

---

## 十一、常见问题排查

| 现象 | 原因 / 解决 |
|------|------------|
| 推送报 `403 / Authentication failed` | 密码要用 **PAT 令牌**，不是 GitHub 登录密码（见第 4 步） |
| Render 构建失败 `node: command not found` | 确认 `render.yaml` 里 `NODE_VERSION: "22"`，或手动服务选 Node 运行时 |
| 打开页面空白 | 看 Render 日志；确认 Start Command 是 `node server/server.js`；FR 实例冷启动等 10 秒刷新 |
| 注册提示「该账号已注册」 | 之前已注册过，直接登录即可 |
| 同步状态是灰色 | 前端没探测到 `/api`。确认部署的是**整套**（含 `server/`），不是只传了 `app/` |
| 手机收不到推送 | 这是同步，不是消息推送；保存后自动上传，无需额外配置 |
| 想换域名 | Render 免费支持自定义域名；或在 Cloudflare 加 CNAME |
| 免费实例休眠 | Render Free 15 分钟无访问会休眠，首次访问冷启动约 5–10 秒，属正常 |

---

## 十二、安全 / 隐私提醒（重要）

- `server/data/users.json` 存全部账号数据，已列入 `.gitignore`，**不会进 GitHub**。
- 密码用 **scrypt 加盐散列**存储，服务端不存明文。
- 免费 Render 数据存于其磁盘，适合个人使用；如要更高安全，可换数据库或加 HTTPS-only cookie。
- 不要把 `.env`、令牌提交到仓库。
- 不想用了：Render 控制台删掉服务即可；GitHub 删仓库即不再公开代码。

---

## 附：本地验证（部署前自测，可选）

```bash
node server/server.js
# 打开 http://localhost:3000
# 注册 → 加任务 → 开无痕窗口登同一账号 → 看到任务 = 云同步 OK
```

部署成功后，本地这一份就不再需要，所有数据都在云端（Render 实例磁盘）。
