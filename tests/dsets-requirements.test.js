'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'doc/requirements/28-数据安全检测');
const files = ['需求说明.md', '子页面与操作细化.md'];
const read = file => fs.readFileSync(path.join(folder, file), 'utf8').replace(/\r\n/g, '\n');
const spec = require('../scripts/dsets-requirement-spec');

function acceptanceRows(text) {
  return [...text.matchAll(/^\| (DSETS-AC-\d{3}) \|[^\n]*$/gm)].map(match => {
    const cells = match[0].split('|').map(value => value.trim());
    return { id: cells[1], association: cells.at(-3), status: cells.at(-2), row: match[0] };
  });
}

test('DSETS keeps published feature IDs, acceptance IDs, order and associations', () => {
  const ledgers = [
    { type: 'main', file: files[0], features: spec.MAIN },
    { type: 'sub', file: files[1], features: spec.SUB }
  ];

  for (const ledger of ledgers) {
    const text = read(ledger.file);
    const expectedFeatures = ledger.features.map(feature => feature.id);
    assert.deepEqual([...text.matchAll(/^### (DSETS-\d{3})\b/gm)].map(match => match[1]), expectedFeatures);

    const rows = acceptanceRows(text);
    const expectedCases = ledger.type === 'main'
      ? [...Array.from({ length: 10 }, (_, i) => 'DSETS-AC-' + String(548 + i).padStart(3, '0')),
        ...Array.from({ length: 6 }, (_, i) => 'DSETS-AC-' + String(i + 1).padStart(3, '0'))]
      : [...Array.from({ length: 80 }, (_, i) => 'DSETS-AC-' + String(558 + i).padStart(3, '0')),
        ...Array.from({ length: 48 }, (_, i) => 'DSETS-AC-' + String(500 + i).padStart(3, '0'))];
    assert.deepEqual(rows.map(row => row.id), expectedCases);

    for (const row of rows) {
      assert.equal(row.status, '未执行', row.id);
      const references = [...new Set([...row.row.matchAll(/(?<![A-Z-])DSETS-\d{3}\b/g)].map(match => match[0]))];
      assert.deepEqual(references, [row.association], row.id + ' must reference only its associated feature');
      const numericId = Number(row.id.slice('DSETS-AC-'.length));
      const expectedAssociation = ledger.type === 'main'
        ? numericId >= 548
          ? numericId <= 552 ? 'DSETS-100' : 'DSETS-001'
          : [1, 2, 4, 5].includes(numericId) ? 'DSETS-100' : numericId === 3 || numericId === 6 ? 'DSETS-001' : ''
        : numericId >= 558
          ? 'DSETS-' + String(500 + Math.floor((numericId - 558) / 5)).padStart(3, '0')
          : 'DSETS-' + String(500 + Math.floor((numericId - 500) / 3)).padStart(3, '0');
      assert.equal(row.association, expectedAssociation, row.id);
    }

    for (const feature of ledger.features) {
      const block = text.split('### ' + feature.id + ' ')[1].split(/^### |^## /m)[0];
      for (const heading of [
        '1. 页面字段清单', '2. 页面交互规则', '3. 业务流程与异常分支',
        '4. 接口与数据规则', '5. 验收标准', '6. 权限与安全要求',
        '7. 页面布局与状态', '8. 证据与交付决策', '9. 非功能性需求'
      ]) assert.ok(block.includes(heading + '（' + feature.id + '）'), feature.id + ' ' + heading);
      for (const heading of ['**操作与规则**', '**结果与异常处理**', '**开发处理细则**']) {
        assert.ok(block.includes(heading), feature.id + ' ' + heading);
      }
      const fields = block.split('#### 1. 页面字段清单')[1].split('#### 2.')[0]
        .split('\n').filter(line => line.startsWith('|') && !line.startsWith('|---'));
      assert.ok(fields.length >= 2, feature.id + ' needs a field header and at least one row');
      for (const row of fields) assert.equal(row.split('|').slice(1, -1).length, 8, feature.id + ' ' + row);
      for (const source of feature.evidence) {
        assert.ok(block.includes(source + '.png'), feature.id + ' source link');
        const evidencePath = ledger.type === 'main'
          ? path.join(root, 'doc/requirements/evidence', source + '.png')
          : path.join(root, 'doc/requirements/evidence/live-recheck-20261022', source + '.png');
        assert.ok(fs.existsSync(evidencePath), source);
      }
    }
  }
});

test('DSETS documents state observed field contracts and unresolved page mappings precisely', () => {
  const main = read(files[0]);
  const sub = read(files[1]);
  for (const phrase of ['数据源名称','maxlength=100','maxlength=8000','正则规则','文本规则','双列表','数据量','表备注']) assert.ok(sub.includes(phrase), phrase);
  for (const phrase of ['/dsets/dataClassification/identificationRules/list','/dsets/evaluation/list','/dsets/dataSecurityStrategy/strategyList','安全目录']) assert.ok(sub.includes(phrase), phrase);
  assert.ok(sub.includes('分级审批') && sub.includes('评价任务') && sub.includes('任务调度配置'));
  assert.ok(main.includes('DSETS-NFR-016'));
  for (let id = 101; id <= 114; id++) assert.match(main, new RegExp('^\\| DSETS-' + id + ' \\|', 'm'));
  assert.ok(main.includes('../evidence/C031-original-content.png'));
  assert.ok(main.includes('../evidence/E054-security-check.png'));
  const subSources = sub.match(/^## 8\. 需求依据与关联资料\n([\s\S]*)/m)?.[1] || '';
  for (const feature of spec.SUB) {
    assert.ok(subSources.includes('| ' + feature.id + ' |'), feature.id + ' source mapping');
    assert.ok(subSources.includes(feature.evidence[0] + '.png'), feature.id + ' source image');
  }
  for (const text of [main, sub]) assert.doesNotMatch(text, /【|】|待确认|拟定需求|本轮|源码|历史DOM/);
  assert.equal([...main.matchAll(/^\| DSETS-NFR-\d{3} \|/gm)].length, spec.NFR.length);
  for (const row of main.matchAll(/^\| DSETS-NFR-\d{3} \|[^\n]*$/gm)) {
    const cells = row[0].split('|').map(value => value.trim());
    assert.equal(cells.length - 2, 6);
    assert.equal(cells.at(-2), '未执行');
  }
  assert.ok(main.includes('TLS') && main.includes('WCAG 2.2 AA') && main.includes('P95≤2秒'));
  assert.ok(!main.includes('月度可用率≥99.9%'));
});

test('DSETS generator is stable and rejects ledger, evidence, association or status damage', () => {
  for (const [index, file] of files.entries()) {
    const text = read(file);
    const type = index === 0 ? 'main' : 'sub';
    assert.equal(spec.renderDocument(type, text), text);
    assert.throws(() => spec.renderDocument(type, text.replace(/^\| DSETS-AC-\d{3} \|[^\n]*\n/m, '')), /acceptance IDs/);
    assert.throws(() => spec.renderDocument(type, text.replace(/^### DSETS-\d{3}.*\n/m, '')), /requirement IDs/);
    assert.throws(() => spec.renderDocument(type, text.replace('<!-- 业务规格格式:plain-v1 -->', '')), /plain format/);
    assert.throws(() => spec.renderDocument(type, text.replace(/^\| (DSETS-AC-\d{3}) \|([^\n]*\| )未执行 \|$/m, '| $1 |$2通过 |')), /association\/status ledger/);
    const feature = (index ? spec.SUB : spec.MAIN)[0];
    assert.throws(() => spec.renderDocument(type, text.replaceAll(feature.evidence[0] + '.png', 'missing.png')), /evidence missing/);
  }
});

test('DSETS rendering is idempotent in a temporary requirements tree', () => {
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dsets-spec-'));
  const target = path.join(tmp, '28-数据安全检测');
  fs.mkdirSync(target);
  try {
    for (const file of files) fs.copyFileSync(path.join(folder, file), path.join(target, file));
    assert.deepEqual(spec.write(tmp), { changed: 0, requirements: 18, acceptance: 144, nfr: 16 });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
