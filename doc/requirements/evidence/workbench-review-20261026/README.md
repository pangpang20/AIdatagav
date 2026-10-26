# 工作台专项证据索引

复核日期：2026-10-26；静态片段提取UTC：2026-10-26T06:37:14.714Z。仅公开静态资源GET后离线读取，业务接口请求0次，未执行下载代码；应用验收全部未执行。

[静态片段与摘要](./index.json) · [工作台业务规格](../../02-工作台/需求说明.md) · [核查记录](../../02-工作台/核查记录.md) · [离线提取及核对工具](../../../../scripts/prepare-workbench-evidence.js)

限获授权项目成员使用。必要字段名、相对服务路径与静态片段进入仓库；整包、整配置及获取回执留本机临时目录。没有发布部署origin、真实凭据或新增用户内容。公共客户端与前轮登录取证的根应用资源SHA-256相同，但本次仍独立登记获取时间及摘要。

| 证据编号 | 相对资源路径 | 获取UTC时间 | 片段数 |
|---|---|---|---|
| HOME-SRC-STAGE | /dop/static/js/views-stage.d28b633e.js | 2026-10-26T06:04:50.578714+00:00 | 8 |
| HOME-SRC-API | /dop/static/js/api-stage.4cfc4aa2.js | 2026-10-26T06:04:50.505652+00:00 | 1 |
| HOME-SRC-SCENE-API | /dop/static/js/api-stageManage.217c0f48.js | 2026-10-26T06:04:50.509016+00:00 | 2 |
| HOME-SRC-DIALOG | /dop/static/js/components-workbench-stageWorkflowDialog.1025a830.js | 2026-10-26T06:04:50.514277+00:00 | 5 |
| HOME-SRC-HISTORY | /dop/static/js/components-workbench-processInfoComponent.5331b22c.js | 2026-10-26T06:04:50.774862+00:00 | 1 |
| HOME-SRC-TYPES | /dop/static/js/components-workbench-workflowTypes.1b4e56e2.js | 2026-10-26T06:04:50.774862+00:00 | 1 |
| HOME-SRC-DOP | /dop/static/js/app.73911832.js | 2026-10-26T06:03:43.890148+00:00 | 6 |
| HOME-SRC-SHELL | /static/js/app.7ec981a3.js | 2026-10-26T06:07:41.824383+00:00 | 10 |
| HOME-SRC-BASE | /serviceConfig.base.js | 2026-10-26T06:07:41.425372+00:00 | 1 |
| HOME-SRC-CONFIG | /serviceConfig.prod.js | 2026-10-26T06:07:41.447650+00:00 | 2 |

偏移为UTF-16 code unit，左闭右开；原包SHA-256与片段SHA-256各自记录。原始文本未执行；没有把写接口定义当成已调用。配置仅保留/back前缀、空MODULE_URL_PREFIX和202业务错误处理状态。

| 历史截图/元素 | 原采样时间 | 页面、用途及限制 |
|---|---|---|
| [E004截图](../E004-portal-ready.png) / [元素](../E004-portal-ready.json) | 2026-10-22T02:11:57.246Z | /dop/stage；1440×1000首屏、左右分区与业务样本；DOM混有隐藏视频控件，不能据此给工作台添加视频表单。 |
| [R001截图](../live-recheck-20261022/R001-workbench.png) / [元素](../live-recheck-20261022/R001-workbench.json) | 2026-10-22T09:34:23.272Z | /dop/stage；1500×1000完整工作台；本次复看原图，没有新增页面操作。 |
| [E005导航](../E005-demand-nav.png) / [元素](../E005-demand-nav.json) | 2026-10-22T02:13:05.554Z | 需求管理展开样本；名称与描述是当时配置，不是固定授权矩阵。 |
| [E021](../E021-development-nav.png)、[E037](../E037-unification-nav.png)、[E043](../E043-assets-nav.png)、[E052](../E052-evaluation-nav.png)、[E059](../E059-backend-nav.png) | 各原始JSON登记时间，均为2026-10-22 | 保留登记的五组导航图；部分JSON文字历史处理后恢复不能反推，本次不把其其他模块控件搬入工作台字段表，具体限制见各JSON。 |

工单详情弹窗以本次独立stageWorkflowDialog静态定义为依据；[工单页三标签历史材料](../../06-我的工单/子页面与操作细化.md)仅作关联参考，不能当作本工作台弹窗的本次实拍。尚缺的新弹窗/条件分支截图在核查记录中登记。

本工具--verify只比对本机原包及片段，不发HTTP请求。重新提取会生成新的inspectedAt，不修改任何历史截图或原采样时间。
