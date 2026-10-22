import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('live_validator', Path(__file__).resolve().parents[1] / 'scripts/validate-requirements.py')
v = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(v)


class LiveRecheckBoundaryTests(unittest.TestCase):
    def fixture(self, root):
        d = root / 'live'; d.mkdir()
        # Use a real existing PNG to exercise decoding and pair validation.
        png = next((Path(__file__).resolve().parents[1] / 'doc/requirements/evidence').glob('*.png'))
        (d / 'x.png').write_bytes(png.read_bytes())
        sample = {'id': 'x', 'time': '2026-10-22T00:00:00Z', 'url': '/module/list', 'controls': []}
        (d / 'x.json').write_text(json.dumps(sample), encoding='utf-8')
        live = {'readOnly': True, 'businessWritesExecuted': False, 'samples': [
            {**sample, 'image': 'live/x.png', 'metadata': 'live/x.json', 'targetValid': True, 'limitation': ''}]}
        (d / 'manifest.json').write_text(json.dumps(live), encoding='utf-8')
        text = '\n'.join('## ' + str(i) + '. section' for i in range(1, 9))
        text += '\n### BAS-001 observed\n[source](live/x.png)\n| BAS-AC-001 | scenario | BAS-001 | 【拟定，未执行】 |\n'
        (root / 'doc.md').write_text(text, encoding='utf-8')
        record = {'manifest': 'live/manifest.json', 'documents': [
            {'code': 'BAS', 'file': 'doc.md', 'requirements': [{'id': 'BAS-001', 'evidence': ['x']}]}]}
        return d, live, sample, record

    def test_valid_pair_and_unexecuted_case(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); _, _, _, record = self.fixture(root)
            self.assertEqual([], v.live_recheck_errors(root, record))

    def test_invalid_navigation_cannot_support_requirement(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); d, live, _, record = self.fixture(root)
            live['samples'][0].update(targetValid=False, limitation='old page')
            (d / 'manifest.json').write_text(json.dumps(live), encoding='utf-8')
            self.assertTrue(any('invalid target cited' in e for e in v.live_recheck_errors(root, record)))

    def test_input_values_and_business_writes_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); d, _, sample, record = self.fixture(root)
            sample['controls'] = [{'type': 'password', 'value': 'fixture'}]
            sample['operation'] = {'businessWriteExecuted': True}
            (d / 'x.json').write_text(json.dumps(sample), encoding='utf-8')
            errors = v.live_recheck_errors(root, record)
            self.assertTrue(any('input values' in e for e in errors))
            self.assertTrue(any('exceeds scope' in e for e in errors))

    def test_unregistered_screenshot_and_execution_overclaim_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); d, _, _, record = self.fixture(root)
            (d / 'extra.png').write_bytes((d / 'x.png').read_bytes())
            doc = root / 'doc.md'
            doc.write_text(doc.read_text(encoding='utf-8').replace('【拟定，未执行】', '【已执行】'), encoding='utf-8')
            errors = v.live_recheck_errors(root, record)
            self.assertTrue(any('set differs' in e for e in errors))
            self.assertTrue(any('overclaim' in e for e in errors))

    def test_requirement_must_link_its_registered_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); _, _, _, record = self.fixture(root)
            doc = root / 'doc.md'
            doc.write_text(doc.read_text(encoding='utf-8').replace('[source](live/x.png)', ''), encoding='utf-8')
            self.assertTrue(any('not linked' in e for e in v.live_recheck_errors(root, record)))


if __name__ == '__main__':
    unittest.main()
