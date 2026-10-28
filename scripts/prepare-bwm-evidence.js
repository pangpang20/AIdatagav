/* Offline text extraction only; never evaluates downloaded application scripts. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const selections=[
 ['FLOW-PARENT','flow-app.js','bcab:function',950],
 ['MODEL-READ','views-workflow-flowDesign.8a60a7d9.js','getModelDetail:function',1750],
 ['NODE-READ','views-workflow-flowDesign.8a60a7d9.js','Object(u.getNodeConfig)(',2450],
 ['MODEL-SAVE','views-workflow-flowDesign.8a60a7d9.js','var r={modelDefId:e.$route.query.modelDefId,name:o.name',500],
];
const viewNames=['views-log-login-list','views-log-operation-list.','views-monitor-alarmList','views-monitor-alarmEdit','views-news-announcementEdit','views-news-announcementList','views-news-announcementDetails','views-news-channelEdit','views-news-channelList','views-news-myNewsEdit','views-news-myNewsList','views-news-newsManage.','views-news-newsManageEdit','views-news-newsTypeEdit','views-news-templateEdit','views-news-templateList','views-news-sendTestMessage','views-workflow-processModel','views-workflow-versionManagement','views-workflow-processMonitoring','views-workflow-businessRegistrationEdit','views-formDesign-formList','views-workbench-myWorkflowAndCopy2MeEdit','views-workbench-workflowFinishedAndReviewEdit','views-workbench-workorderApply','views-workbench-myWorkflowList','views-workbench-workflowReviewList','views-workbench-workflowFinishedList','views-workbench-copy2MeList'];
function prepare(sourceDir,output=path.resolve(__dirname,'../doc/requirements/evidence/bwm-review-20261028')){
 const receipts=JSON.parse(fs.readFileSync(path.join(sourceDir,'receipt.json'),'utf8'));
 const names=fs.readdirSync(sourceDir);
 const jobs=[...selections,...names.filter(n=>n.startsWith('api-')).map(n=>['API-'+n.slice(4,-12),n,'"use strict"',0]),...viewNames.map((n,i)=>['VIEW-'+String(i+1).padStart(2,'0'),names.find(x=>x.startsWith(n)),'data:function',0])];
 const entries=jobs.map(([id,name,anchor,size])=>{
  if(!name)throw Error('BWM resource missing: '+id);
  const bytes=fs.readFileSync(path.join(sourceDir,name)),s=bytes.toString('utf8'),receipt=receipts.find(x=>x.localName===name);
  if(!receipt||receipt.sha256!==sha(bytes)||receipt.bytes!==bytes.length||receipt.status!==200)throw Error('BWM receipt mismatch: '+id);
  const start=s.indexOf(anchor);if(start<0)throw Error('BWM anchor missing: '+id);
  let end=size?Math.min(s.length,start+size):s.length;
  if(!size&&id.startsWith('VIEW-')){const tail=s.slice(start).match(/\b[a-zA-Z_$][\w$]*\.default=[a-zA-Z_$][\w$]*\.exports/);if(!tail)throw Error('BWM component end missing: '+id);end=start+tail.index+tail[0].length;}
  const excerpt=s.slice(start,end);if(/https?:\/\//i.test(excerpt))throw Error('BWM nonminimal URL excerpt: '+id);
  const file=id.toLowerCase()+'.txt';fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,file),excerpt);
  return {id:'BWM-SRC-'+id,resourcePath:receipt.path,sourceSha256:sha(bytes),sourceBytes:bytes.length,fetchedAt:receipt.fetchedAt,file,anchor,start,end,offsetUnit:'UTF-16 code units; half-open',excerptSha256:sha(excerpt)};
 });
 const index={schemaVersion:1,evidenceType:'public-static-source',businessWritesExecuted:false,authenticatedNetworkObserved:false,staticResourcesFetched:receipts.length,entries};
 fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(index,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),['# 后台消息工作流与审计必要源码片段','','2026-10-28取得公开静态资源，仅GET静态文件，未执行下载代码或业务API。每份原始资源的实际获取时间、相对路径、字节数与SHA-256，以及必要片段的UTF-16偏移、摘要见index.json。离线提取器要求相同原始字节和receipt.json，摘要不符即拒绝。','','公共宿主链路参见[后台宿主](../bas-review-20261028/parent.txt)、[宿主启动](../bas-review-20261028/boot.txt)与[历史公共传输](../auth-review-20261026/transport.json)。FLOW-PARENT证明flow模块接收宿主requestInstance；不能证明当前配置与后端安全实现。','','| ID | 来源相对资源 | 必要原文 |','|---|---|---|',...entries.map(e=>`| ${e.id} | ${e.resourcePath} | [${e.file}](./${e.file}) |`),'','[核查记录](../../38-后台消息工作流与审计/核查记录.md) · [历史页面及DOM](../live-recheck-20261022/README.md)',''].join('\n'));
 return index;
}
module.exports={prepare,selections};
if(require.main===module){const at=process.argv.indexOf('--source-dir');if(at<0)throw Error('--source-dir required');const r=prepare(path.resolve(process.argv[at+1]));console.log(JSON.stringify({resources:r.staticResourcesFetched,excerpts:r.entries.length,businessWrites:0}));}
