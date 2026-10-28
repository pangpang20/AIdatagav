'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'doc/requirements/27-数据标准检测');
const spec = require('../scripts/dsts-requirement-spec');
const manifest = require('../doc/requirements/采样清单.json');
const moduleEntry = manifest.modules.find((item) => item.code === 'DSTS');
const published = require('../scripts/dsts-published-registry.json');
const evidence = require('../scripts/prepare-dsts-evidence');

function read(name) {
  return fs.readFileSync(path.join(folder, name), 'utf8').replace(/\r\n/gu, '\n');
}

function acceptanceRows(text) {
  return text.split('\n').filter((line) => line.startsWith('| DSTS-AC-'));
}

function acceptanceId(row) {
  return row.split('|')[1].trim();
}

function acceptanceRequirement(row) {
  return row.split('|').at(-3).trim();
}

function acceptanceStatus(row) {
  return row.split('|').at(-2).trim();
}

test('DSTS documents match guarded renderers and retain seven unique functional requirements', () => {
  const documents = [
    ['需求说明.md', spec.renderMain(), spec.MAIN],
    ['子页面与操作细化.md', spec.renderSub(), spec.SUB],
  ];
  const ids = [];
  const acceptance = [];

  for (const [name, rendered, entries] of documents) {
    const current = read(name);
    assert.equal(current, rendered, `${name} must be reproducible from the published DSTS registry`);
    spec.guardDocument(name === '需求说明.md' ? 'main' : 'sub', current);
    for (let section = 1; section <= 8; section += 1) {
      assert.match(current, new RegExp(`^## ${section}\\. `, 'mu'), `${name} must retain top-level section ${section}`);
    }
    const headings = current.split('\n').filter((line) => line.startsWith('### DSTS-'));
    assert.deepEqual(headings.map((line) => line.match(/^### (DSTS-\d{3})/u)[1]), entries.map((entry) => entry.id));
    ids.push(...headings.map((line) => line.match(/^### (DSTS-\d{3})/u)[1]));

    for (const entry of entries) {
      const block = current.split(`### ${entry.id} `)[1].split(/^### |^## /mu)[0];
      for (const title of [
        '页面字段清单', '页面交互规则', '流程与异常', '接口与数据规则', '验收标准',
        '权限与安全', '页面布局与状态', '关联文档与证据', '非功能性需求', '业务目的',
      ]) assert.ok(block.includes(title), `${entry.id} is missing ${title}`);
      if (entry.id === 'DSTS-502') {
        const tablesApi = block.split('\n').find((line) => line.includes('/datasource/tables/{id}'));
        assert.ok(tablesApi, 'DSTS-502 must document the data-source table request');
        assert.match(tablesApi, /路径参数 id；JSON body \{tableName\}/u);
        assert.doesNotMatch(tablesApi, /JSON body 数据源ID/u);
      }
      const rows = acceptanceRows(block);
      assert.equal(rows.length, 5, `${entry.id} must retain five acceptance cases`);
      for (const row of rows) {
        assert.equal(acceptanceRequirement(row), entry.id);
        assert.equal(acceptanceStatus(row), '未执行');
        acceptance.push(acceptanceId(row));
      }
    }
    assert.doesNotMatch(current, /【[^】]*】|未观察到|未从当前证据取得|未取得(?:最大)?长度|拟定需求|本轮|源码|历史DOM/u);
  }

  assert.equal(ids.length, 7);
  assert.equal(new Set(ids).size, 7);
  assert.equal(acceptance.length, 35);
  assert.equal(new Set(acceptance).size, 35);
  const allAcceptance = documents.flatMap(([name]) => acceptanceRows(read(name)).map(acceptanceId));
  assert.equal(allAcceptance.length, 56);
  assert.equal(new Set(allAcceptance).size, 56);
  assert.deepEqual(acceptance, [...spec.MAIN, ...spec.SUB].flatMap((entry) => entry.checks));

  const main = read('需求说明.md');
  const nfrSection = main.split('## 9. 非功能需求\n')[1];
  const nfrRows = nfrSection.split('\n').filter((line) => line.startsWith('| DSTS-NFR-'));
  assert.equal(nfrRows.length, 18);
  assert.deepEqual(nfrRows.map((row) => row.split('|')[1].trim()), spec.NFR.map(([id]) => id));
  assert.ok(nfrRows.every((row) => row.split('|').at(-2).trim() === '未执行'));

  const audit = read('核查记录.md');
  for (const [id, , , source] of spec.NFR) assert.ok(audit.includes(id) && audit.includes(source), `${id} must retain its evidence boundary`);
});

test('sampling registry binds all DSTS quality requirements to reviewed functions', () => {
  assert.deepEqual(moduleEntry.businessRequirements.map((item) => item.id), spec.MAIN.map((item) => item.id));
  assert.deepEqual(moduleEntry.businessAcceptance, spec.mainAcceptanceIds());

  const expected = new Map();
  for (const feature of [...spec.MAIN, ...spec.SUB]) {
    for (const id of feature.quality) {
      if (!expected.has(id)) expected.set(id, []);
      expected.get(id).push(feature.id);
    }
  }
  assert.equal(moduleEntry.qualityRequirements.length, 18);
  assert.deepEqual(moduleEntry.qualityRequirements.map((item) => item.id), spec.NFR.map(([id]) => id));
  for (const item of moduleEntry.qualityRequirements) {
    assert.deepEqual(item.relatedRequirements, expected.get(item.id));
  }
});

test('preserves the historical operation anchor and distinguishes its register section', () => {
  const main = spec.renderMain();
  assert.match(main, /^## 6\. 历史操作边界$/mu);
  assert.match(main, /^## 7\. 历史操作编号保留$/mu);
});

test('DSTS renderer rejects missing IDs, changed associations, evidence loss, and claimed execution', () => {
  const main = spec.renderMain();
  const row = acceptanceRows(main)[0];
  assert.throws(() => spec.guardDocument('main', main.replace(row, row.replace('| 未执行 |', '| 通过 |'))), /state\/association/u);
  assert.throws(() => spec.guardDocument('main', main.replace(row, row.replace('| DSTS-100 |', '| DSTS-999 |'))), /state\/association/u);
  assert.throws(() => spec.guardDocument('main', main.replace('### DSTS-100 查询检测方案', '### DSTS-999 查询检测方案')), /requirement IDs/u);
  assert.throws(() => spec.guardDocument('main', main.replace('C030-original-content.png', 'missing.png')), /historical evidence missing/u);
});

test('DSTS static evidence verifies content hashes and rejects altered or overclaimed records', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'doc/requirements/evidence/dsts-review-20261028/index.json'), 'utf8'));
  assert.equal(index.capturedStaticResources, 22);
  assert.equal(index.collectionScopeComplete, false);
  assert.equal(index.totalRequests, null);
  assert.equal(index.failures, null);
  assert.equal(index.businessRequestsByCollector, null);
  assert.equal(index.applicationAcceptanceExecuted, false);
  assert.equal(index.sources.length, 21);
  assert.equal(new Set(index.sources.map((source) => source.id)).size, 21);

  for (const source of index.sources) {
    assert.ok(source.resourcePath.startsWith('/'));
    assert.match(source.sha256, /^[a-f0-9]{64}$/u);
    for (const excerpt of source.excerpts) {
      assert.equal(excerpt.end - excerpt.start, excerpt.text.length);
      assert.equal(crypto.createHash('sha256').update(excerpt.text).digest('hex'), excerpt.sha256);
    }
  }

  const ownDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsts-own-'));
  const sharedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsts-shared-'));
  const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
  const makeSources = (group, count, dir, phrase) => Array.from({ length: count }, (_, index) => {
    const id = `${group}-${index + 1}`;
    const localName = `${id}.js`;
    const raw = `prefix ${phrase} suffix ${id}`;
    const start = raw.indexOf(phrase);
    fs.writeFileSync(path.join(dir, localName), raw);
    return {
      id, sourceGroup: group, localName, bytes: Buffer.byteLength(raw), sha256: hash(raw),
      excerpts: [{ start, end: start + phrase.length, text: phrase, sha256: hash(phrase) }],
    };
  });
  const own = makeSources('own', 18, ownDir, '标准字段');
  const shared = makeSources('shared', 3, sharedDir, 'request');
  const data = {
    capturedStaticResources: 22, collectionScopeComplete: false, totalRequests: null,
    failures: null, businessRequestsByCollector: null,
    applicationAcceptanceExecuted: false, sources: [...own, ...shared],
  };

  try {
    assert.deepEqual(evidence.verifyAll(data, ownDir, sharedDir), { sources: 21, excerpts: 21, errors: 0 });
    assert.throws(() => evidence.verifyAll({ ...data, sources: [own[0], own[0], ...own.slice(1), ...shared] }, ownDir, sharedDir), /duplicate source ID/u);
    assert.throws(() => evidence.verifyAll({ ...data, businessRequestsByCollector: 1 }, ownDir, sharedDir), /unknown request scope/u);
    assert.throws(() => evidence.verifyAll({ ...data, applicationAcceptanceExecuted: true }, ownDir, sharedDir), /boundary mismatch/u);
    assert.throws(() => evidence.verifyAll({ ...data, sources: [{ ...own[0], sourceGroup: 'missing' }, ...own.slice(1), ...shared] }, ownDir, sharedDir), /source group/u);
    assert.throws(() => evidence.verifyAll({ ...data, sources: [{ ...own[0], excerpts: [{ ...own[0].excerpts[0], start: own[0].excerpts[0].start + 1 }] }, ...own.slice(1), ...shared] }, ownDir, sharedDir), /excerpt mismatch/u);
    fs.appendFileSync(path.join(ownDir, own[0].localName), 'changed');
    assert.throws(() => evidence.verifyAll(data, ownDir, sharedDir), /resource mismatch/u);
  } finally {
    fs.rmSync(ownDir, { recursive: true, force: true });
    fs.rmSync(sharedDir, { recursive: true, force: true });
  }
});

test('DSTS receipt preparation rejects failed or non-static requests and leaves missing scope unknown', () => {
  const receipts = Array.from({ length: 22 }, (_, index) => ({
    path: `/dsts/static/js/resource-${index + 1}.js`,
    localName: `resource-${index + 1}.js`,
  }));
  assert.deepEqual(evidence.summarizeReceipt(receipts, null), {
    capturedStaticResources: 22,
    totalRequests: null,
    failures: null,
    businessRequestsByCollector: null,
    collectionScopeComplete: false,
  });

  const successful = receipts.map((receipt) => ({ ...receipt, method: 'GET', status: 200 }));
  const scope = { totalRequests: 22, staticGetRequests: 22, failures: 0, businessRequestsByCollector: 0 };
  assert.deepEqual(evidence.summarizeReceipt(successful, scope), {
    capturedStaticResources: 22,
    totalRequests: 22,
    failures: 0,
    businessRequestsByCollector: 0,
    collectionScopeComplete: true,
  });
  assert.throws(() => evidence.summarizeReceipt(receipts.map((receipt, index) =>
    index === 0 ? { ...receipt, error: 'request failed' } : receipt), null), /failed receipt/u);
  assert.throws(() => evidence.summarizeReceipt(receipts.map((receipt, index) =>
    index === 0 ? { ...receipt, method: 'POST' } : receipt), null), /static GET/u);
  assert.throws(() => evidence.summarizeReceipt(receipts.map((receipt, index) =>
    index === 0 ? { ...receipt, path: '/back/dsts/base/plan/page' } : receipt), null), /static resource path/u);
  assert.throws(() => evidence.summarizeReceipt(successful, { ...scope, businessRequestsByCollector: 1 }), /scope mismatch/u);
});

test('shared augmenter refresh is stable for generated DSTS content', () => {
  const { augmentFile } = require('../scripts/augment-requirement-specs');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dsts-augment-'));
  const file = path.join(directory, '需求说明.md');
  const originalArgs = process.argv.slice();
  try {
    fs.writeFileSync(file, read('需求说明.md'), 'utf8');
    const result = augmentFile(file, new Map());
    assert.equal(result.changed, false);
    assert.equal(fs.readFileSync(file, 'utf8').replace(/\r\n/gu, '\n'), read('需求说明.md'));
  } finally {
    process.argv.splice(0, process.argv.length, ...originalArgs);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
