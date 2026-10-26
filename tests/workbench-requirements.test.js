const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const test = require('node:test');
const { augmentFile } = require('../scripts/augment-requirement-specs');
const { document, renderHomeSpec } = require('../scripts/workbench-requirement-spec');
const { extractSources, verify } = require('../scripts/prepare-workbench-evidence');
const root = path.resolve(__dirname, '..');
const specFile = path.join(root, 'doc/requirements/02-工作台/需求说明.md');
const read = () => fs.readFileSync(specFile, 'utf8');
const audit = () => fs.readFileSync(path.join(path.dirname(specFile), '核查记录.md'), 'utf8');
const index = () => JSON.parse(fs.readFileSync(path.join(root, 'doc/requirements/evidence/workbench-review-20261026/index.json'), 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

function temporary(action) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workbench-test-'));
  try { action(directory); } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('workbench-test-'));
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('workbench replaces the generic empty query form with two complete business specifications', () => {
  const text = read();
  assert.equal(text, document());
  assert.deepEqual([...text.matchAll(/^### (HOME-\d{3}) /gm)].map(m => m[1]), ['HOME-001', 'HOME-002']);
  assert.doesNotMatch(text, /【|】|待确认|拟定需求|未观察到|本轮|源码|读取或查询操作|\|(?: \|){8}/);
  for (const id of ['HOME-001', 'HOME-002']) {
    const block = renderHomeSpec(id);
    for (const [i, title] of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries()) {
      assert.ok(block.includes(`#### ${i + 1}. ${title}（${id}）`), id + ':' + title);
    }
    assert.match(block, /允许访问本页面/);
  }
  assert.throws(() => renderHomeSpec('HOME-003'), /Unsupported/);
});

test('navigation defines hierarchy, real relative calls, open styles and state-changing context switches', () => {
  const text = renderHomeSpec('HOME-001');
  for (const contract of ['GET /back/common/app/app/appList', 'GET /back/common/user/main/menus',
    'GET /back/common/user/main/subject', 'GET /back/common/user/main/self',
    'GET /back/dop/space/common/list', 'GET /back/dop/space/workspace/allList',
    'PUT /back/dop/space/common/switchSpace/{spaceId}', 'PUT /back/common/user/main/tenant/main/{tenantId}',
    'GET /back/common/user/user/isAdmin', 'categories[].systems[]', 'openStyle=1', 'openStyle=2']) assert.ok(text.includes(contract), contract);
  assert.match(text, /取消不发切换请求/);
  assert.match(text, /与当前ID相同不请求/);
  assert.match(text, /结果未知先重新读取主体\/空间/);
  assert.match(text, /基本信息、修改密码、设置主部门、后台管理、退出登录/);
});

test('scenes are configuration-driven and the ignored state argument is not turned into a query contract', () => {
  const text = renderHomeSpec('HOME-002');
  for (const token of ['sceneName','sceneExplain','steps[].title/name/appDesc', 'getOriginKey', 'route=1',
    'GET /back/dop/manage/workbenchscene/findEnableScene', '不传state=1', '无fileKey', 'businessDescription="111"']) assert.ok(text.includes(token), token);
  const raw = index().sources.flatMap(s => s.excerpts.map(e => e.text)).join('\n');
  assert.ok(raw.includes('Object(o.findEnableScene)({state:1})'));
  assert.ok(raw.includes('b=function(){return Object(c.d)().request(u()+"/workbenchscene/findEnableScene","GET")}'));
});

test('work items use response lengths and exclusion, not server totals or category-only filtering', () => {
  const text = renderHomeSpec('HOME-002');
  for (const token of ['POST /back/common/workflow/act/task/todo/page', 'POST /back/common/workflow/act/task/done/page',
    'pageSize=9999999', 'datas.length', '点击加入排除集合，再点恢复', '多类可同时排除', '收起时仍提示',
    '类型5或其他非空未知值仍保留', '不发查询', '不设无依据的自动轮询周期']) assert.ok(text.includes(token), token);
  assert.match(text, /不是.*total/);
  assert.match(text, /不是业务允许的最大记录数或全量证明/);
  const raw = index().sources.find(s => s.id === 'HOME-SRC-STAGE').excerpts.map(e => e.text).join('\n');
  assert.ok(raw.includes('-1==t.filterList.indexOf(i.bizType)'));
  assert.ok(raw.includes('refreshWorkflowData:function(){}'));
});

test('details have task IDs, readonly modes, snapshot/history calls and conditional handling fields', () => {
  const text = renderHomeSpec('HOME-002');
  for (const token of ['upcoming','done','taskId','categoryCode','formJson','bizInfo','needSnapshot=true','procInstId',
    'modelDefId=procDefId','obscureName','countersignNeed≤0','SYS_DATA_ANALYSIS','optType','70','请输入审核意见',
    '请指定用户','基本信息','表单信息','审核历史','委办','转派','原始procStatus']) assert.ok(text.includes(token), token);
  assert.match(text, /done没有办理入口/);
  assert.match(text, /选择节点16.*契约交付后启用/);
  assert.match(audit(), /父级没有传入相应状态\/分类/);
});

test('handling body is exactly six fields, preserves array userStr and forbids invented node parameters', () => {
  const text = renderHomeSpec('HOME-002');
  const params = text.slice(text.indexOf('| 办理参数名称 |'), text.indexOf('backTaskSid和nameStr不在上述body'));
  assert.deepEqual([...params.matchAll(/^\| (\w+) \|/gm)].map(m => m[1]), ['optType','taskId','comment','ccUid','userStr','newAssigneeId']);
  assert.match(text, /userStr.*用户ID数组/);
  assert.match(text, /不能按参数名自行改成逗号字符串/);
  assert.match(text, /本地UUID.*不得冒充真实节点标识/);
  const raw = index().sources.find(s => s.id === 'HOME-SRC-DIALOG').excerpts.map(e => e.text).join('\n');
  assert.ok(raw.includes('taskSubmit)({optType:e.ruleForm.optType,taskId:e.taskId,comment:e.ruleForm.comment,ccUid:e.ruleForm.ccUid,userStr:e.ruleForm.userIds,newAssigneeId:e.ruleForm.newAssigneeId})'));
});

test('error, cancellation, unknown results and post-success reread have executable acceptance coverage', () => {
  const text = read();
  for (const token of ['一个deal锁','未知结果先回读','刷新失败','取消不发deal','纯空白','超70字','状态冲突','双会话', '迟到响应', 'JSON无效', '202业务错误']) assert.ok(text.includes(token), token);
  assert.match(text, /不另弹无条件确认/);
  assert.match(text, /提交中暂不允许关闭/);
  assert.match(audit(), /refreshWorkflowData:function\(\)\{\}为空/);
  assert.match(audit(), /type但表单prop=optType/);
});

test('layout is described by region and order and does not claim a new dialog screenshot', () => {
  const text = read();
  for (const token of ['左侧','右侧','两层顶栏','场景说明','图标','底部','1000px','1500×1000','1440×1000','R001-workbench.png','E004-portal-ready.png']) assert.ok(text.includes(token), token);
  assert.match(text, /审核操作→审核意见→抄送人/);
  assert.match(text, /不能用我的工单页面的截图替代/);
  assert.match(audit(), /浏览器操作0次/);
});

test('quality baseline has twelve distinct, traceable, unexecuted requirements with measurable budgets', () => {
  const text = read();
  const rows = [...text.matchAll(/^\| (HOME-NFR-\d{3}) \|.*$/gm)].map(m => m[0]);
  assert.deepEqual(rows.map(r => r.split('|')[1].trim()), Array.from({length:12},(_,i)=>'HOME-NFR-'+String(i+1).padStart(3,'0')));
  for (const row of rows) {
    const cells = row.split('|').slice(1,-1).map(v=>v.trim());
    assert.equal(cells.length,6);
    assert.ok(cells.slice(1,4).every(Boolean));
    assert.match(cells[4], /HOME-00[12]/);
    assert.equal(cells[5], '未执行');
  }
  for (const token of ['50个独立会话','预热3分钟','统计10分钟','500次','P95≤4秒','P99≤5秒','20000ms',
    '10000','WCAG2.2','320 CSS像素','200%','objectURL','零真实凭据','P95≤150ms']) assert.ok(text.includes(token),token);
  assert.match(audit(), /未进行|未发压测/);
  assert.match(audit(), /本次建议预算/);
});

test('published IDs, their registry order and refresh output are preserved', () => {
  const before = read();
  const ids = [...before.matchAll(/^\| (HOME-AC-\d{3}) \|/gm)].map(m=>m[1]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/采样清单.json'),'utf8'));
  const module = manifest.modules.find(m=>m.code==='HOME');
  assert.deepEqual(ids, module.businessAcceptance);
  assert.deepEqual(ids, [...Array.from({length:10},(_,i)=>'HOME-AC-'+String(i+5).padStart(3,'0')), ...Array.from({length:4},(_,i)=>'HOME-AC-'+String(i+1).padStart(3,'0'))]);
  assert.equal(module.developmentReview.productionReady, false);
  const args = process.argv.slice();
  temporary(dir => {
    const copy = path.join(dir,'需求说明.md'); fs.writeFileSync(copy,before);
    try { process.argv.push('--refresh'); assert.equal(augmentFile(copy).changed,false); assert.equal(fs.readFileSync(copy,'utf8'),before); }
    finally { process.argv.splice(0,process.argv.length,...args); }
  });
});

test('source evidence has exact offsets, hashes, relative paths and honest observation boundaries', () => {
  const data = index();
  assert.equal(data.businessRequests,0);
  assert.equal(data.applicationAcceptanceExecuted,false);
  assert.equal(data.sources.length,10);
  assert.equal(data.sources.reduce((n,s)=>n+s.excerpts.length,0),37);
  const seen = new Set();
  for (const source of data.sources) {
    assert.ok(!seen.has(source.id)); seen.add(source.id);
    assert.match(source.resourcePath,/^\//);
    assert.doesNotMatch(source.resourcePath,/https?:\/\//);
    assert.match(source.sha256,/^[a-f0-9]{64}$/);
    assert.ok(Number.isFinite(Date.parse(source.fetchedAt)));
    for (const part of source.excerpts) {
      assert.ok(part.text.startsWith(part.anchor));
      assert.equal(part.end-part.start,part.text.length);
      assert.equal(sha(part.text),part.sha256);
      assert.doesNotMatch(part.text,/https?:\/\//i);
    }
  }
  for (const title of ['核查结论','外部依赖','验证状态']) assert.ok(audit().includes('## '+title));
  assert.match(audit(), /没有.*业务API请求/);
});

test('offline extractor and verifier reject missing anchors, changed receipts, URLs and forged text', () => {
  temporary(dir => {
    const text = 'prefix scene:{steps:[]} suffix';
    const localName = 'fixture.js';
    fs.writeFileSync(path.join(dir,localName),text);
    const receipt = {path:'/dop/static/js/fixture.js',localName,bytes:Buffer.byteLength(text),sha256:sha(text),fetchedAt:'2026-10-26T06:04:50Z'};
    fs.writeFileSync(path.join(dir,'receipt.json'),JSON.stringify([receipt]));
    const selected = [['HOME-FIXTURE',localName,[['scene:',16]]]];
    const sources = extractSources(dir,'2026-10-26T07:00:00Z',selected);
    assert.deepEqual(verify({sources},dir),{sources:1,excerpts:1,errors:0});
    assert.throws(()=>extractSources(dir,'test',[['FIXTURE',localName,[['absent',6]]]]),/missing or incomplete/);
    const forged=structuredClone(sources); forged[0].excerpts[0].text='other'; forged[0].excerpts[0].sha256=sha('other');
    assert.throws(()=>verify({sources:forged},dir),/excerpt mismatch/);
    fs.appendFileSync(path.join(dir,localName),'changed');
    assert.throws(()=>extractSources(dir,'test',selected),/receipt mismatch/);
    assert.throws(()=>verify({sources},dir),/resource mismatch/);
    const unsafe='scene:https://invalid.example/';
    fs.writeFileSync(path.join(dir,localName),unsafe);
    fs.writeFileSync(path.join(dir,'receipt.json'),JSON.stringify([{...receipt,bytes:Buffer.byteLength(unsafe),sha256:sha(unsafe)}]));
    assert.throws(()=>extractSources(dir,'test',[['FIXTURE',localName,[['scene:',unsafe.length]]]]),/deployment URL/);
  });
});
