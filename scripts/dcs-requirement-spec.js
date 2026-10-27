/* Reviewed DCS business specification. Pure offline rendering; no application requests. */
const fs=require('node:fs'),path=require('node:path'),published=require('./dcs-published-registry.json');
const ROOT=path.resolve(__dirname,'../doc/requirements');
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','|'+heads.map(()=>'---').join('|')+'|',...rows.map(r=>'| '+r.map(v=>String(v??'').replaceAll('|','&#124;').replaceAll('\n','<br>')).join(' | ')+' |'),''];
const f=(name,type,required='',value='',limit='',rule='',error='',state='')=>[name,type,required,value,limit,rule,error,state];
const ro=(name,rule='')=>f(name,'只读','','','',rule,'','成功读取后');
const input=(name,required='',limit='',rule='')=>f(name,'文本',required,'',limit,rule);
const select=(name,required='',rule='',value='')=>f(name,'候选选择',required,value,'',rule);
const paging=[f('页号 pageRequest.pageNo','integer','是','1','≥1','筛选、重置或页大小变化回首页'),f('页大小 pageRequest.pageSize','integer','是','','正整数','普通列表由公共组件提供；显式10/20按本项说明，不能推断服务端上限')];
const api=(use,method,group,url,params,read)=>[use,method,'/back/'+(group==='user'?'common/user':group==='dict'?'common/dict':group==='source'?'common/datasource':'dcs/'+group)+url,params,read];
const m=(use,method,url,params='',read='公共resolve后校验本项结构；写入须回读对象及状态')=>api(use,method,'mgt',url,params,read);
const h=(use,method,url,params='',read='公共resolve后校验返回结构与对象范围')=>api(use,method,'hub',url,params,read);
const mall=(use,method,url,params='',read='公共resolve后校验返回结构与对象范围')=>api(use,method,'mall',url,params,read);
const control=(name,input,behavior,result='成功后按当前条件回读；失败保留可安全保留的上下文')=>[name,input,behavior,'请求中禁相关重复入口；失败可恢复',result];
const PROFILES={};
function profile(key,purpose,fields,controls,flow,apis,layout,checks){PROFILES[key]={purpose,fields,controls,flow,api:apis,layout,checks};}
profile('internal','查看机构内部资源导入、编目、发布、共享及订阅的统计分布。',[
 f('导入区间 imptRangeType','integer','是','3','1/2/3','近12月/近1月/近7日'),f('发布区间 relRangeType','integer','是','6','4/5/6','近12月/近1月/近7日'),
 ro('标题汇总 fetchTitleInfoData','resourceImportCount、resourceCatalogueCount、catalogueCount、cascadeCatalogueCount、subCatalogueCount及resourceImportType1Count～4Count'),
 ro('导入序列 impData','indexName、count1～count4分别库表/文件/API/服务API'),ro('发布序列 relData','indexName、count'),ro('TOP5Data','按返回顺序展示名称/count；进度相对首行count，首行0时为0，不是总体占比'),
 ro('共享/开放分布 shareData/openData','shareType0Count～2Count、openType0Count～3Count；统计序号不能直接当编目shareType枚举')],
 [control('导入/发布区间按钮','对应区间枚举','仅重新读取本图；后发条件有效，合法空数组清空旧图'),control('TOP5和汇总','当前机构可见范围','读取统计，不能凭图形反推去重、跨机构或时间截点口径')],
 ['进入后并行读取标题、导入3、发布6和TOP5类型7；各卡片独立加载/失败。','类型占比=各resourceImportTypeNCount/resourceImportCount；编目率=resourceCatalogueCount/resourceImportCount；共享率=cascadeCatalogueCount/catalogueCount；订阅率=subCatalogueCount/catalogueCount，乘100取整。分母0显示“-”，失败不填0。','切区间后核对请求type及返回indexName，取消旧上下文落屏；空数组显示无数据并清理旧图；离页释放图表及resize监听。'],
 [m('标题统计','POST','/mgtStaticInfo/fetchTitleInfo','无显式body','读取汇总字段，不虚构成功code'),m('趋势及TOP5','GET','/mgtStaticInfo/mgt/{type}','path type=1～7','数组；indexName/count1～4或count；TOP5显示相对首行')],
 '顶部标题/数量卡片，下方导入和发布趋势及区间按钮，再下为TOP5和共享/开放图；图例区分四种资源，长名称完整提示。无普通列表分页、保存或取消草稿。',
 ['进入读取3/6/7及标题，四类资源和各占比分母正确。','逐切1～6，图形indexName和请求一致；首行100、其余50的TOP5进度100/50。','零分母显示“-”；合法空数组清旧图；单接口失败显示未取得数据而非0。','先发A再发B，A迟到不覆盖B；超时只重试失败卡片。','无权直接统计路径被拒绝；反复进入离开释放图表及监听。']);
profile('agency','查看接入机构总体目录、发布及订阅概况；通过固定时间区间分析趋势。',[
 f('接入区间 imptRangeType','integer','是','3','1/2/3','近12月/近1月/近7日'),f('发布区间 relRangeType','integer','是','6','4/5/6','近12月/近1月/近7日'),
 ro('机构数量 fetchAccessInfoData','accessCount、catalogueAccessCount/noCatalogueAccessCount、hasSubAccessCount/noSubAccessCount'),ro('目录数量/类型','catalogueCount；apiCatalogueCount/dbCatalogueCount/fileCatalogueCount/gsbCatalogueCount；hasSubCatalogue'),
 ro('趋势及TOP5','indexName/count；类型7目录TOP5、8部门TOP5，进度相对各自首行'),ro('共享开放统计','shareType0CatalogueCount～2CatalogueCount；openType0CatalogueCount～3CatalogueCount')],
 [control('两组区间按钮','1～3及4～6','独立重读机构接入和目录发布趋势'),control('机构概况/TOP5','服务端授权可见机构集合','展示汇总及类型7/8；没有任意手填起止时间或机构筛选控件')],
 ['读取汇总及3/6/7/8；机构分布、资源类型比例和订阅比例分开展示。','四类目录及hasSubCatalogue以catalogueCount为分母，0分母“-”；TOP5相对首行，不解释为占全部目录百分比。','时间窗口由type固定，服务端确定时区、包含端点及去重；不得自行增加机构参数以实现历史标题所指范围。'],
 [h('机构汇总','POST','/accessStaticInfo/fetchAccessInfo','无显式body','读取机构/目录汇总'),h('趋势与排名','GET','/accessStaticInfo/access/{type}','path type=1～8','数组indexName/count；7和8分别TOP5')],
 '顶部机构及目录汇总，下方机构接入、发布趋势和独立时间按钮，随后机构分布、共享开放及两个TOP5；图表独立状态，不提供虚构的任意日期机构查询栏。',
 ['读取3/6/7/8并区分两个TOP5。','切换1～6只影响相应趋势；目录类型分母catalogueCount正确。','分母0、空排名、单指标失败分别显示，不沿用旧图。','切区间及会话变更后丢弃迟到结果，保留当前有效按钮。','服务端限制机构集合；无图数据时仍可键盘操作区间。']);
profile('resources','按部门、来源及类型维护资源导入关系，查看元数据并进入编目。',[
 select('编目页签 catalogueStatus','','0未编目/1已编目；全部页签不传该键','0'),select('部门 deptId','','部门树授权ID'),select('资源类型 resourceType','','字典importResourceType'),select('来源 datasourceId','','enabled来源ID'),input('资源名称 resourceName'),...paging,
 ro('资源行 id/resourceId/resourceName/resourceType','id为部门资源关系ID；resourceId是底层资源ID；1库表2文件3API4服务API'),ro('元数据 datasourceName/deptName/catalogueStatus','实际字段与空值按返回展示，不把当前36条样本设为固定容量')],
 [control('页签/查询/重置/分页','已提交筛选','页签0/1解析数值，全部删除catalogueStatus；筛选回首页'),control('查看/导入/编目','当前资源行或无选中','查看用resourceId；编目从关系id进入编辑；导入打开独立弹窗'),control('单删/批删','关系id或已选关系id数组','确认影响后删除导入关系并回读；不宣称删除物理源资源'),control('模板/Excel导入','有效授权及文件','blob下载；FormData code=0/file，读取verifyFail/errorMsg/message，不以promise完成当全成功')],
 ['读取授权部门、importResourceType、sourceUseScene及enabled来源，再查询关系页datas/total/pageNo/pageSize。','只从当前行获取关系ID或resourceId；切筛选清理失效选择；删除前提示是关系维护，回读本页，末页删空回前页。','候选失败禁对应操作；列表有total而未渲染行时显示异常/加载状态，不作为合法空结果。'],
 [m('资源关系页','POST','/relationdeptresource/page','筛选字段及pageRequest','datas/total/pageNo/pageSize'),m('删除关系','DELETE','/relationdeptresource/{id}','path关系id'),m('批删关系','DELETE','/relationdeptresource/remove','body关系id数组'),m('导入模板','GET','/mgtcatalogue/excel/template','rawData/blob','核对文件响应，错误体不保存为Excel'),m('Excel导入','POST','/mgtcatalogue/excel/import','FormData code=0,file','verifyFail/errorMsg/message分别处理')],
 '上方未编目/已编目/全部页签、筛选行和操作区，中间复选资源表、行操作，底部分页；导入和资源详情在列表上下文打开。历史U图总数36但无行，不能固定成正常空态。',
 ['按部门/类型/来源/名称和页签过滤，请求catalogueStatus及总数一致。','查看用resourceId、删除用关系id；批删只包含当前有效选择。','取消删除无删除请求；成功回读关系，源物理资源仍按源系统验证。','导入verifyFail或blob错误展示失败；未知结果先查导入关系再重试。','越权关系/底层资源分别拒绝；旧查询不覆盖新页。']);
profile('resourceView','查看已导入资源的基础信息、字段及API参数示例。',[
 ro('定位 resourceId','来自关系行resourceId，不能使用关系id'),ro('基础 viewData.basicInfo','名称、部门、来源、资源类型等按返回字段展示'),ro('字段 viewData.columnList','列名、中文名、类型、长度、精度等只读'),
 ro('服务字段 serviceObj.headerData/inData/outData','fieldType=1头/2输入/4输出；fieldCnName/fieldEnName/isRequired/remarks/fieldDataType'),ro('请求/响应示例 requestSample/responseSample','安全文本展示，不自动发送示例请求')],
 [control('查看/切页签','当前resourceId及类型','库表字段、文件信息、API或服务API分支显示；禁止不适用分支'),control('关闭/返回','只读详情','回原列表筛选和页码；不保存或调用业务写入','关闭恢复触发点焦点')],
 ['按resourceId读取详情；服务API从resourceGsbDo.gsbServiceId读取字段分组和示例。','详情失败不保留前一行数据；字段类型缺失给结构错误而非补造字段。遗留previewRequestParams虽含queryType=1/pageNo=1/pageSize=10，但没有有效预览请求调用链，当前只读元数据详情不据此开放数据预览。','API示例只用于阅读，复制需脱敏；预览数据受行列权限与限量控制，不因目录可见就开放底层数据。'],
 [api('资源详情','POST','resource','/tresource/detail/{resourceId}','path底层resourceId','basicInfo/columnList等按调用端读取'),m('服务字段','POST','/mgtcatalogue/queryGsbFieldList','{serviceRegId:resourceGsbDo.gsbServiceId}','data；按fieldType分组'),m('服务示例','GET','/mgtcatalogue/getGsbServiceDetail/{id}','服务注册ID','data.requestSample/responseSample')],
 '资源列表上的查看弹窗保留标题和关闭入口；基础信息在上，字段/参数和示例分区；宽表局部横滚，长示例用可选择文本，页签内容独立加载。',
 ['不同资源类型展示适用基础、字段和API区域，关系id不替代resourceId。','服务fieldType1/2/4分组准确；示例作为文本，不执行。','缺元数据、字段为空、权限不足分别显示；不沿用上一对象。','关闭只读详情回列表；慢响应晚于关闭不得再落屏。','越权resourceId/服务ID及字段受服务端控制；预览限量与脱敏验收。']);
