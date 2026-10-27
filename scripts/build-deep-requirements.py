"""Build traceable page specifications from reviewed live evidence.

Observed fields stay separate from product decisions. This never drives a browser.
"""
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'doc/requirements'
SPEC = importlib.util.spec_from_file_location('live_index', Path(__file__).with_name('index-live-recheck.py'))
IDX = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IDX)

PURPOSE = {
    'DRMS': '把部门诉求归入项目，分派协作任务，并跟踪咨询的受理情况',
    'DBMS': '组织数据调研，管理调研单位、团队、计划、报告和各类成果清单',
    'CMS': '按构件的实际类型和版本管理可复用开发资源',
    'WO': '区分待办、已办和本人发起的工单，核对业务申请及审批轨迹',
    'DS': '管理数据接入定义、驱动和部门可用范围，供后续任务选择数据源',
    'DIS': '配置来源到目的地的数据同步，并区分任务配置、执行实例、告警和对账',
    'SMS': '组织流程开发、调度配置、实例监控及开发资源，分别跟踪定义和运行结果',
    'DMS': '维护规范化模型及属性，区分模型设计、物化和执行结果',
    'GDRS': '按直报资源、模板和部门组织上报，区分填报、提交审核与统计',
    'DCS': '把资源编成目录，通过审批和发布向授权机构提供目录发现与订阅',
    'DSE': '按库表、文件、接口区分交换任务、执行日志和前置机状态',
    'GSB': '登记服务，经过申请与审批后控制服务消费和访问来源',
    'GSPA': '分别维护门户快捷入口、知识、栏目、布局、版块、内容和模板',
    'GSP': '让使用者查找可访问资源并核对资源说明及申请条件',
    'MDM': '采集和维护元数据，区分变更申请、版本、异常和血缘关系',
    'DAP': '把业务指标定义与计算口径、研发过程及可用数据源联系起来',
    'TMS': '组织标签工作组、标签模型和标签体系，分离定义与上线使用',
    'IDQS': '在批准的数据范围内提供查询，区分范围配置与实际查询结果',
    'DACS': '管理资源与资产登记、目录和台账，区分申请与正式授权',
    'DSPS': '配置数据安全处理，区分算法定义、字典、密钥、水印与执行任务',
    'DTM': '按数据表控制预览、申请和使用权限',
    'OSS': '汇总目录运营、订阅和开发情况，并核对跨系统指标来源',
    'DSS': '维护数据标准及其版本、分类、代码集和关联关系',
    'DQ': '在可访问的数据范围内组织SQL查询、历史和结果，区分查询定义与执行结果',
    'DSTS': '配置标准检测方案并读取检测报告',
    'DSETS': '组织数据分类分级、安全检测和人工复核',
    'DQTS': '通过字段分析和规则配置定义质量检测，并解释结果与异常',
    'EMS': '维护评价指标、方案与任务，按确定口径读取评价结果',
    'AIS': '管理AI辅助所需的召回、模型及授权配置',
    'RTMS': '维护报告模板，区分模板文件、设计和报告生成',
    'SPACE': '管理工作空间及成员归属，并限定各空间中的可见资源',
    'OMMS': '查看监控对象、告警和恢复信息，区分状态读取和运维动作',
    'PLAT': '提供平台管理入口；实际管理对象见独立后台模块',
}
DECISIONS = {
    'DRMS': '项目与需求的归属、需求启动/关闭条件、任务分派与完成的责任人，以及咨询转需求的关系需逐项确认。',
    'DBMS': '调研单位—团队—计划—里程碑—成果清单的关联键、成果提交条件和归集规则需确认；不同清单不能互相代替。',
    'DS': '接入定义和实际连通性分别判断；驱动、数据源类型与动态参数的组合规则需确认。凭据字段不得用于普通列表输出。',
    'DIS': '采集模式、源/目的类型、表与字段映射、并发/限速/脏数据阈值分别定义；读取表配置不能视为运行过同步。',
    'SMS': '流程定义版本、调度版本与实例标识分开保存；发布、调度、运行、重跑和实例终止的状态条件需确认。',
    'DMS': '模型设计不等同物化成功；物化目标、变更审批、物理结构差异与回滚策略需确认。',
    'GDRS': '标准化、非标准化和文件上报分别保留字段与审核规则；部门/资源前置条件未满足时不推测后续表单。',
    'DCS': '资源导入、编目、审批、发布、订阅是不同阶段；资源类型决定编目字段。事项—业务—应用系统的关系需确认。',
    'DSE': '三种交换类型分别定义来源、目的、策略与日志计量单位；交换配置保存与交换任务执行分别授权。',
    'GSB': '注册、上架、启停、消费申请、审批和IP控制的状态与权限分别确认；看到服务定义不代表可调用。',
    'GSPA': '栏目、布局、版块和内容使用各自标识；关联引用、启停生效、排序与门户缓存更新规则需确认。',
    'MDM': '采集结果、变更申请、审核和正式版本相互区分；血缘/影响分析必须可追溯到来源版本。',
    'DSS': '标准版本、代码集版本与引用对象分别管理；修改已被引用的标准时是否新建版本需产品确认。',
    'DQTS': '规则阈值、分母、空值处理、样本范围和报告有效期需定义；分析结果不能自动升级为正式检测结论。',
    'DSETS': '自动识别建议、人工复核结论和正式等级分开记录；模型建议不直接更改访问权限。',
    'AIS': '模型/召回配置可见不等于可调用；授权范围、数据出域、提示注入处理和结果依据需定义。',
    'WO': '同一申请可产生多个节点工单；办理、撤回、催办和查看分别授权，不能按按钮名称推定执行结果。',
    'SPACE': '空间成员关系不等同部门或租户角色；空间切换后的资源范围和授权继承需确认。',
}
READ_ACTIONS = {'查看', '查看详情', '详情', '资源详情', '资源信息', '运行结果', '版本管理', '业务信息', '数据字典',
                '变更信息', '查看流程图', '查看节点', '配置节点信息', '表单信息', '审核历史'}


