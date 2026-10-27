/* Evidence-bounded document source. This generator never calls the application. */
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../doc/requirements');
const MAIN=[
  {id:'DMS-100',title:'查询与维护模型管理',kind:'model',start:521,sources:['F091-model-menu-design','H-DMS-001']},
  {id:'DMS-001',title:'查找与组织模型',kind:'navigation',start:526,sources:['E032-modeling','H-DMS-004']},
];
const SUB=[
  ['506','模型设计与模型管理','model',531,['H-DMS-001']],
  ['507','模型物化、历史与执行边界','materialization',536,['H-DMS-002']],
  ['508','模型分析与自定义对比','analysis',541,['H-DMS-003']],
  ['509','模型数据统计与标准使用统计','statistics',546,['H-DMS-004']],
  ['510','开发环境配置','environment',551,['H-DMS-005']],
  ['511','模型属性配置查询与维护','properties',556,['H-DMS-006']],
  ['512','新增建模属性与前后置字段','propertyForm',561,['H-DMS-006-op1','H-DMS-006-op1-options0','H-DMS-006-op1-options1','H-DMS-006-op1-options2']],
].map(([id,title,kind,start,sources])=>({id:'DMS-'+id,title,kind,start,sources}));
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','|'+heads.map(()=>'---').join('|')+'|',...rows.map(r=>'| '+r.map(v=>String(v??'').replaceAll('|','&#124;').replaceAll('\n','<br>')).join(' | ')+' |'),''];
const f=(name,type,required='',value='',limit='',rule='',error='',state='')=>[name,type,required,value,limit,rule,error,state];
const ro=(name,rule='')=>f(name,'只读展示','','','',rule,'','返回结果');
const pages=[f('当前页 pageRequest.pageNo','integer','是','1','≥1','新查询、重置和页大小改变回第1页'),f('每页条数 pageRequest.pageSize','integer','是','20','正整数','20为参考初始条数；有效上限由服务契约限制；不把当前总数当上限'),f('列表 datas / total','array / integer','','','','只接受当前查询响应；空数组与请求失败分开')];
const modelFields=[
  f('模型名称 modelName','可清空文本','否','','','trim首尾空白；匹配方式须按服务契约'),
  f('创建人 createUsername','可清空文本','否','','','trim；显示名筛选不代替用户ID鉴权'),
  f('创建时间 curCreateTime','datetimerange','否','','','value-format=yyyy-MM-ddTHH:mm:ss；beginCreateTime/endCreateTime取两端，清空时两端null；默认时分秒00:00:00/23:59:59'),
  f('模型类型 modelTypeId','展开区单选','否','','2、3','2概念/逻辑模型，3物理模型'),f('状态 lockFlag','展开区单选','否','','0、1','0正常、1锁定；0是有效条件'),...pages,
  ro('序号','按页号和页大小计算'),ro('模型名称 modelName'),ro('模型属性 modelCategoryId / tabConfigId','1普通、2数仓、3指标；后接该分类配置名称'),ro('模型类型 modelTypeId / pdmDbType','物理类型附数据库类型名'),ro('实体/表 tabNum / srcTabNum','概念/逻辑类型Number(tabNum)+Number(srcTabNum)，物理类型tabNum'),ro('创建时间 createTime'),ro('创建人 createUsername'),ro('状态 lockFlag','0正常、1锁定'),ro('版本 versionNo'),ro('记录 id / 模型 modelId','id为版本记录标识，modelId为模型标识；不能互换'),
  f('新增/编辑：模型属性 curModelData.modelCategoryId','单选 string','是','新增为1','1、2、3','普通/数仓/指标；编辑从行深拷贝；切换后旧tabConfigId须失效'),
  f('属性配置 tabConfigId','单选 ID','非普通模型必填','新增null','','分类候选来自dmsModelTabConfig/list；编辑转Number，不能用配置名称当ID'),
  f('模型名称 curModelData.modelName','文本','是','新增null','100字符','trim后非空；编辑锁定记录禁用','请输入模型名称'),
  f('模型类型 curModelData.modelTypeId','单选 string','是','新增2','2、3','类型切换时仅提交适用字段'),f('物理库类型 pdmDbType','单选','物理模型必填','','','候选由组件定义，不能把连接数据库地址作类型值'),
  f('画布表上限 tabNumLimit','候选单选','是','getTabNumLimits.defaultTabNumLimit','','候选tabNumLimitList；不是数据表行数配额'),
  f('复制名称 copyModelData.modelName','文本','是','null','100字符','trim；copyModelData.id为来源版本id'),
  f('对比 multipleSelection','行多选','发起对比时恰好2项','[]','2项','先选为基准，后选为比较对象；可交换方向'),
];
const propertyFields=[
  f('模型属性 modelCategoryId','单选 string','是','1','1、2、3','普通模型、数仓模型、指标模型；分类切换清理校验并重新校验适用规则'),
  f('名称 configName','文本','是','','100字符','trim后非空','请输入属性配置名称'),
  f('表名前缀 allTabPrefixAbbr','文本','数仓/指标必填','','100字符','普通模型可不填；不自行改写大小写','数仓、指标模型表名前缀为必填项，请输入表名前缀'),
  f('表名后缀 curTabSuffixAbbr','文本','否','','100字符','与前缀、分隔符、固定分段联合校验'),
  f('表名分隔符 tabNameSeparator','单选','任一前缀/后缀/固定分段非空时必填','','_','候选仅下划线；空值不得当成下划线默认值'),
  f('表名固定分段 tabNameSegNum','单选 number','否','','2、3、4、5','同时有前缀与后缀且设置分段时必须≥3；两者存在而未设置分段的客户端行为不据此推断服务端规则'),
  f('前置/后置字段 dmsModelColConfigDos','有序行数组','否','[]','','前置staEndFlag=1、后置=2；提交合并两组；编辑追加删除标记行'),
  f('英文名 colName','行内文本','每行必填','空字符串','','change移除中文字符；跨两组trim后重名拒绝并定位，不把仅去中文等同完整SQL标识符验证'),
  f('中文名 colDesc','行内文本','每行必填','','','跨前后两组trim后重名拒绝；检查null，不能在空值上调用trim'),
  f('字段类型 colType','可搜索单选','每行必填','空字符串','','GET getAllJdbcTypeByDbType/03返回，绑定typeName；03仅此配置的候选基准，不表示所有目标库均PostgreSQL'),
  f('长度 colLength','number','包含char及number/decimal/numeric必填','','≥1','包含char匹配不区分大小写；空值统一为空字符串；0不能作为有效长度'),
  f('精度 colPrecision','number','number、decimal、numeric必填','','前置≥0；后置组件min=1','数值单位与目标数据库可用范围按类型契约；不得将两组控件差异隐藏成统一已验证规则'),
  f('默认值 defaultValue','行内文本','否','','','按原值保留，不执行、不拼入SQL；服务端按目标库验证及转义'),
  f('非空 nullable','单选 string','是','0','0、1','0允许为空、1非空；标签与数据库布尔语义转换需契约验证'),
  f('主键 keyFlag','单选 string','是','0','0、1','0否、1是；主键/非空组合由服务端再验证'),
  f('位置 staEndFlag','隐藏 string','是','前置1/后置2','1、2','分组来源，不提供自由录入'),f('排序 colSeq','隐藏序号','是','新行0','','提交按组内当前行数−索引倒序编号；目标持久化后顺序须回读一致'),
  f('删除标记 deleteFlag','隐藏标志','是','新行0','0、1','已有id行本地移除后标1加入deleteColumnList；无id行只移除草稿'),ro('配置 id / 字段行 id','新增不伪造；编辑保留稳定id，不能跨配置引用'),
];
const physicalFields=[
  ro('模型名称 modelName / 模型 modelId / 版本 modelVersionNo','详情versionNo映射modelVersionNo；禁止以名称替代身份'),
  f('物化目标 sourceId','数据源单选','正式物化必填','','','候选findDbList；切换先清schemaName、schemaList，回填sourceKey；空候选须阻断'),ro('数据库类型 sourceKey','取选中连接key，禁用'),
  f('目标数据库 schemaName','可搜索单选','正式物化必填','','','getSchemasByConnId/{sourceId}返回，不能跨来源复用'),
  f('物化方式 mtrlMethod','单选 string','是','','1、2','1全量覆盖、2增量更新；覆盖方式可能破坏现有表，提交前明确影响并确认；具体增量算法由执行合同约束'),
  ro('执行日志 logContent / logTestContent','4秒轮询读取；日志结束不等同执行成功，需明确终态和错误信息'),
];
const PROFILES={
  navigation:{route:'/dms/modelManagement/list',fields:[ro('一级入口','数据开发 → 规范化数据建模'),ro('模型管理分组','模型设计、模型物化、模型分析、模型数据统计'),ro('系统配置分组','开发环境配置、模型属性配置'),ro('模型/版本上下文 modelId / id / versionNo','进入各目标分别携带所需稳定标识，不以菜单文字当授权或实体ID')],purpose:'让建模、物化、分析、统计与配置按业务对象进入独立页面，保持模型定义、版本和物理执行结果的区别。',
    interactions:[['六个叶子菜单','具有相应资源权限','进入对应相对路由并加载独立上下文','每页独立加载/错误状态','路由失败保留当前位置，不回退到错误模块'],['模型设计→模型→版本','具有对象读取权限','模型id与版本id按目标传递','不因导航发写请求','后退恢复来源筛选和页码'],['统计入口','具备统计读取权限','显示两统计页签','数据失败不以0冒充统计','可重试单块数据']],
    flow:['从模块入口进入模型设计；系统读取当前登录上下文并加载授权模型，不新增固定部门/租户表单字段。','选择模型物化、分析、统计或两类配置，分别按本文件范围表进入；直接URL也执行同样权限校验。','在模型记录和版本之间跳转时分别使用modelId和id；无对象、对象已删除或失权须给出返回入口。','导航不创建模型或物化任务；离开有修改的表单或画布前提供继续编辑/放弃离开，确认放弃才清理草稿。'],
    layout:'顶部为平台公共导航，左侧模块菜单含模型管理/系统配置两分组，右侧为当前页标题和独立内容。选中叶子有蓝色高亮；统计使用独立页签与卡片，不能套列表表单。',
    api:[['模型入口读取','POST','/dmsModel/findPage','进入模型设计','筛选及pageRequest','读取datas/total']]
  },
  model:{route:'/dms/modelManagement/list',fields:modelFields,purpose:'按名称、创建人、时间、类型和锁定状态找到模型，维护模型基本定义并进入设计、版本和对比流程。',
    interactions:[['名称/创建人/时间','可选条件','输入更新筛选草稿；清空时间同步清两端','查询前检查时间起止','失败保留草稿'],['查询/Enter','条件合法','统一查询入口，从第1页读取','加载态；最新条件响应才能落屏','失败与空数组分别展示'],['重置','列表可用','恢复初始筛选并回第1页查询','不能把lockFlag=0误作未选','不修改模型'],['展开/收起','筛选区','显示模型类型和状态等扩展条件','收起不悄悄改变已提交条件','条件继续可追溯'],['分页/页大小','存在查询上下文','按有效页读取；变更大小回第1页','总数变化修正越界页','失败不将旧结果充当新结果'],['新增/修改/取消','具备对应权限','新增初始化；编辑深拷贝原记录，锁定字段按状态禁用','全表单校验后共享提交锁','成功回读列表；取消丢弃此弹窗草稿'],['模型名称/设计/查看','具备对象动作权限','设计携modelId/tabConfigId进入画布；只读查看携版本id及opt=view','只读禁写','画布完整交付按第7节边界'],['锁定/解锁/删除','具备动作权限且对象状态允许','确认后调用对应写接口；删除使用modelId','请求中禁止重复确认','结果未知先查模型及版本，禁止盲重试'],['复制/版本/对比','有对象权限；对比恰好2项','复制新名称；版本列表读modelId；两模型可交换基准','两模型对比analysisType=2；版本对比为0','创建任务只表示已受理，分析结果另读'],['定时监控配置','timeConfig权限及通知对象权限','读监控配置与用户候选，再编辑时间、频率和通知','未确认保存前只改草稿','通知属于外部影响动作，保存/发送另行验收']],
    flow:['进入页面→POST查询→datas/total回读；筛选字符串trim，时间映射和0值按字段表处理；迟到响应不得覆盖新条件。','打开新增/编辑→加载分类配置和表上限候选→校验→POST新增或PUT当前版本id；成功提示关闭后重读列表。候选失败阻断相关字段提交，保留其他草稿。','锁定/解锁经确认更新版本id；整体删除经确认调用deleteByModelId/{modelId}。服务端必须再验证状态、引用及授权，不能只看按钮。','进入版本列表→以modelId读取历史→查看版本、设主版本或删除历史版本；历史删除路径使用id，不能调用整体删除替代。','选择两个模型/版本→明确基准及目标→确认创建分析任务→后续到分析列表读取任务，不把提交成功当对比完成。','模型名称唯一性作用域、版本生成、锁冲突和引用删除需按服务契约实现；重复、冲突、5xx、断网、超时均保留可恢复上下文，有副作用的未知结果先核查再重试。'],
    layout:'右侧标题“模型管理”，首行由左至右模型名称、创建人、日期范围，右侧查询、重置、展开。下方表头依次序号、模型名称、模型属性、模型类型、实体/表、创建时间、创建人、状态、版本、操作；分页在底部右侧。维护弹窗按模型属性、属性配置、名称、类型及条件库类型/画布上限排序；条件项不占空白行。',
    api:[['模型列表','POST','/dmsModel/findPage','进入/查询/分页','modelName、createUsername、beginCreateTime、endCreateTime、modelTypeId、lockFlag、pageRequest','datas、total'],['分类配置候选','POST','/dmsModelTabConfig/list','初始化三分类','modelCategoryId=1/2/3','配置数组，id/configName'],['画布上限候选','POST','/dmsModel/getTabNumLimits','初始化','无显式body','tabNumLimitList/defaultTabNumLimit'],['模型详情','GET','/dmsModel/findModelDetailByModelId/{modelId}','详情/物化准备','path modelId','模型定义及versionNo'],['新增模型','POST','/dmsModel/add','确认维护','curModelData','完成后回读'],['修改模型','PUT','/dmsModel/modify/{id}','确认修改','path版本id+curModelData','完成后回读'],['整体删除','DELETE','/dmsModel/deleteByModelId/{modelId}','确认删除','path modelId','重新查列表与引用结果'],['锁定/解锁','PUT','/dmsModel/locking/{id}；/dmsModel/unlocking/{id}','确认动作','版本id','刷新状态'],['复制','POST','/dmsModel/copy/{id}','名称合法后确认','copyModelData.id/modelName','读取新对象'],['模型版本','POST','/dmsModel/findModelHistory','进入版本/候选','modelId、pageRequest','datas/total'],['设主版本/删除历史版本','PUT / DELETE','/dmsModel/setMainVersionById/{id}；/dmsModel/delete/{id}','确认动作','版本记录id','回读版本列表'],['创建模型/版本对比','POST','/dmsCompareTask/add','确认基准和对象','analysisType=2或0、baseModelId、baseModelVersion、analysisObjectId、analysisVersion','任务受理后转分析列表']]
  },
  environment:{route:'/dms/configure/devEnvironment/list',fields:[f('开发环境数据源 connId','可搜索单选 ID','是','新增空字符串','','findDbList返回id/name；切换清dataSourceSchema','请选择开发环境数据源'),f('开发环境数据库 dataSourceSchema','可搜索单选 string','是','','','候选按connId获取；禁止空候选或跨数据源旧值','请选择开发环境数据库'),ro('配置 id','findOne已有记录才作为PUT路径；不是connId')],purpose:'选择用于开发测试的连接及数据库，保存独立开发环境配置，避免把测试环境配置误认为生产物化授权。',
    interactions:[['页面初始化','可读配置','读取findOne和数据源；有记录设置edit并按connId读schema','加载期间不判新增','读取失败禁止误走POST'],['数据源改变','新connId来自有效候选','先将dataSourceSchema=null、schemaList=[]，再读schema','忙碌/失败可重试；旧响应失效','保留已选数据源'],['数据库选择','schema属于当前connId','选择候选原字符串','失败与无候选分别反馈','不接受手填越权schema'],['保存','两必填合法且具备配置修改权限','弹确认；确认后新增POST或修改PUT','统一请求锁，成功/失败恢复按钮','成功回读findOne；取消确认保留草稿'],['帮助/离开','表单可操作','帮助说明测试环境用途；无返回按钮，使用菜单/后退离开','有修改时确认放弃','离开不暗中保存']],
    flow:['进入→读取findOne及findDbList；findOne明确无记录才允许新增，返回已有配置则保留id并载入schema。','改变connId→清空旧schema→加载新候选→选择dataSourceSchema；请求失败可重试且不会复活旧值。','校验→人工确认→锁定→POST或PUT；失败保留草稿，成功回读配置核对connId/schema。','超时/断网后先GET findOne核对是否已处理，再允许重试；不重复新增。依赖失效、无权限、版本冲突由服务端拒绝并给出恢复路径。'],layout:'右侧标题与卡片内小标题均为开发环境配置，标题旁帮助图标。两个带必填标记的下拉同一行，左为数据源、右为数据库；保存位于页面底部右侧。窄屏改为纵向排列，底栏不遮挡最后字段。',
    api:[['当前配置','GET','/mtrltestdatasource/findOne','进入/提交后回读','无显式body','已有对象含id/connId/dataSourceSchema；无记录语义需契约'],['连接候选','POST','/mtrltestdatasource/findDbList','初始化','无显式body','数组id/name'],['数据库候选','POST','/mtrltestdatasource/getSchemasByConnId/{connId}','初始化或换连接','path connId','schema字符串数组'],['新增/修改开发环境','POST / PUT','/mtrltestdatasource；/mtrltestdatasource/{id}','保存确认后','audaqueFormInfoMixin，包含connId/dataSourceSchema；编辑保留id','resolve提示，随后回读findOne']]
  },
  properties:{route:'/dms/configure/modelPro/list',fields:[f('模型属性筛选 modelCategoryId','单选 string','否','','1、2、3','普通模型、数仓模型、指标模型'),f('名称筛选 configName','可清空文本','否','','','trim；查询从第一页'),...pages,ro('模型属性 modelCategoryId'),ro('名称 configName'),ro('表名前缀 allTabPrefixAbbr'),ro('表名后缀 curTabSuffixAbbr'),ro('表名分隔符 tabNameSeparator'),ro('表名固定分段 tabNameSegNum'),ro('前置字段 preFieldsCount / 后置字段 endFieldsCount','服务返回数量；不能将样本数量写成固定值'),ro('配置 id','详情/修改/删除路径身份')],purpose:'查找并维护模型命名和前后置公共字段配置，区分属性配置定义、使用该配置的模型及目标数据库对象。',
    interactions:[['筛选/查询/重置/分页','具有列表读取权','按分类和名称查询；重置恢复初始条件；页大小变化回第1页','空数据、失败、无权分别反馈','保留已提交上下文'],['新增','create权限','打开新增建模属性弹窗','仅本地草稿','规则见新增属性规格'],['配置','update权限及当前行id','GET配置详情，拆前后置字段，再打开编辑弹窗','详情失败不打开空编辑','保留id，取消不写服务'],['删除','delete权限及对象可删除','确认后DELETE配置id','防重复；服务端核引用和内置保护','失败不提前移除；未知结果先查'],['编辑确认/关闭','字段及组合合法','保存配置与子字段为同一事务目标','保存期间禁止重复操作','成功刷新列表与详情；关闭丢草稿']],
    flow:['进入列表→POST page→显示配置及前后置字段数；配置名称不是modelId，字段数量不等同模型实际表字段总数。','新增按下一项完整表单规则；配置编辑先GET/{id}，按staEndFlag=1/2拆组，初始化deleteColumnList=[]。','编辑删除已有字段只打草稿删除标记；最终PUT合并活动行及待删行，服务端原子提交并验证引用。','配置DELETE需确认及服务端引用保护；删除配置不自动删除模型、物理表或历史版本。取消、超时和失败均保持一致恢复。'],layout:'标题下方筛选条：左模型属性、名称，右查询、重置。列表卡片右上新增，表头依次序号、模型属性、名称、前缀、后缀、分隔符、固定分段、前置字段、后置字段、操作；行末配置/删除，分页底部右侧。空字符串占位“未设置”与有效0数值区分。',
    api:[['属性列表','POST','/dmsModelTabConfig/page','查询/分页','modelCategoryId、configName、pageRequest','datas/total'],['属性详情','GET','/dmsModelTabConfig/{id}','配置编辑前','path 配置id','对象含dmsModelColConfigDos'],['属性修改','PUT','/dmsModelTabConfig/{id}','编辑确认','configureData+活动和删除标记子字段','回读列表和详情'],['属性删除','DELETE','/dmsModelTabConfig/{id}','人工确认','path 配置id','回读列表；引用失败保持原记录']]
  },
  propertyForm:{route:'/dms/configure/modelPro/list',fields:propertyFields,purpose:'以明确的命名组合及有序公共字段创建建模属性，保证前置和后置两组字段均完整校验后一次保存。',
    interactions:[['模型属性/名称/前后缀','弹窗已打开','分类决定前缀必填；名称trim，前后缀保留大小写','字段/组合错误定位','切分类重新校验'],['分隔符/分段','有命名组合','分隔符候选_；分段2、3、4、5','同时有前后缀时已选分段<3拒绝','清空联动重验'],['前置/后置新增','对应表可编辑','各新增一行，staEndFlag分别1/2','仅本地增行，不调写接口','初始英文名/类型空，nullable/keyFlag/deleteFlag为0'],['点击行/改字段','行可编辑','切为当前编辑行；名称重名即时反馈，保存再次完整核验','char长度、数值精度逐行定位','后置数组必须单独执行同等校验'],['拖拽/上移/下移','行存在且非首/末边界','只在当前组调整顺序；提交重算colSeq','提供键盘等效排序','回读顺序应保持，不能跨组串行'],['删除行','当前行可修改','无id行直接移除；有id行记deleteFlag=1','草稿级删除，无单行DELETE','取消不提交删除标记'],['确定','全部命名及两组字段通过','合并dmsModelColConfigDos后POST add；编辑PUT id','共享提交锁及finally恢复','成功关闭并刷新；未知结果先查询'],['取消/关闭/遮罩/Escape/离页','存在修改','统一未保存确认；确认放弃清草稿及deleteColumnList','焦点返回触发点','不发送未确认保存']],
    flow:['打开新增→modelCategoryId=1，两组空数组，清空deleteColumnList及旧校验；禁止编辑删除残留带入下一次新增。','填写六个基本字段→按普通/数仓/指标及前后缀组合校验；空白属性不按样本值填默认。','新增前/后置行→输入英文名、中文名、类型、长度、精度、默认值、非空和主键→两组分别检查必填和类型边界，跨组检查英文/中文重名。','按组当前顺序生成colSeq；合并活动字段和编辑删除标记→校验全表单→单次POST/PUT。服务端必须再次检验类型、长度/精度、命名唯一及引用保护。','保存成功→回读属性列表与详情核对计数、前后组、顺序和默认值；失败保留可修正草稿，未知结果先核对是否已建记录。','关闭取消→放弃确认后丢弃本弹窗修改并清理拖拽实例；整个流程不创建实体表或触发物化。'],layout:'背景为属性配置列表，中央白色模态标题“新增建模属性”，右上关闭。六个基本字段纵向排列：模型属性、名称、表名前缀、表名后缀、分隔符、固定分段；下面前置、后置字段各有新增与可编辑表，字段列按英文名、中文名、字段类型、长度、精度、默认值、非空、主键、操作排列。内容区滚动，底部取消/确定右对齐固定可达；950px为组件参考宽度，窄屏按视口收缩，表格可横滚。',
    api:[['字段类型候选','GET','/dmsModel/getAllJdbcTypeByDbType/03','初始化','path dbType=03','候选typeName'],['新增属性','POST','/dmsModelTabConfig/add','确定且校验通过','configureData及有序dmsModelColConfigDos','成功后回读列表/详情'],['编辑读取/写入','GET / PUT','/dmsModelTabConfig/{id}','配置编辑分支','GET path id；PUT configureData与deleteColumnList合并','必须核对当前配置及子字段归属']]
  },
};
PROFILES.materialization={route:'/dms/materialization/list',fields:[
  f('模型名称 modelName','可清空文本','否','','','trim'),f('操作人 latestMtrlUsername','可清空文本','否','','','请求绑定Username；列表展示latestMtrlUserName大小写不同'),
  f('物化时间 curCreateTime','datetimerange','否','','','映射beginLatestMtrlTime/endLatestMtrlTime；格式yyyy-MM-ddTHH:mm:ss，默认时分秒00:00:00/23:59:59；清空两端null'),
  f('类型 modelTypeId','请求隐藏number','是','2','','列表初始化为2；不能据名称自行改为3'),...pages,
  ro('模型名称 modelName'),ro('模型属性 modelCategoryId'),ro('模型类型 modelTypeId'),ro('版本 versionNo'),ro('状态 lockFlag'),ro('最近物化时间 latestMtrlTime'),ro('最近操作人 latestMtrlUserName'),ro('物化次数 mtrlNum'),ro('模型 modelId / 历史记录 id','模型列表进历史用modelId，再次物化历史用id/type=2'),...physicalFields,
],purpose:'查询模型物化历史及目标数据库执行记录，区分模型定义、执行受理、执行终态和实际物理结构。',
interactions:[['筛选/查询/重置/分页','可读取物化结果','模型/操作人trim，时间映射最近物化时间','列表失败保持条件','正常空结果与未加载不同'],['查看物化历史','history权限及modelId','进入/materialization/historyList?modelId={modelId}','按操作人、时间再查询历史','返回恢复物化列表'],['历史查看/导出脚本/对比','具有对应对象及下载权限','查看进入tableQuery；脚本以历史id下载blob；对比确认后analysisType=3、mdMtrlId=id','下载错误不保存为正常脚本','对比受理不是执行成功'],['再次物化','历史sourceId存在且有执行权','进入/modelManagement/design/physics?id={id}&type=2','表单按历史分支禁用，不从名称推断参数','实际执行前确认当前环境与风险'],['目标库/schema/方式','执行表单准备完毕','sourceId变化清空schema并回填sourceKey；校验三项','候选慢响应不复用旧schema','失败阻断执行'],['测试运行','具有测试执行权限','校验方式后打开测试日志；开始运行会调用mdMtrl','测试请求不带sourceId/schemaName，使用开发环境依赖','测试也可能写库，需独立授权'],['正式物化','有执行权、目标及方式合法','确认→isInstanceEnd检查→mdMtrl→每4秒轮询状态和日志','实例检查不替代服务端原子互斥','结束需检查终态与物理结构，不能仅看提示'],['离开/重入/下载DDL','当前任务或草稿存在','离开清前端定时器；不等于取消后台任务；DDL下载只生成文件','重入先读任务状态','未知结果禁止直接再次发起']],
flow:['进入物化列表→POST findMtrlModelPage→读取datas/total；历史正文加载失败应呈错误态，不把白屏当正常列表。','选模型→POST历史page附modelId→查看表数据、下载历史DDL或进入再次物化。行modelId与历史id分别使用。','物化表单从模型详情或历史读取，正式提交携modelId、modelVersionNo、sourceId、modelName、mtrlMethod、schemaName；测试提交仅modelId、modelVersionNo、modelName、mtrlMethod。','人工确认→检查是否可运行→服务端原子受理一次执行→轮询状态/日志；客户端4秒轮询只能作为观察周期，不保证任务4秒内完成。','实例结束后读取明确成功/失败终态及日志，核查目标库/schema/表结构和记录；覆盖模式需事前差异和恢复策略，禁止把HTTP成功或isInstanceEnd=true判为物化成功。','超时/断网→保留任务上下文并查询执行状态；若无法证明未受理，不自动重发。换页清轮询，重入恢复观察；前端关闭日志不取消后台执行。'],
layout:'筛选条左为模型名称、操作人、日期范围，右为查询/重置，右侧下方独立列表区。列表目标列按模型名称、属性、类型、版本、锁定状态、最近物化时间、操作人、物化次数及操作排列；历史页另有返回、历史时间/目标库列。执行页为模型/连接/库类型/schema/方式表单及日志区，不套新增普通记录模板。',
api:[['物化模型分页','POST','/dmsMdMtrl/findMtrlModelPage','查询','modelTypeId=2、modelName、latestMtrlUsername、beginLatestMtrlTime/endLatestMtrlTime、pageRequest','datas/total'],['物化历史','POST','/dmsMdMtrl/page','选模型进入','modelId、createUsername、beginCreateTime/endCreateTime、pageRequest','datas/total'],['历史详情','GET','/dmsMdMtrl/{id}','再次物化准备','历史id','modelVersionNo映射versionNo'],['执行状态/发起/日志','POST','/dmsMdMtrl/isInstanceEnd；/dmsMdMtrl/mtrl；/dmsMdMtrl/log','确认后检查/执行/4秒观察','正式或测试参数集见流程','isInstanceEnd真只表示结束/可发起；log数组追加'],['历史脚本','GET','/dmsMdMtrl/ddl/{id}','下载','历史id；responseType=blob、rawData=true','授权文件；校验错误类型'],['生成DDL','POST','/dmsMdMtrl/exportModelDDL','表单校验后下载','正式参数集；responseType=blob、rawData=true','保存文件，不作为已落库'],['表/字段查看','POST','/dmsTable/page；/dmsTabCol/page','历史查看','模型/表上下文及分页，完整DTO按查看页契约','datas/total，不从查询动作推定写入'],['库候选','POST','/mtrltestdatasource/findDbList；/mtrltestdatasource/getSchemasByConnId/{connId}','准备/切换目标','选中connId','候选列表，不表示执行授权'],['落地对比','POST','/dmsCompareTask/add','历史行确认','analysisType=3、mdMtrlId=历史id','仅任务受理']]
};
PROFILES.analysis={route:'/dms/modelAnalysis/list',fields:[
  f('页签 analysisType','number','是','5','5、2、0、3、6','依次模型标准分析、模型对比分析、模型版本比对、模型落地分析、自定义对比分析'),
  f('任务名称 taskName','可清空文本','否','空字符串','','trim'),f('创建人 createUsername','可清空文本','否','空字符串','','trim'),...pages,
  ro('序号'),ro('分析类型 analysisType'),ro('任务名称 taskName'),ro('创建时间 createTime'),ro('创建人 createUsername'),ro('状态 taskStatus','0未执行、1执行中、2成功、3失败；不能与lockFlag混用'),ro('任务号 taskNo','查看/下载/删除使用任务号，不能用模型id'),
  f('自定义任务名 addData.taskName','文本','是','空字符串','200字符','trim后非空','请输入任务名称'),
  f('源/目标选择 srcCompareType / trgCompareType','单选number','是','0','0、1','0模型选择、1数据源选择；只提交当前分支'),
  f('模型类型 modelTypeId','单选number','模型分支必填','2','2、3','切换后清两边模型ID/名称/版本候选'),
  f('源/目标模型 srcModelId / trgModelId','单选 ID','各自模型分支必填','空字符串','','findPage候选绑定modelId；显示modelName；不把候选中100000条当容量承诺'),
  f('源/目标版本 srcModelVersionNo / trgModelVersionNo','单选','各自模型分支必填','空字符串','','modelId改变先清版本，再按该modelId读取findModelHistory；20000是候选请求上限样本'),
  f('源/目标模型名 srcModelName / trgModelName','隐藏string','','空字符串','','从选中模型带出，不作为授权依据'),
  f('源/目标连接 srcDataSourceId / trgDataSourceId','单选 ID','各自数据源分支必填','空字符串','','findDbList；连接变化清对应schema'),f('源/目标schema srcSchema / trgSchema','单选','各自数据源分支必填','空字符串','','getSchemasByConnId按来源加载'),
],purpose:'按五类分析查看任务和结果，只有自定义页签提供自定义任务创建；任务受理、执行成功和业务一致率分别核验。',
interactions:[['五页签','有读取权','analysisType按5/2/0/3/6映射，先清结果再查询','目标切换回第1页，迟到旧页签结果失效','保留各页签条件或明确重置策略'],['查询/重置/分页','当前页签有效','查询从第一页；重置清任务名/创建人，保留analysisType','无数据提示/失败重试','不创建任务'],['查看/下载','taskStatus为2且有结果/下载权','5进入modelStdAnalysisList，其余进入modelVersionAnalysisList；附taskNo/title','下载blob与错误响应分开','查看只读，不自动合并结果'],['删除任务','具备delete权限且可删除','确认后按taskNo删除','不得删模型或物理表','未知结果先查任务'],['自定义新增','analysisType=6且有addCompareTask权限','打开条件表单','其他页签无相同新增入口','关闭不创建任务'],['源/目标类型、模型、连接变化','自定义表单','清本分支失效值；模型/版本/连接/schema联动','候选失败可重试，旧响应不覆盖','源与目标各自独立'],['确定创建','当前条件都有效','POST addCustomCompareTask(addData)','防重复，成功关弹窗后刷新','失败留草稿；任务受理与结果分开']],
flow:['进入默认标准分析analysisType=5→查询任务datas/total；切页签改变analysisType并清旧结果，保留当前页签语义。','成功任务才能查看/下载；taskStatus=0/1显示未执行/执行中，3显示失败原因或可追踪错误，不给成功结果链接。','自定义页签新增→选任务名→分别选源、目标模型/版本或连接/schema；切换上级清失效下级，模型/数据源权限逐项校验。','确认→POST addCustomCompareTask→回读任务；超时先查询任务是否受理，不无条件重复创建。','分析详情中的主题域、实体、字段、索引、约束差异按服务契约查看；合并主题域/表为独立写动作，未经明确授权不执行；算法分母、空集合和同一版本重复对比不能由前端推断。'],
layout:'右侧顶部横排五页签，标准分析默认高亮；下方任务名、创建人筛选，右侧查询/重置。表头依次序号、分析类型、任务名称、创建时间、创建人、状态、操作，底部按数据总数分页。自定义页签右上新增，条件模态先任务名，再比对源及目标两组条件，按模型/数据源类型显示相应字段，底部取消/确定。',
api:[['分析任务','POST','/dmsCompareTask/page','查询/切页签','analysisType、taskName、createUsername、pageRequest','datas/total；taskStatus/taskNo'],['自定义任务','POST','/dmsCompareTask/addCustomCompareTask','确认创建','addData字段，条件分支见表','受理后回读任务'],['删除/报告','DELETE / GET','/dmsCompareTask/{taskNo}；/dmsCompareTask/exportReport/{taskNo}','确认删除/授权下载','taskNo；报告blob/rawData=true','回读列表/保存合法文件'],['比较统计/差异','GET / POST','/dmsCompareTask/statistics/{taskNo}；/dmsCompareTask/listPageDomain；/dmsCompareTask/listPageEntity；/dmsCompareTask/listPageFields；/dmsCompareTask/listPageIdx；/dmsCompareTask/listPageFk','进入结果详情','任务号和分页；各详情DTO受第7节交付限制','统计对象及datas/total；算法不得猜测'],['候选：模型/版本','POST','/dmsModel/findPage；/dmsModel/findModelHistory','选择模型与版本','modelTypeId或modelId+pageRequest','datas；版本必须属于选中模型'],['候选：连接/schema','POST','/mtrltestdatasource/findDbList；/mtrltestdatasource/getSchemasByConnId/{connId}','选择数据源','path connId','连接数组/schema数组']]
};
PROFILES.statistics={route:'/dms/statistics/list',fields:[
  ro('统计页签','模型数据统计 / 标准使用统计'),
  ...['概念/逻辑模型 modelNum','概念/逻辑模型表 tableNum','概念/逻辑模型字段 columnNum','物理模型 countPhysicsModel','物理模型表 countPhysicsModelTab','物理模型字段 countPhysicsModelCol'].map(x=>ro(x,'findDataSummary返回，不取样本计数为默认')),
  ro('属性图 modelCategory / modelNum'),ro('主题域图 modelType / topicDmNum'),ro('物化统计 modelName / mtrlNum'),
  ...['标准主题域 countStandardModel','标准表 countStandardTab','标准字段 countStandardCol','标准代码 countStandardCode'].map(x=>ro(x,'findStandardSummary返回')),
  ro('统计截止 staticDateStr','只读时间；失败不能用当前时间替换'),
  f('标准引用类型 queryParams.stdType','单选string','是','1','1、2、3','标准表/标准字段/标准代码；change仅更新趋势'),
  f('引用趋势 curCreateTime','日期范围','是','含当日在内最近30天','组件选首日后±30天限制','beginCreateTime/endCreateTime为Date；JSON转换需明确时区，不用列表日期字符串规则替换'),
  ro('趋势 refDate / refTimes','按天对齐，成功响应内缺日可补0；全请求失败不能补0'),ro('标准表TOP totalRefTime / tabDesc'),ro('标准字段TOP totalRefTime / colDesc / colName'),ro('代码TOP refTimes / cnName','展示字段与累计引用/代码值标签需契约校准，不把所有TOP排序都改成同一字段'),
],purpose:'按模型、物理模型、分类及标准引用展示统计，给出数据口径和截止时间，避免把加载失败渲染为业务零值。',
interactions:[['模型/标准页签','统计可读','切换对应组件和请求','各统计块独立加载/失败/重试','卸载释放图表和监听'],['卡片、环图、物化趋势','统计返回有效','展示数值、图例及悬浮解释','无样本与请求失败分开','不提供普通新增/编辑/删除'],['引用类型/日期','标准页签趋势条件有效','只重新请求趋势，不覆盖TOP列表','日期清空应安全恢复或提示必填','迟到旧趋势失效'],['TOP排序/溢出','返回TOP数组','表/字段按totalRefTime降序，代码按refTimes降序；长文本可查看全文','同分排序由服务契约固定','无分页/导出入口不添加通用按钮'],['窗口resize/重入','图表已初始化','同一个监听回调resize，销毁dispose','不递归新增监听','重复进入无资源累积']],
flow:['进入模型统计→并行读取四个汇总端点→显示六卡片、模型属性/主题域图和物化趋势；每块数据失败单独提示，不能用初始化0冒充成功。','进入标准使用统计→读汇总、趋势和三TOP；显示统计截止；趋势初始化含当日在内30天。','换类型或日期→更新queryParams→取趋势→按日期refDate对齐；只有成功集合中的缺日补0，不对失败集合造完整零序列。','TOP响应分别排序展示；前端不自行扩大成全量查询。统计去重、版本、删除/锁定、物化失败是否计入及标准引用口径按服务端定义，缺口见交付边界。','离开页签释放图表及resize监听；重入重新取授权范围数据。统计页面为只读聚合，新增/编辑/取消保存类流程不适用。'],
layout:'顶部为模型数据统计/标准使用统计页签；模型页上方概念/逻辑模型三卡、下方物理模型三卡，再为模型属性、主题域两个图表并排及更下部物化统计。标准页先四卡和截止时间，再趋势类型/日期及趋势图，下方三TOP表。内容区纵向滚动；缩窄时卡片重排，图表附文字/表格替代。',
api:[...['findDataSummary','findModeAttributeSummary','findModeTopicSummary','findMtrlSummary'].map(x=>['模型统计','POST','/dmsModelDataStatistics/'+x,'进入模型统计','无显式body',x==='findDataSummary'?'六指标对象':'图表数组']),...['findStandardSummary','findStandardTrend','findStandardTableTop','findStandardColTop','findStandardCodeTop'].map(x=>['标准使用','POST','/dmsStandardStatistics/'+x,'进入标准统计；趋势条件改变',x==='findStandardTrend'?'stdType、beginCreateTime、endCreateTime':'无显式body',x==='findStandardSummary'?'四指标与staticDateStr':'趋势或TOP数组'])]
};

