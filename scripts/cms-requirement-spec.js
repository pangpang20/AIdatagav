/* Reviewed CMS specifications. Public code is evidence, never executed here. */
const fs=require('node:fs');
const path=require('node:path');
const MAIN=[
  ['100','查询构件开发','developList',533,['F136-CMS-develop-add-cancel','F133-CMS-develop-query','F134-CMS-develop-reset']],
  ['101','查看构件开发','detail',538,['F137-CMS-develop-detail','F133-CMS-develop-query','F134-CMS-develop-reset']],
  ['102','新增构件开发','form',543,['F135-CMS-develop-add','F136-CMS-develop-add-cancel','F133-CMS-develop-query','F134-CMS-develop-reset']],
  ['105','查询构件名称配置','nameList',548,['F148-CMS-config-delete-cancel','F140-CMS-config-query','F141-CMS-config-reset']],
  ['107','新增构件名称配置','nameAdd',553,['F142-CMS-config-add','F143-CMS-config-add-cancel']],
  ['108','修改构件名称配置','nameEdit',558,['F144-CMS-config-edit','F145-CMS-config-edit-cancel']],
  ['109','删除构件名称配置','nameDelete',563,['F147-CMS-config-delete','F146-CMS-config-delete-guard','F148-CMS-config-delete-cancel']],
  ['110','查询我的构件','mine',568,['F151-CMS-mine-reset','F150-CMS-mine-query']],
  ['111','查看我的构件','detail',573,['F152-CMS-mine-detail']],
  ['001','浏览构件超市','shop',578,['E064-components']],
].map(([id,title,kind,start,sources])=>({id:'CMS-'+id,title,kind,start,sources}));
const SUB=[
  ['500','构件超市','shop',583,['H-CMS-001']],
  ['501','构件开发','developList',588,['H-CMS-002']],
  ['506','构件开发 → 新增','form',593,['H-CMS-002-op1','H-CMS-002-op1-options0','H-CMS-002-op1-options1']],
  ['507','构件开发 → 查看','detail',598,['H-CMS-002-op2']],
  ['502','构件配置 → 构件名称','nameList',603,['H-CMS-003']],
  ['508','构件配置 → 构件名称 → 新增','nameAdd',608,['H-CMS-003-op1','H-CMS-003-op1-options0']],
  ['509','构件配置 → 构件名称 → 编辑','nameEdit',613,['H-CMS-003-op2','H-CMS-003-op2-options0']],
  ['503','构件配置 → 构件分类','classifyList',618,['H-CMS-004']],
  ['510','构件配置 → 构件分类 → 新增','classifyForm',623,['H-CMS-004-op1']],
  ['504','我的构件 → 我的构件','mine',628,['Z-CMS-005']],
  ['505','我的构件 → 导出记录','record',633,['Z-CMS-006']],
].map(([id,title,kind,start,sources])=>({id:'CMS-'+id,title,kind,start,sources}));
const api='/back/dop/factory',route='/dop/cms/comfactory';
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','|'+heads.map(()=>'---').join('|')+'|',...rows.map(row=>'| '+row.join(' | ')+' |'),''];
const field=(label,binding,type,required='',initial='',limit='',rule='',error='',state='')=>[`${label}（${binding}）`,type,required,initial,limit,rule,error,state];
const input=(label,key)=>field(label,key,'string / input','否','','100字符','trim；可清空','','查询条件');
const readonly=(label,key,type='string')=>field(label,key,type+' / 只读','','','','','','列表返回字段');
const paging=[field('页码','pageRequest.pageNo','number','是','1','正整数','查询/改每页条数后回1'),field('每页条数','pageRequest.pageSize','number','是','20','正整数'),field('排序','pageRequest.order','array<object>','是','[{prop:"id",asc:false}]','','prop字段名，asc为boolean')];
const detailFields=[
  field('构件名称','componentDo.componentName','string / autocomplete','是','空字符串','','本地候选按名称包含匹配；500ms防抖查询既有规则；非新增禁用','不能为空'),
  field('构件分类','componentInfoExtDo.componentSort','候选ID / select','是','空字符串','','来自绑定表componentSortId；切换清除类型/数据库草稿前确认','不能为空'),
  field('业务分类','componentDo.businessId','候选ID / select','是','空字符串','','来自tbusinesstype/list的id、classificationName','不能为空'),
  field('构件类型','componentInfoExtDo.componentType','候选ID / 选项块','是','首个可用候选ID','','来自当前componentTypeBoList；候选为空禁止提交','不能为空'),
  field('数据库对象','componentInfoExtDo.databaseObject','候选ID / 选项块','是','首个可用候选ID','','来自当前componentDbBoList；切换保存当前组合草稿','不能为空'),
  field('值域规则类型','componentInfoExtDo.ruleType','string / 选项块','条件','新建值域组合为1','1枚举型；2连续型','componentType=37时显示并校验；视觉选中与模型值保持一致','不能为空','仅当前可见分支'),
  field('函数英文名称','componentInfoExtDo.functionEnglishName','string / input','条件','空字符串','100字符','trim；componentType=41且componentSort=31时显示','不能为空','函数分支'),
  field('函数表达式','componentInfoExtDo.functionRepresentation','string / input','条件','空字符串','','trim；与函数英文名称同条件','不能为空','普通文本输入，非多行编辑器'),
  field('算法程序包','componentInfoExtDo.fileKey','string / 上传引用','条件','空字符串','.jar（忽略扩展名大小写）','componentType=39；选择立即上传，保存使用返回键','不能为空','文件服务限额按发布配置'),
  field('算法文件名','componentInfoExtDo.fileName','string / 文件名','条件','空字符串','','来自成功上传的文件；删除控件清引用','','不等于删除远端文件'),
  field('规则内容','componentInfoExtDo.ruleContent','string / 代码编辑器或textarea','条件','空字符串','','除componentType=39外非空；支持{变量名称}占位；发送前UTF-8 Base64编码','不能为空','33/39/41及初始分支为SQL编辑器；其他为20行textarea'),
  field('引用标准','componentDo.useStandard','string / input','否','空字符串','50字符','trim；可清空'),
  field('需求描述','componentDo.componentDescription','string / textarea','否','空字符串','500字符','trim；5行'),
  field('规则说明','componentDo.ruleExplain','string / textarea','否','空字符串','500字符','trim；5行'),
  field('参考代码','componentDo.visitCode','string / textarea','否','空字符串','500字符','trim；5行；作为文本，不执行'),
  field('开发者','componentDo.developer','string / input','否','空字符串','50字符','trim；不是授权角色'),
  field('校验者','componentDo.checker','string / input','否','空字符串','50字符','trim；不是审批结果'),
  field('发布状态','componentDo.isPublish','number / 隐藏模型','','0','0未发布；1已发布','保存与发布是不同动作'),
  field('组合类型集合','componentInfoExtDo.componentTypes','string / 隐藏模型','','空字符串','','以逗号分隔的类型ID；按完整token匹配，不能子串误配'),
  field('组合数据库集合','componentInfoExtDo.databaseObjects','string / 隐藏模型','','空字符串','','同类型已有内容的数据库ID，以逗号分隔；去空/去重'),
  field('名称实体标识','componentDo.id / componentNameId','稳定ID / 系统','','','','来自既有对象及详情响应；不能使用componentCode或输入名称替代'),
  field('规则实例标识','componentInfoExtDo.id','稳定ID / 系统','','','','编辑回传对应组合id；新增不伪造id'),
];
const nameFields=[
  field('构件名称','componentName','string / input','是','空字符串','100字符','trim','请输入构件名称'),
  field('构件ID','componentCode','string / disabled','','','100字符（控件）','系统返回显示编码；新增不手填，编辑不可修改'),
  field('业务分类','businessId','候选ID / select','是','空字符串','','tbusinesstype/list的id映射classificationName','请输入业务分类'),
  field('需求描述','componentDescription','string / textarea','是','空字符串','500字符','trim','请输入需求描述'),
  field('内部主键','id','稳定ID / 隐藏','','新增为空字符串','','编辑取列表行id，与componentCode不同'),
];
const categoryFields=[field('分类名称','classificationName','string / input','是','空字符串','50字符','trim；显示字数','请输入分类名称'),field('分类描述','classificationDescription','string / textarea','否','空字符串','500字符','trim'),field('内部主键','id','稳定ID / 隐藏','','','','编辑/查看取列表行id')];
const FIELDS={
  developList:[input('构件名称','componentName'),input('构件ID','componentCode'),input('创建人','createName'),field('业务类型','businessId','候选ID / select','否','','','tbusinesstype/list；可清空'),field('构件分类','componentSort','候选ID / select','否','','','findList的componentSortId'),field('发布状态','isPublish','number / select','否','','0未发布；1已发布','可清空'),...paging,readonly('名称实体标识','componentNameId','ID'),readonly('规则实例标识','componentInfoExtId','ID'),readonly('行标识','id','ID'),readonly('构件ID','componentCode'),readonly('构件名称','componentName'),readonly('业务类型','classificationName'),readonly('构件分类','componentSortName'),readonly('数据库对象','databaseObjectName'),readonly('发布状态','isPublish','number'),readonly('创建人','createName'),readonly('创建时间','createComponentTime')],
  form:detailFields,detail:detailFields.map(f=>[...f.slice(0,1),f[1]+' / 查看禁用',...f.slice(2,3),'',...f.slice(4,7),'只读详情；默认值来自当前记录']),
  nameList:[input('构件名称','componentName'),input('构件ID','componentCode'),input('创建人','createName'),field('业务分类','businessId','候选ID / select','否','','','tbusinesstype/list的id'),...paging,...['id','componentName','componentCode','classificationName','componentDescription','createName','createTime'].map((key,i)=>readonly(['内部主键','构件名称','构件ID','业务分类','需求描述','创建人','创建时间'][i],key))],
  nameAdd:nameFields,nameEdit:nameFields.map(f=>[...f.slice(0,3),'',...f.slice(4)]),
  nameDelete:[readonly('目标内部主键','id','ID'),readonly('目标构件名称','componentName'),readonly('目标构件ID','componentCode')],
  classifyList:[input('业务分类名称','classificationName'),input('创建人','createName'),...paging,...['id','classificationName','classificationDescription','createName','createTime','isAllowDeletion'].map((key,i)=>readonly(['内部主键','分类名称','分类描述','创建人','创建时间','允许删除标记'][i],key))],classifyForm:categoryFields,
  mine:[field('所属分类','businessId','候选ID / select','否','','','业务分类id'),input('构件名称','componentName'),field('构件分类','componentSort','候选ID / select','否','','','componentNameSortType中componentSortType=1的id'),field('导出格式','exportedFormat','number / select','否','','1 SQL；2 jar包','显示值与返回文件格式文字分开'),field('批次上下文','batchId','稳定ID / 路由','','','','导出记录查看传入；查询/重置/分页保持该固定范围'),...paging,...['componentNameId','componentSort','databaseObjectIds','componentTypeIds','componentName','databaseObjectName','componentSortName','exportedFormat','publishTime','exportTime'].map((key,i)=>readonly(['名称实体标识','分类标识','数据库对象ID集合','构件类型ID集合','构件名称','数据库对象','构建分类','导出格式','发布时间','下载时间'][i],key))],
  record:[input('业务分类名称','classificationName'),input('创建人','createName'),...paging,...['batchId','exportTime','applicationFormName','exportedComponentNum','exportedFormat'].map((key,i)=>readonly(['批次标识','导出日期','应用形式','导出构件数','导出格式'][i],key))],
  shop:[
    field('搜索关键字','keyword','string / input','否','空字符串','','提示支持构件名称、ID；匹配算法以服务端契约定义'),
    field('分类页签','componentSort','候选ID / tabs','否','综合','','综合不传；候选componentSortType=1映射id'),
    field('数据库类型','databaseObjectList','array<ID> / 多选','否','[]','','来源componentSortType=3；分类内按绑定表收窄'),
    field('业务类型','businessIdList','array<ID> / 多选','否','[]','','tbusinesstype/list；全部表示不限制'),
    field('构件类型','componentTypeList','array<ID> / 多选','否','[]','','来源componentSortType=2；按分类绑定收窄'),
    field('发布时间快捷项','publishTimeRangeType','number / 单选','否','','1近7天；2近15天；3近3个月','全部不传；自定义改用时间上下界'),
    field('发布时间下界','publishTimeFromQo','string / datetimerange','条件','','yyyy-MM-dd HH:mm:ss','自定义时同时提供起止；开始不晚于结束'),
    field('发布时间上界','publishTimeToQo','string / datetimerange','条件','','yyyy-MM-dd HH:mm:ss','清空自定义时移除上下界'),
    ...paging.map(f=>f[0].includes('排序')?[...f.slice(0,3),'[]',...f.slice(4)]:f),
    field('勾选对象','ids','array<ID> / checkbox','否','[]','','以稳定id选择本页结果；名称只供展示'),
    field('单项下载数据库','databaseObjectId','候选ID / select','条件','未选择','','单项下载从目标数据库候选选择'),
    field('批量下载数据库','componentDbIdList','array<ID> / 多选','条件','[]','','批量下载候选由componentBatchDownloadViewInit返回'),
    field('下载构件分类','componentSortIdList','array<ID> / 多选','条件','[]','','仅批量下载显示；按候选id提交'),
    field('下载构件类型','componentTypeIdList','array<ID> / 多选','条件','[]','','单项/批量均提供；先选当前可用候选'),
    ...['id','componentName','classificationName','componentDbList','componentTypeList','componentSortList','componentDescription','downloadNum','publishTime'].map((key,i)=>readonly(['供给实体标识','构件名称','业务类型','数据库标签','类型标签','分类标签','需求描述','下载次数','发布时间'][i],key)),
  ],
};
const PROFILES={
  developList:{url:route+'/development/index',goal:'检索构件规则，按发布状态进入编辑/详情，并执行单项或批量发布、撤销及未发布删除。',controls:[
    ['查询/重置/展开','六个条件组合查询；文本trim、最长100；查询和每页条数变化回第一页，重置恢复初始筛选。展开只切换筛选可见区。'],
    ['新增/编辑/查看','进入共用edit；query带optType、id、componentInfoExtId、componentNameId，新增后三项为空；详情实际按componentNameId读取。未发布可编辑/删除/发布，已发布仅查看/撤销发布。'],
    ['批量发布/撤销','先检查选择列表，未选提示“请先勾选数据!”；把componentNameId去重后逗号拼接到动作路径。当前对象与授权状态由服务端再次验证。'],
    ['发布/撤销/删除','发布和撤销是业务写动作；删除先显示“确定要删除吗?”。取消删除不发请求；动作在途锁定同目标，成功提示后回读列表，失败保留当前行。'],
  ],requests:[
    ['列表','POST',api+'/tcomponentinfoext/componentInfoList','{businessId,componentName,componentCode,createName,componentSort,isPublish,pageRequest}','datas/total；公共客户端响应解包'],
    ['业务分类','POST',api+'/tbusinesstype/list','{}','数组：id、classificationName'],
    ['分类/类型/数据库绑定','POST',api+'/bus/componentsorttypedbbinding/findList','{}','componentSortId/Name、componentTypeBoList、componentDbBoList'],
    ['发布','GET',api+'/tcomponentinfoext/publishComponentInfo/{ids}','componentNameId单项或逗号拼接；无body','成功提示“发布成功”后回读；这是有副作用GET'],
    ['撤销发布','GET',api+'/tcomponentinfoext/noPublishComponentInfo/{ids}','同上','成功提示“撤销发布成功”后回读；失败不先改状态'],
    ['删除开发规则','GET',api+'/tcomponentinfoext/deleteComponentInfo/{componentNameId}','确认后传名称实体标识','提示“删除成功”后回读；不与配置删除混用'],
  ],layout:['顶部标题“构件开发”；下方筛选默认一行，右端查询/重置/展开；展开显示创建人、构件分类与发布状态等剩余条件。','列表区域右上方是新增、批量发布、批量撤销发布。表头依次为复选、序号、构件ID、构件名称、业务类型、构件分类、数据库对象、发布状态、创建人、创建时间、操作；底部分页靠右。'],sources:['DEVELOP-LIST','DEVELOP-API']},
  form:{url:route+'/development/edit?optType=add（新增）；optType=edit&componentNameId={id}（编辑）',goal:'维护同一构件名称下按分类、类型和数据库对象组织的规则组合，保存基础资料及规则内容。',controls:[
    ['名称自动完成','使用addComponentPullList候选，按名称包含匹配；输入/选中后500ms查询既有名称。读取既有资料前处理已有草稿；旧名称的迟到响应不得覆盖当前输入。新增可输入，编辑禁用名称。'],
    ['构件分类/业务分类','构件分类选项来自绑定表；切换前确认清理已有组合，清空componentInfoExtDoList并重建类型/数据库。业务分类取稳定id，不能拿人口类等样本作固定全量枚举。'],
    ['类型/数据库/规则类型','切换前保留当前组合草稿，按分类/类型/数据库的完整ID组合找回；无草稿创建空组合。值域分支显示枚举型/连续型；函数分支出现两个文本框；仅校验可见分支。'],
    ['规则编辑器/格式化/全屏','规则文本支持{变量名称}；格式化只修改本地文本，不执行SQL。全屏按钮和Escape恢复正常编辑区，焦点回编辑器；查看模式不提供改变规则文本的格式化。'],
    ['上传/移除算法包','选择.jar立即上传FormData.file，上传中禁保存/确认；成功只记录fileKey/fileName。重新上传替换引用；移除清本地引用，取消主表不撤销已上传文件。'],
    ['保存/确认','先校验全部待提交组合再构造快照；保存调用confirm(1)，成功提示后留页；确认调用confirm(2)，提示确认后返回。新增数组展平，编辑数组嵌套，详见公共数据映射。保存成功须取得稳定身份并回读后再允许后续保存，避免留在add重复创建。'],
    ['取消/返回/后退','有未保存变更先确认；确认放弃后返回来源，拒绝则留草稿。无主表保存请求；已上传文件的生命周期独立处理。'],
  ],requests:[
    ['名称候选','GET',api+'/tcomponentinfoext/addComponentPullList','无body','数组id、componentName、isRelevance、componentCode'],
    ['按名称读取已有组合','POST',api+'/tcomponentinfoext/componentInfoByName','{componentName:string}；名称输入500ms后','读取componentDo和componentInfoExtDoList；按当前输入代次回填'],
    ['读取详情','GET',api+'/tcomponentinfoext/componentInfoByRelevanceId/{componentNameId}','query中的名称实体标识，非componentInfoExtId','componentDo、componentInfoExtDoList；ruleContent按UTF-8 Base64解码'],
    ['初始化候选','POST',api+'/bus/componentsorttypedbbinding/findList','{}','按分类→类型→数据库关联；空候选显示错误并阻止保存'],
    ['业务分类','POST',api+'/tbusinesstype/list','{}','id、classificationName'],
    ['新增组合','POST',api+'/tcomponentinfoext/addComponentInfo','JSON数组，每项{...componentInfoExtDo,...componentDo}；ruleContent为Base64','保存成功提示；具体生成id及后续编辑转换按后端交付契约'],
    ['编辑组合','POST',api+'/tcomponentinfoext/editComponentInfoByRelevanceId','JSON数组，每项{componentDo,componentInfoExtDo}；保留各自id','成功后回读同一名称实体；保持或返回取决于保存/确认'],
    ['上传算法包','POST','/back/dop/space/common/upload','FormData.file；浏览器生成multipart boundary','返回文件键用于fileKey；失败保留先前有效引用并允许重新选文件'],
  ],layout:['页面标题在上方左侧，右上角返回。主体白色表单分左右两列，各占约一半，左侧依次为类型块、数据库块、条件规则类型/函数/算法包、规则内容编辑器；编辑器右上角有格式化及全屏。','右列依次是构件名称、构件分类、业务分类、引用标准、需求描述、规则说明、参考代码、开发者、校验者；多行文本框纵向排列，后两项在历史首屏下方，需滚动到达。','底部固定操作区靠右依次为取消、保存、确认；滚动内容预留底部空间。查看时隐藏该操作组，保留顶部返回。'],sources:['DEVELOP-FORM','DEVELOP-API','ENCODING','EDITOR']},
  detail:{url:route+'/development/edit?optType=view&componentNameId={id}',goal:'读取已授权名称实体的基础信息和规则组合，切换类型及数据库查看，不修改持久化数据。',controls:[
    ['进入详情','从开发列表或我的构件取componentNameId，超市取供给行id；都传到同一个详情读取入口，不能把展示编码当主键。'],
    ['类型/数据库切换','只显示实体已有componentTypes/databaseObjects对应组合；按完整ID匹配，切换仅更换只读内容；不得新增空组合或触发保存。'],
    ['基础资料/规则','所有输入禁用，SQL编辑器readOnly；解码失败显示明确错误，不能用空内容冒充原规则。只读内容缺失与无权限分别反馈。'],
    ['返回/全屏','顶部返回恢复来源筛选与批次；全屏、Escape仅影响展示。无保存、确认、发布、上传入口；文件名只显示已授权元信息。'],
  ],requests:[['读取详情','GET',api+'/tcomponentinfoext/componentInfoByRelevanceId/{componentNameId}','稳定名称实体标识；无body','componentDo与componentInfoExtDoList；解码后按componentType排序，展示有效首项'],['绑定候选','POST',api+'/bus/componentsorttypedbbinding/findList','{}','将已有id映射显示名称，候选缺失不得静默改ID'],['业务分类','POST',api+'/tbusinesstype/list','{}','只读回显业务分类名称']],layout:['沿用双列表单：左侧类型/数据库及只读规则；右侧依次为名称、分类、业务分类、标准、三个说明文本、开发者和校验者；顶部左侧“查看”、右侧返回，底部没有保存/确认。','初始化用明确加载状态；不存在的名称显示失效原因；合法但为空的规则显示空内容说明；加载失败提供重试。不得把未加载的空框架当正常详情。'],sources:['DEVELOP-FORM','DEVELOP-API','ENCODING','EDITOR']},
  nameList:{url:route+'/manage/componentName/index',goal:'维护名称基础实体及业务分类，名称实体与开发规则、个人使用记录分开管理。',controls:[['查询/重置/展开','名称、显示编码、创建人最长100且trim；业务分类取候选id。查询/重置回第一页，展开显示其余条件。'],['新增/编辑','打开600px弹窗；编辑从当前行拷贝componentName、componentCode、businessId、componentDescription、id，不虚构详情GET。'],['删除','先显示不可恢复确认；确认后调用配置专用删除接口，取消/关闭无请求。存在规则引用时按服务端拒绝结果保留原行，不能先移除。']],requests:[['列表','POST',api+'/tcomponent/page','{componentName,componentCode,createName,businessId,pageRequest}','datas/total或公共数组分支'],['业务分类','POST',api+'/tbusinesstype/list','{}','id、classificationName'],['配置删除','GET',api+'/tcomponent/removeComponentInfo/{id}','确认后的名称主键id','成功提示后回读；不是DELETE /tcomponent/{id}']],layout:['上方标题“构件名称”，下面一行搜索，查询/重置/展开靠右；表格区域右上新增。列顺序为序号、构件名称、构件ID、业务分类、需求描述、创建人、创建时间、操作；编辑/删除位于右端，分页在底部右侧。'],sources:['NAME','NAME-API']},
  nameAdd:{url:route+'/manage/componentName/index',goal:'新增名称基础实体，填写构件名称、业务分类和需求描述，编码由系统产生。',controls:[['构件名称/业务分类/需求描述','三项必填；名称100、描述500，文本trim；业务分类候选未加载/失效不能提交。'],['构件ID','禁用，只供系统返回后展示；新增不按样本编码序列推算，不允许用户自填。'],['确认','校验通过POST完整formInfo；新增模型id为空字符串；请求在途禁重复确认，失败保留弹窗和输入，成功提示后关闭并回读列表。'],['取消/关闭/Escape','有草稿时确认放弃；取消无POST，不新增名称实体。']],requests:[['新增名称','POST',api+'/tcomponent','{componentName,businessId,componentDescription,id:""}；不手填componentCode','成功提示“新增成功”，按真实主键/编码回读；返回结构按交付契约'],['业务分类','POST',api+'/tbusinesstype/list','{}','复用列表加载的typeList']],layout:['在原列表上覆盖居中约600px弹窗“新增构件名称”，右上X。表单两列：第一行左构件名称、右禁用构件ID；第二行左业务分类、右需求描述多行框。底部分隔线下右侧依次取消、确认。'],sources:['NAME','NAME-API']},
  nameEdit:{url:route+'/manage/componentName/index',goal:'修改选中名称实体的可编辑资料，保护系统编码和目标身份。',controls:[['打开编辑','从当前行复制五个字段，保留id和禁用componentCode；不依据名称重新定位。'],['名称/分类/描述','与新增相同三项必填、100/500长度及trim；原分类已失效时显示原因并要求重新选择获授权候选。'],['确认','PUT当前id；成功提示“修改成功”后回读。失败保留草稿，检测到并发版本冲突时提示重新读取，不能覆盖他人更新。'],['取消/关闭','有未保存输入先确认；放弃仅关闭草稿，不发送PUT。']],requests:[['修改名称','PUT',api+'/tcomponent/{id}','{id,componentName,componentCode,businessId,componentDescription}；编码保持原值','校验服务端返回和回读，不能改为创建'],['候选','POST',api+'/tbusinesstype/list','{}','复用列表候选；无独立详情请求']],layout:['弹窗布局与新增相同，标题“编辑构件名称”；各字段回显，构件ID灰色禁用，底部右侧取消/确认。列表背景保留原筛选与页码。'],sources:['NAME','NAME-API']},
  nameDelete:{url:route+'/manage/componentName/index',goal:'在明确目标、权限和引用影响后删除名称基础实体；与删除开发规则及移除个人记录区分。',controls:[['删除入口','绑定当前行id；确认框显示目标名称/编码与不可恢复提醒，不能使用旧选中行。'],['取消/关闭/Escape','关闭确认，不请求删除，不刷新成“删除成功”。'],['确认','只发送一次GET removeComponentInfo/{id}；在途锁定目标，成功提示并回读原列表，失败保留行及可恢复筛选。']],requests:[['删除名称配置','GET',api+'/tcomponent/removeComponentInfo/{id}','内部主键id；无body；确认后才能调用','公共请求成功链后提示删除成功并回读；引用/权限/并发失败不移除行']],layout:['列表上覆盖警告确认框，中间警示图标和“删除操作不能恢复，确定删除吗?”，右上关闭，底部右侧取消/确认。补充目标名称/编码用于避免误删。'],sources:['NAME','NAME-API','LIST-MIXINS']},
  classifyList:{url:route+'/manage/classify/index',goal:'维护业务分类字典，供名称、开发、超市及个人列表使用；不把它写成规则检测分类树。',controls:[['查询/重置','业务分类名称、创建人trim且最长100，查询/重置回1页。'],['新增/编辑/查看','打开600px对话框；模式1新增、2编辑、3查看。编辑/查看从当前行复制classificationName、classificationDescription、id；查看禁用表单且确认不提交。'],['删除','仅isAllowDeletion=1显示；通用确认后DELETE tbusinesstype/{id}。服务端仍校验引用与权限；取消不发删除。']],requests:[['分类列表','POST',api+'/tbusinesstype/page','{classificationName,createName,pageRequest}','datas/total或公共数组分支'],['新增分类','POST',api+'/tbusinesstype','{classificationName,classificationDescription}','成功回读分类列表'],['编辑分类','PUT',api+'/tbusinesstype/{id}','{classificationName,classificationDescription}；id只用于路径','包装器只传这两个body字段'],['删除分类','DELETE',api+'/tbusinesstype/{id}','当前行id，确认后发','成功刷新；已引用或受保护分类失败不移除']],layout:['标题“构件分类”；顶部两项筛选，查询/重置靠右；表格上方右端新增。列依次为序号、分类名称、分类描述、创建人、创建时间、操作；编辑/查看及条件删除在右侧。弹窗不包含父级、树、编码或移动控件。'],sources:['CLASSIFY','CLASSIFY-API']},
  classifyForm:{url:route+'/manage/classify/index',goal:'新增或修改业务分类名称与描述，并提供只读查看模式。',controls:[['分类名称','必填、trim、最长50且显示字数；描述可空、最长500。'],['确认','新增POST两个字段；编辑PUT当前id且body仅两个字段；查看模式不提交。成功提示后刷新列表；失败保留弹窗输入。'],['取消/关闭','编辑草稿确认放弃后关闭，无新增/修改请求；查看直接关闭。']],requests:[['新增业务分类','POST',api+'/tbusinesstype','{classificationName,classificationDescription}','新增成功后回读'],['编辑业务分类','PUT',api+'/tbusinesstype/{id}','body仅{classificationName,classificationDescription}','修改成功后回读；并发/重复/引用规则由服务器契约规定']],layout:['居中600px弹窗，新增标题“新增业务类型”，编辑为“编辑业务类型”，查看为“查看业务类型”；两列左分类名称并显示0/50、右分类描述textarea；右上X，底部右侧取消/确认。'],sources:['CLASSIFY','CLASSIFY-API']},
  mine:{url:route+'/mine/index',goal:'查询当前身份可访问的个人构件记录，查看、下载及移除个人记录；批次入口限定所属导出批次。',controls:[['查询/重置/展开','所属分类、名称、构件分类、导出格式组合筛选；名称trim最长100。batchId作为固定上下文保留，不随重置清除。'],['查看','传componentNameId到共用只读详情；返回恢复个人筛选、分页和batchId。'],['单项/批量下载','单项把名称id、分类及逗号分隔的类型/数据库集合转成数组；批量合并选中记录ID集合、去空去重后请求batchDownload；未选提示先勾选。'],['删除/批量移除','按componentNameId单项或逗号集合移除当前身份的个人记录；需先明确确认对象范围。不能删除共享名称或开发规则；结果未知先回读个人列表。']],requests:[['个人列表','POST',api+'/tcomponentinfoext/myComponentList','{businessId,componentName,componentSort,exportedFormat,batchId?,pageRequest}','datas/total；batchId来自记录查看的路由'],['个人移除','GET',api+'/tcomponentinfoext/myComponentListRemove/{ids}','componentNameId单项或逗号集合；这是有副作用GET','成功提示“删除成功”并回读个人列表；作用域采用后端契约'],['单项/批量下载','POST',api+'/tcomponentBus/batchDownload','{ids:ID[],componentDbIdList:ID[],componentTypeIdList:ID[],componentSortIdList:ID[]}','rawData响应+blob交下载工具；错误blob不得另存成成功包'],['筛选枚举','GET',api+'/tcomponentinfoext/componentNameSortType','无body','componentSortType 1分类/2类型/3数据库；保留id/name'],['所属业务分类','POST',api+'/tbusinesstype/list','{}','id、classificationName']],layout:['标题“我的构件”；顶部筛选默认一行、右端查询/重置/展开；列表右上批量下载/批量移除。列依次为复选、序号、构件名称、数据库对象、构建分类、导出格式、发布时间、下载时间、操作；右端查看/下载/删除，底部分页靠右。'],sources:['MINE','MINE-API','SHOP-API']},
  record:{url:route+'/mine/record',goal:'查看导出批次元信息，并按batchId进入该批次的个人构件列表。',controls:[['查询/重置/分页','分类名称、创建人及公共分页仅在服务端参数契约接通后启用；接通前明确提示筛选/分页不可用，不展示虚假的筛选结果。'],['查看','取当前行batchId导航到mine/index?batchId={batchId}；空/失效批次显示错误，不能退化为无范围个人列表。'],['维护范围','当前是记录列表及查看链接，无人工新增、编辑、删除或重新生成入口；批次产生与保留方式采用后台导出契约。']],requests:[['读取导出记录','GET',api+'/tcomponentinfoext/myComponentExportRecordList','调用端无参数；路径兼容处理及参数契约见核查记录','公共列表消费datas/total或数组；接通参数前不宣称有效筛选/分页'],['查看批次构件','POST',api+'/tcomponentinfoext/myComponentList','{batchId,pageRequest,...当前个人筛选}','目标页面按固定batchId查询；不是独立批次详情GET']],layout:['标题“导出记录”；上方两项筛选、右侧查询/重置；下方无新增工具栏。表头依次为序号、导出日期、应用形式、导出构件数、导出格式、操作；每行右端仅查看，分页在底部。历史记录数量和格式值仅是样本。'],sources:['RECORD','MINE-API','MINE']},
  shop:{url:route+'/supermarket/index',goal:'通过分类、数据库、业务、规则类型及发布时间检索获授权构件，查看详情并选择导出范围下载。',controls:[['搜索/清空/Enter','搜索按钮与Enter统一发keyword查询，清空后重新读取；新筛选回第一页。关键字作为文本安全高亮，不使用innerHTML。'],['分类页签/四类筛选','综合不限制分类，分类页签按绑定收窄数据库及类型并清除失效选择。前三类多选，“全部”与具体项互斥；发布时间单选快捷项或自定义区间，时间完整合法后查询。'],['收起/展开/标签更多','箭头只改变筛选区域高度；结果标签更多展开剩余全部标签，不丢中间项；条件与已提交结果保持对应。'],['全选/单选','选择范围为当前已加载页，使用稳定id、支持半选；文案明确“本页”，不能声称全选全部匹配记录。查询/翻页时清理不属于当前页的选择并更新数量。'],['查看','进入edit?optType=view&componentNameId={行id}；不调用发布/保存。'],['单项下载弹窗','从行标签建立数据库候选；选择数据库后GET compontShopByObjId刷新可用类型，清除失效类型。分类行仅在批量模式显示。'],['批量下载弹窗','未选警告；选中后POST componentBatchDownloadViewInit({ids})取数据库/分类/类型候选；候选按id选择。依赖失败显示重试，不能确认空/失效范围。'],['确认下载/取消/关闭','确认后只请求一次下载，保留进度，成功取得有效blob才提示完成；失败保留可恢复选择供重试。取消/X/Escape统一清理弹窗状态，不发下载请求；已发送后关闭不等于撤销服务器导出。下载可能影响计数/个人记录，按有副作用处理。']],requests:[
    ['筛选枚举','GET',api+'/tcomponentinfoext/componentNameSortType','无body','componentSortType=1分类页签、2构件类型、3数据库'],
    ['业务分类','POST',api+'/tbusinesstype/list','{}','id、classificationName；不是固定五项'],
    ['分类绑定','POST',api+'/bus/componentsorttypedbbinding/findList','{}','分类→类型→数据库候选'],
    ['超市查询','POST',api+'/tcomponentBus/page','{keyword,pageRequest,databaseObjectList?,businessIdList?,componentTypeList?,componentSort?,publishTimeRangeType?}；自定义用publishTimeFromQo/publishTimeToQo','datas/total；字段详见公共数据映射'],
    ['单项可用类型','GET',api+'/tcomponentinfoext/compontShopByObjId/{componentNameId}/{databaseObjectId}','行id和选定数据库id','数组componentType、componentTypeName；不改业务状态的保证需后端契约'],
    ['批量下载候选','POST',api+'/tcomponentBus/componentBatchDownloadViewInit','{ids:ID[]}','componentDbList、componentSortList、componentTypeList的id/name'],
    ['单项下载','POST',api+'/tcomponentBus/download','{id,databaseObjectId,componentTypeIdList:ID[]}','rawData:true、responseType:blob；成功文件交下载工具'],
    ['批量下载','POST',api+'/tcomponentBus/batchDownload','{ids:ID[],componentDbIdList:ID[],componentSortIdList:ID[],componentTypeIdList:ID[]}','原始响应及blob；候选必须属于同一授权快照'],
  ],layout:['主内容顶部为浅蓝介绍横幅，左侧标题、两行说明及搜索框，搜索按钮在输入框右端，右侧为插画；下方横排综合/检测分类页签，再下是数据库、业务、构件类型、发布时间四行筛选和居中收起箭头。','下面白色结果区顶部左侧全选/数量、右侧批量下载。每条结果左侧复选，主体为名称、标签和需求描述，右侧显示下载次数、发布时间、查看和下载；右下分页。空态保留筛选与标题。','下载弹窗居中约700px，顺序为数据库对象、批量模式的构件分类、构件类型，底部右侧确定/取消；X、遮罩、Escape采用同一取消清理。窄屏最大宽度服从可用视口，长候选在弹窗内容区滚动。'],sources:['SHOP','SHOP-API','DEVELOP-API']},
};
const NFRS=[
  ['CMS-NFR-001','权限与数据隔离','列表、详情、代码、算法包、候选、发布/撤销/删除及个人移除均服务端按身份、空间和对象/动作授权；batchId和本地模式不授予权限。','隔离环境用维护、只读、跨空间身份修改componentNameId/id/batchId/fileKey；全部越权拒绝且无额外数据/状态变化。','全部CMS功能'],
  ['CMS-NFR-002','传输与隐私','业务与文件使用TLS；会话凭据不进入URL、规则内容、导出、AI输入、错误或日志。Base64仅为规则序列化，不提供保密。','检查混合内容、测试标记、网络/日志/文件中的凭据；任何明文凭据外泄或跨身份规则泄露失败。','CMS-102、101、111、500、504'],
  ['CMS-NFR-003','代码与输入安全','规则、函数、参考代码、名称和描述仅作为文本编辑/显示；格式化及AI建议不运行SQL、正则或jar，不自动连接数据库。安全高亮禁止innerHTML，服务端对白名单字段和ID重新校验。','用尖括号、引号、HTML、异常Base64、恶意规则及占位符测试；无脚本执行/隐式业务请求，失败不丢草稿；代码执行测试需独立授权环境。','CMS-102、506、500、101'],
  ['CMS-NFR-004','组合与数据一致性','名称实体、显示编码、规则实例、供给id、个人记录和批次分别建模；组合按完整分类/类型/数据库ID匹配。新增展平数组与编辑嵌套数组不得混用；UTF-8 Base64往返保真。','以中文/换行/特殊字符、多组合、相近ID、重复名称和同名候选测试保存/回读；不丢组合、不串ID、不重编码或改变原规则。','CMS-102、506、101、107、504'],
  ['CMS-NFR-005','发布与并发保护','保存/确认/发布/撤销/删除/移除按目标设置一项在途锁；结果未知先回读，不自动重放。服务器校验发布前提、并发版本和批量结果；既有有副作用GET不得被预取/重试/只读探测。','隔离环境双会话和连续按钮/键盘触发、断开响应后回读，核对请求数/记录/最终状态；部分失败逐项呈现，不能提示全批成功。','CMS-100、102、109、501、504'],
  ['CMS-NFR-006','算法包与文件生命周期','.jar前后端校验并进行发布政策要求的内容检测；限额从版本化配置读取并提前展示。上传与规则保存分开；取消/替换/失败后的临时文件归属和清理由文件契约规定。','隔离文件存储测试伪装类型、超限、并行选择、失败重传和取消；multipart正确，无错绑fileKey，旧成功引用不被失败覆盖。','CMS-102、506'],
  ['CMS-NFR-007','导出正确性与下载恢复','单项/批量下载按稳定ID及授权候选；空范围阻止确认；blob响应先判内容和错误，不把JSON错误存成文件。下载记录与计数时点按后端契约，浏览器开始保存不等于文件成功落盘。','隔离环境核对请求数组、包内规则/编码/数据库与批次；测试错误blob、断网、部分无权限及重试，不扩大导出范围、不伪报全部完成。','CMS-500、110、504、505'],
  ['CMS-NFR-008','故障与草稿恢复','配置有限超时；公共兜底20000ms不能覆盖更具体URL配置。候选/解码/上传/列表失败有分别反馈，过时名称查询及列表响应不得覆盖新输入；取消仅放弃未提交内容。','注入断网、超时、202拒绝、5xx、异常结构和迟到响应；解除忙碌、保留可恢复草稿与上下文；查询可重试，写入结果未知先核查。','全部CMS功能'],
  ['CMS-NFR-009','查询与编辑性能','开发验收规模10000个名称、每名称10个类型/数据库组合、单规则UTF-8 100KiB；10个独立并发读会话，列表/超市查询到可操作P95≤3秒、合法查询技术失败率≤1%；编辑器输入到可见更新P95≤100ms。','隔离环境按下述口径测冷/热缓存各类查询≥200次及编辑器≥200次输入，报告时延/失败/样本规模；文件传输不套用3秒。','CMS-100、102、105、500、504、505'],
  ['CMS-NFR-010','兼容与适配','Windows10/11 Chrome/Edge当前及前一稳定大版本；1366×768、1440×1000、1500×1000及200%缩放。320 CSS像素窗口主操作可达；宽表局部横滚、表单可单列、底部固定按钮不遮字段。','逐页检查长规则、多标签、条件字段、上传、下载弹窗与错误态；正文/控件不可达、关键数据被遮挡或无法返回即失败。','全部CMS页面'],
  ['CMS-NFR-011','可访问性','每个字段及选项块有标签、必填/错误关联；类型块、多选、编辑器、页签和对话框可用键盘；打开/关闭恢复焦点，忙碌及错误播报；正文对比度≥4.5:1。','自动检查结合Tab/Shift+Tab/Enter/Escape和读屏；不依颜色独立表达发布/选择状态，确认框取消无业务请求，主流程键盘可完成。','CMS-102、107、503、500、504'],
  ['CMS-NFR-012','审计与可观测性','保存、发布、撤销、删除、个人移除、上传和导出记录身份、空间、对象/批次id、动作、服务器时间、结果和关联请求标识；不记录会话值或无必要的完整规则。','隔离环境串联成功/拒绝/超时的请求、业务回读、批量逐项结果和审计；只有提示或请求头名称不能当作审计证明。','CMS-100、102、109、504、505'],
  ['CMS-NFR-013','维护性与资源释放','集中维护网关、候选、编码和错误契约；注销防抖计时器、resize/keydown监听、编辑器及下载objectURL，隔离不同表单实例；生成刷新保持编号和历史截图。','重复进入退出/全屏/下载弹窗30次，监听、编辑器和临时URL不持续增长，无跨实例影响；生成器和来源丢失反例均通过。','全部CMS页面及文档工具'],
  ['CMS-NFR-014','AI建议与人工控制','可选AI仅接收授权且用户选定的需求/标准/当前规则，输出带引用的规则草稿、说明或静态风险建议；采纳只更新可撤销草稿，不执行代码、不上传、不保存、不发布或下载。失败可继续人工工作。','授权评价集≥30例，包含中文、占位符、不同数据库、资料冲突和提示注入；要求0越权读取、0自动业务写入/执行、每条建议有依据；报告人工正确性、采纳、延迟和成本。','CMS-102、506、500'],
];
function acceptanceFor(kind){
  const cases={
    developList:['用六类条件及100/101字符、发布0/1查询，核对POST componentInfoList的根字段、pageRequest及结果；切换页码/每页条数与列表一致。','未发布记录显示编辑/查看/删除/发布，已发布显示查看/撤销；分别执行获授权单项和批量动作，路径使用componentNameId，成功后回读状态。','空选择点击批量发布/撤销仅提示先勾选；取消删除不发GET deleteComponentInfo；重复触发同目标仅一项在途请求。','模拟202业务拒绝、失权、状态冲突和结果未知；保留原筛选/行，先回读再决定重试，不把空结果当故障或整批成功。','快速A/B查询使A迟到，最终仅B；详情返回恢复筛选/分页；只读/跨空间身份直接修改对象id不得发布或读取越权规则。'],
    form:['合法填写并维护两个类型/数据库组合，新增发送展平JSON数组、编辑发送嵌套数组；ruleContent编码回读一致；保存留页、确认成功后返回。','逐项清空名称/分类/业务分类及当前条件必填；测标准50/51、说明500/501、开发者50/51、函数英文100/101边界；隐藏分支不阻止保存。','改变名称触发500ms读取，旧响应不能覆盖新名称；切换类型/数据库保留组合，切换分类确认清草稿；完整ID匹配不把1匹配到11。','选择合法jar立即上传，失败/超限/伪装被阻止或明确拒绝；上传中禁保存，取消主表不宣称撤销文件；并行重选不串fileKey。','取消/返回确认放弃不保存主表；保存失败保留所有组合，重复按钮/键盘共用锁；保存后再次保存不产生第二名称实体，越权和结果未知按契约回读。'],
    detail:['从开发/个人/超市进入相同componentNameId详情，核对componentDo、各规则组合和只读字段；无保存/上传/发布动作。','切换已存在类型/数据库只改变显示，按完整ID回显；UTF-8 Base64中文、换行和占位符往返一致。','异常Base64、空组合、失效名称和无权限分别显示错误；不展示空白成功，不泄露旧对象规则。','全屏/Escape/返回保留来源筛选或batchId；只读模式不能通过格式化/键盘修改规则或提交。','在只读与跨空间身份直接修改componentNameId、规则id和批次，服务端拒绝越权，无额外业务写入。'],
    nameList:['用名称、编码、创建人、业务分类组合查询POST tcomponent/page，文本100/101边界，pageRequest和datas/total一致。','新增/编辑打开正确600px弹窗，编辑回填当前行五字段；编码禁用，不虚构详情请求。','删除确认绑定当前行id；取消不发GET removeComponentInfo，引用/权限失败保留原行和条件。','快速查询、失败重试、返回/分页恢复只使用最新条件；空结果与202/网络错误分别呈现。','按授权角色/空间测试查询及直接调用配置维护；名称配置权限不得扩展为开发规则或个人记录权限。'],
    nameAdd:['填写名称、业务分类和描述确认，POST tcomponent含三字段及新增空id，不手填编码；提示后回读真实主键与编码。','三必填分别为空/空白、名称100/101、描述500/501时校验；失败定位字段且保留其他输入。','取消、X、Escape确认放弃后无POST，重新打开空草稿；重复确认在途只一次，失败保持弹窗可修正。','模拟同名业务拒绝、候选失效、202/超时；按后端实际唯一范围提示，结果未知先回读，不编造生成编码。','普通只读、跨空间及伪造componentCode请求被服务器拒绝；成功记录不自动赋予额外权限。'],
    nameEdit:['编辑当前行，PUT tcomponent/{id}含原id/编码及三可编辑字段，成功回读同一对象，无POST创建。','三项必填与名称100/101、描述500/501边界一致；编码保持原值，失效业务分类需重新选择。','取消/关闭不发送PUT，重入回显持久化值；失败保留草稿和目标，重复点击不覆盖新版本。','模拟版本/引用/同名冲突、超时及202拒绝，错误明确，结果未知回读当前id再处理。','无修改权或跨空间id请求被拒绝，伪改componentCode不得改变系统编码；后台审计与回读一致。'],
    nameDelete:['当前行删除弹窗显示正确名称/编码和不可恢复提醒，确认调用配置专用GET removeComponentInfo/{id}并回读列表。','分别取消、X、Escape，不发送删除GET，原名称、开发规则和个人记录均保持原值。','模拟被引用/已删除/失权及202错误，保留原行并明确提示；不将删除开发规则接口当配置删除。','连续确认仅一项在途动作；响应超时先回读同一id，不能自动重放有副作用GET。','用只读/跨空间身份改id访问删除路径仍被服务端拒绝；审计记录对象范围，关联清理按版本化契约验收。'],
    classifyList:['名称/创建人筛选及分页调用tbusinesstype/page，显示名称、描述、创建人和时间；空结果和错误分开。','新增/编辑/查看分别打开三种标题，编辑回填当前行、查看全禁用且无PUT/POST。','仅isAllowDeletion=1有删除入口；确认后DELETE tbusinesstype/{id}，取消无请求，已引用分类失败保留。','快速筛选迟到响应不覆盖；分类名称50/51、描述500/501及空白校验一致，失败保留草稿。','越权与跨空间分类id不能维护；不出现不存在的父节点、树、编码、移动功能。'],
    classifyForm:['新增填写名称和描述，POST两个字段；编辑PUT路径id且body仅两个字段；成功回读。','名称空/空白及50/51、描述500/501边界；描述空可提交，重复名称按后端实际规则反馈。','查看禁用且确认无提交；新增/编辑取消/X/Escape放弃草稿不写入；重复确认只有一次在途请求。','模拟候选引用变化、并发、202和超时，草稿保留；结果未知先回读，不以对话框关闭认定成功。','无写权限或改为其他空间id被拒绝；维护业务分类不改变质量/标准等规则检测分类绑定。'],
    mine:['按业务分类、名称、构件分类、导出格式和batchId查询，POST myComponentList带pageRequest；重置仍保留批次范围。','单项和批量下载把稳定id及数据库/类型逗号串转换成去空去重数组，原始blob有效才保存；失败不生成假成功包。','删除/批量移除确认后仅调用myComponentListRemove/{componentNameIds}；取消无请求，个人移除不删除共享名称或开发规则。','空选择提示先勾选；网络/202/未知结果保留范围并回读；个人详情返回恢复原批次和筛选。','改batchId/componentNameId或跨空间身份不能读/移除他人记录；无新增/编辑个人主记录的虚构入口。'],
    record:['读取记录使用GET myComponentExportRecordList，展示日期、应用形式、数量、格式及查看；原尾空格和丢参数问题按交付契约修复后联调。','在后端筛选契约交付前，改变分类/创建人/分页不得假装服务端生效；明确限制，不编造POST接口。','点击当前行查看，转到mine/index且仅用该batchId查询；空/失效/越权批次不得退化成全量个人列表。','空结果、202、异常结构、断网和重试有各自状态；返回恢复记录列表，不能根据旧记录时间固定生成规则。','只读/跨身份访问批次被拒绝；记录没有人工新增/修改/删除入口，不把导出开始当业务批次已完成。'],
    shop:['关键词搜索/Enter、分类及四行筛选生成tcomponentBus/page具体参数；当前页和页大小20/40/60/100真实传递，空结果可继续筛选。','单项/批量下载弹窗按有效id加载候选，单项用download、批量用batchDownload；参数分别含databaseObjectId与三类ID数组。','勾选/半选/全选仅作用当前页稳定id，文案为本页；同名不串选，换页/筛选清理失效选择，展开全部标签不遗漏中间项。','自定义时间完整且开始≤结束才查询，全部不传时间；候选/列表/下载失败保留条件，取消/X/Escape不发下载且清理弹窗。','迟到响应不覆盖新条件；异常/JSON blob不得下载为包；跨空间id不能导出，下载后的计数/个人记录按真实服务器回执核对。'],
  };
  return cases[kind];
}
function screenshot(id){const p=/^[HZ]-/.test(id)?'../evidence/live-recheck-20261022/':'../evidence/';return `[${id}截图](${p}${id}.png) / [元素](${p}${id}.json)`;}
function flow(kind){
  if(kind==='form')return ['加载绑定和名称/业务候选，候选空或失败先恢复依赖；新增初始化空基础资料与首个可用类型/数据库。','输入/选名称，按当前名称请求代次读取已有组合；有变更先确认是否替换草稿。','填写基础信息，逐组合编辑规则/条件字段；切换保存本地组合，上传算法包独立记录成功键。','按当前可见分支和全部待提交组合校验，构造JSON快照并仅对ruleContent做UTF-8 Base64；校验失败不改变待保存集合。','点击保存/确认，新增发根数组展平项，编辑发嵌套项；取得业务结果并回读稳定身份。保存留页转为可靠后续编辑，确认提示后返回；失败保留所有组合。'];
  if(kind==='detail')return ['从来源行取得稳定名称实体标识并校验会话/对象权限。','加载绑定、基础信息和规则组合；解码每项ruleContent，错误单独呈现。','按已有类型/数据库切换只读显示；查看不生成新组合或上传/保存。','返回恢复来源条件、页码及batchId；失效/失权对象返回可访问入口。'];
  if(kind==='shop')return ['读取分类、数据库/类型和业务候选，候选就绪后按当前条件请求超市列表。','搜索/选择筛选或分页，提交实际页码及候选id；用请求代次接收datas/total。','查看目标或按本页id选择下载范围；打开下载弹窗后读取有效候选并校验选择。','确认才请求下载；校验原始响应及blob，交浏览器保存文件；计数/个人记录/批次结果按服务器契约回读。','取消/X/Escape清理未提交选择；失败可恢复条件，已发导出结果未知时先核查，不能自动重复生成。'];
  if(kind==='record')return ['加载记录并区分空态与失败；请求包装器当前没有筛选/分页参数。','按真实后端契约决定启用筛选与分页；未交付时明确不可用，不展示虚假筛选结果。','点击当前批次查看，带batchId进入个人列表；该范围作为固定条件继续查询/分页/重置。','返回记录页面恢复上下文；本页不生成、修改或删除导出记录。'];
  if(kind==='nameDelete')return ['取当前行稳定id、名称、编码及相应删除权限。','展示不可恢复提醒及对象身份；取消/关闭直接结束，无删除请求。','确认后锁定目标并调用配置专用GET删除；处理引用、状态、权限或版本拒绝。','成功提示后回读原列表；超时结果未知先核对该对象，失败保留原行与上下文。'];
  if(kind==='developList')return ['加载业务分类及检测分类绑定，按六个筛选与pageRequest请求开发列表。','按isPublish显示未发布编辑/查看/删除/发布，或已发布查看/撤销；导航携带当前行稳定标识。','单项/批量发布及撤销使用componentNameId；批量先校验选择，开发删除先确认且不与名称配置删除混用。','处理服务端授权、状态和逐项业务结果后回读原范围；失败保留条件与行，超时先核查，不自动重发有副作用GET。'];
  if(kind==='nameList')return ['加载业务分类，按名称、编码、创建人、分类和pageRequest查询名称实体。','新增打开空模型，编辑复制当前行五字段及稳定id；禁用componentCode。','新增/编辑在对应弹窗确认才保存；删除在不可恢复确认后用名称配置专用GET。','成功回读原列表，失败保留对象及条件；详情不是本页面独立入口，不额外构造详情请求。'];
  if(kind==='classifyList')return ['以业务分类名称、创建人和pageRequest请求tbusinesstype/page。','按新增/编辑/查看模式打开同一对话框；编辑或查看从当前行复制两字段和id，查看不提交。','新增POST两个字段，编辑PUT路径id且仅两个body字段；isAllowDeletion=1显示删除，确认后DELETE。','处理服务端引用、唯一及权限结果并回读；失败留草稿/列表，不能将业务分类维护当检测分类树变更。'];
  if(kind==='mine')return ['从独立入口读取当前身份个人范围；从导出记录进入时先取得有效batchId并固定在该次查询上下文。','加载候选后提交四筛选与pageRequest；清空筛选、分页和返回详情均保持适用批次，不降为无范围查询。','查看按componentNameId读取只读详情；下载将选择转换为去空去重的数据库/类型/分类ID数组；移除先确认个人记录范围。','有效blob才交保存；移除成功后回读个人列表，不删除共享规则。下载/移除结果未知先核查，保留原筛选/选择供恢复。'];
  if(['nameAdd','nameEdit','classifyForm'].includes(kind))return ['打开目标对话框；新增初始化空字段，编辑从当前行复制已定义字段与id，查看禁用。','按字段表输入并校验必填/长度/格式及候选有效性；编辑保护目标id和只读编码。','确认才发送对应POST/PUT，所有入口共用请求锁；失败保留对话框及输入并定位错误。','业务成功提示后关闭并回读原列表；取消/返回处理未保存草稿，不发送主对象保存请求。'];
  throw new Error('CMS flow missing: '+kind);
}
function renderFeature(entry){
  const p=PROFILES[entry.kind],kind=entry.kind,editing=['form','nameAdd','nameEdit','classifyForm'].includes(kind);
  const fields=FIELDS[kind];
  const context=kind==='mine'||kind==='record'?'；从记录进入时必须有获授权的有效batchId':kind==='detail'||kind==='nameEdit'||kind==='nameDelete'?'；目标必须是当前行有效稳定实体标识':kind==='form'?'；编辑仅对获授权未发布规则开放，新增先加载有效候选':'';
  const quality={developList:[1,2,3,4,5,8,9,10,11,12,13],form:[1,2,3,4,5,6,8,9,10,11,12,13,14],detail:[1,2,3,4,8,10,11,13],nameList:[1,2,3,4,5,8,9,10,11,12,13],nameAdd:[1,2,3,4,5,8,10,11,12,13],nameEdit:[1,2,3,4,5,8,10,11,12,13],nameDelete:[1,2,3,4,5,8,10,11,12,13],classifyList:[1,2,3,4,5,8,9,10,11,12,13],classifyForm:[1,2,3,4,5,8,10,11,12,13],mine:[1,2,3,4,5,7,8,9,10,11,12,13],record:[1,2,3,4,7,8,9,10,11,12,13],shop:[1,2,3,4,7,8,9,10,11,12,13,14]}[kind].map(n=>'CMS-NFR-'+String(n).padStart(3,'0'));
  return [
    `### ${entry.id} ${entry.title}`,'',`**功能入口：** ${p.url}`,`**操作类型：** ${editing?'新增/编辑及条件表单':kind==='detail'?'只读详情':kind==='nameDelete'?'删除确认':'查询与适用操作入口'}。`,
    '**前置条件：** 已登录且具有当前身份、空间、目标对象及动作授权'+context+'。',`**业务目的**：${p.goal}`,'',`<!-- 完整规格:${entry.id} -->`,'',
    `#### 1. 页面字段清单（${entry.id}）`,'',...table(['字段名称与绑定名','类型/控件','是否必填','默认值','长度/范围/单位','格式及校验规则','错误提示','条件/状态'],fields),
    '字段属性空白处不授权AI自定规则，也不等于无校验；缺失的服务端属性按交付契约补齐。列表只读字段不作为可填写控件，当前样本内容不是固定默认值。','',
    `#### 2. 页面交互规则（${entry.id}）`,'',...table(['控件/触发方式','行为、联动、禁用与反馈'],p.controls),
    `#### 3. 业务流程与异常分支（${entry.id}）`,'','**操作与规则**：','',...flow(kind).map((s,i)=>(i+1)+'. '+s),'','**结果与异常处理**：','',
    ...table(['异常分支','结果、数据影响及恢复'],[
      ['无权限/会话过期/对象失效','终止读写并清除无权内容，提示重新登录或返回；不能将失权当成功空数据。'],
      [kind==='form'||kind==='detail'?'依赖/接口/解码失败':'依赖/接口读取失败','说明失败对象，解除忙碌并保留可恢复输入；重新加载依赖不覆盖用户当前草稿。'],
      ['网络超时/202业务拒绝/5xx','区分业务错误和技术失败；读可按原条件重试，有副作用请求结果未知先回读，不能自动重放GET或POST。'],
      ...(kind==='detail'?[]:[['重复/状态或引用冲突','使用服务端真实字段及错误契约定位；同目标在途锁防重入，批量结果逐项核对，不虚构全局名称唯一或批量原子性。']]),
      ...(editing?[['校验/取消/文件','只校验适用分支，草稿错误定位字段；放弃主记录不提交，已成功上传的文件按独立生命周期处理。']]:[]),
    ]),
    `#### 4. 接口与数据规则（${entry.id}）`,'','**请求方法与相对路径**：请求中的路径标识、query和body分开处理；字段类型与候选来源见本功能字段表，复合结构见公共数据映射。','',...table(['用途','HTTP方法','相对路径','请求参数、来源与序列化','返回读取与页面处理'],p.requests),
    '**开发处理细则**：使用公共会话客户端，JSON为application/json，GET参数在query、其他方法在body；文件使用FormData。普通成功链解包response.data，下载rawData保留原响应。HTTP 202按公共业务错误链reject，不能虚构统一code=0成功结构；对象持久化和状态变化以真实业务结果及回读核验。','',
    `#### 5. 验收标准（${entry.id}）`,'',...table(['验收编号','操作与可检查结果','关联需求','状态'],acceptanceFor(kind).map((s,i)=>['CMS-AC-'+String(entry.start+i).padStart(3,'0'),s,entry.id,'未执行'])),
    `#### 6. 权限与安全要求（${entry.id}）`,'',
    '- 允许访问本页面的身份须具备当前对象及动作权限；服务端分别校验查询、代码读取、候选、名称配置、开发维护、发布/撤销、文件与导出、个人移除及批次权限；菜单可见、optType和禁用控件不能授予权限。',
    '- 名称主键、规则实例、空间、批次与文件键按授权关系校验；个人记录移除不扩展为删除共享开发规则。具体角色/资源矩阵按版本化契约联调。',
    '- 规则、SQL、函数和算法包在本模块作为业务内容管理，格式化/查看不执行代码；业务及文件使用TLS，Base64不替代加密，日志及AI输入不带会话凭据。','',
    `#### 7. 页面布局与状态（${entry.id}）`,'',...p.layout.map(s=>'- '+s),
    '- 区分初始化、读取中、可操作、空结果、失权、业务/技术失败、动作中和结果回读；只读页不出现提交中。历史截图像素仅属其视口，窄屏/缩放/长文本与弹窗按模块非功能要求适配。','',
    `#### 8. 关联文档（${entry.id}）`,'',...entry.sources.map(s=>'- '+screenshot(s)+'。'),
    ...(kind==='detail'?['- [有内容的详情布局](../evidence/F152-CMS-mine-detail.png)及[元素](../evidence/F152-CMS-mine-detail.json)；空框架的有效性限制见核查记录。']:[]),
    '- 对应静态证据组：'+p.sources.map(id=>'CMS-SRC-'+id).join('、')+'；公共调用另见CMS-SRC-GATEWAY、SHELL-REQUEST、CONFIG和BASE。各组原文、时间、偏移及摘要见[片段索引](../evidence/cms-review-20261026/index.json)。',
    '- [核查记录](./核查记录.md) · [静态原文与历史截图索引](../evidence/cms-review-20261026/README.md) · [公共数据映射](./子页面与操作细化.md#4-字段枚举和约束)。',
    '- 适用质量要求：'+quality.join('、')+'，见[非功能性需求](./需求说明.md#9-非功能性需求)。上述应用验收全部未执行；后端交付依赖见独立核查记录。','',
  ].join('\n');
}
function sharedRules(){return [
  '### 对象身份与分类体系','',
  ...table(['对象/字段','映射及约束'],[
    ['名称实体','tcomponent的id为内部主键，componentCode为只读显示编码。开发行componentNameId、超市行id传入共用详情读取；各接口返回身份关系须联调核对。'],
    ['规则实例','componentInfoExtDo.id是具体规则组合的标识；componentInfoExtId仅为列表导航附带字段，详情实际使用componentNameId。组合主键按componentSort、componentType、databaseObject完整比较。'],
    ['业务分类','tbusinesstype维护classificationName/Description，用businessId引用；“人口类”等候选来自服务器，分类页不是树。'],
    ['构件检测分类','componentSort来自绑定表；“质量检测/标准检测/安全检测/清洗加工”是历史候选，与业务分类不同。componentNameSortType返回componentSortType=1分类、2类型、3数据库。'],
    ['个人记录/导出批次','个人列表使用名称id及自己的会话范围；导出记录行batchId进入个人列表作为固定范围，不当作开发规则版本id或可人工维护对象。'],
  ]),
  '### 构件开发请求模型','',
  ...table(['模型/字段','类型/取值来源','请求与处理'],[
    ['componentDo','object','componentName、businessId、componentDescription、useStandard、ruleExplain、visitCode、developer、checker、isPublish，编辑包含服务器id等明确白名单字段；不直接透传详情额外键。'],
    ['componentInfoExtDo','object','componentSort、componentType、databaseObject、ruleContent、ruleType、functionEnglishName、functionRepresentation、fileKey、fileName、componentTypes、databaseObjects、id。'],
    ['componentInfoExtDoList','本地array<object>','保存各组合草稿；不是传给接口的根对象名。分类切换会清该集合，先处理未保存变更；类型/数据库切换保存当前再恢复目标。'],
    ['新增根数组','array<object>','POST addComponentInfo，每项Object.assign({},规则扩展项,名称基础项)；同名键合并时基础项在后。显式DTO避免字段碰撞或未知id覆盖。'],
    ['编辑根数组','array<{componentDo,componentInfoExtDo}>','POST editComponentInfoByRelevanceId，每项嵌套两模型；保留对应名称和组合id，不能改成新增展平结构。'],
    ['ruleContent','string','UTF-8文本→Base64；详情atob后按UTF-8解码。仅对请求快照编码一次；中文/换行/占位符原样保留，格式化不等于语法/执行校验。'],
    ['componentTypes/databaseObjects','逗号分隔ID字符串','完整token去空去重，不能indexOf子串误配。未填组合不隐式保存；校验所有有效草稿而非仅当前可见组合。'],
    ['conditional fields','当前模板条件','37显示ruleType=1枚举/2连续；39要求fileKey且ruleContent可空；41且分类31显示必填函数英文名/表达式，非39的规则内容仍必填。实际id/名称映射以候选服务为准。'],
    ['保存/确认','confirm(1)/confirm(2)','均写入；保存成功留页，确认在成功提示确认后返回。首次保存后必须按服务器回执取得稳定身份并安全切换后续更新，不能继续add造成重复创建。'],
  ]),
  '### 超市筛选、选择与下载','',
  ...table(['参数/行为','规则'],[
    ['pageRequest','pageNo=currentPage、pageSize=当前选择20/40/60/100、order=[]；不使用旧实现固定1/10。筛选改变先置1再请求。'],
    ['可选筛选根字段','keyword始终随请求；databaseObjectList、businessIdList、componentTypeList仅非空时传。综合不传componentSort，其他页签传对应分类id。'],
    ['发布时间','快捷1/2/3对应近7天/近15天/近3个月；全部不传。自定义同时传publishTimeFromQo/publishTimeToQo，yyyy-MM-dd HH:mm:ss；时区及闭开边界按服务端契约。'],
    ['选择范围','按本页id选择并明确本页文案；全量匹配导出需要独立后端快照/范围契约，当前不承诺。ids与显示名称分离，换条件/页码清理失效选择。'],
    ['单项download','{id:行id,databaseObjectId:选择ID,componentTypeIdList:[类型ID]}；数据库变化GET compontShopByObjId/{componentNameId}/{databaseObjectId}取类型。'],
    ['批量候选','POST componentBatchDownloadViewInit，{ids:[行id]}；读取componentDbList/componentSortList/componentTypeList；选项使用稳定id，名称仅展示。'],
    ['批量batchDownload','{ids:[名称ID],componentDbIdList:[数据库ID],componentSortIdList:[分类ID],componentTypeIdList:[类型ID]}；个人单项同用此接口，逗号集合split后去空去重。'],
    ['文件响应','下载请求rawData:true及responseType:blob；核对HTTP、业务错误blob、内容类型与文件名再交保存工具。确认发请求后关闭弹窗不证明服务器已取消。'],
  ]),
  '### 配置、个人移除与记录边界','',
  '名称配置：POST /back/dop/factory/tcomponent创建，PUT /back/dop/factory/tcomponent/{id}修改，确认后GET /back/dop/factory/tcomponent/removeComponentInfo/{id}删除。classify API中另有DELETE /tcomponent/{id}包装器，但名称页面实际绑定前者，不能混用。分类编辑PUT /tbusinesstype/{id}只传classificationName和classificationDescription；删除按isAllowDeletion显示且服务端再校验。','',
  '个人移除：GET /back/dop/factory/tcomponentinfoext/myComponentListRemove/{ids}当前直接提交；目标交互加入范围确认，防止以查看为由触发。导出记录包装器GET的原路径末尾带U+0020且不接受筛选参数；正文不虚构修复后的方法/参数，后端契约交付前不能声称筛选/分页有效。','',
  '### AI辅助规则开发与检索','',
  '提供三个独立扩展场景：根据用户选定的授权需求与标准生成规则草稿及{变量}说明；对当前规则给出静态风险、数据库适配和缺失条件建议；在超市检索中根据需求推荐可复用候选及匹配依据。输入只含当前明确选择的资料和获授权候选；输出逐条给引用、适用数据库、假设及不确定项。用户逐项采纳可撤销地写入当前草稿或筛选条件，不自动创建名称、上传jar、保存、发布、运行规则或下载。模型不可用/超时保留原人工流程。来源授权、正确性、延迟、取消和成本评测按CMS-NFR-014及独立接入契约实施。','',
];}
function boundaries(){return table(['历史操作编号','操作','具体范围与实现边界'],[
  ['CMS-103','编辑开发规则','未发布进入development/edit?optType=edit；详情按componentNameId读取，POST editComponentInfoByRelevanceId嵌套数组，名称/构件分类禁用。'],
  ['CMS-104','删除开发规则','未发布行确认后GET deleteComponentInfo/{componentNameId}；发布/撤销及批量动作详见CMS-100/501。'],
  ['CMS-106','查看名称配置','页面无独立详情入口；编辑弹窗可读取行资料，不另加虚构详情GET。'],
  ['CMS-112','新增个人构件','无人工新增页；是否由下载建立个人记录以导出服务契约核对，不根据名称推定。'],
  ['CMS-113','修改个人构件','无个人记录编辑页；查看链接进入共享只读详情，不开放编辑规则。'],
  ['CMS-114','删除个人构件','页面删除/批量移除调用myComponentListRemove，按个人作用域确认；不等于删除开发规则。'],
  ['CMS-115','查询业务分类','manage/classify/index，POST tbusinesstype/page；不是分类树。'],
  ['CMS-116','查看业务分类','同列表600px查看模式，回填当前行并全禁用；无保存请求。'],
  ['CMS-117','新增业务分类','POST tbusinesstype，名称50必填、描述500可空，见CMS-510。'],
  ['CMS-118','编辑业务分类','PUT tbusinesstype/{id}只传名称/描述；当前行id绑定目标，见CMS-503/510。'],
  ['CMS-119','删除业务分类','isAllowDeletion=1可见，确认后DELETE tbusinesstype/{id}；引用和后端权限另校验。'],
  ['CMS-120','查询导出记录','mine/record，GET myComponentExportRecordList；原包装器丢筛选/分页，契约与目标修复见CMS-505。'],
  ['CMS-121','查看导出记录','跳转mine/index?batchId={batchId}，不是独立详情表单；个人列表固定批次上下文。'],
  ['CMS-122','新增导出记录','没有人工新增入口；产生时点及下载/导出业务结果由服务端契约规定。'],
  ['CMS-123','修改导出记录','没有编辑入口；不添加可编辑历史计数/格式表单。'],
  ['CMS-124','删除导出记录','没有删除入口；留存/文件清理采用后端发布政策，不与个人移除混用。'],
]);}
function section(text,n){const h=[...text.matchAll(/^## (\d+)\.[^\n]*\n/gm)],i=h.findIndex(x=>Number(x[1])===n);return i<0?'':text.slice(h[i].index+h[i][0].length,h[i+1]?.index??text.length);}
function preservedAcceptance(previous,type){
  const entries=type==='main'?MAIN:SUB,start=type==='main'?1:500,count=type==='main'?60:33;
  const expected=entries.flatMap(e=>Array.from({length:5},(_,i)=>e.start+i)).concat(Array.from({length:count},(_,i)=>start+i)).map(n=>'CMS-AC-'+String(n).padStart(3,'0'));
  const actual=[...previous.matchAll(/^\| (CMS-AC-\d{3}) \|/gm)].map(m=>m[1]);
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('CMS published acceptance rows missing, duplicated or reordered');
  const counts=new Map();
  const rows=section(previous,6).split(/\r?\n/).filter(s=>/^\| CMS-AC-/.test(s)).map(line=>{
    const c=line.split('|').slice(1,-1).map(v=>v.trim()),sub=c.length===4,ref=sub?c[2]:c[3],entry=entries.find(e=>e.id===ref);
    if(!entry)throw new Error('CMS acceptance reference missing: '+ref);
    const i=counts.get(ref)||0;counts.set(ref,i+1);
    let scenario=sub?'集中回归':c[1],desc=acceptanceFor(entry.kind)[i%5];
    if(!sub){
      const title=c[1];
      if(title.includes('异常')||title.includes('边界'))desc=acceptanceFor(entry.kind)[entry.kind==='detail'?2:3];
      if(title.includes('必填'))desc=`其他字段合法，仅清空${title.replace('必填','')}或输入空白并确认；按本功能字段表阻止保存、定位该字段且保留其余输入；服务端同样拒绝非法必填。`;
      if(title.includes('长度边界'))desc=c[2].replace(/字符计数口径先按公共规则确认。/g,'控件长度与服务端字符计数按数据契约分别核对。');
      if(title.includes('ID保护'))desc='新增不手填componentCode，编辑禁用并保持原编码；请求id来自当前行稳定主键，伪改编码或跨空间id服务端拒绝，回读对象身份不变。';
      if(title.includes('取消')&&!title.includes('删除'))desc=entry.kind==='form'?'修改草稿后取消/返回/浏览器后退确认放弃，无主对象保存请求；新建重入空草稿，编辑重入持久化记录。算法上传等已完成副作用按独立文件生命周期核对。':'修改草稿后取消/X/Escape确认放弃，无POST/PUT；新增重入为空草稿，编辑重入回填持久化记录，原实体保持原值。';
      if(title.includes('取消删除'))desc=acceptanceFor('nameDelete')[1];
      if(title.includes('提交失败'))desc='明确失败保留当前目标和全部草稿；写入超时先按稳定身份及后端查询契约核查，再决定重试；不自动新增第二实体。';
      if(title.includes('越权')||title.includes('数据隔离'))desc=acceptanceFor(entry.kind)[4]+' 使用获授权隔离测试身份验证；合法重复维护按后端幂等契约核对单次结果。';
      if(title.includes('查询竞态'))desc='先发A再B并令A迟到，最终仅显示B的结果/总数；详情返回恢复原筛选、页码及适用batchId，失败不把旧结果当当前成功。';
      if(title.includes('详情失效'))desc=acceptanceFor('detail')[2];
      if(title.includes('版本与引用'))desc=acceptanceFor('nameDelete')[2];
      if(title.includes('展示失败'))desc='超市查询/候选失败显示错误并保留条件；卡片下载次数和发布时间来自当前响应，不按历史样本固定；不把全选文案当全量选择实现。';
    }
    return [c[0],scenario,desc,ref,'未执行'];
  });
  return table(['编号','场景','操作与可检查结果','关联需求','状态'],rows);
}
function renderNfrSection(){return ['## 9. 非功能性需求','',
  '下列为开发验收要求，均未执行。具体目标来源、现有实现差异和后端依赖见[核查记录](./核查记录.md)。','',
  ...table(['编号','质量属性','需求与指标/不变量','验收方法及通过条件','关联功能','状态'],NFRS.map(r=>[...r,'未执行'])),
  '性能环境与口径：在获授权隔离环境记录构建版本、客户端CPU/内存/浏览器、网关/服务端/数据库资源及索引、数据分布，网络10Mbps上下行、50ms RTT，保持安全策略。10个独立读会话含1秒思考时间，预热2分钟、统计10分钟；冷/热缓存每类查询各≥200次，报告P50/P95/P99、最大值、吞吐和全部失败。查询计时从点击/Enter至本次列表、分页和操作可用，同一单调时钟；分位取升序第ceil(p×N)项。合法请求5xx、超时、解析及错误业务结果均计技术失败，业务拒绝/限流另列但不隐藏。编辑器100KiB样本计键盘输入至可见更新。样本不足或环境缺失不能判通过；文件传输按大小和发布限额另测，不推导生产QPS、月可用率或RTO/RPO。',''];}
function renderDocument(type,previous){
  const entries=type==='main'?MAIN:SUB,ac=preservedAcceptance(previous,type);
  const sourceRows=section(previous,8).split(/\r?\n/).filter(l=>/^\| CMS-\d{3} \|/.test(l));
  if(type==='main'&&JSON.stringify(sourceRows.map(l=>l.split('|')[1].trim()))!==JSON.stringify(MAIN.map(e=>e.id)))throw new Error('CMS published source rows missing or reordered');
  const parts=type==='main'?[
    '## 1. 业务目标与使用角色','','为获授权用户维护可复用构件、管理发布供给，并支持按数据库及规则类型检索、导出与个人使用。角色以服务端动作/资源矩阵授权，不凭单账号材料命名固定管理员角色。入口：需求管理 → 构件管理。','',
    '## 2. 业务范围','','覆盖构件超市、构件开发及多组合编辑、名称配置、业务分类配置、个人构件和导出批次。主文档保留10项功能，子文档保留11项页面/操作；未发布编辑/删除、发布/撤销、文件上传、单项/批量下载和个人移除均在对应功能展开。16个历史操作编号在第7节定义边界，不为无入口对象虚构CRUD。','',
  ]:[
    '## 1. 范围与入口','','本文件细化[模块正文](./需求说明.md)的11项独立页面/操作；各功能字段、逐控件交互、具体请求、异常、布局及验收见第3节。','',
    '## 2. 页面与资料覆盖','','历史页面与元素为2026-10-22，静态实现沿组件、API包装器和公共客户端核对。导航登记失败与截图中的对应内容并列保留；空详情框架不当作完整详情。时间、视口、用途与限制见[专项证据索引](../evidence/cms-review-20261026/README.md)。','',
    ...table(['页面/操作','功能编号','截图与元素','覆盖边界'],SUB.map(e=>[e.title,e.id,e.sources.map(screenshot).join('；'),e.kind==='record'||e.kind==='mine'?'导航失败登记；已有图/元素可补布局，不能宣称导航成功':e.id==='CMS-507'?'只读空框架，内容布局另见F152':'历史页面/弹窗/候选样本'])),
  ];
  const common=['## 5. 主要业务流程','','1. 维护业务分类和名称基础资料，开发时选择或输入名称，核对已有规则组合。\n2. 按分类、类型和数据库对象编辑多个规则草稿，必要时上传算法包；保存留页，确认保存后返回。\n3. 在开发列表单项/批量发布或撤销发布，未发布状态可编辑/删除；供给范围以服务端发布及授权契约为准。\n4. 在超市按关键词、分类、数据库、业务及时间检索，查看只读详情，按本页选择单项或批量下载。\n5. 在个人构件中查询、查看、下载或移除个人记录；从导出记录查看通过batchId限定个人列表。下载、个人记录与导出批次的产生/更新时点按服务端契约核对。',''];
  return ['# 构件管理'+(type==='main'?'业务需求说明':'子页面与操作需求细化'),'','<!-- 业务规格格式:plain-v1 -->','<!-- cms:generated-spec-v1 -->','',
    '修订日期：2026-10-26。本文直接定义目标业务规则；依据、原实现差异及外部交付依赖见[核查记录](./核查记录.md)。','',...parts,
    type==='main'?'## 3. 功能需求':'## 3. 编号功能需求','',...entries.map(renderFeature),
    type==='main'?'## 4. 字段与业务规则':'## 4. 字段、枚举和约束','',
    ...(type==='main'?['业务分类与检测分类分开；名称主键、显示编码、规则实例、供给id、个人记录及导出批次不混用。开发保存模型、Base64、条件字段、筛选、下载及配置/个人动作见[公共数据映射](./子页面与操作细化.md#4-字段枚举和约束)。','']:sharedRules()),...common,
    type==='main'?'## 6. 验收标准':'## 6. 验收用例','',type==='main'?'以下60条集中验收与功能内50条合计110条；全部未执行。':'以下33条集中验收与功能内55条合计88条；全部未执行。两份正文共198条功能验收，非功能另列14项。','',...ac,
    '## 7. 实现与交付边界','','已明确字段、调用端模型、相对路径和目标交互可支持页面及已知调用端开发。真实持久化仍须取得后端授权矩阵、请求/响应DTO、发布和批量事务、文件与导出、个人移除范围、记录筛选/分页等[外部交付契约](./核查记录.md#外部依赖)。不得由AI猜测成功码、生成编码、状态机或未定义接口。','',
    ...(type==='main'?boundaries():['历史操作编号的适用性与具体边界见[主文档第7节](./需求说明.md#7-实现与交付边界)。','']),
    'AI辅助规则草拟、静态审查与候选推荐属于独立规划，采纳仅更新可撤销草稿，不自动执行规则或业务写入，见[AI详细规则](./子页面与操作细化.md#ai辅助规则开发与检索)。','',
    type==='main'?'## 8. 关联资料':'## 8. 来源链接','',
    '[主规格](./需求说明.md) · [子页面细化](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [专项证据](../evidence/cms-review-20261026/README.md) · [历史调研归档](./调研记录.md) · [总索引](../README.md)','',
    ...(type==='main'?[...table(['需求编号','界面依据','详细记录'],[]).slice(0,2),...sourceRows,'',...renderNfrSection()]:[]),
  ].join('\n');
}
function renderMain(previous){return renderDocument('main',previous);}
function renderSub(previous){return renderDocument('sub',previous);}
function writeDocuments(root){const dir=path.join(root,'doc/requirements/05-构件管理');for(const [file,type] of [['需求说明.md','main'],['子页面与操作细化.md','sub']]){const target=path.join(dir,file);fs.writeFileSync(target,renderDocument(type,fs.readFileSync(target,'utf8')));}}
module.exports={MAIN,SUB,FIELDS,PROFILES,NFRS,acceptanceFor,renderFeature,renderMain,renderSub,renderNfrSection,writeDocuments,sharedRules};
