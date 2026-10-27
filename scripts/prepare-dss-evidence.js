/* Read static text only; never execute application code or call a business API. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verifyAll}=require('./prepare-dms-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/dss-review-20261027');
const definitions=[
  ['DOC-API','api-standard-document-doc.',[['(window.webpackJsonp_dss',4200]]],
  ['TERM-API','api-standard-document-term.',[['(window.webpackJsonp_dss',2200]]],
  ['TABLE-API','api-standard-system-dataSet.',[['(window.webpackJsonp_dss',3600]]],
  ['FIELD-API','api-standard-system-indexItem.',[['(window.webpackJsonp_dss',4200]]],
  ['CODE-API','api-standard-system-indexCode.',[['(window.webpackJsonp_dss',3400]]],
  ['AUDIT-API','api-standard-audit-common.',[['(window.webpackJsonp_dss',3200]]],
  ['FILE-API','api-common.',[['(window.webpackJsonp_dss',2000]]],
  ['ENUM','assets-js-dropMap.',[['var a={A:',1500]]],
  ['DOC-LIST','views-standard-document-docList.',[['data:function(){return{audaqueIsRequestFirstMixin',16000]]],
  ['DOC-FORM','views-standard-document-docEdit.',[['activeName:"first",audaqueFormInfoMixin:',17000]]],
  ['TERM-LIST','views-standard-document-termList.',[['audaqueFormEditFormUrlMixin:',6500]]],
  ['TERM-FORM','views-standard-document-termEdit.',[['audaqueFormInfoMixin:{docId:',6500]]],
  ['TABLE-LIST','views-standard-system-dataSetList.',[['isExport:!1,audaqueFormEditFormUrlMixin:',13500]]],
  ['TABLE-FORM','views-standard-system-dataSetEdit.',[['audaqueFormInfoMixin:{datasetId:',7000]]],
  ['DATASET','views-standard-system-components-DataSetLeft.',[['datasetList:[],curNode:',10500]]],
  ['TREE','components-standard-TreeComponents.',[['data:function',10000]]],
  ['FIELD-LIST','views-standard-system-indexItemList.',[['isExport:!1,audaqueFormEditFormUrlMixin:',22000]]],
  ['FIELD-FORM','views-standard-system-indexItemEdit.',[['audaqueFormInfoMixin:{collectId:',29000]]],
  ['CODE-LIST','views-standard-system-indexCodeList.',[['isExport:!1,audaqueFormEditFormUrlMixin:',18500]]],
  ['CODE-FORM','views-standard-system-indexCodeEdit.',[['audaqueFormInfoMixin:{categoryId:',15000]]],
  ['DOC-SELECT','views-standard-document-docList~views-standard-document-termEdit~',[['audaqueIsRequestFirstMixin:!0,audaqueSearchMixin:',6000]]],
  ['LINK-SELECT','views-standard-system-components-IndexItemEditSelectLink.',[['audaqueSearchMixin:{dssStatus:2,codeNoOrName:',6000]]],
  ['APPROVE','views-standard-audit-components-DialogApprove.',[['formData:{approveStatus:',3800]]],
  ['AUDIT-ITEM','views-standard-audit-components-AuditItem.',[['optType:this.$route.query.optType',6000]]],
  ['AUDIT-DOC','views-standard-audit-docAuditDetail.',[['data:function',4300]]],
  ['AUDIT-TABLE','views-standard-audit-dataSetAuditDetail.',[['data:function',4200]]],
  ['AUDIT-FIELD','views-standard-audit-indexItemAuditDetail.',[['data:function',8500]]],
  ['AUDIT-CODE','views-standard-audit-indexCodeAuditDetail.',[['data:function',6000]]],
  ['SEARCH','views-standard-search-searchList.',[['form:{searchObj:',4700]]],
  ['ASS-FIELD','views-standard-document-assFields.',[['audaqueIsRequestFirstMixin:!1,audaqueFixedSearchMixin:',6000]]],
  ['ASS-TERM','views-standard-document-assTerm.',[['audaqueFormEditFormUrlMixin:',6100]]],
  ['ASS-CODE','views-standard-document-assCode.',[['audaqueFormEditFormUrlMixin:',6000]]],
  ['APP','app.',[['bcab:function',950],['audaquePageRequestMixin:{',3700],['audaqueSubmitMixin:function',1450],['standardDocumentDetails:{',1800,true],['indexItemEdit:{',3500,true],['indexCodeEdit:{',2100,true],['dataSetEdit:{',1100,true]]],
];
// Each audit list has its own fixed type; preserve both tabs rather than infer one from another.
for(const [id,name]of [['DOC','Doc'],['TABLE','DataSet'],['FIELD','indexItem'],['CODE','indexCode']])for(const tab of [1,2])definitions.push(['AUDIT-'+id+'-'+tab,'views-standard-audit-components-'+name+'List'+tab+'.',[['audaqueFormEditFormUrlMixin:',tab===1?6200:8500]]]);
const shared=[
  ['DSS-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
  ['DSS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
  ['DSS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21],["entry: baseUrl + '/dss/index.html'",35]]],
];
function select(directory){const names=fs.readdirSync(directory);return definitions.map(([id,prefix,anchors])=>{const found=names.filter(n=>n.startsWith(prefix)&&n.endsWith('.js'));if(found.length!==1)throw Error('DSS ambiguous resource '+prefix);return ['DSS-SRC-'+id,found[0],anchors];});}
function prepare(directory,sharedDirectory){
  const inspectedAt=new Date().toISOString(),sources=[...extractSources(directory,inspectedAt,select(directory)),...extractSources(sharedDirectory,inspectedAt,shared).map(s=>({...s,sourceGroup:'shared'}))];
  const receipts=JSON.parse(fs.readFileSync(path.join(directory,'receipt.json'),'utf8'));
  if(receipts.length!==88||receipts.some(r=>r.status!==200)||new Set(receipts.map(r=>r.path)).size!==88)throw Error('DSS static receipt mismatch');
  const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:88,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,
    limitations:['本次业务路由跳/module-login/login，未登录、未进入业务页或取得业务Network','公开静态GET后离线阅读，不执行下载代码；浏览器自动初始化请求未抓包','历史截图采样2026-10-22，静态资源采样2026-10-27，不能假定同构建','服务端DTO、权限、审批事务、版本、文件及性能尚无应用实测'],sources};
  verifyAll(data,directory,sharedDirectory);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
  const catalog=require('./dss-requirement-catalog.json');const refs=[...new Set([...catalog.main,...catalog.sub].flatMap(e=>e.sources))].sort();
  const historical=refs.filter(r=>r.endsWith('.json')).map(r=>{const doc=JSON.parse(fs.readFileSync(path.resolve(output,'..',r),'utf8'));return `| [${path.basename(r,'.json')}图](../${r.replace(/\.json$/,'.png')}) / [元素](../${r}) | ${doc.time||''} | ${doc.url||''} |`;});
  fs.writeFileSync(path.join(output,'README.md'),['# 数据标准管理专项证据','',`复核日期：2026-10-27；必要原文提取UTC：${inspectedAt}。完整静态包、采集脚本和GET回执仅保留本机临时目录。`,'',
    '[主规格](../../11-数据标准管理/需求说明.md) · [子页面细则](../../11-数据标准管理/子页面与操作细化.md) · [核查记录](../../11-数据标准管理/核查记录.md) · [机器索引](./index.json)','',
    '本次浏览器可控制，新建后台标签访问/dss/standard/document/docList后跳/module-login/login。未填写凭据，未点击保存、上传、删除、审批或执行。新业务截图0张；不能把离线采集器业务请求0次当成浏览器没有自动请求。公开静态资源88次GET均200；shared组保留2026-10-26原获取时间。','',
    '偏移为UTF-16 code unit左闭右开；整资源与各必要片段分别有SHA-256。只读文本，不执行下载的JavaScript。静态调用契约不是Network或服务端合同。','',
    '| 证据ID | 相对资源路径 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>`| ${s.id} | ${s.resourcePath} | ${s.fetchedAt} | ${s.excerpts.length} |`),'',
    '## 历史图与DOM','', '历史V/O系列1500×1000；旧E/F图以原PNG尺寸为准，原UTC与相对路由如下。图像仅复看，未改写历史样本或采样时间。字段编辑首屏未覆盖下部技术/管理属性；图内记录名、时间与数量不是默认值或容量上限。','',
    '| 截图与元素 | 原采样UTC | 相对路由 |','|---|---|---|',...historical,'',
    '标准文档关联四页签、选择弹窗、导入、版本对比和审批详情只有静态定义或历史入口；本次未打开。原资料含业务样本，限获授权项目成员阅读。所有应用验收均未执行。',''].join('\n'));
  return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),publicStaticGets:88};
}
if(require.main===module){const flag=n=>{const i=process.argv.indexOf(n);if(i<0||!process.argv[i+1])throw Error(n+' required');return path.resolve(process.argv[i+1]);};const own=flag('--source-dir'),sharedDir=flag('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,sharedDir):prepare(own,sharedDir)));}
module.exports={select,prepare,verifyAll};
