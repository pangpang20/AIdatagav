import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "rtms_deep_builder", ROOT / "scripts/build-deep-requirements.py"
)
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)
VALIDATOR_SPEC = importlib.util.spec_from_file_location(
    "rtms_validator", ROOT / "scripts/validate-requirements.py"
)
validator = importlib.util.module_from_spec(VALIDATOR_SPEC)
VALIDATOR_SPEC.loader.exec_module(validator)


class RtmsReviewedDocumentTests(unittest.TestCase):
    def test_business_structure_sources_and_audit_links(self):
        requirements = ROOT / 'doc/requirements'
        registry = json.loads((requirements / '采样清单.json').read_text(encoding='utf-8'))
        module = next(item for item in registry['modules'] if item['code'] == 'RTMS')
        folder = requirements / module['directory']
        main = (folder / '需求说明.md').read_text(encoding='utf-8')
        research = (folder / '调研记录.md').read_text(encoding='utf-8')
        keys = {key for item in module['businessRequirements'] for key in item['evidence']}
        evidence = {key: json.loads((requirements / 'evidence' / (key + '.json')).read_text(encoding='utf-8')) for key in keys}
        self.assertEqual([], validator.business_errors(main, module, research, evidence))
        self.assertEqual([], validator.development_errors(main, module))
        self.assertEqual([], validator.plain_audit_errors(main, folder))
        for name in ['需求说明.md', '子页面与操作细化.md', '核查记录.md']:
            file = folder / name
            self.assertEqual([], validator.markdown_errors(file.read_text(encoding='utf-8'), file, ROOT))
        self.assertTrue(validator.business_errors(main.replace('F064-RTMS-template-query.png', 'removed.png'), module, research, evidence))
        self.assertTrue(validator.business_errors(main.replace('| RTMS-100 | 未执行 |', '| RTMS-100 | 已执行 |', 1), module, research, evidence))

    def test_preserve_reviewed_rtms_requires_registry_order_and_evidence(self):
        requirements = ROOT / "doc/requirements"
        registry = json.loads((requirements / "采样清单.json").read_text(encoding="utf-8"))
        record = next(item for item in registry["deepDive"] if item["code"] == "RTMS")
        module = {"code": "RTMS", "directory": "32-报告模板"}
        text = (requirements / module["directory"] / "子页面与操作细化.md").read_text(encoding="utf-8")
        self.assertIs(record, builder.preserve_reviewed(requirements, module, record))
        self.assertEqual(text, (requirements / module["directory"] / "子页面与操作细化.md").read_text(encoding="utf-8"))

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            folder = root / module["directory"]
            folder.mkdir()
            target = folder / "子页面与操作细化.md"
            target.write_text(text, encoding="utf-8")
            bad_id = text.replace("RTMS-502", "RTMS-503", 1)
            target.write_text(bad_id, encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "registry mismatch"):
                builder.preserve_reviewed(root, module, record)
            target.write_text(text.replace("V-RTMS-001-op2.png", "V-RTMS-missing.png"), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "evidence missing"):
                builder.preserve_reviewed(root, module, record)
            target.write_text(text.replace("<!-- 业务规格格式:plain-v1 -->", ""), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "plain format"):
                builder.preserve_reviewed(root, module, record)


if __name__ == "__main__":
    unittest.main()
