# 开发交接

更新：2026-11-16

当前主线：一步一背公开版。第七阶段扫描原书功能已上线，知识检索、学习对照和书库原书阅读可直接查看预置两册的扫描页，详见 [第七阶段交接](STAGE7_HANDOFF.md)。此前六阶段的交付与已保留差异继续有效。

## 当前结果

源码仓库：<https://github.com/guorineng001-byte/yibuyibei>。试运行入口：<https://guorineng001-byte.github.io/yibuyibei/>。无需登录，发布者的电脑无需开机。GitHub Actions 已接通全量测试、生产构建、发行包和 Pages 自动发布。

两册 43 章、1005 个可学习知识点、6033 个要点及 275 项原图参考保持接通。新增 372 张完整扫描页，中外教育史 215 页、教心教原 157 页，沿用原 PDF 页码、书上页码与框选定位。扫描图宽约 2200 像素，合计 108.52 MiB，按页加载；本地连接 PDF 优先使用。

检索结果“查看原书”直接显示对应扫描页；学习页“对照原书”和书库对照整理使用同一加载逻辑。书库“原书阅读”可用上一页、下一页及 PDF 页码输入阅读整册。缩放、旋转、框选与 OCR 整理保持可用。

扫描页不加入首次离线安装，核心资源仍为 61 项。已打开的扫描页单独缓存，应用更新保留，首次查看其他页需要联网；连接完整 PDF 后整册可离线对照。已有学习状态无需迁移，正式版、手机个人版、个人存档和原 PDF 保持独立。

Agent 学习包、修订预览、国内 AI 新手教程、整章／整节批量阅读、连续阅读、暂停恢复、学习设置与完整备份继续可用。手机底部有文字导航，入门指引可收起和重新展开；已有学习记录后提供备份入口和七天提醒。

## 验证结论

本轮全量 42 个测试文件、346 项通过，TypeScript、根路径生产构建和 `/yibuyibei/` Pages 构建通过。覆盖全部扫描页和预置来源定位、本地 PDF 优先、旋转、OCR 框选归一化、按需缓存与更新后保留。372 张页图均可完整解码，抽看两册正文、图示和表格清晰可读。

已发布应用提交 `5f09e31d73192a63ab8bbd2eceb160eda310af26`，GitHub Actions [自动验证与 Pages 发布](https://github.com/guorineng001-byte/yibuyibei/actions/runs/43859401530)通过。线上 372 张扫描图逐页响应头检查全部通过；Service Worker 与 61 项核心资源共 62 项内容检查全部通过，耗时 4.70 秒。旧窗口显示新版已准备好时，关闭此站点所有标签页和主屏幕程序后重新打开。

隔离浏览器来源 `scans-20261116.localhost:4318` 完成两册检索后打开原页、框选、缩放、旋转、书库翻页与末页边界；375×812 手机尺寸可用。停止 4318 服务后刷新，再检索并打开已缓存扫描页成功。截图与细节见 [第七阶段交接](STAGE7_HANDOFF.md)，正式版 4317 存档未参与。

既有手机真机结果：2026-11-14 使用者确认手机未开代理，Wi-Fi 打开线上 HTTPS 链接后可进入学习。见 [第五阶段](STAGE5_HANDOFF.md)、[第六阶段](STAGE6_HANDOFF.md)。

## 文件与运行入口

- 开发主线：`outputs/yibuyibei-public`；本机生产预览 <http://127.0.0.1:4318/>。对外分享使用线上 HTTPS 地址。
- 开发：`pnpm dev`；生产：`pnpm run build`、`pnpm start`。
- 发行：`pnpm run release`，输出 `release/yibuyibei-source.tar.gz`、`release/yibuyibei-site.tar.gz`。
- 发行 Git 仓库：`release/source`，远程 `origin` 为上述 GitHub 仓库。根目录不整体加入 Git 暂存区。
- Pages 构建：`pnpm exec vite build --base=/yibuyibei/ --outDir dist-pages`。
- 扫描图：`public/scans/`；重新导出：`scripts/render-scans.py`，用法见 [DEPLOYMENT.md](DEPLOYMENT.md)。
- 说明：[README.md](README.md)、[DEVELOPMENT.md](DEVELOPMENT.md)、[DATA_MODEL.md](DATA_MODEL.md)、[CONTENT_SOURCES.md](CONTENT_SOURCES.md)。
- 阶段交接：[第一阶段](STAGE1_HANDOFF.md)、[第二阶段](STAGE2_HANDOFF.md)、[第三阶段](STAGE3_HANDOFF.md)、[第四阶段](STAGE4_HANDOFF.md)、[第五阶段](STAGE5_HANDOFF.md)、[第六阶段](STAGE6_HANDOFF.md)、[第七阶段](STAGE7_HANDOFF.md)。

公开版使用独立 IndexedDB `yibuyibei-public`。浏览器、设备和网站来源之间不会自动同步进度，跨来源使用完整学习备份带入。完整备份不含原 PDF 或扫描图缓存。

## 已知问题

- [计划与交付对照](PLAN_REVIEW.md)中的整段连续展示与一次标记读完、Agent 源材料任务包、目录辅助整理、批量撤销、具体要点勾选等尚未交付。使用者此前决定先保留这些差异。
- 首页巩固环和学习进展页仍把只阅读要点计入掌握统计分母，与书库已排除只阅读的口径不一致。
- 站内反馈报告、反馈模板、正式版本发布记录与回退操作说明待补齐；新教材三类版式全流程及手机完整离线流程缺少验收记录。
- 教材分发授权资料仍由使用者落实。扫描图和整理文字不适用代码的 MIT 许可证。
- 教育研究方法待补充，311 页面如实提示；首次 OCR 仍需外部引擎与语言资源。
- 未打开的扫描页需要联网；浏览器回收或清理缓存后需重载。整册离线对照可连接本地 PDF。
- 手机无代理 Wi-Fi 访问已通过；移动数据、跨地区与跨运营商的长期稳定性尚未验证。
- 导出时间仅记录发起下载，请确认 JSON 已保存。入门指引和导出时间不随备份转移。

## 下一步

继续按使用者实际体验维护当前公开版。既有计划对照缺项不自动安排修复，其他教材由使用者自己的 Agent 整理，经原书核对后导入。

沿用当前线上地址，独立域名待实际需要和使用者选择，尚无购买授权。每轮结束更新本文件，阶段结束另留阶段交接。
