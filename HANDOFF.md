# 开发交接

更新：2026-11-14

当前主线：一步一背公开版。第一至第五阶段完成，进入日常使用与维护。手机未开代理、通过 Wi-Fi 打开线上入口并进入学习的真机验收通过，结果见 [第五阶段交接](STAGE5_HANDOFF.md)。

## 当前结果

源码仓库：<https://github.com/guorineng001-byte/yibuyibei>。试运行入口：<https://guorineng001-byte.github.io/yibuyibei/>。使用不需要登录，发布者的电脑无需开机。GitHub Actions 已接通全量测试、生产构建、发行包和 Pages 自动发布。

2026-11-13 本机直连完成 62 项线上请求，全部通过，耗时约 4.91 秒。线上浏览器已确认 6033 个要点、离线就绪、章节选择、批量阅读、逐点推进和刷新续读；375×812 手机尺寸下可读、可操作。生成网址先行，自有域名按使用者选择留待之后。

GitHub 首页以普通使用者的“直接使用”为首要入口，本机命令移至 [开发者运行说明](DEVELOPMENT.md)。README、开发与托管说明明确区分线上 HTTPS 分享入口和本机开发地址。

2026-11-14 使用者确认手机未开代理，使用 Wi-Fi 打开上述线上链接后“能打开并进入学习”。当前沿用 GitHub Pages，手机直达入口无需新增账户、付费或购买域名。`127.0.0.1:4318` 是运行程序的电脑自己的开发地址，说明中已明确不用于分享。

保留两册、43 章、1005 个可学习知识点、6033 个要点及 275 项原图参考。Agent 学习包、修订预览、国内 AI 新手教程、整章／整节批量阅读、连续阅读、会话暂停恢复与完整备份保持接通。

## 文件与运行入口

- 本机主线：`outputs/yibuyibei-public`；仅限运行电脑的生产预览 <http://127.0.0.1:4318/>。对外分享使用上面的线上 HTTPS 链接。
- 开发模式：`pnpm dev`；生产模式：`pnpm run build`、`pnpm start`。
- 发行包：`pnpm run release`，输出 `release/yibuyibei-source.tar.gz`、`release/yibuyibei-site.tar.gz`。
- 发行源码 Git 仓库：`release/source`，远程 `origin` 为上述 GitHub 仓库。根项目目录不参与暂存或推送。
- Pages 构建：`pnpm exec vite build --base=/yibuyibei/ --outDir dist-pages`。
- 发行与托管：[DEPLOYMENT.md](DEPLOYMENT.md)；使用说明：[README.md](README.md)；数据约定：[DATA_MODEL.md](DATA_MODEL.md)。
- 阶段交接：[第一阶段](STAGE1_HANDOFF.md)、[第二阶段](STAGE2_HANDOFF.md)、[第三阶段](STAGE3_HANDOFF.md)、[第四阶段](STAGE4_HANDOFF.md)、[第五阶段](STAGE5_HANDOFF.md)。

公开版使用独立的 `yibuyibei-public` IndexedDB。正式版、个人手机站点、个人存档、原书和清理副本保持独立。新域名或端口使用独立浏览器数据，既有学习进度通过完整备份带入。

## 本轮验证

本轮记录手机真机结果，更新使用、托管与阶段交接文档，应用和构建配置保持现有版本。使用者本人确认正确线上链接可以打开并进入学习，未开代理、使用 Wi-Fi。手机直达验收通过，地区和运营商尚未记录。

提交 `20cf9d221a471c993e130a1d5875f911faad849b` 的 GitHub Actions [发布验证](https://github.com/guorineng001-byte/yibuyibei/actions/runs/43535642977)中，`verify` 与 `pages` 作业均成功：测试、类型检查、根路径构建、发行打包、Pages 子路径构建及部署通过。发行快照保留 61 项离线核心资源。

既有应用基线 [线上发布验证](https://github.com/guorineng001-byte/yibuyibei/actions/runs/43407334968)通过：40 个测试文件、333 项测试，TypeScript 检查、根路径生产构建、发行打包、Pages 子路径构建和部署均通过。

离线发布测试覆盖托管配置排除、同站点首页规范跳转、项目子路径资源前缀和离线首页恢复。线上探测读取真实 Service Worker 资源表：Service Worker 及 61 项核心资源均返回有效内容。本机直连结果只代表当前网络当时可达。

线上浏览器使用该站点的独立验收数据：第一章 26 个要点设为只阅读，推进至第二点，刷新后从首页继续，恢复位置与已处理 1/26 一致。桌面 1365×900 与手机 375×812 截图见 [桌面首页](docs/stage4-pages-desktop.jpg)、[手机阅读](docs/stage4-pages-mobile.jpg)。正式版 4317 存档未参与验收。

## 已知问题

- 教育研究方法仍待补充，311 页面如实提示。
- 预置文字与原书文件分别管理，OCR 首次使用需要外部资源。
- 学习记录按网站来源隔离，设备与域名间不会自动同步。
- 手机未开代理的 Wi-Fi 访问已通过；移动数据、跨地区与跨运营商的长期稳定性尚未验证。

## 下一步

继续使用和分享当前线上 HTTPS 入口，按需维护应用及经原书核对的教材内容。今后若特定网络不可达，再按具体错误处理托管。需要跨来源迁移时使用完整学习备份，原 PDF 按需重连。域名待实际需要与使用者选择后处理，尚无购买授权。

每轮结束更新本文件，阶段结束另留阶段交接。发布与维护继续在公开版目录推进，根目录不整体加入 Git 暂存区。