def cell(value):
    return str(value).replace('|', '&#124;').replace('\n', '<br>')


def unique(values):
    return list(dict.fromkeys(x.strip() for x in values if x and x.strip()))


def evidence_link(sid):
    return f'[{sid}](../evidence/live-recheck-20261022/{sid}.png) / [页面元素](../evidence/live-recheck-20261022/{sid}.json)'


def prerequisite(sample):
    """Do not describe a prerequisite dialog as an opened maintenance form."""
    if sample.get('forms'):
        return ''
    lines = (sample.get('text') or '').splitlines()
    for line in lines[-12:]:
        if re.fullmatch(r'请(?:先)?选择(?:分类|数据源|分组|目录)[!！。]?', line.strip()) or line.strip() == '请先初始化':
            return line.strip()
    return ''


def operation_scope(sample):
    """Qualify a reviewed subobject without inferring from the clicked label."""
    if sample.get('url') == '/ais/modelManagement/nl2SqlModelList':
        labels = {form.get('label') for form in sample.get('forms', [])}
        if {'上层目录', '目录名称'} <= labels:
            return 'NL2SQL模型目录'
    reviewed = {
        '/dacs/dataAsset/assetCatalog': ({'添加资产类目', '修改资产类目'}, '资产类目'),
        '/dss/standard/system/dataSetList': ({'添加标准模型表分类', '修改标准模型表分类', '编辑标准模型表分类'}, '标准模型表分类'),
        '/dss/standard/system/indexItemList': ({'新增节点'}, '标准字段分类节点'),
        '/dss/standard/system/indexCodeList': ({'新增节点'}, '标准代码分类节点'),
    }
    if sample.get('url') in reviewed:
        titles, scope = reviewed[sample['url']]
        lines = (sample.get('text') or '').splitlines()[-12:]
        if any(line.strip() in titles for line in lines):
            return scope
    return ''