const commonProtocol=[
  '接口表相对路径完整前缀为`/back/dms/model`。模块读取MODULE_URL_PREFIX.dmsModel，未覆盖时服务前缀/dms/model；父应用API_BASE_URL叠加/back。环境覆盖必须由受控配置交付，不能据路径猜出新网关。静态调用契约见[证据索引](../evidence/dms-review-20261027/README.md)，真实DTO、状态与运行前缀的交付限制见[核查记录](./核查记录.md)。',
  '普通POST/PUT由公共客户端按application/json序列化；GET参数按客户端位置传递，path值必须来自授权对象并安全编码。文件下载显式responseType=blob、rawData=true；导入为FormData而包装器声明application/x-www-form-urlencoded，两者必须通过隔离联调校准，不允许AI自行选择上传协议。不能额外添加租户、部门或幂等请求头。',
  '当前调用端通常以Promise resolve推进界面；公共HTTP 202按业务错误进入reject，其他被Axios接受的正常状态读取data，没有统一code=0成功判断。1002会话失效、1003无权限、1109修改密码、1012刷新等走公共处理，局部catch恢复页面。完整响应body及错误映射由后端契约固定，不虚构返回ID、成功码或事务保证。',
  '公共超时先取路径规则非负值，再取number请求timeout，最后才回退20000ms；0可能代表无限等待，所以交付要求显式有限超时并验证真实生效值。有限超时、业务处理时限和后台任务结束时间分别定义；查询可重试，有副作用的未知结果先核查。',
];
const checks={
  navigation:['按六叶子导航检查相对路由和选中态，返回模型列表时筛选及页码恢复。','模型id、版本id、任务号和配置id分别传递；无对象或失权时显示返回与可恢复提示。','让统计单块失败，核对其他块可用且失败块不显示0或假截止时间。','在有修改的画布/配置离开时选择继续编辑和放弃，核对草稿去留，不发隐式保存。','用两套授权范围直接访问页面及对象ID，服务端均限制可读/动作范围。'],
  model:['输入模型名、创建人和时间，展开选类型/lockFlag=0；查询及重置后核对参数、页码、列和总数。','创建专用测试模型并回读，编辑按版本id保存，锁定后受限字段禁写；取消不改变记录。','分别按modelId整体删除与按id删除历史；核对引用拒绝、历史留存和物理表不被误删。','交错查询、保存超时、重复点击和冲突，核对最新结果与单次业务效果；未知结果先回读。','选择2模型/版本交换基准后创建任务，核对analysisType及版本参数，任务受理与成功结果分别检查。'],
  materialization:['进入物化及历史页，核对modelId、历史id、时间参数和最近操作人字段；加载失败不得当正常空结果。','在专用数据库以已批准方式运行正式/测试物化，核对两种参数集、真实终态、日志及物理结构。','设置覆盖风险、失效schema和无权目标，核对确认、权限/引用保护与恢复方案。','模拟执行请求超时及轮询失败，核对先查状态、不重复执行、按钮及重入观察恢复。','查看历史、下载DDL并离开日志页，核对下载错误与正常文件分开、前端轮询清理且不声称后台已取消。'],
  analysis:['轮换五页签核对analysisType=5/2/0/3/6，任务状态0/1/2/3与操作可见性正确。','在自定义页签配置模型/数据源两分支，切换模型、类型、连接后旧版本/schema失效，再创建并回读任务。','用成功任务查看/下载，核对taskNo及标准分析/其他分析详情路由，失败报告不当正常文件保存。','交错页签请求、创建超时及重复点击，核对先查受理结果、无重复任务及错误恢复。','删除专用任务并回读；无权直接任务访问/下载被拒绝，删除不删除模型或物理表。'],
  statistics:['进入两统计页签，核对六模型指标、四标准指标、图例及服务端截止时间。','以已知数据集验算分类、物化和标准引用口径，核对去重、版本、删除及任务终态分母。','设置类型及合法日期范围，核对Date序列化、跨日时区、缺日补0及三TOP排序字段。','让汇总/趋势/TOP分别超时或返回异常，核对独立错误、可重试及不造零值。','重复切页签20次并resize，核对无递增监听、图表dispose与键盘/文字替代结果可达。'],
  environment:['进入配置页分别处理明确无记录和已有记录，核对connId/schema及POST/PUT分支。','切换数据源并选择新schema，确认保存后GET回读，核对未复用旧schema。','必填为空、候选失败、失效连接及无权限时禁止提交并定位字段。','模拟保存超时和重复点击，核对先GET核查、没有重复新增或误覆盖。','取消确认及离页继续编辑/放弃后核对草稿和记录，保存按钮恢复且不触发物化。'],
  properties:['按分类和名称查询、重置及分页，核对属性列、前后字段数量和0值显示。','配置编辑先读详情，再修改命名和前后字段、排序及删除已有子行，保存后回读配置和子行。','有引用/内置保护、越权及版本冲突时拒绝删除或更新并保留记录。','模拟GET详情失败、PUT超时及重复点击，核对空表单不覆盖原配置，未知结果先查。','取消编辑后重新新增，核对deleteColumnList为空且原配置、模型及物理库均未改变。'],
  propertyForm:['打开新增核对默认普通模型、六基本字段、前后置表及三个下拉候选；取消再开恢复独立草稿。','分别新建普通/数仓/指标属性，填写两组字段、排序并保存回读，核对staEndFlag、colSeq和数量。','测试100字符/101字符、前后缀组合、分段2/3、重复英文/中文、后置必填及char/数值长度精度。','编辑删已有子行再取消、新增并超时重试，核对无旧删除标记、单次效果、事务和错误恢复。','测试无权提交及非法配置/字段id、键盘排序与关闭焦点，核对服务端拒绝、草稿和资源释放。'],
};
function shotLink(id){const folder=/^H-/.test(id)?'live-recheck-20261022/':'';return `[${id}截图](../evidence/${folder}${id}.png) / [元素](../evidence/${folder}${id}.json)`;}
function renderFeature(entry){
  const p=PROFILES[entry.kind];if(!p)throw new Error('DMS unregistered profile');
  const lines=[`### ${entry.id} ${entry.title}`,'',`**业务目的**：${p.purpose}`,'',`入口：${p.route}；前置条件：有效会话及当前资源的读取或相应动作权限。业务责任为建模、配置、执行或查看者，实际角色及资源授权由服务端矩阵定义。`,'','**操作与规则**','',...p.flow.map((v,i)=>`${i+1}. ${v}`),'','**结果与异常处理**：初始化、合法空结果、业务失败、无权限、超时与结果未知分别显示；只读结果不改变对象状态，写入及任务必须按回读证据判断结果。','',`**开发处理细则**：${p.interactions.map(r=>r[0]).join('、')}分别使用本项字段和请求映射；服务端契约受第7节交付约束，不把空白属性解释为没有限制或由AI自定。`,'',`<!-- 完整规格:${entry.id} -->`,'',`#### 1. 页面字段清单（${entry.id}）`,'',...table(['字段名称与绑定名','类型/控件','是否必填','默认值','长度/范围/单位','格式及校验规则','错误提示','条件/状态'],p.fields),
    '字段属性空白表示该属性没有足够依据，不能实现为无约束；新增默认仅来自明确初始化，展示样本值不作为默认值。字符串、数字、0、false、null和未传必须保持契约语义，不能统一转成空字符串。','',`#### 2. 页面交互规则（${entry.id}）`,'',...table(['控件/触发','前提及输入','行为与联动','忙碌/禁用/反馈','完成、失败及草稿'],p.interactions),
    `#### 3. 业务流程与异常分支（${entry.id}）`,'',...p.flow.map((v,i)=>`${i+1}. ${v}`),'',
    ...table(['分支','系统处理与用户结果','恢复及数据影响'],[
      ['依赖加载失败/对象失效','候选或详情未成功前禁用依赖提交；明确失败而非无记录','重试当前依赖；使旧回调失效，保留安全草稿'],['输入/服务端业务失败','按字段或对象显示规则错误，保留可修正内容','不把客户端required/maxlength当服务端校验证据'],['无权/会话失效','停止显示受限资料，按公共会话流处理','重新认证后重新验权，不恢复自动提交'],['断网/超时/5xx/解析异常','恢复忙碌状态，查询可人工重试；写入结果未知明确提示','先查对象/任务后决定重试；禁止假定超时即未处理'],['并发/迟到/重复','客户端同一提交锁，服务端核版本/状态和引用','新结果不被旧响应覆盖；冲突展示重新加载/人工合并选择'],['离开/取消','按本项只读或编辑语义恢复来源；有改动统一放弃确认','不暗中提交、执行、上传或取消后台任务'],
    ]),`#### 4. 接口与数据规则（${entry.id}）`,'',...commonProtocol.flatMap(x=>[x,'']),...table(['用途','HTTP方法','相对路径','调用条件','请求体/查询/头','返回读取与页面处理'],p.api.map(r=>[r[0],r[1],r[2].split('；').map(x=>'/back/dms/model'+x).join('；'),...r.slice(3)])),
    '参数类型、默认、来源和转换以第1节逐字段绑定为准；分页pageRequest为嵌套对象，读取datas/total，不添加没有依据的默认排序。记录id、modelId、versionNo、taskNo及配置id按各行说明传递，不能用显示名称或其他ID替换。','',
    ...table(['响应分支','HTTP/业务判断','实际读取字段','页面处理','重试与恢复'],[['普通读取','公共客户端resolve','列表datas/total、详情对象或候选数组；按用途读取','原子更新当前上下文；结构错误按失败','人工重试只读操作'],['普通写入','公共客户端resolve只表明该调用已被接受','没有证实统一返回ID/版本格式','提示后按对象重新读取，后台任务继续观察终态','不无条件再次提交'],['公共业务错误','HTTP 202进入公共错误处理','错误字段由公共客户端/后端契约约束','局部恢复忙碌与草稿，不覆盖公共认证处理','按错误是否可重试决定'],['下载/长任务','blob或独立状态/日志','错误内容、终态、日志分别核验','错误不当文件，结束不等同成功','状态未知先查记录']]),
    `#### 5. 验收标准（${entry.id}）`,'',...table(['验收编号','前提、步骤与可检查结果','关联需求','状态'],checks[entry.kind].map((v,i)=>[`DMS-AC-${entry.start+i}`,v,entry.id,'未执行'])),
    `#### 6. 权限与安全要求（${entry.id}）`,'','服务端对菜单、直接URL、读取、创建、修改、删除、下载和执行分别鉴权，并对模型/版本/配置/连接/schema/任务等对象校验所属资源范围；前端permission只控制可见入口。角色名与租户隔离维度需由实际矩阵交付，不能默认管理员或为表单增设角色/租户。','',
    '模型定义、SQL/DDL、日志、连接候选及报告均按授权访问；TLS、秘密过滤、标识符校验、参数化与审计分开实现。默认值/名称/DDL不得作为可执行脚本直接注入页面；日志不得泄露密码、Token或连接秘密。保存、上传、测试运行、物化、合并、通知和删除均为独立业务动作，需求核对不构成执行授权。','',
    `#### 7. 页面布局与状态（${entry.id}）`,'',p.layout,'',
    '初始加载显示骨架/忙碌；成功才展示结果，空结果显示明确空态，失败显示原因和重试；提示与对应字段关联。提交中保留当前值并锁定统一入口；关闭、Escape、后退与窄屏的可达性按质量要求执行。','',
    `#### 8. 关联文档（${entry.id}）`,'',entry.sources.map(shotLink).join('；')+'。','',
    '[规则依据、差异及外部交付](./核查记录.md) · [专项原文与历史图索引](../evidence/dms-review-20261027/README.md)。截图为登记视口样本，未覆盖区域以组件结构和交付限制说明，不能把一次首屏样本当所有条件画面。','',
    `#### 9. 非功能性需求（${entry.id}）`,'','适用主规格第9节的DMS-NFR质量矩阵：权限/传输/输入与数据一致性适用于全部功能，任务恢复适用于导入/分析/物化，资源与图表回收适用于画布和统计，文件要求仅适用于导入/下载；只读导航不套密码存储或持久化保存用例。各项验收均为未执行。',''];
  return lines.join('\n');
}
const NFR=[
  ['001','服务端权限与隔离','读取、维护、版本、报告、连接候选、schema及执行分别鉴权；直接篡改id/modelId/taskNo不扩大范围；失权后清理受限缓存。','隔离环境配置至少两种相异资源范围及只读/可维护身份，逐接口直接访问、失权/过期/换空间，核对拒绝和日志，不以按钮隐藏判通过。'],
  ['002','传输与秘密边界','生产使用TLS；模型SQL、报告和日志按数据分级保护；不在浏览器长期缓存、错误或审计中保存连接密码/Token。开发环境复用连接id，不新增凭据录入。','受控标记检查请求、日志、报告、浏览器存储和缓存清理，核对HTTPS与混合内容及服务端秘密引用；不采集真实秘密。'],
  ['003','标识符与输入安全','模型/表/列/默认值与DDL按目标库类型校验、转义；默认值及导入内容不得在浏览器执行；日志/名称按文本渲染。','用专用标记覆盖HTML、SQL特殊字符、Unicode、空白和长值，核对拒绝/转义、无脚本执行、数据库对象范围正确；仅测隔离对象。'],
  ['004','版本及配置一致性','配置与前后置字段一次事务提交，失败不留半条；跨两组字段完整校验；删除标记、排序、0值与版本身份保持；并发更新不静默覆盖。','故障注入中途失败和同时更新，以回读及数据库/审计核对事务、归属、顺序和冲突；取消编辑后新增不得带deleteColumnList。'],
  ['005','物理执行保护','物化/测试/导入有明确目标、影响和执行权；覆盖前给差异及恢复策略，测试环境与正式目标分离；后台以稳定执行标识互斥与去重。','专用模型和可恢复数据库验证同模型/版本并发、覆盖审批、无权目标、测试/正式参数和引用；核对真实结构及执行结果，未批准前不执行。'],
  ['006','超时与任务恢复','查询/提交都配置有限超时；超时只进入结果未知，写入/任务先查后重试；轮询失败可恢复，页面离开仅停止前端观察。','记录实际路径超时覆盖值，注入断网、迟到响应及状态/日志失败；1秒内解除本地无效忙碌并提示未知状态；重入不重复发起执行。'],
  ['007','统计准确性','汇总/趋势/TOP明确数据时间、授权范围、单位、去重、版本与删除/失败任务口径；合法0、无数据、部分失败分别表示。','固定数据集含零、重复版本、已删除模型、失败物化、跨日期引用，逐项服务端验算；失败不得生成零趋势，分母为空按契约显示。'],
  ['008','页面与查询性能','在明确环境下，10000模型/配置和100000任务记录、每页20条，冷缓存页面至可操作P95≤3秒；30个并发读取用户下查询P95≤2秒、P99≤5秒，非预期失败率≤1%。','隔离环境列明CPU/内存/浏览器/网关/数据库与索引、网络RTT/带宽和构建；预热5分钟、统计15分钟，每场景≥500样本，用户思考时间2秒。端到端计时，ceil(p×N)分位法，报P50/P95/P99/max、N及失败；不足样本未通过。'],
  ['009','画布与大候选容量','画布表数以getTabNumLimits实际配额为准；编辑交互先给忙碌反馈。100000模型或20000版本候选请求不构成无限容量策略，采用受控分页/搜索并保留已选值。','目标基线200表/每表30字段/400关系的专用模型，客户端Windows 11、8逻辑核/16GB、Edge记录版本，30次打开/拖动/缩放采样；交互反馈P95≤200ms、打开至可编辑P95≤5秒；配额更小时按配额测并报告差异。'],
  ['010','文件安全与完整性','导入类型与扩展名/内容一致；大小上限来自受控uploadFileSize配置，必须交付有效值，不猜通用大小；禁止路径穿越与外部实体/危险公式传播；错误blob不作为DDL/报告交付。','以阈值−1、阈值、阈值+1字节和扩展/内容不符、异常XML/表格标记验证服务端拒绝及临时文件清理；下载校验文件类型/内容和授权，记录FormData实际Content-Type。'],
  ['011','审计与任务可观测','记录主体、时间、授权范围、操作/对象/版本、请求及任务关联、目标引用、结果/耗时；配置变更、物化、覆盖和失败可追踪；日志查阅及留存由平台策略控制。','串联一次专用保存、一次拒绝和一次任务失败；核对浏览器→接口→任务→数据库证据及脱敏、访问权；不假设已经记录某个自造请求头。'],
  ['012','兼容性与适配','支持Windows 10/11上Chrome/Edge当前及前一稳定大版本；1366×768、1500×1000、1920×1080和200%缩放下，字段、底栏及模态操作可达；宽表/画布允许局部横滚。','记录具体版本并覆盖长中文、空/错/慢响应、两统计页签、弹窗下部、日志、字段排序；320 CSS像素下单列表单可纵滚，页面底栏不遮挡最后字段，图表有文字替代。'],
  ['013','可访问性','字段标签/必填/错误关联；键盘操作筛选、弹窗、字段排序、图表替代；焦点可见，弹窗进入/关闭恢复；文本对比度≥4.5:1，控件/焦点≥3:1，不只靠颜色。','自动扫描加Tab/Shift+Tab/Enter/Escape及读屏人工检查；错误定位与忙碌可播报，拖拽提供上移/下移等效操作，不以自动扫描代替全部可访问验收。'],
  ['014','资源与长时稳定性','画布/统计离开销毁图表、拖拽、监听及定时器；每个任务观察最多一个轮询，迟到响应不得写入已销毁组件。','20轮进入/离开各统计页签、属性模态、画布及日志并resize，核对实例/监听/定时器回到基线；连续30分钟观察请求数无增长，记录堆快照趋势及失败证据。'],
  ['015','契约及可维护性','相对接口前缀/错误/超时集中配置；各对象ID不可混用；需求编号和历史证据保留；生成器刷新字节不回流；接口、错误、引用与状态契约变更有回归。','离线测试覆盖字段/ID/接口/条件枚举、生成幂等和丢失来源/编号拒绝反例；隔离联调补齐DTO和任务终态；文档测试不能替代应用验收。'],
];
function section(text,n){const heading=text.match(new RegExp('^## '+n+'\\. [^\\n]*\\n','m'));if(!heading)return '';const tail=text.slice(heading.index+heading[0].length),end=tail.search(/^## /m);return end<0?tail:tail.slice(0,end);}
function acceptanceRows(previous,type){
  const rows=[...previous.matchAll(/^\| (DMS-AC-\d{3}) \|.*$/gm)].map(m=>m[0]);
  const expected=type==='main'?[...Array.from({length:10},(_,i)=>521+i),...Array.from({length:6},(_,i)=>1+i)]:[...Array.from({length:35},(_,i)=>531+i),...Array.from({length:21},(_,i)=>500+i)];
  const got=rows.map(r=>Number(r.split('|')[1].trim().split('-').at(-1)));
  if(JSON.stringify(got)!==JSON.stringify(expected))throw new Error('DMS acceptance missing, duplicated or reordered');
  return rows;
}
const boundaries=[
  ['101','查看模型管理','按版本id进入design/list?opt=view；只读禁写。详情主表/画布子项的完整结构按下方画布交付包，不能据查到入口声称全部完成。'],
  ['102','新增模型管理','新增基本信息在DMS-100/506字段与流程内定义；画布保存、版本生成另需设计契约，不以基本模型新增当完整模型设计成功。'],
  ['103','修改模型管理','PUT modify/{id}修改当前版本记录；锁定禁用及服务端版本/并发保护；画布保存不直接借此接口。'],
  ['104','删除模型管理','整体DELETE deleteByModelId/{modelId}与历史DELETE delete/{id}分开；引用、审计和物理表影响必须有服务端保护。'],
  ['105','查询模型物化','DMS-507定义模型物化/历史两级查询，不另造普通CRUD模型。'],
  ['106','查看模型物化','物化历史id与模型modelId分开；tableQuery和表/字段分页响应仍需完整DTO交付。'],
  ['107','新增模型物化','实际为执行任务，须人工确认及独立授权；isInstanceEnd、mtrl、log不是新增普通记录三按钮。'],
  ['108','修改模型物化','历史不按普通编辑修改；再次物化形成新执行，按原目标/版本及当前权限检验，不能篡改旧执行结果。'],
  ['109','删除模型物化','当前所查历史组件没有独立删除操作；不得推导清理物理表接口。执行记录留存/删除由专门服务契约交付。'],
  ['110','查询系统配置','系统配置拆为DMS-510开发环境单表单和DMS-511属性列表；不得合成同一列表/分页。'],
  ['111','查看系统配置','环境GET findOne和属性GET/{id}分开；读取失败不判无配置。'],
  ['112','新增系统配置','环境POST mtrltestdatasource，属性POST dmsModelTabConfig/add；两者对象及必填规则不同。'],
  ['113','修改系统配置','环境PUT配置id；属性PUT属性id及子字段事务；不得用连接id代替配置id。'],
  ['114','删除系统配置','属性DELETE/{id}需确认及引用保护；开发环境组件没有独立删除入口，不自动补造。'],
];
function extendedRules(){return [
  '### 模型版本、监控与导入参数','',...table(['场景','字段、转换与触发','交付边界'],[
    ['版本与模型对比','findModelHistory使用modelId；设主版本PUT setMainVersionById/{id}；当前版本latestVersionFlag=1，历史0。两项比较analysisType=0，基准baseModelId/baseModelVersion，目标analysisObjectId/analysisVersion。','版本不可变与设置主版本的状态/并发保护由服务端保证；对比选2项，交换方向要同步身份和版本。'],
    ['监控开关/时间','isSwitch初始false→monitorOpenStatus=1/0；daterange必填，拆monitorStartTime/monitorEndTime，value-format=yyyy-MM-dd；monitorFrequencyId初始6，6小时/1天。','开关关闭仍有表单必填校验的实现差异按核查记录处理；时间范围/时区/已有任务处理需调度契约。'],
    ['监控通知','monitorInforUserId多选用户id，提交JSON.stringify([{name,id},…])字符串；monitorInforTypeId初始字符串1，勾选邮件1/0。附modelVersionNo、modelName、modelId；已有id走updateMonitorTask，否则addMonitorTask。','GET /back/dms/model/dmsModel/getMonitorTask/{modelId}及/back/dms/model/user/getUserList读取；POST /back/dms/model/dmsModel/addMonitorTask或updateMonitorTask写入。禁止把监控保存或邮件发送当只读取证。'],
    ['导入表单','type初始cp：Excel .xls/.xlsx；ea：.xml；pd：.pdm；createTabType为字符串1覆盖创建、2全新创建，初始1；hasFile初始null。fileData.raw为选中文件。','路由/modelManagement/design/importTable，模型名只读由modelId详情回填；文件选择本地缓存，确认才提交；未定义的文件配额不得自定。'],
    ['导入请求与日志','FormData附file、type、createTabType；可选projectId/topicDmId/modelId来自路由。POST /back/dms/model/dmsModel/import返回groupInstanceId，GET findProcessLog/{id}和isTaskEnd/{id}每4秒读取。','覆盖与新增的同名表处理、上传头与服务端解析、事务/临时文件及任务错误终态须补齐；缺文件时先阻断，不能先读取fileData.name引发异常。模板GET /back/dms/model/dmsModel/downloadResourceFile按授权blob下载。'],
  ]),
  '### 属性命名、字段排序与草稿生命周期','',
  '名称必填且最多100字符；前/后缀最多100字符，数仓/指标前缀必填。任一前缀、后缀或固定分段有值时分隔符必选_；已同时设前后缀且分段=2时拒绝，3/4/5可选。未设固定分段时不自行补3，完整服务端命名语义由契约交付。字段类型候选GET /back/dms/model/dmsModel/getAllJdbcTypeByDbType/03，以typeName绑定。','',
  '前后两组每行都需英文名/中文名/类型；含char须长度，number、decimal、numeric须长度与精度。先清理null再检查，不以number.length判断是否缺失。英文名改动的移除中文行为不构成完整标识符安全验证；跨组trim后重复英文名/中文名在保存前完整检查。字段语义不套登录密码策略。','',
  '组内拖拽/上移/下移只调整本组顺序，首行不能上移、末行不能下移。staEndFlag前置1后置2，colSeq按组当前行数减索引；服务返回后核对实际顺序。新增行deleteFlag=0，已有行删除转1进入deleteColumnList；每次新增、编辑读取、取消和关闭都清理上一个草稿的删除队列，保存失败保留当前草稿以便修正。','',
  '### 分析、统计和物化语义','',
  '分析页签类型不是任务状态：analysisType=5/2/0/3/6，taskStatus=0/1/2/3分别未执行/执行中/成功/失败；lockFlag是模型锁，三者不可共用状态机。标准分析与其他结果详情使用不同组件，合并主题域/表为额外写动作，不由查看自动触发。','',
  '标准统计趋势stdType=1/2/3为表/字段/代码，初始化最近30天；客户端日期选择限制与服务端统计窗口分别定义。趋势按refDate对齐，成功响应缺日补0；汇总、趋势、TOP失败分别显示，不能把初始0、空白画布或缺失静态时间判成功。物化isInstanceEnd只表示实例结束/可发起，必须取得明确终态和实际数据库核验后才能判断执行成功。','',
];}
function renderDocument(type,previous){
  if(previous.includes('<!-- dms:generated-spec-v1 -->')&&!previous.includes('<!-- 业务规格格式:plain-v1 -->'))throw new Error('DMS reviewed format missing');
  const entries=type==='main'?MAIN:SUB;
  const priorIds=[...previous.matchAll(/^### (DMS-\d{3})\b/gm)].map(m=>m[1]);
  if(JSON.stringify(priorIds)!==JSON.stringify(entries.map(e=>e.id)))throw new Error('DMS requirement IDs missing, duplicated or reordered');
  const rows=acceptanceRows(previous,type),baseRows=rows.filter(r=>Number(r.split('|')[1].trim().split('-').at(-1))<(type==='main'?500:521));
  const baseChecks=type==='main'?[
    '按名称、创建人、时间及展开条件读取列表，逐列核对结果、总数和合法空结果。','查询失败、重试与重置后保留正确上下文；默认值、分页及迟到响应符合统一规则。','从六叶子菜单进入各自目标，核对对象、权限及返回；不因菜单可见自动授予写权限。','条件A后发B且A晚回，最终只显示B；从详情返回恢复已提交条件、页码，不把旧结果当新结果。','用两种相异授权范围直接访问模型、版本和对象标识，核对服务端隔离及失权恢复。','统计单块失败不填0；成功指标有单位、截止时间与明确口径，任务执行与读取分别鉴权。',
  ]:SUB.flatMap(e=>[checks[e.kind][0],e.kind==='propertyForm'?checks[e.kind][3]:checks[e.kind][Math.min(3,checks[e.kind].length-1)],'使用相异授权范围和只读身份直接访问本项对象与动作，核对服务端拒绝、会话过期和恢复；不得只看按钮隐藏。']);
  const preserved=baseRows.map((row,i)=>{const cells=row.split('|').slice(1,-1).map(v=>v.trim());return [cells[0],baseChecks[i],cells.at(-2),'未执行'];});
  const sourceRows=type==='main'?section(previous,8).split(/\r?\n/).filter(x=>/^\| DMS-\d{3} \|/.test(x)):[];
  if(type==='main'&&(sourceRows.length!==2||!sourceRows[0].includes('F091-model-menu-design.png')||!sourceRows[1].includes('E032-modeling.png')))throw new Error('DMS published source rows missing');
  const intro=type==='main'?[
    '## 1. 业务目标与使用角色','','维护模型定义、版本、属性配置和开发环境，支持模型设计、执行物化、分析及统计。建模人员、配置维护者、执行者和只读使用者为业务责任划分，实际角色/资源矩阵由服务端定义，不据单账号推断。','',
    '## 2. 业务范围','',...table(['分区','入口与核心对象','主要操作与边界'],SUB.slice(0,6).map(e=>[e.title,PROFILES[e.kind].route,PROFILES[e.kind].purpose])),'模型基本信息保存、模型画布保存、版本发布、物化执行、分析受理及统计读取分别确认；本规格不把任何一个步骤成功等同全流程交付。','',
  ]:[
    '## 1. 范围与入口','','本文件补充[主规格](./需求说明.md)，按模型设计、物化、分析、统计、开发环境和属性配置六个目标及属性新增弹窗细化。每个功能的字段、交互、请求、失败、布局和验收独立可追踪。','',
    '## 2. 对象与操作范围','',...table(['子页面','查询/展示','新增/编辑','删除/执行及查看边界'],[
      ['模型设计','模型列表、详情及版本','基本信息弹窗；画布另有完整交付包','整体删除/历史删除、锁/解锁、复制、对比和监控分别授权'],['模型物化','模型、历史及表/字段','物化为执行流程，不是普通记录编辑','DDL、再次物化、测试/正式执行有独立授权'],['模型分析','五类任务、结果及报告','仅自定义对比页签新增','删除任务与合并结果独立；不删除模型'],['模型统计','模型及标准两页签','只读，无普通新增/编辑','无普通删除/保存；图表及趋势条件不写业务对象'],['开发环境','findOne单配置及连接/schema','有记录PUT，无记录POST','没有组件定义的独立删除入口；保存不执行物化'],['模型属性','分页、详情及前后字段数量','新增/配置编辑及两组有序子字段','确认DELETE；引用保护及字段事务'],
    ]),
  ];
  const limits=[
    '### 可交付范围与外部契约','','可据本文件开发六页面、基本信息维护、属性公共字段和已知调用端；真实持久化、后台任务、物理数据库及完整画布交付仍须完成[核查记录](./核查记录.md#外部依赖)中的契约与隔离验收。字段空白不是无约束，不能让AI自行补业务规则或假成功返回。','',
    '### 画布与结果详情交付包','','模型基本信息不等于完整画布。画布包含主题域树/画布/表属性、字段、索引、约束、关系及标准引用：curNode.tabDesc/tabDetail，字段colName/colDesc/colType/colLength/colPrecision/keyFlag/nullable/stdDataElementId/defaultValue/autoIncFlag/startValue；索引indexName/indexDesc/indexType/uniqueFlag/sortType及成员；约束constraintName/constraintDesc/constraintTypeId/colConsExpression；关系curEdge.constraintName/tabRelType和父子字段映射。完整必填/枚举、变更类型、删除列表、画布布局、保存DTO及标准映射须由专门契约和完整页面材料交付，不能把字段名清单冒充完整可开发规格。','',
    '画布已查调用包括POST /back/dms/model/dmsModel/getTopicAndTablesTree、findAllByTopicQo、addModelDesign；主题域POST /back/dms/model/dmsTopicDomain/add、PUT modify/{id}、DELETE delete/{id}；读取列POST /back/dms/model/dmsTabCol/findColumns；模型转换POST /back/dms/model/dmsModel/modelTransform或mtrlModelChangeDbType。保存/转换/发布和详情差异合并的完整输入、事务、权限、状态及错误未形成已验证后端合同，按核查交付包收口。','',
    '导入上传头/同名表处理、物化全量覆盖/增量更新的执行算法、真实任务ID与终态、服务端版本冲突/引用/删除、分析算法分母及RTO/RPO必须在隔离环境和服务端材料中逐项落实；缺少这些不能声称完整画布、生产物化、报告算法或全模块应用验收通过。','',
  ];
  const nfr=type==='main'?['## 9. 非功能性需求','','以下是开发交付目标；具体目标来源和现有差异见核查记录。功能/质量验收全部未执行。性能样本与配置缺失时保持未执行，不把静态代码、文档检查或一次打开页面当实测。','',...table(['编号','质量属性','需求与指标/不变量','验收环境、方法及失败判定','关联功能','状态'],NFR.map(([n,q,r,v])=>['DMS-NFR-'+n,q,r,v,'DMS-100、DMS-001及DMS-506至512','未执行'])),'凭据设置/密码哈希、认证限流和月度可用率不由此模块新增默认规则；引用登录/平台安全策略，未给出已批准SLA时不凭空承诺月度可用率。物化与导入的RTO/RPO及备份保留由数据量、目标库和恢复演练确定，在外部依赖中绑定，不用页面响应目标替代恢复目标。','']:[];
  return [
    '# 规范化数据建模'+(type==='main'?'业务需求说明':'子页面与操作需求细化'),'','<!-- 业务规格格式:plain-v1 -->','<!-- dms:generated-spec-v1 -->','',
    '功能与质量规格供产品、研发及测试评审使用。调查依据、实现差异及受阻交付集中在[核查记录](./核查记录.md)，正文直接给出目标行为；所有应用验收状态为未执行。','',...intro,
    '## 3. 功能需求','',...entries.map(renderFeature),
    '## 4. 字段与业务规则','',...(type==='sub'?extendedRules():['逐字段控件、绑定、默认与组合校验见各功能第1节；[子页面细则](./子页面与操作细化.md#4-字段与业务规则)进一步定义前后置字段排序、监控与导入参数。模型id、版本id、配置id及任务号分别使用，逻辑模型设计、模型版本、物化记录和物理库对象不能混为同一删除/保存范围。','']),
    '## 5. 主要业务流程','','入口验权→读取页面与依赖→选择当前对象/版本→本地校验→人工确认对应动作→服务端授权与原子处理→按对象回读或任务终态核查→失败/冲突/未知结果恢复。只读统计和查询不套确认保存流程，任务受理不表示执行成功。','',
    '## 6. 验收标准','','保留本文件既有功能验收编号；每个功能的五组检查与下列跨流程检查共同执行。应用验收均为未执行；正式执行记录前置环境、输入、操作、回读、权限、异常及证据。','',...table(['验收编号','前提、步骤与可检查结果','关联需求','状态'],preserved),
    '## 7. 实现与交付边界','',...(type==='main'?table(['历史编号','操作范围','当前归属及交付约束'],boundaries.map(([n,t,b])=>['DMS-'+n,t,b])):[]),...limits,
    '## 8. 需求依据与关联资料','',...(type==='main'?['| 需求编号 | 页面资料 | 规则依据 |','|---|---|---|',...sourceRows,'']:table(['需求编号','页面资料','规则依据'],entries.map(e=>[e.id,e.sources.map(shotLink).join('；'),'[核查记录](./核查记录.md)及[原文索引](../evidence/dms-review-20261027/README.md)']))),
    '[调研归档](./调研记录.md) · [主规格](./需求说明.md) · [子页面细则](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [总索引](../README.md) · [专项证据](../evidence/dms-review-20261027/README.md)','',...nfr,
  ].join('\n');
}
function write(root=ROOT){
  const folder=path.join(root,'10-规范化数据建模');let changed=0;
  for(const [type,name]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){
    const file=path.join(folder,name),before=fs.readFileSync(file,'utf8'),after=renderDocument(type,before);
    if(before!==after){fs.writeFileSync(file,after);changed++;}
  }
  return {changed,requirements:9};
}
if(require.main===module)console.log(JSON.stringify(write()));
module.exports={MAIN,SUB,PROFILES,NFR,renderFeature,renderDocument,write};
