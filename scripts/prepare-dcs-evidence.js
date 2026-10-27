/* Offline reading only: downloaded application code is never evaluated. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence'),{verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/dcs-review-20261027');
function select(directory){
 const names=fs.readdirSync(directory),selected=[];
 for(const n of names.filter(n=>n.endsWith('.js')&&((n.startsWith('api-')&&!/api-service|api-systemConfig/.test(n))||(n.startsWith('views-')&&!n.includes('~')&&!/views-serviceManagement|views-cascadeConfig|views-cataCenter-hiveList|views-resources-components-Basic/.test(n))||n.startsWith('components-Approval.')||n.startsWith('components-Region.')))){
  const raw=fs.readFileSync(path.join(directory,n),'utf8'),anchors=[];
  const points=n.startsWith('api-')?[[raw.slice(0,90),raw.length]]:[['data:function',10000],['methods:',26000],['render:function',14000],['staticClass:',14000]];
  for(const [a,max]of points){let i=raw.indexOf(a);if(i<0)continue;let text=raw.slice(i,i+max),url=text.search(/https?:[/][/]/i);if(url>=0)text=text.slice(0,url);if(text.length>=a.length)anchors.push([a,text.length]);}
  if(anchors.length)selected.push(['DCS-SRC-'+n.replace(/\.[^.]+\.js$/,'').replace(/^views-/,'VIEW-').replace(/^api-/,'API-'),n,anchors]);
 }
 const app=names.find(n=>/^app\.[^.]+\.js$/.test(n));
 selected.push(['DCS-SRC-APP',app,[['"5c0b":function',1000],['bcab:function',925],['tenantList',4000],['pageNo:1,pageSize:10',500]]]);
 const basic=names.find(n=>n.startsWith('views-catalogue-edit~'));
 const raw=fs.readFileSync(path.join(directory,basic),'utf8');selected.push(['DCS-SRC-BASIC',basic,[[raw.slice(0,90),raw.length]]]);
 return selected;
}
const sharedSelections=[
 ['DCS-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
 ['DCS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
 ['DCS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
function verifyAll(data,own,shared){
 if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw new Error('DCS unknown source group');
 if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('DCS duplicate source id');
 let sources=0,excerpts=0;for(const [group,folder]of [['own',own],['shared',shared]]){const r=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},folder);sources+=r.sources;excerpts+=r.excerpts;}
 return {sources,excerpts,errors:0};
}
function prepare(own,shared){
 const inspectedAt=new Date().toISOString(),receipts=JSON.parse(fs.readFileSync(path.join(own,'receipt.json'),'utf8'));
 if(receipts.length!==62||new Set(receipts.map(r=>r.path)).size!==62)throw new Error('DCS receipt mismatch');
 const sources=[...extractSources(own,inspectedAt,select(own)),...extractSources(shared,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}))];
 const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:62,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,
 limitations:['正确登记入口/dcs/analyze/internal最终跳/module-login/login，未认证、未进业务页、未新增截图及Network','仅公开静态资源GET后离线读文本，下载代码未执行，收集器未调用业务API','历史截图2026-10-22和静态定义2026-10-27可能不同构建','shared请求客户端保持原2026-10-26获取时间；前端不证明后端契约、安全、事务及性能'],sources};
 verifyAll(data,own,shared);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),['# 目录管理系统专项证据','',
 '[主规格](../../14-目录管理系统/需求说明.md) · [子页面](../../14-目录管理系统/子页面与操作细化.md) · [核查记录](../../14-目录管理系统/核查记录.md) · [片段与摘要](./index.json) · [离线提取工具](../../../../scripts/prepare-dcs-evidence.js)','',
 '2026-10-27公开静态GET成功62次（HTML 1、JS 61），失败0。原件与receipt.json保留本机临时目录；本索引记录必要原文、相对路径、获取UTC、提取UTC、原件和片段SHA-256。UTF-16 code unit左闭右开偏移；--verify只核对本机文本，不发网络请求，不执行原包。未摘录的图表库、服务商及级联配置文件不代表本模块新增需求。','',
 '浏览器可控制；先前错误探测路径不作业务证据，重新访问已登记/dcs/analyze/internal后最终为/module-login/login。未填写凭据、未进业务子页、新增截图0、未抓Network；仅收集器业务请求0，不声称浏览器未发任何请求。shared组沿用原获取时间，提取时间单列。','',
 '本次复看历史1500×1000原图：J-DCS-003-op2导入弹窗有加载指示；J-DCS-003-op3只显示编目首步及部分滚动区域；U-DCS-resource-menu显示总数36但无渲染行，不能当合法空结果；J-DCS-011-op1为机构新增表单首屏。完整后续步骤与所有条件分支未实拍；静态模板仅支持控件定义，不能说已打开。旧PNG/JSON、原时间及调研归档不变。','',
 '| 证据ID | 相对资源路径 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>'| '+[s.id,s.resourcePath,s.fetchedAt,s.excerpts.length].join(' | ')+' |'),'','限项目授权成员；不保存部署origin、凭据和真实业务数据。全部功能、写入、性能与安全应用验收未执行。',''].join('\n'));
 return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:62};
}
if(require.main===module){const arg=f=>{const i=process.argv.indexOf(f);if(i<0||!process.argv[i+1])throw new Error(f+' required');return path.resolve(process.argv[i+1]);};const own=arg('--source-dir'),shared=arg('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared):prepare(own,shared)));}
module.exports={select,verifyAll,prepare};
