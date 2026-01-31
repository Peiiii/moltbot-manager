# 设计文档：CLI 迁移 TypeScript + 可维护性重构

## 目标

- CLI 代码从 JS 迁移到 TS
- 按职责拆分模块，降低单文件复杂度
- 保持现有用户体验（start/stop/stop-all、ASCII Banner）

## 范围

- `packages/cli` 内部结构与构建流程
- 不修改 API 行为与配置格式

## 结构设计

```
packages/cli/
  src/
    index.ts           # CLI 入口与路由
    commands/
      start.ts
      stop.ts
      stop-all.ts
    lib/
      args.ts          # 参数解析
      banner.ts        # ASCII Banner
      config.ts        # 配置/路径
      help.ts          # help / welcome 输出
      paths.ts         # 包路径
      pids.ts          # PID 工具
      system.ts        # systemctl/pgrep/lsof
      types.ts         # 类型定义
      version.ts       # 版本读取
  bin/                 # TS 编译输出（发布产物）
  tsconfig.json
```

## 关键策略

- `bin/` 作为构建产物输出目录，发布时包含
- `pnpm build` 自动编译 CLI
- `pnpm lint` 对 CLI 进行类型检查

## 风险

- CLI 运行环境为 ESM，需 `module: NodeNext`
- Banner 在窄终端可能折行

## 验收标准

- `openclaw-manager --help` 输出 Banner + 使用说明
- `openclaw-manager start/stop/stop-all` 行为与原版一致
- build/lint/tsc 通过
