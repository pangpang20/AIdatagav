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
function writeReadme(data) {
  const out = path.resolve(__dirname, '../doc/requirements/evidence/auth-review-20261026');
  const transportFile = path.join(out, 'transport.json');
  const transport = fs.existsSync(transportFile) ? JSON.parse(fs.readFileSync(transportFile, 'utf8')) : null;
  const sources = [...data.sources, ...(transport?.sources || [])];
  fs.writeFileSync(path.join(out, 'README.md'), [
    '# 登录专项规则与源码证据', '',
    '原登录片段复核UTC：' + data.inspectedAt + '；公共请求与配置补充UTC：' + (transport?.inspectedAt || '尚未采样') + '。资源均为公开静态GET后离线读取，没有执行下载代码、登录或业务请求。', '',
    '[登录组件原文及摘要](./index.json) · ' + (transport ? '[公共请求、配置及组件补充](./transport.json) · ' : '') + '[登录业务正文](../../01-登录/需求说明.md) · [核查记录](../../01-登录/核查记录.md) · [历史截图](../E002-login-ready.png) · [历史元素](../E002-login-ready.json)', '',
    '限获授权项目成员使用。仅发布必要原文与摘要；整包、整配置和获取回执留本机临时目录。部署端点与凭据不进入证据。API的/back前缀由本次配置与调用链确认，不是业务Network实测；配置变更后需重新对齐。', '',
    '原index保留4组资源12段；transport补充6组资源17段，两者共享一份校验工具资源，不合计为10份独立文件。每个片段列出资源路径、获取时间、原包SHA-256、UTF-16偏移与片段SHA-256。', '',
    '历史截图是2026-10-22的1440×1000样本。密码区域已有洋红色不透明覆盖，不能当作真实控件填充色、密码内容或加密证明；未修改原截图，未新增截图。', '',
    '| 证据编号 | 资源路径 | 获取UTC时间 | 片段数 |', '|---|---|---|---|',
    ...sources.map(s => '| ' + [s.id, s.resourcePath, s.fetchedAt, s.excerpts.length].join(' | ') + ' |'), '',
    '偏移为UTF-16 code unit，左闭右开。静态定义不证明服务端校验或运行结果；AUTH-AC-001至007全部未执行，联调依赖和目标修正在核查记录中独立登记。', '',
  ].join('\n'));
}
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
  writeReadme(data);
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
module.exports = { prepare, verify, writeReadme };
