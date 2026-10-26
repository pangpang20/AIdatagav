/* Read public static text only; never evaluate a bundle or request business APIs. */
const fs=require('node:fs');
const path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/wo-review-20261026');
const views=[
  ['TODO','views-workbench-workflowReviewList.f3187f93.js','data:function'],
  ['DONE','views-workbench-workflowFinishedList.c481039c.js','data:function'],
  ['MINE','views-workbench-myWorkflowList.6961a07f.js','data:function'],
  ['TASK','views-workbench-workflowFinishedAndReviewEdit.32134d8d.js','data:function'],
  ['DETAIL','views-workbench-myWorkflowAndCopy2MeEdit.19e5767c.js','data:function'],
  ['HISTORY','components-workbench-processInfoComponent.b060476e.js','name:"processInfoComponent"'],
];
function throughExport(directory,file,anchor){
  const raw=fs.readFileSync(path.join(directory,file),'utf8'),start=raw.indexOf(anchor);
  if(start<0)throw new Error('WO source anchor missing: '+file);
  const m=/[a-z]\.default=[a-zA-Z_]+\.exports\}/.exec(raw.slice(start));
  if(!m)throw new Error('WO source boundary missing: '+file);
  return [anchor,m.index+m[0].length];
}
function select(directory){
  const defs=views.map(([id,file,anchor])=>['WO-SRC-'+id,file,[throughExport(directory,file,anchor)]]);
  for(const [id,file] of [
    ['COMMON-API','api-common.cfc92f1a.js'],
    ['MINE-API','api-workbench-myWorkflow.bdf1c002.js'],
    ['DONE-API','api-workbench-workflowFinished.4352a8f3.js'],
    ['TODO-API','api-workbench-workflowReview.a147a8a2.js'],
    ['TYPES','views-workbench-workflowTypes.64ad498a.js'],
  ]){
    const raw=fs.readFileSync(path.join(directory,file),'utf8'),start=raw.indexOf('var ');
    defs.push(['WO-SRC-'+id,file,[['var ',raw.length-start]]]);
  }
  defs.push(['WO-SRC-ENTRY','wo-index.html',[['/workorder/static/js/app.6c843d58.js',41]]]);
  defs.push(['WO-SRC-GATEWAY','wo-app.js',[['bcab:function',925]]]);
  const app=fs.readFileSync(path.join(directory,'wo-app.js'),'utf8');
  const routes=['myWorkflowList','myWorkflowAndCopy2MeEdit','workflowReviewList','workflowFinishedList','workflowFinishedAndReviewEdit'];
  defs.push(['WO-SRC-ROUTES','wo-app.js',routes.map(route=>{
    const anchor='path:"/workbench/'+route+'"',start=app.indexOf(anchor),end=app.indexOf('component:',start);
    if(start<0||end<0)throw new Error('WO route missing: '+route);
    return [anchor,end-start];
  })]);
  const groups=['viewsWorkbenchWorkflowTypesJs','viewsWorkbenchMyWorkflowListVue','viewsWorkbenchWorkflowFinishedListVue','viewsWorkbenchWorkflowReviewListVue','viewsWorkbenchMyWorkflowAndCopy2MeEditVue','viewsWorkbenchWorkflowFinishedAndReviewEditVue','componentsWorkbenchProcessInfoComponentVue'];
  defs.push(['WO-SRC-LANGUAGE','wo-app.js',groups.map(group=>{
    const anchor=group+':{',start=app.lastIndexOf(anchor);
    if(start<0)throw new Error('WO language group missing: '+group);
    return [anchor,app.indexOf('},',start)+1-start,true];
  })]);
  defs.push(['WO-SRC-LIST-MIXINS','chunk-@audaque-vue-utils.d722f2bd.js',[
    ['pageSize:20',3590],['删除操作不能恢复，确定删除吗？',1870],
  ]]);
  defs.push(['WO-SRC-PAGINATION','chunk-@audaque-vue-components.6e70d300.js',[
    throughExport(directory,'chunk-@audaque-vue-components.6e70d300.js','name:"AudaquePagination"'),
  ]]);
  defs.push(['WO-SRC-CONTROLS','chunk-@audaque-vue-components.6e70d300.js',[
    throughExport(directory,'chunk-@audaque-vue-components.6e70d300.js','name:"AudaqueTableSearch"'),
    throughExport(directory,'chunk-@audaque-vue-components.6e70d300.js','name:"AudaqueSearchSelect"'),
  ]]);
  return defs;
}
const sharedSelections=[
  ['WO-SRC-SHELL-REQUEST','shell-app.7ec981a3.js',[
    ['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405],
  ]],
  ['WO-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
  ['WO-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21],["entry: baseUrl + '/workorder/index.html'","entry: baseUrl + '/workorder/index.html'".length]]],
];
function verifyAll(data,directory,sharedDirectory){
  if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw new Error('WO unknown source group');
  if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('WO duplicate source id');
  let sources=0,excerpts=0;
  for(const [group,folder] of [['own',directory],['shared',sharedDirectory]]){
    const result=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},folder);
    sources+=result.sources;excerpts+=result.excerpts;
  }
  for(const sample of data.invalidSamples||[]){
    if(sample.path!=='/workorder/')throw new Error('WO invalid sample path mismatch');
    verify({sources:[{...sample,id:'WO-INVALID-ENTRY',excerpts:[]}]},directory);
  }
  return {sources,excerpts,errors:0};
}
function prepare(directory,sharedDirectory){
  const inspectedAt=new Date().toISOString();
  const own=extractSources(directory,inspectedAt,select(directory));
  const shared=extractSources(sharedDirectory,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}));
  const receipts=JSON.parse(fs.readFileSync(path.join(directory,'receipt.json'),'utf8'));
  if(receipts.length!==16)throw new Error('WO static request receipt count changed');
  const invalid=receipts.find(r=>r.path==='/workorder/');
  if(!invalid)throw new Error('WO invalid entry receipt missing');
  const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:16,businessRequests:0,browserOperations:0,applicationAcceptanceExecuted:false,
    invalidSamples:[{...invalid,validFor:'父壳返回的静态样本；不作为工单微应用入口或页面证据'}],
    limitations:['16次公开静态GET后只读文本；未执行下载代码或调用业务API','当前无受控浏览器或Network，没有本次新截图','/workorder/返回父壳；/workorder/index.html才是对应微应用入口','复用父应用配置/请求保留原获取时间；历史截图不保证与静态代码同一版本','前端不能证明后端授权、事务、办理结果、通知送达或完整动态表单契约'],sources:[...own,...shared]};
  verifyAll(data,directory,sharedDirectory);
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
  const ids=['H-WO-001','H-WO-002','H-WO-003','H-WO-003-op1','U-WO-detail-basic','U-WO-detail-form','U-WO-detail-history'];
  const rows=ids.map(id=>{
    const d=JSON.parse(fs.readFileSync(path.resolve(output,'../live-recheck-20261022',id+'.json'),'utf8'));
    const note=id==='H-WO-002'?'导航高亮已办，正文仍为待办；仅作冲突证据，不用于已办正常布局':id==='U-WO-detail-form'?'仅空态，不能代表有字段表单或证明业务不存在':id==='U-WO-detail-history'?'流程图和8列表格；图内个别字形方框不是目标样式':'历史视口及样本，只证明当时可见内容';
    return `| [${id}截图](../live-recheck-20261022/${id}.png) / [元素](../live-recheck-20261022/${id}.json) | ${d.time} | ${d.url} | ${note} |`;
  });
  fs.writeFileSync(path.join(output,'README.md'),[
    '# 我的工单专项证据索引','',`静态片段复核UTC：${inspectedAt}。公开静态GET 16次，含1份无效入口采样；业务API 0次、浏览器操作0次、新截图0张。应用验收全部未执行。`,'',
    '[业务规格](../../06-我的工单/需求说明.md) · [子页面与操作](../../06-我的工单/子页面与操作细化.md) · [核查记录](../../06-我的工单/核查记录.md) · [必要原文及摘要](./index.json) · [离线提取工具](../../../../scripts/prepare-wo-evidence.js)','',
    '分发限制：限获授权项目成员。历史图片/元素含业务资料、参与人员及时间，不作公开演示材料。只提交相对路径、必要控件/请求定义及摘要，不含凭据值。原包和获取回执留本机临时调查目录，不执行原包。','',
    '| 证据组 | 相对资源路径 | 原获取UTC | 片段数 |','|---|---|---|---|',
    ...data.sources.map(s=>`| ${s.id} | ${s.resourcePath} | ${s.fetchedAt} | ${s.excerpts.length} |`),'',
    'index.json保存原包字节数/SHA-256、原获取时间、UTF-16 code unit左闭右开偏移、片段原文及SHA-256。sourceGroup=shared的公共文件复用既有原件与原回执；选择组不等于请求次数。--verify仅本地比对，不发HTTP。','',
    '无效采样：/workorder/返回父壳HTML，1505字节；其摘要与时间单独登记在invalidSamples，不能当作工单页面。正确入口/workorder/index.html以及独立workorder资源是正文调用链依据。','',
    '| 历史截图/元素 | 原采样UTC | 相对路由 | 用途与限制 |','|---|---|---|---|',...rows,'',
    '以上H/U样本均1500×1000。本次逐张复看待办、已办冲突、本人列表及本人三页签；详情首入H图与基本页U图互相补证。没有待办办理表单、草稿编辑、发起/删除/催办模态的新实拍，依据实际组件定义补充字段和控件，补图任务见核查记录。','',
    '主文档原始来源还保留[C040](../C040-original-content.png)、[E065](../E065-workorders.png)及[E101](../E101-current-complete.png)，各原时间见对应JSON及[全证据索引](../../证据索引.md)。这些不计为本次新浏览器操作。','',
  ].join('\n'));
  return {sources:data.sources.length,excerpts:data.sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:16,businessRequests:0};
}
if(require.main===module){
  const value=flag=>{const i=process.argv.indexOf(flag);if(i<0||!process.argv[i+1])throw new Error(flag+' required');return path.resolve(process.argv[i+1]);};
  const own=value('--source-dir'),shared=value('--shared-source-dir');
  console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared):prepare(own,shared)));
}
module.exports={select,prepare,verifyAll};
