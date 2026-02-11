# 多人纯前端大富翁 v0.1

基于 Vite + React + TypeScript 的前端项目骨架，目标是先跑通多人房间流程，并沿“纯前端 + Firebase Firestore”路线推进多人同步。

## 当前能力（v0.1）

- 首页：创建房间 / 输入房间号加入
- 房间页：玩家列表、准备、房主开始、复制邀请链接
- 游戏页：棋盘占位与基础房间信息
- 路由：`react-router-dom`
- 数据层：当前用 `localStorage` 占位（便于先开发 UI 与流程）
- Firebase：已接入根目录 `firebase.ts`，统一通过 `src/lib/firebase.ts` 作为入口
- 匿名登录：应用启动后自动匿名登录，并在页面头部显示 `Logged in (anon): xxxxxx`

> 说明：当前房间读写仍使用 `localStorage` 占位（便于先迭代 UI/流程），匿名登录与 Firestore 初始化已就绪，后续可平滑替换为 Firestore 实时同步。

## 本地运行

```bash
npm install
npm run dev
```

默认访问：`http://localhost:5173`

## GitHub Pages 部署（免费公网 URL）

项目已内置 GitHub Actions 自动部署配置：`.github/workflows/pages.yml`。

### 1) 启用 Pages

- 推送代码到 GitHub 仓库默认分支（当前工作流监听 `main`）
- 打开仓库 `Settings` -> `Pages`
- 在 `Build and deployment` 中选择 `Source: GitHub Actions`
- 之后每次 push 到 `main` 会自动 build 并部署

### 2) base 路径与仓库名

- `vite.config.ts` 已自动处理 Pages 子路径：
  - 本地 `npm run dev` 使用 `/`，不受影响
  - CI 构建时默认读取 `GITHUB_REPOSITORY` 自动推导 `/<repo-name>/`
- 若你需要手动覆盖，可在构建环境设置 `VITE_BASE_PATH`（例如 `/my-repo/`）

### 3) 部署后 URL 形式

- 默认访问形式：`https://<github-username>.github.io/<repo-name>/`
- 例如仓库名是 `rich-v01`，则 URL 通常为：
  - `https://<github-username>.github.io/rich-v01/`

### 4) SPA 刷新不 404

- 工作流在构建后会自动复制 `dist/index.html` 为 `dist/404.html`
- 这样在 GitHub Pages 刷新诸如 `/room/:roomId`、`/game/:roomId` 路由时仍可回到 SPA 入口

## Firebase 文件说明

- 根目录 `firebase.ts` 来自 Firebase 控制台生成代码并已补齐导出：`app`、`auth`、`db`
- `src/lib/firebase.ts` 是项目内唯一 Firebase 入口，统一从根目录文件复用导出

## Firebase 环境变量（.env.local）

根目录 `firebase.ts` 现在直接读取 `.env.local` 中的 `VITE_FIREBASE_*` 变量。

请在项目根目录创建并维护 `.env.local`，填入你的 Firebase 配置：

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 目录结构

```text
src/
  app/
    App.tsx
    routes.tsx
  components/
    room/
      PlayerList.tsx
    ui/
      Button.tsx
      Card.tsx
      Input.tsx
      PageShell.tsx
  lib/
    cn.ts
    firebase.ts
    roomLink.ts
    roomStorage.ts
  pages/
    GamePage.tsx
    HomePage.tsx
    RoomPage.tsx
  types/
    game.ts
    index.ts
    player.ts
    room.ts
  index.css
  main.tsx
firebase.ts
.env.local
.github/workflows/pages.yml
```

## 后续接入 Firestore 多人同步建议

- 将 `src/lib/roomStorage.ts` 中的 `load/save/join/setReady/start` 逻辑替换为 Firestore 文档读写与订阅
- `RoomPage`、`GamePage` 已按“状态读取 + 事件触发”的方式组织，迁移成本较低