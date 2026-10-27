# 数据服务支撑专项证据

2026-10-27：业务路由跳登录页，未登录、未进入业务页，新增业务截图0张。49次公开静态资源GET后仅离线阅读。提取器业务请求0次；浏览器自动初始化请求未抓包，不能推断整次会话所有请求为0。应用验收全部未执行。

[必要原文与SHA-256](./index.json) · [核查记录](../../16-数据服务支撑/核查记录.md) · [离线工具](../../../../scripts/prepare-gsb-evidence.js)

每个资源保留相对路径、获取UTC、完整字节数/摘要；片段保存UTF-16左闭右开偏移与独立摘要。共享配置取自2026-10-26采样，实际时间见索引。全包和获取回执留本机临时目录，下载代码未执行。

| 编号 | 相对资源 | 片段数 |
|---|---|---|
| GSB-SRC-CATALOG-API | /gsb/static/js/api-catalog.593102fd.js | 1 |
| GSB-SRC-MANAGE-API | /gsb/static/js/api-manage.d52d3a17.js | 1 |
| GSB-SRC-APPROVAL-API | /gsb/static/js/api-approval.9d5ba412.js | 1 |
| GSB-SRC-CONTROL-API | /gsb/static/js/api-control.11d20130.js | 1 |
| GSB-SRC-CONFIG-API | /gsb/static/js/api-config.b4542d07.js | 1 |
| GSB-SRC-CATALOG | /gsb/static/js/views-catalog-list.fe890937.js | 1 |
| GSB-SRC-MANAGE | /gsb/static/js/views-manage-list.1e240a71.js | 1 |
| GSB-SRC-TABLE | /gsb/static/js/views-manage-table.12353c90.js | 3 |
| GSB-SRC-API | /gsb/static/js/views-manage-api.4218d5f5.js | 2 |
| GSB-SRC-SALE | /gsb/static/js/views-manage-sale.2ce9308c.js | 1 |
| GSB-SRC-SALE-DETAIL | /gsb/static/js/views-manage-saleApi.333a41fa.js | 1 |
| GSB-SRC-CONSUMPTION | /gsb/static/js/views-manage-consumption.ba551203.js | 1 |
| GSB-SRC-APPROVAL | /gsb/static/js/views-approval-list.4cb6533a.js | 1 |
| GSB-SRC-IP | /gsb/static/js/views-control-ip.ae5bce92.js | 1 |
| GSB-SRC-IP-DETAIL | /gsb/static/js/views-control-ipDetail.664329be.js | 1 |
| GSB-SRC-VISIT | /gsb/static/js/views-control-visit.0bcfbc0e.js | 1 |
| GSB-SRC-CONFIG | /gsb/static/js/views-config-list.0b441d3d.js | 1 |
| GSB-SRC-DEPLOY | /gsb/static/js/views-manage-deploy.682db119.js | 1 |
| GSB-SRC-LIST | /gsb/static/js/mixins-audaqueListSearchMixin.8b3922ef.js | 1 |
| GSB-SRC-DELETE | /gsb/static/js/mixins-audaqueDeleteItemMixin.92b76e16.js | 1 |
| GSB-SRC-FORM | /gsb/static/js/mixins-audaqueFormMixin.fd574385.js | 1 |
| GSB-SRC-PROTOCOL | /gsb/serviceConfig.js | 1 |
| GSB-SRC-APP | /gsb/static/js/app.54111cbf.js | 6 |
| GSB-SRC-REQUEST | /static/js/app.7ec981a3.js | 3 |
| GSB-SRC-BASE | /serviceConfig.base.js | 1 |
| GSB-SRC-CONFIG-BASE | /serviceConfig.prod.js | 3 |

历史截图为2026-10-22采样的1500×1000视口：J-GSB-001目录、002注册、002-op1库表、002-op2接口、003消费、004审批、005IP、006访问监控、006-op1修改、007数源；相关options0为选项展开。截图支持可见布局，不能证明不可见下半屏和服务端行为；目录图total=9但可视表体空白，不能判定合法空结果。原证据保持不变，逐功能链接见正文。
