"""Index the new browser evidence without altering historical observations."""
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / 'doc/requirements'
LIVE = ROOT / 'evidence/live-recheck-20261022'
INVALID = {
    'R002-user-menu': '采样早于菜单展开，正文仍为工作台，不证明菜单。',
    'R010-admin-users': '路由先变化，正文仍为首页，不证明用户列表。',
    'R021-department-edit': '未选择部门时点击修改，未打开编辑表单。',
    'R063-tag-list': '导航后正文尚未加载完整，以R033为列表证据。',
    'R063-tag-0': '点击后没有取得新增表单，不证明新增目标已打开。',
}
# These captures changed route while the previous maintenance form remained.
INVALID.update({f'L-GDRS-{i:03}': '路由已变化但正文仍为选项配置新增，不能证明目标页面。' for i in range(9, 22)})
INVALID['L-GDRS-009-op1'] = '目标类别页未加载，点击的仍为选项配置表单，不证明类别新增。'
INVALID.update({sid:'点击后没有取得新的详情内容，仍为原空列表。' for sid in ['X-DSE-007-op1','X-DSE-008-op1']})
INVALID.update({sid:'正文仅加载外壳和导航，未取得该目标的业务内容。' for sid in ['X-DSE-009','X-GSB-002','X-GSB-005']})
INVALID['W-GDRS-024'] = '该次数据查看页面正文为空，不能证明目标内容。'
INVALID['X-GSPA-002-op1'] = '点击后仍为知识列表，未取得独立维护页。'
INVALID['X-GSPA-005-op1'] = '点击后仍为版块列表，未取得独立维护页。'
INVALID.update({sid:'栏目/布局菜单点击未完成，正文仍为知识列表；表单属于知识管理，不能证明该菜单目标。' for sid in [
    'X-GSPA-003','X-GSPA-003-op1','X-GSPA-003-op1-options0',
    'X-GSPA-004','X-GSPA-004-op1','X-GSPA-004-op1-options0']})
INVALID.update({sid:'内容菜单点击未完成，实际采得版块列表/新增，不能证明内容管理。' for sid in ['X-GSPA-006','X-GSPA-006-op1','X-GSPA-006-op1-options0']})
INVALID['X-MDM-001-op1'] = '路由为版本管理，正文仍为采集列表；未取得采集操作目标。'
INVALID['X-MDM-002-op1'] = '变更菜单的维护目标未取得，实际打开版本管理，不证明变更新增。'
INVALID['Y-DIS-003'] = '菜单为库离线同步，实际路径和正文为表同步；不能证明库离线页面。'
INVALID['Y-DIS-003-op1'] = '来自错配的库离线菜单，实际为表同步新增；保留原表单但不用于库离线需求。'
INVALID['P-DRMS-003-op1'] = '需求新增的截图、正文实际为新增项目，不能证明新增需求目标。'
INVALID['P-DRMS-003'] = '我的需求路径和菜单下正文仍为项目列表；仅支持导航，完整需求列表使用Y-DRMS-003。'
INVALID['P-DRMS-008'] = '咨询处理路径和菜单下正文仍为咨询列表；仅支持导航，处理页两页签使用Z-DRMS-008。'
INVALID['Z-DS-006'] = 'kafka菜单路径下正文与表头仍为API数据源，不证明kafka数据源目标。'
INVALID['N-TMS-009'] = '手工标签路径下正文仍为属性分析，且截图期间正文变化，不能证明手工标签目标。'
INVALID['Q-GSPA-000-entry'] = '正文只显示外壳，元素采样与正文不在同一加载阶段，不作为门户完整目标。'
INVALID['O-DSS-002'] = '标准术语路径下正文仍为标准文档管理，不证明标准术语目标。'
INVALID['N-DACS-007'] = '资产画像路径下正文仍为全部审批记录，不证明资产画像目标。'
INVALID.update({sid:'应用系统管理操作实际打开事项维护表单，不能用于应用系统字段。' for sid in [
    'J-DCS-009','J-DCS-009-op1','J-DCS-009-op1-options0','J-DCS-009-op1-options1','J-DCS-009-op1-options2','J-DCS-009-op1-options3']})
