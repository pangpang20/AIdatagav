import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/validate-requirements.py'
spec=importlib.util.spec_from_file_location('validator',SCRIPT)
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)

class RequirementsValidationTests(unittest.TestCase):
    def test_missing_local_link_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            errors=v.markdown_errors('[missing](./absent.png)',root/'sample.md',root)
            self.assertTrue(any('missing link' in e for e in errors))

    def test_existing_unicode_link_resolves(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'证据.png').write_bytes(b'x')
            self.assertEqual([],v.markdown_errors('[有效](./%E8%AF%81%E6%8D%AE.png)',root/'a.md',root))

    def test_duplicate_requirement_is_rejected(self):
        errors=v.markdown_errors('### AUTH-001 a\n\n### AUTH-001 b',Path('C:/docs/a.md'),Path('C:/docs'))
        self.assertTrue(any('duplicate requirement' in e for e in errors))

    def test_acceptance_without_status_is_rejected(self):
        errors=v.markdown_errors('| AUTH-AC-001 | 描述 |',Path('C:/docs/a.md'),Path('C:/docs'))
        self.assertTrue(any('execution status' in e for e in errors))

    def test_duplicate_acceptance_with_different_description_is_rejected(self):
        text='| AUTH-AC-001 | A | 【拟定，未执行】 |\n| AUTH-AC-001 | B | 【拟定，未执行】 |'
        errors=v.markdown_errors(text,Path('C:/docs/a.md'),Path('C:/docs'))
        self.assertTrue(any('duplicate acceptance' in e for e in errors))

    def test_secret_assignment_is_rejected_without_echo(self):
        value='synthetic_'+'credential_123456'
        errors=v.secret_errors(json.dumps({'access_token':value}),'fixture')
        self.assertTrue(errors)
        self.assertNotIn(value,' '.join(errors))

    def test_business_samples_are_allowed(self):
        self.assertEqual([],v.secret_errors('陈云亮 / 达梦B / 172.16.1.40 / DAY','fixture'))

    def test_corrupted_png_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'bad.png';path.write_bytes(b'not png')
            with self.assertRaises(ValueError):v.png_check(path)

    def test_crud_requires_all_operation_statuses(self):
        errors=v.crud_errors([{'module':'DS','name':'source','operations':{'list':{'evidence':['E1']}}}],{'E1':{}})
        self.assertTrue(any('incomplete CRUD' in e for e in errors))

    def test_navigation_only_cannot_prove_opened_form(self):
        ops={k:{'opened':True,'evidence':['E1']} for k in ['list','detail','add','edit','delete']}
        errors=v.crud_errors([{'module':'DS','name':'source','operations':ops}],{'E1':{'elements':{'menus':[{'text':'menu'}]}}})
        self.assertTrue(any('navigation-only' in e for e in errors))

    def test_read_only_crud_rejects_business_write_claim(self):
        ops={k:{'opened':False,'evidence':['E1'],'businessWriteExecuted':k=='delete'} for k in ['list','detail','add','edit','delete']}
        errors=v.crud_errors([{'module':'DS','name':'source','operations':ops}],{'E1':{}})
        self.assertTrue(any('exceeds read-only' in e for e in errors))

    def test_complete_evidence_backed_crud_statuses_are_allowed(self):
        ops={k:{'opened':k=='list','evidence':['E1'],'businessWriteExecuted':False} for k in ['list','detail','add','edit','delete']}
        self.assertEqual([],v.crud_errors([{'module':'DS','name':'source','operations':ops}],{'E1':{'elements':{'headers':['name']}}}))

    def test_stale_route_content_cannot_prove_operation_opened(self):
        ops={k:{'opened':k=='add','evidence':['E1'],'businessWriteExecuted':False} for k in ['list','detail','add','edit','delete']}
        data={'E1':{'quality':{'targetValid':False,'reason':'previous page retained'},'elements':{'fields':[{'label':'old form'}]}}}
        errors=v.crud_errors([{'module':'GDRS','name':'resource','operations':ops}],data)
        self.assertTrue(any('invalid target' in e for e in errors))

    def test_legacy_controls_remain_usable_as_page_evidence(self):
        ops={k:{'opened':k=='add','evidence':['E1'],'businessWriteExecuted':False} for k in ['list','detail','add','edit','delete']}
        self.assertEqual([],v.crud_errors([{'module':'MDM','name':'collection','operations':ops}],{'E1':{'controls':[{'tag':'INPUT','label':'任务名称'}]}}))

    def test_observed_card_requires_matching_visible_text(self):
        ops={k:{'opened':k=='list','evidence':['E1'],'businessWriteExecuted':False} for k in ['list','detail','add','edit','delete']}
        ops['list']['observedCards']=['P20250728001']
        self.assertEqual([],v.crud_errors([{'module':'SPACE','name':'space','operations':ops}],{'E1':{'text':'工作空间 P20250728001'}}))
        self.assertTrue(v.crud_errors([{'module':'SPACE','name':'space','operations':ops}],{'E1':{'text':'工作台'}}))

    def test_expanded_field_table_rejects_unsupported_length(self):
        row='| 名称 | text；可输入 | 有 | 示例 | maxlength=200 | [E1](../evidence/E1.png) |'
        data={'E1':{'elements':{'fields':[{'label':'名称','maxlength':100}]}}}
        self.assertTrue(v.field_constraint_errors(row,data,'DS'))
        self.assertEqual([],v.field_constraint_errors(row.replace('200','100'),data,'DS'))

    def test_historical_field_table_and_placeholder_are_checked(self):
        row='| 请输入账号 | text | 请输入账号 | maxlength=20 | [E1](../evidence/E1.png) |'
        data={'E1':{'controls':[{'placeholder':'请输入账号','maxlength':'20'}]}}
        self.assertEqual([],v.field_constraint_errors(row,data,'AUTH'))
        self.assertTrue(v.field_constraint_errors(row.replace('20','21'),data,'AUTH'))

    def test_summary_row_is_not_a_field_definition(self):
        row='| 账号 | text；maxlength=20 | [E1](../evidence/E1.png) |'
        self.assertEqual([],v.field_constraint_errors(row,{'E1':{}},'AUTH'))

    def test_missing_markdown_fragment_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'需求.md').write_text('## 4. 字段、枚举和约束\n',encoding='utf8')
            errors=v.markdown_errors('[字段](./需求.md#absent)',root/'index.md',root)
            self.assertTrue(any('missing fragment' in e for e in errors))

    def test_existing_unicode_fragment_resolves(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'需求.md').write_text('## 4. 字段、枚举和约束\n',encoding='utf8')
            self.assertEqual([],v.markdown_errors('[字段](./需求.md#4-字段枚举和约束)',root/'index.md',root))

if __name__=='__main__':unittest.main()
