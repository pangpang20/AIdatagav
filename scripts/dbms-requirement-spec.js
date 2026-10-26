/* Data requirements specifications. Evidence and backend limits live in the audit. */
const fs = require('node:fs');
const path = require('node:path');
const MAIN = [
  ['100','查询调研委办局','officeList',['H-DBMS-002']],
  ['102','新增调研委办局','officeForm',['H-DBMS-002-op1']],
  ['105','查询调研里程碑','milestoneList',['H-DBMS-005']],
  ['107','新增调研里程碑','milestoneForm',['F121-DBMS-plan-add','F122-DBMS-plan-add-cancel']],
  ['110','查询配置管理','configList',['H-DBMS-017']],
  ['111','查看配置管理','configView',['H-DBMS-017-op1']],
  ['115','查询调研团队','teamList',['H-DBMS-003']],
  ['117','新增调研团队','teamForm',['H-DBMS-003-op1','H-DBMS-003-op1-options0']],
  ['120','查询调研计划列表','planList',['H-DBMS-006']],
  ['125','查询调研实施','track',['H-DBMS-007']],
  ['130','查询数据归集','collection',['H-DBMS-015']],
  ['001','组织调研工作入口','overview',['H-DBMS-001']],
].map(([id,title,kind,sources],i)=>({id:'DBMS-'+id,title,kind,sources,start:569+5*i}));
const SUB = [
  ['500','调研概览 → 项目一张图','overview',['H-DBMS-001']],
  ['501','调研准备 → 委办局信息','officeList',['H-DBMS-002']],
  ['502','调研准备 → 委办局信息 → 新增','officeForm',['H-DBMS-002-op1']],
  ['503','调研准备 → 调研团队信息','teamList',['H-DBMS-003']],
  ['504','调研准备 → 调研团队信息 → 新增','teamForm',['H-DBMS-003-op1','H-DBMS-003-op1-options0']],
  ['505','调研准备 → 参考文档','referenceList',['H-DBMS-004']],
  ['506','调研准备 → 参考文档 → 新建目录及文档','referenceForm',['H-DBMS-004-op1']],
  ['507','调研计划 → 调研里程碑','milestoneList',['H-DBMS-005']],
  ['508','调研计划 → 调研计划列表','planList',['H-DBMS-006']],
  ['520','调研计划 → 调研计划列表 → 新增','planForm',['H-DBMS-006-op1','H-DBMS-006-op1-options0','H-DBMS-006-op1-options1','H-DBMS-006-op1-options2']],
  ['509','调研实施 → 计划完成情况及成果','track',['H-DBMS-007']],
  ['510','调研报告 → 数据调研报表','chart',['H-DBMS-008']],
  ['511','调研报告 → 信息系统清单','system',['H-DBMS-009']],
  ['512','调研报告 → 数据目录清单','resource',['H-DBMS-010']],
  ['513','调研报告 → 数据字典清单','dictionary',['H-DBMS-011']],
  ['514','调研报告 → 接口资源清单','interface',['H-DBMS-012']],
  ['515','调研报告 → 数据需求清单','dataDemand',['H-DBMS-013']],
  ['516','调研报告 → 业务需求清单','businessDemand',['H-DBMS-014']],
  ['517','数据归集 → 归集登记及完成','collection',['H-DBMS-015']],
  ['518','参考文档 → 独立文档列表','documentList',['H-DBMS-016']],
  ['521','参考文档 → 上传文档','documentForm',['H-DBMS-016-op1']],
  ['519','配置管理 → 项目配置列表','configList',['H-DBMS-017']],
  ['522','配置管理 → 查看配置','configView',['H-DBMS-017-op1']],
].map(([id,title,kind,sources],i)=>({id:'DBMS-'+id,title,kind,sources,start:629+5*i}));

// Eight columns, including the binding name in the first column.
const f=(label,key,type='string / input',required='否',limit='',rule='',error='',state='',initial='')=>
  [`${label}（${key}）`,type,required,initial,limit,rule,error,state];
const text=(label,key,required='否',limit=100,rule='trim',state='')=>f(label,key,'string / input',required,limit?`最长${limit}字符`:'',rule,required==='是'?'不能为空':'',state);
const select=(label,key,required,enumKey,state='')=>f(label,key,'ID或枚举 / select',required,'',`候选${enumKey}；展示name，提交code或id`,required==='是'?'不能为空':'',state);
const date=(label,key,format='yyyy-MM-dd',required='是')=>f(label,key,'string / date',required,'',format,required==='是'?'不能为空':'');
const query=(label,key)=>f(label,key,'string / filter','否','最长100字符','trim；可清空','','查询条件','');
const pageFields=[
  f('页码','pageRequest.pageNo','number','是','正整数','','','查询后回第一页','1'),
  f('每页条数','pageRequest.pageSize','number','是','正整数','','','改变后回第一页','20'),
  f('排序','pageRequest.order','array<object>','是','','prop为字段名，asc为boolean','','排序封装','[{prop:"id",asc:false}]'),
];
const phone=(label,key,required='是')=>f(label,key,'string / input',required,'控件100字符；校验0～20字符','trim；仅数字和加号字符，正则^[\\d+]{0,20}$',required==='是'?'不能为空；手机号格式不正确':'手机号格式不正确');
const dynamicField=(limit=50,other='')=>f('扩展配置字段','applyConfigDoList[].fieldValue','string / input或select','',`文本最长${limit}字符`, 'isPullFlag="0"使用pullValues按逗号拆分候选；否则文本输入；随配置项提交', '',other,'空字符串');
const FIELDS={
  officeQuery:[query('委办局名称','name'),query('委办局领导','leader'),...pageFields,
    f('调研目的','purpose','string / textarea','是','最长2000字符','trim；非空变更后失焦保存','调研目的不能为空','独立于列表筛选；读取当前调研信息','')],
  officeForm:[text('调研委办局','name','是'),text('委办局领导','leader','是'),text('联系人','contact','是'),text('联系人职务','contactJob','是'),phone('联系人电话','contactPhone'),text('科室','officeName'),text('委办局地址','address'),f('描述','remark','string / textarea','否','最长500字符'),
    f('领导职务','leaderJob','string / hidden','','','','','模型隐藏值，不是可填写字段；按明确DTO处理',''),f('领导电话','leaderPhone','string / hidden','','','','','不使用样例联系电话初始化请求','')],
  teamQuery:[query('团队名称','name'),...pageFields],
  teamForm:[text('团队名称','name','是'),select('团队组长','leaderId','是','成员接口memberId/memberName'),
    f('团队成员','surveyTeamMemberList','array<object> / multiple select','否','','成员值为{memberId}对象；value-key=memberId','','多选；不得改成纯ID数组',''),f('描述','remark','string / textarea','否','最长500字符')],
  milestoneQuery:[...pageFields,f('阶段标识','id','ID / display','','','','','卡片动作定位',''),f('阶段名称','name','string / display','','','','','卡片标题',''),f('计划开始时间','planBeginTime','string / display','','','日期','','卡片时间轴',''),f('计划结束时间','planEndTime','string / display','','','日期','','截止时间',''),f('总负责人','chargeUserName','string / display','','','','','卡片文字','')],
  milestoneForm:[text('阶段名称','name','是',30),select('总负责人','chargeUserId','是','成员接口memberId/memberName'),date('计划开始时间','planBeginTime'),date('计划结束时间','planEndTime'),f('描述','remark','string / textarea','否','最长1000字符')],
  planQuery:[query('委办局','surveySubjectName'),f('调研团队','surveyTeamIds','array<ID> / multiple select','否','','候选团队id/name','','选择团队ID',''),f('里程碑页签','milestoneId','ID / tab','是','','路由query.id或首个里程碑','','无阶段时不发计划查询',''),...pageFields],
  planForm:[select('里程碑阶段','milestoneId','是','milestone/page返回datas；id/name','编辑时禁用；里程碑入口可预选'),select('调研委办局','surveySubjectId','是','surveySubject/page返回datas；id/name'),text('科室','officeName'),select('调研方式','way','是','SURVEY_PLAN__WAY'),text('调研地点','address','是'),text('联系人','contact','是'),phone('联系人电话','contactPhone'),date('调研时间','planDate','yyyy-MM-dd HH:mm'),
    f('调研团队','surveyPlanTeamList','array<object> / multiple select','是','至少1项','值为{surveyTeamId:id}；value-key=surveyTeamId','请选择调研团队','多个团队','[]'),f('描述','remark','string / textarea','否','最长200字符'),f('消息信息','messageInfo','string / hidden','否','','','','模型字段'),f('任务通知','messageMainDo','object / hidden','保存时','','messageInfo为项目名称插值文案；messageSource=route.query.pointId；type=任务','','保存前构建','')],
  track:[query('委办局','surveySubjectName'),f('调研状态','status','string / select','否','0已完成；1进行中','','','查询选项',''),f('里程碑页签','milestoneId','ID / tab','是','','路由query.id或首个阶段','','',''),...pageFields,
    f('选中计划','ids','array<ID> / checkbox','批量完成时至少1项','','稳定计划id','请选择需要批量完成的任务','行选择集合','[]'),date('实际完成时间','actualDate','yyyy-MM-dd HH:mm:ss'),f('说明','remark','string / textarea','否','','','','计划完成弹窗')],
  referenceQuery:[query('文档名称','name'),f('目录标识','fileCategoryId','ID / tree','否','','节点有idPath时使用id；根节点清空','','与目录树联动',''),...pageFields],
  referenceForm:[text('文档名称','name','是'),f('调研参考文档来源','docType','string / radio','是','1引用系统中的文档；2上传文档','按来源显示引用下拉或上传控件','不能为空',''),select('引用文档','refId','docType=1时是','referenceFile/page的id/name'),f('上传文件','fileName / fileKey','File + string / upload','docType=2时是','1个；.pdf,.xlsx,.xls,.docx,.doc,.zip,.rar','选择文件即上传；fileKey/fileName映射结果','不能为空','上传进行中禁用提交',''),f('描述','remark','string / textarea','否','最长500字符'),f('所属目录','fileCategoryId','ID / hidden','是','','来源query.categoryId','','有效目录方可新增','')],
  documentQuery:[query('文档名称','name'),query('上传人','createUsername'),...pageFields],
  documentForm:[text('文档名称','name','是',50),f('上传文件','fileName / fileKey','File + string / upload','是','1个；.pdf,.xlsx,.xls,.docx,.doc,.zip,.rar','选择文件立即上传，成功回填fileKey和fileName','不能为空','上传中禁用确认',''),f('描述','remark','string / textarea','否','最长100字符'),f('计划上下文','surveyPlanId','ID / hidden','','','','','独立文档调用端不提供该值，不虚构计划绑定','')],
  configQuery:[...pageFields,f('项目名称','name','string / display','','','','','行标题',''),f('更新时间','lastModifyTime','datetime / display','','','','','时间格式化',''),f('更新人','lastModifyUsername','string / display','','','','','非权限角色','')],
  config:[f('项目/空间标识','spaceId','ID / hidden','是','','来源route.query.id','','不可由名称代替',''),f('清单类型','formType','number / tab','是','1系统；2目录；3字典；4接口；5数据需求；6业务需求','','','切换页签读取对应配置','1'),f('资源名称','name','string / input','是','新增行最长100字符','名称非空','资源名称不能为空','已有行显示文本；新增行可输入',''),f('是否启用','checked → isEnable','boolean → number / checkbox','是','选中1；不选0','','','查看禁用；固定行不允许取消',''),f('字段类别','optionalType','string或number / hidden','是','2固定字段；0自定义字段；3扩展项读取条件','','','固定字段不进入修改数组',''),f('配置标识','id','ID / hidden','修改已有行时','','','','使用服务端标识；本地新增行无id','')],
  collection:[query('源数据单位','companyName'),query('源数据系统','belongSysName'),query('信息资源名称','resourceName'),query('表英文名称','resourceEnName'),...pageFields],
  collectionForm:[...['companyName','belongSysName','resourceName','enTableName','zhTableName','dataItemFieldCount','shareWay','collectStatus'].map((key,i)=>f(['源数据单位','源数据系统','信息资源名称','表英文名称','表中文名称','字段数量','接入方式','接入状态'][i],key,'string或number / disabled','','控件最长100字符','','','从目录成果读取','')),
    f('数据量','collectDataSize','string / input','是','最长30字符；单位条','trim；正整数，允许首个加号；正则^\\+?[1-9][0-9]*$','不能为空；请输入整数'),select('责任人','collectChargeUser','是','成员接口memberId/memberName'),f('责任人姓名','collectChargeUserName','string / hidden','','','','','选中责任人后按memberId回填memberName'),date('计划完成时间','planningTime','yyyy-MM-dd HH:mm:ss'),f('描述','collectRemark','string / textarea','否','最长1000字符'),f('操作指令','judgeCollect','string / hidden','是','1登记；2重开；3完成','','','不同动作不可混用','1'),date('实际完成时间','collectTime','yyyy-MM-dd HH:mm:ss'),f('完成说明','explanation','string / textarea','否','','','','仅完成弹窗')],
  overview:[f('空间/项目名称','name','string / display','','','','','蓝色标题块',''),f('项目目标','spaceObjective','string / display','','','','','绿色信息块',''),f('空间管理员','administratorName','string / display','','','','','管理员块',''),f('管理员电话','managePhone','string / display','','','','','按3/4/其余分组展示，无星号替换',''),...['id','name','leader','contact','contactPhone','officeNames','teamNames'].map((key,i)=>f(['委办局标识','委办局名称','领导','联系人','联系人电话','科室','团队'][i],'surveySubjectList[].'+key,'string或ID / display','','','','','关联委办局信息',''))],
  chart:[f('报表页签','audaqueIndexMixin','number / tab','是','调研报表；归集报表','','','切换researchChart/collectionChart',''),f('趋势粒度','dateType → flag','number / select','是','0按日；1按周；2按月','','','仅归集趋势查询','0'),f('数量卡片','count','number / display','','按返回项目单位展示','','','不是业务容量上限',''),f('分类名','name','string / chart','','','','','图例/列表分组',''),f('日期趋势','date / count','array<object> / chart','','','','','按趋势接口结果绘图','')],
};