profile('resourceImport','从授权数据来源选择未导入资源，建立部门和应用系统归属。',[
 select('数据来源 importObj.datasourceId','','enabled=true来源'),select('资源类型 importObj.resourceType','','importResourceType'),input('资源名称 importObj.resourceName'),
 f('导入分页 importObj.pageRequest','object','是','{pageNo:1,pageSize:10}','','只影响候选表'),select('导入部门 saveParams.deptId','是','findUserDeptList候选','null'),select('关联系统 saveParams.systemId','是','按deptId加载appsystem/list','空字符串'),
 f('选中资源 saveParams.resIds','array','是','[]','至少1','只选isImport=false；来自候选稳定ID'),f('自动编目 saveParams.isAuto','boolean','','false','','提交自动编目任务不等于已编目或发布'),ro('候选行 isImport','已导入项不可再次选择')],
 [control('来源/类型/名称/查询/候选分页','当前importObj','重查候选并清理跨上下文选中'),control('导入部门change','findUserDeptList授权项','清空systemId后加载该部门应用系统；空候选提示先维护系统'),control('刷新来源','必须选datasourceId且有扫描权限','POST扫描源或API刷新；影响业务，需确认；不是本地刷新列表'),control('确认/取消/关闭','有效deptId/systemId/resIds','确认只提交saveParams；取消清理本地选择；未知结果先查关系')],
 ['打开弹窗读取可导入部门和来源；选来源过滤资源候选，isImport项禁选。','选部门后必须重新选择该部门系统；确认前再次校验非空资源和授权关联；提交后回读关系。','isAuto=true提示“自动编目已提交”，后续编目/审批/发布仍独立；扫描请求受理不证明扫描完成。'],
 [m('导入候选','POST','/relationdeptresource/page/resource','importObj含pageRequest','datas/total'),m('导入部门','GET','/common/findUserDeptList','','部门候选'),m('部门系统','POST','/appsystem/list','{deptId}','系统数组'),m('导入','POST','/relationdeptresource/import/resource','{deptId,resIds,isAuto,systemId}','受理后回读，不能作发布终态'),api('扫描来源','POST','resource','/tresource/scanresource/{datasourceId}','path来源ID','有副作用，受理与完成分离'),m('API来源刷新','POST','/mgtcatalogue/scanresource','','有副作用；结果和范围须服务契约')],
 '导入弹窗顶部数据来源与刷新按钮，其下类型/名称及查询，部门和关联系统双列，候选复选表和独立分页，下部自动编目及取消/确认。J-DCS-003-op2有加载旋转，不作为已加载空集合。',
 ['选择来源/类型/名称读取候选；isImport项禁选，至少选择一项才可确认。','切部门清systemId，旧候选回调不能恢复不匹配系统。','扫描来源前无datasourceId阻止请求；取消导入无导入请求。','isAuto提交后只标任务受理；超时先查关系和编目状态再决定重试。','服务端拒绝越权deptId/systemId/resIds及并发重复导入。']);
const basicFields=[
 input('目录名称 catalogueName','是','≤50','trim'),input('资源别名 dataAlias','是','≤30','trim'),input('来源库 datasourceName','按来源分支','≤30'),select('来源部门 deptId','是','来自资源关系；现有对象禁改','null'),ro('部门名称 deptName'),select('关联系统 systemId','是','按部门加载'),
 f('关联事项 matterIds','多选','','[]','','事项ID列表；matterNames为展示串'),ro('事项名称 matterNames'),select('资源类型 resourceType','是','1库表2文件3API4服务API；来源编目只读'),select('数据格式 resourceFormat','','候选随resourceType重置','null'),
 select('数据更新方式 updateType','条件必填','按模板对应选项'),select('更新同步方式 updateType2','条件必填','值1显示人工更新时间'),f('人工更新时间 manualUpdateTime','日期时间','updateType2=1','空字符串','','切分支清理'),select('更新周期 updateCycle','是','字典候选'),select('安全等级 securityLevel','','字典候选'),
 input('数据审核 dataAudit','按可见规则','≤100'),input('资源摘要 catalogueAbstract','是','≤300'),f('是否级联 shareable','单选','是','0','0/1','切换重算分类与共享条件'),select('部门目录分类 relationCategory.categoryId','级联且显示时','树候选；根/节点ID按契约','null'),select('目录分类 categoryId','','按级联及部门配置','null'),select('主题分类 subjectCategoryId','','对应主题树','null'),
 ro('目录编码 catalogueCode','选分类后getCatalogueCode/{categoryId}生成；后端校验唯一性'),f('提供方式 myProvideType/provideType','多选/字符串','按分支','[]','','数组.toString()序列化逗号串'),select('共享类型 shareType','级联时','依字典及模板；不把统计序号映射过来'),
 f('共享范围 myShareScope/shareScope','多选/字符串','共享条件适用时','[]','','数组.toString()；非级联编辑中的9999为客户端哨兵，不作通用业务枚举'),input('共享条件 shareCondition','按共享类型'),select('开放类型 openType','按可见规则','按来源枚举'),input('使用要求 useDemand','按可见规则','≤300'),
 f('信息项 itemList','array','非文件至少1','[]','','uid,itemName,itemCode,columnName,dataType,columnLength,dataPrecision,shareType,openType,asPrimaryKey,myShareScope/shareScope,mapping,remark,relationColumnRes.columnName'),
 input('信息项名称 itemName','是','弹窗≤100；行内≤200','trim；特殊字符校验；目标统一≤100'),input('字段英文名 columnName','是','≤100','trim；^[a-zA-Z][a-zA-Z0-9_]*$；同目录防重复'),select('字段数据类型 dataType','是','字典display作为提交值'),
 f('字段长度 columnLength','number','按类型','0','≥0','按数据类型和后端支持范围校验'),f('字段精度 dataPrecision','number','按类型','0','≥0','精度与长度组合由契约约束'),select('信息项共享类型/开放类型 shareType/openType','条件必填','不能超出目录共享开放约束'),
 f('信息项主键 asPrimaryKey','选择','是','0','','按模板枚举'),f('信息项范围 myShareScope','多选','条件必填','["2"]','','字符串化shareScope'),input('字段说明 remark','','≤300','trim'),ro('信息项 uid/itemCode/mapping','保留稳定UID和已有编码；mapping标识映射关系'),
 f('挂载资源 resourceList','array','','[]','','选中resourceId；局部删除挂载不删除源资源'),f('映射 rels','array','','[]','','{resId,columnName,resColumnId}；source列ID→target字段英文名；一对一')];
profile('compile','将资源及其字段整理为可维护的目录草稿，保存后独立提交编目审核。',basicFields,
 [control('基础项change/分类选择','按资源类型/级联/共享条件','类型变化清格式；updateType2变化清人工时间；分类变更重新生成code；隐藏分支不沿用无效值'),control('下一步/上一步','基础表单通过且非文件','进入信息项及挂载/映射；文件类型2仅基本信息，不强制第二步'),control('信息项新增/编辑/批改/清空/导入','本地itemList','已映射项受保护不可删除；模板导入逐行判重columnName，非法行明示；仅改本地草稿'),control('挂载/自动映射/删除映射','授权资源和有效字段','自动按lowercase.trim同名匹配；禁止同侧/反向/一对多连线；人工复核'),control('智能分类/智能分级','选资源后主动触发','推荐返回后人工选择/确认覆盖；不自动保存、送审或扩权限'),control('保存/提交审核/返回','全部适用字段有效','新增POST、编辑PUT；提交先保存后送审；部分失败保留已保存id，不重复创建')],
 ['从资源关系id新增或从目录id编辑读取；区分新建、编辑、变更、挂载操作，action分别默认空、1、2、3。','保存前合并基础模型，provideType/shareScope字符串化；非级联删除relationCategory；非文件校验itemList至少一项、挂载映射有效。','保存使用POST或PUT；普通审核先保存/更新再POST /processapproval，body为目录ID数组；变更使用catalogueChangeSubmit。两步成功才进入流程状态。','保存成功而送审失败显示“已保存，审核提交失败”，保持目录id及草稿，重试只送审；超时结果未知先回读目录及流程，不再次创建。'],
 [m('目录读取','GET','/mgtcatalogue/{id}','path目录id','基础模型、itemList/resourceList等'),m('资源关系读取','GET','/relationdeptresource/{id}','从资源入口关系id','来源元数据'),m('保存新增','POST','/mgtcatalogue','基础模型+itemList/resourceList/rels+action','保存返回id结构必须联调固定'),m('保存编辑','PUT','/mgtcatalogue/{id}','目录id及完整草稿+action'),m('送审','POST','/processapproval','body目录id数组'),m('变更送审','POST','/processapproval/catalogueChangeSubmit','变更目录模型，完整DTO由契约固定'),m('智能分类','POST','/mgtcatalogue/smartCategory','{resourceId,shareable:shareable==1}','推荐分类，人工采纳'),m('智能分级','POST','/mgtcatalogue/smartLevel','{resourceId,shareable:shareable==1}','推荐列安全级别，人工采纳'),m('分类树','POST','/mgtcatalogue/tree','按当前分类及授权上下文','树候选'),m('资源映射列','GET','/relationdeptresource/columns/{resourceId}','path底层资源ID','列候选；源列ID映射目标columnName'),api('生成目录编码','GET','catalogue','/tcatalogue/getCatalogueCode/{categoryId}','path分类ID','生成候选编码，服务端检查冲突'),m('信息项模板','GET','/mgtcatalogue/item/excel/template','rawData/blob','模板文件'),m('信息项导入','POST','/mgtcatalogue/item/excel/import','FormData code=0,file','数组；逐行重复/错误反馈')],
 '顶部两步进度；首步名称/别名与只读来源部门双列，随后来源、更新、类型格式、周期安全、系统事项、审核摘要、共享分类条件等向下滚动。非文件第二步信息项表、挂载资源和连线映射区域；底部上/下一步及保存/提交。历史图只覆盖首步部分区域，第二步定义来自静态组件。',
 ['从资源关系新增与目录编辑分别加载正确ID；文件类型2不强制信息项第二步。','名称50/别名30、字段英文100、0长度精度及条件必填边界；切类型/部门/分类清无效依赖。','信息项至少1、重复columnName、已映射删除及一对一连线校验；模板逐行错误不当成功。','保存成功送审失败保留id并显示“已保存，审核提交失败”；重试不再次POST新建。','智能推荐人工采纳；无权资源/字段和并发版本拒绝；离页确认本地未保存修改。']);
