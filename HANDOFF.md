# 开发交接

更新：2026-11-13

当前主线：一步一背公开版。第一至第三阶段完成；第四阶段的开源仓库、独立静态托管和线上试运行已完成，跨地区、运营商与手机真机联网验收待补。

## 当前结果

源码仓库：<https://github.com/guorineng001-byte/yibuyibei>。独立线上入口：<https://guorineng001-byte.github.io/yibuyibei/>。网站可直接打开，使用不需要登录。GitHub Actions 已接通全量测试、生产构建、发行包和 Pages 自动发布。

本机直连完成 62 项线上请求，全部通过，耗时约 4.91 秒。线上浏览器已确认 6033 个要点、离线就绪、章节选择、批量阅读、逐点推进和刷新续读；375×812 手机尺寸下可读、可操作。生成网址先行，自有域名按使用者选择留待之后。

保留两册、43 章、1005 个可学习知识点、6033 个要点及 275 项原图参考。Agent 学习包、修订预览、国内 AI 新手教程、整章／整节批量阅读、连续阅读、会话暂停恢复与完整备份保持接通。

## 文件与运行入口

- 本机主线：`outputs/yibuyibei-public`；生产预览 <http://127.0.0.1:4318/>。
- 开发模式：`pnpm dev`；生产模式：`pnpm run build`、`pnpm start`。
- 发行包：`pnpm run release`，输出 `release/yibuyibei-source.tar.gz`、`release/yibuyibei-site.tar.gz`。
- 发行源码 Git 仓库：`release/source`，远程 `origin` 为上述 GitHub 仓库。根项目目录不参与暂存或推送。
- Pages 构建：`pnpm exec vite build --base=/yibuyibei/ --outDir dist-pages`。
- 发行与托管：[DEPLOYMENT.md](DEPLOYMENT.md)；使用说明：[README.md](README.md)；数据约定：[DATA_MODEL.md](DATA_MODEL.md)。
- 阶段交接：[第一阶段](STAGE1_HANDOFF.md)、[第二阶段](STAGE2_HANDOFF.md)、[第三阶段](STAGE3_HANDOFF.md)、[第四阶段](STAGE4_HANDOFF.md)。

公开版使用独立的 `yibuyibei-public` IndexedDB。正式版、个人手机站点、个人存档、原书和清理副本保持独立。新域名或端口使用独立浏览器数据，既有学习进度通过完整备份带入。

## 本轮验证

GitHub Actions [线上发布验证](https://github.com/guorineng001-byte/yibuyibei/actions/runs/43407334968)通过：40 个测试文件、333 项测试，TypeScript 检查、根路径生产构建、发行打包、Pages 子路径构建和部署均通过。

离线发布测试覆盖托管配置排除、同站点首页规范跳转、项目子路径资源前缀和离线首页恢复。线上探测读取真实 Service Worker 资源表：Service Worker 及 61 项核心资源均返回有效内容。本机直连结果只代表当前网络当时可达。

线上浏览器使用该站点的独立验收数据：第一章 26 个要点设为只阅读，推进至第二点，刷新后从首页继续，恢复位置与已处理 1/26 一致。桌面 1365×900 与手机 375×812 截图见 [桌面首页](docs/stage4-pages-desktop.jpg)、[手机阅读](docs/stage4-pages-mobile.jpg)。正式版 4317 存档未参与验收。

## 已知问题

- 教育研究方法仍待补充，311 页面如实提示。
- 预置文字与原书文件分别管理，OCR 首次使用需要外部资源。
- 学习记录按网站来源隔离，设备与域名间不会自动同步。
- GitHub Pages 在大陆不同地区、运营商的可用性与速度尚未完成验收；当前已完成本机直连和浏览器手机尺寸验收，尚无手机真机移动网络结果。

## 下一步

继续收集真实手机和不同运营商的访问结果。若目标网络不能稳定载入首页与预置内容，再按该网络结果选择独立托管；域名按使用者之后的决定接入。需要本人登录、付费或确认的步骤留待可操作时处理，其余维护继续推进。

每轮结束更新本文件，阶段结束另留阶段交接。发布与维护继续在公开版目录推进，根目录不整体加入 Git 暂存区。