INVALID['N-DACS-004'] = '我的待办路径下正文仍为数据资产目录，不能证明待办目标。'
INVALID['O-DSS-008'] = '标准字段审批路径下正文和表头仍为标准模型表申请，不证明字段审批。'
INVALID['O-DSTS-003'] = '检测报告路径下正文仍为标准检测任务，不证明报告目标。'
INVALID['N-DAP-007'] = '原子指标路径下正文和表头仍为业务过程，不证明原子指标目标。'
INVALID['N-DAP-014'] = '汇总逻辑表路径下正文仍为事实逻辑表，不证明汇总逻辑表目标。'
INVALID['N-DAP-021'] = '告警管理路径下正文和表头仍为监控规则管理，不证明告警目标。'
INVALID['O-DSETS-005'] = '数据分级模板路径下正文仍为索引表管理，不证明数据分级模板目标。'
INVALID['N-TMS-012'] = '文件标签路径下正文为资产标签；是否共用组件未确认，不用于定义文件标签特有行为。'
INVALID['N-TMS-015'] = '我的申请路径下正文为变更管理；个人范围和共用组件关系未确认。'
INVALID['U-BWM-model-diagram'] = '流程名称点击后路由与正文尚未切换，仍为模型列表；以diagram-ready为流程图证据。'
INVALID['U-BWM-node-config'] = '配置弹窗尚未展开完整，仅取得节点属性面板；以node-config-ready及bottom为配置证据。'
INVALID.update({f'H-GDRS-{i:03}':'点击相应上报菜单后仍停留在库表任务管理路径，未取得所选上报目标；不推断重定向原因。' for i in range(15, 24)})
INVALID['H-SMS-019-op1'] = '点击新增后仍为代码映射列表及请求异常，未取得维护目标，不能补造映射表单。'
INVALID['H-DS-002'] = '数据源管理路径下正文仍为驱动管理；截图期间正文变化，不能用作数据源列表证据，独立维护目标另行判断。'
INVALID['H-SMS-020'] = '函数管理路径下正文仍为源与标准映射管理，不能证明函数列表；函数新增目标另行判断。'


def target_limitation(d):
    reason = INVALID.get(d['id'], '')
    if not (d.get('text') or '').strip():
        reason = reason or '页面正文为空，未取得目标内容。'
    if '您访问的内容不存在，请确认访问地址是否正确' in (d.get('text') or ''):
        reason = reason or '实际取得内容不存在错误页；截图保留，但未取得所选业务目标内容。'
    if d.get('operation', {}).get('changedContent') is False:
        reason = reason or '操作后正文和目标路径未变化，未取得独立目标内容。'
    if not d.get('forms') and not d.get('headers') and not d.get('actions'):
        lines = set((d.get('text') or '').splitlines())
        shell = set(d.get('navigation', [])) | {
            'myspace', '消息通知', '工作台', '默认租户', '欢迎，陈云亮',
            '数据运营平台', '需求管理', '数据开发', '数据一体化', '数据资产', '数据评价', '后台', d.get('title', '')}
        if len(lines - shell) < 4:
            reason = reason or '仅有外壳或导航文字，尚无可用于定义业务功能的目标内容。'
    return reason


def canonical_groups(groups):
    """Reconcile early flat menus with later observed hierarchy, without merging siblings."""
    def leaf(link):
        return link['name'].strip().lstrip('·').strip()
    candidates = {}
    for group in groups:
        for link in group['links']:
            if link.get('hierarchy') and link['hierarchy'] != link['name']:
                candidates.setdefault((group.get('code', group.get('name')), leaf(link)), {})[link['hierarchy']] = link.get('path')
    result = []
    for group in groups:
        links = []
        for link in group['links']:
            item = dict(link)
            if not link.get('hierarchy'):
                options = candidates.get((group.get('code', group.get('name')), leaf(link)), {})
                exact = [name for name, path in options.items() if path and path == link.get('path')]
                if len(exact) == 1:
                    item['hierarchy'] = exact[0]
                elif len(options) == 1:
                    item['hierarchy'] = next(iter(options))
                elif len(options) > 1:
                    # Keep the raw ledger as history; an ambiguous flat observation
                    # must not become an extra current menu or be assigned arbitrarily.
                    continue
            links.append(item)
        result.append({**group, 'links':links})
    return result


