import importlib.util
import hashlib
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

class BusinessRequirementsValidationTests(unittest.TestCase):
    def setUp(self):
        self.module={'code':'DS','businessRequirements':[{'id':'DS-107','evidence':['E1']}],
                     'businessAcceptance':['DS-AC-001']}
        self.data={'E1':{'elements':{'fields':[{'label':'名称','maxlength':100}]}}}
        self.research='### DS-107 来源 — 新增\n### DS-108 来源 — 编辑\n'
        self.text=(
            '## 1. 目标\n## 2. 范围\n## 3. 功能需求\n'
            '### DS-107 新增来源\n\n**业务目的**：登记来源。\n\n**操作与规则**：\n\n'
            '1. 用户填写来源名称。\n\n**结果与异常处理【拟定需求】**：提交后提示结果。\n'
            '## 4. 字段\n| 名称 | 输入 | 待确认 | 当前输入上限100字符 | DS-107 |\n'
            '## 5. 流程\n## 6. 验收\n'
            '| DS-AC-001 | 新增 | 提交 | DS-107 | 【拟定，未执行】 |\n'
            '## 7. 待确认\n| DS-108 | 修改来源 | 可修改范围待确认 |\n'
            '## 8. 依据\n| DS-107 | [E1](../evidence/E1.png) | 附录 |\n')

    def check(self,text=None):
        return v.business_errors(text or self.text,self.module,self.research,self.data)

    def test_business_draft_can_reference_preserved_research(self):
        self.assertEqual([],self.check())

    def test_business_rule_without_purpose_is_rejected(self):
        self.assertTrue(any('business purpose' in x for x in self.check(self.text.replace('**业务目的**：登记来源。',''))))

    def test_empty_business_step_is_rejected(self):
        self.assertTrue(any('empty step' in x for x in self.check(self.text.replace('1. 用户填写来源名称。','1. '))))

    def test_business_acceptance_cannot_claim_execution(self):
        self.assertTrue(any('unexecuted' in x for x in self.check(self.text.replace('【拟定，未执行】','【已执行】'))))

    def test_unobserved_operation_cannot_disappear(self):
        self.assertTrue(any('operation coverage' in x for x in self.check(self.text.replace('| DS-108 | 修改来源 | 可修改范围待确认 |',''))))

    def test_business_fields_reject_invented_limit(self):
        self.assertTrue(any('unsupported business constraint' in x for x in self.check(self.text.replace('上限100字符','上限200字符'))))

    def test_business_source_cannot_use_invalid_target(self):
        self.data['E1']['quality']={'targetValid':False}
        self.assertTrue(any('invalid business source' in x for x in self.check()))

    def test_business_acceptance_requires_existing_requirement(self):
        self.assertTrue(any('acceptance reference' in x for x in self.check(self.text.replace('| 提交 | DS-107 |','| 提交 | DS-999 |'))))

    def test_missing_business_source_is_rejected(self):
        self.assertTrue(any('missing business source' in x for x in self.check(self.text.replace('[E1](../evidence/E1.png)','无来源'))))

    def test_research_archive_rejects_modified_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'调研记录.md'
            raw='原始调研证据。\n'.encode('utf8');path.write_bytes(raw)
            module={'researchSha256':hashlib.sha256(raw).hexdigest(),'code':'DS'}
            self.assertEqual([],v.archive_errors(path,module))
            path.write_text('变化后的记录。\n',encoding='utf8')
            self.assertTrue(any('archive hash' in x for x in v.archive_errors(path,module)))

if __name__=='__main__':unittest.main()
