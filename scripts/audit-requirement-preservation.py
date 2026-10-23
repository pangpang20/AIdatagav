"""Audit route-only evidence normalization against an explicit Git baseline."""
import argparse
import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('route_normalizer', Path(__file__).with_name('normalize-requirement-paths.py'))
normalizer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(normalizer)


def equivalent(before, after, suffix, editorial_revision=None):
    if suffix == '.png':
        return before == after
    expected = normalizer.normalize_text(before.decode('utf-8'), markdown=suffix == '.md')
    if editorial_revision is not None:
        if suffix != '.md' or hashlib.sha256(expected.encode('utf-8')).hexdigest() != editorial_revision.get('sourceSha256'):
            return False
        for replacement in editorial_revision.get('replacements', []):
            original = replacement.get('before', '')
            count = replacement.get('occurrences', 0)
            if not original or count < 1 or expected.count(original) != count:
                return False
            expected = expected.replace(original, replacement.get('after', ''))
    return expected.encode('utf-8') == after


def audit(repo, baseline):
    docs = repo / 'doc/requirements'
    manifest = json.loads((docs / '采样清单.json').read_text(encoding='utf-8'))
    errors = []

    def previous(path):
        return subprocess.run(['git', 'show', baseline + ':' + path.relative_to(repo).as_posix()],
                              cwd=repo, check=True, capture_output=True).stdout

    for module in manifest['modules']:
        folder = docs / module['directory']
        archive = folder / module['researchFile']
        if not equivalent(previous(folder / '需求说明.md'), archive.read_bytes(), '.md', module.get('researchEditorialRevision')):
            errors.append(module['code'] + ': archive differs beyond approved normalization/editorial revision')
        if hashlib.sha256(archive.read_bytes()).hexdigest() != module['researchSha256']:
            errors.append(module['code'] + ': archive registry hash mismatch')
    if not equivalent(previous(docs / '00-总览与跨模块流程.md'), (docs / '调研总览.md').read_bytes(), '.md'):
        errors.append('overview archive differs beyond route normalization')
    counts = {'png': 0, 'json': 0, 'json_normalized': 0}
    nonempty_password_values = 0
    for path in sorted((docs / 'evidence').iterdir()):
        if path.suffix not in ['.png', '.json']:
            continue
        before, after = previous(path), path.read_bytes()
        counts[path.suffix[1:]] += 1
        if not equivalent(before, after, path.suffix):
            errors.append(path.name + ': evidence differs beyond approved transformation')
        if path.suffix == '.json':
            counts['json_normalized'] += before != after
            capture = json.loads(after)
            controls = capture.get('controls', []) + capture.get('elements', {}).get('fields', [])
            nonempty_password_values += sum(c.get('type') == 'password' and bool(c.get('value')) for c in controls)
    if nonempty_password_values:
        errors.append('nonempty password controls require local review')
    return {'baseline': baseline, 'module_archives_compared': len(manifest['modules']),
            'overview_archives_compared': 1, 'original_pngs_compared': counts['png'],
            'original_jsons_compared': counts['json'], 'jsons_route_normalized': counts['json_normalized'],
            'nonempty_password_control_values': nonempty_password_values, 'errors': errors}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--baseline', required=True)
    args = parser.parse_args()
    result = audit(args.repo.resolve(), args.baseline)
    print(json.dumps(result, ensure_ascii=False))
    raise SystemExit(bool(result['errors']))
