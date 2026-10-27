import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('dss_deep_builder', ROOT/'scripts/build-deep-requirements.py')
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class DssPreservationTests(unittest.TestCase):
    def test_reviewed_dss_preserves_order_and_per_feature_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder=root/'dss';folder.mkdir()
            target=folder/'子页面与操作细化.md'
            text=('<!-- dss:generated-spec-v1 -->\n<!-- 业务规格格式:plain-v1 -->\n'
                  '### DSS-500 文档\n[x](../A.png)\n### DSS-508 术语\n[y](../B.png)\n')
            module={'code':'DSS','directory':'dss'}
            registered={'requirements':[{'id':'DSS-500','evidence':['A']},{'id':'DSS-508','evidence':['B']}]}
            target.write_text(text,encoding='utf8')
            self.assertIs(registered,builder.preserve_reviewed(root,module,registered))
            self.assertEqual(text,target.read_text(encoding='utf8'))
            for bad,reason in [(text.replace('DSS-508','DSS-509'),'registry mismatch'),
                               (text.replace('B.png','A.png'),'evidence missing'),
                               (text.replace('<!-- 业务规格格式:plain-v1 -->',''),'plain format')]:
                target.write_text(bad,encoding='utf8')
                with self.assertRaisesRegex(ValueError,reason):builder.preserve_reviewed(root,module,registered)

    def test_real_dss_registry_can_be_preserved_without_mutating_document(self):
        root=ROOT/'doc/requirements'
        registry=json.loads((root/'采样清单.json').read_text(encoding='utf8'))
        module=next(m for m in registry['modules'] if m['code']=='DSS')
        record=next(m for m in registry['deepDive'] if m['code']=='DSS')
        target=root/record['file'];before=target.read_bytes()
        self.assertIs(record,builder.preserve_reviewed(root,module,record))
        self.assertEqual(before,target.read_bytes())

    def test_dss_satisfies_business_registry_sources_and_plain_spec_validator(self):
        spec=importlib.util.spec_from_file_location('dss_validator', ROOT/'scripts/validate-requirements.py')
        validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(validator)
        root=ROOT/'doc/requirements'
        registry=json.loads((root/'采样清单.json').read_text(encoding='utf8'))
        module=next(m for m in registry['modules'] if m['code']=='DSS')
        folder=root/module['directory']
        data={p.stem:json.loads(p.read_text(encoding='utf8')) for p in (root/'evidence').glob('*.json')}
        main=(folder/'需求说明.md').read_text(encoding='utf8')
        archive=(folder/'调研记录.md').read_text(encoding='utf8')
        self.assertEqual([],validator.business_errors(main,module,archive,data))
        self.assertEqual([],validator.development_errors(main,module))
        for name in ['需求说明.md','子页面与操作细化.md','核查记录.md']:
            text=(folder/name).read_text(encoding='utf8')
            self.assertEqual([],validator.markdown_errors(text,folder/name,root))
            self.assertEqual([],validator.deployment_errors(text,name))
            self.assertEqual([],validator.secret_errors(text,name))
            self.assertEqual([],validator.plain_audit_errors(text,folder))


if __name__=='__main__':
    unittest.main()
