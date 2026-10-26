/* Extract existing text only. Never evaluate bundles or issue business requests. */
const fs = require('node:fs');
const path = require('node:path');
const { extractSources } = require('./prepare-workbench-evidence');
const { verify } = require('./prepare-login-evidence');
const out = path.resolve(__dirname,'../doc/requirements/evidence/drms-review-20261026');
const definitions = [
  ['DRMS-SRC-PROJECT-API','api-project.1dcc8892.js',['var e=n("bcab")']],
  ['DRMS-SRC-REQUIREMENT-API','api-requirement.8c590a62.js',['var o=n("21a6"),r=n("bcab")']],
  ['DRMS-SRC-TASK-API','api-task.6f8768d3.js',['var r=n("5530"),o=']],
  ['DRMS-SRC-ADVISORY-API','api-advisory.18b76f9e.js',['var e=n("5530")']],
  ['DRMS-SRC-COMMON-API','api-common.47ed727a.js',['var o=n("21a6"),r=n("bcab")']],
  ['DRMS-SRC-KANBAN-API','api-kanban.8afecb54.js',['7598:function']],
  ['DRMS-SRC-PROJECT-LIST','views-project-my.5e85538a.js',['audaqueFormEditFormUrlMixin:','audaquefetchBeforeHandleMixin:function','staticClass:"drms-project-list"']],
  ['DRMS-SRC-PROJECT-FORM','views-project-edit.23f7a242.js',['data:function(){return{audaqueFormRulesMixin:']],
  ['DRMS-SRC-REQUIREMENT-LIST','views-requirement-my.76740505.js',['data:function(){return{activeName:"-1"']],
  ['DRMS-SRC-REQUIREMENT-FORM','views-requirement-edit.a3bfdd7b.js',['data:function(){return{relevance:','onExcelParse:function','onSumbit:function','label:"申请人"']],
  ['DRMS-SRC-COLUMN-FORM','views-requirement-components-BaseInfoDialog.eb043aba.js',['data:function(){var e=this;return{visible:']],
  ['DRMS-SRC-COLUMN-TABLE','views-requirement-components-BaseInfoTable.634d7446.js',['data:function','onDelete:function']],
  ['DRMS-SRC-DATASOURCE','views-requirement-components-Datasource.57966bb6.js',['data:function']],
  ['DRMS-SRC-REQUIREMENT-TASK','views-requirement-task.5d3aece8.js',['data:function','onAdd']],
  ['DRMS-SRC-TASK-MY','views-task-my.26f1bea2.js',['"0680":function','data:function','onInitiate:function','staticClass:"drms-task-my"']],
  ['DRMS-SRC-TASK-PENDING','views-task-pending.3837e189.js',['data:function','onReceive:function','onSubmit:function','onTransfer:function']],
  ['DRMS-SRC-TASK-PROCESSED','views-task-processed.2f6621f8.js',['data:function']],
  ['DRMS-SRC-TASK-FORM','views-task-edit.faae943b.js',['data:function(){var','audaqueFormBeforeHandleMixin:function','reviewForm','columnRelation']],
  ['DRMS-SRC-TASK-EXECUTE','views-task-execute.db4c7a34.js',['this.formRules.taskExplain=','onSumbit:function','onSumbitReceipt:function','taskAttachment']],
  ['DRMS-SRC-TASK-DIAGRAM','views-task-diagram.34c1fbdc.js',['data:function(){return{procTaskId:']],
  ['DRMS-SRC-ADVISORY-LIST','views-advisory-list.40dc2611.js',['data:function','onSupervise:function']],
  ['DRMS-SRC-ADVISORY-FORM','views-advisory-edit.fdc4dafd.js',['data:function(){return{audaqueIsRequestFirstMixin:','onUploadFileChange:function','label:"发起人"']],
  ['DRMS-SRC-ADVISORY-HANDLE','views-advisory-handle.f5634315.js',['c26f:function']],
  ['DRMS-SRC-ADVISORY-PENDING','views-advisory-components-Pending.8f2cba8e.js',['data:function','onTransfer:function']],
  ['DRMS-SRC-ADVISORY-PROCESSED','views-advisory-components-Processed.94ddfce7.js',['data:function']],
  ['DRMS-SRC-UPLOAD','components-UploadFile~views-advisory-edit~views-requirement-edit~views-task-execute.26c81ab2.js',['"8a99":function']],
  ['DRMS-SRC-FILELIST','components-Filelist.2b65daa3.js',['onRemoveFile:function']],
  ['DRMS-SRC-KANBAN','views-kanban.90299b96.js',['dateType:1','findReport','storiesProgressSort']],
  ['DRMS-SRC-APP','app.660baa19.js',['bcab:function']],
  ['DRMS-SRC-LIST-MIXINS','chunk-@audaque-vue-utils.e8e978f2.js',['pageSize:20','audaqueSubmitMixin:function','删除操作不能恢复，确定删除吗？']],
];