const REPORTS={
  system:{title:'信息系统清单',route:'informationSystem',api:'surveyReportSys',formType:1,src:'SYSTEM',filters:[query('系统名称','sysName'),query('系统访问入口','sysAccessEntry'),select('数据更新频率','dataUpdateFrequency','否','SURVEY_REPORT_SYS__DATA_UPDATE_FREQUENCY')],
    fields:[text('科室','officeName'),text('系统名称','sysName','是'),select('是否垂管','verticalManageType','是','SURVEY_REPORT_SYS__VERTICAL_MANAGE_TYPE'),select('数据存储方式','dataStoreWay','否','SURVEY_REPORT_SYS__DATA_STORE_WAY'),select('数据更新频率','dataUpdateFrequency','否','SURVEY_REPORT_SYS__DATA_UPDATE_FREQUENCY'),select('共享方式','dataAccessWay','否','SURVEY_REPORT_SYS__DATA_ACCESS_WAY'),text('系统访问入口(系统网址)','sysAccessEntry','是'),select('网络位置','networkSite','是','SURVEY_REPORT_SYS__NETWORK_SITE'),text('共享方式描述','dataAccessDesc','否',500),text('建设单位负责人及联系方式','constructInfo'),dynamicField(150)],
    columns:'单位名称、科室名称、系统名称、是否垂管、数据存储方式、数据更新频率、系统访问入口(系统网址)、网络位置、共享方式、建设单位负责人及联系方式',
    interaction:'共享方式change到非“其他”时清空dataAccessDesc；该描述输入仍常驻。网址字段仅有非空及长度限制，不能据标签增加自动访问、连通性探测或凭据提交。'},
  resource:{title:'数据目录清单',route:'dataResource',api:'surveyReportSysData',formType:2,src:'RESOURCE',filters:[query('信息资源名称','resourceName'),query('所属系统','belongSysName'),select('数据范围','dataRange','否','SURVEY_REPORT_SYS_DATA__DATA_RANGE'),select('更新频率','updateFrequency','否','SURVEY_REPORT_SYS__DATA_UPDATE_FREQUENCY'),select('是否加入编目','isCatalog','否','SURVEY_REPORT_SYS_DATA_ITEM__CODE_SET')],
    fields:[text('科室','officeName'),select('是否加入编目','isCatalog','是','SURVEY_REPORT_SYS_DATA_ITEM__CODE_SET'),text('信息资源名称','resourceName','是'),text('信息资源英文名(英文表名)','resourceEnName','是'),f('信息资源描述','resourceDesc','string / textarea','否','最长100字符','trim'),select('共享类型','shareType','是','SURVEY_REPORT_SYS_DATA__SHARE_TYPE'),select('共享方式','shareWay','是','SURVEY_REPORT_SYS_DATA__SHARE_WAY'),select('开放属性','openAttr','否','SURVEY_REPORT_SYS_DATA__OPEN_ATTR'),f('当前数据量','currentDataSize','string / input','否','最长100字符；单位万条','trim；非负整数或最多2位小数，正则^\\d+(\\.\\d{1,2})?$','请输入整数或者小数'),select('更新频率','updateFrequency','是','SURVEY_REPORT_SYS__DATA_UPDATE_FREQUENCY'),select('信息资源所属系统','belongSysName','是','surveyReportSys/list返回sysName；此字段传名称'),f('信息项描述','resourceContainItem','string / textarea','是','最长100字符','trim','不能为空'),dynamicField(50,'资源格式一级/二级为专门联动选择'),f('信息项列表','dataItemList','array<object> / subtable','否','','通过字典选择映射，不直接改写字典','','与目录表单一并提交','[]')],
    columns:'单位名称、科室名称、信息资源名称、信息资源所属系统、信息资源描述、信息项描述、更新频率、开放属性、当前数据量(万条)',
    interaction:'选择表字段打开字典候选弹窗，按searchKey和surveyPlanId查询；确认以本次选中项替换dataItemList。资源格式一级改变时清空二级值并以pcode加载二级候选。目录的万条数量与归集的条数量不能直接拼接或互相回填。'},
  dictionary:{title:'数据字典清单',route:'dataDictionary',api:'tdatadictionary',formType:3,src:'DICTIONARY',filters:[query('字段中文名','columnNameCn'),query('字段英文名','columnNameEn'),query('中文表名','tableNameCn'),query('英文表名','tableNameEn'),query('所属系统名称','projectName')],
    fields:[select('所属系统','projectSysId','是','surveyReportSys/list返回id/sysName'),text('信息资源名称','resourceName','是',50),text('中文表名','tableNameCn','是',50),text('英文表名','tableNameEn','是',50),text('字段中文名','columnNameCn','是',50),text('字段英文名','columnNameEn','是',50),select('是否主键','isKey','是','SURVEY_REPORT_SYS_DATA_ITEM__PRIMARY_KEY'),select('是否为空','isNullable','是','SURVEY_REPORT_SYS_DATA_ITEM__NULLABLE'),select('数据类型','columnType','是','SURVEY_REPORT_SYS_DATA_ITEM__DATA_TYPE'),dynamicField(50),f('关联构件','associatedComponentIdList','array<ID> / multiple select','否','','候选label/value，提交value','','过滤、清空、多选；无候选不编造构件','[]'),f('所属系统名称','projectName','string / hidden','','','','','选projectSysId时取对应sysName','')],
    columns:'单位名称、所属系统、信息资源名称、英文表名、中文表名、字段英文名、字段中文名、数据类型、是否主键、是否为空',
    interaction:'所属系统选择传projectSysId并联动projectName；清空选择同时清空名称，处理失效对象。关联构件的候选容器初始为空，必须有获授权的候选契约才开放选择，不静态填入常见构件。'},
  interface:{title:'接口资源清单',route:'interface',api:'surveyReportInterface',formType:4,src:'INTERFACE',filters:[query('信息资源所属系统','belongSysName'),query('数据接口名称','dataInterfaceName'),select('更新频率','updateFrequency','否','SURVEY_REPORT_SYS__DATA_UPDATE_FREQUENCY')],
    fields:[text('责任科室','officeName'),text('信息资源所属系统','belongSysName','是',0),text('数据接口名称','dataInterfaceName','是'),text('接口地址','interfaceAddress','是'),f('入参信息','inParamInfo','string / textarea','否','最长500字符','trim'),select('返回类型','returnType','是','SURVEY_REPORT_INTERFACE__RETURN_TYPE'),f('出参信息','outParamInfo','string / textarea','是','最长500字符','trim','不能为空'),select('传输协议','transportProtocol','是','SURVEY_REPORT_INTERFACE__TRANSPORT_PROTOCOL'),f('接口用途','interfaceUse','string / textarea','是','最长100字符','trim','不能为空'),select('更新频率','updateFrequency','是','SURVEY_REPORT_SYS__DATA_UPDATE_FREQUENCY'),f('数据量','dataSize','string / input','否','最长100字符；单位万条','trim；非负整数或最多2位小数，正则^\\d+(\\.\\d{1,2})?$','请输入整数或者小数'),dynamicField(50),f('接口文档','fileName / fileKey','File + string / upload','否','1个；.pdf,.docx,.doc','选择即上传','','上传中禁用主表单提交','')],
    columns:'单位名称、责任科室、信息资源所属系统、数据接口名称、入参信息、出参信息、传输协议、接口地址、接口用途、更新频率、数据量(万条)',
    interaction:'接口地址与入/出参信息作为调研资料保存，不根据这些字符串自动发起接口调用。接口文档单独上传取得fileKey后随主对象提交；移除只清引用，不宣称已删除远端文件。'},
  dataDemand:{title:'数据需求清单',route:'dataRequirements',api:'surveyReportDataDemand',formType:5,src:'DATA-DEMAND',filters:[query('数据资源名称','dataResourceName'),query('资源所属单位名称','belongUnitName')],
    fields:[text('科室','officeName'),text('数据资源名称','dataResourceName','是'),text('资源所属单位名称','belongUnitName','是'),f('资源信息项','infoItem','string / textarea','是','最长100字符','trim','不能为空'),select('期望数据范围','dataRange','是','SURVEY_REPORT_SYS_DATA__DATA_RANGE'),select('期望更新频率','updateFrequency','是','SURVEY_REPORT_SYS__DATA_UPDATE_FREQUENCY'),select('期望提供方式','supplyWay','是','SURVEY_REPORT_DATA_DEMAND__SUPPLY_WAY'),f('入参','inParam','string / input','提供方式为接口时是','最长100字符','trim','不能为空','supplyWay严格等于“接口”才显示'),f('出参','outParam','string / input','提供方式为接口时是','最长100字符','trim','不能为空','切换提供方式清空入参/出参'),f('具体用途','definiteUse','string / textarea','是','最长100字符','trim','不能为空'),text('数据需求人','dataDemander'),phone('需求人联系电话','demanderPhone','否'),dynamicField(50)],
    columns:'单位名称、科室、数据资源名称、资源所属单位名称、资源信息项、期望数据范围、期望更新频率、期望提供方式、具体用途、数据需求人、需求人联系电话',
    interaction:'提供方式change先清空inParam和outParam；只有值为“接口”时显示并校验入参/出参，其他方式不得因隐藏项为空而阻断保存。联系电话可空，但非空时仍执行电话格式规则。'},
  businessDemand:{title:'业务需求清单',route:'businessRequirements',api:'surveyReportBusinessDemand',formType:6,src:'BUSINESS-DEMAND',filters:[query('数据指标','dataIndicator')],
    fields:[text('数据指标','dataIndicator','是'),text('计算公式','formula','是'),text('维度','dimension'),text('统计周期','statisPeriod'),text('业务限定','businessLimit'),select('更新频率','updateFrequency','是','SURVEY_REPORT_SYS__DATA_UPDATE_FREQUENCY'),dynamicField(50)],
    columns:'单位名称、数据指标、计算公式、维度、统计周期、业务限定、更新频率',
    interaction:'计算公式是调研文本，填入公式不执行计算、SQL或脚本；维度、统计周期、业务限定与指标同对象保存，不把填了指标名称等同指标定义已发布。'},
};

// Preserve real validation wording instead of copying a generic required message.
for (const [key,message] of Object.entries({networkSite:'网络位置不能为空',verticalManageType:'是否垂管不能为空'})) {
  REPORTS.system.fields.find(row=>row[0].endsWith(`（${key}）`))[6]=message;
}
for (const [key,message] of Object.entries({projectSysId:'请选择所属系统',resourceName:'请输入信息资源名称',tableNameCn:'请输入中文表名',tableNameEn:'请输入英文表名',columnNameCn:'请输入字段中文名',columnNameEn:'请输入字段英文名',columnType:'请选择数据类型',isNullable:'请选择是否为空',isKey:'请选择是否主键'})) {
  REPORTS.dictionary.fields.find(row=>row[0].endsWith(`（${key}）`))[6]=message;
}
for(const kind of ['interface','dataDemand','businessDemand']){
  const field=REPORTS[kind].fields.find(row=>bindingName(row)==='applyConfigDoList[].fieldValue');
  field[1]='string / input';field[5]='trim；直接输入文本，不按isPullFlag改为下拉';field[7]='';
  if(kind==='interface'){
    field[4]='一般文本最长50字符；名为接口示例时不设置maxlength';
    field[7]='接口示例仍为输入框，不自动改为文本域';
  }else field[3]='';
}
function bindingName(row){return row[0].slice(row[0].lastIndexOf('（')+1,-1);}

