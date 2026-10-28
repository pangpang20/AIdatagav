# 后台系统管理必要源码片段

2026-10-28重新读取本机已取得的公开静态资源。逐资源实际获取时间见index.json，缺少获取登记的不补造时间。本提取器仅离线处理文本，不执行下载JavaScript，不访问业务接口。原文偏移为UTF-16左闭右开，资源摘要和片段摘要分别登记；复现须提供相同原始字节。

本轮浏览器只读打开后台入口后跳转到`/module-login/login`，仅观察登录页；未登录、未取得当前后台表单或认证Network，无新增后台截图。布局复用[2026-10-22历史证据](../live-recheck-20261022/README.md)。

公共宿主客户端另复核[既有请求链片段](../auth-review-20261026/transport.json)，并通过本批PARENT/BOOT追踪注入；不以静态版本证明当前服务器配置。

| ID | 相对资源 | 必要原文 |
|---|---|---|
| BAS-SRC-USER-API | /module-common/static/js/api-manage-user.0761d4a0.js | [user-api.txt](./user-api.txt) |
| BAS-SRC-DEPT-API | /module-common/static/js/api-manage-department.25604b52.js | [dept-api.txt](./dept-api.txt) |
| BAS-SRC-ROLE-API | /module-common/static/js/api-manage-role.7ddd3da8.js | [role-api.txt](./role-api.txt) |
| BAS-SRC-TENANT-API | /module-common/static/js/api-manage-tenant.021f7e0d.js | [tenant-api.txt](./tenant-api.txt) |
| BAS-SRC-USER-LIST | /module-common/static/js/views-manage-user-userList.0ccfd9d3.js | [user-list.txt](./user-list.txt) |
| BAS-SRC-RESET | /module-common/static/js/views-manage-user-userList.0ccfd9d3.js | [reset.txt](./reset.txt) |
| BAS-SRC-VALIDITY | /module-common/static/js/views-manage-user-userList.0ccfd9d3.js | [validity.txt](./validity.txt) |
| BAS-SRC-USER-STATUS | /module-common/static/js/views-manage-user-userList.0ccfd9d3.js | [user-status.txt](./user-status.txt) |
| BAS-SRC-USER-FILTER | /module-common/static/js/views-manage-user-userList.0ccfd9d3.js | [user-filter.txt](./user-filter.txt) |
| BAS-SRC-ROLE-FILTER | /module-common/static/js/views-manage-role-roleList.ec980a98.js | [role-filter.txt](./role-filter.txt) |
| BAS-SRC-TENANT-FILTER | /module-common/static/js/views-manage-tenant-tenantList.3bd44e7a.js | [tenant-filter.txt](./tenant-filter.txt) |
| BAS-SRC-TAG-FILTER | /module-common/static/js/views-manage-tag-tagList.8f7c8599.js | [tag-filter.txt](./tag-filter.txt) |
| BAS-SRC-USER-FORM | /module-common/static/js/views-manage-user-userEdit.dd9b1d2c.js | [user-form.txt](./user-form.txt) |
| BAS-SRC-USER-TRANSFORM | /module-common/static/js/views-manage-user-userEdit.dd9b1d2c.js | [user-transform.txt](./user-transform.txt) |
| BAS-SRC-USER-DETAIL | /module-common/static/js/views-manage-user-userInfo.ffa8234c.js | [user-detail.txt](./user-detail.txt) |
| BAS-SRC-DEPT-INIT | /module-common/static/js/views-manage-department-departmentList.6341c861.js | [dept-init.txt](./dept-init.txt) |
| BAS-SRC-DEPT-SORT | /module-common/static/js/views-manage-department-departmentList.6341c861.js | [dept-sort.txt](./dept-sort.txt) |
| BAS-SRC-DEPT-ADMIN | /module-common/static/js/views-manage-department-departmentList.6341c861.js | [dept-admin.txt](./dept-admin.txt) |
| BAS-SRC-DEPT-FORM | /module-common/static/js/views-manage-department-departmentList.6341c861.js | [dept-form.txt](./dept-form.txt) |
| BAS-SRC-DEPT-MEMBER | /module-common/static/js/views-manage-department-departmentList.6341c861.js | [dept-member.txt](./dept-member.txt) |
| BAS-SRC-PERMISSION | /module-common/static/js/views-manage-permission-permissionMenu.6056dfc4.js | [permission.txt](./permission.txt) |
| BAS-SRC-DATA-FIELDS | /module-common/static/js/views-manage-department-dataPermission.41b7d35e.js | [data-fields.txt](./data-fields.txt) |
| BAS-SRC-DATA-FORM | /module-common/static/js/views-manage-department-dataPermission.41b7d35e.js | [data-form.txt](./data-form.txt) |
| BAS-SRC-DATA-API | /module-common/static/js/views-manage-department-dataPermission.41b7d35e.js | [data-api.txt](./data-api.txt) |
| BAS-SRC-TENANT-FORM | /module-common/static/js/views-manage-tenant-tenantEdit.e25a6445.js | [tenant-form.txt](./tenant-form.txt) |
| BAS-SRC-TENANT-MEMBERS | /module-common/static/js/views-manage-tenant-userList.f7d602eb.js | [tenant-members.txt](./tenant-members.txt) |
| BAS-SRC-TAG-FORM | /module-common/static/js/views-manage-tag-tagEdit.1cdf8df4.js | [tag-form.txt](./tag-form.txt) |
| BAS-SRC-UNLOCK | /module-common/static/js/views-manage-security-unlimit.2de1b724.js | [unlock.txt](./unlock.txt) |
| BAS-SRC-UNLOCK-API | /module-common/static/js/api-manage-security.e038784d.js | [unlock-api.txt](./unlock-api.txt) |
| BAS-SRC-PARENT | /module-common/static/js/module-common-app.96b573dd.js | [parent.txt](./parent.txt) |
| BAS-SRC-BOOT | /module-common/static/js/module-common-app.96b573dd.js | [boot.txt](./boot.txt) |

[核查记录](../../36-后台系统管理/核查记录.md)