def select_groups(groups):
    """Merge discovered links by hierarchy; preserve each attempt and good source."""
    latest = {}
    for group in sorted(canonical_groups(groups), key=lambda g: g.get('discoveredAt', '')):
        code = group.get('code', group['name'])
        if code not in latest:
            latest[code] = {**group, 'links': []}
        result = latest[code]
        by_key = {(l.get('hierarchy', l['name']), l.get('occurrence', 0)): i for i, l in enumerate(result['links'])}
        for link in group['links']:
            key = (link.get('hierarchy', link['name']), link.get('occurrence', 0))
            if key not in by_key:
                result['links'].append(link.copy())
                by_key[key] = len(result['links']) - 1
            else:
                old = result['links'][by_key[key]]
                attempts = old.get('attempts', []) + [{k:v for k,v in old.items() if k != 'attempts'}]
                # Keep later failure visible without discarding a previous source.
                result['links'][by_key[key]] = {**link, 'attempts': attempts}
    return latest


def cell(value):
    return str(value).replace('|', '&#124;').replace('\n', '<br>')


def load_samples():
    samples = []
    for path in sorted(LIVE.glob('*.json')):
        if path.name in ['crawl-ledger.json', 'manifest.json']:
            continue
        d = json.loads(path.read_text(encoding='utf-8'))
        if 'id' not in d:
            continue
        d['image'] = path.with_suffix('.png').relative_to(ROOT).as_posix()
        d['metadata'] = path.relative_to(ROOT).as_posix()
        reason = target_limitation(d)
        d['targetValid'] = not bool(reason)
        d['limitation'] = reason
        if d.get('blockedRequests'):
            d['limitation'] += ' 部分请求被只读保护阻断；空候选或错误不能直接归为应用缺陷。'
        if d.get('captureTimingLimit'):
            d['limitation'] += ' 截图期间正文发生变化，应分别核对图像与元素时间。'
        samples.append(d)
    return samples


