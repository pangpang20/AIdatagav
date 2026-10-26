# 我的工单专项证据索引

静态片段复核UTC：2026-10-26T14:07:50.380Z。公开静态GET 16次，含1份无效入口采样；业务API 0次、浏览器操作0次、新截图0张。应用验收全部未执行。

[业务规格](../../06-我的工单/需求说明.md) · [子页面与操作](../../06-我的工单/子页面与操作细化.md) · [核查记录](../../06-我的工单/核查记录.md) · [必要原文及摘要](./index.json) · [离线提取工具](../../../../scripts/prepare-wo-evidence.js)

分发限制：限获授权项目成员。历史图片/元素含业务资料、参与人员及时间，不作公开演示材料。只提交相对路径、必要控件/请求定义及摘要，不含凭据值。原包和获取回执留本机临时调查目录，不执行原包。

| 证据组 | 相对资源路径 | 原获取UTC | 片段数 |
|---|---|---|---|
| WO-SRC-TODO | /workorder/static/js/views-workbench-workflowReviewList.f3187f93.js | 2026-10-26T13:32:35.678Z | 1 |
| WO-SRC-DONE | /workorder/static/js/views-workbench-workflowFinishedList.c481039c.js | 2026-10-26T13:32:35.714Z | 1 |
| WO-SRC-MINE | /workorder/static/js/views-workbench-myWorkflowList.6961a07f.js | 2026-10-26T13:32:35.757Z | 1 |
| WO-SRC-TASK | /workorder/static/js/views-workbench-workflowFinishedAndReviewEdit.32134d8d.js | 2026-10-26T13:32:35.824Z | 1 |
| WO-SRC-DETAIL | /workorder/static/js/views-workbench-myWorkflowAndCopy2MeEdit.19e5767c.js | 2026-10-26T13:32:35.860Z | 1 |
| WO-SRC-HISTORY | /workorder/static/js/components-workbench-processInfoComponent.b060476e.js | 2026-10-26T13:32:35.990Z | 1 |
| WO-SRC-COMMON-API | /workorder/static/js/api-common.cfc92f1a.js | 2026-10-26T13:32:35.501Z | 1 |
| WO-SRC-MINE-API | /workorder/static/js/api-workbench-myWorkflow.bdf1c002.js | 2026-10-26T13:32:35.561Z | 1 |
| WO-SRC-DONE-API | /workorder/static/js/api-workbench-workflowFinished.4352a8f3.js | 2026-10-26T13:32:35.600Z | 1 |
| WO-SRC-TODO-API | /workorder/static/js/api-workbench-workflowReview.a147a8a2.js | 2026-10-26T13:32:35.640Z | 1 |
| WO-SRC-TYPES | /workorder/static/js/views-workbench-workflowTypes.64ad498a.js | 2026-10-26T13:32:35.919Z | 1 |
| WO-SRC-ENTRY | /workorder/index.html | 2026-10-26T13:31:46.207Z | 1 |
| WO-SRC-GATEWAY | /workorder/static/js/app.6c843d58.js | 2026-10-26T13:31:46.412Z | 1 |
| WO-SRC-ROUTES | /workorder/static/js/app.6c843d58.js | 2026-10-26T13:31:46.412Z | 5 |
| WO-SRC-LANGUAGE | /workorder/static/js/app.6c843d58.js | 2026-10-26T13:31:46.412Z | 7 |
| WO-SRC-LIST-MIXINS | /workorder/static/js/chunk-@audaque/vue-utils.d722f2bd.js | 2026-10-26T13:40:10.392Z | 2 |
| WO-SRC-PAGINATION | /workorder/static/js/chunk-@audaque/vue-components.6e70d300.js | 2026-10-26T13:40:10.342Z | 1 |
| WO-SRC-CONTROLS | /workorder/static/js/chunk-@audaque/vue-components.6e70d300.js | 2026-10-26T13:40:10.342Z | 2 |
| WO-SRC-SHELL-REQUEST | /static/js/app.7ec981a3.js | 2026-10-26T06:07:41.824383+00:00 | 3 |
| WO-SRC-BASE | /serviceConfig.base.js | 2026-10-26T06:07:41.425372+00:00 | 1 |
| WO-SRC-CONFIG | /serviceConfig.prod.js | 2026-10-26T06:07:41.447650+00:00 | 3 |

index.json保存原包字节数/SHA-256、原获取时间、UTF-16 code unit左闭右开偏移、片段原文及SHA-256。sourceGroup=shared的公共文件复用既有原件与原回执；选择组不等于请求次数。--verify仅本地比对，不发HTTP。

无效采样：/workorder/返回父壳HTML，1505字节；其摘要与时间单独登记在invalidSamples，不能当作工单页面。正确入口/workorder/index.html以及独立workorder资源是正文调用链依据。

| 历史截图/元素 | 原采样UTC | 相对路由 | 用途与限制 |
|---|---|---|---|
| [H-WO-001截图](../live-recheck-20261022/H-WO-001.png) / [元素](../live-recheck-20261022/H-WO-001.json) | 2026-10-22T11:49:38.286Z | /workorder/workbench/workflowReviewList | 历史视口及样本，只证明当时可见内容 |
| [H-WO-002截图](../live-recheck-20261022/H-WO-002.png) / [元素](../live-recheck-20261022/H-WO-002.json) | 2026-10-22T11:49:50.275Z | /workorder/workbench/workflowFinishedList | 导航高亮已办，正文仍为待办；仅作冲突证据，不用于已办正常布局 |
| [H-WO-003截图](../live-recheck-20261022/H-WO-003.png) / [元素](../live-recheck-20261022/H-WO-003.json) | 2026-10-22T11:49:55.324Z | /workorder/workbench/myWorkflowList | 历史视口及样本，只证明当时可见内容 |
| [H-WO-003-op1截图](../live-recheck-20261022/H-WO-003-op1.png) / [元素](../live-recheck-20261022/H-WO-003-op1.json) | 2026-10-22T11:49:59.749Z | /workorder/workbench/myWorkflowAndCopy2MeEdit | 历史视口及样本，只证明当时可见内容 |
| [U-WO-detail-basic截图](../live-recheck-20261022/U-WO-detail-basic.png) / [元素](../live-recheck-20261022/U-WO-detail-basic.json) | 2026-10-22T12:08:53.721Z | /workorder/workbench/myWorkflowAndCopy2MeEdit | 历史视口及样本，只证明当时可见内容 |
| [U-WO-detail-form截图](../live-recheck-20261022/U-WO-detail-form.png) / [元素](../live-recheck-20261022/U-WO-detail-form.json) | 2026-10-22T12:11:06.636Z | /workorder/workbench/myWorkflowAndCopy2MeEdit | 仅空态，不能代表有字段表单或证明业务不存在 |
| [U-WO-detail-history截图](../live-recheck-20261022/U-WO-detail-history.png) / [元素](../live-recheck-20261022/U-WO-detail-history.json) | 2026-10-22T12:11:12.177Z | /workorder/workbench/myWorkflowAndCopy2MeEdit | 流程图和8列表格；图内个别字形方框不是目标样式 |

以上H/U样本均1500×1000。本次逐张复看待办、已办冲突、本人列表及本人三页签；详情首入H图与基本页U图互相补证。没有待办办理表单、草稿编辑、发起/删除/催办模态的新实拍，依据实际组件定义补充字段和控件，补图任务见核查记录。

主文档原始来源还保留[C040](../C040-original-content.png)、[E065](../E065-workorders.png)及[E101](../E101-current-complete.png)，各原时间见对应JSON及[全证据索引](../../证据索引.md)。这些不计为本次新浏览器操作。