function select(directory) {
  return definitions.map(([id,file,anchors])=>{
    const text=fs.readFileSync(path.join(directory,file),'utf8');
    return [id,file,anchors.map(anchor=>{
      const start=text.indexOf(anchor);
      if(start<0)throw new Error(id+': anchor not found '+anchor);
      let end=Math.min(start+6500,text.length);
      const url=text.slice(start,end).search(/https?:\/\//i);
      if(url>=0)end=start+url;
      return [anchor,end-start];
    })];
  });
}
const sharedSelections = [
  ['DRMS-SRC-SHELL-REQUEST','shell-app.7ec981a3.js',[
    ['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405],
  ]],
  ['DRMS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
  ['DRMS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
function prepare(directory,sharedDirectory){
  const inspectedAt=new Date().toISOString();
  const sources=extractSources(directory,inspectedAt,select(directory));
  const shared=extractSources(sharedDirectory,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}));
  const data={schemaVersion:1,inspectedAt,evidenceType:'static-source',businessRequests:0,browserOperations:0,applicationAcceptanceExecuted:false,
    limitations:['公开静态资源GET后的离线读取，未执行下载代码、未调用业务API','没有可控制浏览器能力；没有新截图或Network采样','历史截图为2026-10-22，本次资源为2026-10-26；不保证同一构建','前端字段、接口与状态条件不证明服务端权限、事务、持久化或审计','整包和原始回执限本机；共享根应用资源复用本机既有获取回执，不改写获取时间'],sources:[...sources,...shared]};
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(data,null,2)+'\n');
  const live=path.resolve(out,'../live-recheck-20261022');
  const ids=['P-DRMS-001','P-DRMS-002','P-DRMS-002-op1','P-DRMS-002-op1-options0','P-DRMS-002-op2','P-DRMS-003','P-DRMS-003-op1','T-DRMS-requirement-add-direct','Y-DRMS-003','Z-DRMS-003','P-DRMS-004','P-DRMS-005','P-DRMS-006','P-DRMS-007','P-DRMS-007-op1','P-DRMS-007-op1-options0','P-DRMS-008','Z-DRMS-008','P-DRMS-008-op1','P-DRMS-008-op1-options0'];
  fs.writeFileSync(path.join(out,'README.md'),[
    '# 业务需求管理系统专项证据索引','',`静态复核UTC：${inspectedAt}。只离线读取公开静态资源，业务请求0次、浏览器操作0次；应用验收全部未执行。`,'',
    '[业务需求正文](../../03-业务需求管理系统/需求说明.md) · [子页面细化](../../03-业务需求管理系统/子页面与操作细化.md) · [核查记录](../../03-业务需求管理系统/核查记录.md) · [原文片段与摘要](./index.json) · [离线工具](../../../../scripts/prepare-drms-evidence.js)','',
    '分发限制：限获授权项目成员使用。只发布必要业务静态片段和相对服务路径；整包、配置、获取回执及原始服务端点留本机临时目录。没有采集秘密输入值、Cookie或Token。静态代码中的头名称或参数名不含真实凭据值。','',
    '| 证据编号 | 相对资源路径 | 原获取UTC时间 | 片段数 |','|---|---|---|---|',
    ...data.sources.map(s=>`| ${s.id} | ${s.resourcePath} | ${s.fetchedAt} | ${s.excerpts.length} |`),'',
    '原包SHA-256、字节数、UTF-16 code unit左闭右开偏移及片段SHA-256均列于index.json；提取不执行下载代码。片段在业务锚点开始，最多6500字符并在第三方完整URL前停止，原文不改写。API定义不表示执行过写请求。根应用资源用sourceGroup=shared标记，其获取时间沿用原回执。','',
    '| 页面截图与元素 | 原采样UTC时间 | 路由 | 用途与限制 |','|---|---|---|---|',
    ...ids.map(id=>{const d=JSON.parse(fs.readFileSync(path.join(live,id+'.json'),'utf8'));const bad=['P-DRMS-003','P-DRMS-003-op1','P-DRMS-008'].includes(id);return `| [${id}截图](../live-recheck-20261022/${id}.png) / [元素](../live-recheck-20261022/${id}.json) | ${d.time} | ${d.url} | ${bad?'内容滞留或目标错误；保留冲突，不用于证明目标字段/布局':id==='Z-DRMS-003'?'正确需求路由外框但列表仍加载；不证明成功/空态':'历史1500×1000页面样本；不证明业务保存/后端规则'} |`;}),'',
    'P-DRMS-008的“新增”是内容滞留造成的入口冲突；处理组件只定义待处理/已处理。DRMS-511保留原编号引用已打开的共用咨询表单，不给处理页增加无证据新增按钮。任务维护/办理、字段弹窗及后三页签的静态定义没有本轮新截图，补图需求列于核查记录。','',
  ].join('\n'));
  return {sources:data.sources.length,excerpts:data.sources.reduce((n,s)=>n+s.excerpts.length,0),businessRequests:0};
}
function verifyAll(data,directory,sharedDirectory){
  const own=verify({sources:data.sources.filter(s=>s.sourceGroup!=='shared')},directory);
  const shared=verify({sources:data.sources.filter(s=>s.sourceGroup==='shared')},sharedDirectory);
  return {sources:own.sources+shared.sources,excerpts:own.excerpts+shared.excerpts,errors:0};
}
if(require.main===module){
  const value=flag=>{const i=process.argv.indexOf(flag);if(i<0||!process.argv[i+1])throw new Error(flag+' required');return path.resolve(process.argv[i+1]);};
  const dir=value('--source-dir'),shared=value('--shared-source-dir');
  console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(out,'index.json'),'utf8')),dir,shared):prepare(dir,shared)));
}
module.exports={definitions,select,prepare,verifyAll,sharedSelections};
