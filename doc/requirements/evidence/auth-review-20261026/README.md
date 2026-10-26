# 登录专项规则与源码证据

原登录片段复核UTC：2026-10-26T02:45:15.625Z；公共请求与配置补充UTC：2026-10-26T03:21:20.132Z。资源均为公开静态GET后离线读取，没有执行下载代码、登录或业务请求。

[登录组件原文及摘要](./index.json) · [公共请求、配置及组件补充](./transport.json) · [登录业务正文](../../01-登录/需求说明.md) · [核查记录](../../01-登录/核查记录.md) · [历史截图](../E002-login-ready.png) · [历史元素](../E002-login-ready.json)

限获授权项目成员使用。仅发布必要原文与摘要；整包、整配置和获取回执留本机临时目录。部署端点与凭据不进入证据。API的/back前缀由本次配置与调用链确认，不是业务Network实测；配置变更后需重新对齐。

原index保留4组资源12段；transport补充6组资源17段，两者共享一份校验工具资源，不合计为10份独立文件。每个片段列出资源路径、获取时间、原包SHA-256、UTF-16偏移与片段SHA-256。

历史截图是2026-10-22的1440×1000样本。密码区域已有洋红色不透明覆盖，不能当作真实控件填充色、密码内容或加密证明；未修改原截图，未新增截图。

| 证据编号 | 资源路径 | 获取UTC时间 | 片段数 |
|---|---|---|---|
| LOGIN-SRC-FORM | /module-login/static/js/views-login-login.42fd202c.js | 2026-10-26T02:41:03.123634+00:00 | 7 |
| LOGIN-SRC-API | /module-login/static/js/api-login.a6dbe736.js | 2026-10-26T02:41:02.357325+00:00 | 2 |
| LOGIN-SRC-VALIDATOR | /module-login/static/js/chunk-@audaque/vue-utils.af9799ec.js | 2026-10-26T02:41:03.702406+00:00 | 2 |
| LOGIN-SRC-LOCALE | /module-login/static/js/app.641c4267.js | 2026-10-26T02:41:03.430808+00:00 | 1 |
| LOGIN-HTTP-CLIENT | /static/js/app.7ec981a3.js | 2026-10-26T03:05:19.067026+00:00 | 5 |
| LOGIN-EMPTY-CHECK | /module-login/static/js/chunk-@audaque/vue-utils.af9799ec.js | 2026-10-26T02:41:03.702406+00:00 | 3 |
| LOGIN-CHECKBOX | /module-login/static/js/chunk-element-ui.94642ac6.js | 2026-10-26T03:05:19.445550+00:00 | 3 |
| LOGIN-REQUEST-SIGN | /static/js/chunk-@audaque/web-utils.2d2d8fd1.js | 2026-10-26T03:05:19.600596+00:00 | 1 |
| LOGIN-CONFIG-BASE | /serviceConfig.base.js | 2026-10-26T03:05:19.833758+00:00 | 2 |
| LOGIN-CONFIG-PROD | /serviceConfig.prod.js | 2026-10-26T03:05:19.979922+00:00 | 3 |

偏移为UTF-16 code unit，左闭右开。静态定义不证明服务端校验或运行结果；AUTH-AC-001至007全部未执行，联调依赖和目标修正在核查记录中独立登记。
