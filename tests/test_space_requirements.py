import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


builder = load('space_deep_builder', 'scripts/build-deep-requirements.py')
validator = load('space_validator', 'scripts/validate-requirements.py')


class SpaceRequirementsTests(unittest.TestCase):
    def test_business_registry_links_and_audit_reject_false_execution_or_lost_source(self):
        root = ROOT / 'doc/requirements'
        manifest = json.loads((root / '采样清单.json').read_text(encoding='utf-8'))
        module = next(item for item in manifest['modules'] if item['code'] == 'SPACE')
        folder = root / module['directory']
        main = (folder / '需求说明.md').read_text(encoding='utf-8')
        research = (folder / '调研记录.md').read_text(encoding='utf-8')
        evidence = {key: json.loads((root / 'evidence' / (key + '.json')).read_text(encoding='utf-8'))
                    for item in module['businessRequirements'] for key in item['evidence']}
        self.assertEqual([], validator.business_errors(main, module, research, evidence))
        self.assertEqual([], validator.development_errors(main, module))
        self.assertEqual([], validator.plain_audit_errors(main, folder))
        for file in [folder / '需求说明.md', folder / '子页面与操作细化.md', folder / '核查记录.md',
                     root / 'evidence/space-review-20261028/README.md']:
            self.assertEqual([], validator.markdown_errors(file.read_text(encoding='utf-8'), file, ROOT))
        self.assertTrue(validator.business_errors(main.replace('C035-original-content.png', 'removed.png'), module, research, evidence))
        self.assertTrue(validator.business_errors(main.replace('| SPACE-100 | 未执行 |', '| SPACE-100 | 已执行 |', 1), module, research, evidence))
        self.assertTrue(validator.business_errors(main.replace('SPACE-AC-503', 'SPACE-AC-999', 1), module, research, evidence))

    def test_reviewed_child_preserves_exact_registry_and_sources(self):
        root = ROOT / 'doc/requirements'
        manifest = json.loads((root / '采样清单.json').read_text(encoding='utf-8'))
        record = next(item for item in manifest['deepDive'] if item['code'] == 'SPACE')
        module = {'code': 'SPACE', 'directory': '33-工作空间'}
        text = (root / module['directory'] / '子页面与操作细化.md').read_text(encoding='utf-8')
        self.assertIs(record, builder.preserve_reviewed(root, module, record))
        with tempfile.TemporaryDirectory() as temp:
            temp_root = Path(temp)
            folder = temp_root / module['directory']
            folder.mkdir()
            file = folder / '子页面与操作细化.md'
            for bad, pattern in [
                (text.replace('### SPACE-500', '### SPACE-501', 1), 'registry mismatch'),
                (text.replace('V-SPACE-001.png', 'removed.png'), 'evidence missing'),
                (text.replace('<!-- 业务规格格式:plain-v1 -->', ''), 'plain format'),
            ]:
                file.write_text(bad, encoding='utf-8')
                with self.assertRaisesRegex(ValueError, pattern):
                    builder.preserve_reviewed(temp_root, module, record)
            file.write_text(text, encoding='utf-8')
            self.assertIs(record, builder.preserve_reviewed(temp_root, module, record))
            self.assertEqual(text, file.read_text(encoding='utf-8'))
            with self.assertRaisesRegex(ValueError, 'registered IDs'):
                builder.preserve_reviewed(temp_root, module, None)


if __name__ == '__main__':
    unittest.main()
