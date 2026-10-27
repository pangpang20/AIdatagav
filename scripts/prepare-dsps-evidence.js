/* Extract and verify static text only. Never evaluate downloaded code. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence'),{verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/dsps-review-20261027');
function select(dir){
 const selected=[];
 for(const name of fs.readdirSync(dir).filter(n=>/^(views-|api-|utils-).*\.js$/.test(n))){
  const text=fs.readFileSync(path.join(dir,name),'utf8');
  const modules=[...text.matchAll(/(?:^|[,{])(?:"([\da-f]{4})"|([\da-f]{4})):function\([^)]*\)\{/g)];
  for(let i=0;i<modules.length;i++){
   const m=modules[i],body=text.slice(m.index,modules[i+1]?.index||text.length);
   if(!body.includes('data:function')&&!body.includes('().request(')&&!body.includes('MASK_STATUS_LIST')&&!body.includes('isNumberical:'))continue;
   const anchor=body.slice(0,100);let length=body.length;const url=body.search(/https?:[/][/]/i);if(url>=0)length=url;
   if(length>=anchor.length)selected.push(['DSPS-SRC-'+name.replace(/\.[^.]+\.js$/,'')+'-'+(m[1]||m[2]),name,[[anchor,length]]]);
  }
 }
 const app=fs.readdirSync(dir).find(n=>/^app\./.test(n));
 selected.push(['DSPS-SRC-BRIDGE',app,[['bcab:function',820],['getRequestInstance:function(){return o.getInstance()}',190]]]);
 const util=fs.readdirSync(dir).find(n=>n.startsWith('chunk-@audaque-vue-utils.'));
 selected.push(['DSPS-SRC-MIXINS',util,[['var o=function(e){return{data:function(){return{audaqueDeleteHintMixin:',2100],['audaqueIsRequestFirstMixin:!0,audaqueSearchMixin:',4400],['var f={data:function(){return{audaqueFormEditFormUrlMixin:',700],['var d=function(e,t,r){return{data:function()',3600]]]);
 return selected;
}
const sharedSelections=[
 ['DSPS-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
 ['DSPS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
 ['DSPS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
function verifyAll(data,own,shared){
 if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw new Error('DSPS unknown source group');
 if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('DSPS duplicate source id');
 let sources=0,excerpts=0;for(const [group,folder]of [['own',own],['shared',shared]]){const r=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},folder);sources+=r.sources;excerpts+=r.excerpts;}return {sources,excerpts,errors:0};
}
function prepare(own,shared){
 const inspectedAt=new Date().toISOString(),receipt=JSON.parse(fs.readFileSync(path.join(own,'receipt.json'),'utf8'));
 if(receipt.length!==40||new Set(receipt.map(r=>r.path)).size!==40)throw new Error('DSPS receipt mismatch');
 const sources=[...extractSources(own,inspectedAt,select(own)),...extractSources(shared,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}))];
 const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:40,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,limitations:['当前入口/dsps/mask/list跳/module-login/login，未输入凭据、未进入业务子页、新截图0、未取得Network','静态HTML1与JS39只读GET成功，未执行下载代码；收集器业务API请求0不代表浏览器零请求','历史2026-10-22与本次静态资源可能不同构建；shared保留2026-10-26获取时间','前端不能证明权限、密钥生命周期、算法安全性、持久化事务、引擎结果或恢复能力'],sources};
 verifyAll(data,own,shared);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),['# 数据安全保护专项证据','','[需求说明](../../24-数据安全保护/需求说明.md) · [子页面](../../24-数据安全保护/子页面与操作细化.md) · [核查记录](../../24-数据安全保护/核查记录.md) · [片段摘要](./index.json) · [离线工具](../../../../scripts/prepare-dsps-evidence.js)','','2026-10-27公开静态GET成功40次（HTML1、JS39），失败0；仅分析文本，未执行下载代码，收集器业务API请求0。原件/receipt留本机临时目录。每条记录原件SHA-256、字节数、原获取与提取UTC、UTF-16左闭右开偏移和片段摘要。--verify仅离线检查。','','当前入口跳登录，未认证未进入业务子页、没有新增截图/Network。实际复看1500×1000历史PNG：F-DSPS-001、002-op1、003、004-op1、005-op1、006-op1、007。其他历史JSON用于字段/选项/路由核对，不声称本次逐页进入。制作水印历史按钮落在输入下方，当前组件定义为同行；两者并列登记。缺少任务步骤/日志/预览截图的部分仅依静态组件说明。历史来源与时间不变。','','| 证据ID | 相对资源路径 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>'| '+[s.id,s.resourcePath,s.fetchedAt,s.excerpts.length].join(' | ')+' |'),'','客户端定义不证明SM4模式/密钥隔离、MD5用途、真实写入或水印取证效果；全部应用验收未执行。'].join('\n'));
 return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:40};
}
if(require.main===module){const arg=f=>{const i=process.argv.indexOf(f);if(i<0||!process.argv[i+1])throw new Error(f+' required');return path.resolve(process.argv[i+1]);};const own=arg('--source-dir'),shared=arg('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared):prepare(own,shared)));}
module.exports={select,verifyAll,prepare};
