/* Offline text extraction only. Downloaded scripts are never evaluated. */
const fs=require('node:fs');
const path=require('node:path');
const {extractSources}=require('./prepare-workbench-evidence');
const {verify}=require('./prepare-login-evidence');
const output=path.resolve(__dirname,'../doc/requirements/evidence/sms-review-20261027');
const views=[
  ['HOME','sms','views-home-home'],['FLOW','sms','views-develop-components-MenuList'],
  ['SCHEDULE','sms','views-schedule-manage-scheduleList'],['SETTING','sms','views-schedule-manage-scheduleSetting'],
  ['PERIODIC','sms','views-schedule-monitor-monitorList'],['REALTIME','sms','views-schedule-monitor-realtime'],
  ['ALARM','sms','views-schedule-alarm-messageList'],['PUSH','sms','views-schedule-alarm-pushList'],['PUSH-EDIT','sms','views-schedule-alarm-pushEdit'],
  ['COLLECTION','sms','views-resource-collectionList'],['DTM','sms','views-dtm-home'],['CATEGORY','sms','views-dtm-components-tree'],
  ['FUNCTION','sms','views-resource-functionList'],['SCRIPT','sms','views-resource-scriptList'],['SCRIPT-EDIT','sms','views-resource-components-scriptEdit'],
  ['STANDARD','gldm','views-process-standard-list'],['ATOMIC','gldm','views-develop-atomic-list'],['INTEGRATION','gldm','views-develop-integration-list'],['THEME','gldm','views-develop-theme-list'],['APPLICATION','gldm','views-develop-application-list'],
  ['CODE-STD','gldm','views-config-rule-standardCodeSet-list'],['CODE-SYS','gldm','views-config-rule-sourceSystemCodeSet-list'],['CODE-EDIT','gldm','views-config-rule-sourceSystemCodeSet-edit'],
  ['MAPPING','gldm','views-config-rule-mappingManage-list'],['GL-FUNCTION','gldm','views-config-rule-functionRule-list'],['GL-FUNCTION-EDIT','gldm','views-config-rule-functionRule-edit'],
  ['PACKAGE','gldm','views-config-rule-package-list'],['PACKAGE-EDIT','gldm','views-config-rule-package-edit'],['IDE-INIT','gldm','views-config-init-list'],
  ['STAT','sms','views-statistics-task'],['SYSTEM','sms','views-system-systemNodeList'],['COMPONENT','sms','views-system-compenontManage'],['COMPONENT-EDIT','sms','views-system-components-ComponentManageEdit'],['ENV','sms','views-initialize-componentList'],
];
const apis=[
  ['DEVELOP-API','sms','api-modules-develop'],['DTM-API','sms','api-modules-dtm'],['HOME-API','sms','api-modules-home'],['ENV-API','sms','api-modules-initialize'],
  ['COLLECTION-API','sms','api-modules-resource-collection'],['ALARM-API','sms','api-modules-schedule-alarm-messageList'],['PUSH-API','sms','api-modules-schedule-alarm-pushList'],
  ['SCHEDULE-API','sms','api-modules-schedule-manage-scheduleList'],['PERIODIC-API','sms','api-modules-schedule-monitor-monitorList'],['REALTIME-API','sms','api-modules-schedule-monitor-realtime'],
  ['STAT-API','sms','api-modules-statistics'],['COMPONENT-API','sms','api-modules-system-compenontManage'],['FUNCTION-API','sms','api-modules-system-functionList'],['SCRIPT-API','sms','api-modules-system-scriptList'],['SYSTEM-API','sms','api-modules-system-systemNodeList'],
  ['GL-INIT-API','gldm','api-config-init'],['GL-DEVELOP-API','gldm','api-develop'],['GL-STANDARD-API','gldm','api-process-standard'],['GL-RULE-API','gldm','api-rule'],
];
function selections(directory){
  const files=fs.readdirSync(directory);
  const find=(app,stem)=>{const matches=files.filter(f=>f.startsWith(app+'__static__js__'+stem+'.'));if(matches.length!==1)throw new Error('SMS source missing or ambiguous: '+stem);return matches[0];};
  return [...views.map(([id,app,stem])=>{
    const file=find(app,stem),text=fs.readFileSync(path.join(directory,file),'utf8');
    // Fixed-size contextual excerpts retain exact offsets. They are not executable modules.
    const ranges=[];
    for(const [anchor,length]of [['data:function',2600],['methods:{',6800],['audaqueFormInfoMixin:{',3200],['audaqueSearchMixin:{',2200],['audaqueFormRulesMixin:{',2300],['._self._c',7200],['audaqueSubmitMixin:function',3000],['audaqueNextStepMixin:function',1300],['initBegin:function',2800],['rateChange:function',2100],['confirm:function',1500],['handleSystemChange:function',1600]]){
      let from=0,count=0;
      while(count<3){const start=text.indexOf(anchor,from);if(start<0)break;let end=Math.min(text.length,start+length);const nextExport=text.indexOf('.default=',start);if(nextExport>start&&nextExport<end)end=nextExport;const piece=text.slice(start,end);if(/https?:\/\//i.test(piece)){from=start+anchor.length;count++;continue;}
        // Repeated component anchors are disambiguated with a longer exact prefix.
        const uniqueAnchor=text.slice(start,Math.min(end,start+Math.min(110,end-start)));
        if(text.indexOf(uniqueAnchor)===start)ranges.push([uniqueAnchor,end-start]);
        from=start+anchor.length;count++;
      }
    }
    if(!ranges.length)throw new Error(id+': no business excerpts');
    return ['SMS-SRC-'+id,file,ranges];
  }),...apis.map(([id,app,stem])=>{const file=find(app,stem),s=fs.readFileSync(path.join(directory,file),'utf8');const start=s.indexOf('"use strict"');return ['SMS-SRC-'+id,file,[[s.slice(start,start+80),s.length-start-4]]];})];
}
function prepare(directory){
  const inspectedAt=new Date().toISOString();
  const sources=extractSources(directory,inspectedAt,selections(directory));
  const receipts=JSON.parse(fs.readFileSync(path.join(directory,'receipt.json'),'utf8'));
  const index={schemaVersion:1,evidenceType:'static-source',inspectedAt,staticResourcesFetched:receipts.length,businessRequests:0,newScreenshots:0,applicationAcceptanceExecuted:false,
    limitations:['本轮仅公开静态GET、离线文本核对；下载代码未执行','历史截图为2026-10-22，静态资源为2026-10-27，不保证同一构建','H-SMS-004/005导航已变但正文仍为调度管理，不作监控布局证据','没有Network、后端契约或业务提交/启停/初始化/压测结果'],sources};
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(index,null,2)+'\n');
  const reg=require('./sms-published-registry.json');
  const shots=[...new Set(reg.sub.entries.flatMap(e=>e.sources))].map(id=>{
    const j=JSON.parse(fs.readFileSync(path.join(output,'../live-recheck-20261022',id+'.json'),'utf8'));
    return '| ['+id+'](../live-recheck-20261022/'+id+'.png) / [元素](../live-recheck-20261022/'+id+'.json) | '+j.time+' | 1500×1000历史样本；'+(['H-SMS-004','H-SMS-005'].includes(id)?'仅导航切换，正文错时':id==='H-SMS-009-op1'?'添加分类，非新增表':/H-SMS-(011|012|013|016)-op1/.test(id)?'前置提示，未进入完整新增表单':'按核查记录限定覆盖')+' |';
  });
  fs.writeFileSync(path.join(output,'README.md'),['# 任务编排与调度专项证据','',
    '复核日期：2026-10-27。公开静态资源GET共'+receipts.length+'项；业务请求0、新截图0、下载代码执行0。应用验收全部未执行。仅必要相对资源路径、原包及片段摘要和原文入库；整包及获取回执保留本机临时目录。','',
    '[机器索引](./index.json) · [主规格](../../09-任务编排与调度/需求说明.md) · [核查记录](../../09-任务编排与调度/核查记录.md)','',
    'UTF-16偏移左闭右开；片段可截于表达式中途，仅作为原文上下文。原包SHA-256与片段SHA-256分别核验，不能将静态调用定义当作真实请求回执。父壳网关、202及会话错误分支复用已独立核验的[公共客户端证据](../workbench-review-20261026/index.json)中的HOME-SRC-SHELL/BASE/CONFIG；本轮未重新获取父壳。','',
    '| 编号 | 相对资源路径 | 获取UTC | 片段数 |','|---|---|---|---|',...sources.map(s=>'| '+[s.id,s.resourcePath,s.fetchedAt,s.excerpts.length].join(' | ')+' |'),'','| 历史截图/元素 | 原采样UTC | 用途与覆盖 |','|---|---|---|',...shots,'',
    '布局复看：H-SMS-003、007-op1、008、009-op1、022、004、019、025-op1、026原图；其他样本按原JSON登记，不能称本次逐页浏览器实拍。错时、前置拦截与异常结果不得用于推断正常表单或成功流程。离线--verify不产生HTTP请求。',''].join('\n'));
  return {sources:sources.length,excerpts:sources.reduce((n,s)=>n+s.excerpts.length,0),staticResourcesFetched:receipts.length,businessRequests:0};
}
if(require.main===module){const i=process.argv.indexOf('--source-dir');if(i<0||!process.argv[i+1])throw new Error('--source-dir required');const dir=path.resolve(process.argv[i+1]);console.log(JSON.stringify(process.argv.includes('--verify')?verify(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),dir):prepare(dir)));}
module.exports={prepare,verify,selections,views,apis};
