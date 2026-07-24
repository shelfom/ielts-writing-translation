# AGENTS.md

## 项目概述

IELTS Writing Translation — 雅思写作逐句中译英训练课程。包含 30 篇范文和 538 个源句子，按六大话题、五种题型组织。用户通过逐句翻译练习提升写作能力，进度存储在本地。

## 技术栈

- **框架**: React 19 + TypeScript 7
- **构建工具**: Vite 8
- **测试**: Vitest 4 + @testing-library/react + jsdom
- **包管理器**: pnpm
- **运行时**: Node.js 24

## 目录结构

```
/workspace/projects/
├── .coze                  # 项目配置（预览 + 部署）
├── AGENTS.md              # 本文件
├── index.html             # Vite 入口 HTML
├── package.json           # 依赖与脚本
├── pnpm-lock.yaml         # 锁文件
├── vite.config.ts         # Vite 配置
├── vitest.config.ts       # Vitest 配置
├── tsconfig*.json         # TypeScript 配置
├── src/
│   ├── main.tsx           # React 入口
│   ├── App.tsx            # 主应用组件
│   ├── App.test.tsx       # 测试文件
│   ├── essay.ts           # 范文类型定义
│   ├── essays.json        # 30 篇范文数据（195KB）
│   ├── styles.css         # 全局样式
│   └── vite-env.d.ts      # Vite 类型声明
└── scripts/
    ├── coze-preview-build.sh  # 预览构建脚本
    ├── coze-preview-run.sh    # 预览运行脚本
    ├── build.sh               # 部署构建脚本
    ├── run.sh                 # 部署运行脚本
    └── validate-data.ts       # 数据校验脚本
```

## 关键入口 / 核心模块

- `src/main.tsx` — React 应用入口
- `src/App.tsx` — 主应用组件，包含课程导航、翻译练习、进度管理
- `src/essays.json` — 课程数据源（30 篇范文、538 个句子）
- `src/essay.ts` — 范文相关类型定义

## 运行与预览

### 本地开发

```bash
pnpm install
pnpm dev
```

### 预览链路

- 项目被判定为 Web 预览型项目（Vite + React 纯前端）
- 预览通过 Vite dev server 提供，绑定 `0.0.0.0:5000`
- 预览脚本：`scripts/coze-preview-build.sh`（安装依赖）、`scripts/coze-preview-run.sh`（启动 Vite dev server）
- `.coze` 的 `[dev]` 段指向上述脚本

### 测试

```bash
pnpm test          # 运行单元测试
pnpm run test:data # 校验范文数据完整性
```

## 部署

- 部署模式：service（纯前端项目按 service 方式部署）
- 部署构建：`scripts/build.sh` — 安装依赖 + Vite 构建产出 `dist/`
- 部署运行：`scripts/run.sh` — 使用 `serve` 在 5000 端口提供 `dist/` 静态文件
- `.coze` 的 `[deploy]` 段指向上述脚本

## 用户偏好与长期约束

- Node.js 项目统一使用 pnpm，禁止 npm / yarn
- 预览端口固定 5000，绑定 0.0.0.0
- 9000 端口为系统保留，禁止使用或清理

## 常见问题和预防

- `essays.json` 是 195KB 的大文件，修改时注意数据完整性，使用 `pnpm run test:data` 校验
- 预览脚本具备幂等性：每次执行会先清理 5000 端口残留进程
- 部署运行脚本使用 `npx serve`，需确保 `serve` 在 devDependencies 中
