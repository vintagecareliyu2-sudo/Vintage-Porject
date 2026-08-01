# 🪐 VINTAGE

深空复古风格的个人效率工作台（任务 / 学习 / 观影 / 读书 / 工作 / 欧洲旅行 / 笔记）+ **真账号云同步**。

- 前端：纯静态（HTML + CSS + 原生 JS），PWA 可安装到手机主屏。
- 后端：`server/server.js` —— 零依赖 Node 服务，托管网页并提供 `/api/*` 账号认证与数据云同步。
- 云同步：注册/登录后数据自动上传；换设备登录同一账号即同步。

## 本地运行（开发 / 验证）

```bash
node server/server.js          # 默认端口 3000
# 浏览器打开 http://localhost:3000
```

## 部署上线（让别人/手机也能访问）

最简路径：推到 GitHub → Render 一键部署（见 `DEPLOY_GUIDE.md`）。
或本地 `node server/server.js` 后用内网穿透/自有服务器 + Nginx 反代（需 HTTPS）。

## 目录

```
app/            前端（index.html + css + js + icons）
server/         云同步后端（零依赖）
test/           无头回归测试
tools/          图标生成脚本
DEPLOY_GUIDE.md 逐步骤部署手册
```