const BASE='/back/dop/factory';
const SPACE='/back/dop/space';
const ROUTE='/dop/dbms/requirement/';
const api=(purpose,method,url,params,response)=>[purpose,`${method} ${url.startsWith('/back/')?url:BASE+url}`,params,response];
const listApi=(object,params='筛选字段及pageRequest:{pageNo,pageSize,order}')=>api('查询列表','POST',`/${object}/page`,params,'读取datas与total；兼容返回数组的公共列表分支；空结果与失败分开');
const crudApi=(object,keys,createPath=`/${object}`)=>[
  api('读取详情','GET',`/${object}/{id}`,'id来自被选记录；无请求体','替换详情模型；view禁用编辑'),
  api('创建','POST',createPath,keys,'公共客户端resolve后展示新增成功；返回来路并按对象回读'),
  api('修改','PUT',`/${object}/{id}`,keys+'；id来自当前目标','成功后提示修改成功并返回；失败保留草稿'),
  api('删除','DELETE',`/${object}/{id}`,'确认后传稳定id；不传显示名称','成功后刷新原筛选列表；失败不移除本地行'),
];
const membersApi=api('成员候选','POST',SPACE+'/workspacemember/list','首次无显式body（公共客户端归一为空对象）；不能自行增加keyword DTO','首次作为memberId/memberName数组使用；远程分支的响应形状另见核查记录');
const workspaceApi=api('当前空间信息','GET',SPACE+'/workspace/find','无显式查询参数','读取name、spaceObjective、administratorName、managePhone等');
const enumApi=api('枚举','GET','/codeSetConfig/allMap','无显式参数','按枚举key读取code/name候选；不固定当前样本数量');
const documentKeys='name,remark,fileKey,fileName；实施附件另传surveyPlanId';
const PROFILES={
  officeList:{route:ROUTE+'prepare/office',fields:FIELDS.officeQuery,mode:'list',goal:'查询调研委办局及联系资料，并维护独立的调研目的。',object:'surveySubject',columns:'序号、调研委办局、委办局领导、委办局地址、联系人、联系人电话、科室、描述、操作',
    controls:[['委办局名称、领导筛选','输入trim；查询以name、leader提交，重置恢复初始条件并回第一页。'],['调研目的','点击静态文本进入编辑；非空且有变更时失焦调用保存。此处是写操作，不纳入只读筛选；失败保留文本及编辑状态供人工恢复。'],['新增 / 编辑 / 查看','共用editSubject页面；分别传optType=add/edit/view，后两者传id；查看禁用表单。'],['删除','先显示通用确认框；取消不发DELETE，确认成功后刷新原列表。'],['导入 / 导出','导入打开600px文件对话框；选文件后确认才导入。导出仅传name和leader，生成blob下载。']],
    layout:'内容顶部是调研目的文本区，右侧有装饰图片；其下是委办局筛选区、右上方新增/导入/导出工具、完整联系资料表及底部分页。空表仍保留目的与工具区。',
    apis:[listApi('surveySubject','{name,leader,pageRequest:{pageNo,pageSize,order}}'),api('读取调研目的','POST','/survey/findOne','无显式body','读取purpose'),api('失焦保存目的','PUT','/survey/modify','{purpose:string}','成功更新本地initPurpose；失败不得将草稿当作已保存'),...crudApi('surveySubject','name,leader,contact,contactJob,contactPhone,officeName,address,remark；创建包装器加surveyId'),api('导出','POST','/surveySubject/export/excel','{name,leader}','blob；下载失败保持列表'),api('导入模板','POST','/surveySubject/export/excelTmp','{}','blob模板'),api('确认导入','POST','/surveySubject/import/excel','FormData.file；自定义上传不自动拼surveyId','成功提示并刷新列表；事务边界见交付契约')]},
  officeForm:{route:ROUTE+'prepare/office/editSubject',fields:FIELDS.officeForm,mode:'form',goal:'登记委办局、负责人和联系人信息，供调研计划选择。',object:'surveySubject',
    controls:[['八个可见字段','按字段表输入；前五项非空，文本框trim；描述为文本域。领导职务/电话不增加成可见控件。'],['提交','校验通过后创建；edit按id读取再修改；view不显示提交能力。隐藏样例值不得进入创建DTO。'],['取消 / 返回','返回来路，丢弃未提交本地草稿，不发送本对象保存请求。']],
    layout:'主体白色表单按两列排列：第一行调研委办局/委办局领导；第二行联系人/联系人职务；第三行联系人电话/科室；第四行左列地址；底部描述横跨两列。内容标题左侧、返回右侧；固定底栏右端依次取消、提交。',
    apis:crudApi('surveySubject','name,leader,contact,contactJob,contactPhone,officeName,address,remark；创建再加surveyId；隐藏样例值不透传')},
  teamList:{route:ROUTE+'prepare/team',fields:FIELDS.teamQuery,mode:'list',object:'surveyTeam',goal:'按团队名称定位调研团队，查看组长和成员并进入维护。',columns:'序号、团队名称、团队组长、团队成员、描述、操作',
    controls:[['团队名称 / 查询 / 重置','名称trim；查询和重置回第一页；清空输入本身不发请求。'],['新增 / 编辑 / 查看','进入team/edit，传optType和目标id；view禁用。'],['删除','通用二次确认，取消不发请求；成功回读团队列表。']],
    layout:'上方为团队名称筛选，新增位于表格工具区；中间列出组长、逗号连接的成员和描述，右端为编辑/查看/删除；底部分页。长成员名称使用溢出提示，不按样例固定成员数。',
    apis:[listApi('surveyTeam','name,pageRequest；包装器追加surveyId'),...crudApi('surveyTeam','name,leaderId,surveyTeamMemberList:[{memberId}],remark；创建追加surveyId'),membersApi]},
  teamForm:{route:ROUTE+'prepare/team/edit',fields:FIELDS.teamForm,mode:'form',object:'surveyTeam',goal:'建立调研团队及其组长、成员关联。',
    controls:[['团队名称','trim；失焦与提交校验非空，最长100字符。'],['团队组长','从当前可用memberId/memberName候选单选；提交leaderId。'],['团队成员','多选memberId对象；清空只更改草稿，不发成员删除请求。候选失效时显示原因，不偷偷改选。'],['提交 / 取消 / 返回','提交按完整字段映射；取消和返回不保存草稿；详情模式只读。']],
    layout:'白色详情区为两列：首行左侧团队名称、右侧团队组长；第二行左侧团队成员多选，右侧留白；第三行描述文本域横跨两列。标签位于控件上方，组长为单选、成员显示多选标签；标题栏右侧返回，底部固定栏右侧取消/提交。',
    apis:[membersApi,...crudApi('surveyTeam','name,leaderId,surveyTeamMemberList:[{memberId}],remark；创建追加surveyId')]},
  milestoneList:{route:ROUTE+'plan/milepost',fields:FIELDS.milestoneQuery,mode:'cards',object:'milestone',goal:'按计划日期组织阶段卡片，进入阶段维护及关联的调研计划。',
    controls:[['新增阶段','进入milepost/edit?optType=add。'],['阶段编辑 / 删除','编辑传id；删除先确认再DELETE；删除涉及计划的引用保护由服务端执行。'],['查看调研计划','进入plan/list，query.id=阶段id，默认显示该阶段页签。'],['新建调研计划','进入plan/list/edit，query.milestoneId=阶段id且optType=add；沿用计划表单。'],['当前进展','展示计划日期的时间进度，不作为任务实际完成率；日期跨月/跨年使用日历计算。']],
    layout:'页面上方标题与新增；主体为横向阶段分组，卡片展示阶段名、负责人、截止时间、描述、操作和进度。相互包含的日期区间在同组堆叠，多组可横向滚动；无阶段时显示空态。',
    apis:[listApi('milestone','pageRequest；包装器追加surveyId'),...crudApi('milestone','name,planBeginTime,planEndTime,chargeUserId,remark；创建追加surveyId')]},
  milestoneForm:{route:ROUTE+'plan/milepost/edit',fields:FIELDS.milestoneForm,mode:'form',object:'milestone',goal:'设置阶段名称、负责人和计划日期区间。',
    controls:[['名称 / 总负责人','名称trim最长30；负责人单选memberId，不把memberName当id。回填与候选去重均按memberId。'],['开始 / 结束日期','使用yyyy-MM-dd；开始不得晚于结束；同日允许。手工输入与日期控件执行同一前端检查，提交仍由服务端校验。'],['描述','最长1000字符；可空。'],['提交 / 取消 / 返回','先校验四个必填字段及日期关系，成功提示后返回；取消不保存。']],
    layout:'两列白色表单：第一行阶段名称/总负责人；第二行计划开始时间/计划结束时间；第三行描述横跨两列。上方标题和右侧返回；底栏右端取消、提交。',
    apis:[membersApi,...crudApi('milestone','name,planBeginTime,planEndTime,chargeUserId,remark；创建追加surveyId')]},
  planList:{route:ROUTE+'plan/list',fields:FIELDS.planQuery,mode:'list',object:'surveyPlan',goal:'按里程碑、委办局和团队查询调研计划并进入计划维护。',columns:'序号、调研委办局、科室、调研方式、调研地点、联系人、联系人电话、调研时间(计划)、调研团队、调研状态、操作',
    controls:[['里程碑页签','首次使用query.id或首个阶段；切换更新路由、milestoneId与列表。空阶段不请求计划列表。'],['委办局 / 调研团队','委办局trim；团队多选ID；查询回第一页，重置保留当前阶段上下文。'],['新增 / 编辑 / 查看 / 删除','共用plan/list/edit；id定位，optType控制；列表入口把当前阶段放到pointId。删除需要确认。'],['导入 / 导出','无里程碑提示“请先创建调研里程碑”；导入传milestoneId；导出参数仅milestoneId、surveySubjectName，不冒充包含团队筛选。']],
    layout:'内容最上方阶段页签，其下为委办局/团队筛选；表格上方右端新增、导入、导出；中间为计划列表，右端行操作，底部分页。',
    apis:[api('阶段页签','POST','/milestone/list','{surveyId}','直接读取阶段数组'),listApi('surveyPlan','milestoneId,surveySubjectName,surveyTeamIds,pageRequest'),listApi('surveyTeam','候选读取；包装器加surveyId'),...crudApi('surveyPlan','计划表单全部字段；创建包装器加surveyId；保存前构造messageMainDo'),api('导出','POST','/surveyPlan/export/excel','{milestoneId,surveySubjectName}','blob'),api('导入模板','POST','/surveyPlan/export/excelTmp','{}','blob'),api('确认导入','POST','/surveyPlan/import/excel','FormData.file、milestoneId','导入成功后刷新当前阶段')]},
  planForm:{route:ROUTE+'plan/list/edit',fields:FIELDS.planForm,mode:'form',object:'surveyPlan',goal:'为选定阶段安排委办局调研地点、时间、联系人及团队。',
    controls:[['里程碑 / 委办局 / 团队','并行加载候选；里程碑可从query.milestoneId预选，编辑时禁用；团队多选对象数组。候选失败不可显示为“无可选项”并继续错误保存。'],['调研方式','按SURVEY_PLAN__WAY提交code；不把本次候选样本硬编码为枚举全集。'],['时间 / 电话 / 其他文本','按字段格式和长度校验；不自行添加“日期不得过去”或“团队不得重叠”的限制。'],['提交','加入messageMainDo.messageInfo/messageSource/type后保存；消息文案不证明通知成功送达。提交期间一个请求锁。'],['取消 / 返回','不保存计划；已有上传不适用本表单。']],
    layout:'两列顺序为里程碑阶段/调研委办局、科室/调研方式、调研地点/联系人、联系人电话/调研时间；第五行左侧调研团队；底部描述全宽。标题栏右侧返回，底栏右端取消/提交。',
    apis:[listApi('milestone'),listApi('surveySubject'),listApi('surveyTeam'),workspaceApi,enumApi,...crudApi('surveyPlan','milestoneId,surveySubjectId,officeName,way,address,contact,contactPhone,planDate,surveyPlanTeamList:[{surveyTeamId}],remark,messageInfo,messageMainDo；创建加surveyId')]},
  track:{route:ROUTE+'implementation/track',fields:FIELDS.track,mode:'workflow',object:'surveyPlan',goal:'填写每个计划的八类成果，确认实际完成时间，并在需要时重开。',columns:'选择、序号、调研委办局、科室、调研方式、调研地点、联系人、联系方式、调研时间(计划)、调研团队、实际完成时间、调研状态、操作',
    controls:[['里程碑 / 筛选','阶段来源milestone/list；按milestoneId、surveySubjectName、status查询计划；0已完成，1进行中。'],['完成情况 / 查看完成情况','进入track/subList，传id、optType=edit/view、encodeURIComponent(surveySubjectName)；提供六类成果、会议纪要、附件八个页签。'],['计划完成 / 批量完成','进行中显示计划完成；批量至少勾选一个id。500px确认框填写actualDate和remark；确认才POST finish。'],['重开','状态0显示重开；警告确认后PUT reOpen/{id}；不在点击入口时直接执行。'],['导入','当前阶段有效后打开成果类型和Excel选择框；确认按类型导入该里程碑成果。']],
    layout:'上方阶段页签和筛选；表格首列多选，右上方导入与批量完成。完成确认框单列时间/说明；成果页顶部八个页签和右侧返回，页签下方复用对应清单。查看模式隐藏维护入口。',
    apis:[api('阶段','POST','/milestone/list','{surveyId}','阶段数组'),listApi('surveyPlan','milestoneId,surveySubjectName,status,pageRequest'),api('完成','POST','/surveyPlan/finish','{ids:ID[],actualDate:"yyyy-MM-dd HH:mm:ss",remark:string}','成功提示“完成操作成功”并刷新'),api('重开','PUT','/surveyPlan/reOpen/{id}','id来自已完成计划；无业务body','成功提示并刷新；状态再次以服务端读取为准'),api('成果查询示例','POST','/surveyReportSys/page','六类成果与会议/附件具体映射见子页面第4节；此行只标识共用入口','维护受surveyPlanId和optType约束；不新增独立的实施主记录')]},
  referenceList:{route:ROUTE+'prepare/referenceFile',fields:FIELDS.referenceQuery,mode:'list',object:'surveyReferenceFile',goal:'按目录组织调研准备文档，预览、下载和维护文档引用。',columns:'选择、序号、文件名称、描述、上传人、上传时间、操作',
    controls:[['目录搜索 / 展开 / 选择','本地按节点及祖先名称包含匹配；点击有idPath节点设置fileCategoryId，根节点清空。'],['目录新建 / 编辑 / 删除','先选择目录；新建与编辑打开目录名称弹窗。删除须确认，提交categoryId；不会因此创建文档记录。'],['文档新增 / 编辑 / 预览','选中有效目录才显示新增；打开referenceFile/edit，传categoryId、optType及编辑目标id。'],['单文件下载 / 批量导出','勾选fileKey集合；无选择提示，批量以fileKey用下划线拼路径，下载blob。'],['删除文档','确认后DELETE文档id；不据成功提示推断原文件已物理删除。']],
    layout:'左右分栏：左侧目录标题、新建与收起、目录搜索和树；右侧文档名筛选、批量导出和条件新增、复选表格、分页。收起左栏后可重新展开；弹窗居中。',
    apis:[listApi('surveyReferenceFile','name,fileCategoryId,pageRequest；包装器加surveyId'),api('目录树','POST','/surveyReferenceFileCategory/tree','调用端无显式body','按categoryName、childList、id、pid、idPath读取'),api('目录新增','POST','/surveyReferenceFileCategory','{pid,labelName,categoryName:labelName}','组件读取返回对象.code；成功重载目录'),api('目录修改','PUT','/surveyReferenceFileCategory/{id}','{pid,labelName,categoryName:labelName}','成功重载目录'),api('目录删除','DELETE','/surveyReferenceFileCategory/{id}','{}；须先确认','成功重载目录；引用保护由服务端契约落实'),...crudApi('surveyReferenceFile','fileCategoryId,name,docType,refId,fileKey,fileName,remark；创建追加surveyId'),api('批量导出','GET','/surveyReferenceFile/downloadFileObject/{fileKeys}','选中的fileKey以下划线连接；不在文档记录真实key','blob；完成后解除下载loading')]},
  referenceForm:{route:ROUTE+'prepare/referenceFile/edit',fields:FIELDS.referenceForm,mode:'form',object:'surveyReferenceFile',goal:'在有效目录下选择系统已有文档或上传新文件建立调研文档。',
    controls:[['目录前置','未选择目录时“新建”提示“请选择目录”；此提示不展示文档表单。先完成目录选择后才进入文档新增。'],['文档来源单选','1显示引用文档下拉，2显示上传控件；只校验当前可见分支必填项。切换不自动删除此前远端文件。'],['上传 / 移除','选择后立即请求文件上传；成功取得fileKey/fileName；移除清空引用。上传中禁用提交，失败恢复并保留名称/描述。'],['提交 / 取消 / 返回','主记录提交后返回；取消不新增文档主记录，但不能撤销已经上传的文件。']],
    layout:'目录名称弹窗与文档新增是两个目标。文档详情页按名称、来源单选、条件引用下拉或上传、描述排列；描述全宽；右上返回，底部取消/提交。前置提示截图仅用于目录条件，不作为此表单实拍。',
    apis:[listApi('referenceFile','已有文档候选；调用端未传分页参数'),...crudApi('surveyReferenceFile','fileCategoryId,name,docType,refId,fileKey,fileName,remark；创建加surveyId')]},
  documentList:{route:ROUTE+'document',fields:FIELDS.documentQuery,mode:'list',object:'referenceFile',goal:'维护可被调研准备引用的独立参考文档库。',columns:'序号、文档名称、描述、上传时间、上传人、操作',
    controls:[['文档名称 / 上传人','trim并按name、createUsername查询；重置回第一页。'],['新增 / 编辑','打开600px“上传文档”对话框；编辑回填现有fileKey/fileName；不套用调研目录表单。'],['下载','先以fileKey换取originKey，再请求OSS文件并保存；失败不改变文档记录。'],['删除','确认后删除referenceFile记录；被引用文档保护与物理文件清理分开处理。']],
    layout:'上方文档名称/上传人筛选和查询/重置；其下右侧新增、文档列表、底部分页；行操作为编辑、下载、删除。',
    apis:[listApi('referenceFile','{name,createUsername,pageRequest:{pageNo,pageSize,order}}'),...crudApi('referenceFile',documentKeys)]},
  documentForm:{route:ROUTE+'document',fields:FIELDS.documentForm,mode:'form',object:'referenceFile',goal:'上传并登记独立文档，供后续调研引用。',
    controls:[['文档名称 / 描述','名称trim且必填，最长50；描述可空，最长100。'],['上传文档','单文件选择后立即上传；成功回填fileKey/fileName；失败解除禁用。'],['移除文件','只清草稿fileKey/fileName；没有远端删除契约时不宣称物理删除完成。'],['确认 / 取消 / 关闭','确认校验后POST或PUT文档元信息；取消或右上角关闭不保存元信息，已上传文件按临时文件清理契约处理。']],
    layout:'背景列表蒙层；居中约600px白色弹窗，顶部“上传文档”及右上关闭；单列为文档名称、上传文件及格式提示、描述；底部右侧取消、确认；上传进行中显示加载提示并禁用确认。',
    apis:crudApi('referenceFile',documentKeys)},
  configList:{route:'/dop/dbms/config/applyConfig/index',fields:FIELDS.configQuery,mode:'list',object:'tapplyconfig',goal:'选择项目/空间，查看或设置六类调研成果的字段配置。',columns:'序号、项目名称、更新时间、更新人、操作',
    controls:[['配置','进入applyConfig/edit，id=行id、optType=edit；不是新建空间。'],['查看','相同目标以optType=view打开；禁用选择，无应用按钮。'],['列表加载 / 翻页','按分页读取项目配置；不凭空增加独立配置主记录的新增、删除入口。']],
    layout:'白色项目表列项目名称、更新时间、更新人，右端配置/查看；不套用文档或委办局筛选表单。',
    apis:[api('项目配置列表','POST','/tapplyconfig/findProjectPage','pageRequest:{pageNo,pageSize,order}','datas/total用于列表'),api('字段配置读取','POST','/tapplyconfig/finds','{formType,businessId:0,spaceId:route.query.id}','资源配置数组')]},
  configView:{route:'/dop/dbms/config/applyConfig/edit',fields:FIELDS.config,mode:'config',object:'tapplyconfig',goal:'逐清单查看固定字段和启用的扩展字段，并通过配置模式维护选项。',
    controls:[['六个页签','切换将formType设为index+1，再读取当前spaceId字段；查看只读，编辑切换前应保护尚未应用的草稿。'],['选择 / 全选','view全部禁用；edit只改变非固定行；固定行带星号并隐藏勾选控件，不能取消必选字段。'],['添加 / 删除自定义字段','编辑添加本地行{name:"",checked:false,optionalType:"0"}；已有自定义行删除须确认并即时DELETE；新增未保存行只从草稿移除。'],['应用','先检查资源名称非空；仅非固定行组成修改数组，每项含isEnable,spaceId,formType,name,enName,optionalType及已有id。成功提示应用成功后返回。'],['取消 / 返回','不提交尚未应用的配置草稿；已执行的服务器字段删除不因取消自动恢复。view只提供返回。']],
    layout:'顶部横排信息系统、数据目录、数据字典、接口资源、数据需求、业务需求六页签及最右返回；下方“查看配置”或“编辑配置”，资源表左列选择、右列资源名称；固定行带星号浅底色，表格内部纵向滚动。view底部不显示应用/取消，edit底部右侧取消/应用。',
    apis:[api('读取字段','POST','/tapplyconfig/finds','{formType:1..6,businessId:0,spaceId}','数组；optionalType==2映射isMust，isEnable==1映射checked'),api('应用配置','PUT','/tapplyconfig/modifys','array<{isEnable:0|1,spaceId,formType,name,enName:name,optionalType,id?}>；仅非固定行','提示应用成功后返回'),api('删除自定义字段','DELETE','/tapplyconfig/{id}','仅已存在且optionalType="0"的字段，确认后请求','重载当前页签；未保存本地行只移除草稿')]},
  collection:{route:ROUTE+'collection',fields:[...FIELDS.collection,...FIELDS.collectionForm],mode:'workflow',object:'surveyReportSysData',goal:'为调研目录成果登记归集责任、计划及实际完成结果。',columns:'序号、源数据单位、源数据系统、信息资源名称、表中文名称、表英文名称、字段数量(个)、接入方式、接入状态、数据量(条)、责任人、归集时间、操作',
    controls:[['四项筛选 / 查询 / 重置','按companyName,belongSysName,resourceName,resourceEnName查询；导出沿用这四项。'],['归集登记 / 查看','进入collection/edit，传id,optType；源数据及接入状态只读；维护数量、责任人、计划时间和描述。'],['完成','500px弹窗填写collectTime和explanation；以judgeCollect="3"合并当前记录并提交；planningTime将T替换为空格。'],['重开','警告确认后judgeCollect="2"，collectTime清空；其他字段保留再提交；成功刷新。'],['导入 / 导出','导入dataCollect模板及Excel；确认才写业务。导出按四项筛选读取blob。没有直接创建归集主记录或删除的页面入口。']],
    layout:'列表顶部首行显示源数据单位、源数据系统、信息资源名称三个筛选框，右端查询、重置、展开；展开区补表英文名称。下方独立白色表区右上导入/导出，中部归集表，底部分页；空态在表格中央。登记页两列只读源信息，下面数据量/责任人、计划完成时间、全宽描述；完成框单列实际时间和说明。',
    apis:[listApi('surveyReportSysData','companyName,belongSysName,resourceName,resourceEnName,pageRequest'),api('读取','GET','/surveyReportSysData/{id}','记录id','回填源字段与归集信息'),api('登记/完成/重开','PUT','/surveyReportSysData/dataCollect/{id}','字段见collectionForm；judgeCollect分别1/3/2；完成与重开合并原记录','成功刷新列表；collectStatus显示0未接入/1进行中/2已完成，不与judgeCollect混用'),membersApi,api('导出','POST','/surveyReportSysData/dataCollect/export','{companyName,belongSysName,resourceName,resourceEnName}','blob'),api('导入模板','POST','/surveyReportSysData/dataCollect/template','{}','blob'),api('确认导入','POST','/surveyReportSysData/dataCollect/import','FormData.file','成功提示后刷新；不把文件选择当导入成功')]},
  overview:{route:ROUTE+'overview/chart',fields:FIELDS.overview,mode:'diagram',goal:'以项目一张图浏览当前空间目标、管理员和委办局联系关系。',
    controls:[['进入概览','先读取当前空间，再读取最多100条委办局样本；完整范围超出单页时应提示并提供继续读取，不把单页当全部。'],['文字 / 电话','只读展示；电话分组仅为排版，不增加拨号或消息发送行为。'],['刷新 / 重入','清空旧委办局集合后重新读取；空值不导致split异常，重复进入不重复累加。']],
    layout:'左侧保留数据需求管理导航；右侧标题“项目一张图”。白色画布从左上蓝色空间标题沿纵向连接线展开，右侧绿色块显示项目目标，浅橙色块显示空间管理员及电话；有委办局时在下方生成包含领导、联系人、电话、科室、团队的分支卡片。画布可滚动，空委办局仍保留空间头部。',
    apis:[workspaceApi,listApi('surveySubject','{pageRequest:{pageNo:1,pageSize:100,order:[{prop:"id",asc:false}]}}；不在API层补surveyId')]},
  chart:{route:ROUTE+'report/chart',fields:FIELDS.chart,mode:'chart',goal:'分开查看调研数量、完成情况及数据归集统计和趋势，进入相应明细。',
    controls:[['调研 / 归集报表页签','切换组件分别读取其统计；不能把调研完成率混作归集完成率。'],['图例 / 数量卡 / 分类图','使用返回的name/count及页面单位；值为0必须由成功响应得出，加载默认值不代表统计为0。'],['详情 >','打开对应完成情况、接入、更新频率、资源或归集趋势明细；带上所选统计分类与时间范围。'],['趋势查询','使用按日、周、月粒度重新请求，旧响应不得覆盖新时间范围；分类空值与异常分别呈现。']],
    layout:'上方“数据调研报表/数据归集报表”两个页签。调研页顶行依次为委办局数、系统数、信息资源数、信息项数量、数据需求数、业务需求数、接口数七张彩色卡；第二行三张白色图表卡依次为调研完成率、数据接入方式占比、数据更新频率占比，标题左对齐、右上“详情 >”，主体为环图；其下全宽资源数量图。归集页另有数量、完成、接入量与趋势分区。明细复用标题/右侧返回、筛选、表格和分页，返回恢复原报表页签。',
    apis:['quantity','completion','accessWay','updateFrequency','dataResource','dataCollectQuantity','dataCollectCompletion','dataCollectAccessData','dataCollectAccessWay'].map(key=>api('统计 '+key,'GET','/dataResearchReport/'+key,'{}','页面读取分组/数量；各统计单位与计算口径分别对齐')).concat(['completionPage','page','dataCollectCompletionPage','dataTrendPage','dataTrend'].map(key=>api('明细/趋势 '+key,'POST','/dataResearchReport/'+key,'使用对应明细组件字段和pageRequest；趋势条件见共用规则','明细读取datas/total；趋势读取数组')))},
};
for(const [kind,r] of Object.entries(REPORTS)){
  PROFILES[kind]={route:ROUTE+'report/'+r.route,mode:'report',object:r.api,goal:`查询${r.title}，在具体调研计划中维护成果，供汇总与归集使用。`,fields:[...r.filters,...pageFields,...r.fields],columns:'序号、'+r.columns+'、操作',
    layout:`全局${r.title}顶部为相应筛选、查询/重置，表格上方提供导出，列表末列查看与底部分页。进入计划成果后标题显示委办局，隐藏重复单位列，并按optType开放新增/导入及行编辑/删除；新增和编辑页使用白色两列详情表单，长文本和子表全宽，右上返回，底部取消/提交。字段顺序依本条维护字段表，扩展字段位于固定字段之后。`,
    controls:[...r.filters.map(row=>[row[0],row[1].includes('select')?'候选按code/name展示；清空更新筛选草稿，查询时提交code。':'输入trim且可清空；按绑定名加入筛选。']),['查询 / 重置 / 翻页','查询回第一页；重置恢复初始筛选且保留计划上下文；翻页继续使用已提交条件。'],['查看','edit页面optType=view，按记录id读取并禁用表单；不执行保存、上传或目录编目。'],['计划内新增 / 编辑 / 删除','仅surveyPlanId有效且optType不为view时开放维护；编辑按id回读，删除先确认。全局汇总清单不额外增加维护入口。'],['表单控件与联动',r.interaction],['保存 / 取消 / 返回','提交固定字段与applyConfigDoList，计划内创建带surveyPlanId；取消不保存成果记录，已上传文件单独清理。'],['导入 / 导出','计划内导入excel，实施总页导入excelAll；导出按有无surveyPlanId选择excel/excelAll，沿用当前筛选。']],
    apis:[listApi(r.api,r.filters.map(row=>row[0].match(/（(.+)）/)[1]).join(',')+',pageRequest；计划内加surveyPlanId'),...crudApi(r.api,r.fields.map(bindingName).join(',')+'；applyConfigDoList保留配置id/字段定义/fieldValue；路由有surveyPlanId则加入',kind==='dictionary'?'/tdatadictionary/addDataDictionary':`/${r.api}`),api('动态字段','POST','/tapplyconfig/finds',`{formType:${r.formType},businessId:0,optionalType:3,isEnable:1}`,'读取当前成果表单扩展项；不自行增加字段'),enumApi,api('导出','POST',`/${r.api}/export/{excel|excelAll}`,'surveyPlanId及当前筛选；有计划id用excel，否则excelAll','blob；不宣称只导当前页或全部过滤行直至后端契约对齐'),api('导入模板','GET',`/${r.api}/export/template`,'{}','Excel模板'),api('确认导入','POST',`/${r.api}/import/{excel|excelAll}`,'FormData.file；excel加surveyPlanId，excelAll加milestoneId','成功刷新列表；失败保留恢复入口，不伪报导入成功')],
  };
  if(['resource','dictionary'].includes(kind))PROFILES[kind].apis.push(api('所属系统候选','POST','/surveyReportSys/list','{surveyPlanId:route.query.surveyPlanId}','系统列表；目录取sysName，字典取id并回填sysName'));
  if(kind==='resource')PROFILES[kind].apis.push(api('资源格式候选','POST','/codeSetConfig/list','{businessKey:"SURVEY_REPORT_SYS_DATA__RESOURCE_FORMAT1"}；二级改为FORMAT2并加pcode','候选code/name；一级变化清空旧二级值'),listApi('tdatadictionary','{searchKey,pageRequest:{pageNo:1,pageSize:100},surveyPlanId}'));
}

