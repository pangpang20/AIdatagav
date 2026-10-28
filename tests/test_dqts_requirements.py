"""DQTS authored specification invariants; these are not application acceptance."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
REQ = ROOT / 'doc/requirements'
DIRECTORY = '29-数据质量检测'
EVIDENCE = REQ / 'evidence/dqts-review-20261028'
spec = importlib.util.spec_from_file_location('dqts_builder', ROOT / 'scripts/build-deep-requirements.py')
BUILDER = importlib.util.module_from_spec(spec)
spec.loader.exec_module(BUILDER)


class DqtsRequirementsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        registry = json.loads((REQ / '采样清单.json').read_text(encoding='utf-8'))
        cls.module = next(m for m in registry['modules'] if m['code'] == 'DQTS')
        cls.deep = next(m for m in registry['deepDive'] if m['code'] == 'DQTS')
        cls.main = (REQ / DIRECTORY / '需求说明.md').read_text(encoding='utf-8')
        cls.sub = (REQ / DIRECTORY / '子页面与操作细化.md').read_text(encoding='utf-8')
        cls.audit = (REQ / DIRECTORY / '核查记录.md').read_text(encoding='utf-8')

    def test_builder_preserves_exact_registered_order_and_evidence(self):
        self.assertEqual(self.deep, BUILDER.preserve_reviewed(REQ, self.module, self.deep))
        self.assertEqual(17, len(self.deep['requirements']))
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp) / DIRECTORY
            directory.mkdir()
            target = directory / '子页面与操作细化.md'
            for changed in [self.sub.replace('### DQTS-500 ', '### DQTS-999 ', 1),
                            self.sub.replace('V-DQTS-001-ready.png', 'missing-image.png')]:
                target.write_text(changed, encoding='utf-8')
                with self.assertRaises(ValueError):
                    BUILDER.preserve_reviewed(Path(temp), self.module, self.deep)
        invalid = copy.deepcopy(self.deep)
        invalid['requirements'][0]['evidence'] = []
        with self.assertRaises(ValueError):
            BUILDER.preserve_reviewed(REQ, self.module, invalid)

    def test_augmenter_refresh_preserves_both_documents(self):
        node = shutil.which('node')
        self.assertIsNotNone(node)
        with tempfile.TemporaryDirectory(prefix='dqts-refresh-') as temp:
            for name, text in [('需求说明.md', self.main), ('子页面与操作细化.md', self.sub)]:
                target = Path(temp) / name
                target.write_text(text, encoding='utf-8')
                script = "const {augmentFile}=require(process.argv[1]);process.argv.push('--refresh');if(augmentFile(process.argv[2]).changed)process.exit(2);"
                subprocess.run([node, '-e', script, str(ROOT / 'scripts/augment-requirement-specs.js'), str(target)], capture_output=True, check=True)
                self.assertEqual(text, target.read_text(encoding='utf-8'))

    def test_functional_ledgers_and_current_unexecuted_status(self):
        combined = '\n'.join([self.main, self.sub, self.audit])
        expected = {m['id'] for m in self.module['acceptance']} | set(self.module['businessAcceptance']) | {
            f'DQTS-AC-{i:03}' for i in range(500, 651)}
        actual = re.findall(r'^\| (DQTS-AC-\d{3}) \|', combined, re.M)
        self.assertEqual(expected, set(actual))
        self.assertEqual(self.module['businessAcceptance'], re.findall(r'^\| (DQTS-AC-\d{3}) \|', self.main, re.M))
        for content in [self.main, self.sub, self.audit]:
            for line in content.splitlines():
                if re.match(r'^\| DQTS-(AC|NFR)-\d{3} \|', line):
                    self.assertTrue(line.endswith('| 未执行 |'), line)

    def test_all_blocks_have_nine_sections_and_registered_evidence(self):
        self.assertEqual([r['id'] for r in self.deep['requirements']], re.findall(r'^### (DQTS-\d{3})\b', self.sub, re.M))
        for item in self.deep['requirements']:
            block = re.search(r'^### '+item['id']+r'\b(.*?)(?=^### |^## |\Z)', self.sub, re.M | re.S)[1]
            self.assertEqual(list(range(1, 10)), [int(x) for x in re.findall(r'^#### (\d)\.', block, re.M)])
            for evidence in item['evidence']:
                self.assertIn(evidence+'.png', block)
            self.assertIn('**业务目的**：', block)
            self.assertIn('DQTS-NFR-', block)
            self.assertNotRegex(block, r'^\|(?:\s*\|){6,}\s*$', 'no entirely blank field row')

    def test_quality_requirements_registry_links_and_status(self):
        expected = [f'DQTS-NFR-{i:03}' for i in range(1, 12)]
        self.assertEqual(expected, [n['id'] for n in self.module['qualityRequirements']])
        self.assertEqual(expected, re.findall(r'^\| (DQTS-NFR-\d{3}) \|', self.main, re.M))
        related = {r['id'] for r in self.module['businessRequirements']} | {r['id'] for r in self.deep['requirements']}
        for item in self.module['qualityRequirements']:
            self.assertEqual(related, set(item['relatedRequirements']))
        for phrase in ['P95', 'P99', 'ceil(p×N)', 'RTT50ms', '样本不足不判通过', '5xx', '零自动写请求重放']:
            self.assertIn(phrase, self.main)

    def test_task_state_and_write_boundaries_are_distinct(self):
        for phrase in ['0新建；1成功；2失败；3执行中', '0新建；1执行中；2成功；3失败',
                       '/job/start/{id}', '/job/start', '/columnoverviewdefinition',
                       'collectioNname', 'effectiveTimeSeclet', 'auto-upload:false',
                       '/detectionplan/edit', '/commonrule/downloadTempalte', '/jobReport/batchExportErrorData']:
            self.assertIn(phrase, self.sub)
        self.assertIn('DQTS-DEP-01', self.audit)
        self.assertIn('AC-591至595', self.audit)
        self.assertIn('AC-641至645', self.audit)
        self.assertIn('大于0.5且≤1', self.audit)

    def test_static_excerpt_integrity_offsets_and_bounded_scope(self):
        index = json.loads((EVIDENCE / 'index.json').read_text(encoding='utf-8'))
        self.assertFalse(index['businessWritesExecuted'])
        self.assertFalse(index['browserLiveVerified'])
        self.assertEqual(48, len(index['entries']))
        self.assertEqual({p.name for p in EVIDENCE.glob('*.txt')}, {e['file'] for e in index['entries']})
        for entry in index['entries']:
            raw = (EVIDENCE / entry['file']).read_bytes()
            self.assertEqual(entry['excerptSha256'], hashlib.sha256(raw).hexdigest())
            self.assertEqual(entry['endUtf16']-entry['startUtf16'], len(raw.decode('utf-8').encode('utf-16-le'))//2)
            self.assertGreater(entry['sourceBytes'], len(raw))
            self.assertRegex(entry['sourceSha256'], r'^[0-9a-f]{64}$')
            self.assertTrue(entry['resource'].startswith('/dqts/'))
            self.assertNotIn('://', entry['resource'])
            self.assertNotRegex(raw.decode('utf-8'), r'https?://(?:\d{1,3}\.){3}\d{1,3}')

    def test_original_research_bytes_are_unchanged(self):
        raw = (REQ / DIRECTORY / '调研记录.md').read_bytes()
        self.assertEqual('a42a9cc492f82414e3fb52b3de54566d85f0f498a699b2f755c35171c23acad1', hashlib.sha256(raw).hexdigest())


if __name__ == '__main__':
    unittest.main()
