# 开发交接

更新：2026-11-13

当前主线：一步一背公开版。第一至第三阶段完成，第四阶段正在推进独立静态托管、开源仓库与大陆网络验收。

## 当前结果

源码已发布到 <https://github.com/guorineng001-byte/yibuyibei>。GitHub Actions 已接通测试、生产构建与发行包；此前完整验证为 40 个测试文件、332 项测试通过。GitHub Pages 已启用，当前正在接通项目子路径构建与自动发布。

发布入口为 <https://guorineng001-byte.github.io/yibuyibei/>，本轮最终线上状态和网络验收结果将在完成发布后写入本文件。生成网址先行，自有域名按使用者选择留待之后。

保留两册、43 章、1005 个可学习知识点、6033 个要点及 275 项原图参考。Agent 学习包、修订预览、国内 AI 新手教程、整章／整节批量阅读、连续阅读、会话暂停恢复与完整备份保持接通。

## 文件与运行入口

- 本机主线：`outputs/yibuyibei-public`；生产预览 <http://127.0.0.1:4318/>。
- 开发模式：`pnpm dev`；生产模式：`pnpm run build`、`pnpm start`。
- 发行包：`pnpm run release`，输出 `release/yibuyibei-source.tar.gz`、`release/yibuyibei-site.tar.gz`。
- 发行源码 Git 仓库：`release/source`，远程 `origin` 为上述 GitHub 仓库。根项目目录不参与暂存或推送。
- Pages 构建：`pnpm exec vite build --base=/yibuyibei/ --outDir dist-pages`。
- 发行与托管：[DEPLOYMENT.md](DEPLOYMENT.md)；使用说明：[README.md](README.md)；数据约定：[DATA_MODEL.md](DATA_MODEL.md)。
- 历史阶段：[第一阶段](STAGE1_HANDOFF.md)、[第二阶段](STAGE2_HANDOFF.md)、[第三阶段](STAGE3_HANDOFF.md)。

公开版使用独立的 `yibuyibei-public` IndexedDB。正式版、个人手机站点、个人存档、原书和清理副本保持独立。新域名或端口使用独立浏览器数据，既有学习进度通过完整备份带入。

## 本轮验证

新增发布检查覆盖托管配置不进入离线安装、同站点首页规范跳转、项目子路径资源前缀和离线首页恢复。相关 3 个测试文件、22 项测试通过，根路径类型检查与生产构建通过，Pages 子路径构建通过。

线上发布完成后继续验证真实资源表、全量预置内容、桌面手机入口和直连网络。只对新改动或未解决问题追加验证。

## 已知问题

- 教育研究方法仍待补充，311 页面如实提示。
- 预置文字与原书文件分别管理，OCR 首次使用需要外部资源。
- 学习记录按网站来源隔离，设备与域名间不会自动同步。
- 大陆不同地区和运营商的网络可用性需要按实际访问结果记录。

## 下一步

完成当前 GitHub Pages 自动发布，验证独立网址的资源与学习入口，记录本机直连及移动网络结果，再更新第四阶段交接。使用者允许直接操作电脑，尽量不打断；确实需要本人确认的步骤先跳过，继续处理其他工作。

每轮结束更新本文件，阶段结束另留阶段交接。发布与维护继续在公开版目录推进，根目录不整体加入 Git 暂存区。
