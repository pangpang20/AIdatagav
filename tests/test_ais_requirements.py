import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "doc" / "requirements" / "31-AI数据智能辅助"
MAIN = (MODULE / "需求说明.md").read_text(encoding="utf-8")
DETAIL = (MODULE / "子页面与操作细化.md").read_text(encoding="utf-8")
AUDIT_PATH = MODULE / "核查记录.md"


class AiDataAssistantRequirementsTests(unittest.TestCase):
    def test_existing_feature_and_acceptance_ids_remain_unique(self):
        feature_ids = re.findall(r"(?m)^### (AIS-\d{3})\b", MAIN + "\n" + DETAIL)
        self.assertEqual(
            feature_ids,
            ["AIS-100", "AIS-102", "AIS-103", "AIS-104", "AIS-001"]
            + [
                "AIS-500", "AIS-501", "AIS-509", "AIS-502", "AIS-503", "AIS-510",
                "AIS-504", "AIS-511", "AIS-505", "AIS-512", "AIS-506", "AIS-513",
                "AIS-514", "AIS-516", "AIS-517", "AIS-507", "AIS-508", "AIS-515",
            ],
        )
        acceptance_ids = re.findall(r"(?m)^\| (AIS-AC-\d{3}) \|", MAIN + "\n" + DETAIL)
        self.assertEqual(len(acceptance_ids), len(set(acceptance_ids)))
        self.assertTrue(set(f"AIS-AC-{number:03}" for number in range(1, 27)) <= set(acceptance_ids))
        self.assertTrue(set(f"AIS-AC-{number:03}" for number in range(554, 669)) <= set(acceptance_ids))

    def test_each_subpage_feature_has_development_sections(self):
        feature_blocks = re.split(r"(?m)(?=^### AIS-\d{3}\b)", DETAIL)
        blocks = [block for block in feature_blocks if re.match(r"### AIS-\d{3}\b", block)]
        self.assertEqual(len(blocks), 18)
        required_sections = [
            "页面字段清单",
            "页面交互规则",
            "业务流程与异常分支",
            "接口与数据规则",
            "验收标准",
            "权限与安全要求",
            "页面布局与状态",
        ]
        for block in blocks:
            for section in required_sections:
                self.assertIn(section, block.split("\n", 2)[0] + block, f"{block.splitlines()[0]} missing {section}")
        nfr_section = DETAIL.split("## 9. 非功能需求适用范围", 1)[-1]
        for block in blocks:
            feature_id = re.match(r"### (AIS-\d{3})\b", block).group(1)
            self.assertRegex(nfr_section, rf"(?m)^\| {feature_id} .+AIS-NFR-\d{{3}}")

    def test_field_catalogues_have_no_entirely_blank_rows(self):
        self.assertNotRegex(MAIN + "\n" + DETAIL, r"(?m)^\|\s*\|\s*\|")

    def test_nfr_registry_has_targets_methods_statuses_and_acceptance(self):
        self.assertIn("## 9. 非功能需求与验收", MAIN)
        nfr_rows = re.findall(r"(?m)^\| (AIS-NFR-\d{3}) \|([^\n]+)", MAIN)
        self.assertGreaterEqual(len(nfr_rows), 10)
        nfr_ids = [row[0] for row in nfr_rows]
        self.assertEqual(len(nfr_ids), len(set(nfr_ids)))
        for nfr_id, row in nfr_rows:
            self.assertRegex(row, r"AIS-(?:001|100|102|103|104|50[0-9]|51[0-7])")
            self.assertIn("未执行", row)
            self.assertRegex(row, r"AIS-NFR-AC-\d{3}")
        nfr_acceptance = re.findall(r"(?m)^\| (AIS-NFR-AC-\d{3}) \|([^\n]+)", MAIN)
        self.assertEqual(
            [acceptance_id for acceptance_id, _ in nfr_acceptance],
            [f"AIS-NFR-AC-{number:03}" for number in range(1, len(nfr_ids) + 1)],
        )
        for acceptance_id, row in nfr_acceptance:
            self.assertIn("AIS-NFR-", row, acceptance_id)
            self.assertIn("未执行", row, acceptance_id)

    def test_historical_ids_map_to_current_scope_or_blocked_audit(self):
        for requirement_id in ["AIS-101", *[f"AIS-{number}" for number in range(105, 120)]]:
            self.assertRegex(MAIN, rf"\| {requirement_id} \|[^\n]+\|")
        self.assertIn("核查记录", MAIN)

    def test_audit_record_has_separate_evidence_dependencies_and_validation(self):
        self.assertTrue(AUDIT_PATH.is_file())
        audit = AUDIT_PATH.read_text(encoding="utf-8")
        for section in ["核查结论", "外部依赖", "验证状态"]:
            match = re.search(rf"(?m)^## {section}\s*\n(.*?)(?=^## |\Z)", audit, re.S)
            self.assertIsNotNone(match, f"missing audit section {section}")
            self.assertTrue(match.group(1).strip(), f"empty audit section {section}")


if __name__ == "__main__":
    unittest.main()
