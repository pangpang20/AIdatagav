const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const test = require('node:test');
const { extract } = require('../scripts/prepare-source-review');
const { verify } = require('../scripts/verify-source-review');
const { specs, renderReviewedSpec } = require('../scripts/source-review-specs');
const { refreshUserMenu } = require('../scripts/augment-requirement-specs');
const root = path.resolve(__dirname, '..', 'doc', 'requirements');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const index = JSON.parse(fs.readFileSync(path.join(root, 'evidence', 'source-review-20261023', 'index.json'), 'utf8'));

test('excerpts preserve exact text and UTF-16 offsets, including non-BMP text', () => {
  const text = '😀before anchor中文-after';
  const excerpt = extract(text, 'anchor', 7);
  assert.equal(text.slice(excerpt.start, excerpt.end), excerpt.text);
  assert.equal(excerpt.sha256, sha(excerpt.text));
  assert.throws(() => extract(text, 'missing'), /missing source anchor/);
});

test('original-source verification rejects changed resource bytes and forged excerpt contents', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'source-proof-'));
  try {
    const text = 'prefix anchor suffix';
    const file = path.join(directory, 'views-manage-user-userEdit.dd9b1d2c.js');
    fs.writeFileSync(file, text);
    const source = { id: 'SRC-USER-FORM', bytes: Buffer.byteLength(text), sha256: sha(text), excerpts: [extract(text, 'anchor')] };
    assert.deepEqual(verify({ sources: [source] }, directory), { sources: 1, excerpts: 1, errors: 0, applicationWrites: 0 });
    const forged = structuredClone(source);
    forged.excerpts[0].text = 'forged';
    forged.excerpts[0].sha256 = sha('forged');
    assert.throws(() => verify({ sources: [forged] }, directory), /excerpt mismatch/);
    fs.writeFileSync(file, text + 'changed');
    assert.throws(() => verify({ sources: [source] }, directory), /resource digest mismatch/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('source evidence has unique IDs, relative resource paths, valid digests and honest execution status', () => {
  assert.equal(index.sources.length, 29);
  assert.equal(new Set(index.sources.map(source => source.id)).size, index.sources.length);
  assert.equal(index.requirements.length, 24);
  assert.equal(index.applicationWrites, 0);
  assert.equal(index.networkRequestsByExtractor, 0);
  for (const source of index.sources) {
    assert.equal(source.evidenceType, 'static-source');
    assert.equal(source.applicationAcceptanceExecuted, false);
    assert.match(source.resourcePath, /^\/(?:module-common|sms|dis|static)\//);
    assert.doesNotMatch(source.resourcePath, /https?:\/\//);
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
    assert.ok(source.bytes > 0);
    assert.ok(!Number.isNaN(Date.parse(source.inspectedAt)));
    for (const excerpt of source.excerpts) {
      assert.ok(excerpt.start >= 0 && excerpt.end > excerpt.start);
      assert.equal(excerpt.end - excerpt.start, excerpt.text.length);
      assert.ok(excerpt.text.includes(excerpt.anchor));
      assert.equal(sha(excerpt.text), excerpt.sha256);
      assert.doesNotMatch(excerpt.text, /https?:\/\//);
    }
  }
});

test('every reviewed rule traces to evidence and an existing requirement, without inventing acceptance success', () => {
  const sourceIds = new Set(index.sources.map(source => source.id));
  const registeredIds = new Set(index.requirements.map(item => item.id));
  for (const spec of Object.values(specs)) {
    assert.ok(registeredIds.has(spec.id));
    for (const id of spec.sources) assert.ok(sourceIds.has(id), `${spec.id} missing ${id}`);
    const document = spec.id.startsWith('UAC-') ? '用户菜单补充清单.md' : spec.id.match(/^(DIS-5|SMS-5)/) ? '子页面与操作细化.md' : '需求说明.md';
    const text = fs.readFileSync(path.join(root, spec.group, document), 'utf8');
    assert.ok(text.includes(`### ${spec.id} `), `${spec.id} original heading missing`);
    const rendered = renderReviewedSpec(spec, 201);
    assert.equal((rendered.match(/【拟定，未执行】 \|/g) || []).length, 5);
    assert.doesNotMatch(rendered, /【已执行】/);
    assert.equal(spec.checks.length, 5);
    for (let n = 1; n <= 8; n++) assert.match(rendered, new RegExp(`#### ${n}\\. `));
    const fields = rendered.slice(rendered.indexOf('| 字段名称 |'), rendered.indexOf('#### 2.'));
    assert.doesNotMatch(fields, /未观察到|未取得|未标注|待验证/);
  }
});

test('reviewed user creation specifies actual parameters, conditional rules and the supported account format', () => {
  const spec = renderReviewedSpec(specs['BAS-002'], 23);
  assert.match(spec, /\^\[a-zA-Z0-9\]\{4,20\}\$/);
  assert.match(spec, /USERINFO_REQUIRE.mobilephone/);
  assert.match(spec, /newPwd/);
  assert.match(spec, /privacyStatementUrl有值才显示/);
  assert.match(spec, /不能据此认定提交按钮已禁用/);
});

test('review does not apply generic cancel or HTTP-success claims to immediate upload and two-step task execution', () => {
  const info = renderReviewedSpec(specs['UAC-001']);
  assert.match(info, /立即PUT上传，不等待基本信息确认/);
  assert.match(info, /不能撤销已完成的头像上传/);
  const task = renderReviewedSpec(specs['SMS-105']);
  assert.match(task, /保存resolve后再调用start\/exec/);
  assert.match(task, /第二步失败不能承诺已回滚第一步/);
  assert.match(renderReviewedSpec(specs['DIS-102']), /不能只凭HTTP成功展示配置成功/);
});

test('published formal specs contain reviewed rules and user menu regeneration preserves its 25 case IDs', () => {
  const formal = fs.readFileSync(path.join(root, '36-后台系统管理', '需求说明.md'), 'utf8');
  assert.match(formal, /SRC-USER-FORM/);
  assert.match(formal, /\/common\/user\/userrole\/role/);
  const menuFile = path.join(root, '02-工作台', '用户菜单补充清单.md');
  const before = fs.readFileSync(menuFile, 'utf8');
  const ids = [...before.matchAll(/^\| (UAC-AC-\d{3}) \|/gm)].map(match => match[1]);
  assert.equal(ids.length, 25);
  assert.equal(new Set(ids).size, 25);
  assert.equal(refreshUserMenu(), false, 'refresh should not rewrite published menu specs');
  assert.equal(fs.readFileSync(menuFile, 'utf8'), before);
});
