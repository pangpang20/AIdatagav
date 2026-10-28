# 后台消息工作流与审计必要源码片段

2026-10-28取得公开静态资源，仅GET静态文件，未执行下载代码或业务API。每份原始资源的实际获取时间、相对路径、字节数与SHA-256，以及必要片段的UTF-16偏移、摘要见index.json。离线提取器要求相同原始字节和receipt.json，摘要不符即拒绝。

公共宿主链路参见[后台宿主](../bas-review-20261028/parent.txt)、[宿主启动](../bas-review-20261028/boot.txt)与[历史公共传输](../auth-review-20261026/transport.json)。FLOW-PARENT证明flow模块接收宿主requestInstance；不能证明当前配置与后端安全实现。

| ID | 来源相对资源 | 必要原文 |
|---|---|---|
| BWM-SRC-FLOW-PARENT | /module-flow/static/js/app.373adf81.js | [flow-parent.txt](./flow-parent.txt) |
| BWM-SRC-MODEL-READ | /module-flow/static/js/views-workflow-flowDesign.8a60a7d9.js | [model-read.txt](./model-read.txt) |
| BWM-SRC-NODE-READ | /module-flow/static/js/views-workflow-flowDesign.8a60a7d9.js | [node-read.txt](./node-read.txt) |
| BWM-SRC-MODEL-SAVE | /module-flow/static/js/views-workflow-flowDesign.8a60a7d9.js | [model-save.txt](./model-save.txt) |
| BWM-SRC-API-common | /module-flow/static/js/api-common.6af3a08d.js | [api-common.txt](./api-common.txt) |
| BWM-SRC-API-log-login | /module-common/static/js/api-log-login.e9af1d3b.js | [api-log-login.txt](./api-log-login.txt) |
| BWM-SRC-API-log-opt | /module-common/static/js/api-log-opt.33022678.js | [api-log-opt.txt](./api-log-opt.txt) |
| BWM-SRC-API-monitor-alarm | /module-common/static/js/api-monitor-alarm.bc5652d3.js | [api-monitor-alarm.txt](./api-monitor-alarm.txt) |
| BWM-SRC-API-news-announcemen | /module-common/static/js/api-news-announcemen.d968236a.js | [api-news-announcemen.txt](./api-news-announcemen.txt) |
| BWM-SRC-API-news-channel | /module-common/static/js/api-news-channel.5d399fe2.js | [api-news-channel.txt](./api-news-channel.txt) |
| BWM-SRC-API-news-myNews | /module-common/static/js/api-news-myNews.a4804067.js | [api-news-mynews.txt](./api-news-mynews.txt) |
| BWM-SRC-API-news-newsManage | /module-common/static/js/api-news-newsManage.642792ee.js | [api-news-newsmanage.txt](./api-news-newsmanage.txt) |
| BWM-SRC-API-news-newsType | /module-common/static/js/api-news-newsType.8fad95cc.js | [api-news-newstype.txt](./api-news-newstype.txt) |
| BWM-SRC-API-news-templateManage | /module-common/static/js/api-news-templateManage.2f8f4d7f.js | [api-news-templatemanage.txt](./api-news-templatemanage.txt) |
| BWM-SRC-API-serviceConstant | /module-flow/static/js/api-serviceConstant.486664dd.js | [api-serviceconstant.txt](./api-serviceconstant.txt) |
| BWM-SRC-API-workbench-copy2MeList | /module-flow/static/js/api-workbench-copy2MeList.2747ffc5.js | [api-workbench-copy2melist.txt](./api-workbench-copy2melist.txt) |
| BWM-SRC-API-workbench-myWorkflow | /module-flow/static/js/api-workbench-myWorkflow.90cb23a7.js | [api-workbench-myworkflow.txt](./api-workbench-myworkflow.txt) |
| BWM-SRC-API-workbench-workflowFinished | /module-flow/static/js/api-workbench-workflowFinished.87c6e914.js | [api-workbench-workflowfinished.txt](./api-workbench-workflowfinished.txt) |
| BWM-SRC-API-workbench-workflowReview | /module-flow/static/js/api-workbench-workflowReview.0f3ac825.js | [api-workbench-workflowreview.txt](./api-workbench-workflowreview.txt) |
| BWM-SRC-API-workbench-workorderApply | /module-flow/static/js/api-workbench-workorderApply.0c8a05b2.js | [api-workbench-workorderapply.txt](./api-workbench-workorderapply.txt) |
| BWM-SRC-API-workflow-businessRegistration | /module-flow/static/js/api-workflow-businessRegistration.11874f57.js | [api-workflow-businessregistration.txt](./api-workflow-businessregistration.txt) |
| BWM-SRC-API-workflow-flowDesign | /module-flow/static/js/api-workflow-flowDesign.ab35fb40.js | [api-workflow-flowdesign.txt](./api-workflow-flowdesign.txt) |
| BWM-SRC-API-workflow-formDesign | /module-flow/static/js/api-workflow-formDesign.7c2d3a59.js | [api-workflow-formdesign.txt](./api-workflow-formdesign.txt) |
| BWM-SRC-API-workflow-processModel | /module-flow/static/js/api-workflow-processModel.08f98cde.js | [api-workflow-processmodel.txt](./api-workflow-processmodel.txt) |
| BWM-SRC-API-workflow-processMonitoring | /module-flow/static/js/api-workflow-processMonitoring.dcb75d62.js | [api-workflow-processmonitoring.txt](./api-workflow-processmonitoring.txt) |
| BWM-SRC-API-workflow-versionManagement | /module-flow/static/js/api-workflow-versionManagement.f4a953d8.js | [api-workflow-versionmanagement.txt](./api-workflow-versionmanagement.txt) |
| BWM-SRC-VIEW-01 | /module-common/static/js/views-log-login-list.27d029be.js | [view-01.txt](./view-01.txt) |
| BWM-SRC-VIEW-02 | /module-common/static/js/views-log-operation-list.73adc1b1.js | [view-02.txt](./view-02.txt) |
| BWM-SRC-VIEW-03 | /module-common/static/js/views-monitor-alarmList.c3ed0be7.js | [view-03.txt](./view-03.txt) |
| BWM-SRC-VIEW-04 | /module-common/static/js/views-monitor-alarmEdit.478d6dfc.js | [view-04.txt](./view-04.txt) |
| BWM-SRC-VIEW-05 | /module-common/static/js/views-news-announcementEdit.96d1c2ef.js | [view-05.txt](./view-05.txt) |
| BWM-SRC-VIEW-06 | /module-common/static/js/views-news-announcementList.e0982317.js | [view-06.txt](./view-06.txt) |
| BWM-SRC-VIEW-07 | /module-common/static/js/views-news-announcementDetails.0edbabb6.js | [view-07.txt](./view-07.txt) |
| BWM-SRC-VIEW-08 | /module-common/static/js/views-news-channelEdit.034fdfa6.js | [view-08.txt](./view-08.txt) |
| BWM-SRC-VIEW-09 | /module-common/static/js/views-news-channelList.71629e02.js | [view-09.txt](./view-09.txt) |
| BWM-SRC-VIEW-10 | /module-common/static/js/views-news-myNewsEdit.fcf56b1f.js | [view-10.txt](./view-10.txt) |
| BWM-SRC-VIEW-11 | /module-common/static/js/views-news-myNewsList.dd0afe9f.js | [view-11.txt](./view-11.txt) |
| BWM-SRC-VIEW-12 | /module-common/static/js/views-news-newsManage.cf822e77.js | [view-12.txt](./view-12.txt) |
| BWM-SRC-VIEW-13 | /module-common/static/js/views-news-newsManageEdit.ecc10f6e.js | [view-13.txt](./view-13.txt) |
| BWM-SRC-VIEW-14 | /module-common/static/js/views-news-newsTypeEdit.8a2cb1ed.js | [view-14.txt](./view-14.txt) |
| BWM-SRC-VIEW-15 | /module-common/static/js/views-news-templateEdit.ce7db25a.js | [view-15.txt](./view-15.txt) |
| BWM-SRC-VIEW-16 | /module-common/static/js/views-news-templateList.720c6274.js | [view-16.txt](./view-16.txt) |
| BWM-SRC-VIEW-17 | /module-common/static/js/views-news-sendTestMessage.f55914df.js | [view-17.txt](./view-17.txt) |
| BWM-SRC-VIEW-18 | /module-flow/static/js/views-workflow-processModel.6f58e2e1.js | [view-18.txt](./view-18.txt) |
| BWM-SRC-VIEW-19 | /module-flow/static/js/views-workflow-versionManagement.7cd1b76b.js | [view-19.txt](./view-19.txt) |
| BWM-SRC-VIEW-20 | /module-flow/static/js/views-workflow-processMonitoring.5f4236ba.js | [view-20.txt](./view-20.txt) |
| BWM-SRC-VIEW-21 | /module-flow/static/js/views-workflow-businessRegistrationEdit.dffa6fcc.js | [view-21.txt](./view-21.txt) |
| BWM-SRC-VIEW-22 | /module-flow/static/js/views-formDesign-formList.f7a0fa53.js | [view-22.txt](./view-22.txt) |
| BWM-SRC-VIEW-23 | /module-flow/static/js/views-workbench-myWorkflowAndCopy2MeEdit.a1eb9c35.js | [view-23.txt](./view-23.txt) |
| BWM-SRC-VIEW-24 | /module-flow/static/js/views-workbench-workflowFinishedAndReviewEdit.48d06660.js | [view-24.txt](./view-24.txt) |
| BWM-SRC-VIEW-25 | /module-flow/static/js/views-workbench-workorderApply.3ae35a5c.js | [view-25.txt](./view-25.txt) |
| BWM-SRC-VIEW-26 | /module-flow/static/js/views-workbench-myWorkflowList.9af49c84.js | [view-26.txt](./view-26.txt) |
| BWM-SRC-VIEW-27 | /module-flow/static/js/views-workbench-workflowReviewList.29250a72.js | [view-27.txt](./view-27.txt) |
| BWM-SRC-VIEW-28 | /module-flow/static/js/views-workbench-workflowFinishedList.8f7e1223.js | [view-28.txt](./view-28.txt) |
| BWM-SRC-VIEW-29 | /module-flow/static/js/views-workbench-copy2MeList.99457ef5.js | [view-29.txt](./view-29.txt) |

[核查记录](../../38-后台消息工作流与审计/核查记录.md) · [历史页面及DOM](../live-recheck-20261022/README.md)
