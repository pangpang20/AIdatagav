# 工作空间专项证据索引

核查日期2026-10-28；[原文片段与摘要](./index.json)保留每项原获取UTC时间、资源字节数/SHA-256、UTF-16 code unit左闭右开偏移、片段摘要和原文。仅离线解析静态文本，不执行下载代码；业务接口请求0次、浏览器操作0次，应用验收全部未执行。

[主规格](../../33-工作空间/需求说明.md) · [子页面规格](../../33-工作空间/子页面与操作细化.md) · [核查记录](../../33-工作空间/核查记录.md) · [离线提取/校验工具](../../../../scripts/prepare-space-evidence.js)

| 编号 | 相对资源/内容 | 获取UTC日期及限制 |
|---|---|---|
| SPACE-SRC-LIST | /dop/static/js/views-projectSpace.0cf916e8.js；筛选、主体关系、卡片动作、抽屉/路由 | 2026-10-28，页面包仅公开GET；不调用业务API |
| SPACE-SRC-EDIT | /dop/static/js/views-projectSpace-edit.027c0d25.js；两字段抽屉、校验及提交 | 2026-10-28，没有打开实拍或保存 |
| SPACE-SRC-CONFIG | /dop/static/js/views-projectSpace-config.435aeb1e.js；配置字段、候选/成员映射、移除提醒 | 2026-10-28，排除无关第三方树组件全文 |
| SPACE-SRC-API | /dop/static/js/api-projectSpace.254a1938.js；读写包装器 | 2026-10-26，复用本机缓存原回执 |
| SPACE-SRC-DOP | /dop/static/js/app.73911832.js；模块前缀、主壳桥接、管理员候选、中文语言包 | 2026-10-26，复用本机缓存 |
| SPACE-SRC-MIXINS | /dop/static/js/chunk-@audaque/vue-utils.dd200c95.js；分页、删除/表单、blur trim | 2026-10-26，复用本机缓存 |
| SPACE-SRC-REQUEST | /static/js/app.7ec981a3.js；JSON、会话、超时、响应、顶部切换 | 2026-10-26，复用本机缓存 |
| SPACE-SRC-BASE | /serviceConfig.base.js；NETWORK_ERROR_CODE=202 | 2026-10-26，来源相对资源路径以index.json为准 |
| SPACE-SRC-CONFIGURATION | /serviceConfig.prod.js；/back路径及空前缀覆盖对象 | 2026-10-26，来源相对资源路径以index.json为准 |

9个来源、23个必要片段。page/dop/shared来源组分别核对原包与获取回执；不改写获取时间为本次检查时间。运行配置可能变化，不保证与2026-10-22历史页面同一构建。整包、完整配置和原回执留本机，不进入仓库；已选片段不含部署origin和真实凭据值。头/存储键名称不等于秘密值。仅供获授权项目成员，历史截图沿用既有样本访问限制。

| 历史截图/元素 | UTC采样 | 视口 | 用途/限制 |
|---|---|---|---|
| [E060](../E060-workspaces.png) / [元素](../E060-workspaces.json) | 2026-10-22T03:02:35.367Z | 1440×1000 | 创建入口及列表背景；文字有历史处理、完整文字来自独立C035，不能拼为同一时刻 |
| [C035](../C035-original-content.png) / [元素](../C035-original-content.json) | 2026-10-22T03:33:44.780Z | 1440×1000 | 完整文字独立补采、卡片名称/编码/管理员/介绍，不作为固定默认值 |
| [V-SPACE-001](../live-recheck-20261022/V-SPACE-001.png) / [元素](../live-recheck-20261022/V-SPACE-001.json) | 2026-10-22T12:45:19.009Z | 1500×1000 | 无创建入口的后期列表样本；4条不是配额，类型readonly不是禁选 |
| [F087](../F087-SPACE-space-list.png) / [元素](../F087-SPACE-space-list.json) | 2026-10-22T04:20:36.932Z | 1440×1000 | 错目标：正文工作台场景，排除为空间卡片/配置页面依据，保留原记录 |

--verify不发HTTP请求；需本机page/dop/shared原资源目录及原receipt.json。重新提取只更新inspectedAt，不修改任何历史图片或采样时间。独立抽屉、配置页、确认层和顶部切换后页面尚缺实拍。
