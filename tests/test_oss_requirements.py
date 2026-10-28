import importlib.util
import json
import re
import unittest
import subprocess
import tempfile
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REQUIREMENTS = ROOT / 'doc/requirements'
BUILDER_PATH = ROOT / 'scripts/build-deep-requirements.py'
SPEC = importlib.util.spec_from_file_location('oss_deep_builder', BUILDER_PATH)
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


class OssRequirementsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        registry = json.loads((REQUIREMENTS / '采样清单.json').read_text(encoding='utf-8'))
        cls.module = next(item for item in registry['modules'] if item['code'] == 'OSS')
        cls.reviewed = next(item for item in registry['deepDive'] if item['code'] == 'OSS')
        cls.main = (REQUIREMENTS / '26-运营汇总系统/需求说明.md').read_text(encoding='utf-8')
        cls.sub = (REQUIREMENTS / '26-运营汇总系统/子页面与操作细化.md').read_text(encoding='utf-8')

    def test_reviewed_subpages_are_preserved_by_generic_builder(self):
        preserved = BUILDER.preserve_reviewed(REQUIREMENTS, self.module, self.reviewed)
        self.assertEqual(self.reviewed, preserved)

    def test_quality_requirement_ids_match_registry_and_remain_unexecuted(self):
        expected = [item['id'] for item in self.module['qualityRequirements']]
        actual = re.findall(r'^\| (OSS-NFR-\d{3}) \|', self.main, re.M)
        self.assertEqual(expected, actual)
        self.assertEqual(len(actual), len(set(actual)))
        for line in self.main.splitlines():
            if re.match(r'^\| OSS-NFR-\d{3} \|', line):
                self.assertTrue(line.rstrip().endswith('| 未执行 |'), line)

    def test_published_functional_ledgers_remain_present(self):
        content = self.main + '\n' + self.sub + '\n' + (REQUIREMENTS / '26-运营汇总系统/核查记录.md').read_text(encoding='utf-8')
        expected = {
            item['id'] for item in self.module['acceptance']
        } | set(self.module['businessAcceptance']) | {
            f'OSS-AC-{number:03}' for number in range(500, 534)
        }
        actual = re.findall(r'^\| (OSS-AC-\d{3}) \|', content, re.M)
        self.assertEqual(expected, set(actual))
        self.assertEqual(set(expected), set(actual))


    def test_generic_augmenter_preserves_main_and_subpages_on_refresh(self):
        node = shutil.which('node')
        self.assertIsNotNone(node, 'Node runtime required for generator preservation test')
        with tempfile.TemporaryDirectory(prefix='oss-generator-') as directory:
            for name, content in [('需求说明.md', self.main), ('子页面与操作细化.md', self.sub)]:
                target = Path(directory) / name
                target.write_text(content, encoding='utf-8')
                script = "const {augmentFile}=require(process.argv[1]);process.argv.push('--refresh');const r=augmentFile(process.argv[2]);if(r.changed)process.exit(2);"
                subprocess.run([node, '-e', script, str(ROOT / 'scripts/augment-requirement-specs.js'), str(target)], check=True, capture_output=True)
                self.assertEqual(content, target.read_text(encoding='utf-8'))

    def test_business_ledger_keeps_published_order_and_unexecuted_status(self):
        rows = re.findall(r'^\| (OSS-AC-\d{3}) \|.*$', self.main, re.M)
        self.assertEqual(self.module['businessAcceptance'], rows)
        for line in self.main.splitlines():
            if re.match(r'^\| OSS-AC-\d{3} \|', line):
                self.assertTrue(line.rstrip().endswith('| 未执行 |'), line)


if __name__ == '__main__':
    unittest.main()
