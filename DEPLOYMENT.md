# 发行与托管

## 发行内容

一步一背使用独立静态站点托管，线上入口为 <https://guorineng001-byte.github.io/yibuyibei/>，源码位于 <https://github.com/guorineng001-byte/yibuyibei>。学习记录和本地原书保存在访问者自己的浏览器中，预置教材文字包与程序一起发布。用户可用自己的 Agent 整理其他教材，经原书核对后导入。代码与教材的来源及许可分别见 [LICENSE](LICENSE) 和 [CONTENT_SOURCES.md](CONTENT_SOURCES.md)。

完整 PDF 由使用者在本地连接，站点提供文字学习、来源页定位与学习包交换。发行源码和静态包不包含原书、个人学习备份、浏览器存档或本机登录凭据。

## 手机分享入口

分享 <https://guorineng001-byte.github.io/yibuyibei/>，访问者无需登录，发布者的电脑也无需开机。本机 `http://127.0.0.1:4318/` 只用于运行程序的电脑，手机打开这个地址会访问手机自己。

2026-11-14 使用者提供的失败网址为 `http://127.0.0.1:4318/`，在微信中显示“网络出错，无法显示该页面”。该反馈确定为本机地址误作分享链接；线上 HTTPS 网址的手机联网结果另行验收。当前沿用已部署的 GitHub Pages，若正确网址在目标手机网络仍不可达，再依据实际错误选择其他托管。购买或绑定域名不会让本机回环地址成为公网服务。

## 生成发行包

使用 Node.js 24 与项目指定的 pnpm 版本，在公开版源码目录运行：

```powershell
pnpm install --frozen-lockfile
pnpm run release
```

| 输出 | 用途 |
| --- | --- |
| `dist/` | 部署在独立域名根目录的静态站点 |
| `release/yibuyibei-site.tar.gz` | 根路径静态站点包，解压后部署 |
| `release/yibuyibei-source.tar.gz` | 源码包，含预置文字、测试、说明和交接 |
| `release/source/` | 独立发行源码目录及其 Git 仓库 |

发行目录由明确的源码文件和目录组成。项目根目录、其他版本、原书、个人存档、依赖安装目录和本机环境文件保持独立。重新生成时更新发行源码及构建输出，保留其中的 Git 历史。

本机开发与生产预览继续使用 4318。对外发布只使用 `release/source` 中的 Git 仓库，项目根目录不参与暂存或推送。

## GitHub Pages

`.github/workflows/verify.yml` 在推送 `main`、提交 Pull Request 或手动运行时安装依赖、执行测试、生成源码与根路径站点包，结果保存在 `yibuyibei-release` 构建产物中。主分支验证通过后，Pages 作业按平台返回的真实路径构建并发布；Pull Request 只验证，不更新线上站点。

GitHub Pages 使用 `/yibuyibei/` 项目路径。需要在本机生成同样的构建时运行：

```powershell
pnpm exec vite build --base=/yibuyibei/ --outDir dist-pages
```

应用从 Vite 的 `BASE_URL` 读取教材、题库、教程与 Service Worker 路径；图标和 Manifest 相对部署路径解析。根路径构建与项目路径构建使用同一套代码和进度模型。Manifest 的启动路径及 Service Worker 的离线首页键跟随部署路径。

## 其他静态平台与域名

独立域名根目录托管的构建命令为 `pnpm run build`，输出目录为 `dist`。`public/_headers` 为支持该格式的平台设置缓存策略：首页、Service Worker、Manifest 和教材内容检查新版本，带版本文件名的脚本与样式可长期缓存。托管配置文件不进入离线资源表。

域名目前使用生成的网址。之后绑定自有域名时，先在平台登记域名，再按平台返回的准确记录配置 DNS，完成证书签发后验收 HTTPS。

不同域名、端口和浏览器之间不会自动同步数据。换域名前导出完整学习备份，在新入口恢复；本地原书按需重新连接。

## 发布验收

```powershell
pnpm check:deployment https://guorineng001-byte.github.io/yibuyibei/
```

执行环境已设置 `HTTPS_PROXY` 时，可按该网络另行探测：

```powershell
node --use-env-proxy scripts/check-deployment.mjs https://guorineng001-byte.github.io/yibuyibei/
```

直连和代理结果分别记录。脚本读取线上 Service Worker 的真实资源表，验证首页、脚本、Manifest、教程和全部预置文字资源；资源缺失、返回登录 HTML、JSON 格式错误或请求超时会输出具体路径并失败。

桌面与手机验收包括首次载入、6033 个要点装载、选择章节、连续阅读、回忆评分、刷新续学、备份和离线使用。使用隔离浏览器来源或验收数据，正式版 4317 存档保持独立。

大陆网络验收使用关闭代理的实际宽带与手机网络，记录运营商、地区、首屏、预置内容和离线就绪结果。一次网络探测表示该网络当时可达，跨地区与运营商的结果分别记录。

## 已知问题

- 教育研究方法仍待补充，当前教材不代表 311 全科覆盖。
- OCR 引擎和语言资源首次使用需要外部网络；预置文字学习不依赖这些资源。
- 学习记录按网站来源隔离，设备间不会自动同步；原书不在学习备份中。

## 平台资料

- [Vite 部署路径](https://vite.dev/guide/build.html#public-base-path)
- [GitHub Pages 自动部署](https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically)
- [GitHub Pages 域名配置](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Cloudflare 静态资源响应头](https://developers.cloudflare.com/pages/configuration/headers/)
