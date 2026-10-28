const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { augmentFile } = require('../scripts/augment-requirement-specs');

const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'doc/requirements/32-报告模板');
const MAIN = path.join(MODULE, '需求说明.md');
const CHILD = path.join(MODULE, '子页面与操作细化.md');
const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const ids = (text, expression) => [...text.matchAll(expression)].map((match) => match[1]);
const sequence = (prefix, start, end) => Array.from(
  { length: end - start + 1 },
  (_, index) => `${prefix}-${String(start + index).padStart(3, '0')}`,
);

test('RTMS requirement and acceptance IDs remain unique and complete', () => {
  const main = read(MAIN);
  const child = read(CHILD);
  assert.match(main, /<!-- rtms:reviewed-spec-v1 -->/);
  assert.match(child, /<!-- rtms:reviewed-spec-v1 -->/);
  assert.deepEqual(ids(main, /^### (RTMS-\d{3})\b/gm), [
    'RTMS-100', 'RTMS-102', 'RTMS-103', 'RTMS-104', 'RTMS-001',
  ]);
  assert.deepEqual(ids(child, /^### (RTMS-\d{3})\b/gm), [
    'RTMS-500', 'RTMS-501', 'RTMS-502',
  ]);

  const mainAcceptance = ids(main, /^\| (RTMS-AC-\d{3}) \|/gm);
  const childAcceptance = ids(child, /^\| (RTMS-AC-\d{3}) \|/gm);
  assert.deepEqual(mainAcceptance, [
    ...sequence('RTMS-AC', 509, 533),
    ...sequence('RTMS-AC', 1, 31),
  ]);
  assert.deepEqual(childAcceptance, [
    ...sequence('RTMS-AC', 534, 548),
    ...sequence('RTMS-AC', 500, 508),
  ]);
  assert.equal(new Set([...mainAcceptance, ...childAcceptance]).size, 80);

  const manifest = JSON.parse(read(path.join(ROOT, 'doc/requirements/采样清单.json')));
  const registered = manifest.modules.find((module) => module.code === 'RTMS').businessAcceptance;
  assert.deepEqual(mainAcceptance, registered);
  assert.deepEqual(manifest.modules.find(module => module.code === 'RTMS').qualityRequirements,
    main.split('\n').filter(line => /^\| RTMS-NFR-\d{3} \|/.test(line)).map(row => ({
      id: row.split('|')[1].trim(),
      relatedRequirements: [...row.split('|').at(-3).matchAll(/RTMS-\d{3}/g)].map(match => match[0]),
    })));
  for (const text of [main, child]) {
    const requirements = new Set(ids(text, /^### (RTMS-\d{3})\b/gm));
    assert.match(text, /<!-- 业务规格格式:plain-v1 -->/);
    for (const row of text.split('\n').filter(line => /^\| RTMS-AC-\d{3} \|/.test(line))) {
      const refs = [...row.matchAll(/(?<![A-Z-])RTMS-\d{3}\b/g)].map(match => match[0]);
      assert.equal(refs.length, 1, `one functional reference required: ${row}`);
      assert.ok(requirements.has(refs[0]), `reference belongs to document: ${row}`);
      assert.equal(row.trim().split('|').at(-2).trim(), '未执行');
    }
  }
});

test('every RTMS function retains nine specific development sections and five owned checks', () => {
  const labels = ['页面字段清单', '页面交互规则', '业务流程与异常分支', '接口与数据规则',
    '验收标准', '权限与安全要求', '页面布局与状态', '关联文档', '非功能性需求'];
  for (const text of [read(MAIN), read(CHILD)]) {
    for (const match of text.matchAll(/^### (RTMS-\d{3})[^\n]*\n([\s\S]*?)(?=^### RTMS-\d{3}|^## |(?![\s\S]))/gm)) {
      const [, id, block] = match;
      assert.ok(block.includes(`<!-- 完整规格:${id} -->`));
      labels.forEach((label, i) => assert.ok(block.includes(`#### ${i + 1}. ${label}（${id}）`), `${id}: ${label}`));
      const fields = block.split('#### 1.')[1].split('#### 2.')[0];
      const fieldRows = fields.split('\n').filter(line => line.startsWith('|') && line.split('|').length === 10).slice(2);
      assert.ok(fieldRows.length > 0);
      assert.doesNotMatch(fieldRows.join('\n'), /未观察到|未取得|未标注|待验证/);
      const cases = block.split('#### 5.')[1].split('#### 6.')[0].split('\n').filter(line => /^\| RTMS-AC-/.test(line));
      assert.equal(cases.length, 5);
      cases.forEach(row => assert.equal(row.split('|')[3].trim(), id));
    }
  }
});

test('RTMS quality requirements are separately numbered, measurable, and unexecuted', () => {
  const main = read(MAIN);
  const rows = main.split('\n').filter((line) => /^\| RTMS-NFR-\d{3} \|/.test(line));
  assert.deepEqual(rows.map((line) => line.match(/^\| (RTMS-NFR-\d{3}) \|/)[1]),
    sequence('RTMS-NFR', 1, 8));
  for (const row of rows) {
    assert.match(row, /未执行/);
    assert.match(row, /RTMS-(?:100|102|103|104|001|500|501|502)/);
    assert.match(row, /P95|字节|服务端|键盘|审计|资源|至少|稳定版|20次/);
  }
  assert.doesNotMatch(main, /\| \| \| \| \| \| \|/);
  assert.doesNotMatch(main, /账号重复|确认值不一致|密码一致性/);
});

test('reviewed RTMS main document is not replaced by the generic augmenter', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rtms-main-'));
  try {
    for (const source of [MAIN, CHILD]) {
      const file = path.join(temp, path.basename(source));
      fs.copyFileSync(source, file);
      const before = fs.readFileSync(file);
      const result = augmentFile(file);
      assert.equal(result.changed, false);
      assert.deepEqual(fs.readFileSync(file), before);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
