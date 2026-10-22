import importlib.util
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('live_index', Path(__file__).resolve().parents[1] / 'scripts/index-live-recheck.py')
idx = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(idx)


class LiveIndexTests(unittest.TestCase):
    def test_latest_attempt_uses_time_and_retains_different_links(self):
        older = {'code':'X', 'name':'模块', 'discoveredAt':'2026-10-22T01:00:00Z', 'links':[
            {'name':'列表', 'hierarchy':'组 → 列表', 'status':'opened-review-content', 'evidence':'old'},
            {'name':'详情', 'status':'pending'}]}
        newer = {'code':'X', 'name':'模块', 'discoveredAt':'2026-10-22T02:00:00Z', 'links':[
            {'name':'列表', 'hierarchy':'组 → 列表', 'status':'navigation-error'}]}
        result = idx.select_groups([newer, older])['X']['links']
        self.assertEqual(2, len(result))
        self.assertEqual('navigation-error', result[0]['status'])
        self.assertEqual('old', result[0]['attempts'][0]['evidence'])

    def test_empty_shell_and_unchanged_actions_are_invalid(self):
        for sample in [
            {'id':'empty', 'text':''},
            {'id':'shell', 'text':'工作台\n后台\n模块\n列表', 'title':'模块', 'navigation':['列表']},
            {'id':'unchanged', 'text':'真实列表', 'operation':{'changedContent':False}},
        ]:
            self.assertTrue(idx.target_limitation(sample))
        self.assertFalse(idx.target_limitation({'id':'form', 'text':'新增', 'forms':[{'label':'名称'}]}))

    def test_stale_target_is_kept_and_cannot_appear_as_covered(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); live = root / 'evidence/live-recheck-20261022'; live.mkdir(parents=True)
            sample = {'id': 'L-GDRS-009', 'time': '2026-10-22T10:00:00Z', 'url': '/categories', 'controls': []}
            (live / 'L-GDRS-009.json').write_text(json.dumps(sample), encoding='utf-8')
            ledger = [{'name': '数据直报', 'links': [{'name': '类别管理', 'evidence': sample['id'], 'status': 'opened-review-content', 'path': '/categories'}]}]
            (live / 'crawl-ledger.json').write_text(json.dumps(ledger), encoding='utf-8')
            with patch.object(idx, 'ROOT', root), patch.object(idx, 'LIVE', live), redirect_stdout(StringIO()):
                idx.main()
            manifest = json.loads((live / 'manifest.json').read_text(encoding='utf-8'))
            self.assertFalse(manifest['samples'][0]['targetValid'])
            self.assertIn('正文仍为', manifest['samples'][0]['limitation'])
            self.assertIn('无效目标', (root / '全链接核查清单.md').read_text(encoding='utf-8'))
            self.assertTrue((live / 'L-GDRS-009.json').is_file())

    def test_duplicate_menu_names_keep_distinct_hierarchies(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); live = root / 'evidence/live-recheck-20261022'; live.mkdir(parents=True)
            ledger = [{'name': '数据直报', 'links': [{'name': '资源管理', 'hierarchy': parent + ' → 资源管理', 'status': 'pending'} for parent in ['库表', '文件']]}]
            (live / 'crawl-ledger.json').write_text(json.dumps(ledger), encoding='utf-8')
            with patch.object(idx, 'ROOT', root), patch.object(idx, 'LIVE', live), redirect_stdout(StringIO()):
                idx.main()
            text = (root / '全链接核查清单.md').read_text(encoding='utf-8')
            self.assertIn('库表 → 资源管理', text)
            self.assertIn('文件 → 资源管理', text)
            self.assertEqual(2, text.count('未访问'))
