"""Keep application routes without deployment origins in documentation captures."""
import argparse
import hashlib
import json
import re
from pathlib import Path

APP_HOST = 'www.' + 'audaqueproxy' + '.com'
APP_PORT = 10223
APP_ORIGIN = re.compile(r'https?://' + re.escape(APP_HOST) + ':' + str(APP_PORT), re.I)
MARKDOWN_LINK = re.compile(r'(?<!!)\[([^\]]*)\]\((<?https?://[^)]+>?)\)')


def route_only(value):
    def replace(match):
        tail = value[match.end():]
        return '' if tail.startswith('/') else '/'
    return APP_ORIGIN.sub(replace, value)


def normalize_text(text, markdown=False):
    if markdown:
        def replace_link(match):
            label, target = match.groups()
            if not APP_ORIGIN.search(target):
                return match.group(0)
            route = route_only(target.strip('<>'))
            label = route_only(label)
            return '`' + route + '`' if label == route else label + '（应用路径：`' + route + '`）'
        text = MARKDOWN_LINK.sub(replace_link, text)
    return route_only(text)


def normalize_tree(root):
    changed = []
    for path in sorted(root.rglob('*')):
        if not path.is_file() or path.suffix.lower() not in {'.md', '.json', '.txt', '.html', '.csv', '.yaml', '.yml'}:
            continue
        before = path.read_bytes()
        source = before.decode('utf-8')
        result = normalize_text(source, path.suffix.lower() == '.md').encode('utf-8')
        if result != before:
            path.write_bytes(result)
            changed.append(path.relative_to(root).as_posix())
    manifest_path = root / 'requirements' / '采样清单.json'
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        for module in manifest['modules']:
            archive = manifest_path.parent / module['directory'] / module.get('researchFile', '需求说明.md')
            if module.get('researchFile'):
                module['researchSha256'] = hashlib.sha256(archive.read_bytes()).hexdigest()
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return changed


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', nargs='?', type=Path, default=Path('doc'))
    args = parser.parse_args()
    changes = normalize_tree(args.root)
    print(json.dumps({'changed_files': len(changes), 'markdown': sum(x.endswith('.md') for x in changes),
                      'json': sum(x.endswith('.json') for x in changes)}, ensure_ascii=False))
