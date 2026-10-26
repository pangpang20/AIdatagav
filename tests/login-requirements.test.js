const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const test = require('node:test');
const { augmentFile } = require('../scripts/augment-requirement-specs');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'doc/requirements/01-登录/需求说明.md');

test('login documents account and password instead of a blank field or query template', () => {
  const text = fs.readFileSync(file, 'utf8');
  const fields = text.slice(text.indexOf('#### 1.'), text.indexOf('#### 2.'));
  assert.match(fields, /\| 账号/);
  assert.match(fields, /\| 密码/);
  assert.match(fields, /maxlength=20/);
  assert.doesNotMatch(text, /读取或查询操作|查询后展示结果|分页状态|失败指标|统计来源|当前筛选/);
});

test('login describes evidence-based layout, request names and limits of password encryption', () => {
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /左侧.*插画/);
  assert.match(text, /右侧.*登录/);
  assert.match(text, /E002-login-ready\.png/);
  assert.match(text, /F12/);
  assert.match(text, /不能.*(?:保证|阻止).*明文/);
  assert.match(text, /Network/);
  assert.match(text, /HTTP方法.*相对路径/);
  assert.match(text, /请求参数名称/);
  assert.doesNotMatch(text, /未取得路由|本条需求没有可用截图/);
});

test('refresh preserves the reviewed login specification and its acceptance IDs', () => {
  const before = fs.readFileSync(file, 'utf8');
  const args = process.argv.slice();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'login-spec-'));
  const copy = path.join(directory, '需求说明.md');
  fs.writeFileSync(copy, before);
  try {
    process.argv.push('--refresh');
    assert.equal(augmentFile(copy).changed, false);
    assert.equal(fs.readFileSync(copy, 'utf8'), before);
    const ids = [...before.matchAll(/^\| (AUTH-AC-\d{3}) \|/gm)].map(m => m[1]);
    assert.deepEqual(ids, ['AUTH-AC-003','AUTH-AC-004','AUTH-AC-005','AUTH-AC-006','AUTH-AC-007','AUTH-AC-001','AUTH-AC-002']);
  } finally {
    process.argv.splice(0, process.argv.length, ...args);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('login source excerpts have verifiable hashes and preserve the exact encryption and request mapping', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/auth-review-20261026/index.json'),'utf8'));
  assert.equal(index.sources.length, 4);
  assert.equal(index.applicationAcceptanceExecuted, false);
  assert.equal(index.businessRequests, 0);
  let count = 0;
  for (const source of index.sources) {
    assert.match(source.resourcePath, /^\/module-login\/static\/js\//);
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
    for (const e of source.excerpts) {
      assert.equal(e.end-e.start, e.text.length);
      assert.equal(crypto.createHash('sha256').update(e.text).digest('hex'),e.sha256);
      count++;
    }
  }
  assert.equal(count,12);
  const raw=index.sources.flatMap(s=>s.excerpts.map(e=>e.text)).join(' ');
  assert.ok(raw.includes('password:this.encryptStr(this.loginForm.password)'));
  assert.ok(raw.includes('account:this.loginForm.username.trim()'));
  assert.ok(raw.includes('agreeToPrivacyStatement:this.loginForm.agreeToPrivacyStatement'));
  assert.ok(raw.includes('RSA-OAEP'));
  assert.ok(raw.includes('length<e'));
});

test('offline login verifier rejects changed resources and forged excerpts', () => {
  const { verify } = require('../scripts/prepare-login-evidence');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),'login-evidence-'));
  const text = 'prefix login rules suffix';
  const sha = s=>crypto.createHash('sha256').update(s).digest('hex');
  const source = {id:'fixture',localName:'fixture.js',bytes:Buffer.byteLength(text),sha256:sha(text),excerpts:[{start:7,end:12,text:'login',sha256:sha('login')}]};
  try {
    fs.writeFileSync(path.join(directory,source.localName),text);
    assert.deepEqual(verify({sources:[source]},directory),{sources:1,excerpts:1,errors:0});
    const forged=structuredClone(source);
    forged.excerpts[0].text='other';
    forged.excerpts[0].sha256=sha('other');
    assert.throws(()=>verify({sources:[forged]},directory),/excerpt mismatch/);
    fs.appendFileSync(path.join(directory,source.localName),'modified');
    assert.throws(()=>verify({sources:[source]},directory),/resource mismatch/);
  } finally {
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
