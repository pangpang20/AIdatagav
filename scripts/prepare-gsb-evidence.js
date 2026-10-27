/* Offline source extraction; never execute downloaded bundles or invoke business endpoints. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verifyAll}=require('./prepare-dms-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/gsb-review-20261027');
const definitions=[
 ['CATALOG-API','api-catalog.',[['(window.webpackJsonp_gsb',1800]]],
 ['MANAGE-API','api-manage.',[['(window.webpackJsonp_gsb',8500]]],
 ['APPROVAL-API','api-approval.',[['(window.webpackJsonp_gsb',2200]]],
 ['CONTROL-API','api-control.',[['(window.webpackJsonp_gsb',2400]]],
 ['CONFIG-API','api-config.',[['(window.webpackJsonp_gsb',2600]]],
 ['CATALOG','views-catalog-list.',[['data:function',13000]]],
 ['MANAGE','views-manage-list.',[['data:function',12500]]],
 ['TABLE','views-manage-table.',[['fileViewStatus:',21000],['checkNullRow:function',4500],['dyParams:',1800]]],
 ['API','views-manage-api.',[['inParamsData:[]',18500],['checkNullRow:function',2300]]],
 ['SALE','views-manage-sale.',[['data:function',10000]]],
 ['SALE-DETAIL','views-manage-saleApi.',[['data:function',4800]]],
 ['CONSUMPTION','views-manage-consumption.',[['data:function',22000]]],
 ['APPROVAL','views-approval-list.',[['data:function',11000]]],
 ['IP','views-control-ip.',[['data:function',9000]]],
 ['IP-DETAIL','views-control-ipDetail.',[['data:function',16000]]],
 ['VISIT','views-control-visit.',[['data:function',10000]]],
 ['CONFIG','views-config-list.',[['dataType:"数据库"',23000]]],
 ['DEPLOY','views-manage-deploy.',[['data:function',4100]]],
 ['LIST','mixins-audaqueListSearchMixin.',[['data:function',3300]]],
 ['DELETE','mixins-audaqueDeleteItemMixin.',[['audaqueDeleteMixin:function',2100]]],
 ['FORM','mixins-audaqueFormMixin.',[['data:function',8500]]],
 ['PROTOCOL','serviceConfig.js',[['window.SERVICE_CONFIG_GLOBAL_VAR',400]]],
 ['APP','app.',[['var r="/common/user"',130],['bcab:function',950],['s=function(){return Object(r.d)().request',400],['metaTypes:function',650],['timeTypeData:function',2600],['commonStructure:function',1670]]],
];
const shared=[['GSB-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],['GSB-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],['GSB-SRC-CONFIG-BASE','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21],["entry: baseUrl + '/gsb/index.html'",35]]]];
function select(directory){const files=fs.readdirSync(directory);return definitions.map(([id,prefix,a])=>{const names=files.filter(n=>n.startsWith(prefix)&&n.endsWith('.js'));if(names.length!==1)throw Error('GSB ambiguous resource '+prefix);return ['GSB-SRC-'+id,names[0],a]});}
function prepare(directory,sharedDirectory){const inspectedAt=new Date().toISOString(),sources=[...extractSources(directory,inspectedAt,select(directory)),...extractSources(sharedDirectory,inspectedAt,shared).map(s=>({...s,sourceGroup:'shared'}))];const receipts=JSON.parse(fs.readFileSync(path.join(directory,'receipt.json'),'utf8'));if(receipts.length!==49||receipts.some(r=>r.status!==200)||new Set(receipts.map(r=>r.path)).size!==49)throw Error('GSB receipt mismatch');const index={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:49,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,limitations:['业务路由跳转/module-login/login，未输入凭据或进入业务页面；未抓业务Network','49次公开静态GET后离线读取；不执行下载代码，浏览器自动初始化请求未抓包','历史截图2026-10-22，静态资源2026-10-27，不能假定同构建','服务端权限、DTO、签名、部署、下游调用、限流事务及性能未实测'],sources};verifyAll(index,directory,sharedDirectory);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(index,null,2)+'\n');fs.writeFileSync(path.join(output,'README.md'),['# 数据服务支撑专项证据','', '2026-10-27：业务路由跳登录页，未登录、未进入业务页，新增业务截图0张。49次公开静态资源GET后仅离线阅读。提取器业务请求0次；浏览器自动初始化请求未抓包，不能推断整次会话所有请求为0。应用验收全部未执行。','', '[必要原文与SHA-256](./index.json) · [核查记录](../../16-数据服务支撑/核查记录.md) · [离线工具](../../../../scripts/prepare-gsb-evidence.js)','', '每个资源保留相对路径、获取UTC、完整字节数/摘要；片段保存UTF-16左闭右开偏移与独立摘要。共享配置取自2026-10-26采样，实际时间见索引。全包和获取回执留本机临时目录，下载代码未执行。','', '| 编号 | 相对资源 | 片段数 |','|---|---|---|',...sources.map(s=>'| '+[s.id,s.resourcePath,s.excerpts.length].join(' | ')+' |'),'','历史截图为2026-10-22采样的1500×1000视口：J-GSB-001目录、002注册、002-op1库表、002-op2接口、003消费、004审批、005IP、006访问监控、006-op1修改、007数源；相关options0为选项展开。截图支持可见布局，不能证明不可见下半屏和服务端行为；目录图total=9但可视表体空白，不能判定合法空结果。原证据保持不变，逐功能链接见正文。',''].join('\n'));return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0)};}
if(require.main===module){const [mode,own,sharedDir]=process.argv.slice(2);if(mode==='--verify')console.log(JSON.stringify(verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,sharedDir)));else console.log(JSON.stringify(prepare(mode,own)));}
module.exports={definitions,select,prepare,verifyAll};