// Complete the chart contracts individually; they do not all use the same filters.
PROFILES.chart.apis=PROFILES.chart.apis.filter(row=>!row[0].startsWith('明细/趋势')).concat([
  api('调研完成明细','POST','/dataResearchReport/completionPage','{milestoneName,surveySubjectName,status,pageRequest}','datas/total；状态0已完成、1进行中'),
  api('接入/频率/资源明细','POST','/dataResearchReport/page','接入{resourceName,shareWay,pageRequest}；频率{resourceName,updateFrequency,pageRequest}；资源{resourceName,companyName,pageRequest}','各目标分别使用自己的筛选，不交叉保留旧页条件'),
  api('归集完成率明细','POST','/dataResearchReport/dataCollectCompletionPage','{companyName,pageRequest}','datas/total；单位行提供companyId/companyName定位下钻'),
  api('归集单位下钻','POST','/dataResearchReport/page','{companyId:route.query.id,belongSysName,resourceName,resourceEnName,pageRequest}','读取本单位资源；服务端验证companyId访问范围'),
  api('归集趋势','POST','/dataResearchReport/dataTrend','{flag:dateType}；0日、1周、2月','date/count数组；count除10000展示万条，按日期排序'),
  api('趋势明细','POST','/dataResearchReport/dataTrendPage','{collectTime:"yyyy-MM-dd",pageRequest}','datas/total；日期为空的请求语义按契约处理'),
  api('归集完成明细导出','POST','/dataResearchReport/dataCollectCompletion/export','当前明细筛选；单位下钻包含companyId','blob；不改变归集状态'),
]);

