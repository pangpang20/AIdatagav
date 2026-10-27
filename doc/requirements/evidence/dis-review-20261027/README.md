# 数据集成采集专项证据

复核日期2026-10-27。新浏览器会话从`/dis/home`重定向`/module-login/login`，没有登录后现场操作或新截图。公开静态资源GET共81次（index、app、API及本模块Vue分块）；原件与获取回执仅留本机临时目录。提取器只读本地文本，不发网络请求、不执行下载代码。

[原文片段及原件摘要](./index.json) · [核查记录](../../08-数据集成采集/核查记录.md) · [主规格](../../08-数据集成采集/需求说明.md) · [提取工具](../../../../scripts/prepare-dis-evidence.js)

公共父客户端、运行配置、通用校验及分页：[数据源专项原文](../ds-review-20261026/index.json)、[工作台公共请求原文](../workbench-review-20261026/index.json)。这些是2026-10-26采样；本次重新阅读，不更改原时间。调用路径按默认/back前缀，实际部署覆盖及后端响应需隔离联调。

历史截图和DOM来自[2026-10-22索引](../live-recheck-20261022/README.md)。各功能逐项链接原图/原JSON，包含原time、相对route和视口；不是本次重新截图。受控业务写入、权限、安全、性能和恢复验收全部未执行。

