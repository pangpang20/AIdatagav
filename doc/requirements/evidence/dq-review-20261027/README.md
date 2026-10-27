# 数据查询系统核查证据

复核日期2026-10-27；仅公开静态资源GET及历史材料复看，不执行下载代码。[核查记录](../../13-数据查询系统/核查记录.md) · [原文索引](./index.json) · [离线提取器](../../../../scripts/prepare-dq-evidence.js)

采集器静态GET 13次，均200；不主动调用业务API。浏览器可控制但业务路由跳/module-login/login；未登录、未提交SQL、保存、标签、删除、清除或导出；没有Network和新保存业务截图。浏览器自动请求未计入静态GET数。

原包与GET回执保留本机临时目录；片段偏移按UTF-16 code unit左闭右开，原件和片段分别SHA-256。shared材料保留2026-10-26原获取时间，不改为当日新抓取。

| 证据ID | 相对资源 | 获取UTC | 片段数 |
|---|---|---|---|
| DQ-SRC-API | /mdm-dq/static/js/api-modules-dataQuery.5a7b06a0.js | 2026-10-27T04:01:37.4723856Z | 1 |
| DQ-SRC-ENUM | /mdm-dq/static/js/assets-data-dataQuery.52002087.js | 2026-10-27T04:01:38.2790926Z | 1 |
| DQ-SRC-MINE | /mdm-dq/static/js/views-dataQuery-myQuery.d3a59cda.js | 2026-10-27T04:01:40.3401856Z | 2 |
| DQ-SRC-SQL | /mdm-dq/static/js/views-dataQuery-sqlQuery.1b794e82.js | 2026-10-27T04:01:40.6184588Z | 2 |
| DQ-SRC-LOG | /mdm-dq/static/js/views-dataQuery-logList.bb81e4bf.js | 2026-10-27T04:01:39.6417118Z | 1 |
| DQ-SRC-EDITOR | /mdm-dq/static/js/components-SqlEditor.c8ce4bce.js | 2026-10-27T04:01:39.37267Z | 1 |
| DQ-SRC-LIST | /mdm-dq/static/js/chunk-@audaque/vue-utils.38de3ea7.js | 2026-10-27T04:04:06.7580352Z | 2 |
| DQ-SRC-APP | /mdm-dq/static/js/app.f4b6fd93.js | 2026-10-27T04:01:38.0796438Z | 1 |
| DQ-SRC-REQUEST | /static/js/app.7ec981a3.js | 2026-10-26T06:07:41.824383+00:00 | 3 |
| DQ-SRC-BASE | /serviceConfig.base.js | 2026-10-26T06:07:41.425372+00:00 | 1 |
| DQ-SRC-CONFIG | /serviceConfig.prod.js | 2026-10-26T06:07:41.447650+00:00 | 2 |

| 历史图及元素 | 采样UTC | 相对路由 |
|---|---|---|
| [O-DQ-001图](../live-recheck-20261022/O-DQ-001.png) / [元素](../live-recheck-20261022/O-DQ-001.json) | 2026-10-22T11:57:57.170Z | /mdm-dq/dataQuery/myQuery |
| [O-DQ-002图](../live-recheck-20261022/O-DQ-002.png) / [元素](../live-recheck-20261022/O-DQ-002.json) | 2026-10-22T11:57:59.600Z | /mdm-dq/dataQuery/sqlQuery |
| [O-DQ-003图](../live-recheck-20261022/O-DQ-003.png) / [元素](../live-recheck-20261022/O-DQ-003.json) | 2026-10-22T11:58:01.989Z | /mdm-dq/dataQuery/logList |

三张历史图均1500×1000。我的查询有总数123而行体空白，不能当正常空结果；SQL页来源/表/历史为空且无执行结果；日志页有可见行及内部滚动条。来源候选、表菜单、标签/重执行/结果/显示列弹窗、全屏及失败状态没有正常目标截图，布局仅由静态模板补充。历史样本不构成容量、固定人员/IP或权限规则。

[主规格](../../13-数据查询系统/需求说明.md) · [子规格](../../13-数据查询系统/子页面与操作细化.md)。所有功能/非功能应用验收未执行；材料仅限项目获授权人员。