const NFRS=[
  ['DBMS-NFR-001','权限与数据隔离','所有读写、统计、导入导出、上传下载均以服务端会话授权；按spaceId/surveyId/surveyPlanId和对象id逐级验权。localStorage、optType、禁用控件和菜单可见性不授予权限。','隔离环境至少使用可维护、只读、跨空间三组授权身份；直接修改路由/请求id及fileKey，越权请求被拒绝、无额外数据和状态变化。','DBMS-100、DBMS-125、DBMS-130、DBMS-111及六类成果'],
  ['DBMS-NFR-002','传输与隐私','业务和文件通过TLS传输；错误、审计、URL、AI输入不带会话凭据、秘密头值或无必要的联系电话。用户有权限的联系人资料按业务原值展示，不以遮盖替代权限。','隔离网络及日志检查TLS、混合内容、认证头泄漏和测试标记；上传/下载与统计使用相同授权边界；任何明文秘密或跨域泄漏判失败。','DBMS-102、DBMS-117、DBMS-520、DBMS-521、DBMS-500'],
  ['DBMS-NFR-003','输入与安全渲染','目录/扩展字段/文件名/公式均作为文本；目录搜索转义正则字符，禁止拼接innerHTML。服务端白名单校验字段、数值、枚举和关联id；接口地址不自动执行请求，公式不执行SQL或脚本。','使用含尖括号、引号、正则元字符和脚本测试标记；均按文本显示且搜索不崩溃；绕过前端输入限制仍由服务端拒绝非法值。','DBMS-505、DBMS-506、DBMS-512、DBMS-514、DBMS-516、DBMS-522'],
  ['DBMS-NFR-004','重复提交与并发一致性','每个对象保存/删除/完成/重开同一时刻只允许一项在途动作；确认对话框只触发一次请求。服务器执行状态前置校验及原子更新；超时结果未知先回读，不能自动重放写入。','隔离环境连续触发按钮和键盘入口、双会话修改、断开响应后重入，核对请求数/记录数/最终状态；不得重复新增、丢失他人更新或重复完成。幂等与版本字段按已签署契约传递。','DBMS-102、DBMS-107、DBMS-117、DBMS-520、DBMS-509、DBMS-517、DBMS-522'],
  ['DBMS-NFR-005','文件安全与生命周期','文件类型白名单前后端一致，限额从发布配置读取并在选择前展示；multipart由浏览器生成boundary。文件键有归属和授权校验；上传失败不生成有效引用，主表取消不声称撤销已上传文件；临时文件须按服务端生命周期清理。','在隔离文件存储测试格式伪装、超配置限额、失败/取消/重复上传及跨对象key；检查实际FormData、主记录引用和清理结果；无文件配置、归属或清理协议不能判通过。','DBMS-506、DBMS-521、DBMS-514及会议纪要/附件'],
  ['DBMS-NFR-006','导入与导出一致性','Excel导入提交前展示模板类型和目标阶段/计划；合法与非法行的成功/拒绝及回滚语义由服务端事务契约确定并逐行反馈。导出使用该按钮实际参数及授权范围，文件中的公式文本按安全规则转义。','隔离环境准备合法、混合错误、空文件及重复导入样本；核对请求上下文、行级结果、数据库回读和导出筛选；无行级结果契约时不得声称全部成功或全量导出。','DBMS-100、DBMS-120、DBMS-125、DBMS-130、DBMS-511～516'],
  ['DBMS-NFR-007','页面及查询性能','开发验收规模：每空间10000条计划/成果，常规列表每页20；10个独立并发读会话，点击查询至本次表格和分页可操作P95≤3秒，合法查询技术失败率≤1%。图表每个面板独立反馈，不能因一个失败阻断其余结果。','在规定环境冷/热缓存分别测每类查询≥200次有效请求，同时计全部失败；P95按ceil(0.95×N)取升序样本；缺环境信息、样本不足、任一阈值超出即不通过。','DBMS-100、DBMS-105、DBMS-115、DBMS-120、DBMS-125、DBMS-130、DBMS-510及六类清单'],
  ['DBMS-NFR-008','超时与故障恢复','读取与写入均设置有限且可配置的超时；公共兜底20000ms不覆盖更具体URL配置。失败解除loading并保留筛选/草稿；读重试保持条件，旧请求不得覆盖新页签、筛选或对象；写入无自动重试。','逐一注入超时、断网、5xx、202业务拒绝、无权限和迟到响应；核对禁用恢复、输入保留、提示、请求次数；HTTP成功而解析失败不得显示空成功。','DBMS-100、DBMS-120、DBMS-125、DBMS-130、DBMS-510、DBMS-522及维护表单'],
  ['DBMS-NFR-009','兼容与页面适配','Windows10/11上的Chrome/Edge当前及前一稳定大版本；1440×1000、1500×1000、1366×768视口和200%缩放；320 CSS像素窄窗口保留字段、确认/取消和返回可达。宽表允许局部横向滚动，弹窗不超出可滚动视口。','逐布局测试最长文本、多成员、扩展字段、空表、错误、上传中及弹窗；主要控件遮挡、页面不可滚动或操作不可达即失败，记录具体版本。','全部DBMS页面'],
  ['DBMS-NFR-010','可访问性','字段有可关联标签和错误提示；必填/状态不单依颜色表达；查询、树、页签、下拉和对话框支持键盘，打开后聚焦、关闭后返回触发控件；忙碌和错误向辅助技术播报；正文对比度≥4.5:1。','自动扫描加人工Tab/Shift+Tab/Enter/Escape、读屏和缩放检查；确认框取消无写请求，焦点不丢失或被锁在不可见区域；任一主要流程不能完成即失败。','DBMS-102、DBMS-107、DBMS-117、DBMS-505、DBMS-520、DBMS-521、DBMS-522'],
  ['DBMS-NFR-011','审计与可观测性','目的失焦保存、CRUD、导入导出、文件操作、计划完成/重开、归集和配置动作记录操作者、空间/调研/对象id、动作、服务器时间、结果及关联请求标识；不记录秘密或无必要正文。','隔离环境对每类成功、拒绝、超时结果串联前端请求、业务结果及授权审计；只看到提示或有请求头名称不能算已审计；保留期限与查询权限采用发布政策。','DBMS-100、DBMS-125、DBMS-130、DBMS-506、DBMS-521、DBMS-522及成果维护'],
  ['DBMS-NFR-012','统计正确性与容量完整性','调研status、归集collectStatus和judgeCollect分开建模；万条与条按10000换算。里程碑时间进度使用日历日期，不用yyyyMMdd相减；空值/分母0不产生NaN或Infinity。概览超过100条委办局须分页补齐或明确截断。','构造跨月/跨年/同日/反向日期、0分母、空值、101条委办局和不同数量单位；以签署的统计口径逐项验算，缺失/失败不能当0；记录统计截止时间和授权范围。','DBMS-001、DBMS-105、DBMS-500、DBMS-507、DBMS-510、DBMS-517'],
  ['DBMS-NFR-013','维护性与资源释放','统一配置网关前缀、枚举、分页和请求处理；切换对象/离开页面清理过时响应、监听及objectURL；表单使用明确DTO映射。需求生成刷新幂等，已发布编号、截图来源与归档摘要保持不变。','重复进入/退出和开关下载弹窗30次，核对无重复请求/累加卡片且URL被释放；运行契约、生成器及反例回归，任何来源丢失、编号重排或伪造执行状态均失败。','全部DBMS页面及文档维护工具'],
  ['DBMS-NFR-014','AI建议质量与人工控制','AI仅使用当前获授权且经用户选择的调研资料，输出字段映射/相似项/归集异常的引用依据与不确定项；采纳只更新可撤销草稿。保存、完成、重开、归集、权限和配置仍由人工独立确认；无模型时可完成原人工流程。','隔离评价集至少30例，含缺失字段、跨空间、资料冲突和恶意指令；要求0次越权读取、0次自动业务写入、每条建议有来源；分别报告任务准确率、用户采纳、延迟及成本，未设业务阈值不得宣称质量达标。','DBMS-520、DBMS-511～516、DBMS-517'],
];
const esc=v=>String(v??'').replaceAll('|','&#124;').replace(/\r?\n/g,'<br>');
const rows=values=>values.map(row=>'| '+row.map(esc).join(' | ')+' |');
const table=(head,values)=>['| '+head.join(' | ')+' |','|'+head.map(()=>'---').join('|')+'|',...rows(values),''];
const fieldHead=['字段名称与绑定名','类型/控件','是否必填','默认值','长度/范围/单位','格式及校验规则','错误提示','条件/状态'];
const binding=row=>row[0].slice(row[0].lastIndexOf('（')+1,-1);
const hasFiles=kind=>['referenceList','referenceForm','documentList','documentForm','interface','track'].includes(kind);
const isForm=kind=>PROFILES[kind].mode==='form';
const isList=kind=>['list','report','workflow'].includes(PROFILES[kind].mode);
const nfrFor=kind=>['001','002','003','004','007','008','009','010','011','012','013',...(hasFiles(kind)?['005']:[]),...(isList(kind)?['006']:[]),...(REPORTS[kind]?['014']:[])].map(n=>'DBMS-NFR-'+n);
function screenshot(id){const folder=id.startsWith('H-')?'../evidence/live-recheck-20261022/':'../evidence/';return `[${id}截图](${folder}${id}.png) / [元素](${folder}${id}.json)`;}

