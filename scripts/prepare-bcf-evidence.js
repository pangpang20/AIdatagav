/* Offline text extraction only. Downloaded code is never evaluated. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const selections=[
 ['APP-API','api-config-app.a0243f15.js','var r=t("bcab")',2200],
 ['APP-FORM','views-config-app-edit.a3ce57d6.js','data:function',2290],
 ['APP-SECRET','views-config-app-edit.a3ce57d6.js','showSecretEdit:function',3800],
 ['APP-CONTROLS','views-config-app-edit.a3ce57d6.js','applicationScenario"),prop:',4200],
 ['APP-LIST','views-config-app-list.ec5d2814.js','data:function',2500],
 ['ENUM','assets-js-config.f2773912.js','a={VERSION:',380],
 ['SYSTEM-API','api-config-system.b7aadf1a.js','var o=t("5530")',2200],
 ['SYSTEM-FORM','views-config-system-edit.32406a30.js','data:function',2300],
 ['SYSTEM-FILES','views-config-system-edit.32406a30.js','uploadLogoHttpRequest:function',3900],
 ['SYSTEM-CONTROLS','views-config-system-edit.32406a30.js','systemName"),prop:',4800],
 ['SYSTEM-LIST','views-config-system-list.4efc2c76.js','data:function',4300],
 ['LOGO','components-UploadImg.b2836a0c.js','name:"UploadImg"',3000],
 ['PLATFORM-API','api-config-platform.4290d549.js','var r=o("bcab")',1600],
 ['PLATFORM-FORM','views-config-platform-edit.9a3fa157.js','data:function',5500],
 ['PLATFORM-CONTROLS','views-config-platform-edit.9a3fa157.js','platformName"),prop:',5600],
 ['PLATFORM-LIST','views-config-platform-list.28319127.js','data:function',4100],
 ['PLATFORM-ROWS','views-config-platform-AddSystemTable.0f1a6c4e.js','props:{optType:',3500],
 ['DICT-API','api-config-dictionary-dictItem.ab93f916.js','var c=o("bcab")',1000],
 ['DICT-FORM','views-config-dictionary-edit.096533c0.js','data:function',4800],
 ['DICT-LIST','views-config-dictionary-list.06658ab8.js','data:function',3200],
 ['DATE-API','api-config-calendar-calendarspecial.358f27d5.js','var o=e("bcab")',1000],
 ['DATE-FORM','views-config-calendarspecial-edit.03bd3126.js','data:function',2400],
 ['DATE-LIST','views-config-calendarspecial-list.fa32c279.js','data:function',2450],
 ['LICENSE-API','api-config-license.681a1c88.js','var c=e("bcab")',1100],
 ['LICENSE-INFO','views-config-license-info.a860b7b2.js','data:function',5400],
 ['LICENSE-FORM','views-config-license-authorize.b370050e.js','data:function',3700],
 ['KEY','api-common.070f976e.js','var e=t("bcab")',800],
 ['LIST-MIXIN','module-common-chunk-@audaque_vue-utils.5c2b645c.js','audaqueRequestListMixin:function',1400],
 ['FORM-MIXIN','module-common-chunk-@audaque_vue-utils.5c2b645c.js','audaqueSubmitMixin:function',1500],
 ['FILE-VALIDATOR','module-common-chunk-@audaque_vue-utils.5c2b645c.js','onBeforeUpload:function',760],
 ['PARENT','module-common-app.96b573dd.js','bcab:function',950],
 ['BOOT','module-common-app.96b573dd.js','Object(l.e)({getRequestInstance:',470]
];
function prepare(sourceDir,output=path.resolve(__dirname,'../doc/requirements/evidence/bcf-review-20261028')){
 const receipts=JSON.parse(fs.readFileSync(path.join(sourceDir,'chunks-receipt.json'),'utf8'));
 const inspectedAt=new Date().toISOString();
 const entries=selections.map(([id,name,anchor,size])=>{
  const bytes=fs.readFileSync(path.join(sourceDir,name)),text=bytes.toString('utf8'),r=receipts.find(x=>x.localName===name);
  if(!r||sha(bytes)!==r.sha256||bytes.length!==r.bytes)throw Error('BCF receipt mismatch: '+id);
  const start=text.indexOf(anchor);if(start<0)throw Error('BCF anchor missing: '+id);
  const excerpt=text.slice(start,start+size).trimEnd();
  if(excerpt.length===text.length||/https?:\/\//i.test(excerpt))throw Error('BCF excerpt scope: '+id);
  const file=id.toLowerCase()+'.txt';fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,file),excerpt);
  return{id:'BCF-SRC-'+id,resourcePath:r.path,localName:name,sourceSha256:r.sha256,sourceBytes:bytes.length,fetchedAt:r.fetchedAt,inspectedAt,file,anchor,start,end:start+excerpt.length,offsetUnit:'UTF-16 code units; half-open',excerptSha256:sha(excerpt)};
 });
 const index={schemaVersion:1,inspectedAt,evidenceType:'public-static-source',businessWritesExecuted:false,authenticatedNetworkObserved:false,entries};
 fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(index,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),['# 后台配置管理必要源码片段','','2026-10-28只读获取公开静态资源并离线检查文本，未执行下载代码或调用业务接口。index.json登记每个资源的实际获取时间、相对路径、原始字节摘要，以及必要连续片段的UTF-16左闭右开偏移和摘要。复现提取须使用相同原始文件。','','本轮后台入口跳转至`/module-login/login`，未认证，未采集新的后台截图。布局复用2026-10-22、1500×1000的历史页面，平台候选请求被保护拦截的空态不证明无系统。宿主公共请求处理另经原文件摘要校对[既有传输片段](../auth-review-20261026/transport.json)。','','| ID | 相对资源 | 必要片段 |','|---|---|---|',...entries.map(e=>`| ${e.id} | ${e.resourcePath} | [${e.file}](./${e.file}) |`),'','[需求说明](../../37-后台配置管理/需求说明.md) · [核查记录](../../37-后台配置管理/核查记录.md)',''].join('\n'));
 return index;
}
module.exports={prepare,selections};
if(require.main===module){const i=process.argv.indexOf('--source-dir');if(i<0)throw Error('--source-dir required');console.log(JSON.stringify({excerpts:prepare(path.resolve(process.argv[i+1])).entries.length,businessWrites:0}));}
