/* Extract exact text from saved public assets; never execute downloaded code. */
const fs = require('node:fs');
const path = require('node:path');
const {extractSources} = require('./prepare-workbench-evidence');
const {verify} = require('./prepare-login-evidence');
const output = path.resolve(__dirname,'../doc/requirements/evidence/dbms-review-20261026');

const definitions = [
  ['OFFICE-API','api-requirement-surveySubject.5191223e.js',['var ']],
  ['TEAM-API','api-requirement-surveyTeam.327e6ee2.js',['var ']],
  ['MILESTONE-API','api-requirement-milestone.d0131299.js',['var ']],
  ['PLAN-API','api-requirement-surveyPlan.945feb80.js',['var ']],
  ['TRACK-API','api-requirement-surveyTrack.fc829d65.js',['var ']],
  ['COLLECTION-API','api-requirement-collection.1c0d7ef1.js',['var ']],
  ['CONFIG-API','api-config-apply.05853cbd.js',['var ']],
  ['REFERENCE-API','api-requirement-surveyReferenceFile.b5ef9348.js',['ca91:function']],
  ['DOCUMENT-API','api-requirement-referenceFile.9cdfa937.js',['var ']],
  ['DICTIONARY-API','api-requirement-dataDictionary.61a764c7.js',['var ']],
  ['SYSTEM-API','api-requirement-surveyReportSys.9e9b2fb3.js',['var ']],
  ['RESOURCE-API','api-requirement-surveyReportSysData.c9c418db.js',['var ']],
  ['INTERFACE-API','api-requirement-surveyReportInterface.e5b49e23.js',['var ']],
  ['DATA-DEMAND-API','api-requirement-surveyReportDataDemand.197b8c9e.js',['var ']],
  ['BUSINESS-DEMAND-API','api-requirement-surveyReportBusinessDemand.01011ad8.js',['var ']],
  ['MEETING-API','api-requirement-meetingSummary.44d44e57.js',['var ']],
  ['ANNEX-API','api-requirement-attachment.a059696e.js',['var ']],
  ['CHART-API','api-requirement-reportChart.eff13746.js',['var ']],
  ['OVERVIEW','views-requirement-overview-chart.98bd5877.js',['"178c":function','data:function']],
  ['OFFICE-PURPOSE','views-requirement-prepare-office.d3214edf.js',['data:function']],
  ['OFFICE-LIST','views-requirement-prepare-office-components-subject.51b1475a.js',['data:function']],
  ['OFFICE-IMPORT-EXPORT','views-requirement-prepare-office-components-public.8f0e73f7.js',['var ']],
  // Exclude model initializers with unnecessary personal sample data.
  ['OFFICE-FORM','views-requirement-prepare-office-editSubject.b1632b08.js',['audaqueFormRulesMixin:','audaque-detail-form-page']],
  ['TEAM-LIST','views-requirement-prepare-team.e2161fea.js',['data:function']],
  ['TEAM-FORM','views-requirement-prepare-team-edit.22fd7ec1.js',['data:function']],
  ['MILESTONE-LIST','views-requirement-plan-milepost.f1129ba1.js',['data:function','getPercentage:function']],
  ['MILESTONE-FORM','views-requirement-plan-milepost-edit.44bc8dc6.js',['data:function']],
  ['PLAN-LIST','views-requirement-plan-list.86d778a5.js',['data:function']],
  ['PLAN-FORM','views-requirement-plan-list-edit.714a09fe.js',['"178c":function','data:function']],
  ['TRACK-LIST','views-requirement-implementation-track.88ffe31e.js',['data:function']],
  ['TRACK-TABS','views-requirement-implementation-track-subList.16d46ac6.js',['f729:function']],
  ['TRACK-EMPTY-EDIT','views-requirement-implementation-track-edit.0e03fc4b.js',['data:function']],
  ['MEETING','views-requirement-implementation-track-meeting.d8b72a39.js',['data:function']],
  ['ANNEX','views-requirement-implementation-track-annex.6b8dbf2b.js',['data:function','a570:function']],
  ['REFERENCE-LIST','views-requirement-prepare-referenceFile.a9ec91b3.js',['data:function']],
  ['REFERENCE-FORM','views-requirement-prepare-referenceFile-edit.4acd8f6b.js',['data:function']],
  ['DOCUMENT','views-requirement-document.fcc9f8a4.js',['data:function']],
  ['TREE','components-SideTree.af99ceeb.js',['data:function']],
  ['UPLOAD','components-UploadDoc.d52e6be0.js',['props:']],
  ['IMPORT','components-ImportFile.8896423c.js',['props:']],
  ['FILE-IN-OUT','views-requirement-implementation-track.88ffe31e.js',['fileInOutMixin_importIn:function']],
  ['CONFIG-LIST','views-config-applyConfig.35f0a6f0.js',['data:function']],
  ['CONFIG-FORM','views-config-applyConfig-edit.8f7c7785.js',['data:function']],
  ['COLLECTION-LIST','views-requirement-collection.c436bcb0.js',['data:function']],
  ['COLLECTION-FORM','views-requirement-collection-edit.fe60e9a4.js',['data:function']],
  ['COLLECTION-FINISH','views-requirement-collection-finishEdit.c1a61174.js',['data:function']],
  ['SYSTEM-LIST','views-requirement-report-informationSystem.dd80d651.js',['data:function']],
  ['SYSTEM-FORM','views-requirement-report-informationSystem-edit.608e089e.js',['data:function']],
  ['RESOURCE-LIST','views-requirement-report-dataResource.ac6f5258.js',['data:function']],
  ['RESOURCE-FORM','views-requirement-report-dataResource-edit.f8a8f488.js',['data:function']],
  ['RESOURCE-ITEM','views-requirement-report-dataResource-components-informationItem.76ed38ee.js',['data:function','handleOkEvent:function']],
  ['DICTIONARY-LIST','views-requirement-report-dataDictionary.7b8c0a60.js',['data:function']],
  ['DICTIONARY-FORM','views-requirement-report-dataDictionary-edit.44eb60bf.js',['data:function','t("audaque-detail-form-page"']],
  ['INTERFACE-LIST','views-requirement-report-interface.5b2933e5.js',['data:function']],
  ['INTERFACE-FORM','views-requirement-report-interface-edit.7b77c5aa.js',['data:function','_l(e.audaqueFormInfoMixin.applyConfigDoList']],
  ['DATA-DEMAND-LIST','views-requirement-report-dataRequirements.7cb9521d.js',['data:function']],
  ['DATA-DEMAND-FORM','views-requirement-report-dataRequirements-edit.44983c12.js',['data:function']],
  ['BUSINESS-DEMAND-LIST','views-requirement-report-businessRequirements.1d15e3cc.js',['data:function']],
  ['BUSINESS-DEMAND-FORM','views-requirement-report-businessRequirements-edit.e0670cde.js',['data:function']],
  ['CHART-TABS','views-requirement-report-chart.bdbf652c.js',['data:function']],
  ['CHART-RESEARCH','views-requirement-report-chart-research.3183af28.js',['data:function']],
  ['CHART-COLLECTION','views-requirement-report-chart-collection.8131fd00.js',['quantityData:[]','initTrendData:function']],
  ['CHART-DETAIL','views-requirement-report-chart-research-completion.49428a5e.js',['data:function']],
  ['CHART-ACCESS','views-requirement-report-chart-research-accessWay.6c1cbbc5.js',['data:function']],
  ['CHART-FREQUENCY','views-requirement-report-chart-research-frequency.33699d23.js',['data:function']],
  ['CHART-RESOURCE','views-requirement-report-chart-research-resource.7793c8d0.js',['data:function']],
  ['CHART-COMPANY','views-requirement-report-chart-collection-company.8d5252e6.js',['data:function']],
  ['CHART-COLLECT-COMPLETION','views-requirement-report-chart-collection-completion.23982b84.js',['data:function']],
  ['CHART-COLLECT-RESOURCE','views-requirement-report-chart-collection-resource.897d90cd.js',['data:function']],
  ['CHART-TREND','views-requirement-report-chart-collection-trend.dc1e4a40.js',['data:function']],
  ['APP','app.73911832.js',['"5c0b":function','bcab:function','de5f:function','3191:function']],
  ['LIST-MIXINS','chunk-@audaque-vue-utils.dd200c95.js',['pageSize:20','audaqueSubmitMixin:function','删除操作不能恢复，确定删除吗？']],
];
const sharedSelections = [
  ['DBMS-SRC-SHELL-REQUEST','shell-app.7ec981a3.js',[
    ['qa={"Content-Type":"application/json;',1050],['Ka=window.__$__BASE,Ya=function',1710],['key:"request",value:function(e,t,r)',405],
  ]],
  ['DBMS-SRC-BASE','serviceConfig.base.js',[['NETWORK_ERROR_CODE: 202',23]]],
  ['DBMS-SRC-CONFIG','serviceConfig.prod.js',[["API_BASE_URL: baseUrl + '/back'",39],['MODULE_URL_PREFIX: {}',21]]],
];
function select(directory) {
  const selections=definitions.map(([id,file,anchors])=>{
    const text=fs.readFileSync(path.join(directory,file),'utf8');
    return ['DBMS-SRC-'+id,file,anchors.map(anchor=>{
      const start=text.indexOf(anchor);
      if(start<0)throw new Error(id+': anchor not found '+anchor);
      let end=Math.min(start+(id==='DICTIONARY-FORM'?12500:18000),text.length);
      const url=text.slice(start,end).search(/https?:\/\//i);
      if(url>=0)end=start+url;
      if(end-start<anchor.length)throw new Error(id+': unsafe excerpt boundary');
      return [anchor,end-start];
    })];
  });
  const app=fs.readFileSync(path.join(directory,'app.73911832.js'),'utf8');
  const groups=['viewsComfactoryDevelopmentEditVue','viewsProjectMyProjectEditVue','viewsRequirementPrepareOfficeEditSubjectVue','viewsRequirementPlanListEditVue','viewsRequirementPlanMilepostEditVue','viewsRequirementReportDataDictionaryEditVue','viewsRequirementReportInformationSystemEditVue','componentsImportFileVue','componentsUploadDocVue','mixinsDocUploadMixinJs'];
  selections.push(['DBMS-SRC-LANGUAGE','app.73911832.js',groups.map(group=>{
    const anchor=group+':{',start=app.lastIndexOf(anchor);
    if(start<0)throw new Error('language group missing: '+group);
    return [anchor,app.indexOf('},',start)+1-start,true];
  })]);
  return selections;
}
function verifyAll(data,directory,sharedDirectory){
  const own=verify({sources:data.sources.filter(s=>s.sourceGroup!=='shared')},directory);
  const shared=verify({sources:data.sources.filter(s=>s.sourceGroup==='shared')},sharedDirectory);
  return {sources:own.sources+shared.sources,excerpts:own.excerpts+shared.excerpts,errors:0};
}
function prepare(directory,sharedDirectory){
  const inspectedAt=new Date().toISOString();
  const sources=extractSources(directory,inspectedAt,select(directory));
  const shared=extractSources(sharedDirectory,inspectedAt,sharedSelections).map(s=>({...s,sourceGroup:'shared'}));
  const data={schemaVersion:1,inspectedAt,evidenceType:'static-source',businessRequests:0,browserOperations:0,applicationAcceptanceExecuted:false,
    limitations:['公开静态资源GET后的离线分析；不执行下载代码，不调用业务接口','没有受控浏览器能力，没有新增截图或Network采样','历史页面为2026-10-22，静态资源为2026-10-26；不保证相同构建','前端契约不证明后端权限、事务、业务结果、审计或容量','整包、下载回执和必要个人样本留本机；复用的公共资源保留原获取时间'],sources:[...sources,...shared]};
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(data,null,2)+'\n');
  const live=path.resolve(output,'../live-recheck-20261022');
  const ids=fs.readdirSync(live).filter(f=>/^H-DBMS-\d{3}(?:-op\d+(?:-options\d+)?)?\.json$/.test(f)).map(f=>f.slice(0,-5)).sort();
  fs.writeFileSync(path.join(output,'README.md'),[
    '# 数据需求管理专项证据索引','',`静态复核UTC：${inspectedAt}。业务请求0次，浏览器操作0次；所有应用验收未执行。`,'',
    '[主规格](../../04-数据需求管理/需求说明.md) · [子页面与操作细化](../../04-数据需求管理/子页面与操作细化.md) · [核查记录](../../04-数据需求管理/核查记录.md) · [原文片段与摘要](./index.json) · [离线工具](../../../../scripts/prepare-dbms-evidence.js)','',
    '分发限制：仅限获授权项目成员。发布必要业务片段与相对资源路径；原包和获取回执留本机临时目录。未保存真实登录秘密、会话头值或无必要的样例联系电话。头名称和参数名不是凭据值。历史图像可能含用户名、空间名、业务样本，仍沿用原有访问限制。','',
    '| 证据编号 | 相对资源路径 | 原获取UTC时间 | 片段数 |','|---|---|---|---|',
    ...data.sources.map(s=>`| ${s.id} | ${s.resourcePath} | ${s.fetchedAt} | ${s.excerpts.length} |`),'',
    'index.json列原包SHA-256、字节数、片段UTF-16 code unit左闭右开偏移、片段SHA-256及原文。提取只读文本，不执行代码；整包核对限本机。sourceGroup=shared表示复用既有公共资源及原回执时间。OFFICE-FORM从校验定义开始，排除无必要的个人样例初始化值，不改写片段原文。','',
    '| 历史页面截图/元素 | 原采样UTC时间 | 相对路由 | 用途与限制 |','|---|---|---|---|',
    ...ids.map(id=>{const d=JSON.parse(fs.readFileSync(path.join(live,id+'.json'),'utf8'));return `| [${id}截图](../live-recheck-20261022/${id}.png) / [元素](../live-recheck-20261022/${id}.json) | ${d.time} | ${d.url} | ${id==='H-DBMS-004-op1'?'目录未选择的前置提示，不能证明新增文档表单':id==='H-DBMS-013'?'表头未就绪，不据空表头推定无字段':'历史1500×1000页面样本；不证明业务保存、后端规则或本次重新访问'} |`;}),'',
    '[F121里程碑新增完整截图](../F121-DBMS-plan-add.png)与[F122取消后截图](../F122-DBMS-plan-add-cancel.png)的原采样时间以[调研归档](../../04-数据需求管理/调研记录.md#dbms-107-调研里程碑--新增)为准；文件名中的plan不改变实际标题“新增调研里程碑”。本次只复看，没有重写时间。','',
    'H-DBMS-001的“项目一张图”与overview组件相符，保留为有效概览布局。新增/编辑的八类实施子页、准备文档满足目录后的表单、配置编辑及成果维护尚缺本次实拍；静态定义和历史实拍分别使用，不将代码片段冒称截图。','',
  ].join('\n'));
  return {sources:data.sources.length,excerpts:data.sources.reduce((n,s)=>n+s.excerpts.length,0),businessRequests:0};
}
if(require.main===module){
  const value=flag=>{const i=process.argv.indexOf(flag);if(i<0||!process.argv[i+1])throw new Error(flag+' required');return path.resolve(process.argv[i+1]);};
  const directory=value('--source-dir'),shared=value('--shared-source-dir');
  console.log(JSON.stringify(process.argv.includes('--verify')?verifyAll(JSON.parse(fs.readFileSync(path.join(output,'index.json'),'utf8')),directory,shared):prepare(directory,shared)));
}
module.exports={definitions,select,prepare,verifyAll,sharedSelections};