function acceptanceFor(kind){
  const p=PROFILES[kind],common=[
    `用获授权身份进入${p.route}，核对标题、字段及可用入口；切换只读身份与另一空间，不出现或返回越权数据。`,
    '模拟超时、202拒绝和服务端失败；显示可理解错误，恢复禁用状态并保留当前条件/草稿；读取失败可重试，写结果未知先回读。',
  ];
  const own={
    officeList:['输入name、leader查询并清空/重置；请求含pageRequest，列表联系资料与datas/total一致；无匹配显示空态。','点击目的文本、输入非空purpose并失焦，只发送一次PUT survey/modify；空白和未变化不保存；拒绝时保留文本。','分别取消删除、取消Excel选择框和确认合法导入；取消不发对应写请求，导入实际FormData仅file；导出按name/leader下载。'],
    officeForm:['填写前五项合法值并提交；POST surveySubject携带surveyId，回列表可读取新id；编辑仅PUT当前id，view无提交。','分别清空前五项、输入100/101字符、描述500/501字符；电话用20/21位数字和非法字母，按格式规则阻止无效保存。','改变草稿后取消/返回，重入读取原值；连续触发提交只一项在途请求；body不包含样例leaderPhone和leaderJob默认值。'],
    teamList:['按团队name查询、重置和翻页；请求附surveyId，组长/多成员与响应对应且长文本可读。','进入查看/编辑回填同一id的组长成员；删除取消不发请求，确认后回读且被引用失败不先移除行。','发条件A/B且让A迟到；最终只显示B。返回恢复提交条件，失效候选不自动选其他成员。'],
    teamForm:['设置name、leaderId并多选成员，POST surveyTeam包含surveyTeamMemberList:[{memberId}]和surveyId，保存后回读关联。','名称100/101、描述500/501字符；空name/leaderId阻止提交；候选加载失败与零候选分别反馈。','清空最后一名成员并提交，按契约表达空集合；取消不保存；详情按memberId回填，不以managerId误判。'],
    milestoneList:['读取milestone/page并按日期组织阶段；同日、跨月/跨年进度与日历计算一致，空阶段显示新增入口。','从卡片查看计划传query.id；新建计划传milestoneId，所进入页签或表单确实对应该阶段。','取消阶段删除无DELETE；有引用被拒绝时原卡片仍在；成功删除后重新读取并更新卡片。'],
    milestoneForm:['填写name、chargeUserId、开始/结束日期，POST milestone带surveyId；详情和计划入口读取同一阶段。','name30/31、remark1000/1001字符；四必填逐一空白、开始晚于结束被阻止，同日允许。','跨月日期不按数字相减；取消不保存；成员候选与回填始终按memberId，失效负责人不静默替换。'],
    planList:['按阶段、委办局和多团队查询，body为milestoneId,surveySubjectName,surveyTeamIds,pageRequest；切换阶段回第一页。','无里程碑不发计划列表和导入写请求；从新增/编辑进入正确阶段且view禁用；删除取消不发DELETE。','导入实际FormData含file/milestoneId；导出只传milestoneId/surveySubjectName，不声称已按团队过滤；返回恢复页签。'],
    planForm:['选阶段、委办局、调研方式和团队，填地点/联系人/电话/时间，POST surveyPlan含surveyId、对象团队数组及messageMainDo。','缺任一必填或团队空数组阻止提交；remark200/201、电话20/21位分别检查；编辑不可修改阶段。','取消不保存；失效委办局/团队拒绝且保留输入；连续按钮/键盘只一项请求，通知字段不作为消息已送达证明。'],
    track:['按阶段/name/status查计划；0已完成、1进行中；进入八页签成果，id与optType传递一致，view不显示维护按钮。','单项/批量完成必须有ids和actualDate；取消不POST finish；确认成功后状态回读；部分失败按事务契约逐项呈现。','重开只对允许状态经确认PUT reOpen/{id}；取消无请求；状态冲突与超时先回读；不新增独立实施主记录。'],
    referenceList:['选择目录按fileCategoryId查询，根节点清空；树搜索含括号/尖括号仍安全显示，收起后能再展开。','未选目录新建只出现“请选择目录”；选中有效目录才到新增文档；引用文档与上传文档分支不同。','目录/文档删除取消无DELETE；批量下载用所选fileKey下划线连接；被引用删除失败保留树与列表。'],
    referenceForm:['先建/选目录，选择来源1及refId，POST surveyReferenceFile含fileCategoryId/surveyId；来源2先上传再提交fileKey。','名称100/101、描述500/501；引用分支缺refId、上传分支缺fileKey分别阻止提交；只校验当前分支。','取消不创建文档主记录；已上传文件不能声称撤销；上传失败保留名称/描述、无有效文件引用且可重试。'],
    documentList:['按name/createUsername查询、重置及翻页；新增/编辑打开600px弹窗且编辑回填当前文件。','下载依次getOriginKey和OSS下载；授权错误、blob错误可重试且不改变文档元信息。','删除取消无DELETE；服务端引用保护失败保留原行；成功回读；新增与编辑成功后列表展示同一记录。'],
    documentForm:['名称≤50、合法单文件选择立即POST space/common/upload，回填fileKey/fileName；确认才POST referenceFile。','空name/文件、名称51和remark101字符阻止元信息保存；上传中确认禁用，文件失败不成为有效引用。','取消/关闭不保存元信息；移除只清草稿引用，不假称删除远端文件；重新上传后确认只保存当前文件。'],
    configList:['分页POST tapplyconfig/findProjectPage，name/lastModifyTime/lastModifyUsername与行对应。','配置与查看均到applyConfig/edit，query.id=spaceId，optType各自正确；查看六页签全部禁用。','配置列表不出现虚构的新增/删除项目；越权spaceId不能读取字段，返回恢复原页。'],
    configView:['在view模式切换六页签，POST finds包含formType,businessId:0,spaceId；所有勾选禁用、无应用。','edit添加自定义行并勾选，应用数组isEnable为0/1，enName=name，固定optionalType=2不进入提交数组。','删除未保存行仅本地移除；已有行取消无DELETE，确认即时DELETE；之后取消应用不能恢复已删服务器字段。'],
    collection:['四项筛选查询；登记编辑只开放collectDataSize、责任人、计划时间和描述，源信息禁用。','数量0、小数、负数、31字符拒绝；正整数及允许的首个加号通过；单位为条，不能把万条直接当条。','登记/完成/重开分别judgeCollect=1/3/2；完成必填collectTime，重开清空collectTime；成功回读collectStatus而非用指令显示。'],
    overview:['读取workspace/find及surveySubject/page，在项目一张图显示名称/目标/管理员和委办局联系卡。','空电话/空委办局与接口失败分别处理；不出现split异常、伪造0值或丢失空间标题。','重复进入不累加卡片；委办局101条时分页补齐或明确截断；不得把前100条称为全部。'],
    chart:['分别进入调研/归集，核对各统计接口、卡片顺序和单位；任一失败仅影响该面板，错误不显示成有效0。','dateType=0/1/2各发dataTrend的flag，count除10000绘图并按日期排序；迟到响应不覆盖最新粒度。','逐个“详情”进入完成/接入/频率/资源/单位/趋势目标，筛选使用对应参数，companyId下钻保持单位上下文。'],
  };
  if(REPORTS[kind]){
    const r=REPORTS[kind];
    own[kind]=[
      `全局${r.title}按字段表查询/导出及查看；进入surveyPlanId有效且optType!=view的成果页后才出现新增/导入/编辑/删除。`,
      `填写全部必填及扩展字段，创建请求${kind==='dictionary'?'tdatadictionary/addDataDictionary':r.api}带surveyPlanId；修改/详情用同一id；逐项检查长度临界和条件联动：${r.interaction}`,
      `取消${r.title}保存不发送主对象写请求；删除取消无DELETE；导入确认才带file及surveyPlanId或milestoneId，失败不报全部成功。`,
    ];
  }
  return [...own[kind],...common];
}
function flow(kind){
  const p=PROFILES[kind];
  if(isForm(kind))return ['从列表或选定上下文打开新增、编辑或查看；编辑/查看先按id读取详情，依赖候选未加载完成时不允许提交。','按字段表填写输入并处理联动；trim、必填、格式与长度逐项校验，错误定位到对应控件。',...p.controls.filter(c=>/上传|文档来源|日期|团队成员/.test(c[0])).map(c=>c[1]),'确认提交才发送本对象POST或PUT；所有提交入口共用在途锁，失败保留草稿并解锁。','成功提示后返回来路并读取最新持久化记录；取消/返回不保存主记录，文件副作用按文件规则处理。'];
  if(kind==='overview')return ['读取已授权的当前空间信息；显示项目名称、目标、管理员及电话。','读取委办局列表，逐项渲染联系关系；空数组保留空间信息，失败提示重试。','重复进入先清理旧集合；数量超过一次读取范围时分页读取或标出截断，不增加业务写入。'];
  if(kind==='chart')return ['进入调研或归集页签，独立读取各统计面板；每项区分加载、有效数据、空和失败。','按枚举及返回数量呈现图例/卡片；趋势以flag选择日/周/月并按日期排序。','点击每项详情进入对应明细，提交该页筛选与pageRequest；单位下钻使用companyId。','返回恢复原报表页签与粒度；不因打开报表执行归集、导入或状态写入。'];
  if(kind==='configView')return ['从项目配置行携带spaceId和optType进入，按formType读取字段。','view全部只读；edit通过勾选、添加与即时删除分别修改当前配置。','应用先校验名称，固定行排除后PUT修改数组，成功返回；取消只丢弃未应用草稿。','切换页签、返回及离开时保护未应用草稿；即时删除的服务器结果不因取消恢复。'];
  const out=['读取登录授权及当前阶段/目录/计划上下文；初始化筛选和pageRequest。','输入条件、选择候选或页签后查询，按当前请求代次读取列表；重置回第一页并保留对象上下文。'];
  if(REPORTS[kind])out.push('全局清单只查询、查看和导出；进入具体计划成果且为维护模式后开放新增、编辑、删除和导入。');
  out.push(...p.controls.filter(c=>/完成|重开|目的|新增阶段|目录新建/.test(c[0])).map(c=>c[1]),'读取或动作失败解除忙碌并保留条件/草稿；成功后回读原授权范围的列表或状态。');
  return out;
}
function exceptions(kind){
  const out=[['无权限/对象失效','拒绝读取或写入，清除无权内容，提示返回或重新登录；不能以空列表掩盖权限错误。'],['断网/超时/服务器错误','结束忙碌状态，保留筛选或草稿；读可按原条件重试，写结果未知先回读，不自动新增第二对象。']];
  if(isList(kind))out.push(['无匹配/快速切换条件','成功的空结果显示空态并保留筛选；迟到响应不能覆盖新条件；返回恢复同一已提交条件。']);
  if(isForm(kind)||REPORTS[kind]||['collection','configView'].includes(kind))out.push(['空白/超长/组合或重复数据','按本条校验定位字段；重复、引用和唯一性错误以服务端契约反馈，不假设名称全局唯一。'],['保存失败/重复点击/取消','失败保留草稿并解除锁；所有入口只允许一项在途动作；取消不发该主对象保存，已执行上传/删除按独立生命周期处理。']);
  if(['track','collection'].includes(kind))out.push(['旧状态/批量部分失败','服务端按当前状态拒绝过期动作，逐项展示返回结果；批量原子或部分提交按签署契约执行，不以一个成功提示掩盖失败。']);
  if(hasFiles(kind))out.push(['文件不合规/上传中/取消','先校验格式和发布限额；上传失败保留其他输入，上传中禁止主对象确认；取消主表单不承诺已上传文件被删除。']);
  if(kind==='overview')out.push(['空值/委办局超100条','空联系方式安全展示，空间与委办局读取分别反馈；补齐分页或标明截断，重入不累加。']);
  if(kind==='chart')out.push(['空图/0分母/格式异常','有效0与请求失败分开；不渲染NaN/Infinity；单图失败可单独重试，保留其他有效面板。']);
  return out;
}
function renderFeature(entry){
  const p=PROFILES[entry.kind];if(!p)throw new Error('missing DBMS profile: '+entry.kind);
  const r=REPORTS[entry.kind];
  const fields=r?[
    '**列表查询字段**','',...table(fieldHead,[...r.filters,...pageFields]),'**新增/编辑/查看字段**','',...table(fieldHead,r.fields),
  ]:table(fieldHead,p.fields);
  return [`### ${entry.id} ${entry.title}`,'',`**功能入口：** ${p.route}`,
    `**操作类型：** ${{form:'新增/编辑/只读详情',list:'查询及对象维护入口',cards:'阶段卡片及计划关联',workflow:'查询及状态操作',config:'字段查看及配置',diagram:'只读关系概览',chart:'只读统计及明细',report:'汇总查询及计划内成果维护'}[p.mode]}。`,
    '**前置条件：** 已登录且具有目标空间、调研、对象及动作的服务端授权；需要阶段/目录/计划的操作须有有效上下文。',`**业务目的**：${p.goal}`,'',
    `<!-- 完整规格:${entry.id} -->`,'',`#### 1. 页面字段清单（${entry.id}）`,'',...fields,
    '字段属性空白处不授予默认值或取消校验的权限；具体交付采用已签署的数据契约。只读字段不开放输入，名称与对象ID按各字段映射处理。','',
    `#### 2. 页面交互规则（${entry.id}）`,'',...table(['控件/触发方式','行为、联动、禁用与结果'],p.controls),
    isForm(entry.kind)||r?'所有必填、长度与格式校验在提交前统一执行；保存期间按钮及键盘共用入口锁。失败恢复按钮并保留输入；取消和返回丢弃未提交草稿，存在未保存变更时先确认。':p.mode==='config'?'查看模式无写入口；编辑提交共用锁，切换页签及返回保护未应用草稿。':'读取中保留上下文并显示进度；过时响应不更新当前视图，失败与有效空数据分别呈现。','',
    `#### 3. 业务流程与异常分支（${entry.id}）`,'','**操作与规则**：','',...flow(entry.kind).map((v,i)=>`${i+1}. ${v}`),'','**结果与异常处理**：','',...table(['异常分支','页面响应、数据影响与恢复'],exceptions(entry.kind)),
    `#### 4. 接口与数据规则（${entry.id}）`,'',...table(['用途','HTTP方法与相对路径','请求参数/来源/序列化','返回读取与页面结果'],p.apis),
    '**开发处理细则**：JSON请求使用公共会话客户端；GET参数放query，其他方法放body。列表筛选为根键，pageRequest为嵌套对象。具体字段名按上表与[公共数据映射](./子页面与操作细化.md#4-字段枚举和约束)一致；不按展示文字替代ID，不添加虚构的成功码。','',
    `#### 5. 验收标准（${entry.id}）`,'',...table(['验收编号','前提、操作与可检查结果','关联需求','状态'],acceptanceFor(entry.kind).map((v,i)=>[`DBMS-AC-${String(entry.start+i).padStart(3,'0')}`,v,entry.id,'未执行'])),
    `#### 6. 权限与安全要求（${entry.id}）`,'',
    '- 允许访问本页面的主体为获得相应动作授权的已登录用户；服务端分别验证查询、详情、维护、删除、文件、导出及状态操作权限。直接修改route.query、localStorage、optType或对象ID不能扩大访问范围。',
    '- 按空间/调研/计划隔离数据；跨对象引用、已失效候选、目录关系和状态前提须由服务器再次校验。具体角色矩阵属于联调交付契约。',
    '- 敏感请求通过TLS，界面按授权显示业务资料；日志和错误不得含会话凭据。目的失焦、上传、自定义字段删除等即时写入须审计。','',
    `#### 7. 页面布局与状态（${entry.id}）`,'',`- ${p.layout}`,
    ...(p.columns?[`- 表格列顺序：${p.columns}。操作列位于右端，长文本不挤出主要按钮。`]:[]),
    `- 状态：${isForm(entry.kind)?'依赖加载、可编辑、字段错误、上传中（有文件时）、保存中、失败保留草稿、成功返回。查看时禁用输入并隐藏确认。':entry.kind==='overview'?'空间读取中、关系读取中、正常关系图、空委办局、读取失败/重试及截断提示。':entry.kind==='chart'?'各面板独立加载、有效数据、有效空值、读取失败、切换粒度、明细查询及返回。':entry.kind==='configView'?'字段加载、view只读、edit草稿、即时删除中、应用中、应用失败及成功返回。':'初始化、查询中、有记录、空结果、查询失败、确认操作、动作中、结果回读及返回恢复。'}`,
    '- 历史布局样本为1500×1000；F系列图为各自记录的原视口。表单、滚动区和按钮在窄窗口/缩放下保持可达，具体矩阵见模块非功能要求。','',
    `#### 8. 关联文档（${entry.id}）`,'',
    `- 页面与元素：${entry.sources.map(screenshot).join('；')}。`,
    '- [核查记录](./核查记录.md) · [静态实现证据](../evidence/dbms-review-20261026/README.md) · [字段与操作详细规则](./子页面与操作细化.md#4-字段枚举和约束)。',
    `- 适用质量要求：${nfrFor(entry.kind).join('、')}，见[非功能性需求](./需求说明.md#9-非功能性需求)。`,
    '- 所列应用验收均未执行；后端授权、事务、返回数据和审计须以独立核查记录中的外部交付材料完成联调。','',
  ].join('\n');
}