profile('catalogue','查询目录生命周期状态，维护目录和资源挂载，按授权提交、发布或下架。',[
 input('目录名称 catalogueName'),select('来源部门 deptId'),select('资源类型 resourceType'),select('提供方式 provideType'),select('审批状态 approveStatus','','approvalStatusType字典'),select('目录状态 publishStatus','','publishStatusType字典'),select('资源挂载 hasRes','','0否1是'),select('是否级联 shareable','','0/1'),...paging,
 ro('目录行 id/catalogueName/catalogueCode','id为目录ID；状态/操作由服务端迁移矩阵约束'),f('挂载资源 selectedRow.resourceId','单选','','','','只有一个当前资源；不使用部门关系id代替'),f('映射 itemList/resourceList','array','','[]','','resourceList:[{resourceId}]，itemList含映射字段；id为当前目录ID')],
 [control('查询/重置/分页','八组筛选','列表datas/total；状态值从字典取得，不推测数字含义'),control('新增/编辑/变更','合法目录状态','路由/resources/edit及optType；/catalogue/edit只读详情，不按路径名当编辑'),control('批量送审/发布/下架/删除','当前有效目录ID集合','人工确认；up/down/remove均使用DELETE且body为ID数组；取消不请求'),control('关联/取消关联资源','目录与resourceId','选择资源、读取信息项、映射后提交；取消关联{id}；不是删除物理资源')],
 ['加载字典/部门后按筛选查询；服务端状态决定可用动作。','送审POST /processapproval目录ID数组；发布up、下架down和删除remove采用各自DELETE操作，不合成通用状态更新。删除提示可在回收站查看，不据此保证所有后端级联可逆。','挂载步骤先选授权资源再建立信息项映射，提交itemList/resourceList/resourceType/id；取消关联只改变目录关联。','成功后回读目录状态及列表；并发审核/发布变化应拒绝旧状态操作，不能仅依按钮隐藏。'],
 [m('目录分页','POST','/mgtcatalogue/page','筛选+pageRequest','datas/total'),m('送审','POST','/processapproval','目录id数组'),m('发布','DELETE','/mgtcatalogue/up','目录id数组'),m('下架','DELETE','/mgtcatalogue/down','目录id数组'),m('删除','DELETE','/mgtcatalogue/remove','目录id数组'),m('资源关联','POST','/mgtcatalogue/resource/resourceRelation','{itemList,resourceList:[{resourceId}],resourceType,id}'),m('取消关联','DELETE','/mgtcatalogue/resource/cancelRelation','{id}'),api('现有信息项','POST','catalogue','/tcatalogueitem/list','{catalogueId}','信息项数组')],
 '上部目录名、部门、类型、提供方式、审批/发布状态、挂载及级联筛选；操作条后为选择表和行操作、分页。挂载弹窗先资源表再字段映射，返回保留原目录上下文。',
 ['全部筛选/字典和分页按同条件回读，不把approveStatus与publishStatus合并。','新增/编辑进resources/edit，目录查看不误开放写入。','发布/下架/删除分别DELETE且ID数组正确；取消无请求；状态冲突有提示。','关联传resourceId和当前目录id，取消关联不删源；缺映射阻止提交。','重复/超时先回读状态；直接API状态越权及跨部门目录拒绝。']);
profile('compileInitiated','查询本人发起的编目流程，查看历史及在允许状态撤回。',[
 input('目录名称 catalogueName'),select('部门 deptId'),select('资源类型 resourceType'),select('提供方式 provideType'),select('是否级联 shareable'),select('流程类型 processType'),select('审批状态 approveStatus'),...paging,ro('目录 catalogueId','用于读取目录内容'),ro('流程 actId','用于历史/撤回，不替换为目录ID'),ro('行审批状态/发起时间/catalogueStatus','按服务端返回展示；catalogueStatus=2仅为撤回入口条件，不是筛选字段')],
 [control('查询/重置/分页','本人发起范围','POST本人流程页'),control('详情/撤回','流程actId及目录catalogueId','详情读取两类ID；状态2才显示撤回；确认后DELETE流程')],
 ['按本人可见范围读取流程；选择行进入DCS-529目录和流程历史。','撤回仅在服务端允许状态执行，客户端状态2仅决定入口，不保证执行时仍可撤回；成功回读状态。','撤回超时先查历史与流程状态；审批已完成或他人流程拒绝，不伪造删除审批记录能力。'],
 [m('本人编目流程','POST','/processapproval/page/myself','筛选+pageRequest','datas/total'),m('撤回编目流程','DELETE','/processapproval/{actId}','path流程actId','回读流程，不等于删除目录')],
 '本人发起流程筛选区、列表状态/发起时间与详情/条件撤回入口，底部分页；撤回确认显示当前目录及影响。',
 ['本人流程分页及名称/部门/资源类型/提供方式/级联/流程类型/审批状态条件正确。','详情带catalogueId和actId，分别读取对象及历史。','仅允许状态可撤回；取消无DELETE，成功回读而不删除目录。','并发审批后撤回被拒绝；超时先查流程，不重复撤回。','替换其他人actId或目录ID被拒绝，历史记录保留。']);
const approvalFields=[ro('目录 catalogueId/id','目录详情定位，与流程ID分开'),ro('流程 actId/taskId','当前流程及任务上下文'),ro('基础信息/信息项/挂载资源','复用编目只读结构，不显示可保存编辑控件'),input('审核意见 opinion','审核时是','','trim后非空目标'),f('审核附件 ossFileIds','附件引用','','[]','每个≤10 MiB','共享Approval选择文件即上传；accept=*不代表服务端允许任意类型'),ro('操作历史 approvalHistory','时间、操作者、意见及结论按服务返回，不臆造完整DTO')];
profile('compileDetail','查看编目目录和审批历史，在待办上下文提交通过或驳回。',approvalFields,
 [control('基础/信息项/挂载/历史页签','catalogueId及actId','分区只读加载，不能把发起者详情变为审核权限'),control('附件选择/移除/取消','可审核时文件','共享Approval即时上传；引用移除与临时文件清理分开'),control('通过/驳回','当前taskId、意见有效','POST approve，pass=1通过、pass=2驳回；发起者查看不开放审核')],
 ['用catalogueId读取目录，用actId读取历史；两者任一失败分别提示。','审核时trim意见非空；文件≤10 MiB，等于上限客户端可接受；服务端再验类型、大小及归属。','审核提交{actId,opinion,pass,ossFileIds,taskId}；成功回读任务状态和历史；未知结果不得重复批准。历史包装器尾随空格须按核查记录修正及契约联调。'],
 [m('目录详情','GET','/mgtcatalogue/{catalogueId}','path目录ID','目录及itemList/resourceList'),m('审批历史','GET','/processapproval/approval/history/{actId}','path流程ID；目标规范URI无尾随空格','历史数组；当前包装器问题见核查记录'),m('编目审批','POST','/processapproval/approve','{actId,opinion,pass,ossFileIds,taskId}；pass=1/2','回读任务/历史，非订阅boolean协议')],
 '顶部详情标题，主体按基础信息、信息项、挂载和审批记录分区；只有待办审核上下文显示意见、附件及驳回/通过。只读发起者查看保留返回，不复制新增表单。',
 ['catalogueId读取目录，actId读取历史；查看模式不能审核。','意见空白阻止；10 MiB等于与超过边界按共享组件规则并由服务端复验。','pass=1/2、taskId及ossFileIds准确，不混订阅协议。','历史尾随空格修复后验证编码ID；失败不显示空历史成功。','重复/并发审批只有一次效果，失权拒绝；取消可能已有临时上传需清理。']);
profile('compileHandled','分别查看编目待办和已办流程，并进入对应只读或审核详情。',[
 select('待办/已办页签 activeName','','切换对应todo/done'),input('目录名称 catalogueName'),select('部门 deptId'),select('资源类型 resourceType'),select('提供方式 provideType'),select('是否级联 shareable'),select('流程类型 processType'),f('分页 pageRequest','object','是','{pageNo:1,pageSize:20}','','切页签回第1页'),ro('catalogueId/actId/taskId','三个ID独立；待办才可操作任务')],
 [control('待办/已办切换及查询','当前用户任务','分别POST todo/done，清除旧任务选择'),control('详情/审核','当前目录和任务','进入DCS-529对应模式；直接URL仍验权')],
 ['默认读取当前页签任务，提交pageRequest 1/20；切换页签清理旧详情与任务ID。','已办只读；待办审批使用独立compileDetail协议，不把“已处理”按钮状态视为后端完成。','加载失败保留查询；已被别人处理的任务回读后禁审核。'],
 [m('编目待办','POST','/processapproval/page/todo','筛选+pageRequest(1/20)','datas/total'),m('编目已办','POST','/processapproval/page/done','筛选+pageRequest(1/20)','datas/total')],
 '顶部待办/已办页签，筛选与任务表、底部分页；详情连接显示当前任务状态，已办无提交审核按钮。',
 ['todo与done独立且默认1/20。','切页签清旧taskId并重置页号；已办详情只读。','当前用户无任务显示合法空态，权限或网络失败不伪装为空。','并发处理后重新读取，重复点击详情不串行。','直接其他人的taskId被拒绝；会话切换丢弃旧任务响应。']);
