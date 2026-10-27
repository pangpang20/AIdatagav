/* Read static text only. No evaluated bundles or business API calls. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence'),{verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/dtm-review-20261027');
function select(directory){
 const names=fs.readdirSync(directory),selected=[];
 for(const n of names.filter(n=>/^(api-|views-|components-)/.test(n)&&n.endsWith('.js')&&!n.includes('businessName'))){
  const raw=fs.readFileSync(path.join(directory,n),'utf8'),anchors=[];
  if(n.startsWith('api-'))anchors.push([raw.slice(0,70),raw.length]);
  else for(const m of raw.matchAll(/data:function|methods:|beforeDestroy:function/g)){
   let end=raw.indexOf('t.default=',m.index);if(end<0)end=raw.length;
   let text=raw.slice(m.index,Math.min(end,m.index+16000));const url=text.search(/https?:[/][/]/i);if(url>=0)text=text.slice(0,url);
   const anchor=raw.slice(m.index,m.index+Math.min(160,text.length));
   if(text.length>anchor.length&&raw.indexOf(anchor)===m.index)anchors.push([anchor,text.length]);
  }
  if(anchors.length)selected.push(['DTM-SRC-'+n.replace(/\.[^.]+\.js$/,'').replace(/^views-/,'VIEW-').replace(/^api-/,'API-'),n,anchors]);
 }
 selected.push(['DTM-SRC-BRIDGE','app.9aaebc52.js',[['bcab:function',997]]]);
 selected.push(['DTM-SRC-MIXIN','chunk-@audaque-vue-utils.02997dd7.js',[['audaqueIsRequestFirstMixin:!0',3300],['audaqueFormInfoMixin:{},audaqueFormRefMixin',3200]]]);
 selected.push(['DTM-SRC-DICTIONARY','assets-js-dictionary.bd1b8090.js',[[fs.readFileSync(path.join(directory,'assets-js-dictionary.bd1b8090.js'),'utf8').slice(0,70),606]]]);
 return selected;
}
const sharedSelections=[
 ['DTM-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
 ['DTM-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
 ['DTM-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
function verifyAll(data,own,shared){
 if('applicationAcceptanceExecuted' in data&&data.applicationAcceptanceExecuted!==false)throw new Error('DTM application acceptance must remain unexecuted');
 if('businessRequestsByCollector' in data&&data.businessRequestsByCollector!==0)throw new Error('DTM unexpected business requests');
 if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw new Error('DTM unknown source group');
 if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('DTM duplicate source id');
 let sources=0,excerpts=0;for(const [group,folder]of [['own',own],['shared',shared]]){const r=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},folder);sources+=r.sources;excerpts+=r.excerpts;}
 return {sources,excerpts,errors:0};
}
function prepare(own,shared){
 const inspectedAt=new Date().toISOString(),receipts=JSON.parse(fs.readFileSync(path.join(own,'receipt.json'),'utf8'));
 if(receipts.length!==36||new Set(receipts.map(r=>r.path)).size!==36)throw new Error('DTM receipt mismatch');
 const sources=[...extractSources(own,inspectedAt,select(own)),...extractSources(shared,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}))];
 const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:36,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,
 limitations:['浏览器入口/da-dtm/warehouseResources/warehouseResourcesList最终跳/module-login/login，未认证未进入业务页，新增截图0','仅公开HTML及其JS静态GET，未执行下载代码，收集器业务API请求0','历史2026-10-22截图与2026-10-27静态定义可能不同构建；shared来源保留2026-10-26获取时间','前端源码不能证明后端权限、唯一性、事务、完整DTO、错误码和性能'],sources};
 verifyAll(data,own,shared);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),['# 数据表管理专项证据','',
 '[主规格](../../25-数据表管理/需求说明.md) · [子页面](../../25-数据表管理/子页面与操作细化.md) · [核查记录](../../25-数据表管理/核查记录.md) · [片段与摘要](./index.json) · [离线提取工具](../../../../scripts/prepare-dtm-evidence.js)','',
 '2026-10-27公开静态GET成功36次（HTML 1、JS 35），失败0。原件与receipt.json保留本机临时目录；索引记录相对路径、真实获取时间、提取时间、UTF-16 code unit左闭右开偏移及原件/片段SHA-256。--verify仅离线核对，不执行原代码。','',
 '浏览器入口/da-dtm/warehouseResources/warehouseResourcesList最终跳/module-login/login；未填写凭据，未进入业务子页，新增截图0、未取得Network。收集器业务请求0不代表浏览器没有请求。shared组沿用原始获取时间。','',
 '目视历史1500×1000样本V-DTM-001～005及N-DTM-003。N-DTM-003虽已是审批路径，画面仍为数据库列表；审批布局采用V-DTM-003。申请、授权编辑、审批表单及移交只核对静态定义，没有新的业务页实拍。历史PNG/JSON不修改。','',
 '| 证据ID | 相对资源路径 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>'| '+[s.id,s.resourcePath,s.fetchedAt,s.excerpts.length].join(' | ')+' |'),'','限项目授权成员；不保存部署origin、凭据和真实业务数据。全部功能、写入、性能与安全应用验收未执行。',''].join('\n'));
 return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:36};
}
if(require.main===module){const arg=f=>{const i=process.argv.indexOf(f);if(i<0||!process.argv[i+1])throw new Error(f+' required');return path.resolve(process.argv[i+1]);};const own=arg('--source-dir'),shared=arg('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared):prepare(own,shared)));}
module.exports={select,verifyAll,prepare};
