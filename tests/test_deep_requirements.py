import importlib.util
import unittest
import json
import tempfile
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('deep_builder', Path(__file__).resolve().parents[1]/'scripts/build-deep-requirements.py')
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class DeepRequirementsTests(unittest.TestCase):
    def test_preserve_reviewed_drms_requires_exact_registry_and_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder=root/'drms';folder.mkdir()
            file=folder/'子页面与操作细化.md'
            text=('<!-- drms:generated-spec-v1 -->\n<!-- 业务规格格式:plain-v1 -->\n'
                  '### DRMS-500 看板\n[E1](../E1.png)\n### DRMS-501 项目\n[E2](../E2.png)\n')
            module={'code':'DRMS','directory':'drms'}
            record={'requirements':[{'id':'DRMS-500','evidence':['E1']},{'id':'DRMS-501','evidence':['E2']}]}
            file.write_text(text,encoding='utf8')
            before=file.read_bytes()
            self.assertIs(record,builder.preserve_reviewed(root,module,record))
            self.assertEqual(before,file.read_bytes())
            self.assertIsNone(builder.preserve_reviewed(root,{'code':'OTHER'},record))
            for bad,pattern in [(text.replace('<!-- 业务规格格式:plain-v1 -->',''),'plain format'),
                                (text.replace('DRMS-501','DRMS-502'),'registry mismatch'),
                                (text.replace('E2.png','E3.png'),'evidence missing')]:
                file.write_text(bad,encoding='utf8')
                with self.assertRaisesRegex(ValueError,pattern):builder.preserve_reviewed(root,module,record)
            file.write_text(text,encoding='utf8')
            with self.assertRaisesRegex(ValueError,'registered IDs'):builder.preserve_reviewed(root,module,None)
            record['requirements'].reverse()
            with self.assertRaisesRegex(ValueError,'registry mismatch'):builder.preserve_reviewed(root,module,record)

    def test_flat_menu_and_observed_hierarchy_count_as_one_object(self):
        groups = [{'code':'X','links':[{'name':'· 任务','path':'/tasks','evidence':'a'}]},
                  {'code':'X','links':[{'name':'· 任务','hierarchy':'开发 → · 任务','path':'/tasks','evidence':'b'}]}]
        samples = {sid:{'id':sid,'text':'任务列表','headers':['名称']} for sid in ['a','b']}
        objects = builder.collect(groups, samples)['X']
        self.assertEqual(['开发 → · 任务'], list(objects))
        self.assertEqual('b', objects['开发 → · 任务']['source'])
        self.assertEqual(2, len(objects['开发 → · 任务']['attempts']))

    def test_same_named_sibling_menus_keep_separate_paths(self):
        groups = [{'code':'X','links':[{'name':'· 任务','evidence':'a'}]},
                  {'code':'X','links':[
                      {'name':'· 任务','hierarchy':'库表 → · 任务','path':'/tables','evidence':'b'},
                      {'name':'· 任务','hierarchy':'文件 → · 任务','path':'/files','evidence':'c'}]}]
        samples = {sid:{'id':sid,'text':'任务列表','headers':['名称']} for sid in ['a','b','c']}
        objects = builder.collect(groups, samples)['X']
        self.assertEqual(2, len(objects))
        self.assertEqual('b', objects['库表 → · 任务']['source'])
        self.assertEqual('c', objects['文件 → · 任务']['source'])

    def test_build_is_repeatable_with_unique_traceable_ids(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); folder = root/'01-module'; folder.mkdir()
            (folder/'需求说明.md').write_text('# 模块需求\n', encoding='utf-8')
            live = root/'evidence/live-recheck-20261022'; live.mkdir(parents=True)
            sample = {'id':'page', 'time':'2026-10-22T00:00:00Z', 'url':'/list',
                      'text':'资源列表', 'headers':['名称'], 'controls':[]}
            (live/'page.json').write_text(json.dumps(sample), encoding='utf-8')
            (live/'page.png').write_bytes(b'fixture')
            ledger = [{'code':'X','name':'模块','links':[{'name':'资源','status':'opened-review-content','evidence':'page',
                       'operations':[{'name':'审核历史','evidence':'page'}]}]}]
            (live/'crawl-ledger.json').write_text(json.dumps(ledger), encoding='utf-8')
            registry = {'modules':[{'code':'X','name':'模块','directory':'01-module'}], 'liveRecheck':{'documents':[]}}
            (root/'采样清单.json').write_text(json.dumps(registry), encoding='utf-8')
            with redirect_stdout(StringIO()): builder.build(root); builder.build(root)
            doc = (folder/'子页面与操作细化.md').read_text(encoding='utf-8')
            result = json.loads((root/'采样清单.json').read_text(encoding='utf-8'))
            self.assertEqual(['X-500','X-501'], [r['id'] for r in result['deepDive'][0]['requirements']])
            self.assertEqual(1, doc.count('### X-500 '))
            self.assertIn('X-AC-500', doc)
            self.assertIn('page.png', doc)
            self.assertIn('逐对象增删改查边界', doc)
            history = doc.split('### X-501 ', 1)[1].split('## 4.', 1)[0]
            self.assertIn('读取流程与内容', history)
            self.assertNotIn('保存期间防重复提交', history)
            self.assertEqual(1, (folder/'需求说明.md').read_text(encoding='utf-8').count('[子页面与操作细化]'))

    def test_failure_retains_previous_valid_source_and_does_not_invent_operation(self):
        groups = [{'code':'X', 'links':[
            {'name':'资源', 'evidence':'ok', 'status':'opened-review-content'},
            {'name':'资源', 'evidence':'empty', 'status':'opened-review-content',
             'operations':[{'name':'编辑', 'evidence':'empty'}]},
        ]}]
        samples = {'ok':{'id':'ok','text':'资源列表','headers':['名称']},
                   'empty':{'id':'empty','text':''}}
        obj = builder.collect(groups, samples)['X']['资源']
        self.assertEqual('ok', obj['source'])
        self.assertEqual({}, obj['operations'])
        self.assertEqual(2, len(obj['attempts']))

    def test_password_min_and_dynamic_options_do_not_become_business_rules(self):
        sample = {'forms':[{'label':'密码', 'requiredMarker':True, 'fields':[
            {'type':'password','min':'6','maxlength':'16','readonly':False,'disabled':False}]}]}
        row = builder.form_rows(sample)[0]
        self.assertIn('原始属性', row[3])
        self.assertNotIn('最短', row[3])
        self.assertEqual('页面星标', row[1])

    def test_numeric_placeholder_and_radio_copy_remain_page_evidence(self):
        rows = builder.form_rows({'forms':[
            {'label':'最大期望并发数','text':'最大期望并发数','fields':[{'type':'text','placeholder':'区间为1-10'}]},
            {'label':'共享类型','text':'共享类型\n无条件共享\n有条件共享','fields':[{'type':'radio'}]},
        ]})
        self.assertEqual('区间为1-10', rows[0][5])
        self.assertEqual('', rows[0][1])
        self.assertEqual('', rows[0][3])
        self.assertEqual('', rows[0][4])
        self.assertIn('有条件共享', rows[1][6])

    def test_unknown_field_rules_are_blank_but_observed_rules_remain(self):
        rows = builder.form_rows({'forms':[
            {'label':'名称','requiredMarker':False,'fields':[
                {'type':'text','maxlength':'24','readonly':False,'disabled':False}]},
            {'label':'密码','requiredMarker':True,'fields':[
                {'type':'password','maxlength':'16','disabled':True}]},
        ]})
        self.assertEqual(('名称', '', 'text', 'maxlength=24（当前前端字符上限）', '', '', ''), rows[0])
        self.assertEqual(('密码', '页面星标', 'password', 'maxlength=16（当前前端字符上限）', '禁用', '', ''), rows[1])

    def test_missing_field_metadata_is_blank(self):
        self.assertEqual(('', '', '', '', '', '', ''), builder.form_rows({'forms':[{}]})[0])

    def test_literal_star_in_custom_label_is_not_reported_as_absent(self):
        row = builder.form_rows({'forms':[{'label':'* 配置评价对象 （0）',
            'requiredMarker':False, 'fields':[{'type':'checkbox'}]}]})[0]
        self.assertIn('标签含*', row[1])
        self.assertNotIn('未观察到星标', row[1])

    def test_prerequisite_warning_is_not_a_maintenance_form(self):
        self.assertEqual('请选择分类', builder.prerequisite({'text':'原子指标\n警告\n请选择分类\n取 消 确 认'}))
        self.assertEqual('请选择目录！', builder.prerequisite({'text':'NL2SQL模型管理\n系统提示\n请选择目录！\n关 闭'}))
        self.assertFalse(builder.prerequisite({'text':'请选择分类','forms':[{'label':'名称'}]}))

    def test_category_modal_is_not_misreported_as_asset_registration(self):
        sample = {'url':'/dacs/dataAsset/assetCatalog',
                  'text':'数据资产目录\n新增\n添加资产类目\n上级类目名称\n全部\n类目名称\n取消\n确认'}
        self.assertEqual('资产类目', builder.operation_scope(sample))
        self.assertEqual('', builder.operation_scope({
            'url':'/other', 'text':sample['text']}))
        self.assertEqual('', builder.operation_scope({
            'url':sample['url'], 'text':'数据资产目录\n新增\n资产名称'}))

    def test_standard_tree_maintenance_is_distinct_from_record_maintenance(self):
        for path, title, scope in [
            ('/dss/standard/system/dataSetList', '添加标准模型表分类', '标准模型表分类'),
            ('/dss/standard/system/dataSetList', '编辑标准模型表分类', '标准模型表分类'),
            ('/dss/standard/system/indexItemList', '新增节点', '标准字段分类节点'),
            ('/dss/standard/system/indexCodeList', '新增节点', '标准代码分类节点'),
        ]:
            self.assertEqual(scope, builder.operation_scope({'url':path, 'text':title+'\n名称\n取消\n确认'}))
            self.assertEqual('', builder.operation_scope({'url':path, 'text':'编辑标准字段\n字段名称'}))
        self.assertEqual('', builder.operation_scope({'url':'/other', 'text':'新增节点'}))

    def test_delete_confirmation_is_reused_only_for_an_exact_unique_object(self):
        record = {'module':'X', 'name':'资源管理', 'operations':{'delete':{
            'opened':True, 'confirmationObserved':True, 'evidence':['old-confirm']}}}
        result = builder.historical_delete('X', '库表 → · 资源管理', [record])
        self.assertIn('历史确认框', result)
        self.assertIn('old-confirm.png', result)
        self.assertIn('最终删除未执行', result)
        self.assertNotIn('old-confirm', builder.historical_delete('Y', '资源管理', [record]))
        self.assertNotIn('old-confirm', builder.historical_delete('X', '资源管理', [record,record]))

    def test_model_directory_form_does_not_define_model_record_fields(self):
        sample = {'url':'/ais/modelManagement/nl2SqlModelList',
                  'text':'NL2SQL模型管理\n模型名称\n新增\n上层目录\n目录名称\n0/100\n取消确定',
                  'forms':[{'label':'上层目录'},{'label':'目录名称'}]}
        self.assertEqual('NL2SQL模型目录', builder.operation_scope(sample))
        self.assertEqual('', builder.operation_scope({
            'url':sample['url'], 'text':'新增\n模型名称\n使用库',
            'forms':[{'label':'模型名称'}]}))

    def test_crud_columns_exclude_category_forms_and_directory_prerequisites(self):
        for name, sample in [
            ('新增', {'url':'/dacs/dataAsset/assetCatalog', 'text':'添加资产类目\n类目名称\n取消\n确认'}),
            ('修改', {'url':'/ais/modelManagement/nl2SqlModelList', 'text':'系统提示\n请选择目录！\n关闭'}),
            ('分类新增', {'url':'/ais/modelManagement/nl2SqlModelList', 'text':'新增\n上层目录\n目录名称',
                         'forms':[{'label':'上层目录'},{'label':'目录名称'}]}),
        ]:
            self.assertEqual('其他', builder.operation_column(name, sample))
        self.assertEqual('新增', builder.operation_column('新增', {'url':'/records/add', 'forms':[{'label':'名称'}]}))
        self.assertEqual('编辑', builder.operation_column('编辑', {'url':'/records/edit', 'forms':[{'label':'名称'}]}))
        self.assertEqual('详情', builder.operation_column('详情', {'url':'/records/view'}))

    def test_business_notes_require_all_sources_to_be_present_and_valid(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'notes.json'
            note = {'title':'业务关系', 'evidence':['a','b'], 'observation':'页面事实',
                    'proposal':'待评审规则', 'gap':'缺口'}
            path.write_text(json.dumps({'X':[note]}), encoding='utf-8')
            samples = {'a':{'id':'a','text':'资源列表','headers':['名称']}}
            self.assertEqual([], builder.business_notes('X', samples, path))
            samples['b'] = {'id':'b','text':''}
            self.assertEqual([], builder.business_notes('X', samples, path))
            samples['b'] = {'id':'b','text':'工单详情\n返回\n基本信息\n表单信息\n审核历史\n暂无表单信息!','tabs':['表单信息']}
            result = '\n'.join(builder.business_notes('X', samples, path))
            self.assertIn('【页面观察】页面事实', result)
            self.assertIn('【拟定需求】待评审规则', result)
            self.assertIn('【待确认】缺口', result)
            self.assertIn('b.png', result)


if __name__ == '__main__':
    unittest.main()
