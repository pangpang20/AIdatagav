/* Offline excerpts only. Never evaluate downloaded application code. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const selections = [
  ['LOGIN-SRC-FORM', 'login-views-login-login.42fd202c.js', [['loginForm:{username:', 1350], ['created:function(){var e=this;this.requestPublicKey()', 2300], ['passwBlur:function', 2000], ['handleLogin:function', 2200], ['staticClass:"sys-login-main-form"', 4900], ['.sys-login-container-left-right{', 4300], ['screen and (max-width:1600px)', 5000]]],
  ['LOGIN-SRC-API', 'login-api-login.a6dbe736.js', [['var c="/common/auth"', 150], ['var c=e("bcab")', 1700]]],
  ['LOGIN-SRC-VALIDATOR', 'login-vue-utils.af9799ec.js', [['lengthGT:function', 420], ['isNotEmpty:function', 400]]],
  ['LOGIN-SRC-LOCALE', 'login-app.641c4267.js', [['lengthGT:"字符长度', 870]]],
];
function prepare(directory) {
  const receipts = JSON.parse(fs.readFileSync(path.join(directory, 'receipt.json'), 'utf8'));
  const inspectedAt = new Date().toISOString();
  const sources = selections.map(([id, localName, anchors]) => {
    const raw = fs.readFileSync(path.join(directory, localName));
    const receipt = receipts.find(r => r.localName === localName);
    if (!receipt || receipt.sha256 !== sha(raw) || receipt.bytes !== raw.length) throw new Error(id + ': receipt mismatch');
    const source = raw.toString('utf8');
    const excerpts = anchors.map(([anchor, length]) => {
      const start = source.indexOf(anchor);
      if (start < 0) throw new Error(id + ': missing anchor ' + anchor);
      const text = source.slice(start, start + length);
      if (/https?:[/][/]/i.test(text)) throw new Error(id + ': full URL in excerpt');
      return { anchor, start, end: start + text.length, offsetUnit: 'UTF-16 code units', text, sha256: sha(text) };
    });
    return { id, resourcePath: receipt.path, localName, fetchedAt: receipt.fetchedAt, inspectedAt, bytes: raw.length, sha256: sha(raw), excerpts };
  });
  const data = { schemaVersion: 1, inspectedAt, evidenceType: 'static-source', applicationAcceptanceExecuted: false, businessRequests: 0, limitations: ['仅公开静态资源GET与离线提取，没有业务接口请求、登录尝试或新浏览器截图', '历史截图与本次静态资源不保证同一版本', 'E002截图密码区域为既有不透明覆盖，不能推断密码框视觉细节', '客户端定义不证明后端校验或运行成功'], sources };
  const out = path.resolve(__dirname, '../doc/requirements/evidence/auth-review-20261026');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(data, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'README.md'), [
    '# 登录专项源码证据', '', '复核时间（UTC）：' + inspectedAt + '。来源为公开静态文件GET；没有登录或业务请求，没有执行下载代码。', '',
    '限获授权项目成员使用。仓库仅含必要原文及摘要，整包位于本机临时采样目录。接口均为默认服务相对路径，运行时配置和网关仍可能改写前缀。', '',
    '[原文片段与摘要](./index.json) · [登录需求](../../01-登录/需求说明.md) · [历史截图](../E002-login-ready.png) · [历史元素](../E002-login-ready.json)', '',
    '历史截图是2026-10-22的1440×1000样本。密码区域已有洋红色不透明覆盖，不能当作真实控件填充色、密码内容或加密证明；本轮没有修改原截图。', '',
    '| 证据编号 | 资源路径 | 获取UTC时间 | 片段数 |', '|---|---|---|---|',
    ...sources.map(s => '| ' + [s.id,s.resourcePath,s.fetchedAt,s.excerpts.length].join(' | ') + ' |'), '',
    '偏移为UTF-16 code unit，左闭右开；整资源与每个原文片段独立SHA-256。应用验收仍为【拟定，未执行】。', '',
  ].join('\n'));
  return { sources: sources.length, excerpts: sources.reduce((n,s) => n+s.excerpts.length,0), businessRequests: 0 };
}
function verify(index, directory) {
  let excerpts = 0;
  for (const source of index.sources) {
    const raw = fs.readFileSync(path.join(directory, source.localName));
    if (sha(raw) !== source.sha256 || raw.length !== source.bytes) throw new Error(source.id + ': resource mismatch');
    const text = raw.toString('utf8');
    for (const e of source.excerpts) {
      if (text.slice(e.start,e.end) !== e.text || sha(e.text) !== e.sha256) throw new Error(source.id + ': excerpt mismatch');
      excerpts++;
    }
  }
  return { sources:index.sources.length, excerpts, errors:0 };
}
if (require.main === module) {
  const i = process.argv.indexOf('--source-dir');
  if (i < 0 || !process.argv[i+1]) throw new Error('--source-dir is required');
  const directory = path.resolve(process.argv[i+1]);
  console.log(JSON.stringify(process.argv.includes('--verify') ? verify(JSON.parse(fs.readFileSync(path.resolve(__dirname,'../doc/requirements/evidence/auth-review-20261026/index.json'),'utf8')), directory) : prepare(directory)));
}
module.exports = { prepare, verify };