function entity(kind,label,base,fields,filterFields,flow,extra=[]){
 profile(kind+'List','检索并维护'+label+'基础对象，保留与部门及引用对象的关系。',[
  ...filterFields,...paging,ro('对象 id','行稳定ID，不用名称定位'),...fields.map(r=>ro(r[0],'列表仅显示实际返回列，编辑全字段见对应表单'))],
  [control('查询/重置/分页','筛选草稿','筛选回首页，校验datas/total；清理失效选择'),control('新增/编辑/详情','授权对象ID','新增空表单；编辑先GET详情，view模式禁写；返回保留列表条件'),control('删除','选定稳定ID及可删除状态','确认引用影响后DELETE；失败保留行；成功回读'),...extra.map(e=>control(...e))],
  ['加载授权候选后查询'+label+'；部门/类型条件保持原ID类型。','新增、编辑和详情分别进入对应表单，更新不重建ID；'+flow,'删除时后端验证引用、权限及并发；关联事项、应用或目录存在时按契约阻止/处理，不自行级联删除。'],
  [m(label+'分页','POST',base+'/page','筛选+pageRequest','datas/total'),m('删除'+label,'DELETE',base+'/{id}','path对象ID'),...(kind==='application'?[m('导入模板','GET','/appsystem/excel/template','rawData/blob','模板文件'),m('系统导入','POST','/appsystem/excel/import','FormData code=0,file','逐行/批次结果契约需联调，不默认全成功')]:[])],
  '顶部'+label+'筛选与查询/重置，其下新增和适用导入工具条、业务表及行编辑/详情/删除，底部分页；表单作为独立路由打开。',
  ['按'+label+'名称/部门及适用类型条件查询，分页和总数一致。','新增空模型；编辑GET当前id；详情禁写，返回恢复查询。','确认删除正确id；取消无DELETE；引用冲突不移除行。','断网/重复删除先查对象，后发筛选优先；批次导入按实际结果处理。','越权对象/部门与并发修改由服务端拒绝，名称不能当ID。']);
 profile(kind+'Form','新增或修改'+label+'并保持关联对象一致。',fields.concat([ro('对象 id','新增由保存结果确定；编辑来自路由并通过详情回读')]),
  [control('字段输入/blur/change','字段规则及有效候选','trim仅按字段定义；依赖加载失败禁提交'),control('部门/关联项选择','授权部门ID','相关候选随部门重载，清理不兼容旧值'),control('提交/取消/返回','适用字段全部有效','新增POST；编辑PUT当前id；view禁写；离页有草稿确认')],
  ['新增初始化本节默认值；编辑GET当前id后回填，候选与模型同时校验；详情模式只读。',flow,'本地通过后服务端重新校验授权、必填、唯一性与引用范围；写成功回读并返回列表；超时结果未知先查，不重复新增。'],
  [m('读取'+label,'GET',base+'/{id}','path id','本节字段模型'),m('新增'+label,'POST',base,'本节有效字段；生成ID契约需联调'),m('编辑'+label,'PUT',base+'/{id}','path id+有效字段；并发版本契约需联调'),api('部门树','POST','user','/dept/tree','','部门树'),...(kind==='matter'?[m('部门业务候选','POST','/tbusiness/list','{deptId}','数组')]:kind==='application'?[m('部门事项候选','POST','/tmatter/list','{deptId}','数组')]:[])],
  label+'独立表单顶部新增/编辑/详情标题；'+(kind==='business'?'部门、业务名称，随后全宽业务说明。':kind==='matter'?'基本信息分组，名称/编码、类型/分类双列；业务信息分组含部门、关联业务及办理项名称/编码。':'名称、数源单位、类型/安全等级、承载网络、垂管状态、关联事项及全宽备注。')+'底部取消/提交；错误靠近字段，详情无可写操作。',
  ['新增默认与编辑回填一致，id保持稳定，详情禁写。','逐个必填和长度边界、纯空白、无效候选阻止，错误定位到字段。',flow+' 验证实际请求模型及关联回读。','失败保留安全草稿，取消不保存；超时先查询结果，不重复新建。','直接ID越权/引用失效/并发修改拒绝；同提交共享锁。']);
}
entity('business','业务','/tbusiness',[select('内部部门 deptId','是','授权部门树','null'),f('业务名称 businessName','文本','是','空字符串','≤100','trim','请输入业务名称'),f('业务说明 businessDesc','多行文本','是','空字符串','≤300','trim','请输入业务说明')],[input('业务名称 businessName'),select('部门 deptId')],'部门、业务名称、说明均必填；修改部门后所有已引用事项的范围兼容需服务端校验。');
entity('matter','事项','/tmatter',[
 ...['matterName','matterCode','businessItemName','businessItemCode'].map((key,i)=>f(['事项名称','基本编码','业务办理项名称','业务办理项编码'][i]+' '+key,'文本','是','空字符串','≤100','trim')),
 select('事项类型 matterType','是','字典matterType；value parseInt'),select('事项分类 matterCategory','是','字典matterCategory；value parseInt'),select('内部部门 deptId','是','部门树','null'),select('关联业务 businessId','是','POST tbusiness/list {deptId}','空字符串')],
 [input('事项名称 matterName'),input('基本编码 matterCode'),select('部门 deptId'),select('事项类型 matterType'),select('事项分类 matterCategory'),input('业务名称 businessName')],'部门change立即清businessId，重取本部门业务；8字段均必填，事项/业务关联必须同授权范围。');
entity('application','应用系统','/appsystem',[
 f('系统名称 systemName','文本','是','空字符串','≤100','trim'),select('数源单位 deptId','是','部门树','null'),select('系统类型 systemType','是','systemType字典'),select('信息系统安全等级 securityLevel','是','securityLevelType字典'),f('承载网络 bearNetworks','多选','是','[]','','bearNetworkType；join(",")映射bearNetwork'),ro('承载网络 bearNetwork','逗号串；读取split(",")'),select('垂管状态 mgtStatus','是','mgtStatusType字典'),f('关联事项 matterIds','多选','是','[]','','POST tmatter/list {deptId}'),input('备注 remark','','≤300','trim')],
 [input('系统名称 systemName'),select('数源单位 deptId'),select('系统类型 systemType'),select('垂管状态 mgtStatus'),select('安全等级 securityLevel')],'部门change清matterIds并加载本部门事项；bearNetworks.join(",")提交bearNetwork，编辑读回split并对systemType/mgtStatus/securityLevel转字符串保持候选匹配。',[['模板/导入','有维护权限的文件','选择文件可能立即上传；模板blob、导入FormData单列处理']]);
profile('hubApproval','审核机构上报目录，区分待办/已办和通过/退回两个服务动作。',[
 select('待办/已办 todoPage','是','true待办/false已办'),input('目录名称 catalogueName'),select('业务类型 businessType'),select('审批状态 approvalStatus','待办筛选'),select('审批动作 approvalAction','已办筛选'),...paging,
 ro('上报目录 id/actProcessId/taskId','目录、流程、任务ID分开'),input('审核意见 opinion','审核时是','','trim后非空'),f('附件 ossFileIds','附件引用','','[]','每个≤10 MiB','共享Approval即选即上传')],
 [control('待办/已办/查询','todoPage及对应状态筛选','切页签清不适用条件'),control('查看/审核','当前id与actProcessId/taskId','GET双ID详情；通过submitTask，驳回rejectTask，各自POST'),control('附件/取消','可审核上下文','选择可能已上传；取消不承诺未发请求')],
 ['按todoPage查询audit/page，取得当前上报目录及流程上下文；只读详情不开放审批。','GET view/{id}/{actProcessId}，按返回规范化字符串枚举；意见和附件验证通过后选择独立服务动作。','请求{id,opinion,ossFileIds,taskId,actProcessId}；成功回读上报状态及历史；不使用编目pass=1/2或订阅pass=true/false。'],
 [h('上报审核页','POST','/tcataloguehub/audit/page','todoPage及筛选+pageRequest','datas/total'),h('上报详情','GET','/tcataloguehub/view/{id}/{actProcessId}','path目录id及流程id','基础/信息项等'),h('通过','POST','/tcataloguehub/submitTask','{id,opinion,ossFileIds,taskId,actProcessId}'),h('驳回','POST','/tcataloguehub/rejectTask','同上，独立动作')],
 '上方待办/已办及筛选区，中间目录表和分页；独立审核详情呈现目录/信息项及意见附件，下部驳回/通过，已办只读。',
 ['todoPage true/false及对应筛选正确；切换清旧任务。','详情同时带id/actProcessId，不取编目actId替代。','空白意见阻止，10 MiB附件按共享组件验证；通过/驳回分别POST。','超时回读任务；并发已办拒绝再次处理，失败不显示通过。','直接目录/流程/文件ID越权拒绝，取消清临时附件引用。']);
profile('accessList','维护机构接入、共享审批开关及授权状态。',[
 input('机构名称 orgName'),select('授权状态 authStatus','','空字符串全部/0未授权/1已授权','空字符串'),...paging,ro('机构接入 id/orgId/orgName','接入记录id与关联机构orgId分开'),ro('接入模式 accessMode','1租户/2独立部署'),ro('状态 shareApproval/授权状态','展示实际状态；切换写入独立授权')],
 [control('查询/新增/编辑/查看','接入记录id','列表读取后打开机构表单；view只读'),control('删除','可删除机构接入','确认引用影响后DELETE接入记录'),control('共享审批开关','授权接入id','disable/enable独立POST，不只修改开关本地值'),control('授权/取消授权','明确机构及目录分类范围','authorize及authorize/cancel；执行后回读；未知结果先查')],
 ['按授权机构范围读取accessorganization/page，不把关联租户候选等同完整访问权限。','新增编辑由DCS-514/533；删除/共享审批/授权不同副作用分别确认和服务端校验。','授权取消后既有订阅、缓存和在途请求的撤销时点由契约定义，客户端成功提示不能证明全部权限已收回。'],
 [h('机构页','POST','/accessorganization/page','筛选+pageRequest','datas/total'),h('删除接入','DELETE','/accessorganization/{id}','path接入ID'),h('关闭共享审核','POST','/shareApproval/disable/{id}','path接入ID'),h('开启共享审核','POST','/shareApproval/enable/{id}','path接入ID'),h('授权','POST','/authorize/{id}','path接入ID'),h('取消授权','POST','/authorize/cancel/{id}','path接入ID')],
 '机构筛选、操作工具条及接入列表；行含新增/编辑/查看、共享审批和授权动作；开关忙碌禁重复，失败回滚显示并重新读取。',
 ['机构列表及筛选/分页保持范围。','新增编辑和只读详情模式正确，接入id不混orgId。','共享审核、授权、取消授权分别正确POST；取消确认不发请求。','开关失败恢复真实状态；结果未知先读，不能仅翻转UI。','他机构操作拒绝；撤销后的直接URL/API/附件权限按契约验证。']);
