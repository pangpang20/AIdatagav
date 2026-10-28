# 数据标准检测静态源码证据

[需求说明](../../27-数据标准检测/需求说明.md) · [子页面细化](../../27-数据标准检测/子页面与操作细化.md) · [核查记录](../../27-数据标准检测/核查记录.md) · [来源片段与摘要](./index.json) · [离线校验器](../../../../scripts/prepare-dsts-evidence.js)

历史生成的索引记录22项公开静态资源；当前仅能复核其中21项源码资源和27个片段。原始receipt及request-scope账本未保留，无法独立确认HTTP失败数或收集器是否发出其它请求；两项均保持未知，未记录为0。不运行下载资源。浏览器入口最终重定向登录，未进入业务页面、未取新截图、未发送业务请求。

历史截图/页面元素JSON仍在live-recheck-20261022目录。本索引只含定位相关的源码片段，避免整包入库。每段记录原始资源SHA-256、提取内容SHA-256、UTF-16 code-unit左闭右开偏移及获取时间。原始bundle和receipt未随索引保存，且当前不可用；本次只能复核片段哈希与偏移，不能重新核对完整资源SHA。请求范围账本需包含总请求、静态GET、失败和收集器业务请求计数；缺少时对应值必须未知。

公共请求/配置片段取自2026-10-26的静态采样，保留组别与各自获取时间；不同构建的共同路径尚未做生产部署验证。静态API参数是调用端观察，不等于后端契约。

| 证据ID | 静态资源路径 | 组 | 片段数 | 获取时间UTC |
|---|---|---|---:|---|
| DSTS-SRC-API-PLAN | /dsts/static/js/api-standard-test-plan.2c6e5a54.js | own | 1 | 2026-10-28T01:32:50.273Z |
| DSTS-SRC-API-TEST | /dsts/static/js/api-standard-test-test.3552cc1d.js | own | 1 | 2026-10-28T01:32:50.311Z |
| DSTS-SRC-API-COMMON | /dsts/static/js/api-standard-test-common.91d9c0fb.js | own | 1 | 2026-10-28T01:32:50.143Z |
| DSTS-SRC-API-REPORT | /dsts/static/js/api-standard-report-list.781eec9a.js | own | 1 | 2026-10-28T01:32:50.155Z |
| DSTS-SRC-API-EVALUATE | /dsts/static/js/api-evaluate-task.c755dec2.js | own | 1 | 2026-10-28T01:32:50.095Z |
| DSTS-SRC-CONSTANTS | /dsts/static/js/api-serviceConstant.8c1c9b71.js | own | 1 | 2026-10-28T01:32:50.140Z |
| DSTS-SRC-PLAN-LIST | /dsts/static/js/views-standard-plan-list.9c7935c0.js | own | 1 | 2026-10-28T01:32:50.515Z |
| DSTS-SRC-PLAN-DETAIL | /dsts/static/js/views-standard-plan-detail.d094848e.js | own | 1 | 2026-10-28T01:32:50.517Z |
| DSTS-SRC-TEST-LIST | /dsts/static/js/views-standard-test-listPage.8f3a75e2.js | own | 1 | 2026-10-28T01:32:50.821Z |
| DSTS-SRC-TEST-DETAIL | /dsts/static/js/views-standard-test-detail.f724d612.js | own | 3 | 2026-10-28T01:32:50.811Z |
| DSTS-SRC-REPORT-LIST | /dsts/static/js/views-standard-report-list.aacc2be0.js | own | 1 | 2026-10-28T01:32:50.673Z |
| DSTS-SRC-REPORT-HISTORY | /dsts/static/js/views-standard-report-components-historyDialog.b48dd19f.js | own | 1 | 2026-10-28T01:32:50.615Z |
| DSTS-SRC-REPORT-LOG | /dsts/static/js/views-standard-report-components-logDialog.3919693b.js | own | 1 | 2026-10-28T01:32:50.654Z |
| DSTS-SRC-REPORT-ASSOCIATE | /dsts/static/js/views-standard-report-components-openAssociateDialog.4f83f949.js | own | 1 | 2026-10-28T01:32:50.665Z |
| DSTS-SRC-REPORT-UTILS | /dsts/static/js/views-standard-report-utils.098efa11.js | own | 1 | 2026-10-28T01:32:50.770Z |
| DSTS-SRC-EVALUATE | /dsts/static/js/views-evaluate-taskPage-list.11254165.js | own | 1 | 2026-10-28T01:32:50.511Z |
| DSTS-SRC-ENUM | /dsts/static/js/assets-js-enumConfig.8ac950a6.js | own | 1 | 2026-10-28T01:32:50.338Z |
| DSTS-SRC-APP-BRIDGE | /dsts/static/js/app.f4e0fc58.js | own | 2 | 2026-10-28T01:32:50.914Z |
| DSTS-SRC-REQUEST | /static/js/app.7ec981a3.js | shared | 3 | 2026-10-26T06:07:41.824383+00:00 |
| DSTS-SRC-BASE | /serviceConfig.base.js | shared | 1 | 2026-10-26T06:07:41.425372+00:00 |
| DSTS-SRC-CONFIG | /serviceConfig.prod.js | shared | 2 | 2026-10-26T06:07:41.447650+00:00 |

所有功能及NFR应用验收、写入、执行、附件下载、性能压测和安全测试均未执行。--verify离线对照原始下载文件，不发网络请求。
