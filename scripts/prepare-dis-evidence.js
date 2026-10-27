/* Offline, literal text extraction only. No browser, HTTP or bundle evaluation. */
const fs=require('node:fs');
const path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const {objectSelection}=require('./prepare-ds-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/dis-review-20261027');
const GROUPS={
  'TABLE-FORM':'views-taskManagement-dataAcquisition-edit.',
  'TABLE-LIST':'views-taskManagement-dataAcquisition-list.',
  'TABLE-INPUT':'views-taskManagement-dataAcquisition-components-inputConfig-libraryTable~',
  'TABLE-OUTPUT':'views-taskManagement-dataAcquisition-components-outputConfig-libraryTable.',
  'CSV-OUTPUT':'views-taskManagement-dataAcquisition-components-outputConfig-csv.',
  'DB-FORM':'views-taskManagement-libraryMigration-edit.',
  'DB-INPUT':'views-taskManagement-libraryMigration-components-inputConfig-file.',
  'DB-OUTPUT':'views-taskManagement-libraryMigration-components-outputConfig-file.',
  'DB-LIST':'views-taskManagement-libraryMigration-list.',
  'API-FORM':'views-taskManagement-apiAndFileCollection-components-apiCollection-edit.',
  'API-INPUT':'views-taskManagement-apiAndFileCollection-components-apiCollection-components-inputConfig-api~',
  'API-OUTPUT':'views-taskManagement-apiAndFileCollection-components-apiCollection-components-outputConfig-libraryTable.',
  'API-MQ':'views-taskManagement-apiAndFileCollection-components-apiCollection-components-outputConfig-outMQ~',
  'API-LIST':'views-taskManagement-apiAndFileCollection-components-apiCollection-list~views-taskManagement-apiAndF~8',
  'PARSE-FORM':'views-taskManagement-apiAndFileCollection-components-fileCollection-edit.',
  'PARSE-CSV':'views-taskManagement-apiAndFileCollection-components-fileCollection-components-inputConfig-csv~',
  'PARSE-EXCEL':'views-taskManagement-apiAndFileCollection-components-fileCollection-components-inputConfig-excel~',
  'PARSE-OUTPUT':'views-taskManagement-apiAndFileCollection-components-fileCollection-components-outputConfig-libraryT~c',
  'PARSE-LIST':'views-taskManagement-apiAndFileCollection-components-fileCollection-list.',
  'FILE-FORM':'views-taskManagement-fileAcquisition-edit.',
  'FILE-INPUT':'views-taskManagement-fileAcquisition-components-inputConfig-file.',
  'FILE-OUTPUT':'views-taskManagement-fileAcquisition-components-outputConfig-file.',
  'FILE-LIST':'views-taskManagement-fileAcquisition-list.',
  'REAL-FORM':'views-taskManagement-realTimeAcquisition-edit.',
  'REAL-INPUT':'views-taskManagement-realTimeAcquisition-components-inputConfig-inputLibraryTable~',
  'REAL-OUTPUT':'views-taskManagement-realTimeAcquisition-components-outputConfig-outputFile.',
  'REAL-LIST':'views-taskManagement-realTimeAcquisition-list.',
  'MQ-FORM':'views-taskManagement-kafkaAcquisition-edit.',
  'MQ-INPUT':'views-taskManagement-kafkaAcquisition-components-inputConfig-inputMQ.',
  'MQ-DB':'views-taskManagement-kafkaAcquisition-components-inputConfig-inputLibraryTable~',
  'MQ-OUTPUT':'views-taskManagement-kafkaAcquisition-components-outputConfig-outMQ~',
  'MQ-DB-OUTPUT':'views-taskManagement-kafkaAcquisition-components-outputConfig-outputFile.',
  'MQ-LIST':'views-taskManagement-kafkaAcquisition-list.',
  'HOME':'views-home-home.',
  'MONITOR':'views-taskMonitoring-taskMonitoring-list.',
  'ALARM':'views-taskMonitoring-abnormal-list.',
  'CHECK':'views-taskMonitoring-dataReconciliation-list.',
  'CHECK-DETAIL':'views-taskMonitoring-dataReconciliation-edit.',
  'SUPPLY':'views-taskMonitoring-repairdata-list.',
  'SUPPLY-DETAIL':'views-taskMonitoring-repairdata-edit.',
  'TASK-ANALYSIS':'views-integratedAnalysis-taskAnalysis.',
  'DATA-ANALYSIS':'views-integratedAnalysis-dataAnalysis.',
  'TABS':'views-taskManagement-apiAndFileCollection-public.',
};
const FUNCTIONS=['getParams','getParameter','getKafkaParams','getMQParams','curValidate','verify','submit','setSourceId','setTrgDataSource','changeDmlFilterType','time','configureSubmit','replenishSubmit','processSubmit','goDetails','getTaskStatus','getStatus','handRun','stop','getValue','changeTime','resetTask','showLogDialog','initTotalTasks','initTaskTrend','initInDataAnalysis','initWriteDataAnalysis','initDataAnalysis'];
function select(directory){
  const files=fs.readdirSync(directory),defs=[];
  for(const [id,prefix]of Object.entries(GROUPS)){
    const file=files.find(f=>f.startsWith(prefix));if(!file)throw new Error('DIS source missing: '+prefix);
    const raw=fs.readFileSync(path.join(directory,file),'utf8'),anchors=[];
    for(const anchor of ['audaqueFormInfoMixin:{','audaqueFormRulesMixin:{','audaqueFormRulesMixin:function','audaqueSearchMixin:{','data:function']){
      if(raw.includes(anchor))anchors.push(objectSelection(raw,anchor,anchor==='data:function'));
    }
    for(const name of FUNCTIONS){const anchor=name+':function';if(raw.includes(anchor))anchors.push(objectSelection(raw,anchor));}
    for(const prop of [...new Set([...raw.matchAll(/prop:"([^"\n]+)"/g)].map(m=>m[0]))]){
      const start=raw.indexOf(prop);anchors.push([prop,Math.min(440,raw.length-start)]);
    }
    if(!anchors.length)throw new Error('DIS no selected evidence: '+id);
    defs.push(['DIS-SRC-'+id,file,anchors]);
  }
  for(const file of files.filter(f=>f.startsWith('api-')&&f.endsWith('.js'))){
    const raw=fs.readFileSync(path.join(directory,file),'utf8');
    defs.push(['DIS-SRC-'+file.split('.')[0].slice(4).toUpperCase(),file,[[raw.slice(0,60),raw.length]]]);
  }
  const file=files.find(f=>/^app\..*\.js$/.test(f)),raw=fs.readFileSync(path.join(directory,file),'utf8');
  defs.push(['DIS-SRC-APP',file,[['bcab:function',925],...['/taskManagement/dataAcquisition/edit','/taskManagement/kafkaAcquisition/edit','/taskMonitoring/taskMonitoring/list','/home'].map(route=>{
    const anchor='path:"'+route+'"',start=raw.indexOf(anchor),end=raw.indexOf('component:',start);if(start<0||end<0)throw new Error('DIS route missing');return [anchor,end-start];
  }),...['home','taskManagement','taskMonitoring','integratedAnalysis'].map(group=>objectSelection(raw,group+':{',true))]]);
  return defs;
}
function collect(directory){
  const receipts=JSON.parse(fs.readFileSync(path.join(directory,'receipt.json'),'utf8'));
  for(const r of receipts)if(!Number.isFinite(Date.parse(r.fetchedAt)))throw new Error('DIS invalid receipt time');
  const inspectedAt=new Date().toISOString(),sources=extractSources(directory,inspectedAt,select(directory));
  return {schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:receipts.length,businessRequests:0,applicationWrites:0,applicationAcceptanceExecuted:false,
    browserObservation:{route:'/dis/home',result:'redirected-to-login',finalRoute:'/module-login/login',newScreenshots:0},
    limitations:['2026-10-27新浏览器会话转登录，未取得已认证目标页','仅公开静态文本GET后离线取证，未执行下载代码','历史截图2026-10-22，不保证与本次静态构建一致','公共请求链复用独立登记的2026-10-26证据，不冒称本次抓包'],sources};
}
function prepare(directory){
  const data=collect(directory),sources=data.sources;
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
  fs.writeFileSync(path.join(output,'README.md'),['# 数据集成采集专项证据','',
    '复核日期2026-10-27。新浏览器会话从`/dis/home`重定向`/module-login/login`，没有登录后现场操作或新截图。公开静态资源GET共81次（index、app、API及本模块Vue分块）；原件与获取回执仅留本机临时目录。提取器只读本地文本，不发网络请求、不执行下载代码。','',
    '[原文片段及原件摘要](./index.json) · [核查记录](../../08-数据集成采集/核查记录.md) · [主规格](../../08-数据集成采集/需求说明.md) · [提取工具](../../../../scripts/prepare-dis-evidence.js)','',
    '公共父客户端、运行配置、通用校验及分页：[数据源专项原文](../ds-review-20261026/index.json)、[工作台公共请求原文](../workbench-review-20261026/index.json)。这些是2026-10-26采样；本次重新阅读，不更改原时间。调用路径按默认/back前缀，实际部署覆盖及后端响应需隔离联调。','',
    '历史截图和DOM来自[2026-10-22索引](../live-recheck-20261022/README.md)。各功能逐项链接原图/原JSON，包含原time、相对route和视口；不是本次重新截图。受控业务写入、权限、安全、性能和恢复验收全部未执行。','',
    '| 证据ID | 相对资源路径 | 获取UTC时间 | 片段数 |','|---|---|---|---|',...sources.map(s=>'| '+[s.id,s.resourcePath,s.fetchedAt,s.excerpts.length].join(' | ')+' |'),'','偏移按UTF-16 code units左闭右开；原资源和每段原文分别记录SHA-256。索引仅含必要静态片段，不含部署origin、业务凭据或新增业务数据。',''].join('\n'));
  return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),businessRequests:0};
}
function verifyEvidence(index,directory){
  const expected=collect(directory);
  if(index.sources.length!==expected.sources.length)throw new Error('DIS source registry mismatch');
  const ids=new Set();
  for(let i=0;i<expected.sources.length;i++){
    const actual=index.sources[i],source=expected.sources[i];
    if(ids.has(actual.id))throw new Error('DIS duplicate source ID');ids.add(actual.id);
    for(const key of ['id','localName','resourcePath','fetchedAt','bytes','sha256'])if(actual[key]!==source[key])throw new Error('DIS source registry mismatch: '+key);
    if(JSON.stringify(actual.excerpts)!==JSON.stringify(source.excerpts))throw new Error('DIS excerpt registry mismatch');
  }
  return verify(index,directory);
}
if(require.main===module){const i=process.argv.indexOf('--source-dir');if(i<0||!process.argv[i+1])throw new Error('--source-dir required');const dir=path.resolve(process.argv[i+1]);console.log(JSON.stringify(process.argv.includes('--verify')?verifyEvidence(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),dir):prepare(dir)));}
module.exports={GROUPS,FUNCTIONS,select,collect,prepare,verifyEvidence};