profile('accessForm','新增或维护机构接入信息和目录分类授权，按接入方式配置下行来源。',[
 f('接入模式 accessMode','单选','是','1','1租户/2独立部署','切换清理不适用来源'),select('关联机构 orgId','是','tenant/list候选；非新增禁改'),input('机构名称 orgName','是','2～20','校验器上限20，DOMmaxlength200不放宽'),input('统一社会信用代码 creditCode','','18','填写时18位数字或英文字母；现有正则允许小写'),
 select('省/市/区 provinceCode/cityCode/districtCode','','Region级联；上级变化清下级'),ro('所属区域 regionName','由省市区名称组成'),input('机构地址 orgAddress','','填写时2～60'),input('联系人 orgContact','','≤200'),input('联系电话 orgMobilephone','','','空允许；非空按tel/phone校验'),
 select('下行数据库 datasourceId','独立部署非view时','仅enabled来源且driver.testConnInfo为MYSQL'),ro('目录下行库 datasourceName','详情展示名称'),select('授权部门目录分类 deptCategoryId','是','categoryType=3；非新增禁改'),f('授权基础分类 _baseCategoryId','多选','','[]','','categoryType=1；join逗号串映射baseCategoryId'),f('授权主题分类 _themeCategoryId','多选','','[]','','categoryType=2；join逗号串映射themeCategoryId'),
 f('共享审核/接入类型 shareApproval/accessType','提交模型','','1 / 2','','保留来源值，不推导完整状态机'),ro('上行AppKey appKey','详情仅授权查看，不写入日志'),ro('上行AppSecret appSecret/_appSecret','默认仅掩盖匹配尾部24字符；客户端仍有原值；显示/隐藏不构成F12保护'),
 ro('遗留校验字段 frontDbId/frontFtpId','当前模板未渲染，不能因此要求用户填写隐藏必填项；其遗留rules不证明有效输入控件')],
 [control('模式/省市区/分类变化','授权候选','按模式显示下行数据库；省清市区、市清区；分类选择保留0根ID语义'),control('显示/隐藏密钥','具备秘密查看权限的详情','只更改遮蔽；访问和审计独立；不复制到普通表格/日志'),control('重置密钥','具备单独重置权限','POST appKeySecret/rest/{id}立即改变密钥；不等待主表单提交；执行前明确确认'),control('提交/取消/返回','有效字段与候选','POST新增/PUT编辑；隐藏字段不参与错误阻塞；放弃未保存草稿不撤销已重置密钥')],
 ['加载tenant/list、三类分类树、MYSQL/SFTP可用来源；新增默认shareApproval=1/accessMode=1/accessType=2，来源加载不成功禁相关保存。','编辑读回基础和主题逗号串为数组；提交join回baseCategoryId/themeCategoryId。orgId及deptCategoryId非新增禁改；服务端仍拒绝参数篡改。','独立部署且非view显示datasourceId；frontDbId/frontFtpId仅有遗留rules未渲染，不作为当前可填写字段。','提交与密钥重置分开处理；重置成功重新获取详情，旧密钥失效/宽限及保管必须由密钥生命周期契约定义。'],
 [h('机构详情','GET','/accessorganization/{id}','path接入记录ID','表单字段，密钥受独立权限'),h('新增机构','POST','/accessorganization','有效表单字段+两类分类逗号串'),h('编辑机构','PUT','/accessorganization/{id}','path id及有效字段'),h('关联机构候选','GET','/accessorganization/tenant/list','','授权候选'),h('分类树','POST','/tcategoryhub/treelist','{categoryType,allCategory:false,categoryAccessId}','分类树'),h('行政区域','POST','/dsesregion/list','{parentCode,regionLevel}','下一级候选'),api('来源候选','POST','source','/datasource/micro/my/use/page','{enabled:true}','datas，MYSQL/SFTP按testConnInfo过滤'),h('密钥重置','POST','/appKeySecret/rest/{id}','path接入ID；rest为现有拼写','有立即副作用，不属于本次取证执行范围')],
 '首行接入模式/关联机构，随后机构名称/信用代码、区域/地址、联系人/电话，条件下行库；授权部门/基础/主题分类在下方，底部取消/提交。详情附下行库名称及AppKey/遮蔽AppSecret和显示/重置入口，长表单纵向滚动。历史首屏不覆盖所有详情秘密区域。',
 ['新增默认1/1/2及编辑回填；orgId/deptCategoryId禁改仍服务端复验。','名称2～20、信用代码18、地址2～60、电话和联系人长度逐边界；隐藏遗留rules不阻塞。','独立模式显示MYSQL来源，切租户不带无效下行值；省市区级联清旧值，分类join/split一致。','取消主表单不承诺撤销已重置密钥；超时先读机构/重置审计，禁盲重试。','秘密显示及重置独立授权、脱敏审计；不能声称浏览器F12无法读取客户端原密钥。']);
const categoryFields=[select('父级 parentCategoryId','是','树候选；根id=0有效'),input('分类名称 categoryName','是','2～16中文字符','DOMmax16与正则2～20冲突，目标采用交集'),input('节点编码 nodeCode','是','≤16'),input('匹配关键字 matchKey','','≤50'),
 f('分类类型 categoryType','integer','是','3','3部门/1基础/2主题','由当前页签提供'),f('级联/来源 cascadeType/sourceModuleType','integer','是','1 / 2','','提交固定值来自当前调用，不扩成所有枚举'),f('顺序 seq','number','是','新增1','','编辑保留原值；移动±1'),ro('uuid/id','修改保留行uuid及id')];
profile('categoryList','按部门、基础及主题分类树维护目录分类与编码规则。',[
 f('分类页签 categoryType','integer','是','3','3/1/2','部门/基础/主题'),ro('树节点 id/parentCategoryId/categoryName/nodeCode/seq','树结构非普通分页；根id0有效'),
 f('编码总位数 categoryDigit','数字文本','是','','非负整数','当前正则最长21位后Number可能失精度，目标限定服务契约安全整数'),f('各级规则 categoryRuleDos','array','是','','','{ruleLevel,ruleDigit}；ruleDigit≥1，各级合计≤categoryDigit'),ro('当前序列/首尾节点','移动仅同父级兄弟范围')],
 [control('分类页签/树展开','categoryType','POST treelist，无普通列表分页'),control('新增/编辑/删除','当前树及节点','表单DCS-516/534；删除服务端校验子节点/目录引用，不自行级联'),control('上移/下移','非首/末兄弟节点','POST {id,parentCategoryId,seq:原seq±1}；并发序号冲突回读树'),control('编码规则设置/加级/删级/确认','完整categoryDigit及逐级ruleDigit','GET load；新增级默认3；整数且总和≤总位数才POST setting')],
 ['切分类类型重新读取树并清选中；不能将树当pageRequest普通分页。','节点移动保留父级，首尾禁越界；修改父级是否允许由表单禁用及后端契约共同限制，禁止环和重复编码。','编码规则弹窗加载categoryDigit/categoryRuleDos，编辑/加删级后校验总和并提交；0不按falsy直接当空，禁止不安全数值转换；规则变化对已有目录编码的策略需后端交付。'],
 [h('分类树','POST','/tcategoryhub/treelist','{categoryType}','树数组'),h('删除节点','DELETE','/tcategoryhub/{id}','path节点ID'),h('上移','POST','/tcategoryhub/moveUp','{id,parentCategoryId,seq:原seq-1}'),h('下移','POST','/tcategoryhub/moveDown','{id,parentCategoryId,seq:原seq+1}'),h('读取编码规则','GET','/categoryRuleHub/load','','categoryDigit/categoryRuleDos'),h('设置编码规则','POST','/categoryRuleHub/setting','{categoryDigit:Number值,categoryRuleDos:[{ruleLevel,ruleDigit}]}','业务结果与历史编码兼容需联调')],
 '顶部部门/基础/主题分类页签及操作工具条，中间可展开树表、节点行新增/编辑/删除及上下移动；编码规则为独立窄弹窗，顶部总位数、逐级位数及加删入口，底部取消/确认。',
 ['类型3/1/2各读正确树，id0为合法根，不发普通分页。','新增编辑字段及uuid/seq保持；删除子节点/引用冲突不提前移除。','首末兄弟禁移动，中间节点只同父级±1，冲突回读。','规则各级≥1、合计≤总位数；超大整数/空/负数拒绝，取消不POST。','越权分类和环/编码冲突由服务端拒绝；规则变化不静默重写历史编码。']);
profile('categoryForm','在当前分类类型下新增或修改目录分类节点。',categoryFields,
 [control('父级/名称/编码/关键字','当前categoryType','父级非新增禁改；2～16中文名；编码≤16'),control('确认/取消/关闭','有效节点草稿','新增POST、修改PUT；取消只丢本地草稿，不改变树')],
 ['从当前类型和父节点打开，新增seq=1；编辑保留原seq/uuid/id且父级只读。','提交{categoryType,...form,cascadeType:1,sourceModuleType:2,seq,uuid}，名称采用2～16中文目标，编码唯一性/作用域由后端契约验证。','成功重读当前树并恢复可用选中；写失败保留草稿，不把0父级判空；未知结果先查节点和编码再新增。'],
 [h('读取节点','GET','/tcategoryhub/{id}','path节点ID','节点字段'),h('新增节点','POST','/tcategoryhub','categoryType+form+cascadeType=1/sourceModuleType=2/seq=1/uuid'),h('修改节点','PUT','/tcategoryhub/{id}','path id；保留seq/uuid')],
 '树表上方居中弹窗，依次父级分类、分类名称、节点编码、匹配关键字；父级树下拉可滚动，编辑禁改父级，底部取消/确认。',
 ['新增从当前父级/类型初始化，编辑保留id/uuid/seq且父级禁改。','中文名1/2/16/17、节点码16/17、关键字50/51及根id0边界。','POST或PUT对象准确，重复编码/引用失效显示业务错误。','取消不写；超时先查节点，重复确认仅一个业务效果。','直接父级/类型/节点ID越权及环关系服务端拒绝。']);
const subscriptionFields=[
 ro('目录 catalogueId/catalogueDo','catalogueDo:{catalogueName,deptId,provideId,resourceType,provideName}，目录ID和发布方ID保留'),
 select('申请取数方式 detailForm.resourceType','是','由provideType拆分并排除queryAppliedProvideTypes；提交provideType；不同于物理resourceType','空字符串'),input('申请说明 applyFromData.applyDesc','是','≤200','非空目标trim'),input('申请依据 applyFromData.applyBasis','','≤200'),
 f('所选信息项 catalogueItemList','array','当前内联取数方式provideType不等于2时至少1','[]','','[{catalogueItemId,cascadeGuidItem}]；不是完整字段对象'),
 f('申请附件 newbaseFiles/ossFileIds','附件引用','','[]','最多5个；每个<200 MiB','选择即FormData上传code=0/file；等于200 MiB拒绝'),
 f('有效访问时间 catalogueGsbApplyDo.validityDate','datetimerange','取数方式4时','空字符串','','拆为validityStartTime/validityEndTime；清空同时清两者'),input('消费IP catalogueGsbApplyDo.systemIp','方式4时','','IPv4四段0～255'),select('访问类型 catalogueGsbApplyDo.timeType','方式4时','timeTypeList候选'),input('访问次数 catalogueGsbApplyDo.configLimitFreq','方式4时','当前maxlength5','目标正整数；原输入过滤仍允许点，不据此保证整数'),
 input('资源用途 catalogueGsbApplyDo.applyDesc','方式4时','≤200'),input('服务申请依据 catalogueGsbApplyDo.applyBasis','方式4时','≤200'),ro('申请/审批状态','后端状态机与取数授权终态独立，不以提交成功当获准')];
