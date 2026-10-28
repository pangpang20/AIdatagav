import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIREMENTS = ROOT / 'doc/requirements'
FOLDER = REQUIREMENTS / '27-数据标准检测'
SCRIPT = ROOT / 'scripts/validate-requirements.py'
SPEC = importlib.util.spec_from_file_location('dsts_validator', SCRIPT)
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)


class DstsRequirementsTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads((REQUIREMENTS / '采样清单.json').read_text(encoding='utf-8'))
        self.module = next(item for item in self.manifest['modules'] if item['code'] == 'DSTS')
        self.main_path = FOLDER / '需求说明.md'
        self.main_text = self.main_path.read_text(encoding='utf-8')
        self.samples = {
            item['id']: json.loads((REQUIREMENTS / 'evidence' / f"{item['id']}.json").read_text(encoding='utf-8'))
            for item in self.manifest['samples']
            if item['id'] in {'C030-original-content', 'E053-standard-check'}
        }

    def test_business_and_development_specs_pass_existing_validators(self):
        research = (FOLDER / self.module['researchFile']).read_text(encoding='utf-8')
        self.assertEqual([], validator.business_errors(self.main_text, self.module, research, self.samples))
        self.assertEqual([], validator.development_errors(self.main_text, self.module))
        self.assertEqual([], validator.plain_audit_errors(self.main_text, FOLDER))

    def test_dsts_documents_and_audit_links_resolve(self):
        for name in ('需求说明.md', '子页面与操作细化.md', '核查记录.md'):
            path = FOLDER / name
            self.assertEqual([], validator.markdown_errors(path.read_text(encoding='utf-8'), path, REQUIREMENTS))

    def test_live_recheck_accepts_generated_dsts_feature_sections(self):
        errors = validator.live_recheck_errors(REQUIREMENTS, self.manifest['liveRecheck'])
        self.assertEqual([], [error for error in errors if error.startswith('DSTS')])

    def test_legacy_sample_acceptance_facts_remain_separate(self):
        cases = {item['id']: item for item in self.module['acceptance']}
        self.assertTrue(cases['DSTS-AC-001']['executed'])
        self.assertTrue(cases['DSTS-AC-100']['executed'])
        self.assertFalse(self.module['developmentReview']['productionReady'])
        self.assertEqual('partial-ui-only', self.module['developmentReview']['status'])


if __name__ == '__main__':
    unittest.main()