def operation_column(name, sample):
    """Keep category maintenance out of business-record CRUD columns."""
    directory_prompt = (sample.get('url') == '/ais/modelManagement/nl2SqlModelList'
                        and bool(prerequisite(sample)))
    if operation_scope(sample) or directory_prompt or name.startswith('分类'):
        return '其他'
    for column, names in [
        ('详情', {'查看', '详情', '查看详情'}),
        ('新增', {'新增', '新建', '库表注册', '第三方接口注册', '资源导入'}),
        ('编辑', {'编辑', '修改'}),
    ]:
        if name in names:
            return column
    return '其他'


def historical_delete(code, name, records):
    leaf = name.split(' → ')[-1].strip().lstrip('·').strip().casefold()
    matches = [r for r in records if r['module'] == code and r['name'].strip().casefold() == leaf]
    if len(matches) == 1:
        op = matches[0]['operations'].get('delete', {})
        if op.get('opened') and op.get('confirmationObserved') and op.get('evidence'):
            links = '；'.join(f'[{sid}](../evidence/{sid}.png)' for sid in op['evidence'])
            return '历史确认框：'+links+'；最终删除未执行，引用保护与真实结果待确认'
    return '未取得本轮确认页；未自动触发未知删除入口，适用性与删除保护待确认'


def business_notes(code, samples, notes_path=None):
    path = notes_path or Path(__file__).with_name('deep-business-notes.json')
    notes = json.loads(path.read_text(encoding='utf-8')).get(code, [])
    out = []
    for note in notes:
        if not all(sid in samples and not IDX.target_limitation(samples[sid]) for sid in note['evidence']):
            continue
        out += [f'### {note["title"]}', '', '【页面观察】'+note['observation'], '',
                '【拟定需求】'+note['proposal'], '', '【待确认】'+note['gap'], '',
                '来源：'+'；'.join(evidence_link(sid) for sid in note['evidence'])+'。', '']
    return out


def form_rows(sample):
    rows = []
    for form in sample.get('forms', []):
        fields = form.get('fields') or [{}]
        for field in fields:
            limits = []
            if field.get('maxlength') is not None:
                limits.append('maxlength=' + str(field['maxlength']) + '（当前前端字符上限）')
            for attr in ['min', 'max']:
                if field.get(attr) is not None:
                    limits.append(attr + '=' + str(field[attr]) + '（原始属性；单位及有效性待核对）')
            flags = []
            if field.get('readonly'): flags.append('只读输入/选择展示')
            if field.get('disabled'): flags.append('禁用')
            marker = '页面星标' if form.get('requiredMarker') else (
                '页面标签含*；必填语义待确认' if re.match(r'^\s*\*', form.get('label', ''))
                else '')
            rows.append((form.get('label') or '',
                         marker,
                         field.get('type') or '', '；'.join(limits),
                         '；'.join(flags), field.get('placeholder') or '',
                         form.get('text', '').strip()))
    return rows


def load_groups(live):
    groups = []
    for path in [live/'crawl-ledger.json', *sorted(live.glob('crawl-ledger-*.json'))]:
        if path.exists(): groups += json.loads(path.read_text(encoding='utf-8'))
    return sorted(groups, key=lambda g: g.get('discoveredAt', ''))


def collect(groups, samples):
    objects = {}
    for group in IDX.canonical_groups(groups):
        code = group['code']
        if not group['links'] and group.get('entry') in samples and not IDX.target_limitation(samples[group['entry']]):
            objects.setdefault(code, {})['主页面'] = {'name':'主页面', 'source':group['entry'],
                'attempts':[{'status':'opened-review-content'}], 'operations':{}}
        for link in group['links']:
            name = link.get('hierarchy', link['name'])
            obj = objects.setdefault(code, {}).setdefault(name, {'name':name, 'attempts':[], 'operations':{}})
            obj['attempts'].append(link)
            sid = link.get('evidence')
            if sid in samples and not IDX.target_limitation(samples[sid]):
                obj['source'] = sid
            for op in link.get('operations', []):
                sid = op.get('evidence')
                if sid in samples and not IDX.target_limitation(samples[sid]):
                    obj['operations'][op['name']] = {**op, 'source':sid}
    return objects