const subscriptionAPI=[mall('目录详情','GET','/applycatalogue/catalogue/{catalogueId}','path目录ID','目录及信息项/资源'),mall('已申请方式','POST','/applycatalogue/queryAppliedProvideTypes','{catalogueId}','已申请provideType集合'),mall('提交申请','POST','/applycatalogue','{catalogueId,provideType,applyDesc,applyBasis,ossFileIds,catalogueItemList,catalogueDo,catalogueGsbApplyDo}','申请受理；回读流程，不等于已有取数权限'),api('申请附件上传','POST','catalogue','/oss/applycatalogue/catalogueSubscribe/upload','FormData {code:0,file}','文件引用字段按真实契约确定'),api('申请附件下载','GET','catalogue','/oss/applycatalogue/catalogueSubscribe/download/{id}','encodeURIComponent(id)；rawData/blob','授权校验后下载，错误体不作正常文件')];
function center(key,department){
 profile(key,(department?'按部门和目录属性':'在级联目录中心')+'检索目录，查看详情、收藏、申请订阅及导出选中目录。',[
  input('目录名称 catalogueName'),...(department?[select('部门 deptId'),select('资源类型 resourceType'),select('安全等级 securityLevel'),select('是否级联 shareable')]:[input('提供方 provideName'),select('提供方式 provideType')]),...paging,ro('目录行 id/catalogueName/provideName/provideType','稳定目录ID与提供方/部门ID分开'),...subscriptionFields],
  [control('查询/重置/分页','已授权目录范围','只取当前过滤；收藏与申请入口独立验权'),control('详情/收藏/取消收藏','目录catalogueId','详情只读；收藏POST {catalogueId}；部门中心取消按catalogueId删除'),control('申请取数方式/信息项','有效可申请方式','排除已申请方式；方式4显示服务访问字段；清时间清两端；每次提交重新计算两表单校验结果'),control('申请附件/提交/取消','有效申请及文件','选择可能立即上传；取消清引用并按TTL清临时对象；提交只表示受理'),control('选中导出','非空已选目录ID数组','POST export仅导出选中ID，不宣称按条件导出全部')],
  ['读取目录页；进入/cataCenter/detail时区分optType=view/apply，获取目录详情与已申请方式；不能把目录可见当数据可读。','内联申请detail路径：方式4必填有效时间、消费IP、访问类型/次数及用途/依据；提交校验按detailForm.resourceType即所选provideType不等于2要求选信息项，不能按物理资源类型解释；信息项表显示条件另按applyDetail.resourceType；历史/cataCenter/applyDetail路径仅type=1校验信息项，两个路径差异须统一目标及契约。','每次提交先将isDetailForm/isApplyForm重置为false，再等待当前两表单有效；validityDateChange清空时清起止，不使用上次成功状态或旧时间。','附件最多5个且单个<200 MiB；提交subscription模型，服务端检查重复方式、信息项与目录版本；结果未知先查申请/流程，不能再次创建。','收藏与订阅不同；导出仅当前有效选中ID并逐目录校验权限，下载失败不保存错误体。'],
  [...(department?[mall('部门目录页','POST','/deptCatalogueCenter/findCataloguePage','catalogueName/deptId/resourceType/securityLevel/shareable+pageRequest','datas/total')]:[mall('级联目录页','POST','/applycatalogue/catalogue/page','catalogueName/provideName/provideType+pageRequest','datas/total')]),mall('收藏','POST','/tucataloguefavorite','{catalogueId}'),...(department?[mall('取消收藏','DELETE','/tucataloguefavorite/catalogue/{catalogueId}','path目录ID')]:[]),mall('选中导出','POST','/applycatalogue/export','body选中目录ID数组；rawData/blob','文件响应'),...subscriptionAPI],
  '顶部目录筛选和工具条、目录列表与底部分页；详情按基础信息、信息项、挂载/服务说明分区。申请区域有取数方式、条件服务字段、信息项选择、说明依据和附件，底部返回/提交；目录页不显示虚构手工CRUD。',
  ['目录过滤/分页与提供方/部门范围一致；详情只读与申请模式分开。','收藏传catalogueId，取消按正确目录ID；导出只含当前选中ID。','已申请方式禁选；方式4校验IP/时间/次数/两项200字；内联取数方式不等于2时信息项至少1，和物理资源类型分别验证。','200 MiB等于拒绝，最多5附件；取消可能已有上传；校验失败不沿用isDetailForm旧值，清时间清两端。','重复申请/字段越权/并发目录变更拒绝；超时先查申请终态，提交受理不显示已授权。']);
}
center('center',false);center('deptCenter',true);
function inventory(key,negative){profile(key,'按目录分类和元数据查询'+(negative?'负面':'责任')+'清单；清单由业务规则产生，不能按通用表单任意增删。',[
 input('目录名称 catalogueName'),select('分类 categoryId','','category/treelist树'),select('资源类型 resourceType'),select('更新周期 updateCycle'),...(negative?[]:[input('事项名称 matterName')]),...paging,ro('目录/部门/分类及清单结果','按返回字段展示；规则版本/截止时间由服务契约交付')],
 [control('分类树/查询/重置/分页','授权分类及有效条件','切分类回首页，清理旧选择'),control('目录详情','当前目录ID','只读查看元数据；不新增或删除责任/负面记录')],
 ['读取分类树，再按当前条件读取清单分页；责任清单含matterName筛选，负面清单无该条件。','无匹配、分类失败、无权限和清单计算失败分别提示；不得据名称推导负面判定或责任归属算法。','详情按当前目录权限读取；清单规则、去重及更新时间需受控契约，不依当前样本写死。'],
 [mall('清单分类','POST','/category/treelist','分类树参数按页面上下文','树'),mall('清单页','POST',negative?'/manifest/negative/page':'/manifest/responsibilities/page','筛选+pageRequest','datas/total')],
 '上部名称/分类/类型/周期'+(negative?'':'/事项')+'筛选，主体清单表及目录详情入口，底部分页；无人工新增、编辑或删除清单按钮。',
 ['分类和'+(negative?'负面':'责任')+'接口及筛选字段一致。','分类change重置分页，空集合显示合法空态。','详情只读且按目录ID，不把清单行当可维护对象。','依赖失败/超时保留查询，旧分类结果不覆盖新分类。','服务端隔离分类及目录范围；规则版本/去重/更新时间与批准契约核验。']);}
inventory('duty',false);inventory('negative',true);
profile('subscribed','查看本人已申请或订阅目录及批准范围，在允许状态取消订阅。',[
 input('目录名称 catalogueName'),input('提供方 provideName'),select('提供方式 provideType'),...paging,ro('申请 id/catalogueId','id是applicationId；不替换为目录ID'),ro('申请状态/有效期/提供方式','实际批准的信息项、方式和时间受服务端授权'),...subscriptionFields.map(r=>ro(r[0],'申请详情只读，原申请与实际批准范围分别显示'))],
 [control('查询/详情','本人申请范围','myApplyPage和myApplyDetail/{id}读取'),control('取消订阅','当前applicationId','确认后DELETE applycatalogue/cancel/{id}；不删除目录本体'),control('返回/附件下载','有效申请及文件引用','回原分页；下载单独验权')],
 ['读取本人订阅页，按申请id进入详情，不用catalogueId替代申请ID。','取消订阅前确认当前批准方式及影响，服务端验证可取消状态；成功回读权限和申请状态。','取消不等于删除目录、收藏或其他申请；撤销时点及缓存/已导出数据处理由契约明确。'],
 [mall('本人订阅页','POST','/applycatalogue/myApplyPage','筛选+pageRequest','datas/total'),mall('申请详情','GET','/applycatalogue/myApplyDetail/{id}','path applicationId','申请详情'),mall('取消订阅','DELETE','/applycatalogue/cancel/{id}','path applicationId','回读申请及授权'),subscriptionAPI.at(-1)],
 '本人目录筛选、申请/订阅表及分页，行有详情与条件取消；详情只读显示申请方式、信息项、说明依据、附件及审批记录。',
 ['myApplyPage本人范围和分页正确。','详情传申请id，区分目录id及批准范围。','取消用applicationId；取消确认无DELETE，不删除目录/收藏。','超时先查申请及授权，重复取消无额外副作用。','其他人的申请/附件和撤销后的直接取数被拒绝。']);
profile('favorite','维护本人收藏关系并进入目录详情或申请。',[
 input('目录名称 catalogueName'),input('提供方 provideName'),select('资源类型 resourceType'),select('已订阅 hasSubscribe'),select('提供方式 provideType'),...paging,ro('收藏关系 favoriteRelationId','收藏列表取消用行id'),ro('目录 catalogueId','详情/申请用目录ID，不能和收藏关系ID互换')],
 [control('查询/详情/申请','本人收藏目录','分页读取收藏；进入目录详情/申请，按DCS-517细则'),control('取消收藏','收藏关系favoriteRelationId','DELETE tucataloguefavorite/{id}；和部门中心按catalogueId取消的路径不同')],
 ['读取本人收藏页；关系ID和目录ID分别保留。','取消只删除收藏关系，不撤销订阅，不删目录；成功回读当前页。','已下架或失权目录保留可理解的不可访问状态；不借收藏历史继续读元数据或数据。'],
 [mall('收藏页','POST','/tucataloguefavorite/page','筛选+pageRequest','datas/total'),mall('取消收藏','DELETE','/tucataloguefavorite/{favoriteRelationId}','path收藏关系ID','回读收藏集合'),subscriptionAPI[0]],
 '收藏筛选、目录表、详情/申请/取消收藏入口及底部分页；目录失效与空收藏分开显示。',
 ['本人收藏分页及过滤一致。','详情用catalogueId，取消用favoriteRelationId，路径不能互换。','取消不影响订阅或目录；最后一项取消后分页恢复。','超时先查关系，迟到结果不恢复已取消项。','其他人收藏ID和失权目录直接访问被拒绝。']);
function subscriptionWorkflow(key,handled){profile(key,(handled?'处理本人待办/查看已办':'查询本人发起的')+'目录订阅流程，保留申请、目录及任务上下文。',[
 ...(handled?[select('待办/已办 handleType','是','1待处理/2已处理','1'),f('分页 pageRequest','object','是','{pageNo:1,pageSize:20,order:[{prop:"id",asc:false}]}','','切页签回首页；使用独立search对象')]:paging),input('目录名称 '+(handled?'search.catalogueName':'catalogueName')),select('业务类型 '+(handled?'search.businessType':'businessType')),...(handled?[input('申请机构 search.applyOrgName')]:[select('审批状态 approvalStatus')]),ro('申请 id/businessKey','申请ID与流程业务标识，不替换catalogueId'),ro('任务 taskId/approvalRecordId','当前任务及审批记录'),ro('目录 catalogueDo/resourceDos/catalogueItemList/catalogueGsbApplyDo','详情只读；实际申请范围单独展示'),input('审核意见 opinion','待办审核时是','','trim后非空'),f('审批附件 ossFileIds','附件引用','','[]','每个≤10 MiB','共享Approval，不套申请附件200 MiB')],
 [control(handled?'待办/已办/查询':'查询/分页','本人流程/任务','读取对应服务；切页签清旧taskId'),control('详情/返回','当前申请及任务','workflow/detail/{id}，详情空返回报错；特殊pageTypeApproval返回go(-2)，普通go(-1)，目标确保回原来源'),...(handled?[control('通过/驳回','有效当前任务与意见','pass=true通过/false驳回，POST workflow/approve；已办只读')]:[])],
 ['从列表保留申请id/taskId/businessKey等上下文，读取workflow/detail/{id}得到目录、资源、信息项、服务申请及approvalRecordId。','发起者和已办详情只读；待办在独立服务端授权下审批，参数{id,taskId,pass,approvalRemark:opinion,businessKey,approvalRecordId,ossFileIds}，pass为boolean。','审批附件≤10 MiB；提交成功回读任务和历史，不能只凭toast证明数据已开放。未知结果先查，重复或并发任务由服务端防重。'],
 [...(handled?[mall('订阅待办','POST','/applycatalogue/workflow/todo','search:{catalogueName,businessType,applyOrgName}+pageRequest 1/20，order id降序','datas/total'),mall('订阅已办','POST','/applycatalogue/workflow/done','search:{catalogueName,businessType,applyOrgName}+pageRequest 1/20，order id降序','datas/total')]:[mall('本人发起订阅流程','POST','/applycatalogue/myStartWorkflowPage','筛选+pageRequest','datas/total')]),mall('订阅流程详情','GET','/applycatalogue/workflow/detail/{id}','path申请ID','catalogueDo/resourceDos/catalogueItemList/catalogueGsbApplyDo/approvalRecordId'),...(handled?[mall('订阅审批','POST','/applycatalogue/workflow/approve','{id,taskId,pass:boolean,approvalRemark,businessKey,approvalRecordId,ossFileIds}','回读任务/申请授权终态')]:[])],
 '列表上方'+(handled?'待办/已办页签与':'')+'筛选，中间流程表及分页；详情页基础/信息项/挂载或服务数据/操作记录页签，只有待办审核模式呈现意见附件和驳回/通过。',
 ['本人流程范围及'+(handled?'todo/done 1/20':'myStartWorkflowPage')+'正确。','详情读取申请id，保留taskId/businessKey/approvalRecordId；空返回不作成功。','发起/已办只读，待办pass=true/false及approvalRemark映射正确，不用编目pass1/2。','意见空白阻止；10 MiB附件及取消即时上传语义正确；未知结果先查。','并发审批单次效果、跨申请/任务/文件ID越权拒绝，返回原来源不跳错。']);}
