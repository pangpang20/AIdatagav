const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const REQUIREMENTS = path.join(ROOT, 'doc', 'requirements');
const { augmentFile, buttonNamesFromControls, buildSpec, fieldName, operationType } = require('../scripts/augment-requirement-specs');

function formalDocuments() {
  return fs.readdirSync(REQUIREMENTS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => ['需求说明.md', '子页面与操作细化.md']
      .map((name) => path.join(REQUIREMENTS, entry.name, name))
      .filter((file) => fs.existsSync(file)))
    .sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function requirementBlocks(text) {
  const headings = [...text.matchAll(/^### ([A-Z]+-\d{3})([^\n]*)$/gm)];
  return headings.map((heading, index) => {
    const start = heading.index;
    const end = headings[index + 1]?.index ?? text.length;
    return { id: heading[1], title: heading[2].trim(), text: text.slice(start, end) };
  });
}

test('all formal requirements contain the eight implementation specification sections and unique acceptance IDs', () => {
  const expectedSections = [
    '页面字段清单', '页面交互规则', '业务流程与异常分支', '接口与数据规则',
    '验收标准', '权限与安全要求', '页面布局与状态', '证据与待确认项',
  ];
  const seenRequirements = new Set();
  const seenAcceptance = new Set();
  let documents = 0;

  for (const file of formalDocuments()) {
    documents += 1;
    const text = fs.readFileSync(file, 'utf8');
    for (const requirement of requirementBlocks(text)) {
      assert.ok(!seenRequirements.has(requirement.id), `duplicate requirement ${requirement.id}`);
      seenRequirements.add(requirement.id);
      assert.ok(requirement.text.includes(`<!-- 完整规格:${requirement.id} -->`), `${requirement.id} marker missing`);
      for (let index = 0; index < expectedSections.length; index += 1) {
        assert.ok(requirement.text.includes(`#### ${index + 1}. ${expectedSections[index]}（${requirement.id}）`), `${requirement.id} missing ${expectedSections[index]}`);
      }
      const specStart = requirement.text.indexOf(`<!-- 完整规格:${requirement.id} -->`);
      const spec = requirement.text.slice(specStart);
      const fieldStart = spec.indexOf(`#### 1. 页面字段清单（${requirement.id}）`);
      const fieldEnd = spec.indexOf(`#### 2. 页面交互规则（${requirement.id}）`, fieldStart);
      const fieldTable = spec.slice(fieldStart, fieldEnd);
      const fieldRows = fieldTable.split(/\r?\n/u).filter((line) => line.startsWith('|') && line.split('|').length === 10).slice(2);
      assert.ok(fieldRows.length > 0, `${requirement.id} must retain a blank row when no fields were observed`);
      assert.doesNotMatch(fieldRows.join('\n'), /未观察到|未取得|未标注|待验证/u, `${requirement.id} field table must leave unsupported values blank`);
      const acceptanceStart = spec.indexOf(`#### 5. 验收标准（${requirement.id}）`);
      const acceptanceEnd = spec.indexOf(`#### 6. 权限与安全要求（${requirement.id}）`, acceptanceStart);
      const acceptance = spec.slice(acceptanceStart, acceptanceEnd);
      const cases = acceptance.split(/\r?\n/u).filter((line) => /^\| [A-Z]+-AC-\d{3} \|/u.test(line));
      assert.equal(cases.length, 5, `${requirement.id} should have five acceptance checks`);
      for (const item of cases) {
        const columns = item.split('|').slice(1, -1).map((column) => column.trim());
        assert.equal(columns.length, 3, `${requirement.id} acceptance row must have three columns`);
        const caseId = columns[0];
        assert.match(caseId, new RegExp(`^${requirement.id.split('-')[0]}-AC-\\d{3}$`, 'u'));
        assert.ok(!seenAcceptance.has(caseId), `duplicate acceptance ${caseId}`);
        seenAcceptance.add(caseId);
        assert.equal(columns[2], '【拟定，未执行】', `${caseId} must remain unexecuted`);
      }
      assert.match(requirement.text, /方法与相对路径|读取\/查询请求方法与路径|方法与路径/u, `${requirement.id} API status missing`);
      assert.match(requirement.text, /【待确认】允许访问本页面/u, `${requirement.id} permission status missing`);
    }
  }

  assert.equal(documents, 71, 'formal document count changed; review the registry before updating this expectation');
  assert.equal(seenRequirements.size, 694, 'formal requirement count changed; review the registry before updating this expectation');
});

test('button evidence includes visible button labels and excludes ordinary or unlabeled controls', () => {
  const names = buttonNamesFromControls([
    { tag: 'SPAN', text: '默认租户' },
    { tag: 'SPAN', text: '欢迎，陈云亮' },
    { tag: 'BUTTON', text: '提 交' },
    { tag: 'BUTTON', text: '', disabled: true },
  ]);
  assert.deepEqual(names, ['提 交']);
});

test('user creation fields come from the captured form evidence and labels use business names', () => {
  assert.equal(fieldName({ placeholder: '请输入账号' }), '账号');
  const spec = buildSpec('BAS-002', '创建用户并设置初始资料', '', ['R013-admin-user-add-options']);
  for (const field of ['账号', '姓名', '初始密码', '确认初始密码', '手机号码', '邮箱', '昵称', '英文名', '工号', '性别']) {
    assert.match(spec, new RegExp(`\\| ${field} \\|`), `${field} is absent from BAS-002`);
  }
  assert.match(spec, /\| 取 消 \|/u);
  assert.match(spec, /\| 提 交 \|/u);
  assert.doesNotMatch(spec, /\| 默认租户 \||\| 欢迎，陈云亮 \|/u);
  const fieldTable = spec.slice(spec.indexOf('| 字段名称 |'), spec.indexOf('#### 2. 页面交互规则'));
  const dataRows = fieldTable.split(/\r?\n/u).filter((line) => line.startsWith('|') && line.split('|').length === 10).slice(2);
  const account = dataRows
    .map((line) => line.split('|').slice(1, -1).map((column) => column.trim()))
    .find((columns) => columns[0] === '账号');
  const nickname = dataRows
    .map((line) => line.split('|').slice(1, -1).map((column) => column.trim()))
    .find((columns) => columns[0] === '昵称');
  assert.ok(account, 'account field is missing');
  assert.equal(account[3], '', 'unobserved default values must stay blank');
  assert.equal(account[4], 'maxlength=20');
  assert.equal(account[6], '', 'unobserved field error messages must stay blank');
  assert.equal(nickname[2], '', 'required status without a marker must stay blank');
  assert.doesNotMatch(dataRows.join('\n'), /未观察到|未取得|未标注/u);
  assert.match(spec, /字段清单空白单元格表示现有页面证据未提供该值/u);
});

test('field table has no placeholder row when no field evidence is available', () => {
  const spec = buildSpec('AUTH-999', '无字段证据样例', '', []);
  const fieldTable = spec.slice(spec.indexOf('| 字段名称 |'), spec.indexOf('#### 2. 页面交互规则'));
  const dataRows = fieldTable.split(/\r?\n/u).filter((line) => line.startsWith('|') && line.split('|').length === 10).slice(2);
  assert.deepEqual(dataRows, ['| | | | | | | | |']);
});

test('refreshing an unchanged document does not write it again', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'requirement-spec-'));
  const file = path.join(directory, '需求说明.md');
  const originalArgs = process.argv.slice();
  try {
    fs.writeFileSync(file, '### TST-001 空白样例\n', 'utf8');
    augmentFile(file);
    const generated = fs.readFileSync(file, 'utf8');
    process.argv.push('--refresh');
    const result = augmentFile(file);
    assert.equal(result.changed, false);
    assert.equal(fs.readFileSync(file, 'utf8'), generated);
  } finally {
    process.argv.splice(0, process.argv.length, ...originalArgs);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('operations are classified so create, update, delete, execution, and read exceptions differ', () => {
  assert.equal(operationType('创建用户并设置初始资料'), 'create');
  assert.equal(operationType('修改数据源配置'), 'update');
  assert.equal(operationType('删除数据源'), 'delete');
  assert.equal(operationType('运行任务'), 'execute');
  assert.equal(operationType('查询用户列表'), 'read');
});
