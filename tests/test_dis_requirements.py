"""DIS document and regeneration checks; never exercise application APIs."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


builder = load('dis_deep_builder', 'scripts/build-deep-requirements.py')
validator = load('dis_validator', 'scripts/validate-requirements.py')


class DisRequirementsTests(unittest.TestCase):
    def test_reviewed_dis_regeneration_preserves_order_and_refuses_evidence_loss(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / 'dis'
            folder.mkdir()
            file = folder / '子页面与操作细化.md'
            text = ('<!-- dis:generated-spec-v1 -->\n<!-- 业务规格格式:plain-v1 -->\n'
                    '### DIS-513 列表\n[H1](../H1.png)\n'
                    '### DIS-519 任务\n[H2](../H2.png)\n')
            module = {'code': 'DIS', 'directory': 'dis'}
            registered = {'requirements': [{'id': 'DIS-513', 'evidence': ['H1']},
                                           {'id': 'DIS-519', 'evidence': ['H2']}]}
            file.write_text(text, encoding='utf8')
            self.assertIs(registered, builder.preserve_reviewed(root, module, registered))
            self.assertEqual(text, file.read_text(encoding='utf8'))
            for bad, error in [(text.replace('DIS-519', 'DIS-520'), 'registry mismatch'),
                               (text.replace('H2.png', 'other.png'), 'evidence missing'),
                               (text.replace('<!-- 业务规格格式:plain-v1 -->', ''), 'plain format')]:
                file.write_text(bad, encoding='utf8')
                with self.assertRaisesRegex(ValueError, error):
                    builder.preserve_reviewed(root, module, registered)
            file.write_text(text, encoding='utf8')
            with self.assertRaisesRegex(ValueError, 'registered IDs'):
                builder.preserve_reviewed(root, module, None)
            registered['requirements'].reverse()
            with self.assertRaisesRegex(ValueError, 'registry mismatch'):
                builder.preserve_reviewed(root, module, registered)

    def test_dis_specs_pass_existing_business_links_secret_and_delivery_validators(self):
        root = ROOT / 'doc/requirements'
        manifest = json.loads((root / '采样清单.json').read_text(encoding='utf8'))
        module = next(m for m in manifest['modules'] if m['code'] == 'DIS')
        folder = root / module['directory']
        main = (folder / '需求说明.md').read_text(encoding='utf8')
        research = (folder / '调研记录.md').read_text(encoding='utf8')
        keys = {key for r in module['businessRequirements'] for key in r['evidence']}
        data = {key: json.loads((root / 'evidence' / (key + '.json')).read_text(encoding='utf8'))
                for key in keys}
        self.assertEqual([], validator.business_errors(main, module, research, data))
        self.assertEqual([], validator.development_errors(main, module))
        self.assertEqual(17, module['developmentReview']['nonfunctionalRequirements'])
        self.assertFalse(module['developmentReview']['productionReady'])
        for file in ['需求说明.md', '子页面与操作细化.md', '核查记录.md']:
            text = (folder / file).read_text(encoding='utf8')
            self.assertEqual([], validator.markdown_errors(text, folder / file, root), file)
            self.assertEqual([], validator.secret_errors(text, file), file)
            self.assertEqual([], validator.deployment_errors(text, file), file)
            if file != '核查记录.md':
                self.assertEqual([], validator.plain_audit_errors(text, folder), file)


if __name__ == '__main__':
    unittest.main()
