/* Read public static text only. This tool never executes bundles or calls business APIs. */
const fs=require('node:fs');
const path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/ds-review-20261026');
const VIEWS=[
  ['DRIVER-LIST','views-dataSource-driveList.5790f2a8.js','data:function'],
  ['DRIVER-DESIGN','views-dataSource-driveDesign.269e8f8a.js','data:function'],
  ['ADMIN-LIST','views-dataSource-dataSourceManageList.c3bcc6ef.js','data:function'],
  ['DEPT-LIST','views-dataSource-myDataSourceManageList.108f5b39.js','data:function'],
  ['USE-LIST','views-dataSource-iCanUsedDataSourceList.e8dee3d2.js','data:function'],
  ['SOURCE-FORM','views-dataSource-dataSourceEdit.2d75f00a.js','var D={adminDataSourceDetail:'],
  ['API-LIST','views-api-list.0fb899f5.js','data:function'],
  ['API-FORM','views-api-edit.6663a800.js','f=[{label:"string"'],
  ['KAFKA-LIST','views-kafka-list.5d84503d.js','data:function'],
  ['KAFKA-FORM','views-kafka-edit.b2bef026.js','data:function'],
];
function throughExport(directory,file,anchor){
  const raw=fs.readFileSync(path.join(directory,file),'utf8'),start=raw.indexOf(anchor);
  if(start<0)throw new Error('DS source anchor missing: '+file);
  const m=/[a-z]\.default=[a-zA-Z_]+\.exports\}/.exec(raw.slice(start));
  if(!m)throw new Error('DS source boundary missing: '+file);
  return [anchor,m.index+m[0].length];
}
// Match a literal object without evaluating it; quoted interpolation text can contain braces.
function objectSelection(raw,anchor,last=false){
  const start=last?raw.lastIndexOf(anchor):raw.indexOf(anchor);
  if(start<0)throw new Error('DS object anchor missing: '+anchor);
  let depth=0,quote='',escaped=false;
  for(let i=start+anchor.indexOf('{');i<raw.length;i++){
    const c=raw[i];
    if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    if(c==='}'&&--depth===0)return [anchor,i+1-start,last];
  }
  throw new Error('DS incomplete object: '+anchor);
}
function select(directory){
  const defs=VIEWS.map(([id,file,anchor])=>['DS-SRC-'+id,file,[throughExport(directory,file,anchor)]]);
  for(const [id,file]of [['API','api-api.b1f6ef1e.js'],['KAFKA','api-kafka.8092c97d.js'],['MANAGE','api-dataSource-manage.7253cd0a.js'],['DRIVER','api-dataSource-drive.16a1661e.js']]){
    const raw=fs.readFileSync(path.join(directory,file),'utf8');defs.push(['DS-SRC-'+id+'-API',file,[[raw.slice(0,60),raw.length]]]);
  }
  const common='api-common~views-dataSource-dataSourceEdit~views-dataSource-driveDesign.1dd11b0c.js';
  const text=fs.readFileSync(path.join(directory,common),'utf8');
  defs.push(['DS-SRC-COMMON-API',common,[['b26e:function',text.length-text.indexOf('b26e:function')]]]);
  const utils='utils-dataSource.fed6adbd.js',u=fs.readFileSync(path.join(directory,utils),'utf8');
  defs.push(['DS-SRC-DYNAMIC',utils,[['"179a":function',u.indexOf(',"2ca0":function')-u.indexOf('"179a":function')]]]);
  for(const [id,file,anchor]of [['ITEM','components-DraggableItem.30277b56.js','colFormItem:function'],['KEYVALUE','components-KeyValueList.538313a9.js','mounted:function']])defs.push(['DS-SRC-'+id,file,[throughExport(directory,file,anchor)]]);
  const apiForm='views-api-edit.6663a800.js',api=fs.readFileSync(path.join(directory,apiForm),'utf8');
  const cryptoStart=api.indexOf('encryptPublicKey('),cryptoEnd=api.indexOf(',signatureSha256withRSA',cryptoStart);
  defs.push(['DS-SRC-API-CRYPTO',apiForm,[[api.slice(cryptoStart,cryptoStart+20),cryptoEnd-cryptoStart]]]);
  const kafka='views-kafka-edit.b2bef026.js',k=fs.readFileSync(path.join(directory,kafka),'utf8'),start=k.indexOf('f=[{label:"LONG"'),end=k.indexOf(',v={mixins:',start);
  defs.push(['DS-SRC-KAFKA-TYPES',kafka,[[k.slice(start,start+20),end-start]]]);
  const app=fs.readFileSync(path.join(directory,'ds-app.js'),'utf8');
  defs.push(['DS-SRC-GATEWAY','ds-app.js',[['bcab:function',925]]]);
  defs.push(['DS-SRC-ROUTES','ds-app.js',['/dataSource/driveList','/dataSource/driveDesign','/dataSource/dataSourceManageList','/dataSource/myDataSourceManageList','/dataSource/iCanUsedDataSourceList','/dataSource/dataSourceEdit','/api/list','/api/edit','/kafka/list','/kafka/edit'].map(route=>{
    const anchor='path:"'+route+'"',start=app.indexOf(anchor),end=app.indexOf('component:',start);
    if(start<0||end<0)throw new Error('DS route missing: '+route);return [anchor,end-start];
  })]);
  defs.push(['DS-SRC-LANGUAGE','ds-app.js',['viewsApiEditVue','viewsKafkaEditVue','viewsDataSourceDriveDesignVue','viewsDataSourceDataSourceEditVue','viewsDataSourceDriveListVue','utilsDataSourceJs','componentsDraggableItemVue','manuallyAdded'].map(group=>objectSelection(app,group+':{',true))]);
  const util='chunk-audaque-vue-utils.js',ut=fs.readFileSync(path.join(directory,util),'utf8');
  defs.push(['DS-SRC-LIST-MIXINS',util,[['pageSize:20',3590],['audaqueDeleteMixin:function',1700],['audaqueGoBackMixin:function',270]]]);
  defs.push(['DS-SRC-VALIDATORS',util,[['isNotEmpty:function',900],['isURL:function',450],['onBeforeUpload:function',1000]]]);
  defs.push(['DS-SRC-CONTROLS','chunk-audaque-vue-components.js',[
    throughExport(directory,'chunk-audaque-vue-components.js','name:"AudaqueTableSearch"'),
    throughExport(directory,'chunk-audaque-vue-components.js','name:"AudaquePagination"'),
    throughExport(directory,'chunk-audaque-vue-components.js','name:"AudaqueOnceButton"'),
  ]]);
  return defs;
}
const sharedSelections=[
  ['DS-SRC-SHELL-REQUEST','shell-app.7ec981a3.js',[
    ['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405],
  ]],
  ['DS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
  ['DS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21],["entry: baseUrl + '/datasource/index.html'","entry: baseUrl + '/datasource/index.html'".length]]],
];
function verifyAll(data,directory,sharedDirectory){
  if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw new Error('DS unknown source group');
  if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('DS duplicate source id');
  let sources=0,excerpts=0;
  for(const [group,folder]of [['own',directory],['shared',sharedDirectory]]){
    const r=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},folder);sources+=r.sources;excerpts+=r.excerpts;
  }
  return {sources,excerpts,errors:0};
}
function prepare(directory,sharedDirectory){
  const inspectedAt=new Date().toISOString();
  const own=extractSources(directory,inspectedAt,select(directory));
  const shared=extractSources(sharedDirectory,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}));
  const receipts=JSON.parse(fs.readFileSync(path.join(directory,'receipt.json'),'utf8'));
  if(receipts.length!==25||new Set(receipts.map(r=>r.path)).size!==25)throw new Error('DS static receipt count mismatch');
  const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:25,businessRequests:0,browserOperations:0,applicationAcceptanceExecuted:false,
    limitations:['只GET公开静态资源25次；未执行下载代码，未调用业务API','当前无受控浏览器/Network；新增截图0张，原截图保留2026-10-22时间','静态组件可能与历史运行画面版本不同；分别记录，不假造新操作','前端不能证明服务端授权、密文存储、连接副作用、事务、去重或业务结果'],sources:[...own,...shared]};
  verifyAll(data,directory,sharedDirectory);
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
  const ids=['H-DS-001','Z-DS-002','H-DS-002-op1','H-DS-002-op2','H-DS-003','H-DS-003-op1','H-DS-004','H-DS-005','H-DS-005-op1','H-DS-005-op2','H-DS-006','H-DS-006-op1','H-DS-006-op2','F003-driver-add-elements'];
  const rows=ids.map(id=>{const folder=/^[HZ]-/.test(id)?'live-recheck-20261022/':'';const p=path.resolve(output,'..',folder,id+'.json'),d=JSON.parse(fs.readFileSync(p,'utf8'));let note=id==='H-DS-003'?'仅筛选与新增，正文空白；不作为正常列表列头或合法空结果证据':id==='H-DS-002-op2'?'API驱动样本；仅此动态模板，首屏未覆盖全部下部参数':id==='H-DS-001'?'当前样本未显示新增/初始化且操作为短横线；不证明其他身份无此能力':'历史视口样本；不是本次浏览器交互';return `| [${id}截图](../${folder}${id}.png) / [元素](../${folder}${id}.json) | ${d.time||d.capturedAt||d.timestamp||''} | ${(d.url||d.route||'').split('?')[0]} | ${note} |`;});
  fs.writeFileSync(path.join(output,'README.md'),[
    '# 数据源管理专项证据索引','',`静态片段复核UTC：${inspectedAt}。公开静态GET 25次；业务请求0次、浏览器操作0次、新截图0张，应用验收全部未执行。`,'',
    '[业务规格](../../07-数据源管理/需求说明.md) · [子页面与操作](../../07-数据源管理/子页面与操作细化.md) · [核查记录](../../07-数据源管理/核查记录.md) · [必要原文、偏移与摘要](./index.json) · [提取工具](../../../../scripts/prepare-ds-evidence.js)','',
    '分发限制：仅获授权项目成员。原截图及元素包含人员/部门、连接名称及服务端点等业务内容，不用于公开演示。完整静态包及GET回执仅留本机临时调查目录；提交必要控件/请求定义、相对资源路径与摘要，不保存真实凭据。','',
    '| 证据组 | 相对资源路径 | 原获取UTC | 片段数 |','|---|---|---|---|',...data.sources.map(s=>`| ${s.id} | ${s.resourcePath} | ${s.fetchedAt} | ${s.excerpts.length} |`),'',
    'index.json记录原件字节数、SHA-256、原获取时间；片段偏移为UTF-16 code unit左闭右开，每段保存原文与摘要。shared组复用父应用原件与原回执，不改为本次获取时间。--verify只核对本地原件，不发HTTP。','',
    '| 历史截图/元素 | 原采样时间 | 相对路由 | 用途与限制 |','|---|---|---|---|',...rows,'',
    '已复看驱动列表/设计、管理/部门列表、API新增、Kafka新增与数据源编辑首屏；H/Z为1500×1000，F003为1440×1000。JSON包含的下拉候选与历史F系列查询/取消/确认材料继续保留在原索引与各功能链接。没有本次新增完整截图、API各参数页签、Kafka字段模态和全部驱动参数截图；不能用首屏宣称覆盖下部。','',
    'H-DS-003正文空白属于证据缺口，与组件定义并列；并非无记录或无功能。原有F系列打开/取消材料只证明对应当时动作，不能证明创建、删除、连接、远端Topic获取、上传或权限验收。所有历史原件不改写。','',
  ].join('\n'));
  return {sources:data.sources.length,excerpts:data.sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:25,businessRequests:0};
}
if(require.main===module){
  const value=flag=>{const i=process.argv.indexOf(flag);if(i<0||!process.argv[i+1])throw new Error(flag+' required');return path.resolve(process.argv[i+1]);};
  const own=value('--source-dir'),shared=value('--shared-source-dir');
  console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,shared):prepare(own,shared)));
}
module.exports={select,objectSelection,prepare,verifyAll};
