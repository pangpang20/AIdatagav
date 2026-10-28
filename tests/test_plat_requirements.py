import importlib.util
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / 'scripts'
DOCS = ROOT / 'doc/requirements/35-微服务平台'
MAIN = DOCS / '需求说明.md'
SUB = DOCS / '子页面与操作细化.md'
AUDIT = DOCS / '核查记录.md'


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


plat_builder = load_module('plat_requirements_builder', SCRIPTS / 'build-plat-requirements.py')
deep_builder = load_module('deep_requirements_builder', SCRIPTS / 'build-deep-requirements.py')
validator = load_module('requirements_validator', SCRIPTS / 'validate-requirements.py')


class PlatformRequirementsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = json.loads((ROOT / 'doc/requirements/采样清单.json').read_text(encoding='utf-8'))
        cls.module, cls.reviewed, cls.samples = plat_builder.load_reviewed(ROOT / 'doc/requirements')
        cls.main = MAIN.read_text(encoding='utf-8')
        cls.sub = SUB.read_text(encoding='utf-8')
        cls.audit = AUDIT.read_text(encoding='utf-8')

    def test_functional_and_page_ids_match_the_published_registry(self):
        expected_main = {'PLAT-001', 'PLAT-002', 'PLAT-003', 'PLAT-004'} | {
            f'PLAT-{n:03}' for n in range(100, 120)
        }
        actual_main = set(re.findall(r'PLAT-\d{3}', self.main))
        self.assertTrue(expected_main <= actual_main)
        expected_pages = [f'PLAT-{n:03}' for n in range(500, 544)]
        actual_pages = re.findall(r'^### (PLAT-\d{3})\b', self.sub, re.M)
        self.assertEqual(expected_pages, actual_pages)
        self.assertEqual(expected_pages, [item['id'] for item in self.reviewed['requirements']])
        main_ids = re.findall(r'^### (PLAT-\d{3})\b', self.main, re.M)
        business_ids = [item['id'] for item in self.module['businessRequirements']]
        self.assertEqual(['PLAT-001', 'PLAT-002', 'PLAT-003', 'PLAT-004'], main_ids)
        self.assertEqual(main_ids, business_ids)
        main_acceptance = re.findall(r'^\| (PLAT-AC-\d{3}) \|.*$', self.main, re.M)
        self.assertEqual(main_acceptance, self.module['businessAcceptance'])
        for requirement in self.module['businessRequirements']:
            if requirement['id'] in {'PLAT-003', 'PLAT-004'}:
                self.assertEqual('target', requirement.get('basis'))
                self.assertEqual([], requirement['evidence'])

    def test_acceptance_ids_are_preserved_unique_and_unexecuted(self):
        expected = {'PLAT-AC-001', 'PLAT-AC-002'} | {
            f'PLAT-AC-{n:03}' for n in range(500, 632)
        } | {f'PLAT-AC-{n:03}' for n in range(632, 637)}
        rows = re.findall(r'^\| (PLAT-AC-\d{3}) \|.*$', self.main + '\n' + self.sub, re.M)
        self.assertEqual(expected, set(rows))
        self.assertEqual(len(rows), len(set(rows)))
        for row in re.findall(r'^\| PLAT-AC-\d{3} \|.*$', self.main + '\n' + self.sub, re.M):
            self.assertTrue(row.rstrip().endswith('| 未执行 |'), row)

    def test_each_page_has_named_fields_owner_evidence_and_nfr_links(self):
        sections = re.split(r'(?m)(?=^### PLAT-\d{3}\b)', self.sub)
        page_sections = [section for section in sections if re.match(r'^### PLAT-\d{3}\b', section)]
        self.assertEqual(44, len(page_sections))
        for feature, section in zip(self.reviewed['requirements'], page_sections):
            for subsection in range(1, 10):
                self.assertIn(f'#### {subsection}. ', section, feature['id'])
            for evidence_id in feature['evidence']:
                self.assertIn(f'{evidence_id}.png', section, feature['id'])
                self.assertIn(f'{evidence_id}.json', section, feature['id'])
            field_table = section.split('#### 1. 页面字段清单', 1)[1].split('#### 2.', 1)[0]
            for row in re.findall(r'^\|[^\r\n]+\|$', field_table, re.M)[2:]:
                self.assertTrue(row.split('|', 2)[1].strip(), f'{feature["id"]}: {row}')
            self.assertRegex(section, r'PLAT-NFR-\d{3}')

    def test_reviewed_pages_do_not_leak_sample_values_or_process_markers(self):
        documents = self.main + '\n' + self.sub
        for sample_value in ['test0107', 'chenyao', '172.16.1.54', 'wallpaper.apc.360.cn', '陈云亮']:
            self.assertNotIn(sample_value, documents)
        self.assertNotRegex(documents, r'【(?:页面观察|操作观察|拟定需求|待确认|页面文案|拟定，未执行)】')
        self.assertNotRegex(self.sub, re.compile(r'^\|\s*\|', re.M))

    def test_nonfunctional_requirements_have_methods_sources_and_links(self):
        rows = re.findall(r'^\| (PLAT-NFR-\d{3}) \|.*$', self.main, re.M)
        self.assertEqual([f'PLAT-NFR-{n:03}' for n in range(1, 13)], rows)
        for row in re.findall(r'^\| PLAT-NFR-\d{3} \|.*$', self.main, re.M):
            self.assertTrue(row.rstrip().endswith('| 未执行 |'), row)
            self.assertRegex(row, r'PLAT-00[1-4]|PLAT-5\d\d')
        for text in ['开发/验收建议', '不是当前系统测量值', '样本不足或环境不完整时不判通过']:
            self.assertIn(text, self.main)
        for text in ['非功能目标来源', '当前部署', '未执行']:
            self.assertIn(text, self.audit)

    def test_local_markdown_links_resolve(self):
        for path in (MAIN, SUB, AUDIT):
            text = path.read_text(encoding='utf-8')
            self.assertEqual([], validator.markdown_errors(text, path, ROOT), str(path))

    def test_builder_output_is_reproducible_and_shared_builder_preserves_it(self):
        expected_main = plat_builder.render_main()
        expected_sub = plat_builder.render_subpage(self.reviewed, self.samples)
        self.assertEqual(expected_main, self.main)
        self.assertEqual(expected_sub, self.sub)
        registered = deep_builder.preserve_reviewed(ROOT / 'doc/requirements', self.module, self.reviewed)
        self.assertIs(self.reviewed, registered)


if __name__ == '__main__':
    unittest.main()
