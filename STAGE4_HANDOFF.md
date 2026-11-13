# 第四阶段交接

2026-11-13

## 交付结果

一步一背已开源并发布独立试运行站点：

- 在线使用：<https://guorineng001-byte.github.io/yibuyibei/>
- 源码仓库：<https://github.com/guorineng001-byte/yibuyibei>
- 自动构建与发布：<https://github.com/guorineng001-byte/yibuyibei/actions>

使用者直接打开网址即可学习，不需要登录。生成网址先行，域名留待之后决定。两册、43 章、1005 个可学习知识点、6033 个要点及 275 项原图参考保持接通。代码 MIT 与教材来源分别说明，原书由访问者在本地连接。

## 发布与运行

主线继续位于 `outputs/yibuyibei-public`，本机使用 4318。`pnpm dev` 开发，`pnpm run build` 后用 `pnpm start` 预览。正式版、个人手机站点、个人存档和原书独立管理。

`pnpm run release` 生成根路径静态包 `release/yibuyibei-site.tar.gz`、源码包 `release/yibuyibei-source.tar.gz` 和发行目录 `release/source`。源码包含预置文字、测试、教程与交接，不含原书、个人学习记录、环境文件或登录凭据。`release/source` 保留自己的 Git 历史，远程 `origin` 为公开仓库；项目根目录不参与暂存或推送。

主分支推送后，GitHub Actions 执行全量测试、类型检查、根路径构建和发行打包，产物保存在 `yibuyibei-release`。验证通过后按 GitHub Pages 返回的真实路径生成站点并部署。Pull Request 运行验证，不更新线上。

独立域名根路径输出到 `dist`。GitHub Pages 使用 `/yibuyibei/`，可用下列命令复现：

```powershell
pnpm exec vite build --base=/yibuyibei/ --outDir dist-pages
```

教材、题库、教程与 Service Worker 使用 Vite 部署路径；Manifest、图标与离线首页跟随同一路径。学习记录按网站来源隔离，换网址前导出完整学习备份，在新入口恢复；原书按需重新连接。

## 文件入口

| 文件 | 用途 |
| --- | --- |
| `.github/workflows/verify.yml` | 全量验证、发行产物和 Pages 自动部署 |
| `scripts/prepare-release.mjs` | 按明确目录生成独立发行源码与静态包 |
| `scripts/check-deployment.mjs` | 按线上真实离线资源表检查完整站点 |
| `scripts/offline-plugin.mjs`、`scripts/offline-plugin.test.mjs` | 部署路径、离线资源与首页缓存 |
| `src/contentCatalog.ts`、`src/LearningPackageCenter.tsx`、`src/MobileSupport.tsx` | 教材、教程和 Service Worker 路径 |
| `index.html`、`public/manifest.webmanifest`、`public/_headers` | 图标、启动路径与静态缓存配置 |
| `README.md`、`DEPLOYMENT.md`、`CONTENT_SOURCES.md` | 使用、发行和来源说明 |

## 验证结论

[应用代码发布验证](https://github.com/guorineng001-byte/yibuyibei/actions/runs/43407334968)对应提交 `aedc0f0ce4236a378ec13e6df8a9f8fd1e395411`：40 个测试文件、333 项测试通过，TypeScript 检查、根路径生产构建、发行打包、Pages 子路径构建和部署均通过。

离线发布测试验证配置文件不进入离线安装、同站点首页规范跳转、项目子路径资源前缀和离线首页缓存命中。

2026-11-13 本机直连执行：

```powershell
pnpm check:deployment https://guorineng001-byte.github.io/yibuyibei/
```

Service Worker 及 61 项核心资源共 62 项请求通过，总耗时约 4.91 秒。首页、脚本、Manifest、教程与预置文字均返回有效内容。该结果表示本机当时的直连网络可达。

线上浏览器在站点独立数据中完成：

- 首页装载完整 6033 个要点，显示“离线背诵已就绪”。
- 按书目、分篇展开目录，勾选第一章 6 个知识点、26 个要点。
- 26 个要点批量设为只阅读，开始并推进至第二点。
- 刷新后已读记录保留，点击“继续上次的要点”恢复至“基本含义”，已处理数量保持 1/26。
- 桌面 1365×900 首页和手机 375×812 阅读布局可用，正文、选择器与推进按钮正常显示。

验收截图：[桌面首页](docs/stage4-pages-desktop.jpg)、[手机阅读](docs/stage4-pages-mobile.jpg)。第三阶段的本地完整学习、评分、备份恢复及更小屏幕验收见 [第三阶段交接](STAGE3_HANDOFF.md)。

## 已知问题与后续

- 尚未完成大陆跨地区、跨运营商与手机真机移动网络验收。GitHub Pages 的网络稳定性以各目标网络实际结果为准。
- 自有域名待使用者决定；更换站点来源需要手动转移完整学习备份。
- 教育研究方法仍待补充，当前内容不代表 311 全科覆盖。
- OCR 引擎及语言资源首次使用需要外部网络；预置文字学习可在离线资源就绪后使用。
- 学习记录按设备、浏览器和网站来源独立保存，设备间不会自动同步；完整备份不包含原书文件。

下一步收集目标网络的首屏、内容装载与离线就绪结果；出现持续不可达或速度不满足使用的网络时，再按实际结果选用其他独立托管。继续维护当前公开版，教材由使用者自己的 Agent 整理并核对原书后导入。

每轮结束更新 [主交接报告](HANDOFF.md)。
