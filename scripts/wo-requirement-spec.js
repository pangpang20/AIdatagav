/* Reviewed workorder requirements; business actions are never executed here. */
const fs=require('node:fs');
const path=require('node:path');
const MAIN=[
  ['100','查询我的待办工单','todo',521,['C040-original-content']],
  ['001','按办理身份查找工单','identity',526,['E065-workorders','E101-current-complete']],
].map(([id,title,kind,start,sources])=>({id:'WO-'+id,title,kind,start,sources}));
const SUB=[
  ['500','工单管理 → 我的待办','handling',531,['H-WO-001']],
  ['501','工单管理 → 我的已办','done',536,['H-WO-002']],
  ['502','工单管理 → 我的工单','mine',541,['H-WO-003']],
  ['503','工单管理 → 我的工单 → 查看','detail',546,['H-WO-003-op1']],
  ['504','工单管理 → 我的工单 → 查看','basic',551,['U-WO-detail-basic']],
  ['505','工单管理 → 我的工单 → 查看 → 表单信息','form',556,['U-WO-detail-form']],
  ['506','工单管理 → 我的工单 → 查看 → 审核历史','history',561,['U-WO-detail-history']],
].map(([id,title,kind,start,sources])=>({id:'WO-'+id,title,kind,start,sources}));
const WF='/back/common/workflow',US='/back/common/user';
const table=(headers,rows)=>['| '+headers.join(' | ')+' |','|'+headers.map(()=>'---').join('|')+'|',...rows.map(r=>'| '+r.map(v=>String(v??'').replaceAll('|','&#124;').replaceAll('\n','<br>')).join(' | ')+' |'),''];
const field=(name,type,required='',value='',limit='',rule='',error='',state='')=>[name,type,required,value,limit,rule,error,state];
const ro=(name,type='只读文本',rule='',state='返回资料')=>field(name,type,'','','',rule,'',state);
const pageFields=[
  field('当前页 pageRequest.pageNo','integer','是','1','正整数','查询、重置、改变页大小时回第1页；翻页使用目标页','','分页请求'),
  field('每页条数 pageRequest.pageSize','integer','是','20','正整数','当前分页控件选择值；不把样本记录总数当最大值','','分页请求'),
  field('排序 pageRequest.order','array<object>','是','[{prop:"id",asc:false}]','','prop为字段键、asc为boolean；服务端限制可排序字段','','嵌套分页对象'),
];
const queryFields=(mine=false)=>[
  field('业务名称 categoryCode','可搜索单选','否','','','候选categoryCode作为值，categoryName为显示；可清空','','筛选'),
  field('申请标题 title','文本输入','否','','','v-audaque-input-trim去首尾空白','','筛选'),
  ...(mine?[
    field('流程状态 procStatusList','多选 array<number>','否','','0、1、2、3、4','草稿、处理中、挂起、结束、已撤回；Number转换选项值','','筛选'),
    field('审核状态 optTypeList','多选 array<number>','否','','-1、0、1、2','待发起、审核中、任务完成、任务发起人撤回；0为有效值','','筛选'),
  ]:[field('发起人 applicantName','文本输入','否','','','trim去首尾空白','','筛选')]),
  field('发起时间 applyTimeRange','日期时间区间','否','','','yyyy-MM-dd HH:mm:ss；'+(mine?'映射applyTimeStart/applyTimeEnd':'映射createTimeStart/createTimeEnd')+'，清空置null','','展开筛选'),
  field('工单类型 bizTypeList','多选 array<number>','否','','1～7','需求工单、质检工单、测评工单、运维工单、指标工单、审批、其他','','展开筛选'),
  ...pageFields,
];
const contextColumns=[
  ro('数字空间标识 spaceId','只读映射文本','projectSpaceMap[spaceId]显示名称，不把名称当ID','dopAccess与dopMultiSpace同时启用时'),
  ro('来源应用 appCode','只读文本','','同上条件'),
  ro('工单类型 bizType','只读枚举','按1～7字典显示','同上条件'),
];
const listFields=(mine=false,done=false)=>[
  ro('序号','计算展示','pageSize×(pageNo−1)+行索引+1'),...contextColumns,
  ro(mine?'流水号 bizCode':'流水号 procInstId','只读标识','与当前业务实例绑定；不等于taskId'),
  ro('业务编号 categoryCode'),ro('业务名称 categoryName','只读映射文本','按categoryCode在业务候选中匹配'),
  ...(mine?[]:[ro('节点名称 taskName')]),ro('申请标题 title'),
  ...(mine?[]:[ro('发起人 applicantName')]),ro('发起时间 createTime','日期时间','按统一时间格式展示；时区以服务契约为准'),
  ...(mine?[ro('已流转 duration','只读时长','直接显示返回值，不自行按日期重算')]:done?[]:[ro('节点期限 nodeDeadLine','只读期限','展示返回值；不由样本定义逾期算法')]),
  ro('流程状态 procStatus','数值枚举及文案','保留0～4原始值，另取显示文案'),
  ...(mine?[ro('审核状态 bizResult','只读文本','与筛选optTypeList区别处理，不按同名猜转换')]:[]),
  ro(mine?'业务记录 id':'节点任务 taskId','隐藏稳定标识','由当前行提供；本人操作id、bizCode与办理taskId不能互换'),
];
const basicFields=[
  ro('业务编号 categoryCode'),ro('业务名称 categoryCode对应categoryName','禁用单选','候选只用于显示匹配'),
  ro('申请标题 title'),ro('申请时间 createTime','禁用日期文本','格式化展示，不修改原始时间'),
  ro('已流转 duration','禁用文本','服务端返回的流转时长'),ro('流程状态 procStatus','禁用枚举文本','原始数值与文案分离'),
  ro('抄送人 ccInfo[].uname','禁用文本','按返回数组拼接显示','有抄送信息时'),
  ro('来源应用 appCode','禁用文本','','dopAccess与dopMultiSpace同时启用时'),
  ro('工单类型 bizType','禁用枚举文本','按1～7字典显示','同上条件'),
  ro('详情上下文 bizCode/formId/tableName/optType/procStatus','路由query','bizCode用于读业务，formId用于表单快照；tableName不是任意物理表授权'),
  ro('历史上下文 procInstId/bizCode/procStatus/categoryCode','隐藏标识与状态','本人历史优先procInstId，无值再用bizCode；当前状态和分类绑定同一业务'),
];
const formFields=[
  ro('表单标识 formId','稳定ID','随当前业务资料绑定；不从其他工单复用'),
  ro('表单定义 formJson → formConf','JSON字符串→object','解析已发布快照；内容结构由对应表单契约定义'),
  ro('业务数据 bizInfo → echoFormData','JSON字符串→object','与当前快照版本匹配；不将解析失败当无表单'),
  ro('业务表单动态字段','只读动态控件','每个标签、绑定名、类型、必填、默认、格式及错误规则来自此formId快照；不自行增加固定账号、部门或租户字段'),
  field('只读开关 isDisabled','boolean','是','true','','详情中的动态表单不能保存或触发业务写入','','详情表单解析器'),
];
const historyFields=[
  ro('流程图 imgUrl','blob转objectURL','图像来源act/def/diagram；销毁与换图释放URL'),
  ro('序号','计算展示','当前返回数组索引+1'),ro('活动流程 taskName'),
  ro('接收时间 createTime','日期时间','当前单元格实际读createTime，非表头prop的taskCreateTime'),
  ro('完成时间 finishTime','日期时间'),ro('处理时长 duration','只读文本','直接显示返回值'),
  ro('参与者 candidate','文本','逗号分隔，尾标记_*为特殊显示；转义后渲染，同时提供文字含义'),
  ro('审核意见 comments[].assigneeName/comment','多行文本','逐条显示人员和意见，不拼接执行HTML'),
  ro('审核 optName','只读文本','使用返回的操作文案，不从记录数量推断结论'),
  ro('提示 comments[0].type/comment','提示文本','记录首项type严格字符串19且comment有值时组件发getTip；父页须明确接收与否'),
];
const handlingFields=[
  ro('业务编号 categoryCode','禁用文本'),ro('业务名称 categoryCode对应categoryName','禁用单选','按业务候选匹配'),
  ro('节点名称 taskName','禁用文本'),ro('申请标题 title','禁用文本'),
  ro('发起人 applicantName','禁用文本'),ro('抄送人 ccInfo[].uname','禁用文本','按返回数组拼接','有抄送信息时'),
  ro('发起人所属组织 applicantDep','禁用文本'),ro('发起时间 createTime','禁用日期文本','格式化展示'),
  ro('状态 procStatus','禁用枚举文本','保留原始状态，文案单独映射'),
  ro('来源应用 appCode','禁用文本','','dopAccess与dopMultiSpace同时启用时'),
  ro('工单类型 bizType','禁用枚举文本','按1～7字典显示','同上条件'),
  ...formFields,
  field('审核操作 ruleForm.optType','单选 number','是','1（通过适用且依赖就绪时）','','1通过、4驳回、5委办、6转派、16选择节点；选项条件见下文','请选择操作的类型','仅upcoming任务办理页签'),
  field('审核意见 ruleForm.comment','多行文本','是','','70字符','trim；blur/change必填校验','请输入审核意见','任务办理'),
  field('抄送人 ruleForm.ccUid','搜索多选 array<ID>','否','[]','','id作为值、name作显示；obscureName搜索','','任务办理'),
  field('下一节点 ruleForm.backTaskSid','下拉本地key','条件必填','首个候选nodeId','','通过时取首项且禁用；nodeId是客户端UUID，不进入现有提交体','请选择下一节点处理人','通过有节点或选择节点16时'),
  ro('审核人 ruleForm.nameStr','禁用文本','通过时由首节点relateIds的值以分号连接','通过且有节点'),
  field('指定下一操作人 ruleForm.userIds','搜索多选 array<ID>','','[]','','请求名userStr，仍传数组；与节点候选绑定','','通过有节点、无owner且countersignNeed≤0，或选择节点16'),
  field('委办用户/转派用户 ruleForm.newAssigneeId','搜索单选 ID','条件必填','null','','仅5/6要求；过滤当前用户，仍由服务端核资格','请指定用户','optType为5或6'),
  ro('任务标识 taskId及pageType','路由query','query.id取taskId；upcoming可办理，done只读'),
  ro('会签条件 countersignNeed及owner','隐藏返回状态','控制可见动作和指定下一操作人；不作为客户端授权凭据'),
];
const maintenanceFields=[
  ro('目标业务 id/bizCode/formId/categoryCode/title','当前行及详情','id用于变更/删除/发起；bizCode用于详情与撤回/催办'),
  field('编辑业务资料 echoFormData','动态表单','','当前bizInfo解析值','','字段与校验由formId发布快照逐项定义；此弹窗isDisabled=false','','仅草稿，title保持当前行原值'),
  field('发起抄送人 ruleForm.userIds','搜索多选 array<ID>','否','[]','','映射发起参数ccUid；obscureName查询id/name候选','','仅草稿发起弹窗'),
  field('催办信息 urgeRuleForm.message','多行文本','是','','200字符','trim，显示字数，blur必填校验','请输入信息内容','仅处理中的催办弹窗'),
];
const categoryReq=['业务名称候选','POST',WF+'/act/category/list','无页面业务参数，公共客户端可发送空对象','读取categoryCode/categoryName数组，再发首屏列表；失败单独报候选错误'];
const detailReq=['本人业务详情','POST',WF+'/act/biz/one','body {bizCode:当前行或query.bizCode}；按稳定标识，不按标题','读取业务id、title、categoryCode、createTime、duration、procStatus、bizInfo、formId、ccInfo、procInstId、procDefId及条件appCode/bizType'];
const formReq=['发布表单快照','POST',WF+'/act/form/one','body {id:formId,needSnapshot:true}','读取formJson并解析；空快照与解析/接口失败分开'];
const userReq=['人员候选','POST',US+'/user/page','首屏body {pageRequest:{pageNo:1,pageSize:20}}；非空搜索 {obscureName:文本,pageRequest:{pageNo:1,pageSize:200}}；普通列表滚动pageNo递增，pageSize=20；本页fixedParams={}','读取datas及普通列表total，id/name作值/显示；搜索一次读取200不是人员总量上限，超过结果窗口需分页契约；失败保留草稿并可重试'];
const historyRequests=[
  ['审核记录','POST',WF+'/act/task/record','body {procInstId:当前详情procInstId，无值再用bizCode}','读取记录数组及comments；不把bizCode任意拼接为其他对象'],
  ['流程图','GET',WF+'/act/def/diagram','query按优先分支：procStatus==0用{categoryCode}；否则有实例用{procInstId}；否则{modelDefId:procDefId}；responseType:blob','本人父页传状态/分类/实例，任务父页传实例/定义，不能互套参数；图像按当前对象返回处理'],
];
const listRequest=(mine=false,done=false)=>['工单列表','POST',WF+(mine?'/act/biz/page':done?'/act/task/done/page':'/act/task/todo/page'),
  (mine?'body {categoryCode,title,procStatusList,optTypeList,applyTimeRange,applyTimeStart,applyTimeEnd,bizTypeList,pageRequest}':'body {categoryCode,title,applicantName,applyTimeRange,createTimeStart,createTimeEnd,bizTypeList,pageRequest}')+'；筛选实际有值才赋值，pageRequest嵌套pageNo/pageSize/order',
  '消费{datas,total}，亦兼容数组分支；加载状态1、成功2、空3、失败4。总数与本次条件绑定'];
