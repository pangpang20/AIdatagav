# 后台配置管理必要源码片段

2026-10-28只读获取公开静态资源并离线检查文本，未执行下载代码或调用业务接口。index.json登记每个资源的实际获取时间、相对路径、原始字节摘要，以及必要连续片段的UTF-16左闭右开偏移和摘要。复现提取须使用相同原始文件。

本轮后台入口跳转至`/module-login/login`，未认证，未采集新的后台截图。布局复用2026-10-22、1500×1000的历史页面，平台候选请求被保护拦截的空态不证明无系统。宿主公共请求处理另经原文件摘要校对[既有传输片段](../auth-review-20261026/transport.json)。

| ID | 相对资源 | 必要片段 |
|---|---|---|
| BCF-SRC-APP-API | /module-common/static/js/api-config-app.a0243f15.js | [app-api.txt](./app-api.txt) |
| BCF-SRC-APP-FORM | /module-common/static/js/views-config-app-edit.a3ce57d6.js | [app-form.txt](./app-form.txt) |
| BCF-SRC-APP-SECRET | /module-common/static/js/views-config-app-edit.a3ce57d6.js | [app-secret.txt](./app-secret.txt) |
| BCF-SRC-APP-CONTROLS | /module-common/static/js/views-config-app-edit.a3ce57d6.js | [app-controls.txt](./app-controls.txt) |
| BCF-SRC-APP-LIST | /module-common/static/js/views-config-app-list.ec5d2814.js | [app-list.txt](./app-list.txt) |
| BCF-SRC-ENUM | /module-common/static/js/assets-js-config.f2773912.js | [enum.txt](./enum.txt) |
| BCF-SRC-SYSTEM-API | /module-common/static/js/api-config-system.b7aadf1a.js | [system-api.txt](./system-api.txt) |
| BCF-SRC-SYSTEM-FORM | /module-common/static/js/views-config-system-edit.32406a30.js | [system-form.txt](./system-form.txt) |
| BCF-SRC-SYSTEM-FILES | /module-common/static/js/views-config-system-edit.32406a30.js | [system-files.txt](./system-files.txt) |
| BCF-SRC-SYSTEM-CONTROLS | /module-common/static/js/views-config-system-edit.32406a30.js | [system-controls.txt](./system-controls.txt) |
| BCF-SRC-SYSTEM-LIST | /module-common/static/js/views-config-system-list.4efc2c76.js | [system-list.txt](./system-list.txt) |
| BCF-SRC-LOGO | /module-common/static/js/components-UploadImg.b2836a0c.js | [logo.txt](./logo.txt) |
| BCF-SRC-PLATFORM-API | /module-common/static/js/api-config-platform.4290d549.js | [platform-api.txt](./platform-api.txt) |
| BCF-SRC-PLATFORM-FORM | /module-common/static/js/views-config-platform-edit.9a3fa157.js | [platform-form.txt](./platform-form.txt) |
| BCF-SRC-PLATFORM-CONTROLS | /module-common/static/js/views-config-platform-edit.9a3fa157.js | [platform-controls.txt](./platform-controls.txt) |
| BCF-SRC-PLATFORM-LIST | /module-common/static/js/views-config-platform-list.28319127.js | [platform-list.txt](./platform-list.txt) |
| BCF-SRC-PLATFORM-ROWS | /module-common/static/js/views-config-platform-AddSystemTable.0f1a6c4e.js | [platform-rows.txt](./platform-rows.txt) |
| BCF-SRC-DICT-API | /module-common/static/js/api-config-dictionary-dictItem.ab93f916.js | [dict-api.txt](./dict-api.txt) |
| BCF-SRC-DICT-FORM | /module-common/static/js/views-config-dictionary-edit.096533c0.js | [dict-form.txt](./dict-form.txt) |
| BCF-SRC-DICT-LIST | /module-common/static/js/views-config-dictionary-list.06658ab8.js | [dict-list.txt](./dict-list.txt) |
| BCF-SRC-DATE-API | /module-common/static/js/api-config-calendar-calendarspecial.358f27d5.js | [date-api.txt](./date-api.txt) |
| BCF-SRC-DATE-FORM | /module-common/static/js/views-config-calendarspecial-edit.03bd3126.js | [date-form.txt](./date-form.txt) |
| BCF-SRC-DATE-LIST | /module-common/static/js/views-config-calendarspecial-list.fa32c279.js | [date-list.txt](./date-list.txt) |
| BCF-SRC-LICENSE-API | /module-common/static/js/api-config-license.681a1c88.js | [license-api.txt](./license-api.txt) |
| BCF-SRC-LICENSE-INFO | /module-common/static/js/views-config-license-info.a860b7b2.js | [license-info.txt](./license-info.txt) |
| BCF-SRC-LICENSE-FORM | /module-common/static/js/views-config-license-authorize.b370050e.js | [license-form.txt](./license-form.txt) |
| BCF-SRC-KEY | /module-common/static/js/api-common.070f976e.js | [key.txt](./key.txt) |
| BCF-SRC-LIST-MIXIN | /module-common/static/js/chunk-@audaque/vue-utils.5c2b645c.js | [list-mixin.txt](./list-mixin.txt) |
| BCF-SRC-FORM-MIXIN | /module-common/static/js/chunk-@audaque/vue-utils.5c2b645c.js | [form-mixin.txt](./form-mixin.txt) |
| BCF-SRC-FILE-VALIDATOR | /module-common/static/js/chunk-@audaque/vue-utils.5c2b645c.js | [file-validator.txt](./file-validator.txt) |
| BCF-SRC-PARENT | /module-common/static/js/app.96b573dd.js | [parent.txt](./parent.txt) |
| BCF-SRC-BOOT | /module-common/static/js/app.96b573dd.js | [boot.txt](./boot.txt) |

[需求说明](../../37-后台配置管理/需求说明.md) · [核查记录](../../37-后台配置管理/核查记录.md)
