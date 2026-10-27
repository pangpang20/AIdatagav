# 智能查询系统专项证据

[主规格](../../22-智能查询系统/需求说明.md) · [子页面](../../22-智能查询系统/子页面与操作细化.md) · [核查记录](../../22-智能查询系统/核查记录.md) · [片段与摘要](./index.json) · [离线提取工具](../../../../scripts/prepare-idqs-evidence.js)

2026-10-27公开静态GET成功22次（HTML 1、JS 21），失败0。原件与receipt.json保留本机临时目录；索引记录相对路径、真实获取时间、提取时间、UTF-16 code unit左闭右开偏移及原件/片段SHA-256。--verify仅离线核对，不执行原代码。

浏览器入口/idqs/inquire最终跳/module-login/login；未填写凭据，未进入业务子页，新增截图0、未取得Network。收集器业务请求0不代表浏览器没有请求。shared组沿用原始获取时间。

本次目视历史1500×1000样本K-IDQS-001、K-IDQS-002、N-IDQS-002、K-IDQS-003-op1、K-IDQS-004、K-IDQS-005-op1。K-IDQS-002路径已切到范围管理但画面仍为即席欢迎页；N-IDQS-002才用于范围列表布局。其他历史JSON仅作字段与路由对照；新增范围、权限、结果、SQL、图表和语音分支未实拍。原PNG/JSON保持不变。

| 证据ID | 相对资源路径 | 获取UTC | 片段数 |
|---|---|---|---|
| IDQS-SRC-API-common | /idqs/static/js/api-common.16ffdbdf.js | 2026-10-27T09:17:41.237Z | 1 |
| IDQS-SRC-API-currentCommon | /idqs/static/js/api-currentCommon.0d4c62b8.js | 2026-10-27T09:17:41.252Z | 1 |
| IDQS-SRC-API-inquire | /idqs/static/js/api-inquire.5babb8be.js | 2026-10-27T09:17:41.235Z | 1 |
| IDQS-SRC-API-intelligentQuery | /idqs/static/js/api-intelligentQuery.226646c0.js | 2026-10-27T09:17:41.240Z | 1 |
| IDQS-SRC-API-queryConfig | /idqs/static/js/api-queryConfig.381caf73.js | 2026-10-27T09:17:41.298Z | 1 |
| IDQS-SRC-API-queryRecommend | /idqs/static/js/api-queryRecommend.8e17d100.js | 2026-10-27T09:17:41.296Z | 1 |
| IDQS-SRC-API-queryScope | /idqs/static/js/api-queryScope.f42d2ac5.js | 2026-10-27T09:17:41.297Z | 1 |
| IDQS-SRC-API-serviceConstant | /idqs/static/js/api-serviceConstant.96453b63.js | 2026-10-27T09:17:41.290Z | 1 |
| IDQS-SRC-VIEW-inquire-intelligentQuery | /idqs/static/js/views-inquire-intelligentQuery.e87363f3.js | 2026-10-27T09:17:41.331Z | 3 |
| IDQS-SRC-VIEW-inquire-result | /idqs/static/js/views-inquire-result.a877a429.js | 2026-10-27T09:17:41.354Z | 3 |
| IDQS-SRC-VIEW-inquire | /idqs/static/js/views-inquire.5b90973a.js | 2026-10-27T09:17:41.326Z | 3 |
| IDQS-SRC-VIEW-queryConfig-list | /idqs/static/js/views-queryConfig-list.a3497cdc.js | 2026-10-27T09:17:41.324Z | 3 |
| IDQS-SRC-VIEW-queryRecommend-edit | /idqs/static/js/views-queryRecommend-edit.caedbd58.js | 2026-10-27T09:17:41.346Z | 3 |
| IDQS-SRC-VIEW-queryRecommend-list | /idqs/static/js/views-queryRecommend-list.204fb3ad.js | 2026-10-27T09:17:41.349Z | 3 |
| IDQS-SRC-VIEW-queryScope-edit | /idqs/static/js/views-queryScope-edit.3dd981d1.js | 2026-10-27T09:17:41.380Z | 3 |
| IDQS-SRC-VIEW-queryScope-list | /idqs/static/js/views-queryScope-list.a251a2e7.js | 2026-10-27T09:17:41.365Z | 3 |
| IDQS-SRC-BRIDGE | /idqs/static/js/chunk-@audaque/parentdata.5d54d53d.js | 2026-10-27T09:24:09.904Z | 1 |
| IDQS-SRC-MIXIN | /idqs/static/js/chunk-@audaque/vue-utils.d54ce51d.js | 2026-10-27T09:24:09.987Z | 2 |
| IDQS-SRC-ROUTER | /idqs/static/js/app.d31e6fa0.js | 2026-10-27T09:17:41.426Z | 2 |
| IDQS-SRC-REQUEST | /static/js/app.7ec981a3.js | 2026-10-26T06:07:41.824383+00:00 | 3 |
| IDQS-SRC-BASE | /serviceConfig.base.js | 2026-10-26T06:07:41.425372+00:00 | 1 |
| IDQS-SRC-CONFIG | /serviceConfig.prod.js | 2026-10-26T06:07:41.447650+00:00 | 2 |

限项目授权成员；不保存部署origin、凭据和真实业务数据。全部功能、写入、性能与安全应用验收未执行。
