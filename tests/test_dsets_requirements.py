import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('deep_requirement_builder', ROOT/'scripts/build-deep-requirements.py')
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class DsetsPreservationTests(unittest.TestCase):
    def test_dsets_reviewed_registry_and_source_rows_are_preserved(self):
        registry = json.loads((ROOT/'doc/requirements/采样清单.json').read_text(encoding='utf-8'))
        module = next(item for item in registry['modules'] if item['code'] == 'DSETS')
        registered = next(item for item in registry['deepDive'] if item['code'] == 'DSETS')
        target = ROOT/'doc/requirements'/module['directory']/'子页面与操作细化.md'
        before = target.read_bytes()
        self.assertIs(registered, builder.preserve_reviewed(ROOT/'doc/requirements', module, registered))
        self.assertEqual(before, target.read_bytes())

    def test_dsets_registry_rejects_lost_ids_or_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root/'dsets'
            folder.mkdir()
            module = {'code': 'DSETS', 'directory': 'dsets'}
            registered = {'requirements': [{'id': 'DSETS-500', 'evidence': ['F-DSETS-001']}]}
            target = folder/'子页面与操作细化.md'
            good = ('<!-- 业务规格格式:plain-v1 -->\n<!-- dsets:generated-spec-v1 -->\n'
                    '### DSETS-500 页面\n[截图](../evidence/F-DSETS-001.png)\n')
            target.write_text(good, encoding='utf-8')
            self.assertIs(registered, builder.preserve_reviewed(root, module, registered))
            for bad, reason in [
                (good.replace('DSETS-500', 'DSETS-501'), 'registry mismatch'),
                (good.replace('F-DSETS-001.png', 'missing.png'), 'evidence missing'),
                (good.replace('plain-v1', 'other'), 'plain format'),
            ]:
                target.write_text(bad, encoding='utf-8')
                with self.assertRaisesRegex(ValueError, reason):
                    builder.preserve_reviewed(root, module, registered)


if __name__ == '__main__':
    unittest.main()
