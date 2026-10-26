"""Check that the requirements skill remains discoverable and portable."""
import re
import unittest
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / 'skills' / 'business-requirements-review'
LINK = re.compile(r'!?\[[^\]]*\]\(([^)]+)\)')


class BusinessRequirementsSkillTests(unittest.TestCase):
    def test_skill_discovery_identity_matches_directory(self):
        text = (SKILL / 'SKILL.md').read_text(encoding='utf-8')
        header = re.match(r'\A---\n(.*?)\n---\n', text, re.S)
        self.assertIsNotNone(header, 'skill must have YAML frontmatter')
        name = re.search(r'^name: ([a-z0-9-]+)$', header.group(1), re.M)
        self.assertIsNotNone(name)
        self.assertEqual(SKILL.name, name.group(1))
        self.assertLessEqual(len(name.group(1)), 64)
        description = re.search(r'^description: "(.+)"$', header.group(1), re.M)
        self.assertIsNotNone(description, 'description must be nonempty')
        self.assertLessEqual(len(description.group(1)), 1024)

    def test_local_references_resolve_inside_portable_package(self):
        for source in SKILL.rglob('*.md'):
            text = source.read_text(encoding='utf-8')
            for link in LINK.findall(text):
                if urlparse(link).scheme:
                    continue
                relative = unquote(link.split('#', 1)[0])
                target = (source.parent / relative).resolve()
                with self.subTest(source=source.relative_to(SKILL), link=link):
                    self.assertTrue(target.is_relative_to(SKILL.resolve()),
                                    'installed references cannot depend on repository files')
                    self.assertTrue(target.is_file(), 'referenced resource must be shipped')

    def test_all_markdown_resources_are_reachable_from_entrypoint(self):
        seen = set()
        pending = [SKILL / 'SKILL.md']
        while pending:
            source = pending.pop().resolve()
            if source in seen:
                continue
            seen.add(source)
            for link in LINK.findall(source.read_text(encoding='utf-8')):
                if urlparse(link).scheme:
                    continue
                target = (source.parent / unquote(link.split('#', 1)[0])).resolve()
                if target.suffix == '.md' and target.is_file():
                    pending.append(target)
        self.assertEqual({p.resolve() for p in SKILL.rglob('*.md')}, seen,
                         'every reference must be discoverable after installation')

    def test_ui_metadata_invokes_the_packaged_skill(self):
        text = (SKILL / 'agents' / 'openai.yaml').read_text(encoding='utf-8')
        values = dict(re.findall(r'^  ([a-z_]+): "([^\n]+)"$', text, re.M))
        self.assertTrue(values.get('display_name'))
        self.assertGreaterEqual(len(values.get('short_description', '')), 25)
        self.assertLessEqual(len(values['short_description']), 64)
        self.assertIn('$' + SKILL.name, values.get('default_prompt', ''))
        self.assertNotRegex(text, r'allow_implicit_invocation:\s*false',
                            'normal discovery remains enabled')

    def test_package_has_no_unfinished_scaffolds_or_machine_bound_paths(self):
        for source in SKILL.rglob('*'):
            if not source.is_file():
                continue
            text = source.read_text(encoding='utf-8')
            with self.subTest(source=source.relative_to(SKILL)):
                self.assertNotRegex(text, r'\[TODO:[^\n]*\]')
                self.assertNotRegex(text, r'(?i)[a-z]:[/\\](?:Users|chenyunliang)[/\\]')


if __name__ == '__main__':
    unittest.main()