const handlingRequests=[
  ['待办/已办任务资料','POST',WF+'/act/task/todo/info 或 '+WF+'/act/task/done/info','body {taskId:query.id}；pageType分别upcoming/done','读取对应任务详情；不由optType=view放宽数据权限'],formReq,
  ['后续节点','POST',WF+'/act/task/next/node','body {taskId}','读取数组taskName、relateIds、uidStr、nameStr；只在可办理待办读取'],
  ['可退回节点','POST',WF+'/act/task/return/node','body {taskId}','读取历史节点数组；当前驳回没有节点选择控件，不能推定可任意回退'],userReq,
  ['办理提交','POST',WF+'/act/task/deal','body精确六字段 {optType,taskId,comment,ccUid,userStr:ruleForm.userIds,newAssigneeId}；userStr仍为数组','校验通过后isSubmit=true；成功提示确认后返回上一页，失败解除锁并保留有效草稿；没有backTaskSid/nodeId/procInstId提交参数'],
];
const maintenanceRequests=[
  detailReq,formReq,userReq,
  ['保存草稿编辑','POST',WF+'/act/biz/update','body {title:行title,id:行id,bizInfo:JSON.stringify(动态表单提交值)}','整体验证当前快照；成功后刷新列表，不自行允许改标题或发起流程'],
  ['发起流程','POST',WF+'/act/task/start','body {id:行id,title:行title,ccUid:ruleForm.userIds,categoryCode:行categoryCode,appKey:"ubp"}','收到业务确认后回读该业务状态；不把打开弹窗或HTTP成功当节点已创建'],
  ['删除草稿业务单','DELETE',WF+'/act/biz/{id}','path id=当前行id；无新增请求体','不可恢复确认后提交；取消不请求；成功回读当前页，最后一条移除后校正页码'],
  ['撤回流程','POST',WF+'/act/task/deal','body {procInstId:行bizCode,optType:2}','目标先确认对象和影响再提交；服务端重新校验处理中及撤回资格'],
  ['催办','POST',WF+'/act/task/deal','body {procInstId:行bizCode,comment:message,optType:14}','200字符必填意见；等待回执再关闭；成功回执不证明通知已送达'],
];
const listControls=[
  ['筛选输入/业务下拉','输入trim；业务可搜索/清空；展开显示日期及类型等更多条件。编辑条件不自动执行业务写入。'],
  ['查询/Enter','合并当前有效条件并回第1页；点击与Enter使用同一请求入口；候选未完成时提示等待，失败提供重试。'],
  ['重置','清除本页业务筛选与日期映射，回第1页重新查询；保留会话授权上下文，不把重置解释为清业务记录。'],
  ['页码/条数/横向滚动','页码变更读对应页；改条数回第1页；长列在表格内横向滚动，操作列可达。'],
  ['进入详情后返回/刷新','保留已提交条件、页码和排序；同路径缓存绑定当前身份与空间。刷新重新鉴权并回读，旧请求不覆盖新结果。'],
];
const taskControls=[
  ['办理入口','待办行原条件procStatus != 2显示办理，进入独立任务详情；打开不提交。服务端无权/任务已结束则禁用办理并说明状态。'],
  ['基本/表单/任务办理/审核历史','默认基本0；表单1只读；任务办理2只在upcoming出现；历史3按实例读取。done没有任务办理及提交。'],
  ['审核操作单选','非SYS_DATA_ANALYSIS显示通过1；始终显示驳回4；countersignNeed≤0显示委办5与转派6；SYS_DATA_ANALYSIS显示选择节点16。动作切换清旧节点/委派选择和不适用校验，保留意见及抄送草稿。'],
  ['通过/下一节点/审核人','下一节点取首候选且禁用，不允许客户端生成新流程节点；审核人显示relateIds值，下一操作人取节点uidStr并核对有效性。'],
  ['委办/转派/抄送/下一操作人','人员搜索obscureName；抄送与下一操作人多选，委办/转派单选且排除本人。候选加载失败停留原操作，失效人员定位提示。'],
  ['选择节点16','当前调用链没有完整节点来源与提交参数协议；协议接通前禁止此分支提交，明确提示“该操作暂不可用”，不偷偷按通过或驳回执行。'],
  ['意见/提交/返回','意见trim且必填70字符；绑定optType进行操作校验。提交入口与按钮同时锁定，等待回执；失败保留意见和仍有效选择。离开未提交草稿先确认，拒绝离开继续填写；读详情返回无需修改确认。'],
];
const maintenanceControls=[
  ['本人业务单条件操作','每行始终可查看；数值procStatus=0时按update/start/delete权限显示编辑、启动、删除；=1时按revoke/urge显示撤回、催办；其他状态只有查看。字符串状态须先通过DTO校验转换，不能误放权。'],
  ['编辑/动态表单/确认','并行读取bizInfo与快照后打开700px弹窗，字段按快照生成。确认调用解析器校验再保存；不适用的动态字段不得按惯例增设。失败留窗保留草稿，成功后关闭并刷新。重置需按快照恢复初始回填并处理未保存变更。'],
  ['启动/抄送/确认','700px发起流程弹窗，抄送搜索多选，可空；确认只针对当前草稿，提交中锁定并留窗。成功回读，失败保留人员选择；取消/关闭不发起。'],
  ['删除/确认/取消','只针对草稿业务id；不可恢复确认框列明对象与范围。取消或关闭不发送DELETE；确认后锁定，失败保留对象与原列表。'],
  ['撤回','目标在发送前显示范围确认；同一流程已有在途请求时不再提交。只有明确回执及回读能判撤回结果，失败不伪改列表状态。'],
  ['催办/意见/确认','500px弹窗，信息内容必填、trim、200字符；校验失败定位，确认等待回执，失败留窗；取消不发送催办，超时先核结果再决定重试。'],
];
const basicLayout='独立全页：沿用顶栏与左侧约240px导航，右侧页标题“工单详情”、右上“返回”。白色内容卡顶部横排基本信息、表单信息、审核历史；默认基本信息蓝色下划线。基本资料每行左右两列，标签在控件上方，顺序为业务编号/业务名称、申请标题/申请时间、已流转/流程状态、条件抄送人及来源应用/工单类型；禁用浅灰控件。';
const listLayout='1500×1000历史视口中，深色顶栏在最上方，左侧约240px为我的工单导航，右侧为标题、白色筛选区、白色表格及右下分页。首行按业务名称、申请标题、发起人排列，查询/重置与展开按钮在筛选右侧；更多条件展开后位于表格上方。样本像素只作位置参照。';
const PROFILES={
  todo:{route:'/workorder/workbench/workflowReviewList',goal:'按当前用户可办理任务检索待办，识别业务与节点后进入办理详情。',fields:[...queryFields(),...listFields()],controls:[...listControls,['办理','使用行taskId导航workflowFinishedAndReviewEdit?id={taskId}&optType=edit&pageType=upcoming；完整办理规格见WO-500。']],requests:[categoryReq,listRequest()],flow:['加载当前会话和授权空间，再读取业务名称候选；成功后查询待办。','填写业务名称、标题、发起人，展开后可选日期与工单类型；提交当前条件与分页对象。','按返回datas/total展示当前任务、节点期限及操作；空结果保留条件，失败不当空成功。','以taskId进入独立办理详情；返回时恢复本页条件并刷新最新任务状态。'],layout:[listLayout,'结果列依次为序号、条件空间/来源应用/类型、流水号、业务编号、业务名称、节点名称、申请标题、发起人、发起时间、节点期限、流程状态、操作；期限来自返回，不按样本定义逾期颜色。'],sources:['TODO','TODO-API','TYPES','LIST-MIXINS','PAGINATION']},
  identity:{route:'/workorder/workbench/workflowReviewList、/workorder/workbench/workflowFinishedList、/workorder/workbench/myWorkflowList',goal:'区分当前待办任务、已办理任务与本人业务单，按办理身份进入正确的查询及详情链路。',fields:[ro('我的待办','导航项','节点任务taskId作用域，POST todo/page'),ro('我的已办','导航项','已办理节点taskId作用域，POST done/page'),ro('我的工单','导航项','本人业务id/bizCode作用域，POST biz/page'),...contextColumns,...pageFields],controls:[['工单管理展开/收起','左侧展开后出现我的待办、我的已办、我的工单；选中项与标题、列表对象同步。'],['三个导航项','分别进入实际目标路由，保留各自已提交条件；本地缓存不跨用户/租户/空间。'],['本人查看与任务查看','本人按bizCode读业务及快照；待办/已办按taskId读节点，不把同一标题的任务混为一条业务。'],['错误/重新登录','导航失败留在可恢复界面；会话过期清无权内容，登录后重新授权加载，不自动提交任何旧动作。']],requests:[categoryReq,listRequest(),listRequest(false,true),listRequest(true)],flow:['展开工单管理并选择办理身份。','进入对应列表，仅显示该身份和服务端数据权限覆盖的对象。','待办可进入任务办理，已办只读查看，本人业务单按状态与动作权限显示条件操作。','各详情与记录均重新鉴权；切换菜单/账号/空间后不复用上个作用域响应。'],layout:['左侧“工单管理”下三个同级导航项，选中项浅蓝底及右边蓝线；右侧随选择更新标题与业务内容。',listLayout,'本人列表采用业务流程与审核状态字段；已办取消节点期限列且操作为查看，不能沿用待办标题或办理按钮。'],sources:['ROUTES','TODO','DONE','MINE','TYPES','LIST-MIXINS']},
  handling:{route:'/workorder/workbench/workflowReviewList → /workorder/workbench/workflowFinishedAndReviewEdit?id={taskId}&optType=edit&pageType=upcoming',goal:'在同一任务上下文核对业务、表单与轨迹，填写适用审核意见及人员后提交当前节点办理。',fields:[...queryFields(),...listFields(),...handlingFields],controls:[...listControls,...taskControls],requests:[categoryReq,listRequest(),...handlingRequests,...historyRequests],flow:['从待办列表取得当前行taskId；读取业务候选后按taskId读todo/info，并为upcoming并行读后续节点与可退回节点。','基本信息默认页只读；解析bizInfo与发布表单快照，历史按同一实例懒加载；必要依赖失败阻止办理。','在任务办理页选择适用操作，填写trim后的70字符意见与适用人员；验证操作、人员资格和当前任务状态。','点击提交后锁定同任务，发送精确六字段；成功提示确认后返回并回读待办/已办及业务状态，失败留页。','超时或任务被他人抢先办理时先按taskId核对最新结果；不能自动重放或凭旧状态再办理。'],layout:[listLayout,'任务目标是独立全页，上方标题及返回，内容卡顶部横排四页签；基本资料两列。表单区为只读动态控件；任务办理区先审核单选，再意见、抄送、条件节点/审核人、条件下一操作人或委办/转派人，主体单列并有局部两列行。只有任务办理页签底部显示主色提交，忙碌时loading且禁用；不是工作台左右双栏弹窗。'],sources:['TODO','TASK','TODO-API','COMMON-API','HISTORY','TYPES','LANGUAGE','LIST-MIXINS']},
  done:{route:'/workorder/workbench/workflowFinishedList → /workorder/workbench/workflowFinishedAndReviewEdit?id={taskId}&optType=view&pageType=done',goal:'按当前用户已办节点查找任务，只读复核其基本资料、业务表单及审核轨迹。',fields:[...queryFields(),...listFields(false,true),...handlingFields.filter(f=>!f[0].startsWith('审核操作')&&!f[0].startsWith('审核意见')&&!f[0].startsWith('抄送人 ruleForm')&&!f[0].startsWith('下一节点 ruleForm')&&!f[0].startsWith('审核人 ruleForm')&&!f[0].startsWith('指定下一操作人')&&!f[0].startsWith('委办用户'))],controls:[...listControls,['查看','使用当前行taskId，optType=view且pageType=done，读取done/info。'],['基本/表单/审核历史','默认基本0；表单1只读，历史3；不渲染任务办理2或提交，不能从URL改成upcoming取得办理权。']],requests:[categoryReq,listRequest(false,true),handlingRequests[0],formReq,...historyRequests],flow:['读取业务候选后按当前用户条件查询done/page。','已办表格展示已处理节点，不显示待办期限或办理入口。','按taskId进入done/info详情；表单快照只读，历史与图按当前实例读取。','返回恢复已办条件；读取失败可重试，页面不请求deal/start/update或DELETE。'],layout:['目标标题“我的已办”，筛选排列与待办一致；表格依次为序号、条件空间/来源/类型、流水号、业务编号、业务名称、节点名称、申请标题、发起人、发起时间、流程状态、查看；没有节点期限列。','已办详情是独立全页，顶部基本信息、表单信息、审核历史三个页签。历史H-WO-002仅用作导航与正文滞留的冲突记录，正常内容布局按本功能组件结构实施。'],sources:['DONE','TASK','DONE-API','TODO-API','COMMON-API','HISTORY','LANGUAGE','LIST-MIXINS']},
  mine:{route:'/workorder/workbench/myWorkflowList',goal:'查找本人业务单，查看流程，并在允许状态下编辑草稿、启动、删除、撤回或催办。',fields:[...queryFields(true),...listFields(true),...maintenanceFields],controls:[...listControls,...maintenanceControls],requests:[categoryReq,listRequest(true),...maintenanceRequests],flow:['读候选后查询biz/page，使用业务流程状态和审核状态等筛选，而非待办任务查询条件。','查看按bizCode与formId进入独立三页签详情；每次操作绑定当前业务id与原始数值状态。','草稿可按动作权限打开编辑、启动或删除确认；编辑完整校验快照，启动可选择抄送，删除只针对该草稿。','处理中可按动作权限撤回或填写200字符催办；提交需确认或对应模态校验，不在打开页面时自动执行。','业务明确成功后回读列表及必要详情；遇并发状态变化、未知结果或失权停止提交并保留可恢复草稿。'],layout:['右侧标题“我的工单”；筛选包括业务名称、申请标题、流程状态、审核状态、发起时间及工单类型，较多条件放展开区。下方结果依次为序号、条件空间/来源/类型、流水号、业务编号、业务名称、申请标题、发起时间、已流转、流程状态、审核状态、操作。','编辑和启动为居中700px模态，催办500px；模态顶部标题及关闭，主体可滚动，底部取消/确认保持可达。删除和撤回确认显示当前对象与影响；样本仅显示处理中及结束行，不将其当全部状态。'],sources:['MINE','MINE-API','TODO-API','COMMON-API','TYPES','LANGUAGE','LIST-MIXINS']},
  detail:{route:'/workorder/workbench/myWorkflowAndCopy2MeEdit?procStatus={状态}&formId={表单ID}&bizCode={业务流水号}&tableName={上下文}&optType=view',goal:'从本人业务单进入一个只读详情容器，关联基本资料、发布表单快照及同一实例的历史。',fields:[...basicFields,...formFields],controls:[['默认进入/返回','activeName=0基本信息；顶右返回原本人列表并恢复条件，不发送保存。'],['基本信息0/表单信息1/审核历史2','页签共享当前bizCode，表单按formId读快照；进入历史才挂载流程组件。'],['异步加载/重试','业务详情与表单可并行读取，但在版本与身份匹配后才组合展示；局部失败只重试失败项。']],requests:[categoryReq,detailReq,formReq,...historyRequests],flow:['从本人列表复制当前业务query并进入详情；加载候选，然后读取biz/one及有formId的发布快照。','保留原始业务状态，基本信息映射显示；业务bizInfo和formJson解析成功后组成只读表单。','切至审核历史按本次procInstId或bizCode读取轨迹和图；不得沿用上一实例缓存。','返回恢复列表；失权、对象不存在、快照解析失败或请求超时分别提示，不将失败显示为“暂无表单”。'],layout:[basicLayout,'页面只用于查看，没有保存/删除/办理按钮。只读状态仍应提供可复制文本或等价可访问展示，不把禁用输入灰色当作不可读取。'],sources:['DETAIL','MINE-API','TODO-API','HISTORY','TYPES','LANGUAGE']},
  basic:{route:'/workorder/workbench/myWorkflowAndCopy2MeEdit，基本信息页签0',goal:'复核本人业务的身份、标题、申请时间、流转时长、状态及来源。',fields:basicFields,controls:[['基本信息页签','默认选中；字段全只读，业务名称禁用下拉只显示匹配名称。'],['条件抄送/来源字段','有抄送信息才显示人员；来源应用和工单类型按DOP双配置显示。'],['其他页签/返回','只切换查看区域或返回列表；不修改业务标题、状态、已流转或抄送关系。']],requests:[categoryReq,detailReq],flow:['按bizCode读取本人业务对象并匹配业务名称候选。','将createTime格式化、ccInfo人员拼接，数值状态映射为文案；原值保留供逻辑判断。','显示两列资料，未知字典值显示可诊断占位，不变成另一枚举或默认为草稿。','接口失败保留当前对象上下文，重新加载同一bizCode；失权清无权业务内容。'],layout:[basicLayout,'历史样本可见八项资料，抄送未显示不代表字段不存在；条件变化时按当前资料和配置重新排版，长标题可换行或完整查看。'],sources:['DETAIL','MINE-API','TODO-API','TYPES','LANGUAGE']},
  form:{route:'/workorder/workbench/myWorkflowAndCopy2MeEdit，表单信息页签1',goal:'以申请所用的发布快照和业务数据只读复核表单，避免用最新设计覆盖历史申请。',fields:formFields,controls:[['表单信息页签','切换至1；按当前formId发布快照生成控件，用bizInfo回填，isDisabled=true。'],['动态控件/附件/远程选项','输入、选择、上传、保存均不可改变业务；远程只读选项与附件读取须单独鉴权，禁用编辑不等于禁止解析器全部外部请求。'],['空态/错误/重试','没有formId或成功读取但无formJson时显示“暂无表单信息!”；请求失败、JSON损坏或版本不匹配显示错误及重试，不能冒充正常空态。']],requests:[detailReq,formReq],flow:['取得当前bizCode及formId并确认对应关系。','并行或依序取得bizInfo和needSnapshot=true表单定义，解析并验证版本一致性。','只读渲染实际字段及回填值；不额外创建示例账号、性别等固定表单字段。','缺少合法快照时显示空或明确错误，不提供变更提交；切换工单时清旧数据及远程控件资源。'],layout:['沿用详情页头、左导航及顶部三页签；“表单信息”下划线选中，主区域展示动态表单，字段布局跟随对应发布快照。','历史U-WO-detail-form为白色内容区中部“暂无表单信息!”空态，不能据此画成有固定字段的表单；有内容、长表单及附件状态需在对应快照环境验收。'],sources:['DETAIL','MINE-API','TODO-API','LANGUAGE']},
  history:{route:'/workorder/workbench/myWorkflowAndCopy2MeEdit，审核历史页签2',goal:'查看同一流程实例的流程图和逐节点办理轨迹，区分申请状态、参与人员与审核意见。',fields:historyFields,controls:[['审核历史页签','activeName=2时挂载历史组件；使用本次procInstId或bizCode，返回/重新进入不得重复积累URL和监听。'],['流程图/审核记录','图像与记录独立加载，独立失败重试；图像不得当作实时完成状态的唯一依据。'],['参与者/意见/提示','意见作为文本逐行显示；参与者先转义再处理尾标记；特殊颜色同时有文字说明。type="19"提示事件需由容器明确展示，不能当办理成功凭据。']],requests:[detailReq,...historyRequests],flow:['进入历史时由已加载详情取procInstId，缺省再用bizCode；读取实例定义和权限。','按实例POST记录，同时按分支GET流程图blob；展示版本和时点一致的内容。','按返回顺序显示8列表格及每条comments；排序、结束判定与时长不由样本自定。','某一部分失败保留另一部分及当前实例说明，重试不提交任何办理动作。'],layout:['独立详情白卡顶部三个页签，审核历史蓝色下划线；中上方居中放流程图，最大宽度不超过容器，图下留间距后是8列条纹表格。','表格顺序为序号、活动流程、接收时间、完成时间、处理时长、参与者、审核意见、审核。意见单元格逐条换行；长轨迹支持内容区纵向与表格横向滚动，图中字形方框应按字体故障修复。'],sources:['HISTORY','COMMON-API','MINE-API','DETAIL','LANGUAGE']},
};
function acceptanceFor(kind){
  if(kind==='identity')return ['依次进入三个真实路由，标题、筛选和todo/done/biz请求匹配，不能只验证左菜单高亮。','同一业务多任务样本按taskId区分待办/已办，按bizCode查看本人详情，不因标题相同合并。','已办和本人查看不得出现任务提交；数值0/1及动作权限分别决定本人条件操作。','切换身份/空间、退出再登录后旧缓存和迟到响应不能带入新作用域；直接改query不扩大权限。','导航失败、空列表、权限失败和接口失败分别展示；返回恢复各页已提交条件。'];
  if(kind==='handling')return ['从taskId进入四页签详情；验证todo/info、快照、节点请求，只有upcoming有任务办理与提交。','通过1、驳回4、委办5、转派6各按条件验证；空白意见、71字符、本人委派、失效人员及错误optType阻止请求；16协议未接通禁止提交。','提交体恰为optType/taskId/comment/ccUid/userStr/newAssigneeId；userStr为数组；重复点击只有一个在途请求，服务端回读同一办理结果。','注入202拒绝、5xx、超时、并发已办理和会话失效：失败不提示成功，保留仍授权草稿；结果未知先核状态，禁止盲目重放。','切换操作不残留不适用人员，迟到节点响应不覆盖人工选择；离页取消继续填写，成功确认返回并恢复列表，任务已结束不能再提交。'];
  if(kind==='mine')return ['分别用状态数值0/1/2/3/4及权限组合核对操作：0编辑/启动/删除，1撤回/催办，其余查看；校验服务端直接访问仍受限。','草稿编辑按formId快照回填，校验后POST update只含title/id/bizInfo；失败留窗；启动传id/title/ccUid/categoryCode/appKey且取消不发请求。','删除只在不可恢复确认后DELETE当前业务id，取消不删；撤回先确认后传procInstId/optType=2，不删除节点或源资源。','催办空白/201字符阻止提交，合法200字符传comment与optType=14；超时先核查，不能把成功回执认作已送达。','重复动作、并发状态变化、失权、解析及网络失败不产生虚假成功；回读列表状态且恢复筛选，草稿关闭放弃不自动保存。'];
  if(kind==='detail'||kind==='basic')return ['以bizCode读取业务，默认基本页签0，双列字段、条件抄送/来源与只读状态匹配，id与taskId不混用。','标题、时间、duration、procStatus、bizResult按各自字段显示；0不当空值，未知字典不转草稿，长文本可完整读取。','基本、表单、历史共享同一bizCode及版本；更换query或快速切换后迟到响应不串入其他业务。','注入无权、不存在、服务拒绝、5xx和损坏JSON：分别报错，不伪造空数据或成功；重试当前对象。','顶右返回恢复本人列表条件；无保存或审批请求，URL改optType/space/tableName不能取得额外权限。'];
  if(kind==='form')return ['有快照样本按formId与bizInfo呈现真实字段和原值，表单isDisabled=true，字段顺序按发布快照。','成功无formId/无formJson显示空态，网络/解析/版本失败显示错误；三种情况不能混为“暂无表单”。','历史业务必须使用对应快照，不用最新设计覆盖；切换业务后不得残留原值或候选。','输入、上传、提交及远程控件安全检查证明只读不会触发业务写请求；附件直接访问仍鉴权。','长表单滚动、重试、返回和会话过期均可恢复正确对象；当前只有空态截图，有字段布局用隔离快照另验。'];
  if(kind==='history')return ['按实例POST record并GET diagram，图与记录均属于当前业务；不把tableName或标题当查询身份。','表格8列及createTime/finishTime/duration/comments/optName映射正确；多意见换行，未知时间不伪造0时长。','图像加载失败不清成功记录，记录失败不假报无审批；分别重试并提示实例上下文。','使用脚本标记意见、candidate尾标记_*与type字符串19样本：无脚本执行，特殊参与者有文字说明，提示由容器明确处理。','快速换工单、重复开关页签与无权实例访问不串数据或重复请求；销毁释放objectURL，返回无办理请求。'];
  const done=kind==='done';return [done?'已办请求done/page，详情done/info，标题为我的已办且没有节点期限/办理/提交；不能以滞留截图判通过。':'加载候选后请求todo/page，展示任务标识/节点期限及条件空间列；title/applicantName正确trim。','业务/标题/发起人/日期/类型组合查询、清空及重置映射正确，'+(done?'已办':'待办')+'使用createTimeStart/createTimeEnd而非applyTimeStart/applyTimeEnd。','第2页、更改条数、查询回1页及返回恢复按嵌套pageRequest生效；数组和datas/total合法分支分别验证。','空结果、候选失败、202、5xx、超时和权限失败区分展示；错误解除loading且重试不清查询，旧响应不盖新条件。',done?'只读查看和返回不发送deal/start/update/DELETE；直接伪造upcoming不得取得办理权。':'办理导航取当前taskId，重复点击不重复导航；服务端拒绝过期/越权任务，列表刷新不自动提交办理。'];
}
const NFRS=[
  ['WO-NFR-001','权限与会话','列表、候选、业务详情、快照、图、记录、每类动作逐资源鉴权；跨用户/租户/空间和改query均不扩大权限；过期清除受限内容且不自动重放。','隔离身份矩阵直接调用合法/越权对象；拒绝时业务写入0次、敏感字段泄漏0项。','WO-001、WO-500～506'],
  ['WO-NFR-002','传输与内容安全','业务及人员资料使用TLS；日志、缓存、模型输入不含真实凭据。动态formJson、意见、candidate和流程图按不可信内容处理，远程控件/附件按授权白名单读取，不能执行脚本或自选外部地址。','标记数据经请求/日志/存储检查；脚本/恶意URL测试无代码执行和越权请求；查看页写请求0次。','WO-500～506'],
  ['WO-NFR-003','查询及交互性能','隔离基准中列表查询到本次数据/分页可操作P95≤3秒，详情基本资料P95≤4秒；本地控件反馈P95≤100ms，忙碌反馈≤200ms。','按本节口径各≥200样本报告P50/P95/P99、最大值及全部失败；不足样本/资源信息缺失不判通过。','WO-100、WO-001、WO-500～506'],
  ['WO-NFR-004','办理一致性与防重','同任务/同业务动作最多1个在途提交；并发和重试由服务端事务与去重契约保证至多1个逻辑结果，源业务与流程状态不会部分宣告成功。','20组同任务双会话竞争和重复提交，核服务记录与源业务：重复结果0、未经授权流转0；结果未知先核查。','WO-500、WO-502'],
  ['WO-NFR-005','超时、取消与恢复','每类请求采用有限且可审查的超时；查询不超过20秒的目标窗口，超时后解除loading。写入超时不宣称失败未执行，先查结果；关闭模态/返回不能自动提交。','故障注入断网、202、5xx、超时及响应丢失；核有效草稿、锁、结果核查与请求数，未确认的自动写重放0次。','WO-100、WO-500～506'],
  ['WO-NFR-006','版本与异步隔离','列表结果绑定已提交条件/身份/空间，业务、formId快照、节点与历史绑定同一对象版本；迟到响应不覆盖新选择，原始数值状态不被显示文案覆盖。','交错A/B查询、表单/业务并行响应、节点迟到及用户切换至少20组，串数据和错误放权0次。','WO-001、WO-500～506'],
  ['WO-NFR-007','审计与可观测性','动作审计记录操作者及作用域、taskId/业务id/实例、动作、请求关联、前后状态、时间和结果；意见/人员仅在授权审计中读取，通用技术日志不收完整表单和凭据。','串联办理/编辑/启动/删除/撤回/催办各成功和拒绝样本，能够关联真实结果，伪造成功或秘密泄漏0项。','WO-500、WO-502'],
  ['WO-NFR-008','兼容与布局','Windows 11上当前稳定Chrome/Edge记录实际版本；1366×768、1500×1000、1920×1080及200%缩放；320 CSS像素宽时内容重排，宽表格在自身滚动区展示，模态不越界且操作可达。','三列表、详情三/四页签、700/500px模态、长标题/意见/历史逐矩阵检查，无页面级内容遮挡或不可达确认/返回。','WO-100、WO-001、WO-500～506'],
  ['WO-NFR-009','可访问性','筛选、动态表单、单选、页签及按钮有标签和可见焦点；错误关联具体字段，模态焦点受控并回到入口；状态/参与者不能仅靠颜色区分，流程图有文字轨迹替代。','键盘完成查询、选择、校验与取消，读屏播报页签/错误/忙碌；文本对比度普通≥4.5:1，大字及非文本控件≥3:1，自动扫描加人工核查。','WO-100、WO-500～506'],
  ['WO-NFR-010','历史与留存','审核历史只追加或按批准政策处置，业务草稿删除不等于删除已完成历史/源资源；时间时区、duration、期限及保留策略使用版本化契约，未知值不伪补。','隔离完成/撤回/草稿删除样本核历史关联与授权留存；图、记录及业务对象一致，未经政策删除0次。','WO-500、WO-502、WO-506'],
  ['WO-NFR-011','资源与长时稳定','离页释放请求、定时器、监听、搜索候选、动态表单资源和流程图objectURL；首节点默认不靠1秒定时覆盖人工动作。','100次进入/切出详情和历史，追踪createObjectURL/revokeObjectURL数量及在途请求，离页后遗留URL/定时更新0；保留内存基线及快照。','WO-500～506'],
  ['WO-NFR-012','契约与可维护性','路由/状态/操作码、formJson版本、pageRequest、错误DTO和调用端参数统一管理；文档生成可重复，发布编号与历史来源不丢失；模块前缀由配置解析。','契约测试覆盖todo/done/biz、六字段办理和各本人动作；生成器刷新无变化，拒绝编号/截图/原文摘要丢失及伪造通过。','WO-100、WO-001、WO-500～506'],
  ['WO-NFR-013','AI质量、权限与成本','AI仅对用户明确选择且有权读取的表单/轨迹生成摘要、意见草稿和遗漏提醒，引用原记录；不自动通过、驳回、转派、保存、撤回或催办。单次最多20条轨迹且输入≤12000字符、输出≤2000字符，30秒超时可取消；取消丢弃迟到输出。','人工标注30例：来源引用可回溯100%、越权/自动动作0、关键事实一致率≥95%；≥50次测总体完成P95≤20秒并报失败/取消；每次记录token和版本化预算，超额不调用且人工流程可用。','WO-500、WO-503～506'],
];
function screenshot(id){const folder=/^[HU]-WO/.test(id)?'live-recheck-20261022/':'';return `[${id}截图](../evidence/${folder}${id}.png) / [元素](../evidence/${folder}${id}.json)`;}
function renderFeature(entry){
  const p=PROFILES[entry.kind];if(!p)throw new Error('WO unknown feature profile');
  const type=entry.kind==='handling'?'待办查询与节点办理':entry.kind==='mine'?'本人业务查询与条件维护':['detail','basic','form','history'].includes(entry.kind)?'只读详情/页签':entry.kind==='identity'?'导航与身份分区':'读取与查询';
  return [`### ${entry.id} ${entry.title}`,'',`**功能入口**：${p.route}。`,'',`**操作类型**：${type}。`,'',`**业务目的**：${p.goal}`,'',
    '**前置条件**：已登录且服务端允许访问当前资源；涉及办理或本人维护时另外具有对应动作权限，菜单和URL不授予权限。','',`<!-- 完整规格:${entry.id} -->`,'',
    `#### 1. 页面字段清单（${entry.id}）`,'',...table(['字段名称与绑定名','类型/控件','是否必填','默认值','长度/范围/单位','格式及校验规则','错误提示','条件/状态'],p.fields),
    '空白属性不等于无校验或允许AI自定；客户端约束和服务端契约分别核对。只读字段不作为可填写参数，样本日期、人员、条数和当前状态不是固定默认值。','',
    `#### 2. 页面交互规则（${entry.id}）`,'',...table(['控件/触发方式','行为、联动、禁用与反馈'],p.controls),
    `#### 3. 业务流程与异常分支（${entry.id}）`,'','**操作与规则**：','',...p.flow.map((s,i)=>(i+1)+'. '+s),'','**结果与异常处理**：','',
    ...table(['异常分支','页面结果、数据影响及恢复'],[
      ['候选/对象/快照读取失败','指出失败对象并可局部重试，保留仍有效的查询或草稿；依赖未就绪不允许提交。不把加载失败当无记录或无表单。'],
      ['无权/会话过期/对象已不存在','停止访问并清无权内容；提示重新登录或返回。保留草稿的前提是仍具备访问权，跨身份不恢复敏感内容。'],
      ['202业务拒绝/网络超时/5xx/解析错误','按真实错误契约区分业务与技术失败；读可按原条件重试，写入未知结果先核对象/任务状态，不能自动重放。'],
      ['迟到/状态变化/重复触发','旧对象、旧条件和旧节点响应不得覆盖当前界面；同目标在途锁、状态回读及服务端并发契约共同保护，前端隐藏按钮不证明后端已保护。'],
    ]),
    `#### 4. 接口与数据规则（${entry.id}）`,'','**请求方法与相对路径**：标识、query与body分别映射，以下按当前默认网关给出真实调用端模型。','',...table(['用途','HTTP方法','相对路径','请求参数、来源与转换','返回读取与页面处理'],p.requests),
    '**开发处理细则**：使用父应用公共会话客户端，网关基址/back，模块前缀由MODULE_URL_PREFIX覆盖；本稿路径按当前默认/common/workflow与/common/user解析。JSON请求采用application/json，GET参数位于query，其余body。普通成功链解包response.data，HTTP 202进入公共业务错误reject；不能另造code=0或未查到的返回ID。列表响应契约、各字段类型及动作回读按[公共数据规则](./子页面与操作细化.md#4-字段枚举和约束)与后端交付契约联调。','',
    `#### 5. 验收标准（${entry.id}）`,'',...table(['验收编号','操作与可检查结果','关联需求','状态'],acceptanceFor(entry.kind).map((s,i)=>['WO-AC-'+String(entry.start+i).padStart(3,'0'),s,entry.id,'未执行'])),
    `#### 6. 权限与安全要求（${entry.id}）`,'',
    '- 允许访问本页面的身份须具备当前对象的读取权限；服务端分别鉴权待办、已办、本人业务、发布表单、图/历史、候选及办理/编辑/启动/删除/撤回/催办；按当前账号、租户和空间限制数据，直接改taskId、bizCode、id、formId或tableName不能扩大范围。',
    '- taskId是节点任务，业务id是本人记录，bizCode/procInstId是关联流程身份；不允许以客户端可见状态代替当前归属、动作与人员资格检查，不能给普通用户默认管理员权限。',
    '- 只读表单的禁用态不能替代接口授权；动态配置、意见、参与者和图像均视为不可信输入。业务链路使用TLS，凭据不进入日志、截图说明、浏览器草稿或AI；操作记录按授权审计留存。','',
    `#### 7. 页面布局与状态（${entry.id}）`,'',...p.layout.map(s=>'- '+s),
    '- 初始化/依赖读取、内容可用、合法空态、读取失败、失权分别展示。办理或维护另有校验错误、提交中、业务拒绝、未知结果核查和成功回读；只读页没有提交中。屏幕缩放、长文本、滚动及焦点按模块非功能要求验收。','',
    `#### 8. 关联文档（${entry.id}）`,'',...entry.sources.map(s=>'- '+screenshot(s)+'。'),
    '- 静态证据组：'+p.sources.map(id=>'WO-SRC-'+id).join('、')+'；公共调用另见GATEWAY、SHELL-REQUEST、BASE与CONFIG，公共查询/候选控件见WO-SRC-CONTROLS，各组时间/原文/摘要见[专项原文](../evidence/wo-review-20261026/index.json)。',
    '- [核查记录](./核查记录.md) · [截图与证据索引](../evidence/wo-review-20261026/README.md) · [公共数据规则](./子页面与操作细化.md#4-字段枚举和约束) · [非功能性需求](./需求说明.md#9-非功能性需求)。全部应用验收未执行；外部依赖与目标修正独立登记。','',
  ].join('\n');
}
function section(text,n){const h=[...text.matchAll(/^## (\d+)\.[^\n]*\n/gm)],i=h.findIndex(x=>Number(x[1])===n);return i<0?'':text.slice(h[i].index+h[i][0].length,h[i+1]?.index??text.length);}
function preservedAcceptance(previous,type){
  const entries=type==='main'?MAIN:SUB,start=type==='main'?1:500,count=type==='main'?6:21;
  const expected=entries.flatMap(e=>Array.from({length:5},(_,i)=>e.start+i)).concat(Array.from({length:count},(_,i)=>start+i)).map(n=>'WO-AC-'+String(n).padStart(3,'0'));
  const actual=[...previous.matchAll(/^\| (WO-AC-\d{3}) \|/gm)].map(m=>m[1]);
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('WO published acceptance rows missing, duplicated or reordered');
  const centralized=section(previous,6).split(/\r?\n/).filter(l=>/^\| WO-AC-\d{3} \|/.test(l));
  const counts=new Map();
  return table(['编号','操作与可检查结果','关联需求','状态'],centralized.map(row=>{
    const c=row.split('|').slice(1,-1).map(x=>x.trim()),ref=c.find(x=>/^WO-\d{3}$/.test(x)),entry=entries.find(e=>e.id===ref);
    if(!entry)throw new Error('WO centralized acceptance association missing');
    const i=counts.get(ref)||0;counts.set(ref,i+1);
    let desc=acceptanceFor(entry.kind)[i%5];
    if(type==='main'&&c[0]==='WO-AC-004')desc=acceptanceFor('todo')[3]+' 从详情返回恢复已提交条件、页码与排序。';
    if(type==='main'&&c[0]==='WO-AC-005')desc='使用两个隔离用户/空间查询并直接改taskId或空间上下文，服务端拒绝越权，不泄露标题、人员或表单。';
    if(type==='main'&&c[0]==='WO-AC-006')desc='导航/候选/列表/表单/图/记录失败分别展示；无结果与加载失败分开，不用0计数冒充失败响应，保持三个身份的数据来源。';
    return [c[0],desc,ref,'未执行'];
  }));
}
function sharedRules(){return [
  '### 身份、枚举与参数映射','',...table(['参数/对象','类型与来源','规则及适用范围'],[
    ['taskId','待办/已办当前行及query.id','节点任务稳定标识，用于todo/info、done/info、next/node、return/node及办理deal；不同于业务id。'],
    ['id/bizCode/procInstId','本人业务行与详情','id用于update/start/DELETE；bizCode用于biz/one，撤回/催办以procInstId键传行bizCode；历史优先详情procInstId，无值再用bizCode。'],
    ['categoryCode','string或服务原始ID，来自候选','业务编号及单选值；categoryName只显示，不把名称传成标识。'],
    ['title/applicantName','string，输入trim','title用于三列表；applicantName只用于待办/已办。长度属性空白按后端交付契约补齐，不套用意见70或催办200。'],
    ['applyTimeRange','本地日期时间数组','原列表mixin会连同整个筛选模型透传；服务端接受字段须与DTO核对，不把本地数组擅改成后端必填。'],
    ['createTimeStart/createTimeEnd','string或null','待办/已办的日期映射，yyyy-MM-dd HH:mm:ss；清空各置null。'],
    ['applyTimeStart/applyTimeEnd','string或null','本人业务单使用本组日期键，与任务列表不同；区间边界/时区由服务端契约定义。'],
    ['procStatusList','array<number>','本人多选：0草稿、1处理中、2挂起、3结束、4已撤回；选项Number(t)，不能误写字符串数组。'],
    ['optTypeList','array<number>','本人审核筛选：-1待发起、0审核中、1任务完成、2任务发起人撤回；0不能被if(!value)当空。显示bizResult是另一个返回字段。'],
    ['bizTypeList/bizType','array<number>/number','1需求工单、2质检工单、3测评工单、4运维工单、5指标工单、6审批、7其他。不是固定某个业务名称集合。'],
    ['pageRequest','object','{pageNo:1,pageSize:20,order:[{prop:"id",asc:false}]}；查询与重置回1页，修改页大小回1页。响应按datas/total或数组消费；服务端可排序字段/分页上限发布契约，不拿HTML样本max=1作上限。'],
    ['obscureName/id/name','string/服务原始ID/string','人员搜索键、选项值与显示；首屏pageRequest={pageNo:1,pageSize:20}，普通滚动递增页，非空搜索固定第1页/200条。读取datas及普通列表total；搜索结果超过200需契约分页，200不等于人员/可选数量上限，不猜额外phone/department/tenant参数。'],
  ]),
  '### 任务办理模型与动作边界','',
  '待办独立页按pageType=upcoming显示四页签，已办done显示基本、表单、审核历史并只读；与工作台stageWorkflowDialog不是同一布局或事件链。办理源对象是taskId，本人业务操作源对象是id/bizCode，不能共用删除或保存事件。','',
  ...table(['参数/控件','类型/输入来源','规则'],[
    ['optType','number','1通过、4驳回、5委办、6转派、16选择节点；操作可见受业务类别及countersignNeed条件限制，服务端最终鉴权。'],
    ['comment','string','trim必填70字符，原文案“请输入审核意见”；必填触发blur/change。'],
    ['ccUid','array<ID>','抄送，多选默认[]。'],
    ['userStr','array<ID>','来自ruleForm.userIds，名称虽为Str仍传数组，默认[]；不转成逗号字符串。'],
    ['newAssigneeId','ID或null','委办5/转派6单选必填，其他分支保持null并清不适用值；排除本人不是后端权限证明。'],
    ['backTaskSid/nodeId/nameStr','本地key/客户端UUID/显示字符串','通过时首节点默认且禁用，审核人由relateIds显示；nodeId用于本地选项，不是后端任务id；六字段提交不含这三个键。'],
    ['nextNodes/historyNodes','array<object>','按taskId读后继/可退回节点；读取historyNodes不代表驳回控件支持任选节点。16分支缺完整数据/提交协议，接通前禁止提交。'],
  ]),
  '办理提交体严格为 `{optType,taskId,comment,ccUid,userStr:ruleForm.userIds,newAssigneeId}`。流程状态保留原始数值，显示文案单独计算；挂起/结束/已撤回与无办理资格时不允许提交，其他情况仍由服务端核当前归属。提交锁覆盖所有入口；成功提示确认返回上一页并回读，结果未知先查状态。','',
  '### 本人业务单操作矩阵','',...table(['状态/操作','入口与请求模型','结果及取消边界'],[
    ['查看：全部状态','myWorkflowAndCopy2MeEdit，query procStatus/formId/bizCode/tableName/optType=view','业务及表单均只读；返回不提交。'],
    ['编辑：数值0且update权限','700px动态表单；POST update {title,id,bizInfo:JSON.stringify(提交数据)}','先biz/one及form/one读取；title原行值不另设编辑框，失败保留草稿。'],
    ['启动：数值0且start权限','700px抄送多选；POST start {id,title,ccUid,categoryCode,appKey:"ubp"}','抄送可空；不臆造必填部门/角色；等待结果，取消不发起。'],
    ['删除：数值0且delete权限','不可恢复确认后DELETE /act/biz/{id}','只删除此业务草稿；不是删除待办任务或源业务资源；取消不发送。'],
    ['撤回：数值1且revoke权限','确认后POST deal {procInstId:行bizCode,optType:2}','当前原事件直接提交，目标加范围确认；撤回资格、并发和事务由后端校验。'],
    ['催办：数值1且urge权限','500px，message必填200字符；POST deal {procInstId:行bizCode,comment:message,optType:14}','原提示“催办成功”不证明送达；失败留窗，重复/频率政策以发布契约为准。'],
  ]),
  '### 动态表单、响应与恢复','',
  'form/one固定needSnapshot=true；formJson解析为formConf，bizInfo解析为echoFormData。本人查看与任务查看isDisabled=true，本人草稿编辑false；每个业务字段与校验由对应发布快照提供，不按空态截图虚构通用表单。必须校验业务与表单版本匹配，并对远程控件/附件、JSON解析及不可信表达式做独立安全约束。','',
  '公共链普通成功resolve response.data，HTTP 202按NETWORK_ERROR_CODE进入业务错误reject；没有统一code=0结论。列表读datas/total或数组；动作当前只在Promise成功后提示，真实业务成功、返回ID/版本和核查协议必须由后端契约规定，不能用HTTP成功替代业务结果。20秒是公共客户端兜底及本稿查询超时目标，URL级配置可覆盖，不能当全路径实测值。','',
  '流程图GET按草稿分类、实例或定义优先分支取blob，创建objectURL，换图/销毁释放；历史POST按实例取记录。接收时间实际读createTime，duration与期限按返回显示。图与记录失败独立重试，空数组和失败严格区分。','',
  '### AI辅助摘要、意见草拟与遗漏检查','',
  '在用户主动打开的任务或本人详情提供三个规划能力：从所选表单/轨迹生成事实摘要；按用户选定的办理意图草拟审核意见；提示前后资料冲突或材料遗漏。输入只含当前授权、用户明确勾选的字段与记录，不自动读取其他工单或向模型提供凭据。每条结论给来源字段/轨迹索引，区分事实与建议，不改变流程状态。','',
  '人工逐条采纳后才可撤销地写入当前意见草稿，仍受70字符校验；超长意见须人工编辑或选择经确认的精简稿，不静默截断。没有当前编辑权限时只展示只读建议。AI不得自行选择通过/驳回、设置人员、启动、撤回、催办、删除或保存；模型失败、取消和预算限制不阻断人工查询/办理。接入前单独定义模型服务契约，不虚构现网AI接口。质量、引用、30秒取消与token预算见WO-NFR-013。','',
];}
function renderNfrSection(){return ['## 9. 非功能性需求','',
  '以下13项是开发验收要求，全部未执行；数值目标来源、现有差异及外部依赖见[核查记录](./核查记录.md)。','',
  ...table(['编号','质量属性','需求与指标/不变量','验收方法及通过条件','关联功能','状态'],NFRS.map(r=>[...r,'未执行'])),
  '性能环境与口径：仅在获授权隔离环境执行，记录构建、Windows/浏览器实际版本、客户端CPU/内存、网关/服务/数据库资源及索引，保持真实权限和安全策略；以每身份可见业务记录1万条及代表性动态表单/历史分布为基准，网络10Mbps上下行、50ms RTT。10个独立读会话含1秒思考时间，预热2分钟、统计10分钟；冷/热缓存每类查询及基本详情各≥200次。计时从点击/Enter至该次数据、分页与入口可操作，同一单调时钟；分位取升序第ceil(p×N)项，报告P50/P95/P99/最大值、样本量、实际吞吐及全部失败。合法请求5xx、超时、解析及错误业务结果计技术失败，业务拒绝与限流另列且不隐去。动态表单/图/历史分段统计，不以基本页完成声称全部加载。并发不等于QPS；没有真实样本/环境不得判通过，也不推导月可用率或恢复SLA。',''];}
function boundaries(){return table(['历史操作编号','原登记操作','具体范围与实现边界'],[
  ['WO-101','查看我的待办工单','节点taskId进入独立四页签办理/查看；WO-500补齐，不能拿本人详情的三页签截图当待办办理实拍。'],
  ['WO-102','新增我的待办工单','三列表无人工新增待办入口；任务由源业务/流程服务创建。本人草稿启动不是任意新增待办表单，不虚构POST创建任务。'],
  ['WO-103','修改我的待办工单','节点办理是deal动作，不是通用任务编辑；本人草稿编辑使用biz/update，见WO-502。'],
  ['WO-104','删除我的待办工单','列表无删除待办入口；本人草稿DELETE biz/{id}不等于删除任务、已办或源资源。'],
]);}
function renderDocument(type,previous){
  const entries=type==='main'?MAIN:SUB,ac=preservedAcceptance(previous,type);
  const sourceRows=section(previous,8).split(/\r?\n/).filter(l=>/^\| WO-\d{3} \|/.test(l));
  if(type==='main'&&JSON.stringify(sourceRows.map(l=>l.split('|')[1].trim()))!==JSON.stringify(MAIN.map(e=>e.id)))throw new Error('WO published source rows missing or reordered');
  const parts=type==='main'?[
    '## 1. 业务目标与使用角色','','为获授权用户查找需办/已办节点及本人业务申请，核对表单和流转轨迹，并在允许状态执行办理或本人业务动作。角色由服务端当前动作与数据范围矩阵定义，不凭一个账号命名管理员权限。入口：需求管理 → 我的工单 → 工单管理。','',
    '## 2. 业务范围','','保留2项主功能、7项子页面/操作、4个历史操作边界和72条功能验收编号。范围覆盖三列表、独立任务三/四页签详情、本人三页签详情、草稿编辑/启动/删除及处理中撤回/催办。工单不是单一对象CRUD；源业务单、业务记录、流程实例、节点任务、发布表单快照和办理记录分别管理。','',
  ]:[
    '## 1. 范围与入口','','细化[模块主规格](./需求说明.md)的7项子页面/操作，逐项给出字段、控件、请求参数、异常、布局和验收；9项主/子规格合计72条功能验收，质量要求另列13项。','',
    '## 2. 页面与资料覆盖','','历史PNG/元素为2026-10-22，本次2026-10-26沿workorder自身组件、API、语言、网关和公共客户端核对；没有本次浏览器点击、新截图或业务请求。原时间、视口和冲突见[专项证据索引](../evidence/wo-review-20261026/README.md)。','',
    ...table(['页面/操作','功能编号','截图/元素','覆盖边界'],SUB.map(e=>[e.title,e.id,e.sources.map(screenshot).join('；'),e.kind==='done'?'导航高亮已办而正文仍待办；不作已办正常内容证据':e.kind==='form'?'仅无表单空态；完整表单由对应发布快照定义':e.kind==='handling'?'有待办列表；办理全页和条件模态按组件定义补充，无新实拍':'历史页面/页签样本'])),
  ];
  return ['# 我的工单'+(type==='main'?'业务需求说明':'子页面与操作需求细化'),'','<!-- 业务规格格式:plain-v1 -->','<!-- wo:generated-spec-v1 -->','',
    '修订日期：2026-10-26。正文直接定义目标规则；来源、原系统差异和后端交付依赖集中在[核查记录](./核查记录.md)。','',...parts,
    type==='main'?'## 3. 功能需求':'## 3. 编号功能需求','',...entries.map(renderFeature),
    type==='main'?'## 4. 字段与业务规则':'## 4. 字段、枚举和约束','',
    ...(type==='main'?['taskId、业务id、bizCode/procInstId及formId不可互换；原始状态与显示文案分离。三类列表的日期键、分页与状态枚举、精确六字段办理、本人操作矩阵、动态快照和响应规则见[公共数据规则](./子页面与操作细化.md#4-字段枚举和约束)。','']:sharedRules()),
    type==='main'?'## 5. 主要业务流程':'## 5. 主要流程','',
    '1. 选择我的待办、我的已办或我的工单，读取候选后在授权范围内查询。\n2. 待办按taskId进入独立详情，核对基本/只读表单/历史后选择适用动作、填写意见及人员并人工提交。\n3. 已办按taskId只读查看；本人业务按bizCode和formId查看基本、表单快照和历史。\n4. 本人草稿按动作权限编辑、启动或确认删除；处理中可确认撤回或填写催办，其他状态只读查看。\n5. 明确成功后回读同一业务及节点状态；未知结果先核查；返回恢复原列表条件。源业务与工单状态联动由后端契约保证，不能由导航或成功文案推断。','',
    type==='main'?'## 6. 验收标准':'## 6. 验收用例','',type==='main'?'以下6条集中用例及功能内10条共16条；全部未执行。':'以下21条集中用例及功能内35条共56条；全部未执行。与主文档合计72条功能验收，非功能13项另列。','',...ac,
    '## 7. 实现与交付边界','','字段、已知调用模型、相对接口和目标交互足以支持本范围页面与调用端开发。真实办理/维护交付仍依赖后端DTO与错误结构、动作/数据权限矩阵、会签与16节点协议、事务/去重/未知结果核查、动态表单版本和远程读取、通知送达与历史留存等[外部契约](./核查记录.md#外部依赖)。不允许AI自选成功码、人员资格、流程规则或缺失接口；相关端到端能力不宣称已就绪。','',
    ...(type==='main'?boundaries():['4个历史操作编号的具体范围见[主文档第7节](./需求说明.md#7-实现与交付边界)。','']),
    'AI摘要、意见草拟及遗漏提醒属于独立规划，采纳只更新人工意见草稿，不执行任何办理/维护，详见[AI辅助规则](./子页面与操作细化.md#ai辅助摘要意见草拟与遗漏检查)及WO-NFR-013。历史[AI-001规划](../AI能力规划.md#ai-001-需求申请补全与相似需求检索拟定需求)登记保持原义，不当作本次已实现能力。','',
    type==='main'?'## 8. 关联资料':'## 8. 来源链接','',
    '[主规格](./需求说明.md) · [子页面细化](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [专项证据](../evidence/wo-review-20261026/README.md) · [历史调研归档](./调研记录.md) · [总索引](../README.md)','',
    ...(type==='main'?[...table(['需求编号','界面依据','详细记录'],[]).slice(0,2),...sourceRows,'',...renderNfrSection()]:[]),
  ].join('\n');
}
function renderMain(previous){return renderDocument('main',previous);}
function renderSub(previous){return renderDocument('sub',previous);}
function writeDocuments(root){const dir=path.join(root,'doc/requirements/06-我的工单');for(const [file,type]of [['需求说明.md','main'],['子页面与操作细化.md','sub']]){const target=path.join(dir,file);fs.writeFileSync(target,renderDocument(type,fs.readFileSync(target,'utf8')));}}
module.exports={MAIN,SUB,PROFILES,NFRS,acceptanceFor,renderFeature,renderMain,renderSub,renderNfrSection,writeDocuments};
