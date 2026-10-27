/* Offline extraction only: application bundles are read as text, never evaluated. */
const fs=require('node:fs');
const path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/dms-review-20261027');
const definitions=[
  ['MODEL-API','api-modelManagement-modelManagement.',[['(window.webpackJsonp_dms',4000]]],
  ['PROPERTY-API','api-configure-modelPro.',[['(window.webpackJsonp_dms',2000]]],
  ['ENV-API','api-configure-devEnvironment.',[['(window.webpackJsonp_dms',1500]]],
  ['MTRL-API','api-materialization-materialization.',[['(window.webpackJsonp_dms',3000]]],
  ['ANALYSIS-API','api-moduleName-modelAnalysis.',[['(window.webpackJsonp_dms',3500]]],
  ['STAT-API','api-statistics.',[['(window.webpackJsonp_dms',2000]]],
  ['STANDARD-API','api-moduleName-stdLibrary.',[['(window.webpackJsonp_dms',2000]]],
  ['DESIGN-API','api-modelManagement-design.',[['(window.webpackJsonp_dms',4500]]],
  ['MODEL','views-modelManagement-list.',[['data:function',15100],['t("el-dialog",',9300]]],
  ['PROPERTY','views-configure-modelPro-list.',[['data:function',11500],['visible:e.showConfigureDialog,width:',17000]]],
  ['ENV','views-configure-devEnvironment-list.',[['data:function',4500]]],
  ['MTRL','views-materialization-list.',[['data:function',7100]]],
  ['HISTORY','views-materialization-historyList.',[['data:function',2000],['methods:',7000]]],
  ['PHYSICS','views-modelManagement-design-physics.',[['data:function',3000],['methods:',10500],['expression:"audaqueFormInfoMixin.mtrlMethod"',620]]],
  ['ANALYSIS','views-modelAnalysis-list.',[['data:function',8500],['visible:e.showAddDialog',12200]]],
  ['VERSION','views-modelManagement-version-list.',[['data:function',4200]]],
  ['IMPORT','views-modelManagement-design-importTable.',[['data:function',5000],['expression:"audaqueFormInfoMixin.createTabType"',600]]],
  ['STAT','views-statistics-components-modelStatistics.',[['data:function',6500]]],
  ['STANDARD','views-statistics-components-stdStatistics.',[['data:function',7000]]],
  ['APP','app.',[['bcab:function',925],['configure:{',3800,true],['modelMaterialization:{',3600,true],['analysisTypeList:[',1100,true]]],
];
const sharedSelections=[
  ['DMS-SRC-REQUEST','shell-app.7ec981a3.js',[
    ['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405],
  ]],
  ['DMS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
  ['DMS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21],["entry: baseUrl + '/dms/index.html'",35]]],
];
function select(directory){
  const names=fs.readdirSync(directory);
  return definitions.map(([id,prefix,anchors])=>{
    const matches=names.filter(n=>n.startsWith(prefix)&&n.endsWith('.js'));
    if(matches.length!==1)throw new Error('DMS ambiguous resource '+prefix);
    return ['DMS-SRC-'+id,matches[0],anchors];
  });
}
function verifyAll(data,directory,sharedDirectory){
  if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw new Error('DMS unknown source group');
  if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('DMS duplicate source id');
  let sources=0,excerpts=0;
  for(const [group,folder]of [['own',directory],['shared',sharedDirectory]]){
    const result=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},folder);
    sources+=result.sources;excerpts+=result.excerpts;
  }
  return {sources,excerpts,errors:0};
}
function prepare(directory,sharedDirectory){
  const inspectedAt=new Date().toISOString();
  const sources=[...extractSources(directory,inspectedAt,select(directory)),...extractSources(sharedDirectory,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}))];
  const receipts=JSON.parse(fs.readFileSync(path.join(directory,'receipt.json'),'utf8'));
  if(receipts.length!==55||new Set(receipts.map(r=>r.path)).size!==55)throw new Error('DMS receipt mismatch');
  const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:55,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,
    limitations:['浏览器可控制，但业务路由跳转登录页；未输入凭据、未进入业务子页','公开静态资源GET后离线阅读；未执行下载代码、未主动调用业务API','复用2026-10-22历史1500×1000截图与DOM；新保存截图0张，静态包与历史界面可能不同版本','浏览器自动初始化请求未抓Network，不能把collector零请求等同整次会话零业务请求','服务端DTO、权限、事务、物化结果及性能尚无实测'],sources};
  verifyAll(data,directory,sharedDirectory);
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
  const ids=['H-DMS-001','H-DMS-002','H-DMS-003','H-DMS-004','H-DMS-005','H-DMS-006','H-DMS-006-op1','H-DMS-006-op1-options0','H-DMS-006-op1-options1','H-DMS-006-op1-options2'];
  const rows=ids.map(id=>{const d=JSON.parse(fs.readFileSync(path.resolve(output,'../live-recheck-20261022',id+'.json'),'utf8'));return `| [${id}图](../live-recheck-20261022/${id}.png) / [元素](../live-recheck-20261022/${id}.json) | ${d.time} | ${d.url} |`;});
  fs.writeFileSync(path.join(output,'README.md'),[
    '# 规范化数据建模专项证据','',`复核日期2026-10-27；提取UTC ${inspectedAt}。仅保存必要静态原文与摘要，原包及GET回执保留本机临时目录；未执行下载代码。`,'',
    '[正式需求](../../10-规范化数据建模/需求说明.md) · [子页面细则](../../10-规范化数据建模/子页面与操作细化.md) · [核查记录](../../10-规范化数据建模/核查记录.md) · [原文索引](./index.json) · [离线工具](../../../../scripts/prepare-dms-evidence.js)','',
    '静态GET 55次。浏览器先打开/dms/index.html出现无效目标提示，再导航已登记业务路由/dms/modelManagement/list，最终跳转/module-login/login。没有填写或提交登录，没有取得业务页面、Network或新业务截图。浏览器页面可能自动发初始化请求，未抓包所以不声明总业务请求为零。新增保存截图0张。','',
    '各资源的原获取时间、原件字节数及SHA-256和片段摘要分别登记；偏移按UTF-16 code unit左闭右开。shared组保留2026-10-26原获取时间；不能改成当日新抓取。--verify只比对本地原件，不访问网络。','',
    '| 证据ID | 相对资源 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>`| ${s.id} | ${s.resourcePath} | ${s.fetchedAt} | ${s.excerpts.length} |`),'',
    '| 历史截图及元素 | 原采样UTC | 相对路由 |','|---|---|---|',...rows,'',
    '历史图均1500×1000。模型列表有表头、总数1但行体空白；物化页正文处于加载态，不能当正常空结果。分析图仅标准分析页签；统计首屏仅部分图表，属性弹窗首屏仅六个字段，前后置字段表由DOM和静态模板补充，未取得滚动后完整画面。其他页签、维护/物化/画布的布局仅有组件定义。','',
    '分发限获授权项目成员；原历史材料可能含业务样本，不公开演示。前端调用定义不证明服务端鉴权、事务、引用保护、成功状态或物理数据库结果；应用和非功能验收全部未执行。','',
  ].join('\n'));
  return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:55};
}
if(require.main===module){
  const value=flag=>{const i=process.argv.indexOf(flag);if(i<0||!process.argv[i+1])throw new Error(flag+' required');return path.resolve(process.argv[i+1]);};
  const own=value('--source-dir'),shared=value('--shared-source-dir');
  console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared):prepare(own,shared)));
}
module.exports={select,prepare,verifyAll};
