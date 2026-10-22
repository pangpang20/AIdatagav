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

if __name__=='__main__':unittest.main()
