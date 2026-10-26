/* Extract saved public text without evaluating application code or calling APIs. */
const fs=require('node:fs');
const path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/cms-review-20261026');
const views=[
  ['DEVELOP-LIST','views-comfactory-development.b0fb097f.js','data:function(){return{audaqueTempData:'],
  ['DEVELOP-FORM','views-comfactory-development-edit.2813c902.js','data:function(){return{fileList:'],
  ['NAME','views-comfactory-manage-componentName.76201b1e.js','data:function(){return{audaqueTempData:'],
  ['CLASSIFY','views-comfactory-manage-classify.258ba7b9.js','data:function(){return{audaqueTempData:'],
  ['MINE','views-comfactory-mine.9d346525.js','data:function(){return{audaqueTempData:'],
  ['RECORD','views-comfactory-mine-record.89015dae.js','data:function(){return{audaqueTempData:'],
  ['SHOP','views-comfactory-supermarket.97499ff0.js','data:function(){return{audaqueTableFetchStatusMixin:1'],
  ['EDITOR','views-comfactory-development-components-SqlEditor.d55bbad0.js','"517e":function'],
];
function throughExport(directory,file,anchor){
  const raw=fs.readFileSync(path.join(directory,file),'utf8'),start=raw.indexOf(anchor);
  if(start<0)throw new Error('CMS source anchor missing: '+file);
  const match=/[a-z]\.default=[a-zA-Z]+\.exports\}/.exec(raw.slice(start));
  if(!match)throw new Error('CMS source boundary missing: '+file);
  return [anchor,match.index+match[0].length];
}
function select(directory){
  const defs=views.map(([id,file,anchor])=>['CMS-SRC-'+id,file,[throughExport(directory,file,anchor)]]);
  for(const [id,file] of [
    ['DEVELOP-API','api-comfactory-development.4a3aa772.js'],
    ['NAME-API','api-comfactory-componentName.6224a59f.js'],
    ['CLASSIFY-API','api-comfactory-classify.3dc5b1f7.js'],
    ['MINE-API','api-comfactory-mine.4cce0f38.js'],
    ['SHOP-API','api-comfactory-supermarket.028ad798.js'],
  ]){
    const raw=fs.readFileSync(path.join(directory,file),'utf8');
    defs.push(['CMS-SRC-'+id,file,[['var ',raw.length-raw.indexOf('var ')]]]);
  }
  const form='views-comfactory-development-edit.2813c902.js',raw=fs.readFileSync(path.join(directory,form),'utf8');
  const baseStart=raw.indexOf('3650:function'),baseEnd=raw.indexOf(',"3baa":function',baseStart);
  if(baseStart<0||baseEnd<0)throw new Error('CMS Base64 source boundary missing');
  defs.push(['CMS-SRC-ENCODING',form,[['3650:function',baseEnd-baseStart]]]);
  const app=fs.readFileSync(path.join(directory,'app.73911832.js'),'utf8');
  defs.push(['CMS-SRC-GATEWAY','app.73911832.js',[
    ['"5c0b":function',625],['bcab:function',925],['3191:function',2700],
  ]]);
  const groups=['viewsComfactoryDevelopmentEditVue','viewsComfactoryDevelopmentIndexVue','viewsComfactoryManageClassifyIndexVue','viewsComfactoryManageComponentNameIndexVue','viewsComfactoryMineIndexVue','viewsComfactoryMineRecordVue','viewsComfactorySupermarketIndexVue'];
  defs.push(['CMS-SRC-LANGUAGE','app.73911832.js',groups.map(group=>{
    const anchor=group+':{',start=app.lastIndexOf(anchor);
    if(start<0)throw new Error('CMS language group missing: '+group);
    return [anchor,app.indexOf('},',start)+1-start,true];
  })]);
  return defs;
}
const sharedSelections=[
  ['CMS-SRC-SHELL-REQUEST','shell-app.7ec981a3.js',[
    ['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405],
  ]],
  ['CMS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
  ['CMS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
const utilitySelections=[['CMS-SRC-LIST-MIXINS','chunk-@audaque-vue-utils.dd200c95.js',[
  ['pageSize:20',7200],['删除操作不能恢复，确定删除吗？',2000],
]]];
function verifyAll(data,directory,sharedDirectory,utilityDirectory){
  if(data.sources.some(s=>!['own','shared','utility'].includes(s.sourceGroup||'own')))throw new Error('CMS unknown source group');
  if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('CMS duplicate source id');
  let sources=0,excerpts=0;
  for(const [group,folder] of [['own',directory],['shared',sharedDirectory],['utility',utilityDirectory]]){
    const result=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},folder);
    sources+=result.sources;excerpts+=result.excerpts;
  }
  return {sources,excerpts,errors:0};
}
function prepare(directory,sharedDirectory,utilityDirectory){
  const inspectedAt=new Date().toISOString();
  const own=extractSources(directory,inspectedAt,select(directory));
  const shared=extractSources(sharedDirectory,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}));
  const utility=extractSources(utilityDirectory,inspectedAt,utilitySelections).map(s=>({...s,sourceGroup:'utility'}));
  const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:16,businessRequests:0,browserOperations:0,applicationAcceptanceExecuted:false,
    limitations:['仅16次公开静态GET后离线分析；未执行下载代码或调用业务API','没有受控浏览器能力，没有本次新截图或Network','复用公共请求配置与列表工具保留原获取时间','历史图像为2026-10-22，与本次静态资源不保证同一构建','前端源码不能证明后端授权、事务、发布结果、文件处理或容量'],sources:[...own,...shared,...utility]};
  verifyAll(data,directory,sharedDirectory,utilityDirectory);
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
  const live=path.resolve(output,'../live-recheck-20261022');
  const ids=fs.readdirSync(live).filter(f=>/^H-CMS-\d{3}(?:-op\d+(?:-options\d+)?)?\.json$/.test(f)).map(f=>f.slice(0,-5));
  ids.push('Z-CMS-005','Z-CMS-006');
  const legacy=fs.readdirSync(path.resolve(output,'..')).filter(f=>/^F\d+-CMS.*\.json$/.test(f)).map(f=>f.slice(0,-5));
  const rows=[...ids.map(id=>[id,live,'../live-recheck-20261022/']),...legacy.map(id=>[id,path.resolve(output,'..'),'../'])].map(([id,folder,link])=>{
    const d=JSON.parse(fs.readFileSync(path.join(folder,id+'.json'),'utf8'));
    const note=id==='H-CMS-002-op2'?'只读框架为空；不能当作完整详情数据':id.startsWith('Z-')?'历史导航登记为失败，但PNG/元素含对应目标内容；仅作布局补证，不据此改写导航成功':id==='F152-CMS-mine-detail'?'有规则和基础资料的历史详情；当前视口底部仍需滚动':id.includes('guard')?'请求拦截保护样本，不当作服务器拒绝响应':'历史视口样本，不证明保存、发布、下载或删除结果';
    return `| [${id}截图](${link}${id}.png) / [元素](${link}${id}.json) | ${d.time} | ${d.url} | ${note} |`;
  });
  fs.writeFileSync(path.join(output,'README.md'),[
    '# 构件管理专项证据索引','',`静态片段复核UTC：${inspectedAt}；本次公开静态GET 16次，业务API 0次、浏览器操作0次。没有本次新截图或Network；应用验收均未执行。`,'',
    '[主规格](../../05-构件管理/需求说明.md) · [子页面细化](../../05-构件管理/子页面与操作细化.md) · [核查记录](../../05-构件管理/核查记录.md) · [原文及摘要](./index.json) · [离线提取工具](../../../../scripts/prepare-cms-evidence.js)','',
    '分发限制：仅限获授权项目成员。历史PNG/JSON含业务规则、用户名与样本资料，不作为公开演示材料。发布的必要片段仅保留相对资源/接口路径及控件/头名称，不包含凭据值；原包和下载回执留本机临时调查目录。','',
    '| 证据编号 | 相对资源路径 | 原获取UTC | 片段数 |','|---|---|---|---|',
    ...data.sources.map(s=>`| ${s.id} | ${s.resourcePath} | ${s.fetchedAt} | ${s.excerpts.length} |`),'',
    'index.json记录原包字节数、SHA-256、原获取时间及片段UTF-16 code unit左闭右开偏移、SHA-256和原文。sourceGroup=shared/utility的文件复用既有原件和回执，没有冒写成本次重新下载。所有提取均读取文本，不加载或执行应用代码。','',
    '| 历史截图/元素 | 原采样UTC | 相对路由 | 用途与限制 |','|---|---|---|---|',...rows,'',
    '本次复看H-CMS-001、H-CMS-002-op1/op2、H-CMS-003-op1、H-CMS-004-op1、Z-CMS-005/006、F147、F152的页面布局。H/Z样本为1500×1000，F系列以原PNG视口为准；文档对话框/未发布编辑/值域/函数/算法包/下载选择和失败状态尚无本次新实拍，按真实组件定义描述并列入补图范围。','',
    '公开资源中存在有副作用的GET方法；本次只GET静态文件，未请求这些业务路径。源码中Base64是规则内容编码，不证明加密、安全执行或规则正确。','',
  ].join('\n'));
  return {sources:data.sources.length,excerpts:data.sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:16,businessRequests:0};
}
if(require.main===module){
  const value=flag=>{const i=process.argv.indexOf(flag);if(i<0||!process.argv[i+1])throw new Error(flag+' required');return path.resolve(process.argv[i+1]);};
  const own=value('--source-dir'),shared=value('--shared-source-dir'),utility=value('--utility-source-dir');
  console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared,utility):prepare(own,shared,utility)));
}
module.exports={views,select,prepare,verifyAll};
