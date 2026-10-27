/* Read static text only. No evaluated bundles or business API calls. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence'),{verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/tms-review-20261027');
function select(directory){
 const names=fs.readdirSync(directory),selected=[];
 for(const n of names.filter(n=>n.startsWith('views-')&&n.endsWith('.js'))){
  const raw=fs.readFileSync(path.join(directory,n),'utf8'),anchors=[];
  for(const a of ['data:function','methods:','attrs:{']){let i=raw.indexOf(a);if(i<0)continue;let end=raw.indexOf('e.default=',i);if(end<0)end=raw.indexOf('t.default=',i);let text=raw.slice(i,Math.min(i+35000,end>i?end+80:raw.length));let url=text.search(/https?:[/][/]/i);if(url>=0)text=text.slice(0,url);if(text.length>=a.length)anchors.push([a,text.length]);}
  if(anchors.length)selected.push(['TMS-SRC-'+n.replace(/\.[^.]+\.js$/,'').replace('views-','VIEW-'),n,anchors]);
 }
 const common=names.find(n=>n.startsWith('chunk-common.')),raw=fs.readFileSync(path.join(directory,common),'utf8'),mods=[...raw.matchAll(/(?:^|,)(?:"([\da-f]{4})"|([\da-f]{4})):function\([^)]*\)\{/g)];
 for(let i=0;i<mods.length;i++){const m=mods[i],body=raw.slice(m.index,mods[i+1]?.index||raw.length),key=m[1]||m[2];if(!body.includes('().request(')&&!['5c0b','763c','a877','b872','b993','ba05','ca76','ff05','6dee','eacf','5edb','62f6','d6ca'].includes(key))continue;const a=body.slice(0,Math.min(100,body.length));let length=body.length;const url=body.search(/https?:[/][/]/i);if(url>=0)length=url;if(length>=a.length)selected.push(['TMS-SRC-COMMON-'+key,common,[[a,length]]]);}
 selected.push(['TMS-SRC-BRIDGE',names.find(n=>n.startsWith('chunk-@audaque-parentdata.')),[['bcab:function',880]]]);
 selected.push(['TMS-SRC-MOUNT',names.find(n=>/^app\./.test(n)),[['function v(){return',1900]]]);
 return selected;
}
const sharedSelections=[
 ['TMS-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
 ['TMS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
 ['TMS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
function verifyAll(data,own,shared){
 if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw new Error('TMS unknown source group');
 if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('TMS duplicate source id');
 let sources=0,excerpts=0;for(const [group,folder]of [['own',own],['shared',shared]]){const r=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},folder);sources+=r.sources;excerpts+=r.excerpts;}
 return {sources,excerpts,errors:0};
}
function prepare(own,shared){
 const inspectedAt=new Date().toISOString(),receipts=JSON.parse(fs.readFileSync(path.join(own,'receipt.json'),'utf8'));
 if(receipts.length!==51||new Set(receipts.map(r=>r.path)).size!==51)throw new Error('TMS receipt mismatch');
 const sources=[...extractSources(own,inspectedAt,select(own)),...extractSources(shared,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}))];
 const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:51,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,limitations:['浏览器入口/tms/overview/index最终跳/module-login/login，未认证未进入业务页，新增截图0','仅公开HTML及其JS静态GET，未执行下载代码，收集器业务API请求0','历史2026-10-22截图与2026-10-27静态定义可能不同构建；shared来源保留2026-10-26获取时间','前端不能证明后端权限、唯一性、事务、完整DTO、错误码和性能'],sources};
 verifyAll(data,own,shared);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),['# 标签管理专项证据','','[主规格](../../21-标签管理/需求说明.md) · [子页面](../../21-标签管理/子页面与操作细化.md) · [核查记录](../../21-标签管理/核查记录.md) · [片段摘要](./index.json) · [提取工具](../../../../scripts/prepare-tms-evidence.js)','','2026-10-27公开静态GET成功51次（HTML 1、JS 50），失败0。原件与receipt.json保留本机临时目录；记录相对资源路径、真实获取/提取时间、UTF-16 code unit左闭右开偏移及原件/片段SHA-256。--verify只做离线检查，不执行原代码。','','当前入口跳登录页；未输入凭据，未进入业务子页，新增截图0、未取得Network。收集器业务请求0不代表浏览器没有请求。shared组保留原获取时间。','','复看1500×1000历史PNG：K-TMS-001（概览下方超出视口）、004-op1（实体属性新增）、008（属性分析地址却显示用户画像）、009（手工/冲突页签及空分类）、011-op1（资产标签新增）、012（FTP分类空态）。其余历史JSON用于字段/路由核对，不声称本次逐页进入；旧PNG/JSON与调研归档原样保留。','','| 证据ID | 相对资源路径 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>'| '+[s.id,s.resourcePath,s.fetchedAt,s.excerpts.length].join(' | ')+' |'),'','源码只证明客户端定义；应用功能、写入、安全与性能验收全部未执行。'].join('\n'));
 return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:51};
}
if(require.main===module){const arg=f=>{const i=process.argv.indexOf(f);if(i<0||!process.argv[i+1])throw new Error(f+' required');return path.resolve(process.argv[i+1]);};const own=arg('--source-dir'),shared=arg('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared):prepare(own,shared)));}
module.exports={select,verifyAll,prepare};
