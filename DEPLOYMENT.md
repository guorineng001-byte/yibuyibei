# 发行与托管

## 发行内容

一步一背使用静态站点托管。学习记录和本地原书保存在访问者自己的浏览器中，预置教材文字包与程序一起发布。用户可用自己的 Agent 整理其他教材，经原书核对后导入。代码与教材的来源及许可分别见 [LICENSE](LICENSE) 和 [CONTENT_SOURCES.md](CONTENT_SOURCES.md)。

完整 PDF 由使用者在本地连接，站点只提供文字学习、来源页定位与学习包交换。当前发行不托管 PDF，也不把原书、个人学习备份或浏览器存档纳入源码包。

## 生成发行包

使用 Node.js 24 与项目指定的 pnpm 版本。在公开版源码目录运行：

```powershell
pnpm install --frozen-lockfile
pnpm run release
```

| 输出 | 用途 |
| --- | --- |
| `dist/` | 可部署的静态站点，托管根目录对应其中的 `index.html` |
| `release/yibuyibei-site.tar.gz` | 静态站点发行包，解压后部署 |
| `release/yibuyibei-source.tar.gz` | 源码发行包，含预置文字、测试和维护文档 |
| `release/source/` | 独立的发行源码目录，可接入远程仓库 |

发行目录由明确的源码文件和目录组成。项目根目录、其他版本、原书、个人存档、依赖安装目录和本机环境文件保持独立。`release/source/.git` 可保留发行仓库历史，重新生成时更新其中的源码及构建输出。

GitHub 的 `.github/workflows/verify.yml` 在推送 `main`、提交 Pull Request 或手动运行时安装依赖、测试并构建发行包，结果保存在 `yibuyibei-release` 构建产物中。

## 静态托管

当前 Sites 项目标识保存在 `.openai/hosting.json`，静态目录为 `dist`。该标识用于接续同一站点。线上网址和当前版本记录在 [开发交接](HANDOFF.md)。

部署到其他静态平台时，构建命令为 `pnpm run build`，输出目录为 `dist`。站点使用根路径资源，部署在独立域名根目录；GitHub 可用于源码与发行包托管。部署到 `用户名.github.io/仓库名/` 这类子路径需要调整所有静态资源、内容包、Manifest 与 Service Worker 的路径。

`public/_headers` 为支持该格式的平台设置更新策略：首页、Service Worker、Manifest 和教材内容检查新版本，带版本文件名的脚本与样式可长期缓存。托管配置文件不进入离线资源表。

域名先使用平台生成网址。之后绑定自有域名时，先在托管平台登记域名，再将平台返回的准确记录写入 DNS，完成证书签发后验收 HTTPS。原网址和新域名属于不同网站来源，换域名前导出学习备份，在新域名恢复；本地原书按需重新连接。

## 发布验收

```powershell
pnpm check:deployment https://你的站点域名
```

执行环境已经设置 `HTTPS_PROXY` 时，可使用 Node.js 24 的环境代理支持：

```powershell
node --use-env-proxy scripts/check-deployment.mjs https://你的站点域名
```

直连和代理探测的结果分别记录。

探测读取线上 Service Worker 的真实资源表，验证首页、脚本、Manifest、教程和全部预置文字资源能成功返回。脚本或 JSON 返回登录 HTML、资源缺失、格式错误或请求超时会使检查失败，并输出具体路径，便于针对部署或网络修正。

随后在桌面和手机浏览器完成首次载入、选择章节、连续阅读、独立回忆评分、刷新续学、学习备份和离线使用。使用隔离浏览器来源或验收数据；正式版 4317 存档保持独立。

大陆网络验收应在关闭代理的实际宽带与手机网络中访问最终网址，记录运营商、地区、首屏、预置内容装载和离线就绪结果。一次执行网络的探测只表示该网络当时可达。生成网址可用于试运行，正式推广前再根据实测选择域名与托管位置。

## 已知问题

- 教育研究方法仍待补充，当前教材不代表 311 全科覆盖。
- OCR 引擎和语言资源首次使用需要外部网络；预置文字学习不依赖这些资源。
- 学习记录按网站来源隔离，设备和端口间不会自动同步；原书文件不在学习备份中。

## 平台资料

- [Cloudflare 静态站点部署](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)
- [Cloudflare 静态资源响应头](https://developers.cloudflare.com/pages/configuration/headers/)
- [Cloudflare 域名接入](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare China Network](https://developers.cloudflare.com/china-network/)
