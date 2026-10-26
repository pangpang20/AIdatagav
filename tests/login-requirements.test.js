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

test('login business specification uses plain requirements and keeps research in its linked audit record', () => {
  const text = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(text, /【|】|待确认|拟定需求|本轮|源码|历史DOM/);
  assert.match(text, /核查记录[.]md/);
  assert.match(text, /\| 未执行 \|/);
  assert.match(text, /application\/json/);
  assert.match(text, /code/);
  const audit = fs.readFileSync(path.join(root,'doc/requirements/01-登录/核查记录.md'),'utf8');
  assert.match(audit, /核查结论/);
  assert.match(audit, /外部依赖/);
  assert.match(audit, /服务端密码/);
});

test('login describes evidence-based layout, request names and limits of password encryption', () => {
  const text = fs.readFileSync(file, 'utf8');
  const audit = fs.readFileSync(path.join(root,'doc/requirements/01-登录/核查记录.md'),'utf8');
  assert.match(text, /左侧.*插画/);
  assert.match(text, /右侧.*登录/);
  assert.match(text, /E002-login-ready\.png/);
  assert.match(audit, /F12/);
  assert.match(audit, /不能.*(?:保证|阻止).*明文/);
  assert.match(text + audit, /Network/);
  assert.match(text, /HTTP方法.*相对路径/);
  assert.match(text, /请求参数名称/);
  assert.doesNotMatch(text, /未取得路由|本条需求没有可用截图/);
});

test('login specifies the configured gateway, response handler and boolean agreement without inventing a success code', () => {
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /POST \/back\/common\/auth\/login/);
  for (const name of ['account','password','imgCode','agreeToPrivacyStatement','X-TIMESTAMP','X-NONCE','X-SIGN','adq-token']) assert.ok(text.includes(name));
  assert.match(text, /202/);
  assert.match(text, /1109.*修改密码/);
  assert.match(text, /boolean/);
  assert.match(text, /1002/);
  assert.match(text, /不得另行写死code=0/);
  assert.doesNotMatch(text, /(?:成功码|成功业务码)\s*(?:为|是|：|:|=)\s*(?:0|200)\b/);
});

test('login quality requirements are uniquely numbered, traceable and explicitly unexecuted', () => {
  const text = fs.readFileSync(file, 'utf8');
  const rows = [...text.matchAll(/^\| (AUTH-NFR-\d{3}) \|.*$/gm)].map(m => m[0]);
  assert.deepEqual(rows.map(row => row.split('|')[1].trim()),
    Array.from({ length: 13 }, (_, i) => 'AUTH-NFR-' + String(i + 1).padStart(3, '0')));
  for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
    assert.equal(cells.length, 6);
    assert.ok(cells.slice(1, 4).every(Boolean), cells[0] + ': quality, target and verification method required');
    assert.equal(cells[4], 'AUTH-001');
    assert.equal(cells[5], '未执行');
  }
  assert.match(text, /目标验收基线/);
  const audit = fs.readFileSync(path.join(path.dirname(file), '核查记录.md'), 'utf8');
  assert.match(audit, /AUTH-NFR-001至013/);
  assert.match(audit, /未进行性能压测/);
});

test('login performance budgets specify reproducible measurements rather than claiming observed capacity', () => {
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /100个并发虚拟用户/);
  assert.match(text, /预热5分钟.*统计10分钟.*1000次/);
  assert.match(text, /P95≤2秒.*P99≤5秒/);
  assert.match(text, /0\.1%/);
  assert.match(text, /缓存冷启动.*P95≤3秒/);
  assert.match(text, /20Mbit\/s.*10Mbit\/s.*50ms/);
  assert.match(text, /20000ms/);
  assert.match(text, /1秒内.*(?:恢复|解除)/);
  assert.match(text, /月度可用率≥99\.9%/);
  assert.match(text, /不得用.*(?:短测|短时).*月度/);
});

test('login quality baseline covers security, browsers and accessible interaction without promising F12 secrecy', () => {
  const text = fs.readFileSync(file, 'utf8');
  for (const rule of ['TLS 1.2', 'RSA-OAEP', '单向密码哈希', 'T+1', 'Windows 10/11', 'Chrome', 'Edge',
    '1366×768', '320 CSS像素', '200%', 'Tab', 'Shift+Tab', 'Escape', '4.5:1', '3:1',
    'URL.revokeObjectURL', '请求关联标识']) assert.ok(text.includes(rule), rule);
  assert.doesNotMatch(text, /保证.{0,30}F12.{0,20}(?:不可见|看不到)/);
  assert.match(text, /不新增.*请求头/);
});

test('transport evidence has verifiable excerpts for each newly resolved rule', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/auth-review-20261026/transport.json'),'utf8'));
  assert.equal(index.applicationAcceptanceExecuted, false);
  assert.equal(index.businessRequests, 0);
  const raw = index.sources.flatMap(s => s.excerpts.map(e => e.text)).join(' ');
  for (const token of ['application/json;', 'NETWORK_ERROR_CODE: 202', '1109===e', 'isNotEmpty:e=>', 'name:"ElCheckboxGroup"', "baseUrl + '/back'", 'generateSignInfo', 'e.timeout=n>=0?n:o', 'e.timeout:2e4']) assert.ok(raw.includes(token), token);
  for (const s of index.sources) for (const e of s.excerpts) {
    assert.ok(e.text.startsWith(e.anchor), s.id + ': excerpt must include its full anchor');
    assert.equal(e.end-e.start,e.text.length);
    assert.equal(crypto.createHash('sha256').update(e.text).digest('hex'),e.sha256);
    assert.doesNotMatch(e.text,/https?:\/\//i);
  }
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
