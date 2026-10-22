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
    'DQ': '管理质量规则、方案及结果，区分规则定义和检测执行',
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


def cell(value):
    return str(value).replace('|', '&#124;').replace('\n', '<br>')


def unique(values):
    return list(dict.fromkeys(x.strip() for x in values if x and x.strip()))


def evidence_link(sid):
    return f'[{sid}](../evidence/live-recheck-20261022/{sid}.png) / [页面元素](../evidence/live-recheck-20261022/{sid}.json)'


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
            rows.append((form.get('label') or field.get('placeholder') or '无可见标签',
                         '页面星标' if form.get('requiredMarker') else '未观察到星标，不等于后端可空',
                         field.get('type') or '组合控件', '；'.join(limits) or '未取得明确上下限',
                         '；'.join(flags) or '未禁用'))
    return rows


def load_groups(live):
    groups = []
    for path in [live/'crawl-ledger.json', *sorted(live.glob('crawl-ledger-*.json'))]:
        if path.exists(): groups += json.loads(path.read_text(encoding='utf-8'))
    return sorted(groups, key=lambda g: g.get('discoveredAt', ''))


def collect(groups, samples):
    objects = {}
    for group in groups:
        code = group['code']
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
        previous = {r['key']:r['id'] for r in old_docs.get(code, {}).get('requirements', [])}
        next_id = max([499, *[int(r.split('-')[-1]) for r in previous.values()]]) + 1
        features = []
        for obj in objects[code].values():
            if obj.get('source'):
                features.append({'key':obj['name']+'::页面', 'name':obj['name'], 'kind':'页面', 'source':obj['source'], 'object':obj})
            for op in obj['operations'].values():
                features.append({'key':obj['name']+'::'+op['name'], 'name':obj['name']+' → '+op['name'], 'kind':op['name'], 'source':op['source'], 'object':obj})
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
            ops = '、'.join(obj['operations']) or '未取得独立操作目标；不能据此判定产品不支持'
            out.append(f'| {cell(obj["name"])} | {source} | {cell(ops)} | {cell(last["status"])}；不等同业务通过 |')
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
                    f'【页面观察】实际路径为`{d["url"]}`。' + (f'当前可见字段：{"、".join(labels)}。' if labels else ''), '']
            if kind == '页面':
                out += ['**用户操作与系统响应**：', '',
                        f'1. 从“{feature["name"]}”进入目标页，先核对当前部门、空间及对象范围。',
                        '2. ' + ('页面提供的输入或选择提示为：'+'、'.join(conditions)+'。其匹配方式、默认值和多条件组合语义待确认。' if conditions else '当前样本没有可用于完整定义检索条件的输入，不能推测支持全文或模糊查询。'),
                        '3. ' + ('列表展示：'+'、'.join(headers)+'。记录条数、名称和当时状态属于样本。' if headers else '该页不按普通表格定义；实际卡片、图形或前置提示以来源截图为准。'),
                        '4. ' + ('可见操作包括：'+'、'.join(actions)+'。只有本文件另列并附目标页证据的操作才算已进入；其余仅确认入口可见。' if actions else '未取得可独立识别的行内操作；不推定存在维护能力。'), '']
            else:
                out += ['**操作流程**：', '',
                        f'1. 从“{feature["object"]["name"]}”点击“{kind}”，取得本节所引目标。',
                        '2. ' + ('逐项处理'+'、'.join(labels)+'；字段星标、长度和禁用状态见第4节。' if labels else '目标页没有取得完整可维护字段，不能依入口名称补造表单。'),
                        '3. 页面中的最终保存、提交、删除、运行或审批动作未执行。取消后的返回位置仅在独立操作记录明确记载时作为已观察结果。', '',
                        '【拟定需求】维护表单提交前逐字段校验；出错定位字段并保留非秘密输入。保存期间防重复提交；超时先核查结果再允许重试。修改按稳定标识回读目标与版本，取消不改变原记录。以上为拟定开发行为。', '']
            if '暂无数据' in d.get('text',''):
                out += ['【页面观察】采样中出现“暂无数据”；它可能属于列表、下拉或子表，须结合截图定位。不能据此宣称整个模块无数据，也不能用空列表证明查询失败。', '']
            if '请求异常' in d.get('text',''):
                out += ['【待确认】本样本可见“请求异常”；它不证明根因、持续故障或业务无记录。保留已加载字段，未加载部分不用于定义功能。', '']
            if '初始化' in d.get('text','') and '请先' in d.get('text',''):
                out += ['【页面文案】存在初始化前置提示；本轮未初始化，后续字段和可执行能力待取得配置后的证据。', '']
            out += [f'【拟定需求】业务依赖：{DECISIONS.get(code, "对象唯一范围、引用关系、生命周期状态、读写权限及生效条件需逐项确认；不能从当前记录样本推定全量规则。")}', '',
                    f'**来源与验证**：{evidence_link(feature["source"])}。仅验证已记载的页面打开和元素读取；接口、持久化、权限隔离和最终业务结果未验证。', '']
            rows = form_rows(d)
            if rows:
                field_sections += [f'#### {rid} 字段', '', '| 标签 | 必填依据 | 控件 | 当前约束 | 状态 |', '|---|---|---|---|---|']
                field_sections += ['| '+' | '.join(cell(x) for x in row)+' |' for row in rows]
                options = unique(o.get('text','') for o in d.get('options', []))
                if options: field_sections += ['', '【页面观察】当前同屏选项：'+ '、'.join(options)+'。选项与字段的归属按截图核对；用户、部门和数据源名称为动态样本，不是固定枚举。']
                field_sections += ['', '未给出单位的数字属性不能自行补单位；password上的min不等于minlength；只读选择输入不等于该业务字段不可选择。', '']
            suffix = rid.split('-')[-1]
            for n, scenario in enumerate([
                '有权限时进入所列路径，页面标题、字段与对象一致；无样本仍保留正确上下文',
                '加载失败后重试，保留已提交查询条件；迟到响应不能覆盖新条件',
                '越权对象和跨空间标识被服务端拒绝，列表隐藏不能代替服务端鉴权',
            ] if kind == '页面' else [
                '打开目标后必填与长度边界、禁用字段和关联对象校验分别符合批准规则',
                '取消后原记录不变；保存失败可修正；超时核查结果后重试，重复提交只产生一次效果',
                '无权限、并发更新或关联对象失效时拒绝提交且给出可恢复提示',
            ], 1):
                cases.append(f'| {code}-AC-{500+len(cases):03} | {cell(scenario)} | {rid} | 【拟定，未执行】 |')
            registered.append({'id':rid, 'key':feature['key'], 'evidence':[feature['source']]})
        out += ['## 4. 字段、枚举和约束', '', '下表逐项记录控件事实，不等同服务端规则。必填星标、HTML属性、动态候选与建议分别解释。', '', *field_sections,
                '## 5. 主要流程', '', f'业务主线：{PURPOSE.get(code, "进入对象页，按权限读取并处理对象")}。', '',
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