function sharedRules(){return [
  '### 公共请求、响应和返回恢复','',
  '普通DOP接口默认由/back与/dop/factory拼接，空间接口由/back与/dop/space拼接；MODULE_URL_PREFIX允许覆盖模块前缀。本文相对路径采用默认配置，切换环境须复核网关配置。GET使用query，JSON写请求和查询POST使用body；文件使用FormData。','',
  ...table(['环节','具体规则'],[
    ['分页与筛选','pageRequest:{pageNo:1,pageSize:20,order:[{prop:"id",asc:false}]}；查询、重置及页长变化回第一页；翻页保留已提交条件。datas/total映射列表，公共分支兼容数组。'],
    ['加载/空/失败','tableFetchStatus为1加载、2有数据、3空、4失败；成功空数组才显示空结果，权限/网络/结构错误不能转成空成功。迟到响应只属于旧条件，不覆盖当前页。'],
    ['上下文','dop-project-id、dop-survey-id、dop-user-id、dop-isCheck-id为localStorage上下文，读取无值时为0；不参与授权证明。surveySubject/page、surveyPlan/page不会自动附surveyId；团队/里程碑page及基础对象创建包装器会按各自定义附加。'],
    ['列表恢复','sessionStorage.listSearchStore只对相同path恢复筛选和pageRequest；当前仅一份缓存。office列表显式不保存该键。目标为每条返回路径恢复阶段/目录/筛选/分页，不能假定多列表隔离已具备。'],
    ['会话请求','withCredentials=true，使用父应用公共客户端；有值时带adq-token、X-CSRF-TOKEN，另有X-TIMESTAMP、X-NONCE、X-SIGN；这里只定义头名称，不保存实际值。JSON Content-Type为application/json，带X-Requested-With及no-cache配置。'],
    ['超时','按URL配置优先，其次请求数字timeout，再走20000ms兜底；0可能代表无限等待。目标为有限、可配置的超时和可恢复反馈，不把响应时延目标当超时。'],
    ['成功解包','rawData=true返回完整HTTP响应；普通成功返回response.data，不存在模块通用的code=0判定。列表读取datas/total，成员、空间、动态字段和统计各按其调用端字段解析。'],
    ['错误链','HTTP状态等于NETWORK_ERROR_CODE（默认202）进入公共错误处理，使用code/msg后reject；网络/超时提示后reject；1003可抑制全局消息。Blob错误先取文本msg。不能把HTTP 200或promise resolve单独视为持久化成功，写结果需回读。'],
    ['提交/删除','保存先验证再POST/PUT，失败解除loading并保留输入；目标锁住所有重入入口。删除提示“删除操作不能恢复，确定删除吗？”，确认才DELETE，成功刷新，空末页可前移；失败不先删本地行。'],
    ['返回/取消','有未保存草稿时先确认；取消离页留在当前页，确认离页丢弃未提交主记录；浏览器后退执行同一保护。文件上传、目的失焦、自定义字段即时删除有独立副作用，取消主表单不撤销。'],
  ]),
  '### 基础对象字段、DTO和上下文','',
  ...table(['对象','创建/修改请求字段','读写与数据边界'],[
    ['委办局','name,leader,contact,contactJob,contactPhone,officeName,address,remark；POST额外surveyId','POST /back/dop/factory/surveySubject；GET/PUT/DELETE /back/dop/factory/surveySubject/{id}；leaderJob/leaderPhone隐藏样例不作为新建默认资料透传。'],
    ['调研团队','name,leaderId,surveyTeamMemberList:[{memberId}],remark；POST额外surveyId','POST /back/dop/factory/surveyTeam；GET/PUT/DELETE /back/dop/factory/surveyTeam/{id}。成员对象数组不能换成ID数组；清空集合采用签署的空集合语义。'],
    ['里程碑','name,chargeUserId,planBeginTime,planEndTime,remark；POST额外surveyId','POST /back/dop/factory/milestone；GET/PUT/DELETE /back/dop/factory/milestone/{id}；日期yyyy-MM-dd；开始≤结束，同日可用。'],
    ['调研计划','milestoneId,surveySubjectId,officeName,way,address,contact,contactPhone,planDate,surveyPlanTeamList:[{surveyTeamId}],remark,messageInfo,messageMainDo；POST额外surveyId','POST /back/dop/factory/surveyPlan；GET/PUT/DELETE /back/dop/factory/surveyPlan/{id}。planDate使用yyyy-MM-dd HH:mm；编辑阶段禁用。messageMainDo:{messageInfo:项目名插值,messageSource:route.query.pointId,type:"任务"}，不据此宣称通知送达。'],
    ['调研目的','PUT /back/dop/factory/survey/modify，body:{purpose:string}','POST /back/dop/factory/survey/findOne读取；purpose非空且变更后失焦保存，最长2000字符。失败保留草稿，不以离开文本框等同保存成功。'],
  ]),
  '里程碑时间进度：将日期解析为同一业务时区的日历日，开始之前0%，结束之后100%；开始与结束同日，在该日开始前为0%、从该日起为100%。其余按clamp((当天-开始日)/(结束日-开始日),0,1)×100计算，四舍五入到整数；空值、反向区间不计算并显示日期错误。阶段卡按开始日期排序，区间包含关系只控制布局，不代表业务依赖或实际完成率。','',
  '### 八类实施成果与动态字段','',
  '入口：/dop/dbms/requirement/implementation/track/subList?id={surveyPlanId}&optType={edit|view}&surveySubjectName={encodedName}；名称encodeURIComponent传递并安全decode展示，id是计划主键。六类成果haveOperateBtn=surveyPlanId有效且optType不为view；会议纪要/附件也必须有有效计划上下文后才开放维护。全局汇总只查询、查看、导出。','',
  ...table(['页签/formType','查询及对象接口','固定字段JSON键与联动'],Object.entries(REPORTS).map(([kind,r])=>[
    r.title+' / '+r.formType,`POST ${BASE}/${r.api}/page；GET/PUT/DELETE ${BASE}/${r.api}/{id}；POST ${BASE}${kind==='dictionary'?'/tdatadictionary/addDataDictionary':'/'+r.api}`,
    r.fields.map(binding).join(',')+'；计划内POST附surveyPlanId；'+r.interaction,
  ])),
  ...table(['动态项/关联','读取/序列化/交互'],[
    ['动态字段查询',`POST ${BASE}/tapplyconfig/finds，{formType:1..6,businessId:0,optionalType:3,isEnable:1}。系统/目录/字典按isPullFlag决定控件；接口/数据需求/业务需求直接使用文本输入框。`],
    ['动态项回显/提交','系统/目录/字典/接口读取详情后按name匹配现行配置，保留原id/fieldValue并按name长度排序，新配置值初始空字符串。数据需求/业务需求新增直接采用配置响应，不强加该排序、匹配或空值初始化。applyConfigDoList保留配置定义及id/name/isPullFlag/pullValues/fieldValue，不自行重命名或制造必填；删除/重命名/重复字段的迁移采用配置版本契约。'],
    ['下拉映射','系统/字典：isPullFlag严格为"0"时pullValues.split(",")，每项文字同时作为label和值；目录普通下拉将拆分值转{name:值,code:值}，选择提交code。目录资源格式一级/二级无论普通标志均采用专门联动选择；其他项为文本。'],
    ['系统扩展','一般文本最长150字符；dataAccessWay改为非“其他”清空dataAccessDesc，描述控件仍显示。固定字段真正必填见字段表，不把配置页星号直接变为前端required。'],
    ['其余扩展','目录/字典一般文本最长50；数据需求/业务需求始终输入文本、最长50；接口始终输入文本，一般50，名为“接口示例”时maxlength为空，仍是输入框。动态必填和数值类型不由AI自行扩展。'],
    ['系统选择',`POST ${BASE}/surveyReportSys/list，{surveyPlanId}。目录belongSysName提交sysName文字；字典projectSysId提交id并回填projectName=sysName，不能统一强制改为ID。`],
    ['资源格式联动',`POST ${BASE}/codeSetConfig/list，一级{businessKey:"SURVEY_REPORT_SYS_DATA__RESOURCE_FORMAT1"}；二级{businessKey:"SURVEY_REPORT_SYS_DATA__RESOURCE_FORMAT2",pcode:一级code}。一级变化先清二级再加载，失败不保留失效选项。`],
    ['信息项选择',`POST ${BASE}/tdatadictionary/page，{searchKey,pageRequest:{pageNo:1,pageSize:100},surveyPlanId}。搜索先回第一页再请求；选择确认替换dataItemList，不追加；取消保持原子表。`],
    ['信息项映射','每个选中字典映射{backupId:id,enTableName:tableNameEn,zhTableName:tableNameCn,enName:columnNameEn,name:columnNameCn,dataType:columnType,primaryKey:isKey,nullable:isNullable}。只建立目录信息项，不改写字典源记录。'],
    ['数据字典类型','columnType实际控件读取codeSetConfig/allMap返回的SURVEY_REPORT_SYS_DATA_ITEM__DATA_TYPE，以name显示、code提交；isKey/isNullable分别读取PRIMARY_KEY/NULLABLE枚举，不能据英文名反转含义。组件中其他静态类型数组不作为当前控件固定候选；associatedComponentIdList使用获授权构件候选契约。'],
    ['数据需求条件','supplyWay严格等于“接口”时显示且校验inParam/outParam；change先清两值；其他方式不因隐藏空项阻断保存。demanderPhone非必填，非空执行电话规则。'],
    ['资料文本','interfaceAddress、入出参和formula均为资料字段，不执行远端HTTP、SQL或脚本；采集到的地址也不自动变成公开链接。'],
  ]),
  '### 会议纪要、附件及两类参考文档','',
  ...table(['对象/入口','字段、接口与交互'],[
    ['会议纪要/附件',`实施八页签中的两个独立列表。POST ${BASE}/meetingSummary/page或/attachment/page，body含surveyPlanId及pageRequest；新增POST同名对象，详情/修改/删除用GET/PUT/DELETE同对象/{id}。`],
    ['实施文档表单','复用600px上传弹窗：name必填、trim≤50；fileName及有效fileKey必填；remark≤100；保存加surveyPlanId。编辑回填文件引用，删除先确认；查看模式禁用维护。'],
    ['独立文档库',`/dop/dbms/requirement/document；POST ${BASE}/referenceFile/page按name/createUsername及pageRequest查询；POST referenceFile、GET/PUT/DELETE referenceFile/{id}维护。字段name≤50、remark≤100、fileKey/fileName；不主动添加surveyPlanId。`],
    ['准备参考文档',`/dop/dbms/requirement/prepare/referenceFile；左树POST ${BASE}/surveyReferenceFileCategory/tree。未选目录新建只提示“请选择目录”；文档POST surveyReferenceFile，含fileCategoryId,name,docType,refId,fileKey,fileName,remark,surveyId。name≤100、remark≤500。`],
    ['来源分支','docType="1"引用referenceFile/page中的refId；docType="2"显示文件上传；仅当前分支校验。切换不自动清理远端文件，保存只建立当前有效引用；查看只读。'],
    ['目录CRUD',`新增POST ${BASE}/surveyReferenceFileCategory，{pid,labelName,categoryName:labelName}；编辑PUT /surveyReferenceFileCategory/{id}；删除确认后DELETE同路径。目录名称长度、层级、重名范围及引用保护采用后端契约；删除失败不先移除节点。`],
    ['批量下载',`GET ${BASE}/surveyReferenceFile/downloadFileObject/{fileKeys}；将勾选fileKey用下划线连接；无选中时提示，下载不改变文档状态。`],
  ]),
  ...table(['文件步骤','HTTP方法与相对路径','输入/返回及生命周期'],[
    ['文件上传','POST /back/dop/space/common/upload','实际FormData字段file。UploadDoc及docUploadMixin的on-change选文件即请求；auto-upload=false不代表只本地。成功fileKey/fileName回填；失败保留名称/描述；移除仅清草稿引用。'],
    ['格式','本地控件与服务端校验','一般文档.pdf,.xlsx,.xls,.docx,.doc,.zip,.rar；接口文档仅.pdf,.docx,.doc；单文件。大小限额从发布配置读取；格式校验通过后才能发上传请求。'],
    ['取原文件键','GET /back/dop/space/common/getOriginKey','query:{key:fileKey}；服务端验证归属，读取返回的原文件key。'],
    ['下载原文件','GET /back/common/oss/oss/downloadFileObject','query:{key:originKey,businessDescription:"111"}，rawData/blob。按fileName保存，完成/失败释放objectURL及loading。'],
    ['取消/移除','不虚构远端删除接口','取消元信息保存不撤销已上传文件；移除草稿引用不是物理删除。已引用/孤立临时文件的过期清理、引用计数和回收采用后端生命周期契约。'],
  ]),
  '### 导入导出逐按钮契约','',
  'Excel导入的文件选择先更新本地待导入文件，确认按钮才upload.submit()；它与文档选择即上传不同。accept=.xlsx,.xls；关闭/取消导入框不发该导入请求。导入失败保留修正/重试入口；写入结果未知先查回执。','',
  ...table(['对象','模板','确认导入','导出与参数'],[
    ['委办局',`POST ${BASE}/surveySubject/export/excelTmp`,`POST ${BASE}/surveySubject/import/excel；实际FormData只有file，props.data的surveyId不自动合并`,`POST ${BASE}/surveySubject/export/excel；body:{name,leader}`],
    ['调研计划',`POST ${BASE}/surveyPlan/export/excelTmp`,`POST ${BASE}/surveyPlan/import/excel；FormData:{file,milestoneId}`,`POST ${BASE}/surveyPlan/export/excel；body:{milestoneId,surveySubjectName}，不含团队筛选`],
    ['六类成果',`GET ${BASE}/{resource}/export/template`,`POST ${BASE}/{resource}/import/excel（FormData.file/surveyPlanId）；实施总页改import/excelAll（file/milestoneId）`,`POST ${BASE}/{resource}/export/excel，有surveyPlanId；无计划改export/excelAll，body沿用当前清单筛选`],
    ['数据归集',`POST ${BASE}/surveyReportSysData/dataCollect/template`,`POST ${BASE}/surveyReportSysData/dataCollect/import；FormData.file`,`POST ${BASE}/surveyReportSysData/dataCollect/export；body:{companyName,belongSysName,resourceName,resourceEnName}`],
  ]),
  'resource逐一对应surveyReportSys、surveyReportSysData、tdatadictionary、surveyReportInterface、surveyReportDataDemand、surveyReportBusinessDemand。文件接口返回blob并触发下载；导出行数范围、导入行级错误与事务行为须联调验收，不能据接口名认定全量或原子。','',
  '### 计划完成、重开与归集动作','',
  ...table(['动作/前提','方法与相对路径','请求/状态/失败恢复'],[
    ['计划完成：进行中，单个或勾选多个',`POST ${BASE}/surveyPlan/finish`,'{ids:ID[],actualDate:"yyyy-MM-dd HH:mm:ss",remark}；ids至少1项，actualDate必填。取消无请求；成功提示完成操作成功后回读；状态0已完成、1进行中。'],
    ['计划重开：已完成并有权限',`PUT ${BASE}/surveyPlan/reOpen/{id}`,'警告确认后请求，id来自计划行；取消无请求。状态是否可迁移由服务端验证；冲突或超时回读。'],
    ['归集登记',`PUT ${BASE}/surveyReportSysData/dataCollect/{id}`,'judgeCollect="1"；collectDataSize正整数，maxlength30，单位条；collectChargeUser为memberId，collectChargeUserName回填memberName；planningTime格式yyyy-MM-dd HH:mm:ss；collectRemark≤1000。源数据只读。'],
    ['归集完成','同归集登记PUT','合并当前记录，judgeCollect="3"，collectTime必填yyyy-MM-dd HH:mm:ss，explanation可空；planningTime将T转空格。成功回读状态，不直接用指令当状态。'],
    ['归集重开','同归集登记PUT','警告确认后合并旧记录，judgeCollect="2"，collectTime=""；其余归集字段保留。取消不请求，失败不先改本地状态。'],
    ['归集展示状态','collectStatus','"0"未接入、"1"进行中、"2"已完成；不得与judgeCollect的1/2/3动作含义混用；无独立新增/删除归集主记录入口。'],
  ]),
  '### 项目配置与统计明细','',
  '配置页/调研成果之间以formType关联六类字段。配置读取POST /back/dop/factory/tapplyconfig/finds，{formType,businessId:0,spaceId}；optionalType==2为固定项，isEnable==1映射checked。查看全部禁用；编辑新增本地行{name:"",checked:false,isAuto:true,optionalType:"0"}，name最长100。','',
  '应用PUT /back/dop/factory/tapplyconfig/modifys，body为数组[{isEnable:0或1,spaceId,formType,name,enName:name,optionalType,id?}]，只传非固定项。已有自定义行删除确认后即时DELETE /back/dop/factory/tapplyconfig/{id}；未保存行仅本地移除。取消应用不恢复已删除服务器字段；切换页签前处理未应用草稿。','',
  ...table(['统计/入口','参数与显示规则'],[
    ['调研数量','quantity数组当前调用端索引6委办局、0系统、1资源、5信息项、3数据需求、4业务需求、2接口；索引只是当前调用映射，服务端须版本化统计契约。'],
    ['归集趋势','POST /back/dop/factory/dataResearchReport/dataTrend，{flag:dateType}；0日/1周/2月，date/count数组，count÷10000为万条；日期去横线转数排序，空日期/非法值明确报错而非伪造数据。'],
    ['调研完成明细','/dop/dbms/requirement/report/chart/research/completion → POST /back/dop/factory/dataResearchReport/completionPage；milestoneName,surveySubjectName,status,pageRequest。'],
    ['接入方式/更新频率/资源明细','research/accessWay、research/frequency、research/resource → POST /back/dop/factory/dataResearchReport/page；依次使用resourceName/shareWay、resourceName/updateFrequency、resourceName/companyName及pageRequest。'],
    ['归集完成率及单位下钻','collection/completion → dataCollectCompletionPage，{companyName,pageRequest}；点单位进入collection/company，query:{id:companyId,companyName}，调用page，{companyId,belongSysName,resourceName,resourceEnName,pageRequest}。'],
    ['趋势/归集资源明细','collection/trend → dataTrendPage，{collectTime:"yyyy-MM-dd",pageRequest}；collection/resource → page，使用该页筛选及pageRequest；原报表页签与粒度在返回后恢复。'],
    ['统计口径','统计截止时间、授权范围、分母、去重及完成标准由版本化服务端契约规定；失败不显示有效0，0分母显示无可计算比例，不渲染NaN/Infinity。'],
  ]),
  '### AI辅助调研与归集建议','',
  '在现有人工流程旁提供可选的AI辅助入口：从用户选择且有访问权的文档提取成果字段草稿；对六类成果提供相似项/字段映射和矛盾提醒；对归集计划与成果差异生成排查建议。每项输出包含引用资料、映射字段、置信说明和需人工补齐处；用户逐项采纳后仅改变可撤销草稿。模型不得自动上传、保存、删除、完成/重开、归集或改配置。失败保留原人工输入并允许继续人工工作。质量与数据授权按DBMS-NFR-014执行，产品接入属于独立功能规划。','',
];}

