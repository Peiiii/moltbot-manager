# 2026-01-28 SSE Job 日志流

## 目标

- 为重操作提供可持续的日志反馈（SSE）
- 以通用 Job 机制实现，前后端复用
- 维持低侵入、易维护的架构

## 本次交付

- 后端新增通用 Job + SSE 日志流
- CLI 安装支持 Job 日志输出
- 网关启动 / 通道探测切换为 Job 执行
- 前端 CLI/网关/探测步骤展示终端日志

## 验证方式

- `pnpm -r --if-present build`
- `pnpm -r --if-present lint`
- `pnpm -r --if-present tsc`
- 冒烟测试（/tmp，非仓库目录）：
  - 启动 API（禁用鉴权）
  - `POST /api/jobs/quickstart` 创建 Job
  - `GET /api/jobs/:id/stream` 收到 `done`/`error` 事件

## 发布/部署

- 如需更新 Pages：`pnpm deploy:pages`
- Docker/脚本安装：重新执行安装脚本即可覆盖

## 相关文档

- [SSE Job 使用说明](./sse-job-logs.md)
