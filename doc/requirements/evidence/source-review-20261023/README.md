# 前端源码核对证据

本批仅对公开静态资源做只读GET取得后的离线阅读，未执行所下载JavaScript，未调用业务接口。静态定义只证明客户端写法，不证明运行配置、后端契约、成功结果或权限。

- 复核UTC时间：2026-10-23T04:13:19.409Z；逐文件获取时间见下表，缺少获取登记的文件不补造时间。
- 分发范围：限获授权项目人员。仅保存必要原文片段、资源相对路径和摘要；完整原包及部署配置保留本机临时目录，不纳入Git。
- 来源分类：【页面观察，来源：前端源码】；所有应用验收仍为【拟定，未执行】。原文偏移按UTF-16 code unit计数，左闭右开；每段及原资源各有SHA-256。
- 本轮没有新页面截图。页面外观使用[2026-10-22历史截图索引](../live-recheck-20261022/README.md)，历史页面与本轮bundle是否同版本尚未确认。
- [机器索引与原文片段](./index.json)；不能将片段SHA当作原资源SHA，或把静态API包装器地址当实际Network请求URL。

| 证据ID | 资源相对路径 | 获取UTC时间 | 字节数 | 用途与关联需求 |
|---|---|---|---|---|
| SRC-USER-FORM | /module-common/static/js/views-manage-user-userEdit.dd9b1d2c.js | 2026-10-23T03:48:43.056325+00:00 | 22256 | BAS-002、BAS-003；静态定义 |
| SRC-USER-API | /module-common/static/js/api-manage-user.0761d4a0.js | 2026-10-23T03:48:44.731590+00:00 | 5050 | BAS-001、BAS-002、BAS-003、BAS-004、BAS-005、BAS-010；静态定义 |
| SRC-USER-LIST | /module-common/static/js/views-manage-user-userList.0ccfd9d3.js | 2026-10-23T03:48:43.302989+00:00 | 28748 | BAS-001、BAS-004、BAS-005；静态定义 |
| SRC-USER-ROLE | /module-common/static/js/views-manage-user-userEditRole.06cad8df.js | 2026-10-23T03:48:47.635655+00:00 | 9899 | BAS-005；静态定义 |
| SRC-SHARED | /module-common/static/js/chunk-@audaque/vue-utils.5c2b645c.js | 2026-10-23T03:52:00.802686+00:00 | 403772 | BAS-002、BAS-003、BAS-005；静态定义 |
| SRC-DEPT-API | /module-common/static/js/api-manage-department.25604b52.js | 2026-10-23T03:48:43.546734+00:00 | 4831 | BAS-006、BAS-007、BAS-010；静态定义 |
| SRC-DEPT-FORM | /module-common/static/js/views-manage-department-departmentList.6341c861.js | 2026-10-23T03:48:45.496537+00:00 | 45882 | BAS-006；静态定义 |
| SRC-DEPT-MEMBER | /module-common/static/js/views-manage-department-departmentList.6341c861.js | 2026-10-23T03:48:45.496537+00:00 | 45882 | BAS-007；静态定义 |
| SRC-ROLE-FORM | /module-common/static/js/views-manage-role-roleEdit.02feec2c.js | 2026-10-23T03:48:45.981299+00:00 | 3155 | BAS-008；静态定义 |
| SRC-ROLE-API | /module-common/static/js/api-manage-role.7ddd3da8.js | 2026-10-23T03:48:43.789106+00:00 | 1764 | BAS-008；静态定义 |
| SRC-PERMISSION | /module-common/static/js/views-manage-permission-permissionMenu.6056dfc4.js | 2026-10-23T03:48:45.743488+00:00 | 14584 | BAS-008、BAS-009；静态定义 |
| SRC-TENANT-FORM | /module-common/static/js/views-manage-tenant-tenantEdit.e25a6445.js | 2026-10-23T03:48:46.942984+00:00 | 10773 | BAS-009；静态定义 |
| SRC-TENANT-MEMBER | /module-common/static/js/views-manage-tenant-userList.f7d602eb.js | 2026-10-23T03:48:47.431363+00:00 | 12651 | BAS-009；静态定义 |
| SRC-TENANT-API | /module-common/static/js/api-manage-tenant.021f7e0d.js | 2026-10-23T03:48:44.549846+00:00 | 2497 | BAS-009；静态定义 |
| SRC-TAG-FORM | /module-common/static/js/views-manage-tag-tagEdit.1cdf8df4.js | 2026-10-23T03:48:46.497256+00:00 | 5164 | BAS-011；静态定义 |
| SRC-TAG-API | /module-common/static/js/api-manage-tag.05afa7b7.js | 2026-10-23T03:48:44.309896+00:00 | 1652 | BAS-011；静态定义 |
| SRC-UNLOCK-FORM | /module-common/static/js/views-manage-security-unlimit.2de1b724.js | 2026-10-23T03:48:46.262737+00:00 | 4775 | BAS-012；静态定义 |
| SRC-UNLOCK-API | /module-common/static/js/api-manage-security.e038784d.js | 2026-10-23T03:48:44.052126+00:00 | 1328 | BAS-012；静态定义 |
| SRC-PORTAL-API | /static/js/app.7ec981a3.js |  | 1417837 | UAC-001、UAC-002、UAC-003、UAC-004、UAC-005；静态定义 |
| SRC-PORTAL-INFO | /static/js/app.7ec981a3.js |  | 1417837 | UAC-001；静态定义 |
| SRC-PORTAL-PASSWORD | /static/js/app.7ec981a3.js |  | 1417837 | UAC-002；静态定义 |
| SRC-PORTAL-DEPT | /static/js/app.7ec981a3.js |  | 1417837 | UAC-003；静态定义 |
| SRC-DIS-API | /dis/static/js/api-taskManagement-dataAcquisition.2db4b912.js | 2026-10-23T03:51:36.393460+00:00 | 6292 | DIS-100、DIS-102、DIS-103、DIS-513、DIS-519；静态定义 |
| SRC-DIS-FORM | /dis/static/js/views-taskManagement-dataAcquisition-edit.6bfb4354.js | 2026-10-23T03:51:37.153952+00:00 | 40251 | DIS-100、DIS-102、DIS-103、DIS-513、DIS-519；静态定义 |
| SRC-DIS-MAPPING | /dis/static/js/views-taskManagement-dataAcquisition-edit.6bfb4354.js | 2026-10-23T03:51:37.153952+00:00 | 40251 | DIS-100、DIS-102、DIS-103、DIS-513、DIS-519；静态定义 |
| SRC-DIS-LIST | /dis/static/js/views-taskManagement-dataAcquisition-list.27402d6a.js | 2026-10-23T03:51:36.896350+00:00 | 39510 | DIS-100、DIS-102、DIS-103、DIS-513、DIS-519；静态定义 |
| SRC-SMS-API | /sms/static/js/api-modules-schedule-manage-scheduleList.1f35a70d.js | 2026-10-23T03:51:35.732603+00:00 | 1470 | SMS-105、SMS-527；静态定义 |
| SRC-SMS-LIST | /sms/static/js/views-schedule-manage-scheduleList.ea7c346d.js | 2026-10-23T03:51:35.999896+00:00 | 14195 | SMS-105、SMS-527；静态定义 |
| SRC-SMS-SETTING | /sms/static/js/views-schedule-manage-scheduleSetting.6532bd7f.js | 2026-10-23T03:52:52.454448+00:00 | 25770 | SMS-105、SMS-527；静态定义 |

[返回总索引](../../README.md)
