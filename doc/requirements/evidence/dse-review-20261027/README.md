# 数据共享交换核查证据

2026-10-27只读静态GET 19次，均200；未主动调用业务API、未执行下载代码。浏览器可控，/dse/board/1跳/module-login/login，未输入认证；未抓Network，浏览器初始化请求未计数，不能声明整个浏览器会话零业务请求。新业务截图0张。

[原文索引](./index.json) · [核查记录](../../15-数据共享交换/核查记录.md) · [离线提取器](../../../../scripts/prepare-dse-evidence.js)

原包及GET回执留本机临时目录。原件字节与片段分别SHA-256，UTF-16偏移左闭右开；shared父请求及配置保留2026-10-26原获取时间，不冒称新取证。

| 证据ID | 相对资源 | 原获取UTC | 片段数 |
|---|---|---|---|
| DSE-SRC-API-TASK | /dse/static/js/api-task.be91c451.js | 2026-10-27T07:12:41.6651486Z | 1 |
| DSE-SRC-API-BOARD | /dse/static/js/api-board.bdd7efe4.js | 2026-10-27T07:12:40.6980153Z | 1 |
| DSE-SRC-API-LOG | /dse/static/js/api-log.7983d7c4.js | 2026-10-27T07:12:41.1615107Z | 1 |
| DSE-SRC-BOARD | /dse/static/js/views-board.04e08f39.js | 2026-10-27T07:12:42.8950430Z | 1 |
| DSE-SRC-LIST | /dse/static/js/views-task-list.d6153f18.js | 2026-10-27T07:12:44.1535282Z | 1 |
| DSE-SRC-TABLE | /dse/static/js/views-task-table.b347bc2c.js | 2026-10-27T07:12:44.4394246Z | 1 |
| DSE-SRC-FILE | /dse/static/js/views-task-file.5ccc3980.js | 2026-10-27T07:12:43.8736867Z | 1 |
| DSE-SRC-API-FORM | /dse/static/js/views-task-api.14aa7df2.js | 2026-10-27T07:12:43.5946473Z | 1 |
| DSE-SRC-LOG | /dse/static/js/views-log-list.71e2f361.js | 2026-10-27T07:12:43.1141447Z | 1 |
| DSE-SRC-PREFIX | /dse/static/js/views-prefix.a7cf05da.js | 2026-10-27T07:12:43.3808851Z | 1 |
| DSE-SRC-CRON | /dse/static/js/components-cron.d21e1175.js | 2026-10-27T07:12:42.2227122Z | 1 |
| DSE-SRC-MAPPING | /dse/static/js/components-mapping.61c8add6.js | 2026-10-27T07:12:42.4446897Z | 1 |
| DSE-SRC-APP | /dse/static/js/app.1d9542ec.js | 2026-10-27T07:12:44.9111421Z | 6 |
| DSE-SRC-COMMON | /dse/static/js/chunk-@audaque/vue-utils.fb93917e.js | 2026-10-27T07:12:46.1505254Z | 1 |
| DSE-SRC-REQUEST | /static/js/app.7ec981a3.js | 2026-10-26T06:07:41.824383+00:00 | 3 |
| DSE-SRC-BASE | /serviceConfig.base.js | 2026-10-26T06:07:41.425372+00:00 | 1 |
| DSE-SRC-CONFIG | /serviceConfig.prod.js | 2026-10-26T06:07:41.447650+00:00 | 2 |

| 历史目标 | 原采样UTC | 路由 |
|---|---|---|
| [J-DSE-001图](../live-recheck-20261022/J-DSE-001.png) / [元素](../live-recheck-20261022/J-DSE-001.json) | 2026-10-22T11:59:07.795Z | /dse/board/1 |
| [J-DSE-002图](../live-recheck-20261022/J-DSE-002.png) / [元素](../live-recheck-20261022/J-DSE-002.json) | 2026-10-22T11:59:14.622Z | /dse/board/2 |
| [J-DSE-003图](../live-recheck-20261022/J-DSE-003.png) / [元素](../live-recheck-20261022/J-DSE-003.json) | 2026-10-22T11:59:21.135Z | /dse/board/8 |
| [J-DSE-004图](../live-recheck-20261022/J-DSE-004.png) / [元素](../live-recheck-20261022/J-DSE-004.json) | 2026-10-22T11:59:24.251Z | /dse/task/list/1 |
| [J-DSE-005图](../live-recheck-20261022/J-DSE-005.png) / [元素](../live-recheck-20261022/J-DSE-005.json) | 2026-10-22T11:59:27.610Z | /dse/task/list/2 |
| [J-DSE-006图](../live-recheck-20261022/J-DSE-006.png) / [元素](../live-recheck-20261022/J-DSE-006.json) | 2026-10-22T11:59:30.640Z | /dse/task/list/8 |
| [J-DSE-007图](../live-recheck-20261022/J-DSE-007.png) / [元素](../live-recheck-20261022/J-DSE-007.json) | 2026-10-22T11:59:33.820Z | /dse/log/list/1 |
| [J-DSE-008图](../live-recheck-20261022/J-DSE-008.png) / [元素](../live-recheck-20261022/J-DSE-008.json) | 2026-10-22T11:59:37.071Z | /dse/log/list/2 |
| [J-DSE-009图](../live-recheck-20261022/J-DSE-009.png) / [元素](../live-recheck-20261022/J-DSE-009.json) | 2026-10-22T11:59:40.221Z | /dse/log/list/8 |
| [J-DSE-010图](../live-recheck-20261022/J-DSE-010.png) / [元素](../live-recheck-20261022/J-DSE-010.json) | 2026-10-22T11:59:50.826Z | /dse/prefix |

历史图均1500×1000。看板右端及底部有滚动裁切；任务/日志为空样本，无有行操作或独立详情/编辑图。J-DSE-010虽路由与菜单为前置机，正文仍为接口日志，不作正常前置机布局证明。当前模板只补充控件定义，未证实与历史材料同一构建。

所有功能/质量应用验收未执行；片段限项目获授权人员使用。