| 证据ID | 相对资源路径 | 获取UTC时间 | 片段数 |
|---|---|---|---|
| DIS-SRC-TABLE-FORM | /dis/static/js/views-taskManagement-dataAcquisition-edit.6bfb4354.js | 2026-10-27T03:02:19.242474+00:00 | 22 |
| DIS-SRC-TABLE-LIST | /dis/static/js/views-taskManagement-dataAcquisition-list.27402d6a.js | 2026-10-27T03:02:19.209177+00:00 | 18 |
| DIS-SRC-TABLE-INPUT | /dis/static/js/views-taskManagement-dataAcquisition-components-inputConfig-libraryTable~views-taskManagement-dataAc~12295ea4.2bad80d1.js | 2026-10-27T03:02:18.930070+00:00 | 11 |
| DIS-SRC-TABLE-OUTPUT | /dis/static/js/views-taskManagement-dataAcquisition-components-outputConfig-libraryTable.9b3938ad.js | 2026-10-27T03:02:18.961036+00:00 | 14 |
| DIS-SRC-CSV-OUTPUT | /dis/static/js/views-taskManagement-dataAcquisition-components-outputConfig-csv.1ebcd4dc.js | 2026-10-27T03:02:18.977945+00:00 | 7 |
| DIS-SRC-DB-FORM | /dis/static/js/views-taskManagement-libraryMigration-edit.15363527.js | 2026-10-27T03:02:19.980358+00:00 | 23 |
| DIS-SRC-DB-INPUT | /dis/static/js/views-taskManagement-libraryMigration-components-inputConfig-file.e4a85564.js | 2026-10-27T03:02:19.750253+00:00 | 5 |
| DIS-SRC-DB-OUTPUT | /dis/static/js/views-taskManagement-libraryMigration-components-outputConfig-file.7f0a3b24.js | 2026-10-27T03:02:19.820979+00:00 | 5 |
| DIS-SRC-DB-LIST | /dis/static/js/views-taskManagement-libraryMigration-list.08b21dfa.js | 2026-10-27T03:02:19.988708+00:00 | 12 |
| DIS-SRC-API-FORM | /dis/static/js/views-taskManagement-apiAndFileCollection-components-apiCollection-edit.f1a95548.js | 2026-10-27T03:02:18.156328+00:00 | 18 |
| DIS-SRC-API-INPUT | /dis/static/js/views-taskManagement-apiAndFileCollection-components-apiCollection-components-inputConfig-api~views-~6796590f.90873e47.js | 2026-10-27T03:02:17.864966+00:00 | 9 |
| DIS-SRC-API-OUTPUT | /dis/static/js/views-taskManagement-apiAndFileCollection-components-apiCollection-components-outputConfig-libraryTable.2bbe6711.js | 2026-10-27T03:02:17.894583+00:00 | 12 |
| DIS-SRC-API-MQ | /dis/static/js/views-taskManagement-apiAndFileCollection-components-apiCollection-components-outputConfig-outMQ~vie~78415a5f.e30ceaf4.js | 2026-10-27T03:02:17.897365+00:00 | 11 |
| DIS-SRC-API-LIST | /dis/static/js/views-taskManagement-apiAndFileCollection-components-apiCollection-list~views-taskManagement-apiAndF~8b4f4985.fe6d1f04.js | 2026-10-27T03:02:18.165738+00:00 | 15 |
| DIS-SRC-PARSE-FORM | /dis/static/js/views-taskManagement-apiAndFileCollection-components-fileCollection-edit.479cf941.js | 2026-10-27T03:02:18.731461+00:00 | 20 |
| DIS-SRC-PARSE-CSV | /dis/static/js/views-taskManagement-apiAndFileCollection-components-fileCollection-components-inputConfig-csv~views~d56058ae.f559d3a2.js | 2026-10-27T03:02:18.476185+00:00 | 9 |
| DIS-SRC-PARSE-EXCEL | /dis/static/js/views-taskManagement-apiAndFileCollection-components-fileCollection-components-inputConfig-excel~vie~abaceb77.1cfca958.js | 2026-10-27T03:02:18.510857+00:00 | 9 |
| DIS-SRC-PARSE-OUTPUT | /dis/static/js/views-taskManagement-apiAndFileCollection-components-fileCollection-components-outputConfig-libraryT~c18d0bc4.b4e12b28.js | 2026-10-27T03:02:18.746067+00:00 | 12 |
| DIS-SRC-PARSE-LIST | /dis/static/js/views-taskManagement-apiAndFileCollection-components-fileCollection-list.38187153.js | 2026-10-27T03:02:18.721124+00:00 | 13 |
| DIS-SRC-FILE-FORM | /dis/static/js/views-taskManagement-fileAcquisition-edit.c169a597.js | 2026-10-27T03:02:19.254939+00:00 | 14 |
| DIS-SRC-FILE-INPUT | /dis/static/js/views-taskManagement-fileAcquisition-components-inputConfig-file.96565037.js | 2026-10-27T03:02:19.246717+00:00 | 6 |
| DIS-SRC-FILE-OUTPUT | /dis/static/js/views-taskManagement-fileAcquisition-components-outputConfig-file.f4a4f17d.js | 2026-10-27T03:02:19.252738+00:00 | 3 |
| DIS-SRC-FILE-LIST | /dis/static/js/views-taskManagement-fileAcquisition-list.c79e3e34.js | 2026-10-27T03:02:19.372594+00:00 | 13 |
| DIS-SRC-REAL-FORM | /dis/static/js/views-taskManagement-realTimeAcquisition-edit.65d1f2d2.js | 2026-10-27T03:02:20.189994+00:00 | 13 |
| DIS-SRC-REAL-INPUT | /dis/static/js/views-taskManagement-realTimeAcquisition-components-inputConfig-inputLibraryTable~views-taskManageme~11e5fc31.8cbcde64.js | 2026-10-27T03:02:19.971951+00:00 | 9 |
| DIS-SRC-REAL-OUTPUT | /dis/static/js/views-taskManagement-realTimeAcquisition-components-outputConfig-outputFile.f11b2546.js | 2026-10-27T03:02:20.049138+00:00 | 13 |
| DIS-SRC-REAL-LIST | /dis/static/js/views-taskManagement-realTimeAcquisition-list.e6f62cb0.js | 2026-10-27T03:02:20.178139+00:00 | 9 |
| DIS-SRC-MQ-FORM | /dis/static/js/views-taskManagement-kafkaAcquisition-edit.59874ee6.js | 2026-10-27T03:02:19.746622+00:00 | 30 |
| DIS-SRC-MQ-INPUT | /dis/static/js/views-taskManagement-kafkaAcquisition-components-inputConfig-inputMQ.9d62ea47.js | 2026-10-27T03:02:19.541788+00:00 | 11 |
| DIS-SRC-MQ-DB | /dis/static/js/views-taskManagement-kafkaAcquisition-components-inputConfig-inputLibraryTable~views-taskManagement-~4f229a7c.7b41bec5.js | 2026-10-27T03:02:19.532355+00:00 | 10 |
| DIS-SRC-MQ-OUTPUT | /dis/static/js/views-taskManagement-kafkaAcquisition-components-outputConfig-outMQ~views-taskManagement-kafkaAcquis~575620da.9d39a8c7.js | 2026-10-27T03:02:19.630628+00:00 | 12 |
| DIS-SRC-MQ-DB-OUTPUT | /dis/static/js/views-taskManagement-kafkaAcquisition-components-outputConfig-outputFile.8371f1cf.js | 2026-10-27T03:02:19.738834+00:00 | 13 |
| DIS-SRC-MQ-LIST | /dis/static/js/views-taskManagement-kafkaAcquisition-list.2e774787.js | 2026-10-27T03:02:19.703275+00:00 | 9 |
| DIS-SRC-HOME | /dis/static/js/views-home-home.d3ea5fc7.js | 2026-10-27T03:02:17.294499+00:00 | 1 |
| DIS-SRC-MONITOR | /dis/static/js/views-taskMonitoring-taskMonitoring-list.a1a9642d.js | 2026-10-27T03:02:20.687943+00:00 | 19 |
| DIS-SRC-ALARM | /dis/static/js/views-taskMonitoring-abnormal-list.a517123b.js | 2026-10-27T03:02:20.394166+00:00 | 8 |
| DIS-SRC-CHECK | /dis/static/js/views-taskMonitoring-dataReconciliation-list.cacb786c.js | 2026-10-27T03:02:20.590973+00:00 | 7 |
| DIS-SRC-CHECK-DETAIL | /dis/static/js/views-taskMonitoring-dataReconciliation-edit.133be99b.js | 2026-10-27T03:02:20.500881+00:00 | 12 |
| DIS-SRC-SUPPLY | /dis/static/js/views-taskMonitoring-repairdata-list.5b9c9226.js | 2026-10-27T03:02:20.703681+00:00 | 9 |
| DIS-SRC-SUPPLY-DETAIL | /dis/static/js/views-taskMonitoring-repairdata-edit.d41b6301.js | 2026-10-27T03:02:20.727969+00:00 | 4 |
| DIS-SRC-TASK-ANALYSIS | /dis/static/js/views-integratedAnalysis-taskAnalysis.0ce7c4c7.js | 2026-10-27T03:02:17.743950+00:00 | 4 |
| DIS-SRC-DATA-ANALYSIS | /dis/static/js/views-integratedAnalysis-dataAnalysis.501a0f6d.js | 2026-10-27T03:02:17.618204+00:00 | 6 |
| DIS-SRC-TABS | /dis/static/js/views-taskManagement-apiAndFileCollection-public.a3a2b01e.js | 2026-10-27T03:02:18.931069+00:00 | 1 |
| DIS-SRC-INTEGRATDANALYSIS-DATAANALYSIS | /dis/static/js/api-integratdAnalysis-dataAnalysis.50c1142f.js | 2026-10-27T03:02:16.794496+00:00 | 1 |
| DIS-SRC-INTEGRATDANALYSIS-TASKANALYSIS | /dis/static/js/api-integratdAnalysis-taskAnalysis.a2e5587e.js | 2026-10-27T03:02:16.804630+00:00 | 1 |
| DIS-SRC-SERVICECONSTANT | /dis/static/js/api-serviceConstant.a579e62f.js | 2026-10-27T03:02:16.792579+00:00 | 1 |
| DIS-SRC-TASKMANAGEMENT-APIACQUISITION | /dis/static/js/api-taskManagement-apiAcquisition.ccd9b1e0.js | 2026-10-27T03:02:16.798269+00:00 | 1 |
| DIS-SRC-TASKMANAGEMENT-DATAACQUISITION | /dis/static/js/api-taskManagement-dataAcquisition.2db4b912.js | 2026-10-27T03:02:16.781866+00:00 | 1 |
| DIS-SRC-TASKMANAGEMENT-FILEACQUISITION | /dis/static/js/api-taskManagement-fileAcquisition.69a4e2a1.js | 2026-10-27T03:02:17.021987+00:00 | 1 |
| DIS-SRC-TASKMANAGEMENT-HOME | /dis/static/js/api-taskManagement-home.57e7d89f.js | 2026-10-27T03:02:17.043560+00:00 | 1 |
| DIS-SRC-TASKMANAGEMENT-LIBRARYMIGRATION | /dis/static/js/api-taskManagement-libraryMigration.40c4b4ae.js | 2026-10-27T03:02:17.051701+00:00 | 1 |
| DIS-SRC-TASKMANAGEMENT-REALTIMEACQUISITION | /dis/static/js/api-taskManagement-realTimeAcquisition.bf9e738a.js | 2026-10-27T03:02:17.048531+00:00 | 1 |
| DIS-SRC-TASKMANAGEMENT-TASKOPERATION | /dis/static/js/api-taskManagement-taskOperation.4d1059c5.js | 2026-10-27T03:02:17.044682+00:00 | 1 |
| DIS-SRC-TASKMONITORING-ABNORMAL | /dis/static/js/api-taskMonitoring-abnormal.43312c27.js | 2026-10-27T03:02:17.276369+00:00 | 1 |
| DIS-SRC-TASKMONITORING-DATARECONCILIATION | /dis/static/js/api-taskMonitoring-datareconciliation.3166b5aa.js | 2026-10-27T03:02:17.296109+00:00 | 1 |
| DIS-SRC-TASKMONITORING-REPAIRDATA | /dis/static/js/api-taskMonitoring-repairdata.950d6308.js | 2026-10-27T03:02:17.298264+00:00 | 1 |
| DIS-SRC-TASKMONITORING-TASKMONITORING | /dis/static/js/api-taskMonitoring-taskMonitoring.790684b5.js | 2026-10-27T03:02:17.300351+00:00 | 1 |
| DIS-SRC-APP | /dis/static/js/app.4c55cf2d.js | 2026-10-27T03:02:20.952240+00:00 | 9 |

偏移按UTF-16 code units左闭右开；原资源和每段原文分别记录SHA-256。索引仅含必要静态片段，不含部署origin、业务凭据或新增业务数据。
