/* Read static text only. No evaluated bundles or business API calls. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence'),{verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/mdm-review-20261027');
function select(directory){
 const names=fs.readdirSync(directory),selected=[];
 for(const n of names.filter(n=>n.endsWith('.js')&&((n.startsWith('api-')&&!n.includes('fullChainAnalysis'))||n.startsWith('views-metadata-manage-')||n.startsWith('views-metadata-components-')||n.startsWith('components-MetaTableInput')||n.startsWith('views-metadata-analyse-bloodManageList')))){
  const raw=fs.readFileSync(path.join(directory,n),'utf8'),anchors=[];
  for(const [a,max]of n.startsWith('api-')?[[raw.slice(0,90),raw.length]]:[['data:function',8000],['methods:',18000],['attrs:{',13000]]){
   const i=raw.indexOf(a);if(i<0)continue;let text=raw.slice(i,i+max),url=text.search(/https?:[/][/]/i);if(url>=0)text=text.slice(0,url);if(text.length>=a.length)anchors.push([a,text.length]);
  }
  if(n.startsWith('views-metadata-analyse-bloodManageList'))anchors.push(['s=[{value:0,label:',125]);
  if(n.startsWith('views-metadata-manage-applyEdit'))anchors.push(['if(a.columnName!==r.columnName',750],['applyOptType:2',400]);
  if(n.startsWith('views-metadata-manage-applyAdd'))anchors.push(['applyOptType:1',200]);
  if(n.startsWith('views-metadata-manage-applyDelete'))anchors.push(['var n={deleteTableIds:',350]);
  if(anchors.length)selected.push(['MDM-SRC-'+n.replace(/\.[^.]+\.js$/,'').replace(/^views-/,'VIEW-').replace(/^api-/,'API-'),n,anchors]);
 }
 const app=names.find(n=>/^app\.[^.]+\.js$/.test(n));
 selected.push(['MDM-SRC-APP',app,[['bcab:function',925]]]);
 return selected;
}
const sharedSelections=[
 ['MDM-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
 ['MDM-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
 ['MDM-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
function verifyAll(data,own,shared){
 if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw new Error('MDM unknown source group');
 if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('MDM duplicate source id');
 let sources=0,excerpts=0;for(const [group,folder]of [['own',own],['shared',shared]]){const r=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},folder);sources+=r.sources;excerpts+=r.excerpts;}
 return {sources,excerpts,errors:0};
}
function prepare(own,shared){
 const inspectedAt=new Date().toISOString(),receipts=JSON.parse(fs.readFileSync(path.join(own,'receipt.json'),'utf8'));
 if(receipts.length!==49||new Set(receipts.map(r=>r.path)).size!==49)throw new Error('MDM receipt mismatch');
 const sources=[...extractSources(own,inspectedAt,select(own)),...extractSources(shared,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}))];
 const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:49,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,
 limitations:['浏览器入口/mdm/metadata/manage/collectList最终跳/module-login/login，未认证未进入业务页，新增截图0','仅公开HTML及其JS静态GET，未执行下载代码，收集器业务API请求0','历史2026-10-22截图与2026-10-27静态定义可能不同构建；shared来源保留2026-10-26获取时间','前端源码不能证明后端权限、唯一性、事务、完整DTO、错误码和性能'],sources};
 verifyAll(data,own,shared);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),['# 元数据管理专项证据','',
 '[主规格](../../19-元数据管理/需求说明.md) · [子页面](../../19-元数据管理/子页面与操作细化.md) · [核查记录](../../19-元数据管理/核查记录.md) · [片段与摘要](./index.json) · [离线提取工具](../../../../scripts/prepare-mdm-evidence.js)','',
 '2026-10-27公开静态GET成功49次（HTML 1、JS 48），失败0。原件与receipt.json保留本机临时目录；索引记录相对路径、真实获取时间、提取时间、UTF-16 code unit左闭右开偏移及原件/片段SHA-256。--verify仅离线核对，不执行原代码。','',
 '浏览器入口/mdm/metadata/manage/collectList最终跳/module-login/login；未填写凭据，未进入业务子页，新增截图0、未取得Network。收集器业务请求0不代表浏览器没有请求。shared组沿用原始获取时间。','',
 '本次复看1500×1000历史图V-MDM-001-op2（请求异常且部分字段禁用）、V-MDM-005-op2（未来五次计划预览）、V-MDM-006（总数104但无表格行，非正常空态）、V-MDM-010（映射导入历史）。其他历史JSON用于字段/路由对照，不声称重新逐页打开。新增/审核/上传及所有条件分支未实拍，旧PNG、JSON和调研归档保持原时间。','',
 '| 证据ID | 相对资源路径 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>'| '+[s.id,s.resourcePath,s.fetchedAt,s.excerpts.length].join(' | ')+' |'),'','限项目授权成员；不保存部署origin、凭据和真实业务数据。全部功能、写入、性能与安全应用验收未执行。',''].join('\n'));
 return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:49};
}
if(require.main===module){const arg=f=>{const i=process.argv.indexOf(f);if(i<0||!process.argv[i+1])throw new Error(f+' required');return path.resolve(process.argv[i+1]);};const own=arg('--source-dir'),shared=arg('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared):prepare(own,shared)));}
module.exports={select,verifyAll,prepare};
