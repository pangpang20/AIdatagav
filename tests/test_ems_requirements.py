import importlib.util
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'doc/requirements/30-评价管理'
MAIN = FOLDER / '需求说明.md'
SUB = FOLDER / '子页面与操作细化.md'
AUDIT = FOLDER / '核查记录.md'
VALIDATOR = ROOT / 'scripts/validate-requirements.py'
spec = importlib.util.spec_from_file_location('requirements_validator', VALIDATOR)
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class EvaluationManagementRequirementsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.main = MAIN.read_text(encoding='utf-8')
        cls.sub = SUB.read_text(encoding='utf-8')
        cls.audit = AUDIT.read_text(encoding='utf-8')
        cls.specs = cls.main + '\n' + cls.sub

    def test_original_function_ids_are_present_and_unique(self):
        ids = re.findall(r'^### (EMS-\d{3})\b', self.specs, re.M)
        expected = {'EMS-001', 'EMS-100', 'EMS-102'} | {
            f'EMS-{n:03d}' for n in range(500, 513)
        }
        self.assertEqual(expected, set(ids))
        self.assertEqual(len(expected), len(ids))

    def test_subpage_field_tables_have_named_rows(self):
        sections = re.findall(
            r'^#### 1\. 页面字段清单（(EMS-\d{3})）\s*\r?\n(.*?)(?=^#### 2\. 页面交互规则|\Z)',
            self.sub,
            re.M | re.S,
        )
        self.assertEqual(13, len(sections))
        for requirement_id, section in sections:
            table_rows = [line for line in section.splitlines() if line.startswith('|')]
            self.assertGreaterEqual(len(table_rows), 3, requirement_id)
            for row in table_rows[2:]:
                label = row.split('|', 2)[1].strip()
                self.assertTrue(label, f'{requirement_id} has an unnamed field row: {row}')
                self.assertNotEqual('...', label, requirement_id)

    def test_interface_tables_have_consistent_columns_and_statuses(self):
        lines = self.sub.splitlines()
        for index, line in enumerate(lines):
            if not line.startswith('| 项目 | 目标规则 | 实现状态'):
                continue
            expected_columns = line.count('|') - 1
            row_index = index + 2
            while row_index < len(lines) and lines[row_index].startswith('|'):
                cells = [cell.strip() for cell in lines[row_index].strip('|').split('|')]
                self.assertEqual(expected_columns, len(cells), lines[row_index])
                if cells[0] != '---':
                    self.assertTrue(cells[-1], lines[row_index])
                row_index += 1

    def test_all_acceptance_ids_are_unique_and_unexecuted(self):
        rows = re.findall(r'^\| (EMS-AC-\d{3}) \|.*$', self.specs, re.M)
        self.assertEqual(len(rows), len(set(rows)))
        self.assertGreaterEqual(len(rows), 50)
        for row in re.findall(r'^\| EMS-AC-\d{3} \|.*$', self.specs, re.M):
            self.assertTrue(row.rstrip().endswith('| 未执行 |'), row)

    def test_nonfunctional_requirements_are_unique_linked_and_unexecuted(self):
        rows = re.findall(r'^\| (EMS-NFR-\d{3}) \|.*$', self.main, re.M)
        self.assertEqual(15, len(rows))
        self.assertEqual(len(rows), len(set(rows)))
        functional_ids = set(re.findall(r'^### (EMS-\d{3})\b', self.specs, re.M))
        for row in re.findall(r'^\| EMS-NFR-\d{3} \|.*$', self.main, re.M):
            self.assertIn('未执行', row)
            links = re.findall(r'EMS-\d{3}', row.split('|')[-3])
            self.assertTrue(links)
            self.assertTrue(set(links) & functional_ids, row)

    def test_specs_separate_business_rules_from_review_markers(self):
        self.assertIn('<!-- 业务规格格式:plain-v1 -->', self.main)
        self.assertIn('<!-- 业务规格格式:plain-v1 -->', self.sub)
        self.assertNotRegex(self.specs, r'【(?:页面观察|操作观察|页面文案|拟定需求|待确认|拟定，未执行|拟定，待评审)】')
        for requirement_id in re.findall(r'^### (EMS-\d{3})\b', self.specs, re.M):
            block = re.search(
                r'^### ' + re.escape(requirement_id) + r'\b(.*?)(?=^### EMS-\d{3}\b|^## |\Z)',
                self.specs,
                re.M | re.S,
            )
            self.assertIsNotNone(block, requirement_id)
            self.assertIn('#### 9. 非功能性需求', block.group(1), requirement_id)

    def test_audit_captures_evidence_limits_and_application_gaps(self):
        for text in ['证据覆盖与验收状态', '外部依赖', '非功能目标来源', '全部未执行']:
            self.assertIn(text, self.audit)
        self.assertIn('Network', self.audit)
        self.assertIn('未提交', self.audit)
        self.assertIn('EMS-NFR-001–015', self.audit)

    def test_local_markdown_links_resolve(self):
        for file in [MAIN, SUB, AUDIT]:
            self.assertEqual([], validator.markdown_errors(
                file.read_text(encoding='utf-8'), file, ROOT
            ), str(file))

    def test_project_business_registry_and_development_readiness_checks(self):
        manifest = json.loads((ROOT / 'doc/requirements/采样清单.json').read_text(encoding='utf-8'))
        module = next(item for item in manifest['modules'] if item['code'] == 'EMS')
        evidence = ROOT / 'doc/requirements/evidence'
        data = {
            path.stem: json.loads(path.read_text(encoding='utf-8'))
            for path in evidence.glob('*.json')
        }
        errors = validator.business_errors(
            self.main,
            module,
            (FOLDER / module['researchFile']).read_text(encoding='utf-8'),
            data,
        )
        errors += validator.development_errors(self.main, module)
        self.assertEqual([], errors)


if __name__ == '__main__':
    unittest.main()