function operationBoundary(){
  const values=[
    ['101','查看调研委办局','editSubject?optType=view&id={id}，GET surveySubject/{id}，八个可见字段禁用；见DBMS-502。'],
    ['103','修改调研委办局','editSubject?optType=edit&id={id}，PUT surveySubject/{id}；与新增同字段及校验，成功返回回读。'],
    ['104','删除调研委办局','确认后DELETE surveySubject/{id}；取消无请求；计划引用保护由服务端校验，失败保留原行。'],
    ['106','查看调研里程碑','卡片及GET milestone/{id}读取阶段名称、负责人、日期和描述；计划链接带阶段id。'],
    ['108','修改调研里程碑','milepost/edit?optType=edit&id={id}，PUT milestone/{id}；日期和负责人规则见DBMS-107。'],
    ['109','删除调研里程碑','确认后DELETE milestone/{id}；阶段计划引用及级联策略采用服务端契约；失败不先移除卡片。'],
    ['112','新增配置字段','不是新增项目配置主记录；编辑页新增本地自定义行，应用PUT tapplyconfig/modifys，见DBMS-522。'],
    ['113','修改配置字段','按六类formType切换，非固定行勾选映射isEnable；应用数组含spaceId及已有id，固定行不可取消。'],
    ['114','删除配置字段','已有optionalType=0行确认后即时DELETE tapplyconfig/{id}；未保存行只移除草稿。无删除项目主对象入口。'],
    ['116','查看调研团队','team/edit?optType=view&id={id}，GET surveyTeam/{id}回填组长和成员，查看禁用。'],
    ['118','修改调研团队','PUT surveyTeam/{id}，成员保持[{memberId}]；清空及候选失效按字段规则处理，见DBMS-504。'],
    ['119','删除调研团队','确认后DELETE surveyTeam/{id}，计划引用保护与取消/失败反馈分别处理。'],
    ['121','查看调研计划','plan/list/edit?optType=view&id={id}，GET surveyPlan/{id}；团队和阶段名称回显但不授予写权限。'],
    ['122','新增调研计划','plan/list/edit?optType=add；POST surveyPlan，body含surveyId及surveyPlanTeamList:[{surveyTeamId}]，详见DBMS-520。'],
    ['123','修改调研计划','PUT surveyPlan/{id}，阶段控件禁用；重新验证委办局、团队、时间与联系人。'],
    ['124','删除调研计划','确认后DELETE surveyPlan/{id}；成果、实施及文件引用的处理按服务端契约，失败保留原行。'],
    ['126','查看调研实施','track/subList?id={surveyPlanId}&optType=view，八类成果只读；实际完成状态以计划响应为准。'],
    ['127','新增实施内容','复用调研计划和八类成果维护，不创建独立实施主记录；新成果POST对应对象，带surveyPlanId。'],
    ['128','修改实施/完成/重开','计划资料PUT surveyPlan/{id}；完成POST surveyPlan/finish，{ids,actualDate,remark}；重开PUT surveyPlan/reOpen/{id}，各自确认与回读。'],
    ['129','删除实施内容','无独立实施主记录删除入口；成果维护页分别DELETE各对象/{id}，主计划删除见DBMS-124。'],
    ['131','查看归集','collection/edit?optType=view&id={id}，GET surveyReportSysData/{id}；显示源字段和归集结果。'],
    ['132','登记归集','为既有目录成果登记，PUT surveyReportSysData/dataCollect/{id}，judgeCollect=1；不新建归集主记录。'],
    ['133','修改/完成/重开归集','同dataCollect/{id}；登记1、完成3、重开2，状态与指令不同，字段及前提见DBMS-517。'],
    ['134','删除归集','归集页无独立主记录删除操作；目录成果删除属于计划内目录维护，不据共享API增加归集删除按钮。'],
    ['135','查询参考文档','独立库referenceFile/page按name/createUsername；准备文档surveyReferenceFile/page按name/fileCategoryId与surveyId。'],
    ['136','查看/下载参考文档','两库使用各自详情及文件引用；独立库先getOriginKey再OSS下载；准备页支持选中fileKey批量下载。'],
    ['137','新增参考文档','独立库600px上传弹窗POST referenceFile；准备库需目录、来源及POST surveyReferenceFile，二者字段上限不同。'],
    ['138','修改参考文档','PUT referenceFile/{id}或surveyReferenceFile/{id}；选文件即时上传，取消不撤销文件。'],
    ['139','删除参考文档','确认后DELETE各文档对象/{id}；引用保护和文件回收分开，删除失败保留元信息。'],
    ['140','查询调研报告/清单','报表及六类汇总查询见DBMS-510～516；统计不是一个普通“报告主对象”。'],
    ['141','查看报告/成果','统计详情逐个下钻；六成果edit?optType=view&id={id}用相应GET；不把链接存在等同后端成功。'],
    ['142','新增成果','仅有效surveyPlanId且optType!=view时开放；六对象POST，数据字典使用tdatadictionary/addDataDictionary。'],
    ['143','修改成果','计划内维护PUT对应对象/{id}；动态配置和条件字段按六个独立表单处理，见DBMS-511～516。'],
    ['144','删除成果','计划内维护确认后DELETE对应对象/{id}；全局汇总不增加删除入口；取消无请求，失败保留原行。'],
  ];
  return table(['历史操作编号','对象与操作','具体入口、接口和边界'],values.map(([id,...rest])=>['DBMS-'+id,...rest]));
}
function section(text,number){
  const headings=[...text.matchAll(/^## (\d+)\.[^\n]*\n/gm)],i=headings.findIndex(h=>Number(h[1])===number);
  return i<0?'':text.slice(headings[i].index+headings[i][0].length,headings[i+1]?.index??text.length);
}
function preservedAcceptance(previous,type){
  const entries=type==='main'?MAIN:SUB,start=type==='main'?1:500,end=type==='main'?69:568;
  const sequence=entries.flatMap(e=>Array.from({length:5},(_,i)=>e.start+i)).concat(Array.from({length:end-start+1},(_,i)=>start+i));
  const actual=[...previous.matchAll(/^\| (DBMS-AC-\d{3}) \|/gm)].map(m=>m[1]);
  const expected=sequence.map(n=>'DBMS-AC-'+String(n).padStart(3,'0'));
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('DBMS published acceptance rows missing, duplicated or reordered');
  const old=section(previous,6).split(/\r?\n/).filter(l=>/^\| DBMS-AC-\d{3} \|/.test(l));
  const clean=s=>s.replace(/【[^】]*】/g,'').replace(/未知规则先完成产品确认。|规则未明确的分支先评审。|空间真实权限矩阵须先确认。|空白字符串是否等同空值按公共规则建议评审。|字符计数口径先按公共规则确认。/g,'').replace(/多步草稿和临时附件按评审后的例外规则处理。/g,'').replace(/待确认|拟定需求|本轮|源码/g,'接口契约').replaceAll('显示未取得数据','显示读取失败');
  const counters=new Map();
  return table(['编号','场景','操作与可检查结果','关联需求','状态'],old.map(line=>{
    const c=line.split('|').slice(1,-1).map(v=>v.trim()),sub=c.length===4,ref=sub?c[2]:c[3],id=c[0];
    const entry=entries.find(e=>e.id===ref);
    let scenario=sub?'集中回归':clean(c[1]),desc=clean(sub?c[1]:c[2]);
    if(sub){const i=counters.get(ref)||0;counters.set(ref,i+1);desc=acceptanceFor(entry.kind)[i];}
    if(id==='DBMS-AC-035')desc='其他字段合法，电话输入20位与21位数字、字母及空白；必填不空且仅数字和加号0～20字符；21位或字母被阻止，控件100字符不代替格式上限。';
    if(id==='DBMS-AC-069')desc='项目一张图分别模拟空间/委办局读取失败，显示重试；空电话不抛异常，重复进入不累加卡片，超过100条的列表补齐或显示截断。';
    if(id==='DBMS-AC-023')desc=acceptanceFor('overview')[0];
    if(type==='main'&&Number(id.slice(-3))<=22&&entry)desc=acceptanceFor(entry.kind)[scenario.includes('异常')?3:0];
    return [id,scenario,desc,ref,'未执行'];
  }));
}
function renderNfrSection(){return ['## 9. 非功能性需求','',
  '质量目标与业务功能分别编号。下列为开发验收要求，执行状态均为未执行；目标来源、原实现差异及后端依赖见[核查记录](./核查记录.md)。','',
  ...table(['编号','质量属性','需求与量化指标/不变量','验收方法及通过条件','关联功能','状态'],NFRS.map(row=>[...row,'未执行'])),
  '性能验收环境：在获授权隔离环境记录构建版本、Windows/浏览器版本、客户端CPU/内存、服务端实例/数据库/网关资源、真实数据分布和索引；10Mbps上下行、50ms RTT，安全与限流保持发布配置。10个独立读会话含1秒思考时间，预热2分钟、统计10分钟；每类查询冷/热缓存分别≥200次请求，报告P50/P95/P99、最大值、吞吐和所有失败。时延采用同一单调时钟，自点击查询至本次表格和分页可操作，包含网络与渲染；P分位取升序第ceil(p×N)项。技术失败包含合法请求的5xx、超时、解析错误及错误业务结果；预期业务拒绝和限流单列但不隐藏。文件按大小、网络、服务端限额单独验收，不套用3秒列表指标。','',
  '本模块不据一次只读采样宣称生产并发、月度可用率、RTO/RPO或AI准确率。文件限额、批量事务和后端保护采用版本化发布契约。没有环境、样本或授权时维持未执行，不能用文档校验代替质量实测。',''];}
function renderMain(previous=''){return renderDocument('main',previous);}
function renderSub(previous=''){return renderDocument('sub',previous);}
function renderDocument(type,previous){
  const entries=type==='main'?MAIN:SUB,acceptance=preservedAcceptance(previous,type),sourceRows=section(previous,8).split(/\r?\n/).filter(l=>/^\| DBMS-\d{3} \|/.test(l));
  if(type==='main'&&JSON.stringify(sourceRows.map(l=>l.split('|')[1].trim()))!==JSON.stringify(MAIN.map(e=>e.id)))throw new Error('DBMS published source rows missing or reordered');
  const features=entries.map(renderFeature).join('\n');
  const common=['## 5. 主要业务流程','',
    '1. 在项目一张图核对当前空间及委办局关系。\n2. 准备委办局、团队、目录及参考资料，再定义里程碑。\n3. 在阶段下新增调研计划，关联委办局、方式、联系人、时间和团队。\n4. 从实施列表进入具体计划，维护六类成果、会议纪要及附件；按实际完成时间确认完成，必要时经授权重开。\n5. 六类成果进入全局汇总与统计下钻；目录成果成为归集登记的数据源。\n6. 归集登记责任人、计划时间和条数，再单独确认实际完成或重开；项目配置控制六类表单的扩展字段。',''];
  const intro=type==='main'?[
    '## 1. 业务目标与使用角色','',
    '将项目内调研准备、阶段计划、实施成果、统计和数据归集组织成可追踪流程。使用者为获得服务端相应空间及动作授权的已登录用户；不根据单一采样账号推导管理员/普通用户角色矩阵。入口：需求管理 → 数据需求管理。','',
    '## 2. 业务范围','',
    '覆盖调研概览、调研准备（委办局/团队/参考文档）、调研计划（里程碑/计划）、实施八页签、报告统计与六类成果、数据归集、独立参考文档、项目字段配置。主文档定义12项功能，子文档保留23项独立页面/操作；历史操作编号保留为具体维护边界，不把每个对象强行扩展成全量CRUD。','',
    '## 3. 功能需求','',features,
    '## 4. 字段与业务规则','',
    '每项字段表包括绑定名、类型、必填、默认、限制、格式、错误提示和条件状态。业务字段空白属性不能由开发者自行补造。团队成员[{memberId}]与计划团队[{surveyTeamId}]不同；目录数量为万条，归集数量为条。计划status为0已完成/1进行中；归集collectStatus为0未接入/1进行中/2已完成，judgeCollect为1登记/2重开/3完成。','',
    '[全部DTO映射、六类成果字段联动、文件、导入导出、状态动作和统计明细](./子页面与操作细化.md#4-字段枚举和约束)。','',
    ...common,'## 6. 验收标准','',
    '以下集中回归与各功能内的五条验收共同构成129项功能验收；全部状态为未执行。字段校验、取消、重复请求、结果未知、失权、状态恢复及读写回读须在获授权环境执行。','',...acceptance,
    '## 7. 实现与交付边界','',
    '字段、前端调用契约和目标交互已分项定义；后端角色、DTO返回、事务、唯一性/引用保护、文件归属、状态机和统计口径须按[外部依赖](./核查记录.md#外部依赖)完成联调后，才能交付真实持久化功能。页面目标修正与当前静态实现的差异单独列在核查记录。','',
    ...operationBoundary(),
    'AI辅助适用于文档提取、成果字段映射、相似项和归集差异建议；它是独立功能规划，采纳只更新草稿，人工保存与状态动作保持独立。控制与评价见DBMS-NFR-014及[AI详细规则](./子页面与操作细化.md#ai辅助调研与归集建议)。','',
    '## 8. 关联资料','',
    '[子页面与操作细化](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [静态实现证据索引](../evidence/dbms-review-20261026/README.md) · [历史截图索引](../evidence/live-recheck-20261022/README.md) · [调研记录归档](./调研记录.md) · [总索引](../README.md)','',
    ...table(['需求编号','界面依据','详细记录'],[]).slice(0,2),...sourceRows,'',...renderNfrSection(),
  ]:[
    '## 1. 范围与入口','',
    '本文件补充[模块需求正文](./需求说明.md)，按真实导航定义23项独立页面/操作；逐项字段、控件、请求、异常、布局和验收见第3节，跨对象的DTO与文件/状态规则见第4节。','',
    '## 2. 页面与资料覆盖','',
    '页面布局使用2026-10-22历史截图和元素，静态定义沿前端组件、API包装器及公共请求链核对。各材料时间、用途和限制见[证据索引](../evidence/dbms-review-20261026/README.md)。准备参考文档的新建截图是目录前置提示；后续表单按组件定义描述，不将其当作完整实拍。','',
    ...table(['实际导航/目标','功能编号','截图及元素','覆盖用途'],SUB.map(e=>[e.title,e.id,e.sources.map(screenshot).join('；'),e.kind==='referenceForm'?'目录条件提示；表单定义另见专用规则':e.id==='DBMS-515'?'列表框架，表头部分按组件定义补齐':'历史页面布局及控件'])),
    '## 3. 编号功能需求','',features,
    '## 4. 字段、枚举和约束','',...sharedRules(),
    ...common,'## 6. 验收用例','',
    '下列69项集中回归与各子功能115项验收共同组成184项；均未执行。全模块合计313项功能验收，质量用例另列14项。','',...acceptance,
    '## 7. 实现与交付边界','',
    '所有主记录创建、修改、删除、目的失焦、上传、导入、完成/重开及配置写入均有持久化影响；本次文档复核不执行这些操作。字段空白属性不代表取消限制；缺失的后端规则按[外部依赖清单](./核查记录.md#外部依赖)取得契约并补齐联调。','',
    '计划与成果、目录与文件、配置与字段的引用关系分别处理；无独立页面入口的实施/归集主对象不增加虚构CRUD。历史操作编号与具体边界见[主文档第7节](./需求说明.md#7-实现与交付边界)。','',
    '## 8. 来源链接','',
    '[模块正文](./需求说明.md) · [核查记录](./核查记录.md) · [静态证据](../evidence/dbms-review-20261026/README.md) · [历史截图](../evidence/live-recheck-20261022/README.md) · [非功能性需求](./需求说明.md#9-非功能性需求) · [AI规划](../AI能力规划.md)','',
  ];
  return ['# 数据需求管理'+(type==='main'?'业务需求说明':'子页面与操作需求细化'),'','<!-- 业务规格格式:plain-v1 -->','<!-- dbms:generated-spec-v1 -->','',
    '修订日期：2026-10-26。本文直接定义目标业务行为；具体依据、原实现差异、外部交付契约及验收状态见[独立核查记录](./核查记录.md)。','',...intro].join('\n');
}
function writeDocuments(root){
  const folder=path.join(root,'doc/requirements/04-数据需求管理'),main=path.join(folder,'需求说明.md'),sub=path.join(folder,'子页面与操作细化.md');
  const nextMain=renderMain(fs.readFileSync(main,'utf8')),nextSub=renderSub(fs.readFileSync(sub,'utf8'));
  fs.writeFileSync(main,nextMain);fs.writeFileSync(sub,nextSub);
}
module.exports={MAIN,SUB,FIELDS,REPORTS,PROFILES,NFRS,renderFeature,renderMain,renderSub,renderNfrSection,writeDocuments,sharedRules,acceptanceFor,nfrFor};
