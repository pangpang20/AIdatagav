"""Render the reviewed platform overview and route-level evidence specifications."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'doc/requirements'
MODULE_CODE = 'PLAT'
MODULE_DIR = '35-微服务平台'
NFR_IDS = [f'PLAT-NFR-{n:03}' for n in range(1, 13)]

ACTION_LABELS = {
    '新增', '新建', '新增部门人员', '编辑', '修改', '删除', '重置密码',
    '设置账号有效期', '更多', '授权', '租户用户列表', '数据权限', '测试连接',
    '禁用', '启用', '初始化', '撤销', '批量已读', '重发', '查看详情',
    '查询', '重置', '办理', '查看', '撤回', '催办', '结束', '挂起', '跳转',
    '设计表单', '配置', '查看流程图', '查看节点', '配置节点信息',
    '下载xml', '下载svg', '返回', '关闭',
}


def cell(value):
    return str(value).replace('|', '&#124;').replace('\r', '').replace('\n', '<br>')


def evidence_link(sample_id):
    base = f'../evidence/live-recheck-20261022/{sample_id}'
    return f'[{sample_id}]({base}.png) / [DOM]({base}.json)'


def owner_for(requirement_id):
    number = int(requirement_id.split('-')[1])
    if number == 500:
        return '[微服务平台总需求](./需求说明.md)'
    if 501 <= number <= 508:
        return '[后台系统管理](../36-后台系统管理/需求说明.md)'
    if 509 <= number <= 520:
        return '[后台配置管理](../37-后台配置管理/需求说明.md)'
    return '[后台消息、工作流与审计](../38-后台消息工作流与审计/需求说明.md)'


def related_nfrs(requirement_id):
    number = int(requirement_id.split('-')[1])
    if number == 500:
        indexes = [1, 3, 4, 8, 9, 10, 12]
    elif 501 <= number <= 508:
        indexes = [1, 3, 4, 5, 6, 7, 8, 9, 10, 12]
    elif 509 <= number <= 520:
        indexes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    else:
        indexes = [1, 2, 3, 4, 6, 7, 8, 9, 10, 12]
    return [NFR_IDS[n - 1] for n in indexes]


def safe_action_labels(sample):
    found = []
    for action in sample.get('actions', []):
        label = (action.get('text') or action.get('title') or '').strip()
        if label in ACTION_LABELS and label not in found:
            found.append(label)
    for control in sample.get('controls', []):
        if control.get('tag') != 'BUTTON':
            continue
        label = (control.get('text') or control.get('label') or '').strip()
        if label in ACTION_LABELS and label not in found:
            found.append(label)
    return found


def field_rows(sample):
    rows = []
    seen = set()
    for control in sample.get('controls', []):
        if control.get('tag') not in {'INPUT', 'SELECT', 'TEXTAREA'}:
            continue
        label = (control.get('label') or control.get('placeholder') or '').strip()
        if not label or (label, control.get('tag')) in seen:
            continue
        seen.add((label, control.get('tag')))
        attrs = []
        for name in ('required', 'minlength', 'maxlength', 'min', 'max', 'pattern'):
            value = control.get(name)
            if value not in (None, False, ''):
                attrs.append(f'{name}={value}')
        if control.get('readonly'):
            attrs.append('readonly')
        if control.get('disabled'):
            attrs.append('disabled')
        rows.append((label, control.get('type') or control.get('tag', '').lower(), '；'.join(attrs)))
    for form in sample.get('forms', []):
        label = (form.get('label') or '').strip()
        for control in form.get('fields') or []:
            field_label = label or (control.get('label') or '').strip()
            if not field_label or (field_label, control.get('type')) in seen:
                continue
            seen.add((field_label, control.get('type')))
            attrs = []
            if form.get('requiredMarker'):
                attrs.append('页面必填标记')
            for name in ('maxlength', 'min', 'max', 'pattern'):
                value = control.get(name)
                if value not in (None, ''):
                    attrs.append(f'{name}={value}')
            if control.get('readonly'):
                attrs.append('readonly')
            if control.get('disabled'):
                attrs.append('disabled')
            rows.append((field_label, control.get('type') or '', '；'.join(attrs)))
    return rows


def render_page(feature, sample, first_acceptance):
    requirement_id = feature['id']
    name = feature['key'].split('::', 1)[0]
    operation = feature['key'].split('::', 1)[1] if '::' in feature['key'] else '页面'
    route = sample.get('url') or ''
    sources = '；'.join(evidence_link(sid) for sid in feature['evidence'])
    controls = field_rows(sample)
    headers = list(dict.fromkeys(h.strip() for h in sample.get('headers', []) if h and h.strip()))
    actions = safe_action_labels(sample)
    nfrs = related_nfrs(requirement_id)
    is_home = requirement_id == 'PLAT-500'
    is_model_detail = requirement_id in {'PLAT-540', 'PLAT-541', 'PLAT-542'}
    owner = owner_for(requirement_id)

    out = [
        f'### {requirement_id} {name}' + (f' → {operation}' if operation != '页面' else ''),
        '',
        f'**页面目标**：从微服务平台打开“{name}”并读取该对象或视图。业务变更规则由{owner}承接。',
        '',
        f'路由：`{route}`。证据时间：`{sample.get("time", "")}`。来源：{sources}。采样只证明当时页面和DOM可见内容。',
        '',
        f'#### 1. 页面字段清单（{requirement_id}）',
        '',
        '| 字段/列 | 控件或来源 | DOM属性 | 规则边界 |',
        '|---|---|---|---|',
    ]
    for label, kind, attrs in controls:
        out.append(f'| {cell(label)} | {cell(kind)} | {cell(attrs)} | 页面属性；服务端必填、取值及转换规则须由对应业务契约定义。 |')
    if headers:
        out.append(f'| 表格列 | 表头：{cell("、".join(headers))} | 只读列标题 | 记录值、行数及当前排序仅是样本，不作为固定枚举或业务规则。 |')
    if not controls and not headers:
        out.append('| 页面内容 | 本次DOM采样没有可命名输入项或普通表头 |  | 不表示页面没有其他交互或后台数据。 |')
    out += [
        '',
        '默认值、输入长度、单位、精确匹配方式和请求参数只有在证据中明确出现时才作为规则；空白项表示尚无证据，不表示无限制。',
        '',
        f'#### 2. 页面交互规则（{requirement_id}）',
        '',
        '| 控件/入口 | 目标行为 | 完成、失败及恢复 |',
        '|---|---|---|',
    ]
    if is_home:
        out.append('| 首页应用卡片与左侧菜单 | 点击后进入各自页面路由；工作台卡片按页面可见业务分组呈现。每个目标路由仍须单独鉴权。 | 首次加载显示进度；空内容与加载失败分开；失败提供重试并保留当前位置。 |')
    elif headers:
        out.append('| 筛选输入 | 修改筛选草稿，不在输入过程中提交查询。占位文字记录在字段表；精确/包含匹配由对应接口契约定义。 | 清空和重置恢复该页约定初值；自动重新查询与否需由页面契约确定。 |')
        out.append('| 查询 / 重置 | 查询以当前筛选发起只读检索；重置清除筛选并按约定刷新列表。 | 空结果、请求失败、无权限分别展示；失败保留筛选条件；较早请求不得覆盖较新的查询结果。 |')
        if '分页' in sample.get('text', '') or '前往页' in sample.get('text', ''):
            out.append('| 分页 | 页码、每页条数和总数按页面显示；后端分页参数及上限以接口契约为准。 | 改变筛选后回到约定页；翻页失败保留当前条件和页码。 |')
    elif is_model_detail:
        out.append('| 返回、流程图及节点读取 | 读取所选流程模型的只读版本；节点配置只在已观察的只读视图中展示。 | 切换模型时清除旧图/节点数据；加载失败提供重试；关闭/返回恢复模型列表上下文。 |')
    else:
        out.append('| 页面内容 | 按当前入口与授权范围读取该页对象；只读证据不代表已打开新增、编辑、审批或运行流程。 | 无内容、依赖加载失败、会话失效和无权访问分开展示；刷新失败保留可恢复的入口上下文。 |')
    if actions:
        out.append(f'| 可见操作入口 | DOM中可见的入口文字：{cell("、".join(actions))}。其存在仅证明入口可见；表单及写入结果按{owner}定义。 | 写操作需服务端授权、确认规则、结果回读与重复提交保护；本轮没有执行写操作。 |')
    else:
        out.append('| 页面操作 | 当前样本未采集到可识别的独立操作标签；不据此推定产品支持或不支持维护操作。 | 未定义的业务写入由所属模块需求补齐后再实现。 |')
    out += [
        '',
        f'#### 3. 业务流程与异常分支（{requirement_id}）',
        '',
    ]
    if is_home:
        out += [
            '1. 已认证用户打开 `/module-common/index`，系统按当前工作空间和授权返回首页分组、应用卡片与左侧导航。',
            '2. 用户选择卡片或菜单后进入对应路由；目标页面必须重新检查会话、角色和数据范围。',
            '3. 首页或目标依赖不可用时显示明确失败状态，不把缺失模块当成“无权限”或空业务数据；重试不应重复执行业务写入。',
        ]
    elif headers:
        out += [
            f'1. 用户从左侧菜单进入 `{route}`；服务端按会话和资源权限决定页面能否读取。',
            '2. 用户可设置页面已观察的筛选项并触发查询；字段到请求参数的映射和匹配运算须在接口契约确认，不从占位文字推断。',
            '3. 成功时展示表格列及分页；零行与查询失败、无权访问、服务异常分别处理。查询失败保留筛选并允许显式重试。',
            '4. 页内可见的新增、编辑、删除、审批或运行入口转由所属模块处理；网络超时后先读取操作状态再决定是否重试。',
        ]
    else:
        out += [
            f'1. 用户从所属菜单或已关联流程打开 `{route}`；按所选稳定对象标识及授权范围读取内容。',
            '2. 成功时展示当前对象字段/节点/图形；空对象、目标已删除、无权访问、网络失败和会话过期应区分。',
            '3. 返回或切换对象时不把上一个对象的数据留在当前视图；读取失败后重试不触发流程发布或节点变更。',
        ]
    out += [
        '',
        f'#### 4. 接口与数据规则（{requirement_id}）',
        '',
        '| 用途 | 当前证据 | 开发约束 |',
        '|---|---|---|',
        '| 页面路由 | '+cell(route)+' 是SPA页面路由，不是API接口。 | 不据页面地址拼造HTTP方法或后端资源路径。 |',
        '| API请求/响应 | 本次归档页面证据没有可验证的Network请求/响应契约。 | 由所属模块提供HTTP方法、相对路径、参数、分页、业务码、错误体与超时规则后再接入。 |',
        '| 数据范围 | 页面样本不能证明服务端行/列权限或跨空间隔离。 | 服务端按授权范围过滤；客户端隐藏菜单不作为访问控制。 |',
        '',
        f'#### 5. 验收标准（{requirement_id}）',
        '',
        '| 验收编号 | 前置条件与操作 | 通过条件 | 关联需求 | 状态 |',
        '|---|---|---|---|---|',
    ]
    first_id = first_acceptance
    if is_home:
        scenarios = [
            '在隔离环境打开首页，并核对路由与分组卡片/菜单。',
            '分别打开可访问与不可访问的目标；失败、空内容和无权状态可区分并可恢复。',
            '验证工作空间/角色切换后只显示授权入口，直接访问未授权目标被服务端拒绝。',
        ]
    elif headers:
        scenarios = [
            '按证据中的筛选提示输入条件并查询，核对表头、分页与返回记录。',
            '覆盖零结果、请求失败、超时、重置和翻页；旧请求不能覆盖新条件。',
            '分别以授权和越权身份访问页面及对象标识，确认服务端数据范围隔离。',
        ]
    elif is_model_detail:
        scenarios = [
            '打开已授权的流程版本，核对流程图/节点字段及所选对象一致。',
            '覆盖节点读取失败、切换流程与返回，确认旧节点内容不会残留。',
            '只读查看不产生发布、节点保存或实例状态变更；越权模型不可读取。',
        ]
    else:
        scenarios = [
            '打开目标路由，核对标题/字段与该页证据及所属模块规格一致。',
            '覆盖空内容、依赖失败、无权限和会话过期，状态清晰且可恢复。',
            '具备和不具备授权的账号分别验证直接路由/对象访问，服务端拒绝越权。',
        ]
    for offset, scenario in enumerate(scenarios):
        out.append(f'| PLAT-AC-{first_id + offset:03} | {cell(scenario)} | 结果可回读；错误状态与权限判定符合规则。 | {requirement_id} | 未执行 |')
    out += [
        '',
        f'#### 6. 权限与安全要求（{requirement_id}）',
        '',
        '1. 页面可见性与服务端授权分开验收；用户、工作空间、租户、部门和对象的实际范围由平台权限矩阵定义。',
        '2. 不在查询参数、错误消息或普通日志中泄露凭据、令牌、个人标识和不必要的对象内容；敏感字段只在获授权的详情或操作中呈现。',
        '3. 高影响写操作必须在所属模块明确权限、影响确认、审计和回读；本页面证据不授权执行这些操作。',
        '',
        f'#### 7. 页面布局与状态（{requirement_id}）',
        '',
        '页面截图尺寸为1500×1000像素的历史采样，不作为固定布局尺寸。列表页为顶部平台栏、左侧导航、内容标题、筛选区域、表格及底部分页；首页在主区按类别排列应用卡片。',
        '窗口缩放、长文本、窄屏、加载中、空结果、权限隐藏和错误提示应保持主要内容可读且不遮挡操作；当前响应式和辅助技术行为未验收。',
        '',
        f'#### 8. 关联资料（{requirement_id}）',
        '',
        f'页面业务维护规则：{owner}。证据：{sources}。模块差异、接口与权限依赖见[核查记录](./核查记录.md)。',
        '',
        f'#### 9. 非功能性需求（{requirement_id}）',
        '',
        '本页适用：' + '、'.join(f'[{n}](./需求说明.md#9-非功能性需求)' for n in nfrs) + '。目标值、测量范围和验收方法以主需求第9节为准。',
        '',
    ]
    return out


def render_subpage(registered, samples):
    out = [
        '# 微服务平台子页面与操作需求细化',
        '',
        '<!-- plat:generated-spec-v1 -->',
        '<!-- 业务规格格式:plain-v1 -->',
        '',
        '本文件覆盖PLAT-500–543的44个页面目标。页面事实来自2026-10-22历史截图和DOM；用户/配置/消息工作流/日志的维护契约分别归属后台系统管理、后台配置管理和后台消息工作流与审计文档。所有应用验收仍为“未执行”。',
        '',
        '## 1. 范围与模块归属',
        '',
        '| 页面范围 | 业务规则归属 |',
        '|---|---|',
        '| PLAT-500首页及工作台入口 | [本模块业务需求](./需求说明.md) |',
        '| PLAT-501–508系统管理 | [后台系统管理](../36-后台系统管理/需求说明.md) |',
        '| PLAT-509–520配置管理 | [后台配置管理](../37-后台配置管理/需求说明.md) |',
        '| PLAT-521–543监控、消息、工作流、日志 | [后台消息工作流与审计](../38-后台消息工作流与审计/需求说明.md) |',
        '',
        '历史证据来自只读页面读取；点击入口不代表已打开写入表单，也不代表保存、删除、发布、审批、运行或日志完整性已验证。采样记录中的动态账号、姓名、IP、记录正文及配置样例值不复制到本规格。',
        '',
        '## 2. 页面与路由索引',
        '',
        '| 需求编号 | 页面 | 页面路由 | 列表字段/已命名控件 | 可见操作入口 | 页面证据 |',
        '|---|---|---|---|---|---|',
    ]
    acceptance_index = 500
    features = registered['requirements']
    for feature in features:
        sample = samples[feature['evidence'][0]]
        name = feature['key'].split('::', 1)[0]
        headers = list(dict.fromkeys(h.strip() for h in sample.get('headers', []) if h and h.strip()))
        controls = [label for label, _, _ in field_rows(sample)]
        actions = safe_action_labels(sample)
        page_fields = '；'.join(x for x in [
            '表头：' + '、'.join(headers) if headers else '',
            '控件：' + '、'.join(controls) if controls else '',
        ] if x) or '本次DOM未采集到可命名字段'
        out.append(
            f'| {feature["id"]} | {cell(name)} | `{cell(sample.get("url", ""))}` | '
            f'{cell(page_fields)} | {cell("、".join(actions) if actions else "未采集到可识别的独立操作标签")} | '
            f'{"；".join(evidence_link(sid) for sid in feature["evidence"])} |'
        )
    out += ['', '## 3. 编号功能需求', '']
    for feature in features:
        sample = samples[feature['evidence'][0]]
        out.extend(render_page(feature, sample, acceptance_index))
        acceptance_index += 3
    out += [
        '## 4. 验收执行边界',
        '',
        '页面截图与DOM仅证明当时页面结构、字段标签、表头和入口文字。路由导航、业务查询、写入结果、跨租户隔离、错误恢复及所有PLAT-NFR验收均未在本轮执行；执行状态均在验收表中标为“未执行”。',
        '',
        '[主需求与非功能指标](./需求说明.md) · [核查记录](./核查记录.md) · [证据索引](../证据索引.md) · [现场证据目录](../evidence/live-recheck-20261022/README.md)',
        '',
    ]
    return '\n'.join(out)


def render_main():
    return '''# 微服务平台业务需求说明

<!-- 业务规格格式:plain-v1 -->

修订日期：2026-10-28。平台首页和导航由PLAT定义；系统管理、配置管理、消息、工作流与日志的业务行为分别归属后台专项需求。证据依据、差异和外部依赖见[核查记录](./核查记录.md)。

## 1. 业务目标与使用角色

为已认证的平台使用者提供工作台应用入口和后台管理导航，并按授权访问各业务页面。可见“默认租户”、账号姓名和菜单不是角色矩阵或数据权限范围的完整定义，授权规则由服务端权限合同控制。

入口路由：`/module-common/index`。页面标题：数据运营平台；后台分组：微服务平台。

## 2. 业务范围

平台首页和44个子页面路由证据见[子页面与操作细化](./子页面与操作细化.md)。管理行为按所属模块分工：

| 业务域 | 本模块定义 | 业务规则文档 |
|---|---|---|
| 首页与应用入口 | 应用分组展示、工作台卡片与后台菜单导航 | 本文件PLAT-001–004 |
| 用户、部门、角色、租户、标签及账号解禁 | 路由与可见列表字段；新增/编辑/授权/密码重置等行为 | [后台系统管理](../36-后台系统管理/需求说明.md) |
| 数据源、应用、系统/平台设置、字典、特殊日期、许可证 | 路由与可见列表字段；配置范围、生效及维护行为 | [后台配置管理](../37-后台配置管理/需求说明.md) |
| 告警、消息、公告、工单、流程模型、表单和日志 | 路由与可见列表字段；消息状态、审批、发布、流程实例与审计 | [后台消息工作流与审计](../38-后台消息工作流与审计/需求说明.md) |

## 3. 功能需求

### PLAT-001 微服务首页

**业务目的**：呈现工作台和按业务类别分组的应用入口。

**操作与规则**：首页主区按工作台、需求管理、数据开发、数据一体化、数据资产、数据评价和后台等分组呈现卡片；后台侧栏列出系统管理、配置管理、监控管理、消息管理、工作流及日志管理。用户选择卡片或菜单项后进入对应页面，目标路由重新执行服务端授权。首页不定义业务数据CRUD，也不因入口存在而推定目标服务可用。

**结果与异常处理**：卡片分组或导航依赖加载失败时展示可辨识的失败状态并提供重试；不以空页面或默认统计值表示加载成功。目标页面无权访问、会话失效和服务失败分别处理。

1. 已认证用户进入`/module-common/index`，系统读取当前允许展示的首页内容。

**开发处理细则**：按授权响应展示首页卡片和后台分组；点击入口只负责导航，不在首页代替目标页鉴权，不将缺失统计填为0。

### PLAT-002 后台导航与子页面入口

**业务目的**：提供后台各业务页面的菜单入口，并明确导航与业务维护的模块边界。

**操作与规则**：导航按系统管理、配置管理、监控管理、消息管理、工作流和日志管理分组。叶页面的路由、筛选占位、表格列及可见入口按PLAT-500–543逐项列于子页规格；业务编辑规则由第2节指定的所属模块维护。菜单隐藏仅影响展示，不代替直接路由、对象标识和API上的授权。

**结果与异常处理**：目标路由无权访问、会话过期、依赖不可用和无业务数据分别呈现；菜单可见不作为授权通过的结果。

1. 用户选择菜单项后按注册路由导航，目标页服务端根据当前会话和资源范围重新判定读取权限。

**开发处理细则**：菜单项与PLAT-500–543路由逐项映射；用户、数据源、消息、工单、流程和日志写入由所属模块承接，不在导航层复制写入规则。

### PLAT-003 页面加载与查询恢复

**业务目的**：让目标页面在加载、查询和依赖故障时保持状态清楚且可恢复。

**操作与规则**：目标页面须区分首次加载、加载中、正常结果、无结果、无权限、会话失效、依赖失败和服务错误。列表查询失败时保留当前筛选和分页上下文，提供明确重试；并发查询的迟到响应不得覆盖较新的筛选结果。

**结果与异常处理**：空列表表示当前查询成功但无匹配记录；请求失败不得显示成成功空结果。重试沿用当前筛选，不触发业务写入。

1. 用户进入目标页或修改筛选并查询，页面读取结果后区分空结果与失败状态。

**开发处理细则**：加载和查询状态显式建模；为并发读取维护请求顺序或取消旧请求，失败时保留筛选及分页上下文，并提供显式重试。

### PLAT-004 授权与高影响操作边界

**业务目的**：保证平台入口及各业务对象只能在获准身份和范围内访问或变更。

**操作与规则**：服务端逐请求校验角色、租户/空间、部门及资源范围。新增、编辑、删除、解禁、密码重置、授权、测试连接、消息重发、公告发布/撤回、工单办理、流程发布/运行和日志访问分别按所属模块定义权限及状态规则。

**结果与异常处理**：直接路由、对象标识和API均拒绝越权请求；会话失效时停止后续操作并按统一认证流程恢复。对有副作用的超时操作先核查结果再决定是否重试，审计不得记录密码、令牌或数据源秘密。

1. 服务端在每次读取或写入前按当前身份、资源和业务状态授权，并记录获准或拒绝结果。

**开发处理细则**：客户端隐藏菜单只作为展示控制；业务服务端实施对象级授权、状态校验与审计。高影响写入超时后查询操作状态，禁止无条件重复提交。

## 4. 字段与业务规则

首页是卡片和导航页，不套用筛选、表格或分页。列表页字段以证据中的表头和命名控件为基线；样例行、数量、人员、IP、时间、数据源地址及动态候选不作为字段默认值、枚举或业务规则。DOM的required/maxlength/readonly/disabled仅证明当时页面属性，不证明服务端约束。

平台路由、对象权限、菜单可见性、业务写入和审计记录分别验收。PLAT-500–543的字段证据和业务负责人映射见[子页规格](./子页面与操作细化.md)；接口方法、相对路径、请求参数、错误码和响应映射只能从对应接口契约确定。

## 5. 主要业务流程

1. 已认证用户进入 `/module-common/index`，服务端按当前会话和工作空间返回允许展示的首页内容。
2. 用户从应用卡片或后台菜单选择目标，客户端导航至对应路由；服务端再次验证用户和资源权限。
3. 列表页按可见筛选条件查询并显示返回结果；无数据、网络失败、无权限和会话失效分别提示。
4. 需要改变业务状态的操作进入相应所属模块；模块规则定义确认、写入、回读、审计和结果未知后的恢复。本模块不把导航成功等同业务写入成功。

## 6. 验收标准

以下用例状态均为“未执行”。

| 验收编号 | 场景 | 检查结果 | 关联需求 | 状态 |
|---|---|---|---|---|
| PLAT-AC-001 | 打开微服务首页 | 路由、标题、工作台分组和后台导航与批准的页面规格一致。 | PLAT-001 | 未执行 |
| PLAT-AC-002 | 首页或目标页依赖失败 | 空内容、无权限、会话失效和服务失败状态彼此区分，重试不丢失导航上下文。 | PLAT-003 | 未执行 |
| PLAT-AC-632 | 首页内容 | 卡片按批准的业务分组呈现，动态业务统计不以默认0冒充加载成功。 | PLAT-001 | 未执行 |
| PLAT-AC-633 | 子页面导航 | 每个可见菜单项进入已注册子页，直接访问仍执行服务端授权。 | PLAT-002、PLAT-004 | 未执行 |
| PLAT-AC-634 | 列表空状态与错误 | 零结果、依赖失败、超时和无权限状态区分，失败时可按原筛选恢复。 | PLAT-003 | 未执行 |
| PLAT-AC-635 | 并发查询恢复 | 新筛选结果不会被旧请求迟到响应覆盖，重试不会产生重复业务写入。 | PLAT-003、PLAT-004 | 未执行 |
| PLAT-AC-636 | 角色及空间隔离 | 使用授权及越权账号/对象标识验证服务端返回范围，拒绝越权访问。 | PLAT-004 | 未执行 |

## 7. 实现与交付边界

PLAT-100–119保留为模块级CRUD覆盖追踪编号，不表示系统管理、配置、工作流或日志对象必然支持每种增删改查；实际业务范围以36–38专项规格为准。

| 编号 | 覆盖主题 | 业务规则归属 |
|---|---|---|
| PLAT-100 | 查询系统管理 | [BAS后台系统管理](../36-后台系统管理/需求说明.md) |
| PLAT-101 | 查看系统管理 | [BAS后台系统管理](../36-后台系统管理/需求说明.md) |
| PLAT-102 | 新增系统管理 | [BAS后台系统管理](../36-后台系统管理/需求说明.md) |
| PLAT-103 | 修改系统管理 | [BAS后台系统管理](../36-后台系统管理/需求说明.md) |
| PLAT-104 | 删除系统管理 | [BAS后台系统管理](../36-后台系统管理/需求说明.md) |
| PLAT-105 | 查询配置管理 | [BCF后台配置管理](../37-后台配置管理/需求说明.md) |
| PLAT-106 | 查看配置管理 | [BCF后台配置管理](../37-后台配置管理/需求说明.md) |
| PLAT-107 | 新增配置管理 | [BCF后台配置管理](../37-后台配置管理/需求说明.md) |
| PLAT-108 | 修改配置管理 | [BCF后台配置管理](../37-后台配置管理/需求说明.md) |
| PLAT-109 | 删除配置管理 | [BCF后台配置管理](../37-后台配置管理/需求说明.md) |
| PLAT-110 | 查询工作流 | [BWM后台消息、工作流与审计](../38-后台消息工作流与审计/需求说明.md) |
| PLAT-111 | 查看工作流 | [BWM后台消息、工作流与审计](../38-后台消息工作流与审计/需求说明.md) |
| PLAT-112 | 新增工作流 | [BWM后台消息、工作流与审计](../38-后台消息工作流与审计/需求说明.md) |
| PLAT-113 | 修改工作流 | [BWM后台消息、工作流与审计](../38-后台消息工作流与审计/需求说明.md) |
| PLAT-114 | 删除工作流 | [BWM后台消息、工作流与审计](../38-后台消息工作流与审计/需求说明.md) |
| PLAT-115 | 查询日志管理 | [BWM后台消息、工作流与审计](../38-后台消息工作流与审计/需求说明.md) |
| PLAT-116 | 查看日志管理 | [BWM后台消息、工作流与审计](../38-后台消息工作流与审计/需求说明.md) |
| PLAT-117 | 新增日志管理（如业务允许） | [BWM后台消息、工作流与审计](../38-后台消息工作流与审计/需求说明.md) |
| PLAT-118 | 修改日志管理（如业务允许） | [BWM后台消息、工作流与审计](../38-后台消息工作流与审计/需求说明.md) |
| PLAT-119 | 删除日志管理（如业务允许） | [BWM后台消息、工作流与审计](../38-后台消息工作流与审计/需求说明.md) |

## 8. 证据来源与关联

| 需求编号 | 证据 | 支持范围 |
|---|---|---|
| PLAT-001 | [E062-platform](../evidence/E062-platform.png) · [C037-original-content](../evidence/C037-original-content.png) | 当时首页标题、卡片分组及后台导航可见性 |
| PLAT-002 | [E062-platform](../evidence/E062-platform.png) · [N-PLAT-001–039](../evidence/live-recheck-20261022/README.md) | 历史路由、页面表头、命名控件和可见入口，详见[子页规格](./子页面与操作细化.md) |
| PLAT-003、PLAT-004 | 目标需求 | 页面恢复、服务端授权与高影响操作边界；对应应用验收尚未执行 |

需求依据、目标差异及外部接口/授权依赖见[核查记录](./核查记录.md)。

## 9. 非功能性需求

数值目标为本次提出的开发/验收建议，不是当前系统测量值或已批准SLA；产品、服务端和运维需在实施前确认，实测状态全部为“未执行”。性能分位数使用成功与失败样本分开报告，样本不足或环境不完整时不判通过。

| 编号 | 质量属性 | 目标与验收条件 | 验收方法 | 关联功能 | 状态 |
|---|---|---|---|---|---|
| PLAT-NFR-001 | 首页响应 | 从点击入口到首页主要卡片与导航可交互，P95≤3秒；30个冷启动样本，注明浏览器、网络、服务端配置。 | 浏览器性能记录加服务请求追踪；报告P50/P95、失败数和环境。 | PLAT-001、500 | 未执行 |
| PLAT-NFR-002 | 列表查询性能 | 5万条测试数据、每页20条、30个并发用户下，常用列表查询P95≤2秒，错误率≤1%。 | 隔离环境预热后至少100次查询；记录数据规模、吞吐、P50/P95及5xx/超时。 | PLAT-501–543 | 未执行 |
| PLAT-NFR-003 | 服务可用性 | 平台入口与核心管理读操作月可用率目标≥99.5%；每分钟探测，漏测/失败不计成功，维护窗口单列。 | 连续探测至少一个完整月，报告应探测/成功时隙和覆盖率。 | PLAT-001–004、500–543 | 未执行 |
| PLAT-NFR-004 | 权限隔离 | 对所有被测直接路由和对象API，未授权访问成功数为0；角色、租户、空间、部门隔离服务端判定。 | 用授权与越权身份构造正反例，覆盖菜单、直达路由、对象ID和分页查询。 | PLAT-002、004、501–543 | 未执行 |
| PLAT-NFR-005 | 秘密与个人信息 | 密码、令牌、数据源秘密不得出现在列表响应、DOM可见文本、URL、普通日志和错误消息中；敏感字段暴露为0。 | 使用测试标记在浏览器、响应、日志和导出路径中检索并核对脱敏。 | PLAT-004、509–520、525–527、537–538 | 未执行 |
| PLAT-NFR-006 | 操作审计 | 每次获准的高影响变更均记录操作者、授权范围、对象标识、动作、时间、结果和关联ID；秘密字段不入审计。 | 对创建/修改/删除/发布/办理等各执行一次成功及失败流程并核对日志；保留期按批准策略验收。 | PLAT-004、501–520、524–535 | 未执行 |
| PLAT-NFR-007 | 副作用可靠性 | 高影响写操作具备并发去重和结果未知后的状态核查；相同幂等标识重放100次只产生一次业务效果。 | 隔离环境注入超时、重复点击和迟到响应，核对数据库效果和状态回读。 | PLAT-004、501–520、524–535 | 未执行 |
| PLAT-NFR-008 | 浏览器与分辨率 | 支持Windows Chrome/Edge当前及前一主要稳定版；在1366×768、1920×1080和200%缩放下关键内容可用。 | 覆盖菜单、长文本表格、空态、错误、弹窗、横向滚动和键盘操作矩阵。 | PLAT-001–004、500–543 | 未执行 |
| PLAT-NFR-009 | 可访问性 | 键盘可达、焦点可见、表单标签/错误关联明确、非颜色唯一提示；目标符合WCAG 2.1 AA适用准则。 | 自动扫描并人工键盘/读屏检查，逐页面记录例外和修复。 | PLAT-001–004、500–543 | 未执行 |
| PLAT-NFR-010 | 可观测性 | 100%的超时、5xx和未处理前端异常可用关联ID串联浏览器、网关和服务日志；日志无秘密值。 | 在隔离环境各注入一次网络、服务和解析失败，核对关联完整度与脱敏。 | PLAT-003、004、500–543 | 未执行 |
| PLAT-NFR-011 | 配置一致性 | 高影响配置以版本化提交；部分实例更新失败不能回报整体成功，已发布版本可审计并恢复。 | 模拟多实例部分失败和回滚，确认版本、实例生效状态及恢复结果一致。 | PLAT-004、509–520、533–536、542–543 | 未执行 |
| PLAT-NFR-012 | 备份与恢复 | 平台权限、配置、工作流定义与业务关联数据目标RPO≤15分钟、RTO≤4小时；恢复后对象关系与审计链完整。 | 在隔离环境执行定期恢复演练，记录恢复点、耗时、关联完整性及重复副作用。 | PLAT-001–004、501–543 | 未执行 |

## 10. 关联资料

[子页面与操作细化](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [调研归档](./调研记录.md) · [证据索引](../证据索引.md) · [总索引](../README.md)

## AI开发审查结论

平台首页、菜单入口和44个子页面的路由、可见字段、控件及页面级验收已按证据边界细化；模块归属、异常恢复和12项非功能验收目标已建立。接口路径与请求/响应、对象级授权矩阵、业务状态机、服务端校验和目标环境实测仍缺少契约或授权环境，不能据此交付真实写入、权限安全或生产就绪实现；相关验收保持未执行。
'''


def load_reviewed(root=ROOT):
    registry = json.loads((root / '采样清单.json').read_text(encoding='utf-8'))
    module = next(item for item in registry['modules'] if item['code'] == MODULE_CODE)
    reviewed = next(item for item in registry.get('deepDive', []) if item['code'] == MODULE_CODE)
    live = root / 'evidence/live-recheck-20261022'
    samples = {
        sid: json.loads((live / f'{sid}.json').read_text(encoding='utf-8'))
        for requirement in reviewed['requirements']
        for sid in requirement['evidence']
    }
    return module, reviewed, samples


def build(root=ROOT):
    module, reviewed, samples = load_reviewed(root)
    if len(reviewed['requirements']) != 44:
        raise ValueError('PLAT reviewed evidence must contain 44 page requirements')
    main_path = root / MODULE_DIR / '需求说明.md'
    child_path = root / MODULE_DIR / '子页面与操作细化.md'
    main_path.write_text(render_main(), encoding='utf-8', newline='\n')
    child_path.write_text(render_subpage(reviewed, samples), encoding='utf-8', newline='\n')
    return main_path, child_path


if __name__ == '__main__':
    main, child = build()
    print(f'generated {main.relative_to(ROOT)}')
    print(f'generated {child.relative_to(ROOT)}')
