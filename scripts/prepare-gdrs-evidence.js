/* Offline extraction: resources are read and hashed, never evaluated. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/gdrs-review-20261027');
function select(directory){
  const names=fs.readdirSync(directory);
  return names.filter(n=>n.endsWith('.js')&&((n.startsWith('api-')&&!/api-modules-|api-authorManage-/.test(n))||(n.startsWith('views-')&&!n.includes('~')&&!/viewExcel|views-gdrs-dataSrcManage|views-statistics-statistics/.test(n)))).map(n=>{
    const raw=fs.readFileSync(path.join(directory,n),'utf8');let anchors=[];
    if(n.startsWith('api-'))anchors=[[raw.slice(0,90),raw.length]];
    else for(const [a,max]of [['data:function',8000],['methods:',18000],['render:function',7500]]){const i=raw.indexOf(a);if(i<0)continue;let text=raw.slice(i,i+max);const url=text.search(/https?:[/][/]/i);if(url>=0)text=text.slice(0,url);if(text.length>=a.length)anchors.push([a,text.length]);}
    return ['GDRS-SRC-'+n.replace(/\.[^.]+\.js$/,'').replace(/^views-/,'VIEW-').replace(/^api-/,'API-'),n,anchors];
  }).concat([['GDRS-SRC-APP',names.find(n=>/^app\.[^.]+\.js$/.test(n)),[['bcab:function',925],['"5c0b":function',270],['exportFile:function',1930],['reportTime:function',1600]]]]);
}
const sharedSelections=[
  ['GDRS-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
  ['GDRS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
  ['GDRS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
function verifyAll(data,directory,sharedDirectory){
  if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw new Error('GDRS unknown source group');
  if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('GDRS duplicate source id');
  let sources=0,excerpts=0;
  for(const [group,folder]of [['own',directory],['shared',sharedDirectory]]){const r=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},folder);sources+=r.sources;excerpts+=r.excerpts;}
  return {sources,excerpts,errors:0};
}
function prepare(directory,sharedDirectory){
  const inspectedAt=new Date().toISOString(),receipts=JSON.parse(fs.readFileSync(path.join(directory,'receipt.json'),'utf8'));
  if(receipts.length!==108||new Set(receipts.map(r=>r.path)).size!==108)throw new Error('GDRS receipt mismatch');
  const sources=[...extractSources(directory,inspectedAt,select(directory)),...extractSources(sharedDirectory,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}))];
  sources.push(...extractSources(directory,inspectedAt,[['GDRS-SRC-VIEW-semiStructured-viewExcel','views-semiStructured-viewExcel.a1e7aae4.js',[['fcc1:function',3500]]]]));
  sources.push(...extractSources(directory,inspectedAt,[['GDRS-SRC-CRYPTO','views-gdrs-structTemplateManage~views-semiStructured-reportRecordEdit~views-statistics-reportTaskSta~4798fbb0.c96867cc.js',[['encryptPublicKey(e,t,r=',255]]]]));
  const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:108,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,inspectedResourcesWithoutExcerpts:receipts.filter(r=>r.localName==='gdrs-vue-utils.d82c24d4.js').map(r=>({resourcePath:r.path,...Object.fromEntries(Object.entries(r).filter(([k])=>k!=='path'))})),limitations:['受控浏览器跳登录页，未认证，新增业务截图0张','GET公开静态资源后离线阅读，下载代码未执行，收集器未调用业务API','历史图2026-10-22，静态包2026-10-27，不能保证同一构建','未抓Network；收集器零业务请求不代表全部会话请求','前端不证明后端DTO、权限、事务、状态机及性能'],sources};
  verifyAll(data,directory,sharedDirectory);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
  fs.writeFileSync(path.join(output,'README.md'),['# 数据直报专项证据','', '复核日期2026-10-27；提取UTC '+inspectedAt+'。','',
    '[正式需求](../../12-数据直报/需求说明.md) · [子页面细则](../../12-数据直报/子页面与操作细化.md) · [核查记录](../../12-数据直报/核查记录.md) · [原文索引](./index.json) · [提取工具](../../../../scripts/prepare-gdrs-evidence.js)','',
    '108次公开静态GET成功（1 HTML、107 JS），失败0。原件及获取回执保留本机临时目录。离线阅读，不执行下载代码，不调用业务API。浏览器可控制，但进入/gdrs/index/indexInfo最终跳/module-login/login；未填写凭据，未认证，未进入业务页。新增业务截图0张，未抓Network。','',
    'SHA-256、原件字节数、获取UTC与提取UTC分别登记。shared组保持2026-10-26实际获取时间。偏移为UTF-16 code unit左闭右开；--verify只核对本地原件，不联网。片段不保存部署地址。','',
    '| 证据ID | 相对资源 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>'| '+[s.id,s.resourcePath,s.fetchedAt,s.excerpts.length].join(' | ')+' |'),'','历史图和DOM原路径与时间保留。人工读图覆盖H-GDRS-001、W-GDRS-013-op1、W-GDRS-008-op1、H-GDRS-013。最后一张虽在类别路由，正文实际为任务列表且有加载指示，不能定义类别正常布局。W-GDRS-024/032/033未取得目标正文；AA-GDRS-file-view/help/message为已有补采，不能覆盖旧失败记录。部门未就绪/加载中不证明无该功能。','',
    '分发限项目授权成员。全部应用功能、非功能验收未执行；静态和文档验证不构成后端或端到端证明。',''].join('\n'));
  return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:108};
}
if(require.main===module){const arg=f=>{let i=process.argv.indexOf(f);if(i<0||!process.argv[i+1])throw new Error(f+' required');return path.resolve(process.argv[i+1]);};const own=arg('--source-dir'),shared=arg('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared):prepare(own,shared)));}
module.exports={select,prepare,verifyAll};
