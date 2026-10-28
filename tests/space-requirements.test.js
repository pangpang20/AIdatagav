const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { augmentFile } = require('../scripts/augment-requirement-specs');
const { selections, select, verifyAll } = require('../scripts/prepare-space-evidence');
const { extractSources } = require('../scripts/prepare-workbench-evidence');
const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'doc/requirements/33-工作空间');
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const main = () => read(path.join(MODULE, '需求说明.md'));
const child = () => read(path.join(MODULE, '子页面与操作细化.md'));
const ids = (text, regex) => [...text.matchAll(regex)].map(m => m[1]);
const sequence = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => prefix + String(from + i).padStart(3, '0'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

test('SPACE preserves all published IDs and registers expanded operations and quality rows', () => {
  const manifest = JSON.parse(read(path.join(ROOT, 'doc/requirements/采样清单.json')));
  const module = manifest.modules.find(m => m.code === 'SPACE');
  assert.deepEqual(ids(main(), /^### (SPACE-\d{3})\b/gm),
    ['SPACE-100', 'SPACE-101', 'SPACE-102', 'SPACE-103', 'SPACE-104', 'SPACE-001']);
  assert.deepEqual(module.businessRequirements.map(r => r.id), module.developmentReview.expandedOperations);
  const expected = [...sequence('SPACE-AC-', 503, 507), ...sequence('SPACE-AC-', 518, 537),
    ...sequence('SPACE-AC-', 508, 512), ...sequence('SPACE-AC-', 1, 6)];
  assert.deepEqual(ids(main(), /^\| (SPACE-AC-\d{3}) \|/gm), expected);
  assert.deepEqual(module.businessAcceptance, expected);
  const childIds = ids(child(), /^\| (SPACE-AC-\d{3}) \|/gm);
  assert.deepEqual(childIds, [...sequence('SPACE-AC-', 513, 517), ...sequence('SPACE-AC-', 500, 502)]);
  assert.equal(new Set([...expected, ...childIds]).size, 44);
  assert.deepEqual(module.qualityRequirements, main().split('\n')
    .filter(row => /^\| SPACE-NFR-/.test(row)).map(row => ({ id: row.split('|')[1].trim(),
      relatedRequirements: [...row.split('|').at(-3).matchAll(/SPACE-\d{3}/g)].map(m => m[0]) })));
  assert.equal(module.developmentReview.productionReady, false);
  for (const text of [main(), child()]) {
    const owners = new Set(ids(text, /^### (SPACE-\d{3})\b/gm));
    for (const row of text.split('\n').filter(r => /^\| SPACE-AC-/.test(r))) {
      const refs = ids(row, /(?<![A-Z-])(SPACE-\d{3})\b/g);
      assert.equal(refs.length, 1);
      assert.ok(owners.has(refs[0]));
      assert.equal(row.split('|').at(-2).trim(), '未执行');
    }
  }
});

test('every SPACE operation has nine concrete sections, fields, HTTP contract and owned checks', () => {
  const labels = ['页面字段清单', '页面交互规则', '业务流程与异常分支', '接口与数据规则',
    '验收标准', '权限与安全要求', '页面布局与状态', '关联文档', '非功能性需求'];
  let count = 0;
  for (const text of [main(), child()]) {
    assert.match(text, /<!-- 业务规格格式:plain-v1 -->/);
    assert.doesNotMatch(text, /【|】|待确认|拟定需求|确认值不一致|密码一致性/);
    for (const m of text.matchAll(/^### (SPACE-\d{3})[^\n]*\n([\s\S]*?)(?=^### SPACE-\d{3}|^## |(?![\s\S]))/gm)) {
      const [, id, block] = m;
      count++;
      labels.forEach((label, i) => assert.ok(block.includes(`#### ${i + 1}. ${label}（${id}）`), `${id}: ${label}`));
      assert.ok(block.includes(`<!-- 完整规格:${id} -->`));
      const rows = block.split('#### 1.')[1].split('#### 2.')[0].split('\n')
        .filter(r => r.startsWith('|') && r.split('|').length === 10).slice(2);
      assert.ok(rows.length > 0);
      rows.forEach(row => assert.ok(row.split('|')[1].trim()));
      assert.match(block.split('#### 4.')[1].split('#### 5.')[0], /POST|GET|PUT|DELETE/);
      const checks = block.split('#### 5.')[1].split('#### 6.')[0].split('\n').filter(r => /^\| SPACE-AC-/.test(r));
      assert.equal(checks.length, 5);
      checks.forEach(row => assert.equal(row.split('|')[3].trim(), id));
    }
  }
  assert.equal(count, 7);
});

test('SPACE facts are backed by selected text and do not treat F087 as the list', () => {
  const index = JSON.parse(read(path.join(ROOT, 'doc/requirements/evidence/space-review-20261028/index.json')));
  assert.equal(index.sources.length, 9);
  const text = index.sources.flatMap(s => s.excerpts.map(e => e.text)).join('\n');
  for (const token of ['queryCondition', 'myCreated', 'myJoin', 'pageSize:20', 'pageNo:1',
    'administratorId', 'dataSourceIds', 'memberIdsBac', 'workSpaceId', 'spaceObjective',
    '/workspace/page', '/workspace/update', '/common/switchSpace/', '/user/page', '/main/subject']) assert.ok(text.includes(token), token);
  for (const source of index.sources) {
    assert.ok(source.resourcePath.startsWith('/'));
    assert.doesNotMatch(source.resourcePath, /https?:/);
    for (const excerpt of source.excerpts) {
      assert.equal(excerpt.sha256, sha(excerpt.text));
      assert.equal(excerpt.end - excerpt.start, excerpt.text.length);
      assert.doesNotMatch(excerpt.text, /https?:\/\//);
    }
  }
  assert.doesNotMatch(main() + child(), /F087-SPACE-space-list\.png|\/back\/common\/auth\/main\/subject/);
  const audit = read(path.join(MODULE, '核查记录.md'));
  assert.match(audit, /F087[\s\S]*错目标/);
  assert.match(audit, /静态实现|现有实现与目标差异/);
  assert.match(audit, /无论非零code仍emit submit/);
  assert.match(main(), /\/back\/common\/user\/main\/subject/);
});

test('SPACE quality goals are independently numbered, measurable and unexecuted', () => {
  const rows = main().split('\n').filter(r => /^\| SPACE-NFR-/.test(r));
  assert.deepEqual(ids(rows.join('\n'), /^\| (SPACE-NFR-\d{3}) \|/gm), sequence('SPACE-NFR-', 1, 9));
  rows.forEach(row => {
    assert.equal(row.split('|').at(-2).trim(), '未执行');
    assert.match(row, /失败|拒绝|泄漏0条|越界/);
  });
  assert.match(main(), /P95≤2s[\s\S]*至少200请求/);
  assert.match(main(), /0未被排除/);
  assert.match(read(path.join(MODULE, '核查记录.md')), /本次新增评审目标，没有现有SLA或实测依据/);
});

test('SPACE reviewed main and child survive generic refresh byte for byte', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'space-refresh-'));
  const args = process.argv.slice();
  try {
    process.argv.push('--refresh');
    for (const source of ['需求说明.md', '子页面与操作细化.md']) {
      const file = path.join(temp, source);
      fs.copyFileSync(path.join(MODULE, source), file);
      const before = fs.readFileSync(file);
      assert.equal(augmentFile(file).changed, false);
      assert.deepEqual(fs.readFileSync(file), before);
    }
  } finally {
    process.argv.splice(0, process.argv.length, ...args);
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

function fixture() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'space-source-'));
  const directories = {};
  const inspectedAt = '2026-10-28T00:00:00.000Z';
  const sources = [];
  for (const [group, items] of Object.entries(selections)) {
    const dir = path.join(temp, group);
    directories[group] = dir;
    fs.mkdirSync(dir);
    const receipts = [];
    for (const [, file, ranges] of items) {
      const text = ranges.map(([anchor, end]) => anchor + (typeof end === 'number'
        ? 'x'.repeat(Math.max(end - anchor.length, 0)) : end || '')).join('\n');
      const raw = Buffer.from(text);
      fs.writeFileSync(path.join(dir, file), raw);
      receipts.push({ localName: file, path: '/static/' + file, bytes: raw.length, sha256: sha(raw), fetchedAt: inspectedAt });
    }
    fs.writeFileSync(path.join(dir, 'receipt.json'), JSON.stringify(receipts));
    sources.push(...extractSources(dir, inspectedAt, select(dir, group)).map(s => ({ ...s, sourceGroup: group })));
  }
  return { temp, directories, data: { schemaVersion: 1, inspectedAt, evidenceType: 'static-source',
    businessRequests: 0, browserOperations: 0, applicationAcceptanceExecuted: false, sources } };
}

test('SPACE source verification rejects execution claims, changed groups, bytes, offsets and receipts', () => {
  const { temp, data, directories } = fixture();
  try {
    assert.deepEqual(verifyAll(data, directories), { sources: 9, excerpts: 23, errors: 0 });
    for (const change of [
      x => { x.applicationAcceptanceExecuted = true; }, x => { x.businessRequests = 1; },
      x => { x.browserOperations = 1; }, x => { x.sources[0].sourceGroup = 'shared'; },
      x => { x.sources[0].excerpts[0].start++; }, x => { x.sources[0].excerpts[0].text += 'x'; },
      x => { x.sources[0].bytes++; }, x => { x.sources[0].sha256 = '0'.repeat(64); },
      x => { x.sources[0].fetchedAt = '2026-10-29'; }, x => { x.sources[0].id = x.sources[1].id; },
    ]) {
      const bad = structuredClone(data);
      change(bad);
      assert.throws(() => verifyAll(bad, directories));
    }
    const file = path.join(directories.page, data.sources[0].localName);
    fs.appendFileSync(file, 'tampered');
    assert.throws(() => verifyAll(data, directories), /receipt mismatch|resource mismatch/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
