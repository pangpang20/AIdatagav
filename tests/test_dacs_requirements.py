import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('dacs_deep_builder', ROOT/'scripts/build-deep-requirements.py')
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class DacsPreservationTests(unittest.TestCase):
    def test_reviewed_dacs_preserves_order_sources_and_plain_format(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root/'dacs'
            folder.mkdir()
            target = folder/'子页面与操作细化.md'
            text = ('<!-- dacs:generated-spec-v1 -->\n<!-- 业务规格格式:plain-v1 -->\n'
                    '### DACS-500 概览\n[图](../V-DACS-001.png)\n'
                    '### DACS-508 标签\n[图](../V-DACS-009.png)\n')
            module = {'code': 'DACS', 'directory': 'dacs'}
            registered = {'requirements': [
                {'id': 'DACS-500', 'evidence': ['V-DACS-001']},
                {'id': 'DACS-508', 'evidence': ['V-DACS-009']},
            ]}
            target.write_text(text, encoding='utf8')
            self.assertIs(registered, builder.preserve_reviewed(root, module, registered))
            self.assertEqual(text, target.read_text(encoding='utf8'))
            for bad, reason in [
                (text.replace('DACS-508', 'DACS-506'), 'registry mismatch'),
                (text.replace('V-DACS-009.png', 'V-DACS-001.png'), 'evidence missing'),
                (text.replace('<!-- 业务规格格式:plain-v1 -->', ''), 'plain format'),
            ]:
                target.write_text(bad, encoding='utf8')
                with self.assertRaisesRegex(ValueError, reason):
                    builder.preserve_reviewed(root, module, registered)

    def test_real_dacs_registry_is_preserved_without_mutating_document(self):
        root = ROOT/'doc/requirements'
        registry = json.loads((root/'采样清单.json').read_text(encoding='utf8'))
        module = next(item for item in registry['modules'] if item['code'] == 'DACS')
        record = next(item for item in registry['deepDive'] if item['code'] == 'DACS')
        target = root/record['file']
        before = target.read_bytes()
        self.assertIs(record, builder.preserve_reviewed(root, module, record))
        self.assertEqual(before, target.read_bytes())
        self.assertEqual(len(record['requirements']), 13)


if __name__ == '__main__':
    unittest.main()
