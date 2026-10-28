const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const moduleDir = path.join(root, 'doc/requirements/34-运维监控');
const requirementsManifest = JSON.parse(fs.readFileSync(path.join(root, 'doc/requirements/采样清单.json'), 'utf8'));
const ommsManifest = requirementsManifest.modules.find(module => module.code === 'OMMS');
const main = fs.readFileSync(path.join(moduleDir, '需求说明.md'), 'utf8');
const sub = fs.readFileSync(path.join(moduleDir, '子页面与操作细化.md'), 'utf8');
const audit = fs.existsSync(path.join(moduleDir, '核查记录.md'))
  ? fs.readFileSync(path.join(moduleDir, '核查记录.md'), 'utf8')
  : '';
const operationIndex = fs.readFileSync(path.join(root, 'doc/requirements/逐操作需求索引.md'), 'utf8');
const acceptanceById = new Map(
  `${main}\n${sub}`.split(/\r?\n/)
    .filter(line => /^\| OMMS-AC-\d{3} \|/.test(line))
    .map(line => [line.match(/^\| (OMMS-AC-\d{3}) \|/)[1], line])
);

test('OMMS requirements preserve the registered features and acceptance IDs', () => {
  for (const id of ['OMMS-001', 'OMMS-500', 'OMMS-501', 'OMMS-502', 'OMMS-503',
    'OMMS-504', 'OMMS-505', 'OMMS-506', 'OMMS-507', 'OMMS-508', 'OMMS-509',
    'OMMS-510', 'OMMS-511', 'OMMS-512', 'OMMS-513', 'OMMS-514', 'OMMS-515']) {
    assert.match(`${main}\n${sub}`, new RegExp(`\\b${id}\\b`), id);
  }

  const acceptanceRows = `${main}\n${sub}`.split(/\r?\n/)
    .filter(line => /^\| OMMS-AC-\d{3} \|/.test(line));
  const acceptanceIds = acceptanceRows.map(line => line.match(/^\| (OMMS-AC-\d{3}) \|/)[1]);
  const mainAcceptanceIds = main.split(/\r?\n/)
    .filter(line => /^\| OMMS-AC-\d{3} \|/.test(line))
    .map(line => line.match(/^\| (OMMS-AC-\d{3}) \|/)[1]);
  assert.equal(acceptanceIds.length, 135);
  assert.equal(new Set(acceptanceIds).size, acceptanceIds.length);
  assert.ok(acceptanceRows.every(line => /\| 未执行 \|$/.test(line)));
  assert.doesNotMatch(acceptanceRows.join('\n'), /合法输入查询后展示结果、空结果和分页状态/);

  assert.deepEqual(ommsManifest.businessRequirements.map(requirement => requirement.id), ['OMMS-001', 'OMMS-500']);
  assert.deepEqual(ommsManifest.developmentReview.expandedOperations, ['OMMS-001', 'OMMS-500']);
  assert.deepEqual(ommsManifest.businessAcceptance, mainAcceptanceIds);
  assert.match(main, /^### OMMS-001 /m);
  assert.match(main, /^### OMMS-500 /m);
});

test('OMMS pages and forms retain evidence-backed routes and field details', () => {
  for (const route of [
    '/omms/overview',
    '/omms/monitor/target/serverManagement',
    '/omms/monitor/target/applicationServerManagement',
    '/omms/monitor/target/databaseManagement',
    '/omms/monitor/objectMonitor/serverMonitor',
    '/omms/monitor/objectMonitor/applicationServerMonitor',
    '/omms/monitor/objectMonitor/databaseMonitor',
    '/omms/caveat/caveatMonitor/alertRule',
    '/omms/caveat/caveatMonitor/noticeConfig',
    '/omms/caveat/caveatMonitor/caveatConfig'
  ]) assert.ok(sub.includes(route), route);

  for (const field of ['服务器类型', '主机/IP地址', '监听方式', '日志目录', '安装路径',
    '数据库名称', '规则组名', '告警级别', '表达式', '等式符号', '阈值设置',
    '持续时间', '通知接收人', '邮箱', '是否清除']) assert.ok(sub.includes(field), field);
  assert.match(sub, /maxlength=15/);
  assert.match(sub, /maxlength=25/);
  assert.match(sub, /maxlength=255/);
  assert.match(sub, /测试凭证/);
});

test('OMMS acceptance distinguishes filters, result columns, and form-specific controls', () => {
  assert.match(acceptanceById.get('OMMS-AC-501'), /改变轮询间隔/);
  assert.doesNotMatch(acceptanceById.get('OMMS-AC-501'), /提交查询/);

  const queryCases = {
    'OMMS-AC-504': ['对象名称', 'IP地址', '类型'],
    'OMMS-AC-510': ['对象名称', 'IP地址'],
    'OMMS-AC-516': ['对象名称', 'IP地址', '数据库类型'],
    'OMMS-AC-522': ['对象名称', 'IP地址', '类型'],
    'OMMS-AC-525': ['对象名称', 'IP地址'],
    'OMMS-AC-528': ['对象名称', 'IP地址', '类型'],
    'OMMS-AC-540': ['通知人', '通知方式'],
    'OMMS-AC-546': ['告警名称', '告警级别', '是否清除']
  };
  for (const [id, fields] of Object.entries(queryCases)) {
    const row = acceptanceById.get(id);
    assert.ok(row, id);
    const query = row.split('|')[2].split('提交查询')[0];
    for (const field of fields) assert.ok(query.includes(field), `${id}: ${field}`);
    assert.doesNotMatch(query, /序号|备注|启动时间|最近通知时间/);
  }

  for (const id of ['OMMS-AC-536', 'OMMS-AC-613']) {
    assert.match(acceptanceById.get(id), /表达式禁用状态/);
  }
  for (const id of ['OMMS-AC-567', 'OMMS-AC-577', 'OMMS-AC-587',
    'OMMS-AC-612', 'OMMS-AC-627', 'OMMS-AC-611', 'OMMS-AC-616', 'OMMS-AC-626']) {
    assert.doesNotMatch(acceptanceById.get(id), /表达式禁用|测试凭证/);
  }
  assert.doesNotMatch(sub, /opened-review-content/);
  assert.match(operationIndex, /OMMS-100 已细化/);
  assert.match(operationIndex, /#9-非功能性需求/);
});

test('OMMS quality requirements have a separate unexecuted acceptance ledger', () => {
  const nfrRows = main.split(/\r?\n/).filter(line => /^\| OMMS-NFR-\d{3} \|/.test(line));
  const nfrIds = nfrRows.map(line => line.match(/^\| (OMMS-NFR-\d{3}) \|/)[1]);
  assert.equal(nfrIds.length, 14);
  assert.equal(new Set(nfrIds).size, nfrIds.length);
  assert.ok(nfrRows.every(line => /\| 未执行 \|$/.test(line)));

  const nfrAcRows = main.split(/\r?\n/).filter(line => /\| OMMS-NFR-AC-\d{3} \|/.test(line));
  assert.equal(nfrAcRows.length, nfrRows.length);
  assert.ok(nfrAcRows.every(line => /\| 未执行 \|$/.test(line)));
  assert.match(main, /已查证据、实现差异和外部依赖见\[核查记录\]/);
  assert.match(audit, /## 核查结论/);
  assert.match(audit, /## 外部依赖/);
  assert.match(audit, /## 验证状态/);
});

test('OMMS business documents do not mix investigation labels or claim backend acceptance', () => {
  for (const text of [main, sub]) {
    assert.doesNotMatch(text, /【(?:页面观察|操作观察|拟定需求|待确认)/);
    assert.doesNotMatch(text, /https?:\/\//i);
  }
  assert.match(main, /未取得可引用的接口路径、HTTP方法、请求DTO/);
  assert.match(audit, /所有135条功能验收和14条非功能验收均未执行/);
});
