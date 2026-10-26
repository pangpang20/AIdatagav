/* Read and hash downloaded text only; never evaluate application bundles. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { verify } = require('./prepare-login-evidence');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const output = path.resolve(__dirname, '../doc/requirements/evidence/workbench-review-20261026');
const selections = [
  ['HOME-SRC-STAGE', 'views-stage.d28b633e.js', [
    ['data:function(){return{activeName:', 2810],
    ['created:function(){var t=this;this.getAllData(1)', 294],
    ['getAllScene:function', 1500],
    ['gotoRouter:function', 2300],
    ['refreshWorkflowData:function', 85],
    ['staticClass:"dop-stage-home"', 6100],
    ['.dop-stage-home[data-v-5fddd9e7]{', 1540],
    ['@media screen and (min-width:1916px)', 2100],
  ]],
  ['HOME-SRC-API', 'api-stage.4cfc4aa2.js', [['var r=n("5530")', 1200]]],
  ['HOME-SRC-SCENE-API', 'api-stageManage.217c0f48.js', [
    ['var c=t("bcab")', 400],
    ['h=function(){return Object(c.d)().request(u()+"/open/getSys"', 120],
  ]],
  ['HOME-SRC-DIALOG', 'components-workbench-stageWorkflowDialog.1025a830.js', [
    ['data:function(){return{showWorkflowDialog:', 1430],
    ['queryData:function', 3650],
    ['submitTask:function', 645],
    ['t("el-dialog",{attrs:', 5850],
    ['"upcoming"===e.pageType?t("div",{staticClass:"mian-right"}', 6400],
  ]],
  ['HOME-SRC-HISTORY', 'components-workbench-processInfoComponent.5331b22c.js', [['var n=o("47c0")', 3450]]],
  ['HOME-SRC-TYPES', 'components-workbench-workflowTypes.1b4e56e2.js', [['var l=r("12cb")', 1400]]],
  ['HOME-SRC-DOP', 'dop-app.73911832.js', [
    ['"5c0b":function', 625],
    ['bcab:function', 925],
    ['f=function(e){return Object(r.d)().request(a.commonOss', 345],
    ['stage:{dataDevelopmentScenarios:', 650, true],
    ['viewsWorkbenchWorkflowFinishedAndReviewEditVue:{', 1530, true],
    ['viewsWorkbenchWorkflowTypesJs:{', 480, true],
  ]],
  ['HOME-SRC-SHELL', 'shell-app.7ec981a3.js', [
    ['Ns=window.__$__,Rs=', 590],
    ['requestMenu:function', 2420],
    ['onMenuItemClick:function', 1050],
    ['jumpMethod:function', 1890],
    ['Qs=window.__$__.MODULE_URL_PREFIX.dopSpace', 2970],
    ['changeTenant:function', 1090],
    ['us=cs.MODULE_URL_PREFIX.commonUser', 545],
    ['qa={"Content-Type":"application/json;', 1050],
    ['Ka=window.__$__BASE,Ya=function', 1710],
    ['key:"request",value:function(e,t,r)', 405],
  ]],
  ['HOME-SRC-BASE', 'serviceConfig.base.js', [['NETWORK_ERROR_CODE: 202', 23]]],
  ['HOME-SRC-CONFIG', 'serviceConfig.prod.js', [
    ["API_BASE_URL: baseUrl + '/back'", 39],
    ['MODULE_URL_PREFIX: {}', 21],
  ]],
];

function extractSources(directory, inspectedAt, selected = selections) {
  const receipts = JSON.parse(fs.readFileSync(path.join(directory, 'receipt.json'), 'utf8'));
  return selected.map(([id, localName, anchors]) => {
    const raw = fs.readFileSync(path.join(directory, localName));
    const receipt = receipts.find(item => item.localName === localName);
    if (!receipt || sha(raw) !== receipt.sha256 || raw.length !== receipt.bytes) throw new Error(id + ': receipt mismatch');
    if (!receipt.path.startsWith('/') || /https?:\/\//i.test(receipt.path)) throw new Error(id + ': relative resource path required');
    const source = raw.toString('utf8');
    const excerpts = anchors.map(([anchor, length, last = false]) => {
      const start = last ? source.lastIndexOf(anchor) : source.indexOf(anchor);
      if (start < 0 || length < anchor.length) throw new Error(id + ': missing or incomplete anchor ' + anchor);
      const text = source.slice(start, start + length);
      if (/https?:\/\//i.test(text)) throw new Error(id + ': deployment URL in excerpt');
      return { anchor, start, end: start + text.length, offsetUnit: 'UTF-16 code units', sha256: sha(text), text };
    });
    return { id, resourcePath: receipt.path, localName, fetchedAt: receipt.fetchedAt, inspectedAt, bytes: raw.length, sha256: sha(raw), excerpts };
  });
}

function prepare(directory) {
  const inspectedAt = new Date().toISOString();
  const sources = extractSources(directory, inspectedAt);
  const index = { schemaVersion: 1, evidenceType: 'static-source', inspectedAt, businessRequests: 0, applicationAcceptanceExecuted: false,
    limitations: ['公开静态资源GET后离线核对，未执行下载代码', '没有受控浏览器能力，未点击工作台、请求业务API或新增截图', '截图来自2026-10-22，静态资源获取于2026-10-26，不能保证同一构建', '前端契约不证明服务端授权、办理结果、完整计数或安全措施'], sources };
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'README.md'), [
    '# 工作台专项证据索引', '',
    '复核日期：2026-10-26；静态片段提取UTC：' + inspectedAt + '。仅公开静态资源GET后离线读取，业务接口请求0次，未执行下载代码；应用验收全部未执行。', '',
    '[静态片段与摘要](./index.json) · [工作台业务规格](../../02-工作台/需求说明.md) · [核查记录](../../02-工作台/核查记录.md) · [离线提取及核对工具](../../../../scripts/prepare-workbench-evidence.js)', '',
    '限获授权项目成员使用。必要字段名、相对服务路径与静态片段进入仓库；整包、整配置及获取回执留本机临时目录。没有发布部署origin、真实凭据或新增用户内容。公共客户端与前轮登录取证的根应用资源SHA-256相同，但本次仍独立登记获取时间及摘要。', '',
    '| 证据编号 | 相对资源路径 | 获取UTC时间 | 片段数 |', '|---|---|---|---|',
    ...sources.map(s => '| ' + [s.id, s.resourcePath, s.fetchedAt, s.excerpts.length].join(' | ') + ' |'), '',
    '偏移为UTF-16 code unit，左闭右开；原包SHA-256与片段SHA-256各自记录。原始文本未执行；没有把写接口定义当成已调用。配置仅保留/back前缀、空MODULE_URL_PREFIX和202业务错误处理状态。', '',
    '| 历史截图/元素 | 原采样时间 | 页面、用途及限制 |', '|---|---|---|',
    '| [E004截图](../E004-portal-ready.png) / [元素](../E004-portal-ready.json) | 2026-10-22T02:11:57.246Z | /dop/stage；1440×1000首屏、左右分区与业务样本；DOM混有隐藏视频控件，不能据此给工作台添加视频表单。 |',
    '| [R001截图](../live-recheck-20261022/R001-workbench.png) / [元素](../live-recheck-20261022/R001-workbench.json) | 2026-10-22T09:34:23.272Z | /dop/stage；1500×1000完整工作台；本次复看原图，没有新增页面操作。 |',
    '| [E005导航](../E005-demand-nav.png) / [元素](../E005-demand-nav.json) | 2026-10-22T02:13:05.554Z | 需求管理展开样本；名称与描述是当时配置，不是固定授权矩阵。 |',
    '| [E021](../E021-development-nav.png)、[E037](../E037-unification-nav.png)、[E043](../E043-assets-nav.png)、[E052](../E052-evaluation-nav.png)、[E059](../E059-backend-nav.png) | 各原始JSON登记时间，均为2026-10-22 | 保留登记的五组导航图；部分JSON文字历史处理后恢复不能反推，本次不把其其他模块控件搬入工作台字段表，具体限制见各JSON。 |', '',
    '工单详情弹窗以本次独立stageWorkflowDialog静态定义为依据；[工单页三标签历史材料](../../06-我的工单/子页面与操作细化.md)仅作关联参考，不能当作本工作台弹窗的本次实拍。尚缺的新弹窗/条件分支截图在核查记录中登记。', '',
    '本工具--verify只比对本机原包及片段，不发HTTP请求。重新提取会生成新的inspectedAt，不修改任何历史截图或原采样时间。', '',
  ].join('\n'));
  return { sources: sources.length, excerpts: sources.reduce((n, s) => n + s.excerpts.length, 0), businessRequests: 0 };
}

if (require.main === module) {
  const flag = process.argv.indexOf('--source-dir');
  if (flag < 0 || !process.argv[flag + 1]) throw new Error('--source-dir is required');
  const directory = path.resolve(process.argv[flag + 1]);
  console.log(JSON.stringify(process.argv.includes('--verify')
    ? verify(JSON.parse(fs.readFileSync(path.join(output, 'index.json'), 'utf8')), directory) : prepare(directory)));
}
module.exports = { prepare, verify, selections, extractSources };
