/* Offline extraction of client transport rules. Downloaded code is never evaluated. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { verify, writeReadme } = require('./prepare-login-evidence');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const output = path.resolve(__dirname, '../doc/requirements/evidence/auth-review-20261026/transport.json');
const selections = [
  ['LOGIN-HTTP-CLIENT', 'app.7ec981a3.js', [
    ['qa={"Content-Type"', 1050], ['Ya=function(e){var t=arguments.length>1', 388],
    ['function Wa(e,t){return Qa.apply', 1240], ['o="/"===e.charAt(0)', 190],
    ['function lu(e){return function(e){if(1002===e)', 550],
  ]],
  ['LOGIN-EMPTY-CHECK', 'login-vue-utils.af9799ec.js', [
    ['isNotEmpty:e=>', 70], ['w=b.isNotEmpty', 18], ['isNotEmpty:function', 310],
  ]],
  ['LOGIN-CHECKBOX', 'login-element-ui.94642ac6.js', [
    ['var ut=ct,ht=function', 2170], ['name:"ElCheckbox"', 1360], ['name:"ElCheckboxGroup"', 530],
  ]],
  ['LOGIN-REQUEST-SIGN', 'web-utils.2d2d8fd1.js', [['generateSignInfo(t,e,n,r,s)', 765]]],
  ['LOGIN-CONFIG-BASE', 'runtime-serviceConfig.base.js', [
    ["LOGIN_PAGE_TYPE: 'left-right'", 29], ['NETWORK_ERROR_CODE: 202', 23],
  ]],
  ['LOGIN-CONFIG-PROD', 'runtime-serviceConfig.prod.js', [
    ["API_BASE_URL: baseUrl + '/back'", 30], ["LOGIN_PATH: ''", 15], ["MODIFY_PWD_PATH: ''", 20],
  ]],
];

function prepare(directory) {
  const receipts = ['receipt.json', 'transport-receipt.json'].flatMap(file =>
    JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')));
  const inspectedAt = new Date().toISOString();
  const sources = selections.map(([id, localName, anchors]) => {
    const raw = fs.readFileSync(path.join(directory, localName));
    const receipt = receipts.find(r => r.localName === localName && r.sha256 === sha(raw));
    if (!receipt || receipt.bytes !== raw.length) throw new Error(id + ': receipt mismatch');
    if (!receipt.path.startsWith('/') || receipt.path.startsWith('//')) throw new Error(id + ': route required');
    const source = raw.toString('utf8');
    const excerpts = anchors.map(([anchor, length]) => {
      const start = source.indexOf(anchor);
      if (start < 0) throw new Error(id + ': missing anchor ' + anchor);
      const text = source.slice(start, start + Math.max(length, anchor.length));
      if (/https?:[/][/]/i.test(text)) throw new Error(id + ': full URL in excerpt');
      return { anchor, start, end: start + text.length, offsetUnit: 'UTF-16 code units', text, sha256: sha(text) };
    });
    return { id, resourcePath: receipt.path, localName, fetchedAt: receipt.fetchedAt, inspectedAt,
      bytes: raw.length, sha256: sha(raw), excerpts };
  });
  const result = { schemaVersion: 1, inspectedAt, evidenceType: 'static-source',
    applicationAcceptanceExecuted: false, businessRequests: 0,
    limitations: ['只核对客户端与配置；没有执行应用代码、认证、业务接口或浏览器验收',
      '服务端响应、密码存储、会话安全与运行表现不能由静态文件证明',
      '配置仅反映采样环境；部署端点和实际凭据不进入证据'], sources };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  writeReadme(JSON.parse(fs.readFileSync(path.join(path.dirname(output), 'index.json'), 'utf8')));
  return verify(result, directory);
}

if (require.main === module) {
  const i = process.argv.indexOf('--source-dir');
  if (i < 0 || !process.argv[i + 1]) throw new Error('--source-dir is required');
  const directory = path.resolve(process.argv[i + 1]);
  console.log(JSON.stringify(process.argv.includes('--verify')
    ? verify(JSON.parse(fs.readFileSync(output, 'utf8')), directory) : prepare(directory)));
}
module.exports = { prepare };
