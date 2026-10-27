"""GSPA documentation checks; no business API calls or application acceptance."""
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

builder = load('gspa_builder', 'scripts/build-deep-requirements.py')
validator = load('gspa_validator', 'scripts/validate-requirements.py')

class GspaRequirementsTests(unittest.TestCase):
    def test_regeneration_retains_registry_and_rejects_lost_ids_sources_or_plain_format(self):
        root = ROOT / 'doc/requirements'
        manifest = json.loads((root / '采样清单.json').read_text(encoding='utf8'))
        module = next(m for m in manifest['modules'] if m['code'] == 'GSPA')
        registered = next(m for m in manifest['deepDive'] if m['code'] == 'GSPA')
        text = (root / module['directory'] / '子页面与操作细化.md').read_text(encoding='utf8')
        with tempfile.TemporaryDirectory() as tmp:
            temporary = Path(tmp)
            file = temporary / module['directory'] / '子页面与操作细化.md'
            file.parent.mkdir()
            file.write_text(text, encoding='utf8')
            self.assertIs(registered, builder.preserve_reviewed(temporary, module, registered))
            for bad, error in [(text.replace('### GSPA-500 ', '### GSPA-599 '), 'registry mismatch'),
                               (text.replace('V-GSPA-001.png', 'other.png'), 'evidence missing'),
                               (text.replace('<!-- 业务规格格式:plain-v1 -->', ''), 'plain format')]:
                file.write_text(bad, encoding='utf8')
                with self.assertRaisesRegex(ValueError, error):
                    builder.preserve_reviewed(temporary, module, registered)
            file.write_text(text, encoding='utf8')
            with self.assertRaisesRegex(ValueError, 'registered IDs'):
                builder.preserve_reviewed(temporary, module, None)
            with self.assertRaisesRegex(ValueError, 'registry mismatch'):
                builder.preserve_reviewed(temporary, module, {**registered, 'requirements': list(reversed(registered['requirements']))})

    def test_gspa_obeys_existing_business_security_and_delivery_validators(self):
        root = ROOT / 'doc/requirements'
        manifest = json.loads((root / '采样清单.json').read_text(encoding='utf8'))
        module = next(m for m in manifest['modules'] if m['code'] == 'GSPA')
        folder = root / module['directory']
        main = (folder / '需求说明.md').read_text(encoding='utf8')
        research = (folder / '调研记录.md').read_text(encoding='utf8')
        keys = {key for item in module['businessRequirements'] for key in item['evidence']}
        data = {key: json.loads((root / 'evidence' / (key + '.json')).read_text(encoding='utf8')) for key in keys}
        self.assertEqual([], validator.business_errors(main, module, research, data))
        self.assertEqual([], validator.development_errors(main, module))
        self.assertEqual([], validator.plain_audit_errors(main, folder))
        self.assertEqual(128, module['developmentReview']['functionalAcceptanceCases'])
        self.assertEqual(15, module['developmentReview']['nonfunctionalRequirements'])
        self.assertFalse(module['developmentReview']['productionReady'])
        for file in ['需求说明.md', '子页面与操作细化.md', '核查记录.md']:
            content = (folder / file).read_text(encoding='utf8')
            self.assertEqual([], validator.secret_errors(content, file))
            self.assertEqual([], validator.deployment_errors(content, file))
        evidence = json.loads((root / 'evidence/gspa-review-20261027/index.json').read_text(encoding='utf8'))
        for source in evidence['sources']:
            for excerpt in source['excerpts']:
                self.assertEqual([], validator.secret_errors(excerpt['text'], source['id']))
                self.assertEqual([], validator.deployment_errors(excerpt['text'], source['id']))

if __name__ == '__main__':
    unittest.main()
