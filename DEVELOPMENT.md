# 开发与本机运行

普通使用者请从 [在线入口](https://guorineng001-byte.github.io/yibuyibei/) 开始。本页用于修改代码或自行部署。

## 环境与命令

使用 Node.js 24 和项目指定的 pnpm 11.25.0，在源码目录运行：

```powershell
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

在运行程序的这台电脑上打开 <http://127.0.0.1:4318/>。这个地址指向访问设备自己，不能发给手机或朋友使用；分享请用 [线上入口](https://guorineng001-byte.github.io/yibuyibei/)。开发模式使用 `pnpm dev`，同样监听 4318；生产构建输出到 `dist/`。`pnpm test` 运行内容、学习流程及公开版状态测试。

本机主线位于 `outputs/yibuyibei-public`。正式版 4317、个人手机站点、学习存档和原书独立管理，浏览器验收使用隔离数据。

## 发布与维护

发行包、GitHub Pages 子路径构建与自动部署见 [发行与托管](DEPLOYMENT.md)。当前阶段和下一步见 [开发交接](HANDOFF.md)，持久化与学习包约定见 [数据模型](DATA_MODEL.md)。
