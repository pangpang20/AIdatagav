/* Read static text only. No evaluated bundles or business API calls. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence'),{verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/idqs-review-20261027');
function select(directory){
 const names=fs.readdirSync(directory),selected=[];
 for(const n of names.filter(n=>/^(api-|views-)/.test(n)&&n.endsWith('.js'))){
  const raw=fs.readFileSync(path.join(directory,n),'utf8'),anchors=[];
  for(const [a,max]of n.startsWith('api-')?[[raw.slice(0,70),raw.length]]:[['data:function',11000],['methods:',30000],['attrs:{',18000]]){
   const i=raw.indexOf(a);if(i<0)continue;let text=raw.slice(i,i+max),url=text.search(/https?:[/][/]/i);if(url>=0)text=text.slice(0,url);if(text.length>=a.length)anchors.push([a,text.length]);
  }
  if(anchors.length)selected.push(['IDQS-SRC-'+n.replace(/\.[^.]+\.js$/,'').replace(/^views-/,'VIEW-').replace(/^api-/,'API-'),n,anchors]);
 }
 selected.push(['IDQS-SRC-BRIDGE','chunk-@audaque-parentdata.5d54d53d.js',[['bcab:function',710]]]);
 selected.push(['IDQS-SRC-MIXIN','chunk-@audaque-vue-utils.d54ce51d.js',[['var o=function(e,t)',3100],['audaqueIsRequestFirstMixin:!0',5100]]]);
 selected.push(['IDQS-SRC-ROUTER','app.d31e6fa0.js',[['path:"/result",name:"result"',205],['viewsInquireIndexVue:{inquire:"查询"',3700]]]);
 return selected;
}
const sharedSelections=[
 ['IDQS-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
 ['IDQS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
 ['IDQS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
function verifyAll(data,own,shared){
 if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw new Error('IDQS unknown source group');
 if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('IDQS duplicate source id');
 let sources=0,excerpts=0;for(const [group,folder]of [['own',own],['shared',shared]]){const r=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},folder);sources+=r.sources;excerpts+=r.excerpts;}
 return {sources,excerpts,errors:0};
}
function prepare(own,shared){
 const inspectedAt=new Date().toISOString(),receipts=JSON.parse(fs.readFileSync(path.join(own,'receipt.json'),'utf8'));
 if(receipts.length!==22||new Set(receipts.map(r=>r.path)).size!==22)throw new Error('IDQS receipt mismatch');
 const sources=[...extractSources(own,inspectedAt,select(own)),...extractSources(shared,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}))];
 const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:22,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,
 limitations:['浏览器入口/idqs/inquire最终跳/module-login/login，未认证未进入业务页，新增截图0','仅公开HTML及其JS静态GET，未执行下载代码，收集器业务API请求0','历史2026-10-22截图与2026-10-27静态定义可能不同构建；shared来源保留2026-10-26获取时间','前端源码不能证明后端权限、唯一性、事务、完整DTO、错误码和性能'],sources};
 verifyAll(data,own,shared);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),['# 智能查询系统专项证据','',
 '[主规格](../../22-智能查询系统/需求说明.md) · [子页面](../../22-智能查询系统/子页面与操作细化.md) · [核查记录](../../22-智能查询系统/核查记录.md) · [片段与摘要](./index.json) · [离线提取工具](../../../../scripts/prepare-idqs-evidence.js)','',
 '2026-10-27公开静态GET成功22次（HTML 1、JS 21），失败0。原件与receipt.json保留本机临时目录；索引记录相对路径、真实获取时间、提取时间、UTF-16 code unit左闭右开偏移及原件/片段SHA-256。--verify仅离线核对，不执行原代码。','',
 '浏览器入口/idqs/inquire最终跳/module-login/login；未填写凭据，未进入业务子页，新增截图0、未取得Network。收集器业务请求0不代表浏览器没有请求。shared组沿用原始获取时间。','',
 '本次目视历史1500×1000样本K-IDQS-001、K-IDQS-002、N-IDQS-002、K-IDQS-003-op1、K-IDQS-004、K-IDQS-005-op1。K-IDQS-002路径已切到范围管理但画面仍为即席欢迎页；N-IDQS-002才用于范围列表布局。其他历史JSON仅作字段与路由对照；新增范围、权限、结果、SQL、图表和语音分支未实拍。原PNG/JSON保持不变。','',
 '| 证据ID | 相对资源路径 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>'| '+[s.id,s.resourcePath,s.fetchedAt,s.excerpts.length].join(' | ')+' |'),'','限项目授权成员；不保存部署origin、凭据和真实业务数据。全部功能、写入、性能与安全应用验收未执行。',''].join('\n'));
 return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:22};
}
if(require.main===module){const arg=f=>{const i=process.argv.indexOf(f);if(i<0||!process.argv[i+1])throw new Error(f+' required');return path.resolve(process.argv[i+1]);};const own=arg('--source-dir'),shared=arg('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared):prepare(own,shared)));}
module.exports={select,verifyAll,prepare};
