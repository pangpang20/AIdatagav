# 规范化数据建模专项证据

复核日期2026-10-27；提取UTC 2026-10-27T03:30:37.229Z。仅保存必要静态原文与摘要，原包及GET回执保留本机临时目录；未执行下载代码。

[正式需求](../../10-规范化数据建模/需求说明.md) · [子页面细则](../../10-规范化数据建模/子页面与操作细化.md) · [核查记录](../../10-规范化数据建模/核查记录.md) · [原文索引](./index.json) · [离线工具](../../../../scripts/prepare-dms-evidence.js)

静态GET 55次。浏览器先打开/dms/index.html出现无效目标提示，再导航已登记业务路由/dms/modelManagement/list，最终跳转/module-login/login。没有填写或提交登录，没有取得业务页面、Network或新业务截图。浏览器页面可能自动发初始化请求，未抓包所以不声明总业务请求为零。新增保存截图0张。

各资源的原获取时间、原件字节数及SHA-256和片段摘要分别登记；偏移按UTF-16 code unit左闭右开。shared组保留2026-10-26原获取时间；不能改成当日新抓取。--verify只比对本地原件，不访问网络。

| 证据ID | 相对资源 | 获取UTC | 片段数 |
|---|---|---|---|
| DMS-SRC-MODEL-API | /dms/static/js/api-modelManagement-modelManagement.93830e40.js | 2026-10-27T03:03:40.914Z | 1 |
| DMS-SRC-PROPERTY-API | /dms/static/js/api-configure-modelPro.b5bbde36.js | 2026-10-27T03:03:40.885Z | 1 |
| DMS-SRC-ENV-API | /dms/static/js/api-configure-devEnvironment.9cc02efa.js | 2026-10-27T03:03:40.870Z | 1 |
| DMS-SRC-MTRL-API | /dms/static/js/api-materialization-materialization.371a1ecf.js | 2026-10-27T03:03:40.886Z | 1 |
| DMS-SRC-ANALYSIS-API | /dms/static/js/api-moduleName-modelAnalysis.f8ddcb2a.js | 2026-10-27T03:03:40.915Z | 1 |
| DMS-SRC-STAT-API | /dms/static/js/api-statistics.02fcd644.js | 2026-10-27T03:03:40.943Z | 1 |
| DMS-SRC-STANDARD-API | /dms/static/js/api-moduleName-stdLibrary.f36f0143.js | 2026-10-27T03:03:40.941Z | 1 |
| DMS-SRC-DESIGN-API | /dms/static/js/api-modelManagement-design.ec0ebb15.js | 2026-10-27T03:03:40.917Z | 1 |
| DMS-SRC-MODEL | /dms/static/js/views-modelManagement-list.d75803ff.js | 2026-10-27T03:03:41.244Z | 2 |
| DMS-SRC-PROPERTY | /dms/static/js/views-configure-modelPro-list.83a0c4b4.js | 2026-10-27T03:03:40.985Z | 2 |
| DMS-SRC-ENV | /dms/static/js/views-configure-devEnvironment-list.35c9dda9.js | 2026-10-27T03:03:40.974Z | 1 |
| DMS-SRC-MTRL | /dms/static/js/views-materialization-list.78a23fc2.js | 2026-10-27T03:03:41.022Z | 1 |
| DMS-SRC-HISTORY | /dms/static/js/views-materialization-historyList.ba43a752.js | 2026-10-27T03:03:40.995Z | 2 |
| DMS-SRC-PHYSICS | /dms/static/js/views-modelManagement-design-physics.c51f0642.js | 2026-10-27T03:03:41.208Z | 3 |
| DMS-SRC-ANALYSIS | /dms/static/js/views-modelAnalysis-list.43ceb5d5.js | 2026-10-27T03:03:41.071Z | 2 |
| DMS-SRC-VERSION | /dms/static/js/views-modelManagement-version-list.bc5b5d26.js | 2026-10-27T03:03:41.240Z | 1 |
| DMS-SRC-IMPORT | /dms/static/js/views-modelManagement-design-importTable.86e3563c.js | 2026-10-27T03:03:41.206Z | 2 |
| DMS-SRC-STAT | /dms/static/js/views-statistics-components-modelStatistics.c8273d59.js | 2026-10-27T03:03:41.243Z | 1 |
| DMS-SRC-STANDARD | /dms/static/js/views-statistics-components-stdStatistics.3e78ef2b.js | 2026-10-27T03:03:41.304Z | 1 |
| DMS-SRC-APP | /dms/static/js/app.83aa347e.js | 2026-10-27T03:03:41.419Z | 4 |
| DMS-SRC-REQUEST | /static/js/app.7ec981a3.js | 2026-10-26T06:07:41.824383+00:00 | 3 |
| DMS-SRC-BASE | /serviceConfig.base.js | 2026-10-26T06:07:41.425372+00:00 | 1 |
| DMS-SRC-CONFIG | /serviceConfig.prod.js | 2026-10-26T06:07:41.447650+00:00 | 3 |

