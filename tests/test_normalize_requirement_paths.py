import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'normalize-requirement-paths.py'
spec = importlib.util.spec_from_file_location('route_normalizer', SCRIPT)
n = importlib.util.module_from_spec(spec)
spec.loader.exec_module(n)


class RequirementRouteTests(unittest.TestCase):
    def setUp(self):
        self.origin = 'http://' + n.APP_HOST + ':' + str(n.APP_PORT)

    def test_preserves_route_query_and_fragment(self):
        self.assertEqual('/module/example?a=1#tab', n.normalize_text(self.origin + '/module/example?a=1#tab'))

    def test_bare_origin_becomes_root_route(self):
        self.assertEqual('/', n.normalize_text(self.origin))

    def test_application_link_is_not_misread_as_local_file_link(self):
        self.assertEqual('入口（应用路径：`/login`）', n.normalize_text('[入口](' + self.origin + '/login)', True))

    def test_relative_document_and_other_external_links_are_preserved(self):
        text = '[文档](./模块/需求说明.md) [资料](https://example.org/a)'
        self.assertEqual(text, n.normalize_text(text, True))

    def test_json_content_changes_only_origin(self):
        source = '{"url": "' + self.origin + '/module/x", "count": 3}'
        self.assertEqual('{"url": "/module/x", "count": 3}', n.normalize_text(source))

    def test_normalization_is_idempotent(self):
        source = '[入口](' + self.origin + '/login) ' + self.origin + '/x'
        once = n.normalize_text(source, True)
        self.assertEqual(once, n.normalize_text(once, True))


if __name__ == '__main__':
    unittest.main()
