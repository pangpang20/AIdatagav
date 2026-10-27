"""DAP requirement-document and generator regression checks; no app APIs are called."""
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

builder = load('dap_deep_builder', 'scripts/build-deep-requirements.py')
validator = load('dap_validator', 'scripts/validate-requirements.py')

class DapRequirementsTests(unittest.TestCase):
    def test_reviewed_subpage_registry_survives_deep_build_and_rejects_loss(self):
        base = ROOT / 'doc/requirements'
        manifest = json.loads((base / '采样清单.json').read_text(encoding='utf8'))
        module = next(x for x in manifest['modules'] if x['code'] == 'DAP')
        registered = next(x for x in manifest['deepDive'] if x['code'] == 'DAP')
        text = (base / module['directory'] / '子页面与操作细化.md').read_text(encoding='utf8')
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp) / module['directory']
            folder.mkdir(parents=True)
            target = folder / '子页面与操作细化.md'
            target.write_text(text, encoding='utf8')
            self.assertIs(registered, builder.preserve_reviewed(Path(tmp), module, registered))
            for bad, error in [(text.replace('### DAP-500 ', '### DAP-599 '), 'registry mismatch'),
                               (text.replace('J-DAP-001.png', 'other.png'), 'evidence missing'),
                               (text.replace('<!-- 业务规格格式:plain-v1 -->', ''), 'plain format')]:
                target.write_text(bad, encoding='utf8')
                with self.assertRaisesRegex(ValueError, error):
                    builder.preserve_reviewed(Path(tmp), module, registered)
            target.write_text(text, encoding='utf8')
            with self.assertRaisesRegex(ValueError, 'registered IDs'):
                builder.preserve_reviewed(Path(tmp), module, None)

    def test_manifest_and_audit_keep_scope_and_unexecuted_application_status(self):
        base = ROOT / 'doc/requirements'
        manifest = json.loads((base / '采样清单.json').read_text(encoding='utf8'))
        module = next(x for x in manifest['modules'] if x['code'] == 'DAP')
        sub = next(x for x in manifest['deepDive'] if x['code'] == 'DAP')
        self.assertEqual(44, len(sub['requirements']))
        self.assertEqual(46, module['developmentReview']['functionalSpecifications'])
        self.assertEqual(368, module['developmentReview']['functionalAcceptanceCases'])
        self.assertEqual(18, module['developmentReview']['nonfunctionalRequirements'])
        self.assertFalse(module['developmentReview']['applicationAcceptanceExecuted'])
        folder = base / module['directory']
        main = (folder / '需求说明.md').read_text(encoding='utf8')
        self.assertEqual([], validator.plain_audit_errors(main, folder))
        for name in ['需求说明.md', '子页面与操作细化.md', '核查记录.md']:
            text = (folder / name).read_text(encoding='utf8')
            self.assertEqual([], validator.secret_errors(text, name))
            self.assertEqual([], validator.deployment_errors(text, name))
        evidence = json.loads((base / 'evidence/dap-review-20261027/index.json').read_text(encoding='utf8'))
        self.assertEqual(96, evidence['publicStaticGets'])
        self.assertEqual(95, evidence['receiptedGets'])
        self.assertEqual(0, evidence['businessRequestsByCollector'])
        for source in evidence['sources']:
            for excerpt in source['excerpts']:
                self.assertEqual([], validator.secret_errors(excerpt['text'], source['id']))
                self.assertEqual([], validator.deployment_errors(excerpt['text'], source['id']))

if __name__ == '__main__':
    unittest.main()
