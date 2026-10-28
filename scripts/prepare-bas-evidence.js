/* Offline excerpts only. No network, application API calls, or bundle evaluation. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../doc/requirements');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const selections=[
 ['USER-API','api-manage-user.0761d4a0.js','var t=r("bcab")',5500],
 ['DEPT-API','api-manage-department.25604b52.js','var r=n("bcab")',5600],
 ['ROLE-API','api-manage-role.7ddd3da8.js','var t=e("bcab")',1800],
 ['TENANT-API','api-manage-tenant.021f7e0d.js','var o=e("bcab")',1800],
 ['USER-LIST','views-manage-user-userList.0ccfd9d3.js','audaqueRequestListMixin:function',3100],
 ['RESET','views-manage-user-userList.0ccfd9d3.js','encryptStr:function',7100],
 ['VALIDITY','views-manage-user-userList.0ccfd9d3.js','handleUserExpire:function',2050],
 ['USER-STATUS','views-manage-user-userList.0ccfd9d3.js','audaqueSearchMixin.enabled',3000],
 ['USER-FILTER','views-manage-user-userList.0ccfd9d3.js','audaqueSearchMixin.obscureAccount',1750],
 ['ROLE-FILTER','views-manage-role-roleList.ec980a98.js','audaqueSearchMixin.obscureName',1300],
 ['TENANT-FILTER','views-manage-tenant-tenantList.3bd44e7a.js','audaqueSearchMixin.obscureName',1100],
 ['TAG-FILTER','views-manage-tag-tagList.8f7c8599.js','audaqueSearchMixin.obscureBizCode',2000],
 ['USER-FORM','views-manage-user-userEdit.dd9b1d2c.js','audaqueFormInfoMixin:',3800],
 ['USER-TRANSFORM','views-manage-user-userEdit.dd9b1d2c.js','audaqueFormBeforeHandleMixin:function',950],
 ['USER-DETAIL','views-manage-user-userInfo.ffa8234c.js','methods:',3100],
 ['DEPT-INIT','views-manage-department-departmentList.6341c861.js','methods:{initPage:',2900],
 ['DEPT-SORT','views-manage-department-departmentList.6341c861.js','departmentSortHandle:function',1500],
 ['DEPT-ADMIN','views-manage-department-departmentList.6341c861.js','setManager:function',3200],
 ['DEPT-FORM','views-manage-department-departmentList.6341c861.js','modifyTreeItem:function',9900],
 ['DEPT-MEMBER','views-manage-department-departmentList.6341c861.js','requestUserList:function',10500],
 ['PERMISSION','views-manage-permission-permissionMenu.6056dfc4.js','methods:',4400],
 ['DATA-FIELDS','views-manage-department-dataPermission.41b7d35e.js','permissionList:',760],
 ['DATA-FORM','views-manage-department-dataPermission.41b7d35e.js','modifyDataPermission:function',5000],
 ['DATA-API','views-manage-department-dataPermission.41b7d35e.js','var n=a("bcab")',2200],
 ['TENANT-FORM','views-manage-tenant-tenantEdit.e25a6445.js','data:function',4700],
 ['TENANT-MEMBERS','views-manage-tenant-userList.f7d602eb.js','data:function',6200],
 ['TAG-FORM','views-manage-tag-tagEdit.1cdf8df4.js','data:function',3400],
 ['UNLOCK','views-manage-security-unlimit.2de1b724.js','form:{',3300],
 ['UNLOCK-API','api-manage-security.e038784d.js','var t=c("bcab")',470],
 ['PARENT','module-common-app.96b573dd.js','bcab:function',950],
 ['BOOT','module-common-app.96b573dd.js','Object(l.e)({getRequestInstance:',470],
];
function prepare(sourceDir,output=path.join(ROOT,'evidence/bas-review-20261028')){
 const receipts=['chunks-receipt.json','shared-receipt.json'].flatMap(n=>JSON.parse(fs.readFileSync(path.join(sourceDir,n),'utf8')));
 const inspectedAt=new Date().toISOString();const entries=selections.map(([id,name,anchor,size])=>{
  const bytes=fs.readFileSync(path.join(sourceDir,name)),text=bytes.toString('utf8');
  const receipt=receipts.find(x=>x.localName===name);if(receipt&&(sha(bytes)!==receipt.sha256||bytes.length!==receipt.bytes))throw Error('BAS resource receipt mismatch: '+id);
  const start=text.indexOf(anchor);if(start<0)throw Error('BAS source anchor missing: '+id);
  const excerpt=text.slice(start,start+size).trimEnd();if(excerpt.length===text.length||/https?:\/\//i.test(excerpt))throw Error('BAS excerpt scope: '+id);
  const file=id.toLowerCase()+'.txt';fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,file),excerpt);
  return {id:'BAS-SRC-'+id,resourcePath:receipt?.path||'/module-common/static/js/'+name,localName:name,sourceSha256:sha(bytes),sourceBytes:bytes.length,fetchedAt:receipt?.fetchedAt||null,inspectedAt,file,anchor,start,end:start+excerpt.length,offsetUnit:'UTF-16 code units; half-open',excerptSha256:sha(excerpt)};
 });
 const index={schemaVersion:1,inspectedAt,evidenceType:'historical-static-source-reinspection',businessWritesExecuted:false,authenticatedNetworkObserved:false,entries};
 fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(index,null,2)+'\n');
 fs.writeFileSync(path.join(output,'README.md'),['# 后台系统管理必要源码片段','',
 '2026-10-28重新读取本机已取得的公开静态资源。逐资源实际获取时间见index.json，缺少获取登记的不补造时间。本提取器仅离线处理文本，不执行下载JavaScript，不访问业务接口。原文偏移为UTF-16左闭右开，资源摘要和片段摘要分别登记；复现须提供相同原始字节。','',
 '本轮浏览器只读打开后台入口后跳转到`/module-login/login`，仅观察登录页；未登录、未取得当前后台表单或认证Network，无新增后台截图。布局复用[2026-10-22历史证据](../live-recheck-20261022/README.md)。','',
 '公共宿主客户端另复核[既有请求链片段](../auth-review-20261026/transport.json)，并通过本批PARENT/BOOT追踪注入；不以静态版本证明当前服务器配置。','',
 '| ID | 相对资源 | 必要原文 |','|---|---|---|',...entries.map(e=>`| ${e.id} | ${e.resourcePath} | [${e.file}](./${e.file}) |`),'','[核查记录](../../36-后台系统管理/核查记录.md)',''].join('\n'));
 return index;
}
module.exports={selections,prepare};
if(require.main===module){const at=process.argv.indexOf('--source-dir');if(at<0)throw Error('--source-dir required');const result=prepare(path.resolve(process.argv[at+1]));console.log(JSON.stringify({excerpts:result.entries.length,businessWrites:0}));}