def main():
    samples = load_samples()
    rows = ['# 现场复核证据索引', '',
            '来源：用户手动登录后的可见受控Chrome，Playwright实际导航/展开/打开表单。视口1500×1000。', '',
            '截图与JSON保留页面业务原文，仅供本项目获授权人员查阅；不保存密码输入值、请求头、Cookie或Token。页面自身隐藏值不推测恢复。', '',
            '打开和取消是只读观察，不能证明保存、删除、授权、发布或任务执行成功。无效目标采样逐条保留并标记。', '',
            '[总索引](../../README.md) · [逐链接状态](../../全链接核查清单.md) · [运行尝试与限制](./运行尝试与限制.md)', '',
            '| 证据 | 北京时间 | 路径 | 用途/状态 | 限制 |', '|---|---|---|---|---|']
    for d in samples:
        stamp = datetime.fromisoformat(d['time'].replace('Z', '+00:00')).astimezone(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
        rows.append(f"| [{d['id']}](./{d['id']}.png) / [JSON](./{d['id']}.json) | {stamp} | {cell(d['url'])} | {'页面/控件观察，业务未提交' if d['targetValid'] else '无效目标证据'} | {cell(d['limitation'] or '仅当前账号、当前样本及可见区域；服务端行为未验收')} |")
    (LIVE / 'README.md').write_text('\n'.join(rows) + '\n', encoding='utf-8', newline='\n')
    manifest = {'source': 'visible-controlled-chrome', 'readOnly': True,
                'businessWritesExecuted': False, 'samples': [
                    {k: d[k] for k in ['id', 'time', 'url', 'image', 'metadata', 'targetValid', 'limitation']} for d in samples]}
    (LIVE / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    ledger = LIVE / 'crawl-ledger.json'
    groups = json.loads(ledger.read_text(encoding='utf-8')) if ledger.exists() else []
    backend = LIVE / 'backend-ledger.json'
    if backend.exists():
        groups += json.loads(backend.read_text(encoding='utf-8'))
    for extra in sorted(LIVE.glob('crawl-ledger-*.json')):
        groups += json.loads(extra.read_text(encoding='utf-8'))
    latest = select_groups(groups)
    limitations = {d['id']: d['limitation'] for d in samples if not d['targetValid']}
    by_id = {d['id']:d for d in samples}
    out = ['# 全链接核查清单', '',
           '按真实展开的菜单登记发现范围。状态仅表示页面访问和证据取得，不是业务验收。未提交任何业务写入。', '',
           '后台复核证据及表单见[现场证据索引](./evidence/live-recheck-20261022/README.md)；账号弹窗见[用户菜单需求](./02-工作台/用户菜单补充清单.md)。', '',
           '| 模块 | 实际菜单 | 目标路径 | 状态 | 证据 |', '|---|---|---|---|---|']
    states = {'pending': '未访问', 'opened-review-content': '已取得采样，正文及适用范围须结合需求核对',
              'opened-with-request-limits': '已打开，部分请求受保护限制',
              'navigation-error': '导航未完成，不能计为已覆盖',
              'target-not-observed': '点击后未取得独立目标，不能计为已覆盖',
              'write-risk-not-opened': '名称涉及写入，未直接执行'}
    def attempt_cells(item):
        sid = item.get('evidence')
        evidence = f'[截图](./evidence/live-recheck-20261022/{sid}.png)' if sid else '未取得'
        state = '无效目标：' + limitations[sid] if sid in limitations else states.get(item['status'], item['status'])
        path = cell(item.get('path') or '未知')
        history = item.get('attempts', [])
        if history and item['status'] == 'pending':
            state = '最近队列未处理'
        prior = next((by_id[a['evidence']] for a in reversed(history)
                      if a.get('evidence') in by_id and by_id[a['evidence']]['targetValid']), None)
        if prior and (not sid or sid in limitations):
            state += '；历史可用目标，不能据此称最近重访成功'
            evidence += f'；[历史可用目标](./evidence/live-recheck-20261022/{prior["id"]}.png)'
            path += '；历史：' + cell(prior['url'])
        return path, state, evidence

    for g in latest.values():
        for link in g['links']:
            path, state, evidence = attempt_cells(link)
            out.append(f"| {cell(g['name'])} | {cell(link.get('hierarchy', link['name']))} | {path} | {state} | {evidence} |")
            operations = {}
            for attempt in [*link.get('attempts', []), link]:
                for op in attempt.get('operations', []):
                    operations.setdefault(op['name'], []).append(op)
            for name, attempts in operations.items():
                op = {**attempts[-1], 'attempts':attempts[:-1]}
                path, state, evidence = attempt_cells(op)
                if not any(o['name'] == name for o in link.get('operations', [])):
                    state = '历史操作目标；' + state
                out.append(f"| {cell(g['name'])} | {cell(link.get('hierarchy', link['name']))} → {cell(name)} | {path} | {state} | {evidence} |")
    out += ['', '## 核查边界', '',
            '同一模块多轮取证时，按采样时间合并不同层级菜单并显示最近尝试；最近队列未处理、失败或无效时并列保留历史可用目标，历史维护操作也保留且单独标记。旧尝试保留于现场目录的crawl-ledger及证据索引。早期平铺菜单仅在名称或路径能唯一对应时并入后来实际层级；无法定位父级的旧同名项保留在原始日志，不额外计为当前菜单。失败不会抹去历史证据，重复采样不相加为覆盖数量。', '',
            '新增/编辑表单可打开，但保存、删除最终确认、改密、部门切换、退出、重发、启停、部署和流程状态改变未执行。', '',
            '列表中不同业务对象可能打开不同类型详情；本清单不把首条样本代表为全部状态与全部记录。无样本、动态字段、分页后记录、嵌套标签和权限分支按各模块缺口继续列明。']
    (ROOT / '全链接核查清单.md').write_text('\n'.join(out) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'live_samples': len(samples), 'invalid_targets': sum(not s['targetValid'] for s in samples),
                      'module_walks': len(groups), 'latest_module_groups': len(latest),
                      'discovered_menu_links': sum(len(g['links']) for g in latest.values())}, ensure_ascii=False))


if __name__ == '__main__':
    main()
