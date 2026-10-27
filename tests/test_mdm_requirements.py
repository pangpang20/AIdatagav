import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('mdm_deep_builder', ROOT/'scripts/build-deep-requirements.py')
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class MdmPreservationTests(unittest.TestCase):
    def test_reviewed_mdm_preserves_order_sources_and_plain_format(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);folder=root/'mdm';folder.mkdir()
            target=folder/'子页面与操作细化.md'
            text=('<!-- mdm:generated-spec-v1 -->\n<!-- 业务规格格式:plain-v1 -->\n'
                  '### MDM-500 首页\n[x](../A.png)\n### MDM-508 审核\n[y](../B.png)\n')
            module={'code':'MDM','directory':'mdm'}
            registered={'requirements':[{'id':'MDM-500','evidence':['A']},{'id':'MDM-508','evidence':['B']}]}
            target.write_text(text,encoding='utf8')
            self.assertIs(registered,builder.preserve_reviewed(root,module,registered))
            self.assertEqual(text,target.read_text(encoding='utf8'))
            for bad,reason in [(text.replace('MDM-508','MDM-506'),'registry mismatch'),
                               (text.replace('B.png','A.png'),'evidence missing'),
                               (text.replace('<!-- 业务规格格式:plain-v1 -->',''),'plain format')]:
                target.write_text(bad,encoding='utf8')
                with self.assertRaisesRegex(ValueError,reason):builder.preserve_reviewed(root,module,registered)

    def test_real_mdm_registry_is_preserved_without_mutating_document(self):
        root=ROOT/'doc/requirements'
        registry=json.loads((root/'采样清单.json').read_text(encoding='utf8'))
        module=next(m for m in registry['modules'] if m['code']=='MDM')
        record=next(m for m in registry['deepDive'] if m['code']=='MDM')
        target=root/record['file'];before=target.read_bytes()
        self.assertIs(record,builder.preserve_reviewed(root,module,record))
        self.assertEqual(before,target.read_bytes())


if __name__=='__main__':
    unittest.main()
