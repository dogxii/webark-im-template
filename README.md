<p align="center">
  <img src="./public/favicon.svg" width="72" height="72" alt="Webark IM Template" />
</p>

<h1 align="center">Webark IM Template</h1>

<p align="center">
  一个开箱即用的 React IM 前端模板。内置桌面三栏、移动端聊天、联系人、群资料、设置、帮助、Markdown 消息、表情、@ 提及和本地 demo 数据。
</p>

<p align="center">
  <a href="https://github.com/dogxii/webark-im-template"><img src="https://img.shields.io/badge/GitHub-dogxii%2Fwebark--im--template-111827?logo=github" alt="GitHub repository" /></a>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827" alt="React" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Bun-ready-000000?logo=bun" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-10B981" alt="License" />
</p>

<p align="center">
  <a href="https://im-template.dogxi.me">在线体验</a> ·
  <a href="#-为什么用">为什么用</a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-如何套用">如何套用</a> ·
  <a href="https://github.com/dogxii/webark-im-template/issues">反馈建议</a>
</p>

## ⚠️ 声明

本项目为独立开源 IM 前端模板，不隶属于任何第三方即时通讯平台。本项目仅供学习交流，请勿用于违法用途。

## 🖼️ 预览

![桌面端聊天预览](./docs/screenshots/desktop-chat.jpg)

<p align="center">
  <img src="./docs/screenshots/mobile-list.jpg" width="260" alt="移动端会话列表预览" />
  <img src="./docs/screenshots/mobile-chat.jpg" width="260" alt="移动端聊天预览" />
</p>

## ❓ 为什么用

- 完整 IM 前端骨架：会话列表、聊天窗口、联系人、群聊详情、资料页和设置页。
- 同时适配桌面端和移动端，默认就是可体验的聊天界面。
- 纯前端 demo，无数据库，无自建后端，拉下来即可运行。
- 组件和状态边界清晰，方便接入自己的登录、API、上传、通知和机器人能力。
- 提供工具页、消息渲染、输入框按钮、资料操作和设置面板等轻量扩展入口。

## 🚀 快速开始

```bash
bun install
bun run dev
```

默认访问：

```text
http://localhost:5173
```

生产构建：

```bash
bun run build
bun run preview
```

## 🧩 如何套用

从模板入口引入核心组件：

```ts
import {
	ChatShell,
	ChatSidebarContent,
	ChatMainContent,
	createMemoryChatDataSource,
	type ChatDataSource,
	useChatShellController,
} from "webark-im-template";
import "webark-im-template/styles.css";
```

你只需要实现或注入一个 `ChatDataSource`，模板负责 UI、列表、输入和常见 IM 交互。登录鉴权、服务端接口、文件上传、推送通知、机器人和业务路由都放在自己的应用层。

核心适配接口：

- `loadConversations`
- `loadContacts`
- `loadMessages(conversationId, cursor)`
- `sendMessage`
- `retryMessage`
- `subscribe`
- `markAsRead`

模板内置 `createMemoryChatDataSource` 作为 Mock Adapter，适合 demo、测试和最小接入示例；真实项目应替换为自己的 API adapter。

消息层已支持：

- 游标分页和加载更早消息
- 动态高度消息布局和历史加载后的滚动锚点保持
- 历史分页去重合并
- 乐观发送、`pending / sent / failed`
- `clientMessageId` 去重和服务端回执覆盖本地临时消息
- 失败重试入口

常用扩展函数：

- `composeToolRegistry`
- `composeMessageRenderers`
- `composeComposerActionRegistry`
- `composeProfileActionRegistry`
- `composeConversationDetailActionRegistry`
- `composeSettingsPanelRegistry`

最小业务接入示例见 `examples/minimal`。

## ✅ 工程质量

```bash
bun run format
bun run typecheck
bun run test
bun run test:e2e
bun run build
bun run build:example
```

`build` 会同时构建 demo 和 library mode 产物，包入口由 `package.json` 的 `exports` 暴露。`build:example` 会安装并构建 `examples/minimal`，验证第三方项目可以通过包入口接入。

## 📁 目录

```txt
src/
  App.tsx          demo app
  main.tsx         Vite entry
  styles.css       style entry
	styles/          CSS files
	template/        reusable IM components, data source, types, state, demo data
examples/minimal/   smallest business integration sample
e2e/                Playwright smoke tests
tests/              unit and component tests
```

## 📈 项目 Star 历史

<a href="https://www.star-history.com/?repos=dogxii%2Fwebark-im-template&type=date&legend=bottom-right">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=dogxii/webark-im-template&type=date&theme=dark&legend=bottom-right" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=dogxii/webark-im-template&type=date&legend=bottom-right" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=dogxii/webark-im-template&type=date&legend=bottom-right" />
 </picture>
</a>

## 🪪 License

MIT [@Dogxi](https://github.com/dogxii)
