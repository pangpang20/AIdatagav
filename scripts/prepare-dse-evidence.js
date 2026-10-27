/* Public resources are inspected as text; no downloaded code is evaluated. */
const fs=require('node:fs'),path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/dse-review-20261027');
const selections=[
 ['DSE-SRC-API-TASK','api-task.be91c451.js',[['b199:function',2820]]],
 ['DSE-SRC-API-BOARD','api-board.bdd7efe4.js',[['6711:function',500]]],
 ['DSE-SRC-API-LOG','api-log.7983d7c4.js',[['8916:function',330]]],
 ['DSE-SRC-BOARD','views-board.04e08f39.js',[['data:function(){return{taskType:',9000]]],
 ['DSE-SRC-LIST','views-task-list.d6153f18.js',[['data:function(){return{providersData:',7900]]],
 ['DSE-SRC-TABLE','views-task-table.b347bc2c.js',[['data:function(){return{loading:',17000]]],
 ['DSE-SRC-FILE','views-task-file.5ccc3980.js',[['data:function(){return{taskId:',8900]]],
 ['DSE-SRC-API-FORM','views-task-api.14aa7df2.js',[['data:function(){return{loading:',16200]]],
 ['DSE-SRC-LOG','views-log-list.71e2f361.js',[['data:function(){return{audaqueSearchMixin:',6800]]],
 ['DSE-SRC-PREFIX','views-prefix.a7cf05da.js',[['data:function(){return{titles:',2400]]],
 ['DSE-SRC-CRON','components-cron.d21e1175.js',[['props:{value:{type:String},disabled:',3400]]],
 ['DSE-SRC-MAPPING','components-mapping.61c8add6.js',[['s={data:function(){return{lf:',1800]]],
 ['DSE-SRC-APP','app.1d9542ec.js',[['taskStatusText:function',210],['formatSeconds:function',210],['bcab:function',850],['path:"/board/:taskType"',140],['path:"/task/list/:taskType"',530],['path:"/log/list/:taskType"',130]]],
 ['DSE-SRC-COMMON','vue-utils.fb93917e.js',[['audaquePageRequestMixin:{',3800]]],
];
const shared=[
 ['DSE-SRC-REQUEST','shell-app.7ec981a3.js',[['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405]]],
 ['DSE-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
 ['DSE-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
function verifyAll(data,own,common){
 if(new Set(data.sources.map(s=>s.id)).size!==data.sources.length)throw Error('duplicate source id');
 if(data.sources.some(s=>!['own','shared'].includes(s.sourceGroup||'own')))throw Error('invalid source group');
 let sources=0,excerpts=0;
 for(const [g,d]of [['own',own],['shared',common]]){const r=verify({sources:data.sources.filter(s=>(s.sourceGroup||'own')===g)},d);sources+=r.sources;excerpts+=r.excerpts;}
 return{sources,excerpts,errors:0};
}
function prepare(own,common){
 const inspectedAt=new Date().toISOString(),sources=[...extractSources(own,inspectedAt,selections),...extractSources(common,inspectedAt,shared).map(s=>({...s,sourceGroup:'shared'}))];
 const data={schemaVersion:1,evidenceType:'static-source',inspectedAt,publicStaticGets:JSON.parse(fs.readFileSync(path.join(own,'receipt.json'),'utf8')).length+1,businessRequestsByCollector:0,applicationAcceptanceExecuted:false,sources};
 verifyAll(data,own,common);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),['# 数据共享交换核查证据','','2026-10-27只读静态GET '+data.publicStaticGets+'次，均200；未主动调用业务API、未执行下载代码。浏览器可控，/dse/board/1跳/module-login/login，未输入认证；未抓Network，浏览器初始化请求未计数，不能声明整个浏览器会话零业务请求。新业务截图0张。','','[原文索引](./index.json) · [核查记录](../../15-数据共享交换/核查记录.md) · [离线提取器](../../../../scripts/prepare-dse-evidence.js)','','原包及GET回执留本机临时目录。原件字节与片段分别SHA-256，UTF-16偏移左闭右开；shared父请求及配置保留2026-10-26原获取时间，不冒称新取证。','','| 证据ID | 相对资源 | 原获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>'| '+[s.id,s.resourcePath,s.fetchedAt,s.excerpts.length].join(' | ')+' |'),'','| 历史目标 | 原采样UTC | 路由 |','|---|---|---|',...Array.from({length:10},(_,i)=>{const id='J-DSE-'+String(i+1).padStart(3,'0'),d=JSON.parse(fs.readFileSync(path.join(output,'../live-recheck-20261022',id+'.json'),'utf8'));return '| ['+id+'图](../live-recheck-20261022/'+id+'.png) / [元素](../live-recheck-20261022/'+id+'.json) | '+d.time+' | '+d.url+' |';}),'','历史图均1500×1000。看板右端及底部有滚动裁切；任务/日志为空样本，无有行操作或独立详情/编辑图。J-DSE-010虽路由与菜单为前置机，正文仍为接口日志，不作正常前置机布局证明。当前模板只补充控件定义，未证实与历史材料同一构建。','','所有功能/质量应用验收未执行；片段限项目获授权人员使用。',''].join('\n'));
 return verifyAll(data,own,common);
}
if(require.main===module){const arg=n=>{const i=process.argv.indexOf(n);if(i<0||!process.argv[i+1])throw Error(n+' required');return path.resolve(process.argv[i+1]);};const own=arg('--source-dir'),common=arg('--shared-source-dir');console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),own,common):prepare(own,common)));}
module.exports={prepare,verifyAll};