| 历史截图及元素 | 原采样UTC | 相对路由 |
|---|---|---|
| [H-DMS-001图](../live-recheck-20261022/H-DMS-001.png) / [元素](../live-recheck-20261022/H-DMS-001.json) | 2026-10-22T12:14:24.799Z | /dms/modelManagement/list |
| [H-DMS-002图](../live-recheck-20261022/H-DMS-002.png) / [元素](../live-recheck-20261022/H-DMS-002.json) | 2026-10-22T12:14:33.176Z | /dms/materialization/list |
| [H-DMS-003图](../live-recheck-20261022/H-DMS-003.png) / [元素](../live-recheck-20261022/H-DMS-003.json) | 2026-10-22T12:14:40.318Z | /dms/modelAnalysis/list |
| [H-DMS-004图](../live-recheck-20261022/H-DMS-004.png) / [元素](../live-recheck-20261022/H-DMS-004.json) | 2026-10-22T12:14:47.150Z | /dms/statistics/list |
| [H-DMS-005图](../live-recheck-20261022/H-DMS-005.png) / [元素](../live-recheck-20261022/H-DMS-005.json) | 2026-10-22T12:14:51.073Z | /dms/configure/devEnvironment/list |
| [H-DMS-006图](../live-recheck-20261022/H-DMS-006.png) / [元素](../live-recheck-20261022/H-DMS-006.json) | 2026-10-22T12:14:53.654Z | /dms/configure/modelPro/list |
| [H-DMS-006-op1图](../live-recheck-20261022/H-DMS-006-op1.png) / [元素](../live-recheck-20261022/H-DMS-006-op1.json) | 2026-10-22T12:14:56.462Z | /dms/configure/modelPro/list |
| [H-DMS-006-op1-options0图](../live-recheck-20261022/H-DMS-006-op1-options0.png) / [元素](../live-recheck-20261022/H-DMS-006-op1-options0.json) | 2026-10-22T12:14:57.492Z | /dms/configure/modelPro/list |
| [H-DMS-006-op1-options1图](../live-recheck-20261022/H-DMS-006-op1-options1.png) / [元素](../live-recheck-20261022/H-DMS-006-op1-options1.json) | 2026-10-22T12:14:58.743Z | /dms/configure/modelPro/list |
| [H-DMS-006-op1-options2图](../live-recheck-20261022/H-DMS-006-op1-options2.png) / [元素](../live-recheck-20261022/H-DMS-006-op1-options2.json) | 2026-10-22T12:14:59.801Z | /dms/configure/modelPro/list |

历史图均1500×1000。模型列表有表头、总数1但行体空白；物化页正文处于加载态，不能当正常空结果。分析图仅标准分析页签；统计首屏仅部分图表，属性弹窗首屏仅六个字段，前后置字段表由DOM和静态模板补充，未取得滚动后完整画面。其他页签、维护/物化/画布的布局仅有组件定义。

分发限获授权项目成员；原历史材料可能含业务样本，不公开演示。前端调用定义不证明服务端鉴权、事务、引用保护、成功状态或物理数据库结果；应用和非功能验收全部未执行。