subscriptionWorkflow('subscriptionInitiated',false);subscriptionWorkflow('subscriptionHandled',true);
const kinds={500:'internal',501:'agency',502:'resources',525:'resourceView',526:'resourceImport',527:'compile',503:'catalogue',528:'compile',504:'compileInitiated',529:'compileDetail',505:'compileHandled',506:'businessList',507:'businessForm',530:'businessForm',508:'matterList',509:'matterForm',531:'matterForm',510:'applicationList',511:'applicationForm',532:'applicationForm',512:'hubApproval',513:'accessList',514:'accessForm',533:'accessForm',515:'categoryList',516:'categoryForm',534:'categoryForm',517:'center',518:'deptCenter',519:'duty',520:'negative',521:'subscribed',522:'favorite',523:'subscriptionInitiated',524:'subscriptionHandled'};
const SUB=published.sub.entries.map(e=>({...e,kind:kinds[Number(e.id.slice(-3))]}));
const MAIN=published.main.entries.map((e,i)=>({...e,kind:i?'agency':'internal',route:i?'/dcs/analyze/agency':'/dcs/analyze/internal',sources:['../evidence/E038-catalog.png']}));
const all='DCS-001/002、DCS-500～534';
const NFR=[
 ['001','传输与秘密','TLS无混合内容；AppSecret、会话值和文件访问令牌不进入URL、普通日志、埋点或导出；遮蔽不能替代授权和TLS。','隔离环境检查请求/日志/缓存，用测试标记验证秘密零泄露；配置缺失不通过。',all],
 ['002','权限与隔离','服务端对机构/部门、目录/资源、流程任务、信息项和附件逐对象验权；导出、发布、授权、审核和密钥重置独立权限。','批准矩阵至少两组不相交机构/部门及只读/维护/审核身份；直接URL及ID替换、撤销、会话过期逐项拒绝。',all],
 ['003','密钥生命周期','AppSecret显示/重置单独授权和审计；明确轮换时点、旧钥失效、服务端保管与恢复，不在浏览器持久化秘密；失败不明文回退。','批准密钥契约及隔离测试旧/新钥、取消表单、并发重置、秘密脱敏；不得记录真实值。','DCS-513/514/533'],
 ['004','一致性与并发','导入防重复；保存/送审分步可恢复；发布/下架/撤回/审批按状态与版本原子校验；三类审批协议不混用。','注入双击、并发状态变更、第一步成功第二步失败、响应丢失；回读至多一次业务效果与完整审计，未知结果不盲重试。','DCS-502～505、DCS-512、DCS-523～529'],
 ['005','超时与恢复','每类请求交付有效有限超时矩阵，0/无限不合格；超时后1秒内恢复本地操作态；写结果未知先查。','按配置优先级覆盖路径规则/请求timeout/默认，故障注入断网、5xx、解析失败及迟到响应；1秒为本次恢复目标。',all],
 ['006','页面性能','目录/资源普通分页及详情冷启动P95≤4秒；交互本地反馈P95≤150毫秒；失败不以旧数据伪装新结果。','固定构建、Windows浏览器版本、4核8GB客户端、20Mbps/RTT50ms；记录服务/DB资源及数据；冷/热各30次，从导航到当前有效内容可操作；报P50/P95/P99/最大/失败数。',all],
 ['007','接口与查询容量','隔离目标：10万目录、100万信息项、1万机构节点，20独立会话并发查询，普通分页/详情P95≤2秒、P99≤5秒，非预期失败率≤1%。','预热2分钟、统计10分钟且有效样本≥1000；1秒思考、每会话最多1在途，记录实际QPS、索引/过滤复杂度、服务/DB配置；5xx/超时/解析/限流计失败，预期业务拒绝另报。','DCS-502/503/506/508/510/513/517～524'],
 ['008','统计正确性','统计各图同口径截止时间；0分母“-”，空结果清旧图，TOP5相对首行；排名排序/并列/去重/时区由批准口径提供。','使用冻结数据集验算四类资源、跨期端点、零分母、首行0、并列和权限切换；前端计算与后端业务总数分别核验。','DCS-001/002/500/501'],
 ['009','文件与临时对象','申请文件最多5且单个<200 MiB；审批文件≤10 MiB；Excel导入额度、类型及扫描按批准策略。服务端验证内容/大小/归属，临时文件TTL清理。','分别测试等于/超过两个边界、伪扩展、恶意文件、失败上传、取消和越权下载；策略未批准时阻断真实文件交付，不能按accept=*放行。','DCS-502/505/510/512/517/518/523/524/527～529'],
 ['010','导出完整性','导出严格为当前有效选中目录ID和允许列；不宣称全过滤导出。blob错误不得保存为Excel；下载文件名/内容安全处理。','选3条、空选择、翻页失效选择、越权ID、错误JSON/blob及大文件验证，核对导出行ID和重复项。','DCS-517/518'],
 ['011','审计与观测','记录主体、机构/部门、时间/时区、对象/流程/任务、动作、结果及关联请求；覆盖扫描、导入、发布、授权、审核和密钥轮换；敏感内容脱敏。','隔离成功/拒绝/未知结果串联至对象回读；日志授权/保留/追踪字段由平台策略交付；遗漏事件或泄密失败。',all],
 ['012','兼容与布局','项目批准的Chrome/Edge版本，1366×768、1500×1000、1920×1080及200%缩放可完成主要动作；宽表局部横滚、表单纵滚、按钮和错误可达。','记录实际OS/浏览器版本；长中文、空态、错误、第二步映射及所有条件表单矩阵；缺版本不判通过。',all],
 ['013','可访问性','标签和字段错误关联；纯键盘可用；弹窗焦点进入/返回，忙碌/错误可读屏感知；图表提供等价数据表，不能仅以颜色区分状态。','人工键盘/读屏加自动扫描；覆盖页签、树、多选、上传、映射替代操作和审核确认；局部扫描不宣称全面合规。',all],
 ['014','资源回收与长稳','离页销毁图表、监听、请求落屏资格和blob URL；临时文件按TTL；50次页面/弹窗往返后监听和图表实例回到基线。','固定构建测50次重入并采堆/监听/图表/临时对象，记录GC前后与失败；无持续增长且无离页写入。',all],
 ['015','契约与可维护性','相对服务前缀集中配置；字段、枚举、ID类型、HTTP错误和分页契约受版本管理；生成刷新不丢编号、证据和未执行状态。','运行文档/契约回归、SHA偏移核对及刷新幂等，篡改原件/片段/编号/关联负例必须拒绝。',all],
 ['016','抗滥用与恢复交付','扫描/导入/申请/授权/重置/审批设置服务端主体+机构配额，返回可恢复的拒绝；备份及恢复RTO/RPO采用批准计划并演练，不复制登录限流或可用率。','平台负责人提供阈值/窗口/队列及RTO/RPO后在隔离环境做边界/恢复与数据一致性演练；零样本或未批准策略不通过。','DCS-502～505、DCS-512～518、DCS-523～529'],
];
const protocol='请求使用公共客户端JSON默认与withCredentials，动态token/CSRF/nonce/timestamp/sign头只登记名称不保存值；/back来自公共API_BASE_URL，各服务前缀允许MODULE_URL_PREFIX覆盖。HTTP 202进入配置的业务错误处理并reject，其他可接受状态返回data；没有统一code=0成功规则。超时优先路径非负配置，其次number请求timeout，再回退20000ms；0可能不限时，必须按NFR-005落实有效有限超时。FormData不手写boundary；blob使用rawData/responseType，错误体单独判断。';
function renderFeature(e){
 const p=PROFILES[e.kind];if(!p)throw new Error('DCS profile missing '+e.id);
 const editing=['528','530','531','532','533','534'].some(n=>e.id.endsWith(n));
 const mode=editing?'本项为编辑：先读取当前id并回填，保留稳定ID；不执行新增POST；详情模式禁写。':e.id==='DCS-529'?'本项是发起流程详情；普通发起者只读，只有另行授权的待办上下文才适用审批分支。':'按入口区分读取、本地草稿和有影响的提交动作。';
 return ['### '+e.id+' '+e.title,'','**业务目的**：'+p.purpose,'','入口：'+e.route+'；前置条件：有效会话及当前对象读取权限，维护、文件、授权和审核等有独立动作权限。'+mode,'','**操作与规则**','',...p.flow.map((s,i)=>(i+1)+'. '+s),'','**结果与异常处理**：加载、合法空集合、业务拒绝、部分失败、会话失效和结果未知分开呈现；接口受理不等于审批通过、任务完成或数据可访问。','','**开发处理细则**：以下字段、控件、接口与验收共同约束实现；空白属性不是无约束，也不授权自行发明服务DTO。','','<!-- 完整规格:'+e.id+' -->','',
 '#### 1. 页面字段清单（'+e.id+'）','',...table(['字段名称与绑定名','类型/控件','是否必填','默认值','长度/范围/单位','格式及校验规则','错误提示','条件/状态'],p.fields),
 '保留0、false、null、空字符串和未传的差异，字段长度为空不等于无限；字典候选保留真实ID类型。未列明的后端必填、唯一性、默认排序、版本键及完整响应结构由核查记录所列契约交付，不能自行添加租户、空间、角色字段。','',
 '#### 2. 页面交互规则（'+e.id+'）','',...table(['控件/触发方式','前提及输入','行为与联动','忙碌/禁用/反馈','完成、失败及草稿'],p.controls),
 '#### 3. 业务流程与异常分支（'+e.id+'）','',...p.flow.map((s,i)=>(i+1)+'. '+s),'',...table(['分支','页面/数据结果','恢复'],[
 ['依赖或详情失败','停止依赖动作，不把缺字段、加载中或无权当空集合','保留当前上下文，单独重试依赖；迟到结果不可覆盖新对象'],['字段/引用/状态冲突','定位字段或对象；服务端复验引用、权限、当前状态和版本','保留安全草稿并重新读取；不提前移除记录'],['断网/超时/5xx/解析异常','finally恢复busy；写入结果未知，不显示成功','只读可人工重试；写入先查对象/流程/关系/审计再决定'],['重复点击/并发','客户端所有提交入口共享锁；服务端防重/原子状态检查','同一业务效果最多一次；不静默覆盖新版本'],['取消/关闭/返回/后退','只读返回来源；有未保存草稿确认放弃；即时上传/密钥重置不由取消回滚','清本地引用并按TTL处理临时文件；离页不自动重发写入'],['会话/权限变化','停止受限呈现，清旧身份响应和选择','重认证后重读并验权，不自动恢复保存/授权/审批'],]),
 '#### 4. 接口与数据规则（'+e.id+'）','',protocol,'',...table(['用途','HTTP方法','相对路径','请求/调用条件','返回读取与页面处理'],p.api),
 ...table(['参数名称','位置','类型','必填/条件与来源','转换及空值规则'],[['本项第1节绑定字段','JSON body或query，见接口行','按字段表与实际契约','只提交当前操作适用字段；候选来自授权服务','文本trim按字段，数组/逗号串/boolean不得混用'],['id/resourceId/catalogueId/actId/taskId等','path/body/路由上下文','精确ID类型由后端契约提供','来自当前授权对象或任务，不使用名称或另类ID替换','不擅自Number化长ID；路径安全编码，历史URI空格问题单列'],['pageRequest','分页请求body','{pageNo,pageSize,order?}','仅分页接口；初值按当前显式模型/公共组件','筛选回第1页；订阅待办/已办保留显式id降序，其余不虚构默认排序；200字典页不保证全量'],['文件与引用','multipart/FormData或JSON引用','File/引用集合','按本项大小、数量及授权归属','code=0是上传表单字段，不是统一响应成功码']]),
 ...table(['响应分支','判定与读取','页面处理','重试'],[['读取resolve','验证本项数组/对象及datas/total等结构','当前有效上下文才落屏；空集合/失败分开','只读可人工重读'],['写入resolve','普通HTTP正常不足以证明业务终态；按本项业务结果再回读','保存、送审、审核、发布、授权及任务完成分别呈现','结果未知先查，不重复创建或审批'],['blob/上传','文件错误体、verifyFail和临时引用按分支判断','失败不生成正常下载或假入库成功','按批次/对象回读，清理临时对象'],['公共reject/局部异常','202/认证失效/无权/服务及网络异常','保留安全上下文，恢复锁并执行公共会话处理','按可恢复性人工重试，不覆盖全局认证反馈']]),
 '#### 5. 验收标准（'+e.id+'）','',...table(['验收编号','前置、步骤与可检查结果/回读','关联需求','状态'],e.acceptance.map((id,i)=>[id,p.checks[i],e.id,'未执行'])),
 '#### 6. 权限与安全要求（'+e.id+'）','','允许访问本页面的身份和机构/部门资源范围由服务端矩阵定义，菜单可见不是鉴权。读取目录元数据、底层数据、上传下载、导入扫描、维护发布、共享授权、密钥查看/重置和三类审核逐动作验权；对直接URL、ID替换、字段越权、撤销授权和过期会话同样校验。业务责任称谓不新增实际角色字段。','',
 '名称、意见、目录摘要、字段说明、文件名及服务示例按文本安全展示；审计记录主体、时间、对象、动作、流程/任务及结果，秘密和会话值脱敏。客户端签名、遮蔽和表单校验不替代TLS、服务端授权与秘密保管。附件和导出独立检查归属及允许列。','',
 '#### 7. 页面布局与状态（'+e.id+'）','',p.layout,'','初始化、加载、可操作、字段错误、空集合、业务冲突、无权限、网络失败、部分成功和成功去向分别显示。弹窗内容可滚动，底部操作可达；关闭焦点回触发点，窄屏纵向重排，宽表局部横滚。仅查询页面不套保存成功；长表单及后续条件分支补采范围见核查记录。','',
 '#### 8. 关联文档（'+e.id+'）','',...e.sources.map(s=>'[历史图]('+s+') / [元素]('+s.replace(/\.png$/,'.json')+')'),'','[主规格](./需求说明.md) · [子页面细则](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [静态证据](../evidence/dcs-review-20261027/README.md) · [原调研归档](./调研记录.md)','',
 '#### 9. 非功能性需求（'+e.id+'）','','按[主文档质量要求](./需求说明.md#9-非功能性需求)DCS-NFR-001至016及其关联范围验收。字段、文件、统计、状态及权限不变量均为交付约束；性能数字是本次目标，未实测。全部应用功能与非功能验收未执行，文档测试不替代应用验收。',''].join('\n');
}
function renderDocument(type,previous){
 const base=published[type],list=type==='main'?MAIN:SUB;
 if(previous.includes('dcs:generated-spec-v1')&&!previous.includes('<!-- 业务规格格式:plain-v1 -->'))throw new Error('DCS format missing');
 const ids=[...previous.matchAll(/^### (DCS-\d{3})\b/gm)].map(m=>m[1]);if(JSON.stringify(ids)!==JSON.stringify(list.map(e=>e.id)))throw new Error('DCS requirement IDs missing, duplicated or reordered');
 const ac=[...previous.matchAll(/^\| (DCS-AC-\d{3}) \|/gm)].map(m=>m[1]);if(JSON.stringify(ac)!==JSON.stringify(base.acceptance.map(a=>a.id)))throw new Error('DCS acceptance missing, duplicated or reordered');
 for(const row of previous.matchAll(/^\| (DCS-AC-\d{3}) \|.*$/gm)){if(row[0].split('|').at(-3).trim()!==base.acceptance.find(x=>x.id===row[1]).requirement)throw new Error('DCS acceptance association changed');}
 if(type==='main'&&base.sourceRows.some(s=>!previous.includes(s)))throw new Error('DCS source rows missing or changed');
 if(type==='sub'&&base.entries.some(e=>e.sources.some(s=>!previous.includes(s))))throw new Error('DCS evidence missing');
 const formal=new Set(list.flatMap(e=>e.acceptance)),retained=base.acceptance.filter(a=>!formal.has(a.id)).map(a=>[a.id,a.text.replaceAll('跨空间标识','跨机构/部门对象标识'),a.requirement,'未执行']);
 const boundaryMap=['502/503','525/529','526/527','528','502/503','512/513','512','514/516','533/534','513/515','517～522','517/518/521','517/518','517/518','521/522'];
 return ['# 目录管理系统'+(type==='main'?'业务需求说明':'子页面与操作需求细化'),'','<!-- 业务规格格式:plain-v1 -->','<!-- dcs:generated-spec-v1 -->','','按登录需求的细化结构核对字段、交互、调用、异常、布局与质量要求。依据及现有实现差异集中在[核查记录](./核查记录.md)；全部应用验收未执行，不代表系统已实现或生产就绪。','',
 '## 1. 业务目标与使用角色','','将授权资源导入并编成目录，经编目审核、发布和上报审核向机构/部门提供目录发现、收藏及订阅；业务、事项、应用系统、机构接入和分类树支持目录归属。编目维护、审核、发布管理、机构接入维护和目录使用是业务责任，实际角色与范围由服务端矩阵交付。','',
 '## 2. 业务范围','',...table(['功能编号','入口','目标及范围'],list.map(e=>[e.id,e.route,PROFILES[e.kind].purpose])),
 '37项正式功能（主文档2、子页面35），保留原编号、294条验收关联和15项历史操作边界。资源导入关系、底层资源、目录、上报目录、订阅申请、收藏关系和三类审批任务各用其ID；不把资源编目/上报管理/目录中心机械扩成五类通用CRUD。','',
 '## 3. 功能需求','',...list.map(renderFeature),
 '## 4. 字段与业务规则','','每功能第1节为字段清单；空白属性须由对应契约补齐后交付真实持久化。普通分页使用pageRequest；任务待办/已办显式1/20，导入候选显式1/10，分类为树无普通分页，字典200条不能保证全部候选。','',
 '目录名称≤50、别名≤30、摘要/使用要求≤300；业务名称≤100/说明≤300，事项四文本≤100，应用系统名≤100。机构名称采用校验器2～20，分类名称采用DOM与正则交集2～16中文；信息项名称采用弹窗≤100，行内200差异须统一。','',
 '编目审批pass=1通过/2驳回；上报审核分别submitTask/rejectTask；订阅审批pass=true/false。共享Approval文件每个≤10 MiB；申请附件最多5个且每个<200 MiB。取数方式provideType与物理资源resourceType、流程状态和目录发布状态不得混用。','',
 '## 5. 主要业务流程','','授权来源→导入部门资源关系→编目草稿/信息项/挂载映射→保存→编目送审/审核→目录发布/下架及上报审核→目录发现/收藏→订阅申请/审批→按批准方式和信息项访问→取消订阅或撤销授权。每阶段回读真实对象/流程终态；保存、送审受理、审批通过和数据权限生效分开核验。','',
 '## 6. 验收标准','','各功能五组具体用例与以下历史跨流程验收共同保留，编号和关联不重排。执行须记录构建、环境、授权数据、请求与回读、证据及失败；当前一律未执行。','',...table(['验收编号','前置、步骤与可检查结果/回读','关联需求','状态'],retained),
 '## 7. 实现与交付边界','',...(type==='main'?table(['历史编号','原操作范围','对应正式功能','约束'],base.boundaries.map(([id,title],i)=>[id,title,'DCS-'+boundaryMap[i],i>=12?'目录中心不开放手工目录CRUD；通过订阅/收藏关系及源目录管理承接，取消订阅/收藏不是删除目录。':'按对应接口和对象类型执行，不把审批/发布/机构授权当通用记录编辑。'])):[]),
 '可依据本规格开发界面与隔离模拟交互；真实写入、状态机、权限、秘密、文件、统计业务口径及生产容量必须完成[外部依赖](./核查记录.md#外部依赖)。完整DTO/错误/唯一性/ID类型、并发版本与幂等协议、审批迁移、撤销时点、Excel批次终态、编码兼容及密钥轮换均须受控契约，不授权AI自行决定。','',
 '原AI-007规划及原调研关联保留在归档及总规划；当前智能分类/分级只按资源调用推荐并人工采纳，不扩展成自动发布/审批或新的模型架构。','',
 '## 8. 需求依据与关联资料','',...(type==='main'?['| 需求编号 | 界面依据 | 详细记录 |','|---|---|---|',...base.sourceRows,'']:table(['需求编号','原图及元素','规则依据'],list.map(e=>[e.id,e.sources.map(s=>'[图]('+s+') / [元素]('+s.replace(/\.png$/,'.json')+')').join('；'),'[静态索引](../evidence/dcs-review-20261027/README.md)及[核查记录](./核查记录.md)']))),
 '[主规格](./需求说明.md) · [子页面细则](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [调研归档](./调研记录.md) · [总索引](../README.md)','',
 ...(type==='main'?['## 9. 非功能性需求','','以下为交付目标，数值来源和测量边界见核查记录，尚无实测。无批准策略、完整环境或有效样本不能判通过；认证哈希/登录策略由登录与平台承接，目录模块不复制其具体算法或月度SLA。','',...table(['编号','质量属性','指标或不变量','验收环境/方法/失败判定','关联功能','状态'],NFR.map(([n,...r])=>['DCS-NFR-'+n,...r,'未执行']))]:[]),
 ].join('\n');
}
function write(root=ROOT){const folder=path.join(root,'14-目录管理系统');let changed=0;for(const [type,name]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){const file=path.join(folder,name),before=fs.readFileSync(file,'utf8'),after=renderDocument(type,before);if(before!==after){fs.writeFileSync(file,after);changed++;}}return {changed,requirements:37};}
if(require.main===module)console.log(JSON.stringify(write()));
module.exports={MAIN,SUB,PROFILES,NFR,renderFeature,renderDocument,write};
