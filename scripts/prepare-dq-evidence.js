/* Offline extraction only. Downloaded JavaScript is never evaluated. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/dq-review-20261027');
const selections=[
 ['DQ-SRC-API','api-modules-dataQuery.5a7b06a0.js',[['var u=r("bcab")',2150]]],
 ['DQ-SRC-ENUM','assets-data-dataQuery.52002087.js',[['var a=[',415]]],
 ['DQ-SRC-MINE','views-dataQuery-myQuery.d3a59cda.js',[['data:function(){return{audaqueSearchMixin:',6600],['attrs:{title:"我的查询"}',11800]]],
 ['DQ-SRC-SQL','views-dataQuery-sqlQuery.1b794e82.js',[['data:function(){return{queryStatusColor:',9200],['staticClass:"sql-query"',9300]]],
 ['DQ-SRC-LOG','views-dataQuery-logList.bb81e4bf.js',[['created:function(){this.filterMethod()}',6100]]],
 ['DQ-SRC-EDITOR','components-SqlEditor.c8ce4bce.js',[['props:{code:{type:String',4000]]],
 ['DQ-SRC-LIST','vue-utils.38de3ea7.js',[['audaquePageRequestMixin:{',4000],['audaqueDeleteBatchMixin(t)',1400]]],
 ['DQ-SRC-APP','app.f4b6fd93.js',[['bcab:function',900]]],
];
const shared=[
 ['DQ-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
 ['DQ-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
 ['DQ-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
function verifyAll(data,own,common){
 if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw new Error('duplicate source id');
 if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw new Error('invalid source group');
 let sources=0,excerpts=0;
 for(const [group,dir]of [['own',own],['shared',common]]){const r=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===group)},dir);sources+=r.sources;excerpts+=r.excerpts;}
 return {sources,excerpts,errors:0};
}
function prepare(own,common){
 const inspectedAt=new Date().toISOString();
 const sources=[...extractSources(own,inspectedAt,selections),...extractSources(common,inspectedAt,shared).map(s=>({...s,sourceGroup:'shared'}))];
 const receipts=JSON.parse(fs.readFileSync(path.join(own,'receipt.json'),'utf8'));
 const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:receipts.length+1,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,
 limitations:['浏览器新建后台页打开我的查询后跳登录页；未输入或提交认证','浏览器自动初始化请求未抓Network，不能声明整次会话零业务请求','历史截图与当日静态包可能不同版本；本轮新保存业务截图0张','公开静态GET后离线读文本；不主动调用业务API，不执行下载代码','后端DTO、语句限制、数据权限、执行/导出配额及持久化未经验证'],sources};
 verifyAll(data,own,common);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
 const histories=['O-DQ-001','O-DQ-002','O-DQ-003'].map(id=>{const d=JSON.parse(fs.readFileSync(path.join(output,'../live-recheck-20261022',id+'.json'),'utf8'));return '| ['+id+'图](../live-recheck-20261022/'+id+'.png) / [元素](../live-recheck-20261022/'+id+'.json) | '+d.time+' | '+d.url+' |';});
 fs.writeFileSync(path.join(output,'README.md'),['# 数据查询系统核查证据','','复核日期2026-10-27；仅公开静态资源GET及历史材料复看，不执行下载代码。[核查记录](../../13-数据查询系统/核查记录.md) · [原文索引](./index.json) · [离线提取器](../../../../scripts/prepare-dq-evidence.js)','','采集器静态GET '+data.publicStaticGets+'次，均200；不主动调用业务API。浏览器可控制但业务路由跳/module-login/login；未登录、未提交SQL、保存、标签、删除、清除或导出；没有Network和新保存业务截图。浏览器自动请求未计入静态GET数。','','原包与GET回执保留本机临时目录；片段偏移按UTF-16 code unit左闭右开，原件和片段分别SHA-256。shared材料保留2026-10-26原获取时间，不改为当日新抓取。','','| 证据ID | 相对资源 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>'| '+s.id+' | '+s.resourcePath+' | '+s.fetchedAt+' | '+s.excerpts.length+' |'),'','| 历史图及元素 | 采样UTC | 相对路由 |','|---|---|---|',...histories,'','三张历史图均1500×1000。我的查询有总数123而行体空白，不能当正常空结果；SQL页来源/表/历史为空且无执行结果；日志页有可见行及内部滚动条。来源候选、表菜单、标签/重执行/结果/显示列弹窗、全屏及失败状态没有正常目标截图，布局仅由静态模板补充。历史样本不构成容量、固定人员/IP或权限规则。','','[主规格](../../13-数据查询系统/需求说明.md) · [子规格](../../13-数据查询系统/子页面与操作细化.md)。所有功能/非功能应用验收未执行；材料仅限项目获授权人员。',''].join('\n'));
 return verifyAll(data,own,common);
}
if(require.main===module){const arg=n=>{const i=process.argv.indexOf(n);if(i<0||!process.argv[i+1])throw new Error(n+' required');return path.resolve(process.argv[i+1]);};const own=arg('--source-dir'),common=arg('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,common):prepare(own,common)));}
module.exports={prepare,verifyAll};
