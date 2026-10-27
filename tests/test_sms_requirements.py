"""The legacy deep-page builder must preserve reviewed SMS content and reject source loss."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sms_deep_builder', ROOT / 'scripts/build-deep-requirements.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class SmsDeepPreservation(unittest.TestCase):
    def test_preserves_exact_registered_pages_and_refuses_damage(self):
        requirements = ROOT / 'doc/requirements'
        registry = json.loads((requirements / '采样清单.json').read_text(encoding='utf-8'))
        module = next(m for m in registry['modules'] if m['code'] == 'SMS')
        registered = next(m for m in registry['deepDive'] if m['code'] == 'SMS')
        text = (requirements / module['directory'] / '子页面与操作细化.md').read_text(encoding='utf-8')
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            folder = root / module['directory']
            folder.mkdir()
            target = folder / '子页面与操作细化.md'
            target.write_text(text, encoding='utf-8')
            self.assertEqual(builder.preserve_reviewed(root, module, registered), registered)
            target.write_text(text.replace('H-SMS-009-op1.png', 'missing.png'), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'evidence missing'):
                builder.preserve_reviewed(root, module, registered)
            target.write_text(text.replace('### SMS-535 ', '### SMS-999 '), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'registry mismatch'):
                builder.preserve_reviewed(root, module, registered)


if __name__ == '__main__':
    unittest.main()
