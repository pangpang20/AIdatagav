/* Extract exact, inert DAP source excerpts from locally retained public GETs. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/dap-review-20261027');
const apiSelections=[
 ['DAP-SRC-API-DATASOURCE','api-manage-dataSource-dataSourceTable.76f2c39f.js',[['/datasource/page',1600],['/datasource/sources',700]]],
 ['DAP-SRC-API-DOMAIN','api-manage-dataField-dataField.bb3684eb.js',[['/domain/page1',2200],['/userdomain/userauth/',800]]],
 ['DAP-SRC-API-CYCLE','api-manage-statPeriod-statPeriod.5b271cc9.js',[['/sumacccycledef/page',1500]]],
 ['DAP-SRC-API-DIMENSION','api-research-standard-dimension.0b0fbeea.js',[['/dimdef/page',1750]]],
 ['DAP-SRC-API-BUSINESS','api-research-standard-businessDef.bbe4cf58.js',[['/businessdef/page',1350]]],
 ['DAP-SRC-API-ATOM','api-research-standard-atom.2a4af112.js',[['/atmaccountdef/page',1800],['/atmaccountdef/downTemplate',700]]],
 ['DAP-SRC-API-FORMULA','api-research-standard-derivative.23e0ce8e.js',[['/deriveaccdef/page',1400]]],
 ['DAP-SRC-API-LIMIT','api-research-standard-businessLimit.fab4c49f.js',[['/sumacclimitdef/page',950]]],
 ['DAP-SRC-API-AGGREGATE','api-research-standard-accCycle.ffa3cd36.js',[['/sumaccountdef/page',1800]]],
 ['DAP-SRC-API-CUSTOM','api-research-standard-diy.a0e3fbd1.js',[['/cusaccountdef/page',1000]]],
 ['DAP-SRC-API-DIMTABLE','api-research-logicTable-dimensionTable.8ae8d6a2.js',[['/dimdef/list',1500]]],
 ['DAP-SRC-API-FACT','api-research-logicTable-factLogicTable.c8d0d058.js',[['/facttable/page',2350],['/tab/commit/log/page',1350]]],
 ['DAP-SRC-API-SUMMARY','api-research-logicTable-summaryTable.dadd2797.js',[['/collectlogictable/list',1750]]],
 ['DAP-SRC-API-RESULT','api-research-logicTable-resultTable.5534008a.js',[['/sumaccountdef/attrs/',1000]]],
 ['DAP-SRC-API-REVIEW','api-release-releaseManage-releaseManage.2847d31c.js',[['/approvalflow/page',850]]],
 ['DAP-SRC-API-DISPATCH','api-devOps-dispatch-dispatch.d93d7f4c.js',[['/schedule/page',1600]]],
 ['DAP-SRC-API-ANALYSIS','api-analysis-dataAnalysis-design.0905d5fd.js',[['/dataanalysis/page',2100]]],
 ['DAP-SRC-API-MONITOR','api-monitor-monitor.89e19316.js',[['/monitor/page',1100],['/alert/page',700]]],
 ['DAP-SRC-API-TYPES','api-serviceConstant.1023e58d.js',[['modulePrefix',250]]],
 ['DAP-SRC-APP','app.be23b1e3.js',[['bcab:function',1050]]],
];
const shared=[
 ['DAP-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
 ['DAP-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
 ['DAP-SRC-CONFIG','serviceConfig.prod.js',[['API_BASE_URL: baseUrl + \'/back\'',39],['MODULE_URL_PREFIX: {}',21]]],
];
const inspect=(dir,id)=>{
 const list=JSON.parse(fs.readFileSync(path.join(dir,'analysis.json'),'utf8'));
  const rows=list.filter(x=>x.n.startsWith('views-')||x.n==='components-BatchUpload.10f10124.js');
 return rows.map(x=>{
  const anchors=[];
  for(const key of ['data','methods']){
   const value=x[key];if(!value||value.length<80)continue;
   const anchor=value.slice(0,80);anchors.push([anchor,Math.min(value.length,10000)]);
  }
  const raw=fs.readFileSync(path.join(dir,x.n),'utf8');
  for(const m of raw.matchAll(/audaqueFormRulesMixin:\{|maxlength:|auto-upload|fileSize|handlePause:function|handleResume:function/g)){
   const start=Math.max(0,m.index-70),length=m[0]==='audaqueFormRulesMixin:{'?3000:450;
   const anchor=raw.slice(start,start+70);if(!anchors.some(a=>a[0]===anchor))anchors.push([anchor,Math.min(length,raw.length-start)]);
  }
  if(!anchors.length)return null;
  return [id+'-'+x.n.replace(/[^a-z0-9.-]/gi,'-'),x.n,anchors];
 }).filter(Boolean);
};
function verifyAll(data,own,common){
 if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw Error('unknown source group');
 if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw Error('duplicate source id');
 let sources=0,excerpts=0;
 for(const [group,dir]of [['own',own],['shared',common]]){
  const result=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},dir);sources+=result.sources;excerpts+=result.excerpts;
 }
 return{sources,excerpts,errors:0};
}
function prepare(own,common){
 const inspectedAt=new Date().toISOString(),selected=[...apiSelections.map(s=>{
  if(!s[1].startsWith('api-'))return s;
  const raw=fs.readFileSync(path.join(own,s[1]),'utf8');return[s[0],s[1],[[raw.slice(0,80),raw.length]]];
 }),...inspect(own,'DAP-SRC-VIEW')];
 const sources=[...extractSources(own,inspectedAt,selected),...extractSources(common,inspectedAt,shared).map(s=>({...s,sourceGroup:'shared'}))];
 const receipt=JSON.parse(fs.readFileSync(path.join(own,'receipt.json'),'utf8'));
 if(receipt.length!==95||new Set(receipt.map(r=>r.path)).size!==95)throw Error('receipt registry mismatch');
 const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:receipt.length+1,receiptedGets:receipt.length,additionalPathProbe:1,businessRequestsByCollector:0,visuallyInspectedHistoricalScreenshots:28,availableHistoricalTargetScreenshots:76,applicationAcceptanceExecuted:false,sources};
 verifyAll(data,own,common);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),[
  '# 指标管理核查证据','',
  '2026-10-27公开静态GET共96次：95项逐条保留回执，另1次为入口路径探测。采集器业务API调用0次；下载JS只作不可执行文本读取。入口为 /dap/index.html，浏览器在 2026-10-27 到达 /module-login/login，未输入认证信息。未取得新的业务页、Network记录或业务截图；历史目标截图76张，本次通过联系图目视复核28张，其余只查原始JSON。', '',
  '[精确源码片段与SHA-256](./index.json) · [需求核查记录](../../20-指标管理/核查记录.md) · [静态提取器](../../../../scripts/prepare-dap-evidence.js)', '',
  '保留原文件与GET回执位于本机临时目录；本索引仅含必要片段，使用原始字节及片段SHA-256、UTF-16左闭右开偏移校验。入口HTML的动态认证字段不进入索引。公共请求/配置沿用2026-10-26已留存父应用证据及原获取时间。前端包版本与历史截图是否同版未经验证。', '',
  '页面证据使用原截图、原JSON和原调研记录链接，时间不改写。导航错误记录原样保留，不等于对应PNG没有内容。所有功能、写入、权限、安全、计算、导入导出、发布、调度及性能应用验收均未执行；文档与源码校验不能替代应用验收。', ''
 ].join('\n'));
 return verifyAll(data,own,common);
}
if(require.main===module){const arg=n=>{const i=process.argv.indexOf(n);if(i<0||!process.argv[i+1])throw Error(n+' required');return path.resolve(process.argv[i+1]);};const own=arg('--source-dir'),common=arg('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,common):prepare(own,common)));}
module.exports={prepare,verifyAll};
