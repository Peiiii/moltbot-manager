# SSE Job 使用说明

## 概览

通用 Job 提供三类接口：

- 创建 Job（例：安装 CLI）
- 查询 Job 状态
- 订阅 SSE 日志流

适用于需要较长时间的任务（安装、初始化、探测等）。

## API 端点

### 创建 CLI 安装 Job

```bash
curl -s -X POST http://127.0.0.1:17321/api/jobs/cli-install \
  -H 'content-type: application/json' \
  -u admin:pass
```

返回：

```json
{ "ok": true, "jobId": "..." }
```

### 创建 Quickstart Job（网关启动/通道探测）

```bash
curl -s -X POST http://127.0.0.1:17321/api/jobs/quickstart \
  -H 'content-type: application/json' \
  -u admin:pass \
  -d '{"startGateway": true, "runProbe": true}'
```

### 查询 Job

```bash
curl -s http://127.0.0.1:17321/api/jobs/<jobId> -u admin:pass
```

### 创建 Discord 配对 Job

```bash
curl -s -X POST http://127.0.0.1:17321/api/jobs/discord/pairing \
  -H 'content-type: application/json' \
  -u admin:pass \
  -d '{"code":"VMZXPMCA"}'
```

### 创建资源下载 Job

```bash
curl -s -X POST http://127.0.0.1:17321/api/jobs/resources/download \
  -H 'content-type: application/json' \
  -u admin:pass \
  -d '{"url":"https://example.com/resources.zip"}'
```

### SSE 日志流

```bash
curl -N http://127.0.0.1:17321/api/jobs/<jobId>/stream -u admin:pass
```

事件类型：

- `status`（状态更新）
- `log`（日志行）
- `done`（成功结束）
- `error`（失败结束）

## 前端使用

- CLI 安装步骤会自动创建 Job 并展示日志
- 网关启动 / 通道探测 / 配对 / 资源下载复用相同 Job + SSE
