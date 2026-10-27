/* Offline extraction only: downloaded application text is never evaluated. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/dacs-review-20261027');
function selections(dir){
 return fs.readdirSync(dir).filter(n=>n.startsWith('views-')||['app.52ca8dd1.js','vue-hooks.11f88870.js','parentdata.c2c814bb.js'].includes(n)).map(n=>{
  const s=fs.readFileSync(path.join(dir,n),'utf8'),limit=n.startsWith('views-overview')?s.indexOf('42782:function'):s.length;
  const end=limit>0?limit:s.length,anchors=[];
  for(let start=0;start<end;start+=5000){const length=Math.min(5000,end-start),text=s.slice(start,start+length);if(!/https?:\/\//i.test(text))anchors.push([text.slice(0,80),length]);}
  return ['DACS-SRC-'+n.replace(/\.\w{8}\.js$/,''),n,anchors];
 });
}
function verifyAll(index,own,shared){
 if(new Set(index.sources.map(s=>s.id)).size!==index.sources.length)throw Error('duplicate source id');
 if(index.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw Error('unknown source group');
 let sources=0,excerpts=0;
 for(const [g,dir]of [['own',own],['shared',shared]]){const r=verify({sources:index.sources.filter(s=>(s.sourceGroup||'own')===g)},dir);sources+=r.sources;excerpts+=r.excerpts;}
 return{sources,excerpts,errors:0};
}
function prepare(own,shared){
 const now=new Date().toISOString(),common=[['DACS-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],['DACS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]]];
 const sources=[...extractSources(own,now,selections(own)),...extractSources(shared,now,common).map(s=>({...s,sourceGroup:'shared'}))];
 const receipts=JSON.parse(fs.readFileSync(path.join(own,'receipt.json'),'utf8'));
 const index={schemaVersion:1,evidenceType:'static-source',inspectedAt:now,publicStaticGets:receipts.length,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,browserObservation:{entry:'/dacs/overview/overview',redirect:'/module-login/login',credentialsEntered:false,businessPageOpened:false,newScreenshots:0},visuallyInspectedHistoricalScreenshots:13,sources};
 fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(index,null,2)+'\n');
 const history=fs.readdirSync(path.resolve(output,'../live-recheck-20261022')).filter(n=>/^V-DACS-/.test(n)&&n.endsWith('.json')&&!n.includes('000-entry'));
 fs.writeFileSync(path.join(output,'README.md'),['# 资产目录系统专项证据','', '[主规格](../../23-资产目录系统/需求说明.md) · [子页面](../../23-资产目录系统/子页面与操作细化.md) · [核查记录](../../23-资产目录系统/核查记录.md) · [片段摘要](./index.json) · [提取工具](../../../../scripts/prepare-dacs-evidence.js)','',
 `2026-10-27公开静态GET共${receipts.length}次成功；采集器业务API请求0次。原包与receipt.json留在本机临时目录，片段记录原件SHA-256、UTF-16 code unit左闭右开偏移、获取和提取UTC时间。共享宿主资源沿用2026-10-26回执。未执行下载代码。`, '',
 '浏览器入口跳转/module-login/login，未输入凭据、未进入业务页、未取得业务Network或新截图。以下13张历史1500×1000图本次以拼图目视复核；画像最后一行超出首屏，不能称完整滚动覆盖。历史图及JSON不改写，静态前端和历史截图是否同一构建未知。','',
 '| 来源ID | 相对资源 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>`| ${s.id} | ${s.resourcePath} | ${s.fetchedAt} | ${s.excerpts.length} |`),'',
 '| 历史截图/元素 | 原始采样时间 | 路由 |','|---|---|---|',...history.map(n=>{const d=JSON.parse(fs.readFileSync(path.resolve(output,'../live-recheck-20261022',n),'utf8')),id=n.slice(0,-5);return`| [${id}](../live-recheck-20261022/${id}.png) / [元素](../live-recheck-20261022/${n}) | ${d.time} | ${d.url} |`;}),'',
 '多处角色API响应被本地数组替换，图表是固定样例；写包装器还包含真实公共角色POST/PUT/DELETE，不可用于资产业务、不可作为只读取证调用。静态提取和校验不代表真实持久化、审批、权限或统计通过，应用验收全部未执行。',''].join('\n'));
 return{sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:receipts.length};
}
if(require.main===module){const a=process.argv,own=a[a.indexOf('--source-dir')+1],shared=a[a.indexOf('--shared-source-dir')+1];if(!a.includes('--source-dir')||!a.includes('--shared-source-dir'))throw Error('both source directories required');console.log(JSON.stringify(a.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared):prepare(own,shared)));}
module.exports={prepare,verifyAll,selections};
