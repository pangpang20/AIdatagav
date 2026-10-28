/* Hash narrowly selected public static source; never execute a bundle or call business APIs. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/dsts-review-20261028');
const own=[
 ['DSTS-SRC-API-PLAN','api-standard-test-plan.2c6e5a54.js', [['(window.webpackJsonp_dsts',2200]]],
 ['DSTS-SRC-API-TEST','api-standard-test-test.3552cc1d.js', [['(window.webpackJsonp_dsts',2400]]],
 ['DSTS-SRC-API-COMMON','api-standard-test-common.91d9c0fb.js', [['(window.webpackJsonp_dsts',2600]]],
 ['DSTS-SRC-API-REPORT','api-standard-report-list.781eec9a.js', [['(window.webpackJsonp_dsts',2400]]],
 ['DSTS-SRC-API-EVALUATE','api-evaluate-task.c755dec2.js', [['(window.webpackJsonp_dsts',2400]]],
 ['DSTS-SRC-CONSTANTS','api-serviceConstant.8c1c9b71.js', [['(window.webpackJsonp_dsts',1100]]],
 ['DSTS-SRC-PLAN-LIST','views-standard-plan-list.9c7935c0.js', [['c591:function',10000]]],
 ['DSTS-SRC-PLAN-DETAIL','views-standard-plan-detail.d094848e.js', [['data:function(){return{audaqueIsRequestFirstMixin',9500]]],
 ['DSTS-SRC-TEST-LIST','views-standard-test-listPage.8f3a75e2.js', [['a49a:function',7900]]],
 ['DSTS-SRC-TEST-DETAIL','views-standard-test-detail.f724d612.js', [['eba0:function',16000],['submitStdConfigDialog:function',1800],['standardtestAdd)(a)',350]]],
 ['DSTS-SRC-REPORT-LIST','views-standard-report-list.aacc2be0.js', [['data:function(){return{dialogVisible',10000]]],
 ['DSTS-SRC-REPORT-HISTORY','views-standard-report-components-historyDialog.b48dd19f.js', [['d24c:function',6200]]],
 ['DSTS-SRC-REPORT-LOG','views-standard-report-components-logDialog.3919693b.js', [['data:function(){return{content',1250]]],
 ['DSTS-SRC-REPORT-ASSOCIATE','views-standard-report-components-openAssociateDialog.4f83f949.js', [['data:function(){return{searchValue',5100]]],
 ['DSTS-SRC-REPORT-UTILS','views-standard-report-utils.098efa11.js', [['n=function(){return{1:',500]]],
 ['DSTS-SRC-EVALUATE','views-evaluate-taskPage-list.11254165.js', [['mixins:[Object(i.audaqueListSearchMixin)(a.getEmsTaskPage)',15500]]],
 ['DSTS-SRC-ENUM','assets-js-enumConfig.8ac950a6.js', [['(window.webpackJsonp_dsts',900]]],
 ['DSTS-SRC-APP-BRIDGE','app.f4e0fc58.js', [['bcab:function',1100],['/standard/plan/detail',950]]],
];
const shared=[
 ['DSTS-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
 ['DSTS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
 ['DSTS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
const staticResourcePath=/^\/(?!\/)[^?#]+\.(?:html?|js|css)$/i;
function summarizeReceipt(receipts,scope){
 if(!Array.isArray(receipts)||receipts.length!==22)throw Error('DSTS receipt must contain 22 static resources');
 const names=new Set(),paths=new Set();
 for(const receipt of receipts){
  if(!receipt||typeof receipt!=='object'||typeof receipt.localName!=='string'||!receipt.localName||path.basename(receipt.localName)!==receipt.localName||names.has(receipt.localName))throw Error('DSTS receipt must contain 22 unique static resources');
  names.add(receipt.localName);
  if(receipt.error!=null||receipt.failure!=null||receipt.failed===true||receipt.ok===false||receipt.success===false)throw Error('DSTS failed receipt record');
  if(typeof receipt.path!=='string'||!staticResourcePath.test(receipt.path)||paths.has(receipt.path))throw Error('DSTS receipt must use unique static resource paths');
  paths.add(receipt.path);
  const method=receipt.method??receipt.requestMethod,status=receipt.status??receipt.statusCode??receipt.responseStatus;
  if(method!=null&&String(method).toUpperCase()!=='GET')throw Error('DSTS receipt must contain static GET resources only');
  if(status!=null&&(!Number.isInteger(Number(status))||Number(status)<200||Number(status)>=300))throw Error('DSTS failed receipt status');
 }
 if(scope==null)return {capturedStaticResources:receipts.length,totalRequests:null,failures:null,businessRequestsByCollector:null,collectionScopeComplete:false};
 const {totalRequests,staticGetRequests,failures,businessRequestsByCollector}=scope;
 if(![totalRequests,staticGetRequests,failures,businessRequestsByCollector].every(Number.isSafeInteger)||
    [totalRequests,staticGetRequests,failures,businessRequestsByCollector].some(n=>n<0)||
    staticGetRequests!==receipts.length||totalRequests!==staticGetRequests+failures+businessRequestsByCollector)throw Error('DSTS request scope mismatch');
 if(receipts.some(r=>{
  const method=r.method??r.requestMethod,status=r.status??r.statusCode??r.responseStatus;
  return String(method??'').toUpperCase()!=='GET'||!Number.isInteger(Number(status))||Number(status)<200||Number(status)>=300;
 }))throw Error('DSTS complete scope requires method and success status per receipt');
 return {capturedStaticResources:receipts.length,totalRequests,failures,businessRequestsByCollector,collectionScopeComplete:true};
}
function verifyAll(data,sourceDir,sharedDir){
 if(data.capturedStaticResources!==22||data.applicationAcceptanceExecuted!==false)throw Error('DSTS evidence collection boundary mismatch');
 if(data.collectionScopeComplete===true){
  if(![data.totalRequests,data.failures,data.businessRequestsByCollector].every(Number.isSafeInteger)||[data.totalRequests,data.failures,data.businessRequestsByCollector].some(n=>n<0)||data.totalRequests!==22+data.failures+data.businessRequestsByCollector)throw Error('DSTS evidence request scope mismatch');
 }else if(data.collectionScopeComplete!==false||data.totalRequests!==null||data.failures!==null||data.businessRequestsByCollector!==null)throw Error('DSTS unknown request scope must not claim counts');
 if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw Error('unknown evidence source group');
 if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw Error('duplicate source ID');
 const a=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')==='own')},sourceDir);
 const b=verify({sources:data.sources.filter(s=>s.sourceGroup==='shared')},sharedDir);
 if(a.sources!==own.length||b.sources!==shared.length)throw Error('source count mismatch');
 return {sources:a.sources+b.sources,excerpts:a.excerpts+b.excerpts,errors:0};
}
function prepare(sourceDir,sharedDir){
 const receipt=JSON.parse(fs.readFileSync(path.join(sourceDir,'receipt.json'),'utf8'));
 const scopeFile=path.join(sourceDir,'request-scope.json');
 const scope=fs.existsSync(scopeFile)?JSON.parse(fs.readFileSync(scopeFile,'utf8')):null;
 const collection=summarizeReceipt(receipt,scope);
 const inspectedAt=new Date().toISOString();
 const sources=[...extractSources(sourceDir,inspectedAt,own),...extractSources(sharedDir,inspectedAt,shared).map(s=>({...s,sourceGroup:'shared'}))];
 const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,...collection,applicationAcceptanceExecuted:false,
  limitations:['仅提取公开HTML/JS/CSS静态资源；未执行任何下载代码。本索引生成脚本仅读取本地文件，不发网络请求。',collection.collectionScopeComplete?'request-scope.json记录了静态GET、失败和收集器业务请求范围。':'原始请求范围记录未保留；失败数和收集器业务请求数未知，不写作0。','本轮受控浏览器当前业务入口重定向至登录页；未输入凭据、未进入目标页、未发起业务API请求、未新增截图。','页面截图/元素采样为2026-10-22；静态包为2026-10-28；不同构建版本的差异未经服务端验证。','前端包装器不能证明网关实际接受请求、服务端DTO/权限/事务/幂等/算法、状态和性能。'],sources};
 verifyAll(data,sourceDir,sharedDir);fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),[
  '# 数据标准检测静态源码证据','',
  '[需求说明](../../27-数据标准检测/需求说明.md) · [子页面细化](../../27-数据标准检测/子页面与操作细化.md) · [核查记录](../../27-数据标准检测/核查记录.md) · [来源片段与摘要](./index.json) · [离线校验器](../../../../scripts/prepare-dsts-evidence.js)','',
  collection.collectionScopeComplete
   ? `2026-10-28记录${collection.totalRequests}条采集请求：静态资源GET成功${collection.capturedStaticResources}项，失败${collection.failures}项，收集器业务请求${collection.businessRequestsByCollector}次。`
   : `记录${collection.capturedStaticResources}项公开静态资源；请求范围回执未保留，失败数和收集器业务请求数未知，未记录为0。`,
  '不运行下载资源。浏览器入口最终重定向登录，未进入业务页面、未取新截图、未发送业务请求。','',
  '历史截图/页面元素JSON仍在live-recheck-20261022目录。本索引只含定位相关的源码片段，避免整包入库。每段记录原始资源SHA-256、提取内容SHA-256、UTF-16 code-unit左闭右开偏移及真实获取时间。原始bundle和receipt留在本机临时目录。','',
  '若需要报告请求失败数和收集器其它请求数，源目录须提供request-scope.json，包含totalRequests、staticGetRequests、failures和businessRequestsByCollector，且每条资源回执含GET方法与成功状态；文件缺失时相应计数保持未知。','',
  '公共请求/配置片段取自2026-10-26的静态采样，保留组别与各自获取时间；不同构建的共同路径尚未做生产部署验证。静态API参数是调用端观察，不等于后端契约。','',
  '| 证据ID | 静态资源路径 | 组 | 片段数 | 获取时间UTC |','|---|---|---|---:|---|',
  ...sources.map(s=>`| ${s.id} | ${s.resourcePath} | ${s.sourceGroup||'own'} | ${s.excerpts.length} | ${s.fetchedAt} |`),'',
  '所有功能及NFR应用验收、写入、执行、附件下载、性能压测和安全测试均未执行。--verify离线对照原始下载文件，不发网络请求。',''
 ].join('\n'));
 return {own:own.length,shared:shared.length,staticGets:22};
}
if(require.main===module){const arg=n=>{const i=process.argv.indexOf(n);if(i<0||!process.argv[i+1])throw Error(n+' required');return path.resolve(process.argv[i+1]);};const source=arg('--source-dir'),sharedDir=arg('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),source,sharedDir):prepare(source,sharedDir)));}
module.exports={own,shared,summarizeReceipt,verifyAll,prepare};