def preserve_reviewed(root,module,registered):
    """Keep a reviewed domain document and its exact published ledger."""
    code=module.get('code')
    if code not in ('DRMS','DBMS','CMS','WO','DS','DIS','DSS','DMS','SMS','DQ','GDRS','GSB','DSE','DCS','GSP','GSPA'):return None
    target=root/module['directory']/'子页面与操作细化.md'
    if not target.is_file():return None
    text=target.read_text(encoding='utf-8')
    if '<!-- '+code.lower()+':generated-spec-v1 -->' not in text:return None
    if '<!-- 业务规格格式:plain-v1 -->' not in text or not registered:
        raise ValueError(code+' reviewed document requires plain format and registered IDs')
    actual=re.findall(r'^### ('+code+r'-\d{3})\b',text,re.M)
    expected=[r['id'] for r in registered['requirements']]
    if actual!=expected:raise ValueError(code+' reviewed requirement registry mismatch')
    for item in registered['requirements']:
        block=re.search(r'^### '+item['id']+r'\b(.*?)(?=^### |^## |\Z)',text,re.M|re.S)
        if not item.get('evidence') or not all(s+'.png' in block.group(1) for s in item['evidence']):
            raise ValueError(code+' reviewed evidence missing: '+item['id'])
    return registered


def build(root=ROOT):
    live = root/'evidence/live-recheck-20261022'
    samples = {p.stem:json.loads(p.read_text(encoding='utf-8')) for p in live.glob('*.json')
               if p.with_suffix('.png').exists()}
    objects = collect(load_groups(live), samples)
    registry_path = root/'采样清单.json'
    registry = json.loads(registry_path.read_text(encoding='utf-8'))
    old_docs = {d['code']:d for d in registry.get('deepDive', [])}
    documents = []
    total = 0
    for module in registry['modules']:
        code = module['code']
        if code not in objects: continue
        reviewed=preserve_reviewed(root,module,old_docs.get(code))
        if reviewed is not None:
            documents.append(reviewed)
            total+=len(reviewed['requirements'])
            continue
        previous = {r['key']:r['id'] for r in old_docs.get(code, {}).get('requirements', [])}
        next_id = max([499, *[int(r.split('-')[-1]) for r in previous.values()]]) + 1
        features = []
        for obj in objects[code].values():
            if obj.get('source'):
                features.append({'key':obj['name']+'::页面', 'name':obj['name'], 'kind':'页面', 'source':obj['source'], 'object':obj})
            for op in obj['operations'].values():
                extras = [sid for sid in op.get('optionEvidence', []) if sid in samples and not IDX.target_limitation(samples[sid])]
                scope = operation_scope(samples[op['source']])
                features.append({'key':obj['name']+'::'+op['name'], 'name':obj['name']+' → '+op['name']+('（'+scope+'）' if scope else ''), 'kind':op['name'], 'source':op['source'], 'extraSources':extras, 'object':obj})
        if not features: continue
        for feature in features:
            rid = previous.get(feature['key'])
            if not rid:
                rid = f'{code}-{next_id:03}'; next_id += 1
            feature['id'] = rid
        out = [f'# {module["name"]}子页面与操作需求细化', '', '## 1. 范围与入口', '',
               f'业务目标：{PURPOSE.get(code, "按实际页面管理本模块业务对象")}。本文件补充[模块需求正文](./需求说明.md)，按真实菜单层级分开说明对象、维护页面和前置条件。', '',
               '页面字段和操作结果来自当前账号的只读取证。功能建议与页面事实分开；业务保存、删除、审批、授权及任务执行均未验收。', '',
               '## 2. 证据与观察', '', '| 实际子页面 | 取得的正文 | 已打开的操作目标 | 本次最近尝试 |', '|---|---|---|---|']
        for obj in objects[code].values():
            last = obj['attempts'][-1]
            source = evidence_link(obj['source']) if obj.get('source') else '【待确认】未取得可用目标正文'
            ops = '、'.join(name + ('（仅取得前置提示，未到表单）' if prerequisite(samples[op['source']]) else '') for name, op in obj['operations'].items()) or '未取得独立操作目标；不能据此判定产品不支持'
            out.append(f'| {cell(obj["name"])} | {source} | {cell(ops)} | {cell(last["status"])}；不等同业务通过 |')
        out += ['', '### 逐对象增删改查边界', '',
                '“未取得”表示本轮缺少独立目标，不表示产品一定支持或不支持。审批、日志、统计和运行实例等对象是否允许人工维护需单独判断。旧确认框证据继续保留于模块正文。', '',
                '| 对象/分区 | 查询/展示 | 详情 | 新增/注册/导入 | 编辑/修改 | 删除 | 其他已进入目标 |', '|---|---|---|---|---|---|---|']
        for obj in objects[code].values():
            ops = obj['operations']
            def op_links(column):
                selected = [('仅前置提示；' if prerequisite(samples[op['source']]) else '') + evidence_link(op['source']) for name, op in ops.items() if operation_column(name, samples[op['source']]) == column]
                return '；'.join(selected) or '未取得；适用性和目标待确认'
            columns = [obj['name'], evidence_link(obj['source']) if obj.get('source') else '未取得',
                       op_links('详情'), op_links('新增'), op_links('编辑'), historical_delete(code, obj['name'], registry.get('crudObjects', [])),
                       '；'.join(name + ('（'+operation_scope(samples[op['source']])+'）' if operation_scope(samples[op['source']]) else '（目录前置提示）' if samples[op['source']].get('url') == '/ais/modelManagement/nl2SqlModelList' and prerequisite(samples[op['source']]) else '') + '：'+evidence_link(op['source']) for name, op in ops.items() if operation_column(name, samples[op['source']]) == '其他') or '未取得']
            out.append('| '+' | '.join(cell(v) for v in columns)+' |')
        out += ['', '## 3. 编号功能需求', '']
        field_sections = []
        cases = []
        registered = []
        for feature in features:
            rid = feature['id']; d = samples[feature['source']]; kind = feature['kind']
            labels = unique(f.get('label', '') for f in d.get('forms', []))
            conditions = unique(c.get('label') or c.get('placeholder') for c in d.get('controls', [])
                                if c.get('tag') in ['INPUT','TEXTAREA','SELECT'] and c.get('type') != 'password')
            headers = unique(d.get('headers', []))
            actions = unique(a.get('text') or a.get('title') for a in d.get('actions', []))
            out += [f'### {rid} {feature["name"]}', '',
                    f'**业务目的**：使用者在“{feature["object"]["name"]}”处理对应对象；与其他菜单分别保留查询条件、对象标识和处理状态。', '',
                    f'【页面观察】实际路径为`{d["url"]}`。' + (f'当前页面标题：{"、".join(unique(d.get("pageTitles", [])))}。' if d.get('pageTitles') else '') + (f'当前可见字段：{"、".join(labels)}。' if labels else ''), '']
            if d.get('tabs'):
                out += ['【页面观察】可见标签：'+'、'.join(unique(d['tabs']))+'。仅标签存在不能证明其内容已打开；未单独取证的标签列为待确认。', '']
            instructions = unique(line.strip() for line in d.get('text', '').splitlines()
                                  if len(line) < 240 and any(word in line for word in ['支持格式', '支持上传', '最多上传', '单个文件', '文件大小', '格式要求', '注:', '注：', '注意:', '注意：']))
            if instructions:
                out += ['【页面文案】'+ '；'.join(instructions)+'。这是页面声明，尚未通过上传、执行或后端边界测试验证。', '']
            if kind == '页面':
                out += ['**用户操作与系统响应**：', '',
                        f'1. 从“{feature["name"]}”进入目标页，先核对当前部门、空间及对象范围。',
                        '2. ' + ('页面提供的输入或选择提示为：'+'、'.join(conditions)+'。其匹配方式、默认值和多条件组合语义待确认。' if conditions else '当前样本没有可用于完整定义检索条件的输入，不能推测支持全文或模糊查询。'),
                        '3. ' + ('列表展示：'+'、'.join(headers)+'。记录条数、名称和当时状态属于样本。' if headers else '该页不按普通表格定义；实际卡片、图形或前置提示以来源截图为准。'),
                        '4. ' + ('可见操作包括：'+'、'.join(actions)+'。只有本文件另列并附目标页证据的操作才算已进入；其余仅确认入口可见。' if actions else '未取得可独立识别的行内操作；不推定存在维护能力。'), '']
            elif prerequisite(d):
                out += [f'【操作观察】点击“{kind}”后页面提示“{prerequisite(d)}”。本次停留在前置条件提示，未取得实际维护表单；不能据此补造字段、保存流程或后端规则。', '',
                        '【待确认】分类/数据源等前置对象的选择范围、默认值、继承与切换行为；满足前置条件后的实际目标仍需独立取证。', '']
            elif kind in READ_ACTIONS:
                out += ['**读取流程与内容**：', '',
                        f'1. 从“{feature["object"]["name"]}”打开“{kind}”，读取本节引用的目标。',
                        '2. ' + ('核对'+ '、'.join(labels)+'；禁用与只读控件表示当前展示状态，不代表可直接维护。' if labels else '按目标正文、表格和图形读取内容；没有字段的标签不补造编辑表单。'),
                        '3. ' + ('结果表列：'+'、'.join(headers)+'。仅为当前样本；不推导状态全集及计算口径。' if headers else '页面没有普通结果表，实际内容见来源截图。'), '',
                        '【拟定需求】目标内容按所选对象标识、版本和当前权限读取；切换对象时清理旧内容，空结果、读取失败及无权访问分别提示，返回恢复查询上下文。读取页面不应提交业务变更。', '']
            else:
                out += ['**操作流程**：', '',
                        f'1. 从“{feature["object"]["name"]}”点击“{kind}”，取得本节所引目标。',
                        '2. ' + ('逐项处理'+'、'.join(labels)+'；字段星标、长度和禁用状态见第4节。' if labels else '目标页没有取得完整可维护字段，不能依入口名称补造表单。'),
                        '3. 页面中的最终保存、提交、删除、运行或审批动作未执行。取消后的返回位置仅在独立操作记录明确记载时作为已观察结果。', '',
                        '【拟定需求】维护表单提交前逐字段校验；出错定位字段并保留非秘密输入。保存期间防重复提交；超时先核查结果再允许重试。修改按稳定标识回读目标与版本，取消不改变原记录。以上为拟定开发行为。', '']
            if kind != '页面' and operation_scope(d):
                out += ['【操作观察】本次打开的是“'+operation_scope(d)+'”维护弹窗；仅定义该分类或类目，不能作为列表业务记录的新增或编辑证据。自定义控件标签与原始文字见来源，未提取到HTML表单属性不代表该弹窗无字段。', '']
            if '暂无数据' in d.get('text',''):
                out += ['【页面观察】采样中出现“暂无数据”；它可能属于列表、下拉或子表，须结合截图定位。不能据此宣称整个模块无数据，也不能用空列表证明查询失败。', '']
            if '请求异常' in d.get('text',''):
                out += ['【待确认】本样本可见“请求异常”；它不证明根因、持续故障或业务无记录。保留已加载字段，未加载部分不用于定义功能。', '']
            if '初始化' in d.get('text','') and '请先' in d.get('text',''):
                out += ['【页面文案】存在初始化前置提示；本轮未初始化，后续字段和可执行能力待取得配置后的证据。', '']
            source_ids = [feature['source'], *feature.get('extraSources', [])]
            out += [f'【拟定需求】业务依赖：{DECISIONS.get(code, "对象唯一范围、引用关系、生命周期状态、读写权限及生效条件需逐项确认；不能从当前记录样本推定全量规则。")}', '',
                    '**来源与验证**：'+'；'.join(evidence_link(sid) for sid in source_ids)+'。仅验证已记载的页面打开和元素读取；接口、持久化、权限隔离和最终业务结果未验证。', '']
            rows = form_rows(d)
            if rows:
                field_sections += [f'#### {rid} 字段', '', '| 标签 | 必填依据 | 控件 | 当前约束 | 状态 | 输入提示（页面文案） | 同屏字段文案/候选样本 |', '|---|---|---|---|---|---|---|']
                field_sections += ['| '+' | '.join(cell(x) for x in row)+' |' for row in rows]
                options = unique(o.get('text','') for o in d.get('options', []))
                if options: field_sections += ['', '【页面观察】当前同屏选项：'+ '、'.join(options)+'。选项与字段的归属按截图核对；用户、部门和数据源名称为动态样本，不是固定枚举。']
                for sid in feature.get('extraSources', []):
                    option_sample = samples[sid]
                    values = unique(o.get('text', '') for o in option_sample.get('options', []))
                    label = option_sample.get('interaction', {}).get('label') or '下拉控件（字段归属见截图）'
                    field_sections += ['', f'【操作观察】展开“{label}”：'+ ('、'.join(values) if values else '本次未取得候选文字，不判定产品无候选')+'。来源：'+evidence_link(sid)+'。仅当前账号和上下文候选，不作为固定枚举或候选总量上限。']
                field_sections += ['', '未给出单位的数字属性不能自行补单位；password上的min不等于minlength；只读选择输入不等于该业务字段不可选择。', '']
            suffix = rid.split('-')[-1]
            for n, scenario in enumerate([
                '未选分类、数据源或分组时只提示前置条件，不创建业务记录',
                '满足前置条件后进入正确对象表单；取消返回时不丢失原查询和分类上下文',
                '前置对象失效或失权时拒绝继续，失败与无候选分别提示并允许恢复',
            ] if prerequisite(d) else [
                '有权限时进入所列路径，页面标题、字段与对象一致；无样本仍保留正确上下文',
                '加载失败后重试，保留已提交查询条件；迟到响应不能覆盖新条件',
                '越权对象和跨空间标识被服务端拒绝，列表隐藏不能代替服务端鉴权',
            ] if kind == '页面' or kind in READ_ACTIONS else [
                '打开目标后必填与长度边界、禁用字段和关联对象校验分别符合批准规则',
                '取消后原记录不变；保存失败可修正；超时核查结果后重试，重复提交只产生一次效果',
                '无权限、并发更新或关联对象失效时拒绝提交且给出可恢复提示',
            ], 1):
                cases.append(f'| {code}-AC-{500+len(cases):03} | {cell(scenario)} | {rid} | 【拟定，未执行】 |')
            registered.append({'id':rid, 'key':feature['key'], 'evidence':source_ids})
        out += ['## 4. 字段、枚举和约束', '', '下表逐项记录控件事实，不等同服务端规则。必填星标、HTML属性、动态候选与建议分别解释。', '', *field_sections,
                '## 5. 主要流程', '', *business_notes(code, samples), f'业务主线：{PURPOSE.get(code, "进入对象页，按权限读取并处理对象")}。', '',
                DECISIONS.get(code, '跨模块关联仅在页面显示引用时建立；接口和状态契约待评审。'), '',
                '【拟定需求】查询→识别对象→打开目标→核对关联与当前版本→编辑草稿→人工确认→提交→回读结果。正式写入、审批或运行必须有独立授权和服务端结果；本次只执行其中的页面读取部分。', '',
                '## 6. 验收用例', '', '| 编号 | 场景 | 关联需求 | 执行状态 |', '|---|---|---|---|', *cases, '',
                '全部业务用例为【拟定，未执行】。截图只能支持所述界面事实，文档脚本通过不能替代应用端到端验收。', '',
                '## 7. 待确认与限制', '',
                '- P0：各对象的读写权限、唯一性范围、状态转换、引用保护、并发和保存结果契约。',
                '- P0：第2节未取得可用正文的目标；维护页后续标签、步骤、类型分支及无可用记录的详情。',
                '- P1：查询匹配与默认条件、空值和排序、分页恢复、动态候选关联、导入失败和取消策略。',
                '- 删除：本轮不自动点击可能直接删除数据的入口；已有确认框证据保留于主文档，未取得确认页的对象继续待核实。',
                '- 任务：可以打开配置，不执行生成、测试连接、发布、调度、重跑、启停或服务调用。',
                '- 开发边界：可实现有依据的界面结构和标明模拟状态的原型；生产写入、接口、算法与完整状态机仍需产品及技术确认。', '',
                '## 8. 来源链接', '', '[模块正文](./需求说明.md) · [全链接状态](../全链接核查清单.md) · [现场证据](../evidence/live-recheck-20261022/README.md) · [AI能力规划](../AI能力规划.md)', '']
        target = root/module['directory']/'子页面与操作细化.md'
        target.write_text('\n'.join(out), encoding='utf-8', newline='\n')
        main = target.with_name('需求说明.md')
        text = main.read_text(encoding='utf-8')
        marker = '[子页面与操作细化](./子页面与操作细化.md)'
        if marker not in text:
            first, rest = text.split('\n', 1)
            main.write_text(first+'\n\n本轮逐链接进入的目标、表单与字段补充见'+marker+'；未取得目标的操作仍列待确认。\n'+rest, encoding='utf-8', newline='\n')
        documents.append({'code':code, 'file':target.relative_to(root).as_posix(), 'requirements':registered})
        total += len(features)
    summary = ['# 本轮子页面深查汇总', '',
               '本轮继续实际进入菜单和安全维护页，补充业务需求。下列为取得可用页面证据的范围；不等于全部CRUD完成，也不表示业务提交或端到端验收通过。', '',
               f'当前形成{len(documents)}份子页面细化文档、{total}项有来源的功能说明，另有3份独立后台文档。需求编号与历史正文分开登记，不重复累计为应用总功能数。', '',
               '| 模块 | 细化文档 | 功能说明 | 已发现子页面 | 尚无可用正文 |', '|---|---|---|---|---|']
    for doc in documents:
        items = objects[doc['code']]
        summary.append(f'| {doc["code"]} | [{next(m["name"] for m in registry["modules"] if m["code"]==doc["code"])}](./{doc["file"]}) | {len(doc["requirements"])} | {len(items)} | {sum(not o.get("source") for o in items.values())} |')
    summary += ['', '## 需求能支持什么开发', '',
                '有明确来源的页面结构、列表字段、维护表单、必填星标、长度和当前禁用关系可以用于实现界面及带模拟标识的交互。公共加载、失败、取消、权限与重复提交处理作为拟定规则等待评审。', '',
                '生产开发仍需确认：各对象唯一范围、读写权限、状态转换、引用保护、数据模型与接口、正式保存结果、任务执行与恢复契约。没有页面证据的后续步骤不得由AI自行补成已确认规则。', '',
                '## AI能力建议', '',
                '[AI能力规划](./AI能力规划.md)已列10个场景及58条拟定验收，覆盖需求梳理、标准/元数据辅助、开发草稿、查询、质量、分类分级、目录推荐、指标标签、报告和运维解释。', '',
                '建议优先采用只产生草稿、引用明确且人工确认的能力。模型输出不直接保存业务记录、审批、发布、授权、执行SQL或启停任务；每个场景的授权输入、输出、采纳、异常与依赖在规划中逐项说明。', '',
                '## 证据与未解决事项', '',
                '[逐链接最近状态](./全链接核查清单.md)保留未访问、失败及无效目标；[现场证据索引](./evidence/live-recheck-20261022/README.md)列出每份截图的时间、路径、用途及限制。', '',
                '无数据、部门前置、初始化提示、无权限、页面未加载和真实业务不支持是不同情况。当前材料不能将这些情形合并判断，也不能把导航截图当成完整表单。', '']
    (root/'本轮子页面深查汇总.md').write_text('\n'.join(summary), encoding='utf-8', newline='\n')
    registry['deepDive'] = documents
    registry['liveRecheck']['documents'] = [d for d in registry['liveRecheck']['documents'] if d['code'] in ['BAS','BCF','BWM']] + documents
    registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print(json.dumps({'deep_documents':len(documents), 'deep_requirements':total}, ensure_ascii=False))


if __name__ == '__main__':
    build()
