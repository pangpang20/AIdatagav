/* Business requirements for DRMS, derived from the registered evidence set. */
const fs = require('node:fs');
const path = require('node:path');

const EVIDENCE = '../evidence/live-recheck-20261022/';
const MAIN = [
  { id:'DRMS-100', title:'查询项目', kind:'projectList', sources:['P-DRMS-002'], start:539 },
  { id:'DRMS-102', title:'新增项目', kind:'projectAdd', sources:['P-DRMS-002-op1','P-DRMS-002-op1-options0'], start:544 },
  { id:'DRMS-103', title:'修改项目', kind:'projectEdit', sources:['P-DRMS-002-op2'], start:549 },
  { id:'DRMS-105', title:'查询需求', kind:'requirementList', sources:['Y-DRMS-003'], start:554 },
  { id:'DRMS-107', title:'新增需求', kind:'requirementAdd', sources:['T-DRMS-requirement-add-direct'], start:559 },
  { id:'DRMS-110', title:'查询任务中心', kind:'taskLists', sources:['P-DRMS-004','P-DRMS-005','P-DRMS-006'], start:564 },
  { id:'DRMS-115', title:'查询需求咨询', kind:'advisoryList', sources:['P-DRMS-007'], start:569 },
  { id:'DRMS-117', title:'新增需求咨询', kind:'advisoryAdd', sources:['P-DRMS-007-op1'], start:574 },
  { id:'DRMS-001', title:'查看需求规模', kind:'kanban', sources:['P-DRMS-001'], start:579 },
  { id:'DRMS-002', title:'跟踪需求办理进度', kind:'workflowProgress', sources:['P-DRMS-004','P-DRMS-005','P-DRMS-006','Z-DRMS-003'], start:584 },
];
const SUB = [
  { id:'DRMS-500', title:'需求看板 → 需求看板', kind:'kanban', sources:['P-DRMS-001'], start:589 },
  { id:'DRMS-501', title:'项目管理 → 我的项目', kind:'projectList', sources:['P-DRMS-002'], start:594 },
  { id:'DRMS-502', title:'项目管理 → 我的项目 → 新增', kind:'projectAdd', sources:['P-DRMS-002-op1','P-DRMS-002-op1-options0'], start:599 },
  { id:'DRMS-503', title:'项目管理 → 我的项目 → 编辑', kind:'projectEdit', sources:['P-DRMS-002-op2'], start:604 },
  { id:'DRMS-504', title:'需求管理 → 我的需求', kind:'requirementList', sources:['Y-DRMS-003'], start:609 },
  { id:'DRMS-512', title:'需求管理 → 我的需求 → 新增', kind:'requirementAdd', sources:['T-DRMS-requirement-add-direct'], start:614 },
  { id:'DRMS-505', title:'任务中心 → 我发起的任务', kind:'taskMy', sources:['P-DRMS-004'], start:619 },
  { id:'DRMS-506', title:'任务中心 → 待处理任务', kind:'taskPending', sources:['P-DRMS-005'], start:624 },
  { id:'DRMS-507', title:'任务中心 → 已处理任务', kind:'taskProcessed', sources:['P-DRMS-006'], start:629 },
  { id:'DRMS-508', title:'需求咨询 → 咨询列表', kind:'advisoryList', sources:['P-DRMS-007'], start:634 },
  { id:'DRMS-509', title:'需求咨询 → 咨询列表 → 新增', kind:'advisoryAdd', sources:['P-DRMS-007-op1','P-DRMS-007-op1-options0'], start:639 },
  { id:'DRMS-510', title:'需求咨询 → 咨询处理', kind:'advisoryHandle', sources:['Z-DRMS-008'], start:644 },
  { id:'DRMS-511', title:'需求咨询 → 共用新增咨询表单', kind:'advisoryAdd', sources:['P-DRMS-008-op1','P-DRMS-008-op1-options0'], start:649 },
];

const FIELDS = {
  projectQuery: [
    ['项目编号','projectNo','string / text','否','','','','','可清空'],
    ['项目名称','projectName','string / text','否','','','','','可清空；输入时trim'],
    ['所属部门','deptId','ID / select','否','','','','','候选项来自当前用户部门列表'],
    ['创建时间开始','beginCreateTime','string / date','否','','','yyyy-MM-dd输入，序列化为T00:00:00','','展开筛选后使用'],
    ['创建时间结束','endCreateTime','string / date','否','','','yyyy-MM-dd输入，序列化为T23:59:59','','展开筛选后使用'],
    ['页码','pageNo','number','是','1','','正整数','','列表Mixin默认值'],
    ['每页条数','pageSize','number','是','20','','正整数','','列表Mixin默认值'],
    ['排序','order','array<object>','是','[{prop:"id",asc:false}]','','','','列表Mixin默认按id降序'],
  ],
  projectForm: [
    ['项目名称','projectName','string / input','是','','最长50字符','trim后非空','请输入项目名称','新增、编辑均可维护'],
    ['所属部门','deptId','ID / searchable select','是','','','','请选择所属部门','编辑时仅form.relevance为真禁用'],
    ['项目描述','description','string / textarea','否','','最长500字符','trim','',''],
  ],
  requirementQuery: [
    ['需求编号','storyNo','string / text','否','','','','','可清空；非新增时编号只读'],
    ['需求标题','storyTitle','string / text','否','','','','','输入时trim'],
    ['申请部门','deptId','ID / select','否','','','','','候选项来自当前用户部门列表'],
    ['申请时间开始','beginCreateTime','string / date','否','','','yyyy-MM-dd输入，序列化为T00:00:00','','日期范围起点'],
    ['申请时间结束','endCreateTime','string / date','否','','','yyyy-MM-dd输入，序列化为T23:59:59','','日期范围终点'],
    ['需求状态','status','string / tab','否','','','','','全部=""；1待启动、2已启动、3已关闭'],
    ['页码','pageNo','number','是','1','','正整数','','列表Mixin默认值'],
    ['每页条数','pageSize','number','是','20','','正整数','','列表Mixin默认值'],
    ['排序','order','array<object>','是','[{prop:"id",asc:false}]','','','','列表Mixin默认按id降序'],
  ],
  requirementForm: [
    ['需求标题','storyTitle','string / input','是','','最长50字符','trim后非空','请输入需求标题','非新增时需求编号只读'],
    ['所属项目','projectId','ID / remote select','是','','','','请选择所属项目','传项目id；选中后联动申请部门'],
    ['业务用途','purpose','string / textarea','是','','最长500字符','trim后非空','请输入业务用途','基础信息页'],
    ['预期应用成效','expectedEffect','string / textarea','是','','最长500字符','trim后非空','请输入预期应用成效','基础信息页'],
    ['申请人','userInfo.name','string / readonly','','当前登录用户姓名','页面控件maxlength=100','','','仅展示当前用户；不显式构造applicant参数'],
    ['申请部门','deptName / deptId','readonly + id','','选中项目所属部门','','','','展示名称；请求传deptId'],
    ['字段名称','colName','string / input','是','','最长200字符','trim后非空','请输入字段名称','基础数据子表'],
    ['字段定义','colDesc','string / input','是','','最长200字符','trim后非空','请输入字段定义','基础数据子表'],
    ['数据类型','colType','string / select','是','','枚举','','请选择数据类型','短字符、较长字符、长字符、日期型、整数型、小数型、逻辑型、文本型'],
    ['字段长度','colLength','string / numeric input','按类型','','最长10字符；整数','非日期类型必填；仅数字','请输入字段长度','日期型不提交length'],
    ['字段精度','colPrecision','string / numeric input','按类型','','最长10字符；整数','仅小数型必填；仅数字','请输入字段精度','仅小数型提交'],
    ['是否主键','primaryKey','boolean / switch','','','true/false','','','转请求0/1'],
    ['是否必填','nullable','boolean / switch','','','true/false','','','主键开启时强制true且控件禁用；请求按该绑定名转0/1'],
    ['信息项说明','explain','string / textarea','否','','最长500字符','trim','',''],
    ['数据源名称','datasourceId','ID / select','数据源块非空时是','','','','请选择数据源名称','数据库信息页；关联已有数据源'],
    ['数据源分类','key','string / readonly','','','','','','选中数据源后联动，禁用'],
    ['主机名或IP地址','host','string / readonly','','','','','','选中数据源后联动，禁用'],
    ['数据库名','database','string / readonly','','','','','','选中数据源后联动，禁用'],
    ['Schema','schema','string / readonly','','','','','','选中数据源后联动，禁用'],
    ['临时附件','file','File / upload','否','','小于200MiB；格式白名单见NFR','','附件格式有误；附件大小不能超过200MB','选择后立即上传临时文件'],
  ],
  taskQuery: [
    ['任务名称','taskName','string / text','否','','','','','可清空'],
    ['协助部门','deptId','ID / cascader','否','','','','','发送末级部门标识'],
    ['关联需求','storyTitle','string / text','否','','','','','按需求标题条件查询'],
    ['任务状态','status','string / select','否','','枚举','','','展开筛选；查询侧排除status=1'],
    ['创建时间开始','createTimes[0] → beginCreateTime','string / date','否','','','','','展开筛选'],
    ['创建时间结束','createTimes[1] → endCreateTime','string / date','否','','','','','展开筛选'],
    ['页码','pageNo','number','是','1','','正整数','','列表Mixin默认值'],
    ['每页条数','pageSize','number','是','20','','正整数','','列表Mixin默认值'],
    ['排序','order','array<object>','是','[{prop:"id",asc:false}]','','','','列表Mixin默认按id降序'],
  ],
  taskForm: [
    ['任务名称','taskName','string / input','是','','最长50字符','trim后非空','请输入任务名称',''],
    ['期望更新频率','frequency','number / select','是','','1每日、2每周、3每月、4不更新','','请选择期望更新频率',''],
    ['协助部门','deptId','ID / cascader','是','','','','请选择协助部门','请求使用末级部门id'],
    ['任务描述','description','string / textarea','是','','最长500字符','trim后非空','请输入任务描述',''],
    ['提交方式','submitMode','number / radio','否','','1资源目录、2附件、3其它','','','代码校验未设required'],
    ['其它提交方式','submitOther','string / input','否','','最长50字符','','','submitMode=3时显示；其他模式提交前移除'],
    ['关联需求字段','columnRelation[]','array<object>','否','','','','','从需求字段选择，保存为关联草稿'],
    ['关联数据源','sourceRelation[]','array<object>','否','','','','','从需求数据源选择'],
    ['需求附件','taskRelation[]','array<object>','否','','','','','引用需求附件；filePath映射为fileKey'],
  ],
  advisoryQuery: [
    ['标题','title','string / text','否','','','','','输入时trim'],
    ['状态','status','number / select','否','','1待处理、2已完成、3已撤回','','',''],
    ['发起时间开始','applyTime[0] → beginCreateTime','string / date','否','','','','yyyy-MM-dd后拼T00:00:00',''],
    ['发起时间结束','applyTime[1] → endCreateTime','string / date','否','','','','yyyy-MM-dd后拼T23:59:59',''],
    ['页码','pageNo','number','是','1','','正整数','','列表Mixin默认值'],
    ['每页条数','pageSize','number','是','20','','正整数','','列表Mixin默认值'],
    ['排序','order','array<object>','是','[{prop:"id",asc:false}]','','','','列表Mixin默认按id降序'],
  ],
  advisoryForm: [
    ['标题','title','string / input','是','','最长50字符','trim后非空','请输入标题',''],
    ['发起部门','deptId','ID / select','是','','','','请选择发起部门','请求提交部门id'],
    ['发起人','userInfo.name','string / readonly','','当前登录用户姓名','','','','仅展示；不显式构造applicant参数'],
    ['附件标志','attachment','number / hidden','是','','1或空','','请上传附件','有附件时赋1；无附件时清空'],
    ['相关附件','advisorsAttachment[]','array<object> / upload list','是','','小于200MiB；格式白名单见NFR','','请上传附件','仅提交已上传引用；结构见接口映射'],
    ['需求描述','storyContent','string / textarea','是','','最长500字符','trim后非空','请输入需求描述',''],
    ['预计应用成效','expectedEffect','string / textarea','是','','最长500字符','trim后非空','请输入预计应用成效',''],
  ],
  kanban: [
    ['时间范围','dateType','number / radio','是','1','1本月、2本年、3全部','','','切换后重新统计'],
    ['项目数/需求数/任务数','projectNum / storiesNum / taskNum','number / card','','','','','','只读；初始0不代表查询成功'],
    ['需求完成进度/遗留任务状态','storiesProgress[] / taskProgress[]','array / chart','','','','','','读取showName/showValue'],
    ['需求进度排名','storiesProgressSort[]','array / ranking','','','','','','读取showName/finish/showValue'],
    ['需求规模排名','storiesNumSort[]','array / ranking','','','','','','读取showName/showValue'],
  ],
  workflow: [
    ['任务标识','id','ID / route','是','','','','','当前任务id'],
    ['流程任务标识','procTaskId','ID / route','按流程动作','','','','','不得用展示文本替代'],
    ['任务提交说明','taskExplain','string / textarea','提交时是','','最长500字符','trim后非空','请输入任务提交说明','签收模式只读'],
    ['任务附件','taskAttachment[]','array<object> / upload list','否','','小于200MiB','','','fileName/fileKey；tasksId关联'],
    ['数据库表','taskTable[]','array<object>','否','','','','','行内datasourceId/tableName必填'],
    ['复核决定','reviewForm.type','number / radio','是','','1通过、2不通过','','','按type绑定判断不通过意见是否必填'],
    ['操作意见','message','string / textarea','按动作','','最长100字符','trim','','催办必填；复核不通过要求必填'],
    ['转办人','assigneeId','ID / select','转办时是','','','','请选择委派的人员','按可用部门过滤，排除本人'],
  ],
};

const PROFILES = {
  projectList: {
    route:'/drms/project/my', operation:'查询项目列表', method:'POST', api:'/drms/portal/drmsproject/myPage', fields:'projectQuery',
    rows:[['项目编号','projectNo'],['项目名称','projectName'],['关联需求','relevance'],['创建时间','createTime'],['所属部门','deptName']],
    actions:['查询','重置','展开/收起筛选','新增','编辑','删除（relevance为假时）'],
    request:'查询体合并筛选字段与pageRequest:{pageNo,pageSize,order}。创建时间按本地日期范围扩展为beginCreateTime/endCreateTime。',
    result:'读取响应datas与total；空列表进入组件空态。查询异常走公共请求错误提示并进入列表错误状态。',
    layout:'内容区标题为“我的项目列表”；顶部筛选区默认展示项目编号、项目名称、所属部门，右侧查询/重置/展开；列表右上新增；表头为序号、项目编号、项目名称、关联需求、创建时间、所属部门、操作；底部右侧分页。',
    links:['/drms/project/edit?optType=add','/drms/project/edit?optType=edit&id={id}'],
    controls:[
      ['项目编号、项目名称','可清空文本筛选；值进入查询体。'],
      ['所属部门','按当前用户部门列表选择或清空，值为部门id。'],
      ['创建时间','展开筛选后选择起止日期；起点补T00:00:00、终点补T23:59:59；清空时移除日期参数。'],
      ['查询','按当前条件请求第一页；新的请求覆盖旧列表。'],
      ['重置','恢复初始search对象和第一页；日期控件同步清空。'],
      ['展开/收起筛选','切换日期等额外筛选项显示，不发写请求。'],
      ['新增','路由到optType=add表单。'],
      ['编辑','携带row.id进入编辑表单；通过relevance决定部门字段是否禁用。'],
      ['删除','关联标志relevance为假时可见；执行不可恢复提示后发DELETE，取消不发请求。'],
      ['分页','页码/每页条数改变后重查；每页条数改变回到第一页。'],
    ],
    responseFields:'datas:对象数组；total:总记录数。项目行字段含id、projectNo、projectName、relevance、createTime、deptName；关联需求列绑定relevance。',
  },
  projectAdd: {
    route:'/drms/project/edit?optType=add',operation:'新增项目',method:'POST',api:'/drms/portal/drmsproject',fields:'projectForm',
    request:'JSON body:{projectName,deptId,description}；deptId由GET /common/user/deptuser/dept/{userId}选择项的id取得。',result:'FormMixin收到成功后提示“新增成功”并返回来路；失败解除loading并保留表单草稿。',
    layout:'表单标题“新增项目”；第一行左侧项目名称、右侧所属部门；第二行项目描述跨整行；标题栏右上返回，页面底部右侧取消、提交。',
    controls:[['项目名称','输入时trim；失焦校验必填和50字符上限。'],['所属部门','可搜索/清空候选；必须选有效部门id。'],['项目描述','多行输入；trim后最多500字符。'],['返回/取消','返回来源列表，不发送创建请求；组件未实现额外确认框。'],['提交','先前端校验，再POST；等待时loading；失败解除loading并保留草稿；成功提示并返回。']],
    responseFields:'读取通用客户端解包后的成功结果；表单未使用响应字段构造新记录，成功后由列表重新读取。',
  },
  projectEdit: {
    route:'/drms/project/edit?optType=edit&id={id}',operation:'修改项目',method:'PUT',api:'/drms/portal/drmsproject/{id}',fields:'projectForm',
    request:'先GET /drms/portal/drmsproject/{id}回显，再PUT同路径JSON body:{projectName,deptId,description}。路径id来自列表记录。',result:'FormMixin收到成功后提示“修改成功”并返回来路；失败解除loading并保留已填写值。',
    layout:'与新增表单同布局，标题改“编辑项目”，值按项目详情回显；当form.relevance为真时所属部门控件禁用。',
    controls:[['页面初始化','按id读取项目详情；读取失败不得提交空白对象。'],['项目名称/描述','按新增规则校验和序列化。'],['所属部门','relevance为真时禁用；其他情况下可按部门列表维护。'],['返回/取消','返回来源列表，不发PUT；组件未实现额外确认框。'],['提交','前端校验后PUT；成功提示并返回；失败保留草稿。'],['删除','列表仅在!relevance时显示；共用不可恢复确认，确认后DELETE /drms/portal/drmsproject/{id}，成功回读列表。']],
    responseFields:'详情回显读取对象字段；保存成功读取通用解包结果后返回列表，并由列表接口回读。',
  },
  requirementList: {
    route:'/drms/requirement/my',operation:'查询需求列表',method:'POST',api:'/drms/portal/drmsstories/myPage',fields:'requirementQuery',
    rows:[['需求编号','storyNo'],['需求标题','storyTitle'],['申请人','createUsername'],['申请部门','deptName'],['申请时间','createTime'],['关联任务','relevance'],['需求状态','status']],
    actions:['查询','重置','展开/收起筛选','状态页签','新增','需求任务','编辑/删除（status=1时）'],
    request:'查询体合并storyNo、storyTitle、deptId、status、beginCreateTime、endCreateTime与分页排序。页签状态直接触发查询。',
    result:'读取datas、total；status页签为全部(""),1待启动、2已启动、3已关闭。编辑/删除仅status=1；查看任务携带需求id。',
    layout:'标题“我的需求列表”；顶部一行筛选需求编号、需求标题、申请部门，右侧查询、重置、展开；展开后显示申请时间范围。其下为全部/待启动/已启动/已关闭页签，右侧新增；列表依次显示序号、需求编号、需求标题、申请人、申请部门、申请时间、关联任务、状态和操作；底部右侧分页。',
    links:['/drms/requirement/edit?optType=add','/drms/requirement/edit?id={id}&optType=edit&relevance={relevance}','/drms/requirement/task?id={id}'],
    controls:[['需求编号、需求标题','文本输入可清空；输入按trim绑定。'],['申请部门','从当前用户部门列表选部门id。'],['申请时间','日期范围转beginCreateTime/endCreateTime边界时间。'],['状态页签','切换后将status设为对应值并重新查询；全部传空字符串。'],['查询/重置/展开','遵循列表查询、初始条件恢复、额外筛选显隐规则。'],['新增','打开四页签需求表单。'],['需求任务','携带需求id进入关联任务页。'],['编辑/删除','仅status=1显示。编辑传id/relevance；删除调用不可恢复确认并发DELETE，取消无请求。']],
    responseFields:'datas数组含需求字段；total为总数。分页对象按列表mixin默认pageNo=1,pageSize=20,id降序。',
  },
  requirementAdd: {
    route:'/drms/requirement/edit?optType=add',operation:'新增需求',method:'POST',api:'/drms/portal/drmsstories',fields:'requirementForm',
    request:'JSON body由基础字段及非空子集合组成：storyTitle、projectId、purpose、expectedEffect、deptId；storiesColumn[]、storiesSource[]、storiesAttachment[]。申请人显示userInfo.name，不显式构造applicant参数；仅非空子集合写入body。',
    result:'每页签保留草稿；下一步先校验基础信息；点击提交时校验必需数据源，调用POST创建。成功提示“新增成功”并返回；不会在本表单内自动启动需求或创建协作任务。',
    layout:'标题“新增需求”；表单顶端四个可点击页签：需求信息、基础数据、数据库信息、添加附件。首屏需求信息按左右两列排列：标题/所属项目、业务用途全宽、预期应用成效全宽；申请人信息区含只读申请人和申请部门；底部右侧取消、下一步。页签可直接切换，不是强制逐步向导。',
    controls:[['需求信息页签','切换到对应草稿页；点击页签不等于提交。'],['基础数据页签','维护字段草稿；下载模板GET；导入xlsx/xls在浏览器本地解析首sheet，不自动上传。'],['数据库信息页签','选择已有数据源并添加草稿；未选择数据源时提交提示并切到该页；表名不是需求数据源字段。'],['添加附件页签','选择文件立即POST临时上传；已上传附件删除立即发DELETE，不能由页面取消撤销。'],['下一步','先校验基础信息；失败返回基础页并聚焦错误；成功切到下一页签。'],['取消/返回','go(-1)离开，不发需求create请求；已完成的临时上传及删除不会自动回滚。'],['提交','提交中共享按钮loading；成功提示并返回；失败由表单catch解除loading，页面草稿保留。']],
    responseFields:'成功路径由表单提示与路由返回处理，不读取返回id做本地新行；回读由需求列表完成。',
  },
  taskMy: {
    route:'/drms/task/my',operation:'查询我发起的任务',method:'POST',api:'/drms/portal/drmsTaskWorkflow/instancePage',fields:'taskQuery',
    rows:[['关联需求','storyTitle'],['任务名称','taskName'],['协助部门','deptName'],['期望更新频率','frequency'],['任务描述','description'],['创建时间','createTime'],['状态','status']],
    actions:['查询','重置','展开/收起筛选','查看/办理状态相关操作'],
    request:'POST查询体合并taskName、deptId(级联末级)、storyTitle、status及分页排序；createTimes日期控件映射为beginCreateTime/endCreateTime。状态下拉不含1；不能据此断言后端列表不返回状态1。',
    result:'按datas/total渲染；状态操作由status和当前用户权限共同决定，不能由操作名称替代状态校验。',
    layout:'我发起的任务页顶部为任务名称、协助部门、关联需求筛选，右侧查询/重置/展开；下方表格含序号、关联需求、任务名称、协助部门、更新频率、描述、创建时间、状态、操作。样本截图显示空态，仅作为当次数据状态。',
    controls:[['筛选项','文本trim；部门级联发送末级部门id；日期折叠条件与默认筛选一并提交。'],['查询/重置/分页','使用列表Mixin分页、排序和状态恢复规则。'],['行操作','详情、修改、删除、撤回、催办、关闭按状态表显示；每次操作后重新读列表。'],['新增入口','列表截图中没有新增按钮；任务新增从需求关联任务页进入，不在此页面自行添加入口。']],
    responseFields:'读取datas、total；任务行字段按上述表头以及id、procTaskId、status、relevance回填。',
  },
  taskPending: {
    route:'/drms/task/pending',operation:'查询待处理任务',method:'POST',api:'/drms/portal/drmsTaskWorkflow/todoPage',fields:'taskPendingQuery',
    rows:[['关联需求','storyTitle'],['任务名称','taskName'],['协助部门','deptName'],['期望更新频率','frequency'],['任务描述','description'],['创建时间','createTime'],['状态','status']],
    actions:['查询','重置','时间范围','按待办状态办理'],
    request:'POST待办查询体含taskName、beginCreateTime、endCreateTime及分页排序；createTimes日期控件拼T00:00:00/T23:59:59。此页不显示协助部门、关联需求筛选。',
    result:'待办动作使用POST findTaskInfo读取taskId/procTaskId/type对应详情，再按状态调用工作流PUT；权限和状态仍由服务端核验。',
    layout:'标题“待处理任务”；筛选区只有任务名称和起止时间，右侧查询/重置；表头序号、关联需求、任务名称、协助部门、更新频率、描述、创建时间、状态、操作；空态位于表体中央。',
    controls:[['任务名称','文本输入并参与待办查询。'],['时间范围','起止时间参与查询；此页不显示其他任务列表的部门/需求筛选。'],['查询/重置','重查第一页/恢复初始条件。'],['任务行','按状态显示接收、提交、签收、驳回、申请复核、复核、转办等动作；每个动作先加载详情再提交对应流程。']],
    responseFields:'待办分页读取datas/total；详情从findTaskInfo返回流程和业务信息，字段映射应沿静态组件读取。',
  },
  taskProcessed: {
    route:'/drms/task/processed',operation:'查询已处理任务',method:'POST',api:'/drms/portal/drmsTaskWorkflow/donePage',fields:'taskPendingQuery',
    rows:[['关联需求','storyTitle'],['任务名称','taskName'],['节点名称','taskNode'],['协助部门','deptName'],['期望更新频率','frequency'],['任务描述','description'],['创建时间','createTime'],['状态','status']],
    actions:['查询','重置','时间范围','查看已处理任务详情'],
    request:'POST已办查询体含taskName、beginCreateTime、endCreateTime及分页排序，日期由createTimes映射。',result:'列表不显示操作列；详情以已处理模式加载，不提供办理写动作。',
    layout:'布局同待处理任务；表格额外显示节点名称列，且没有操作列；空态居中显示。',
    controls:[['任务名称、起止时间','设置已办过滤条件。'],['查询/重置','重查第一页/恢复初始条件。'],['任务行','只读打开业务详情，详情business=processed；不得显示待办操作。']],
    responseFields:'donePage读取datas/total；任务行包含taskNode节点名称。',
  },
  taskLists: { route:'/drms/task/my、/drms/task/pending、/drms/task/processed',operation:'查询任务中心',method:'POST',api:'/drms/portal/drmsTaskWorkflow/instancePage、/drmsTaskWorkflow/todoPage、/drmsTaskWorkflow/donePage',fields:FIELDS.taskQuery.map(f=>['deptId','storyTitle','status'].includes(f[1])?[...f.slice(0,-1),'仅我发起页面；'+f.at(-1)]:f), rows:[], actions:[], request:'我发起用instancePage，待处理用todoPage，已处理用donePage；按对应子页面字段组成查询体。',result:'详情和状态操作遵循DRMS-002流程约束。',layout:'三个任务列表页面的差异见DRMS-505至DRMS-507。',controls:[['列表查询','按对应子页面字段、分页和状态过滤。']],responseFields:'分页结构datas/total；各子页字段见DRMS-505至DRMS-507。' },
  advisoryList: {
    route:'/drms/advisory/list',operation:'查询咨询列表',method:'POST',api:'/drms/portal/drmsadvisors/page',fields:'advisoryQuery',
    rows:[['标题','title'],['申请人','createUsername'],['发起人所属部门','deptName'],['发起时间','createTime'],['状态','status']],
    actions:['查询','重置','新增','查看','催办/撤回/删除（状态条件）'],
    request:'POST查询体包含title、status、beginCreateTime、endCreateTime及分页排序；日期从applyTime映射并拼T00:00:00/T23:59:59。',
    result:'列表读取datas、total。status=1可催办/撤回；status=3可删除；页面没有普通编辑入口。',
    layout:'标题“咨询列表”；筛选区有标题、状态、起止日期，右侧查询/重置；右上新增；表头序号、标题、申请人、发起人所属部门、发起时间、状态、操作；分页位于底部。',
    controls:[['标题/状态/日期','输入标题trim；状态从1待处理、2已完成、3已撤回选择；日期转beginCreateTime/endCreateTime。'],['查询/重置','查询第一页；重置初始条件。'],['新增','打开咨询表单。'],['催办','status=1时可用，PUT /drms/portal/drmsadvisors/urge，参数id、type=5、message必填trim≤100；确认后回读。'],['撤回','status=1时确认后PUT /drms/portal/drmsadvisors/revocation，参数id、type=3；成功回读。'],['删除','仅status=3展示；确认不可恢复后DELETE /drms/portal/drmsadvisors/{id}；取消无请求。'],['编辑','不存在常规编辑入口；API有PUT不构成页面编辑能力。']],
    responseFields:'datas数组与total；数据快照及状态以服务端当前返回为准。',
  },
  advisoryAdd: {
    route:'/drms/advisory/edit?optType=add',operation:'新增需求咨询',method:'POST',api:'/drms/portal/drmsadvisors',fields:'advisoryForm',
    request:'JSON body:{title,deptId,attachment,storyContent,expectedEffect,advisorsAttachment[]}；附件数组元素{advisorsId?,fileName,fileKey}，fileKey取临时上传返回字符串。发起人userInfo.name仅展示。',
    result:'前端要求标题、部门、附件标志、需求描述、预计成效；上传控件即时传文件。保存成功提示并返回来路；失败解除loading并保留文本草稿。',
    layout:'标题“新增咨询”；左侧导航保持需求咨询并高亮当前区；表单第一行标题/发起部门，发起人只读；第二段相关附件与上传/列表；下方需求描述、预计应用成效各占整行；底部右侧取消、提交。',
    controls:[['标题/发起部门','trim文本；部门选择后传deptId。'],['发起人','当前用户只读，不接受客户端另选身份。'],['上传附件','选文件后立即POST临时上传；成功返回string作为fileKey，删除已上传文件立即DELETE。'],['需求描述/预计成效','trim后必填，各≤500字符。'],['取消/返回','go(-1)，不发送advisors创建请求；已经完成的临时附件写入不会自动回滚。'],['提交','先执行表单规则，再POST；loading期间不允许重复触发；成功提示返回；失败保留草稿。']],
    responseFields:'成功后页面不解析新记录id，依靠咨询列表接口回读；失败响应经公共错误拦截器提示并reject。',
  },
  advisoryHandle: {
    route:'/drms/advisory/handle',operation:'查询需求咨询待处理/已处理',method:'POST',api:'/drms/portal/drmsadvisors/todoPage、/drmsadvisors/donePage',fields:[...FIELDS.advisoryQuery.filter(f=>f[1]!=='status'),
      ['咨询标识','id','ID / hidden','处理/详情时是','','','','','来自当前记录，不作为可编辑文本'],
      ['流程任务标识','procTaskId','ID / hidden','处理/快照时是','','','','','来自当前待办，过期时重新读取'],
      ['回复内容','replyContent','string / textarea','回复时是','','最长100字符','trim后非空','请输入回复内容','待处理回复表单；已处理只读'],
      ['转办人','assigneeId','ID / select','转办时是','','','','请选择委派的人员','排除本人及咨询创建人；不适用于回复'],
    ],
    rows:[['标题','title'],['申请人','createUsername'],['发起人所属部门','deptName'],['发起时间','createTime'],['状态','status']],
    actions:['待处理/已处理页签','查询','转办','回复','查看已处理快照'],
    request:'待处理/已处理分别调用todoPage/donePage；详情快照调用POST /drmsadvisors/findTaskInfo，参数id、procTaskId、type。',
    result:'待处理转办参数{id,type:4,procTaskId,assigneeId}；回复参数{id,type:1,procTaskId,replyContent}且replyContent trim后必填≤100。已处理页只读。',
    layout:'页面左侧高亮“咨询处理”；主区域有待处理/已处理两个页签；其下标题与日期查询区、列表及底部分页；待处理有回复/转办操作，已处理显示只读记录。',
    controls:[['待处理页签','仅在用户具备对应前端资源权限时显示；加载待处理分页。'],['已处理页签','加载只读处理历史分页。'],['标题/时间范围','输入标题和日期；日期转beginCreateTime/endCreateTime，不出现普通咨询列表的状态筛选。'],['查询/重置/分页','当前页签条件查询第一页；重置清除筛选；翻页沿用同一页签和条件。'],['转办','按当前咨询部门加载候选人并排除当前办理人/创建人；选assigneeId后提交转办。'],['回复','打开回复处理表单；回复正文必填trim≤100；提交后等待服务端结果再刷新。'],['取消回复/转办','关闭当前表单或弹窗，不发相应PUT；重新打开必须读取最新待办上下文。'],['新增','处理组件不提供新增按钮；新增咨询表单从咨询列表入口打开。']],
    responseFields:'分页读取datas/total；快照页面按type=0待处理、type=1已处理取回咨询和附件。',
  },
  kanban: {
    route:'/drms/kanban',operation:'查询需求统计看板',method:'POST',api:'/drms/portal/drmsreport/findReport',fields:'kanban',
    request:'body:{dateType:number}，1=本月、2=本年、3=全部；默认1。',
    result:'读取projectNum、storiesNum、taskNum；storiesProgress/taskProgress进度项(showName,showValue)；storiesProgressSort(showName,finish,showValue)；storiesNumSort(showName,showValue)。图表排名按服务端数组输入顺序计算显示名次；不证明服务端返回排序正确。',
    layout:'内容区右上日期范围选项本月/本年/全部；下方第一行三张统计卡片项目数、需求数、任务数；第二、三行左侧宽图表展示需求完成进度/遗留任务状态，右侧窄区展示需求进度排名/需求规模排名。当前图表无数据不能固化为默认业务值。',
    controls:[['本月/本年/全部','单选dateType；切换后POST findReport并显示加载。'],['统计卡片/图表','只读展示响应字段；0值与请求失败状态必须区分。'],['窗口尺寸变化','resize防抖后重新计算图表尺寸；离页销毁图表实例与监听。']],
    responseFields:'仅读取上述字段；故事/任务进度比值单位、分母、范围排序与空值契约由接口定义。',
  },
  workflowProgress: {
    route:'/drms/task/my、/drms/task/pending、/drms/task/processed 与 /drms/requirement/task?id={id}',operation:'查询办理状态与按状态执行任务流程',method:'POST',api:'/drms/portal/drmsTaskWorkflow/findTaskInfo',fields:'workflow',
    request:'详情POST /drmsTaskWorkflow/findTaskInfo:{id,procTaskId,type}；列表POST instancePage/todoPage/donePage；流程图GET /common/workflow/act/def/diagram?procInstId={procInstId}&t={timestamp}；历史GET /drmsTaskWorkflow/histInst/{id}。状态动作使用 /drmsTaskWorkflow/{action}。',
    result:'仅在相应状态显示动作：待提交可编辑/提交/删除；待接收、处理中可撤回；不含1/5/7/8/9/10的状态可催办；状态5可关闭；转办按状态可用部门/人员。接收type=1；提交taskExecute opt=sumbit；签收页面opt=receipt，确认调用signIn；驳回、申请复核、复核分别用对应路径及type。',
    layout:'任务列表根据我发起/待处理/已处理分区；流程详情页展示业务表单，状态大于1时提供流程图和历史；图像居中最大宽度100%，历史表格含环节、开始/结束时间、用时、审核人、审核意见、审核状态。',
    controls:[['接收','status=2且有待办权限时调用PUT /drmsTaskWorkflow/accept，{id,type:1,procTaskId}。'],['办理/提交','PUT /drmsTaskWorkflow/taskExecute，{id,procTaskId,taskExplain,taskAttachment?,taskTable?}；提交说明trim后必填≤500。'],['签收','确认签收调用PUT /drmsTaskWorkflow/signIn，{id,type:1,procTaskId}；不等同taskExecute。'],['驳回','快速驳回或签收页驳回调用reject，{id,type:2,procTaskId}；复核表单不通过时另带message。'],['申请复核/复核','申请用reviewApply；复核通过用review，不通过用reject，复核表单带type和message。操作后刷新状态。'],['转办','调用turnTo，{id,type:4,procTaskId,assigneeId}；候选人员按部门过滤并排除本人。'],['催办/关闭/撤回','分别调用urge(type=5,message≤100)、close(type=6)、revocation(type=3)，须按具体按钮与后端状态契约映射。'],['附件与表数据','提交任务时上传附件并关联fileKey；数据库表行先选择datasourceId/tableName再提交。']],
    responseFields:'流程图以Blob解码为图片objectURL；历史接口返回办理实例数组；处理操作的成功/失败依赖通用客户端业务码和页面catch。',
  },
  taskPendingQuery: [
    ['任务名称','taskName','string / text','否','','','','','可清空'],
    ['开始时间','createTimes[0]','string / date','否','','','','',''],
    ['结束时间','createTimes[1]','string / date','否','','','','',''],
    ['页码','pageNo','number','是','1','','正整数','',''],
    ['每页条数','pageSize','number','是','20','','正整数','',''],
  ],
};

const NFRS = [
  ['DRMS-NFR-001','权限隔离','服务端按用户、部门和对象对列表、详情、附件下载及每个写动作重新鉴权；部署启用租户隔离时同时校验租户边界；直接改ID不得扩大可见范围。','双账号/双部门矩阵各测列表和对象直达；预期未授权对象统一拒绝且无数据泄露。','DRMS-100、DRMS-105、DRMS-110、DRMS-115','静态材料未证明后端权限矩阵；本目标需业务负责人批准角色与范围。'],
  ['DRMS-NFR-002','秘密与文件安全','业务仅使用受保护传输；附件名、key、响应体和日志不得暴露会话凭据；临时文件须有绑定会话、访问鉴权和到期清理策略。','核对TLS配置、日志样本、临时文件权限/TTL及越权下载拒绝；不得把客户端按钮隐藏作为鉴权。','DRMS-107、DRMS-117、DRMS-002','当前公开静态客户端可见token注入及PDF预览查询参数拼接；服务端/代理脱敏与清理策略须联调。'],
  ['DRMS-NFR-003','上传与文件资源','客户端单文件限制为严格小于200MiB；格式白名单为jpg/jpeg/png/gif/doc/docx/pdf/txt/avi/mp4/wmv/mpeg/mov/xlsx/xls/ppt/pptx/zip/rar；临时文件取消、失败、过期与已引用文件的清理边界必须区分。','测199MiB、200MiB、200MiB+1byte、扩展名大小写/伪扩展、空文件、重复名及网络中断；检查临时空间和附件引用。','DRMS-107、DRMS-117、DRMS-002','前端比较是size/1024/1024<200；不代表后端限制或实际格式嗅探。'],
  ['DRMS-NFR-004','一致性与事务','保存主记录及子表集合需原子化；子集合从有值清空为零条时，接口必须支持明确清空语义；上传与主记录失败须可恢复且无孤儿引用。','对字段/数据源/附件分别新增、修改、删除到零条并在事务中途断网；回读主记录、子记录与临时文件，预期无半成功。','DRMS-102、DRMS-103、DRMS-107、DRMS-117','前端仅把非空数组放入请求，清空集合时可能留下服务端旧关联。'],
  ['DRMS-NFR-005','并发与幂等','同一表单提交期间锁定重复触发；有副作用请求超时先按稳定业务键查询结果再决定重试；迟到查询不能覆盖较新条件结果。','双击/Enter、并发修改、超时但服务端已成功、A/B条件逆序返回；检查记录数、版本和最终列表。','DRMS-100、DRMS-102、DRMS-103、DRMS-107、DRMS-117、DRMS-002','前端多个form mixin缺少可确认的入口级防重和版本号契约。'],
  ['DRMS-NFR-006','查询响应','列表默认每页20条；查询首屏以P95≤3秒为开发验收目标，环境至少10,000条授权范围记录、20条页长、50个并发读会话、预热3分钟及统计10分钟。','在隔离环境记录成功/失败、P50/P95/P99、吞吐、数据规模和资源；慢查与超时包含在失败报告，不在生产压测。','DRMS-100、DRMS-105、DRMS-110、DRMS-115','3秒等指标为本次建议开发目标，不是当前系统实测或既有SLA。'],
  ['DRMS-NFR-007','可靠性与恢复','列表/表单分别呈加载、空、失败、成功状态；失败保留可恢复筛选/草稿；不把旧数据误标为新查询成功；撤回/删除/附件写入结果未知时先回读。','注入网络拒绝、超时、HTTP/业务错误、无效JSON、空/畸形响应；验证loading释放、错误反馈、请求数和再次读取。','DRMS-100、DRMS-102、DRMS-103、DRMS-105、DRMS-107、DRMS-110、DRMS-115、DRMS-117、DRMS-002','前端全局业务错误代码和列表mixin可提供错误状态；特定页catch存在吞错风险，见核查记录。'],
  ['DRMS-NFR-008','可访问性与适配','所有字段有可访问名称，错误与字段关联；键盘可完成筛选、页签、表单和对话框，焦点可见且关闭弹窗后回到触发控件；320 CSS像素宽度与200%缩放不得丢失主要操作。','键盘与读屏检查标签/错误播报/焦点顺序；视口320、768、1280、1500 CSS像素及200%缩放核对无按钮遮挡、横向溢出和弹窗裁切。','全部DRMS页面','这是新增质量目标；历史证据仅1500×1000，未覆盖适配或辅助技术。'],
  ['DRMS-NFR-009','审计与可观测性','保存、删除、撤回、转办、审批、关闭、催办、附件增删须有用户/对象/动作/时间/结果/关联请求ID；请求日志过滤凭据、正文敏感内容与完整附件路径。','成功与失败各抽一条串联页面请求与服务端审计，字段齐全且没有token、密码、完整会话头或不必要正文。','DRMS-102、DRMS-103、DRMS-107、DRMS-117、DRMS-002','静态前端材料不能证明审计事件和保留周期。'],
  ['DRMS-NFR-010','图表与长期稳定性','窗口变化时图表更新尺寸；离页或组件销毁时清除监听、防抖计时器和图表实例，释放objectURL。','反复进入/离开看板与流程图50轮，检查监听数量、内存稳定和Blob URL撤销。','DRMS-001、DRMS-002','看板源码有380ms resize防抖并移除监听；未看到chart.dispose及objectURL revoke。'],
  ['DRMS-NFR-011','接口契约与版本兼容','页面与接口按稳定ID、明确类型、枚举和状态约束交互；兼容性测试覆盖主页面、分页、子集合、流程动作和文件引用；未知字段不得静默丢弃。','以版本化JSON契约跑字段类型/可选项/状态转换契约测试；接口变更导致页面解析失败必须显式报错。','全部DRMS页面','真实后端OpenAPI/DTO/状态转换矩阵未随静态包提供。'],
  ['DRMS-NFR-012','AI辅助的隐私与人工采纳','需求补全/相似需求建议只使用获授权的需求字段；输出列出引用依据和差异；用户确认前不得写入业务记录、触发任务或发送附件；拒绝/超时可回到手工表单。','用带个人信息的测试数据检查授权范围、提示来源、人工采纳、拒绝、取消与模型失败；网络请求不得含未授权字段。','DRMS-107','关联AI-001；属于待评审目标，不表示现有页面已有AI能力。'],
];

function esc(value) { return String(value ?? '').replaceAll('|','&#124;').replaceAll('\n',' '); }
function rows(list) { return list.map(r => '| ' + r.map(esc).join(' | ') + ' |'); }
function fieldRows(profile) { return Array.isArray(profile.fields)?profile.fields:(FIELDS[profile.fields] || PROFILES[profile.fields] || []); }
function screenshot(id) { return `[${id}](${EVIDENCE}${id}.png) / [元素](${EVIDENCE}${id}.json)`; }
function qualify(text) {
  const expanded=text.replace(/(?<!\/portal)(\/drms(?:TaskWorkflow|advisorsattachment|advisors|storiescolumn|storiessource|storiesattachment|stories|task|project))(?=[/\s、?:}。；]|$)/g,'/drms/portal$1');
  return expanded.replace(/(?<!\/back)(\/drms\/portal|\/common\/user|\/common\/datasource|\/common\/workflow)/g,'/back$1');
}
function isForm(kind){return ['projectAdd','projectEdit','requirementAdd','advisoryAdd'].includes(kind);}
function hasFiles(kind){return ['requirementAdd','advisoryAdd','workflowProgress'].includes(kind);}
function isList(kind){return !isForm(kind)&&!['kanban','workflowProgress'].includes(kind);}
function acceptanceFor(entry){
  const p=PROFILES[entry.kind],kind=entry.kind;
  const specific={
    projectAdd:['填名称50字符、有效部门和描述500字符，提交一次POST并在列表按新id回读。','名称空/纯空白、51字符、描述501字符或部门缺失时阻止提交并显示对应字段原因。','部门候选失败及服务端拒绝后保留草稿并解除提交锁，重新加载候选可继续。','取消不发创建请求；双击和Enter共用锁；超时先核对列表再重试，无重复项目。','无创建权限的账号直接打开新增URL，或将deptId替换为未授权部门时，服务端拒绝且无新增记录。'],
    projectEdit:['GET读取目标项目，修改名称和描述后仅PUT该id；返回列表并重新进入核对已保存值。','relevance真时部门禁用，假时可维护；直接篡改受保护部门仍须服务端拒绝。','名称空、51字符或描述501字符阻止保存；读取失败不得提交空白详情。','取消不发PUT；保存失败保留草稿；双会话冲突/超时先回读，不覆盖新版本。','关联需求的项目不提供删除；无关联项目取消确认不发DELETE，授权删除后回读列表。'],
    requirementAdd:['填写四个基础必填项并选项目，联动部门；提交后按需求id回读主记录和三个子集合。','列名/定义200与201、说明500与501、日期型/小数型长度精度和主键联动分别按字段表校验。','xlsx/xls本地导入首sheet；错误行标明行号且不写服务端；数据源块缺id时切到数据库信息并提示。','选择附件会立即上传；取消不发需求创建，不能声称临时文件已回滚；失败重试不产生重复附件引用。','修改需求删除最后一个字段/数据源/附件并保存，服务端回读为明确空集合；无权限和并发冲突均拒绝。'],
    advisoryAdd:['填标题、发起部门、需求描述、预计成效并上传有效附件；POST后在咨询列表回读。','标题50/51、描述及成效500/501、缺附件标志分别检查；未上传成功不得通过附件必填。','临时上传失败或服务端校验失败保留文本，显示错误并解除请求锁，可重新选择文件。','取消不发咨询POST；删除已上传附件按即时DELETE处理；重复点击不得重复创建咨询。','篡改deptId或文件key、失去权限/会话时拒绝保存或下载，不泄露其他部门附件。'],
    kanban:['默认本月dateType=1；切到本年2及全部3，逐次核对三张卡和四个统计区来自同次响应。','0条、0分母、空数组、并列排名、无序排名输入各有明确显示；不出现NaN/Infinity或将初始0当成功。','接口拒绝、超时和畸形结构时显示失败；旧统计不得冒充新时间范围结果，允许重试。','快速切三个时间范围并让旧请求最后返回，最终只显示最后一次选择；本页不发写请求。','不同授权账号统计范围一致于服务端权限；缩放/窗口resize与离页后图表和监听释放。'],
    workflowProgress:['按待提交→发起→接收→提交成果→签收的合同状态执行并逐步回读；页面显示当前结果。','taskExplain空/501、催办意见空/101、未选转办人、复核不通过未填意见均阻止对应动作。','旧procTaskId、状态已变化、接口失败、附件失败时不显示虚假完成，保留可恢复输入并读当前状态。','确认签收仅调signIn；取消动作确认无写请求；双击、两人同时办理及超时不重复改变状态。','只读已办不出现办理入口；直接改任务id/人员id/文件key越权被拒绝；流程图和历史属于同一实例。'],
    advisoryHandle:['待处理/已处理分别调用todoPage/donePage；回复后在已处理快照核对replyContent与状态。','replyContent空、100/101字及缺assigneeId按对应规则处理，转办候选不含本人和创建人。','列表/候选/快照加载失败分别可重试；失败保留回复草稿但不冒充回复成功。','取消回复/转办不发PUT；连续提交和状态已被他人处理时只产生一次有效操作。','无对应frontResource的页签不展示；直接访问处理URL、改咨询id或procTaskId仍由服务端拒绝。'],
  };
  const query=[`在授权账号进入${p.route}，设置有效筛选并查询，核对请求参数、列表列与datas/total。`,
    '查询/重置/翻页/改页长分别回读；默认pageNo=1、pageSize=20、order按id降序，日期清空后移除日期参数。',
    '空结果、业务拒绝、403/会话过期、超时和无效响应分别显示；查询失败不是零结果。',
    'A条件查询先发后返、B条件后发先返时仅B生效；详情返回恢复筛选页码，日期控件和状态页签同步。',
    kind==='taskProcessed'?'已办详情以type=1读取快照，页面不出现办理按钮；替换任务id或procTaskId时服务端拒绝越权。':'双账号/部门直接访问对象或改ID不能越权；按状态限制行操作，取消确认不发写请求。'];
  return (specific[kind]||query).map((check,i)=>[`DRMS-AC-${String(entry.start+i).padStart(3,'0')}`,check,entry.id,'未执行']);
}
function featureFor(entry) {
  const p = PROFILES[entry.kind];
  if (!p) throw new Error('missing DRMS profile: ' + entry.kind);
  const fields = fieldRows(p).map(([label,binding,...rest])=>[`${label}（${binding}）`,...rest]);
  const actions = p.actions || [];
  const sources = entry.sources;
  const acceptance = acceptanceFor(entry);
  const sourceList = sources.map(screenshot).join('；');
  return qualify([
    `### ${entry.id} ${entry.title}`,'',
    `**功能入口：** ${p.route}`,
    `**操作类型：** ${p.operation}。**前置条件：** 已建立登录会话；服务端仍需对当前用户、部门及目标对象授权。`,
    `**业务目的**：${goal(entry.kind)}`,'',
    '**操作与规则**：','',
    `1. 打开${entry.title}，按当前页面读取筛选、表单或流程状态；不得把菜单可见当成数据授权。`,
    `2. 页面按本条字段表及交互表收集输入；对象关系通过稳定id提交，显示名称不作为关联键。${actions.length?`可执行入口为：${actions.join('、')}。`:''}`,
    `3. ${p.request}`,
    `4. ${p.result}`,'',
    `**结果与异常处理**：${isForm(entry.kind)?'初始化依赖失败、字段校验失败、保存中、保存拒绝和成功分别反馈；失败保留草稿并解除提交锁。保存结果未知时先回读，再决定是否重试。':entry.kind==='kanban'?'加载、有效统计、无统计数据与统计失败分别呈现；失败时标记旧统计及时间范围，允许重新查询。':'页面区分加载、空数据、业务拒绝、权限拒绝、网络失败和成功回读；请求失败解除loading并保留筛选或办理草稿。状态动作结果未知时先读取当前状态。'}`,'',
    `**开发处理细则**：字段名、稳定ID、枚举和HTTP方法按下面契约映射。${isList(entry.kind)?'列表分页封装在pageRequest:{pageNo,pageSize,order}；读取只接受当前查询代次的响应。':entry.kind==='kanban'?'统计按dateType查询，不传列表分页参数；只接受当前时间范围的响应。':'写动作共用入口锁，等待服务端结果后回读。'}${hasFiles(entry.kind)?'子集合与文件引用见共用详细规则。':''}`,'',
    `<!-- 完整规格:${entry.id} -->`,'',
    `#### 1. 页面字段清单（${entry.id}）`,'',
    '| 字段名称与绑定名 | 类型/控件 | 是否必填 | 默认值 | 长度/范围/单位 | 格式及校验规则 | 错误提示 | 条件/状态 |','|---|---|---|---|---|---|---|---|',
    ...rows(fields),
    '',
    `#### 2. 页面交互规则（${entry.id}）`,'',
    '| 控件/触发方式 | 行为、联动与状态 |','|---|---|',
    ...rows(p.controls||[]),
    '',isForm(entry.kind)?'提交中禁用所有进入同一保存方法的按钮/键盘入口；失败后解锁并保留草稿。'+(hasFiles(entry.kind)?'取消主对象保存不撤销已经完成的附件写入。':''):entry.kind==='kanban'?'切换时间范围显示进度；旧统计不得冒充新范围结果。无数据和失败分别呈现。':entry.kind==='workflowProgress'?'读取详情时禁用依赖详情的动作；提交期间锁定同一任务的重复动作，结果未知先回读状态。':'读取中保留条件并展示进度；新条件回第一页，旧响应不得覆盖新条件。空结果与失败分别呈现。',
    '',
    `#### 3. 业务流程与异常分支（${entry.id}）`,'',
    ...flow(entry.kind).map((s,i)=>`${i+1}. ${s}`),'',
    '| 异常分支 | 页面响应与恢复 |','|---|---|',
    ...rows(exceptionRows(entry.kind)),
    '',
    `#### 4. 接口与数据规则（${entry.id}）`,'',
    '| 请求/响应 | 方法与相对路径 | 参数/字段映射 | 返回读取与页面结果 |','|---|---|---|---|',
    ...rows(apiRows(entry.kind,p)),
    '',
    `#### 5. 验收标准（${entry.id}）`,'',
    '| 验收编号 | 操作与可检查结果 | 关联需求 | 状态 |','|---|---|---|---|',
    ...rows(acceptance),
    '',
    `#### 6. 权限与安全要求（${entry.id}）`,'',
    '- 允许访问本页面的主体为服务端授予相应菜单、对象数据与动作权限的已登录用户；按用户会话、部门范围、对象ID及当前状态分别校验读取与写入，直接访问路由不扩大权限。',
    '- 错误消息、URL和日志不得包含令牌、会话凭据或不必要的用户正文。'+(hasFiles(entry.kind)?'上传、下载及附件删除须校验当前业务对象的引用关系。':''),
    '- 角色与数据范围、审计和传输策略按模块质量要求及核查记录的外部契约落实；前端隐藏按钮不作为安全控制。','',
    `#### 7. 页面布局与状态（${entry.id}）`,'',
    `- ${p.layout}`,
    `- 可见入口及当前路由：${p.route}。截图视口为历史1500×1000样本，不将像素位置固定到其他分辨率。`,
    `- 主要状态：${isForm(entry.kind)?'依赖加载、可编辑草稿、字段错误、保存中、保存失败、保存成功并返回。':entry.kind==='kanban'?'初始加载、有效统计、无统计数据、请求失败与重新查询；统计卡初始0不能作为成功结果。':entry.kind==='workflowProgress'?'详情加载、可办理、办理中、状态冲突、办理失败、完成回读；流程图和历史分别呈现加载/无记录/失败。':'查询中、有记录、无匹配记录、查询失败和返回恢复；无匹配记录保留筛选及分页入口。'}`,'',
    `#### 8. 关联文档（${entry.id}）`,'',
    `- 页面材料：${sourceList}。原始页面时间及目标有效性见[专项证据索引](../evidence/drms-review-20261026/README.md)。`,
    `- [核查记录](./核查记录.md) · [静态实现片段索引](../evidence/drms-review-20261026/README.md) · [共用详细规则](./子页面与操作细化.md#4-字段枚举和约束)。`,
    '- 本条业务验收尚未在应用端执行；后端持久化、权限、事务与审计按外部依赖清单验收。','',
    `- 适用质量要求：${nfrFor(entry.kind).join('、')}，见[模块非功能性需求](./需求说明.md#9-非功能性需求)。`,'',
  ].join('\n'));
}

function goal(kind) {
  return ({projectList:'按项目编号、名称、部门和创建时间定位项目，并查看与项目关联的需求信息。',projectAdd:'建立具有明确名称和所属部门的项目，供需求申请选择和后续归集。',projectEdit:'更新项目名称、描述及允许维护的部门信息，并保持需求关联稳定。',requirementList:'筛选需求申请，读取申请人、部门与状态，并进入需求任务跟踪。',requirementAdd:'提交结构化需求申请及可选基础字段、数据源和附件。',taskMy:'查看本人发起任务及可用状态操作，追踪任务处理结果。',taskPending:'读取本人待办并按工作流状态接收、办理或转办。',taskProcessed:'只读查看已办任务及节点信息，区分历史结果与当前待办。',taskLists:'在我发起、待处理、已处理分区查找任务并区分可办理状态。',advisoryList:'筛选咨询记录并使用当前状态允许的查询或处理入口。',advisoryAdd:'提交部门咨询说明和预计成效，关联上传成功的附件。',advisoryHandle:'处理已分配的咨询，记录回复或转办并查看处理历史。',kanban:'按时间范围查看项目、需求和任务数量及进度分布。',workflowProgress:'查看任务当前状态、办理历史并执行权限允许的状态迁移。'})[kind];
}
function flow(kind) {
  const common=['加载当前用户授权范围和页面初始条件。'];
  if(kind==='projectAdd'||kind==='projectEdit') return [...common,'读取/选择有效部门；编辑时先按对象id读取原项目。','填写名称、部门和描述；前端trim并执行必填、长度规则。','提交POST或PUT，服务端校验并保存后提示成功、返回列表回读。'];
  if(kind==='requirementAdd') return [...common,'完成需求信息；项目候选来自授权项目列表，选择后回填申请部门。','按需维护基础字段、数据源和附件；导入模板只在浏览器解析，不隐式提交。','点击提交校验表单和数据源，写入非空子集合；成功返回需求列表回读。'];
  if(kind==='advisoryAdd') return [...common,'填写标题、部门、描述和成效；附件选择会先创建临时上传引用。','提交主咨询和附件引用；服务端成功后返回列表回读。'];
  if(kind==='kanban') return [...common,'选择本月、本年或全部；初始dateType=1。','POST统计接口；按同一响应更新三张统计卡和图表。','请求失败展示错误状态并清除/标记旧统计数据。'];
  if(kind==='workflowProgress') return [...common,'从需求关联任务页或任务列表选定任务id和流程任务id。','读取详情/历史；仅根据服务端当前状态呈现接收、办理、签收、复核、转办、撤回、催办、关闭等适用动作。','提交动作并根据服务端状态回读，记录操作结果；错误时维持原状态并允许按业务规则恢复。'];
  return [...common,'输入当前子页支持的筛选条件并按查询；列表请求携带分页和排序参数。','检查状态和目标权限，打开详情或执行允许的行操作。','操作成功后回读列表/详情；失败区分空结果、无权限、业务拒绝和网络错误。'];
}
function exceptionRows(kind) {
  const rows=[['无权限或对象已变化','服务端拒绝并刷新授权/状态；不以隐藏控件替代校验。'],['网络中断、超时或错误响应','提示失败，释放loading并保留输入；读请求可重试，写请求结果未知先回读。']];
  if(isList(kind))rows.unshift(['无匹配数据','展示空状态，保留查询入口；不得误报为故障。']);
  if(kind==='kanban')rows.push(['统计为空或结构异常','空数组按空态展示；缺失必需字段报解析错误，分母为0时不计算比率，不显示NaN/Infinity。']);
  if(['projectAdd','projectEdit','requirementAdd','advisoryAdd'].includes(kind)) rows.push(['字段非法/候选加载失败','定位具体字段；候选加载失败显示原因并提供重新加载，禁止以显示名称代替ID。'],['取消/重复提交','取消不发送对应主对象保存；提交期间锁定按钮，超时查询当前对象后再决定重试。']);
  if(kind==='requirementAdd') rows.push(['子集合被清空/附件上传失败','对子集合发送明确清空语义；上传失败不能成为有效附件，离开前告知临时文件去向。']);
  if(kind==='workflowProgress') rows.push(['状态冲突/流程实例已结束','拒绝旧动作，重新读取当前状态与历史；不得重放旧的办理请求。']);
  return rows;
}
function apiRows(kind,p) {
  const query=p.method==='POST'&&p.api.includes('Page');
  const rows=[[p.method,p.api,p.request,p.result]];
  if(kind==='projectList') rows.push(['GET','/common/user/deptuser/dept/{userId}','userId来自登录用户上下文；响应候选字段id/name。','供deptId选择，不把部门名称作为请求键。']);
  if(kind==='projectEdit') rows.push(['GET','/drms/portal/drmsproject/{id}','路径id来自列表行。','读取详情字段用于编辑回显。'],['DELETE','/drms/portal/drmsproject/{id}','路径id；前置DeleteMixin确认。','成功回读项目列表；前端仅在!relevance显示删除。']);
  if(kind==='requirementList') rows.push(['POST','/drms/portal/drmsstoriescolumn/list、/drmsstoriessource/list、/drmsstoriesattachment/list','子资源查询体storiesId。','分别读取基础字段、数据源和附件。'],['DELETE','/drms/portal/drmsstories/{id}','路径id；列表仅status=1提供删除。','成功回读需求列表。']);
  if(kind==='requirementAdd') rows.push(['POST','/drms/portal/drmsproject/myPage','{projectName,pageRequest:{pageNo:1,pageSize}}，无关键字20、有关键字200；选择传projectId。','返回项目id/projectName/deptId/deptName供联动。'],['GET','/drms/portal/drmsstoriescolumn/downloadTemplate','无业务参数；blob响应。','浏览器下载字段导入模板。'],['POST','/drms/portal/oss/temp/upload','FormData，字段file；multipart边界由客户端处理。','只有字符串响应被用作临时fileKey。'],['DELETE','/drms/portal/drmsstoriesattachment/{id} 或 /drms/portal/drmsstoriesattachment/key/{response}','附件id或上传返回key。','删除已上传附件立即生效；不随取消回滚。']);
  if(kind==='advisoryAdd') rows.push(['POST','/drms/portal/oss/temp/upload','multipart FormData，字段file。','字符串响应存为fileKey。'],['DELETE','/drms/portal/drmsadvisorsattachment/{id} 或 /drms/portal/drmsadvisorsattachment/key/{fileKey}','附件id或fileKey。','已上传文件删除立即生效。']);
  if(kind==='advisoryList') rows.push(['PUT','/drms/portal/drmsadvisors/urge、/revocation','urge:{id,type:5,message}；revocation:{id,type:3}。','成功提示并回读；状态不符由服务端拒绝。'],['DELETE','/drms/portal/drmsadvisors/{id}','路径id，确认后发送；只对状态3显示。','成功回读列表；取消无请求。']);
  if(kind==='advisoryHandle') rows.push(['POST','/drms/portal/drmsadvisors/findTaskInfo','{id,procTaskId,type}，待处理type=0、已处理type=1。','读取当前咨询快照与流程上下文。'],['PUT','/drms/portal/drmsadvisors/submit','{id,type:1,procTaskId,replyContent}。','成功后刷新列表/处理快照。'],['PUT','/drms/portal/drmsadvisors/turnTo','{id,type:4,procTaskId,assigneeId}。','成功后刷新待处理列表。']);
  if(kind==='workflowProgress') rows.push(['POST','/drms/portal/drmsTaskWorkflow','{id,storyTitle}，发起前先确认。','成功提示并重新读取任务状态；其他动作分别见共用状态动作表。'],['PUT','/drms/portal/drmsTaskWorkflow/{accept|signIn|reviewApply|review|reject|revocation|turnTo|urge|close|taskExecute}','各动作的具体参数、入口条件和相对路径逐行见共用状态动作表。','通用客户端解包；业务错误reject并展示错误，页面读取当前状态后更新。'],['POST','/drms/portal/drmsTaskWorkflow/taskAttachmentList、/drmsTaskWorkflow/taskTableList、/drmsTaskWorkflow/taskSource','tasksId、procTaskId、type或需求/任务关联id，按组件调用映射。','读取附件、数据库表和数据源快照。']);
  if(query) rows.push(['公共分页','pageRequest:{pageNo,pageSize,order}','默认1/20/id降序；分页嵌套于pageRequest，筛选字段在根对象。','响应读取datas,total；重置回初始条件。']);
  rows.push(['响应读取','公共客户端解包',p.responseFields,'HTTP 202进入业务错误处理；常规成功返回response.data；rawData返回完整响应。错误提示后reject，不能把HTTP 200等同持久化成功。']);
  return rows;
}
function nfrFor(kind) {
  const map={projectList:['001','005','006','007','008','009','011'],projectAdd:['001','002','004','005','007','008','009','011'],projectEdit:['001','004','005','007','008','009','011'],requirementList:['001','005','006','007','008','011'],requirementAdd:['001','002','003','004','005','007','008','009','011','012'],taskMy:['001','005','006','007','008','009','011'],taskPending:['001','005','006','007','008','009','011'],taskProcessed:['001','006','007','008','011'],taskLists:['001','005','006','007','008','011'],advisoryList:['001','005','006','007','008','009','011'],advisoryAdd:['001','002','003','004','005','007','008','009','011','012'],advisoryHandle:['001','002','005','007','008','009','011'],kanban:['001','006','007','008','010','011'],workflowProgress:['001','002','003','004','005','007','008','009','010','011']};
  return (map[kind]||['001','007','008','011']).map(n=>'DRMS-NFR-'+n);
}
function slug(s){return String(s).toLowerCase().replaceAll(' → ','-').replaceAll(' ','-').replace(/[^\w-]/g,'').replace(/-+/g,'-');}
function apiBase() { return '/drms/portal'; }
function renderFeature(entry){return featureFor(entry);}

function operationBoundary(){return [
  '| 历史操作编号 | 对象与操作 | 对应详细规则及交付边界 |','|---|---|---|',
  ...rows([
    ['DRMS-101','查看项目','编辑回显GET /drms/portal/drmsproject/{id}；列表独立只读详情入口不在本版扩展范围。'],
    ['DRMS-104','删除项目','!relevance才显示；确认不可恢复后DELETE /drms/portal/drmsproject/{id}；成功回读，最终删除验收未执行。'],
    ['DRMS-106','查看需求','需求任务入口携带需求id；业务信息回显GET /drms/portal/drmsstories/{id}。'],
    ['DRMS-108','修改需求','status=1编辑；PUT /drms/portal/drmsstories/{id}；字段与子集合沿用新增，非新增需求编码只读。'],
    ['DRMS-109','删除需求','status=1删除；确认后DELETE /drms/portal/drmsstories/{id}，引用保护和审计按服务端契约。'],
    ['DRMS-111','查看任务','发起方GET /drms/portal/drmstask/{id}；待办/已办POST /drmsTaskWorkflow/findTaskInfo，type为0/1。'],
    ['DRMS-112','新增任务','从需求关联任务页人工新增；需求已关闭时不显示新增。表单、关联数组和接口见子页面第4节。'],
    ['DRMS-113','修改任务','status=1和状态5/7允许的待办编辑入口分别处理；PUT /drms/portal/drmstask/{id}带procTaskId。'],
    ['DRMS-114','删除任务','status=1显示删除；DELETE /drms/portal/drmstask/{id}，成功回读。'],
    ['DRMS-116','查看咨询','列表GET /drms/portal/drmsadvisors/{id}；待处理/已处理用POST /drmsadvisors/findTaskInfo和快照附件。'],
    ['DRMS-118','修改咨询','常规列表不提供普通编辑；回复/转办是独立流程动作。通用update API不自动转为菜单功能。'],
    ['DRMS-119','删除咨询','仅已撤回status=3显示；确认后DELETE /drms/portal/drmsadvisors/{id}，成功回读。'],
  ]),''];}

function sharedRules(){return [
  '### 公共请求、分页和状态恢复','',
  '普通业务接口默认路径由API_BASE_URL的/back前缀与模块/drms/portal拼接。模块前缀允许通过MODULE_URL_PREFIX覆盖；本文路径采用本次配置的默认组合，环境更换必须重新对齐。GET参数放query，POST/PUT/DELETE请求体由公共request传data；JSON接口使用application/json，上传使用FormData。业务模块从父应用取得请求实例，不能自行另建无鉴权客户端。','',
  '| 公共环节 | 调用约定与目标行为 |','|---|---|',
  ...rows([
    ['分页请求','筛选键位于根对象；pageRequest:{pageNo:1,pageSize:20,order:[{prop:"id",asc:false}]}位于嵌套对象。查询、重置及改页长回第一页；翻页保留其余条件。'],
    ['列表响应','常规列表读取datas/total；公共Mixin还兼容直接数组。加载先清datas/total；tableFetchStatus:1加载、2有数据、3空、4失败。不能用异常分支生成空成功结果。'],
    ['日期范围','日期控件yyyy-MM-dd，起点拼T00:00:00、终点拼T23:59:59；清空时删除beginCreateTime/endCreateTime。时区、夏令时和服务端边界以版本化契约统一。'],
    ['返回恢复','sessionStorage键listSearchStore按path保存搜索对象及pageRequest；目标要求恢复日期控件、页签与分页为同一已提交条件；不保存表单秘密/附件内容。'],
    ['请求保护','withCredentials=true；公共拦截器按存在的CSRF标志及会话令牌注入头，增加时间戳、随机数与签名。这里只记录头名称与行为，不存任何真实值。'],
    ['超时顺序','按URL覆盖优先，其次请求中数字timeout，否则20000ms兜底；实例或配置中的0仍需按覆盖链核对，不能宣称所有请求固定20秒。目标为有限超时和可恢复反馈。'],
    ['响应/错误','rawData时返回完整响应；其他常规成功返回response.data。HTTP 202按NETWORK_ERROR_CODE进入业务错误链；读取data.code/data.msg交全局处理，错误Promise.reject。Blob错误先取文本中的msg；1003全局消息抑制与会话处理保持一致。不能虚构后端成功code或DTO。'],
    ['保存与删除','FormMixin验证后create/update并释放loading；DeleteMixin先提示“删除操作不能恢复，确定删除吗？”，确认后DELETE，成功提示并回读，末页删除后可前移页码。目标请求锁覆盖所有入口，不因loading样式而假定已有服务端幂等。'],
  ]),'',
  '### 需求基础数据、数据源与附件','',
  '| 子页面/按钮 | 字段、参数映射和交互 |','|---|---|',
  ...rows([
    ['基础数据字段搜索','keyword只按字段名称过滤当前草稿；不会改变服务器集合。'],
    ['新增/编辑字段','打开555px“信息项内容”弹窗，字段顺序为字段名称、字段定义、数据类型、字段长度/精度、是否主键/是否必填、信息项说明。底部重置、确定；遮罩点击不关闭。确定校验后更新本地数组；重置清空本弹窗。'],
    ['字段长度与精度','colLength非日期型必填，colPrecision仅小数型必填；当前校验为/^\\d*$/与maxlength=10，输入用数字转换；不从10字符上限推导数据库最大容量、非负精度组合或主键唯一性。'],
    ['主键与必填','primaryKey=true时将nullable设true并禁用其开关；前端标注nullable为“是否必填”。请求将布尔转0/1，服务端含义不能按字段英文名反向解释。'],
    ['删除字段/数据源','确认后只splice本地草稿，不调用API包装器中的column/source DELETE。有关同步任务的警告文案不代表已实际执行后台同步。'],
    ['Excel导入','accept=.xlsx,.xls，isParse=true关闭自动上传；FileReader/XLSX解析首个sheet并逐行校验八列：字段名称、字段定义、数据类型、字段长度、字段精度、是否主键、是否必填、信息项说明。非法行显示第N行与具体原因；日期型清length，非小数型清precision，主键强制必填。'],
    ['添加数据库','新建数据源草稿块；选datasourceId后联动key/name/host/database/schema，展示字段禁用；候选过滤已选数据源。需求页不显示表名，任务成果的表名属于另一层对象。'],
    ['需求字段序列化','storiesColumn[]:{storiesId?,id?,colName,colDesc,colType,colLength?,colPrecision?,nullable:0或1,primaryKey:0或1,explain}；日期型不传colLength，仅小数型传colPrecision。'],
    ['数据源序列化','storiesSource[]:{storiesId?,id?,datasourceId,key,name,host,database,schema}。数据源候选POST /drms/portal/drmsstories/datasource/list。不复制连接凭据。'],
    ['需求附件序列化','storiesAttachment[]:{storiesId?,id?,fileName:name,filePath:response}。编辑子表以storiesId回读；上传response为字符串key。'],
    ['子集合清空','主表单只在集合非空时赋storiesColumn/storiesSource/storiesAttachment。目标接口必须能明确表达移除最后一个子项；不得擅用省略、null或[]互相替代，联调契约须先定稿。'],
    ['需求修改回显','GET /drms/portal/drmsstories/{id}，三个子集合分别POST /drmsstoriescolumn/list、/drmsstoriessource/list、/drmsstoriesattachment/list，{storiesId}；流程快照字段/附件分别POST /drmsTaskWorkflow/storiesColumnList、storiesAttachmentList。非新增显示需求编码storyNo只读。'],
    ['即时附件写入','普通文件选择后立即POST /drms/portal/oss/temp/upload，FormData键file。字符串响应才作为成功key；附件删除按id或key立即DELETE。取消主表单只取消主记录保存，不回滚附件写入；目标应告知用户并管理临时文件清理。'],
    ['附件下载','GET /drms/portal/oss/download1/{key}，rawData=true,responseType=blob；用fileName保存。下载失败应反馈并可重试，不承诺包装器没有返回Promise时页面catch可工作。'],
  ]),'',
  '### 任务维护表单与关联数据','',
  '入口：/drms/requirement/task?id={storyId}显示当前需求的关联任务；status不等于3时允许新增。新增路由/drms/task/edit?optType=add&storyId={storyId}；编辑带id、procTaskId与business=start或pending；详情optType=view。需求主记录创建不会在此页面自动创建任务。','',
  '| 字段名称与绑定名 | 类型/控件 | 是否必填 | 默认值 | 长度/范围/单位 | 格式及校验规则 | 错误提示 | 条件/状态 |','|---|---|---|---|---|---|---|---|',
  ...rows(FIELDS.taskForm.map(([label,binding,...rest])=>[`${label}（${binding}）`,...rest])),'',
  '| 按钮/关联集合 | 页面行为与数据规则 |','|---|---|',
  ...rows([
    ['引用基础字段/附件/数据源','打开选择弹窗；确认仅更新当前任务草稿，取消不新增关联。详情展示从需求引用的原资料。'],
    ['taskRelation','映射{id,storiesAttachmentId,fileName,fileKey,tasksId,businessId:storiesAttachmentId,businessType:0}；引用需求filePath转fileKey。'],
    ['columnRelation','映射{id,storiesAttachmentId,tasksId,businessId:storiesAttachmentId,businessType:2}。'],
    ['sourceRelation','映射{id,storiesAttachmentId,tasksId,businessId:storiesAttachmentId,businessType:1}；当前代码确实使用storiesAttachmentId名称，不私改为另一个DTO键。'],
    ['提交保存','POST /drms/portal/drmstask或PUT /drms/portal/drmstask/{id}。新增带storyId；编辑带procTaskId；submitMode不为3时移除submitOther。成功提示返回并回读；失败保留草稿。'],
    ['任务详情','business=start使用GET /drms/portal/drmstask/{id}；pending/processed使用POST /drmsTaskWorkflow/findTaskInfo:{id,procTaskId,type:0或1}。有taskExplain时显示成果说明、附件与表；businessKey供流程图读取。'],
  ]),'',
  '### 任务状态、办理与流程图','',
  '任务状态：1待提交、2待接收、3处理中、4待签收、5供数部门驳回、6复核中、7政数局复核驳回、8已关闭、9已撤回、10已完成。下表是页面操作条件；完整可达状态和事务由服务端状态机契约约束，不根据此表推导未定义的状态迁移。','',
  '| 操作/入口条件 | 方法与相对路径 | 请求字段 | 反馈与恢复 |','|---|---|---|---|',
  ...rows([
    ['发起：发起人列表status=1','POST /drms/portal/drmsTaskWorkflow','{id,storyTitle}','“确定发起？”确认；成功“发起成功”并回读。'],
    ['修改/删除：status=1','PUT/DELETE /drms/portal/drmstask/{id}','保存字段见任务表单；删除用路径id','保存/删除完成后回读；删除先不可恢复确认。'],
    ['接收：待办status=2','PUT /drms/portal/drmsTaskWorkflow/accept','{id,type:1,procTaskId}','“确定接收？”；成功回读。'],
    ['提交成果：待办status=3','PUT /drms/portal/drmsTaskWorkflow/taskExecute','{id,procTaskId,taskExplain,taskAttachment?,taskTable?}','进入execute?opt=sumbit，taskExplain必填trim≤500；提交中disabled，结束解锁。'],
    ['签收/驳回：status=4','PUT /drms/portal/drmsTaskWorkflow/signIn 或 /reject','签收{id,type:1,procTaskId}；驳回{id,type:2,procTaskId}','进入execute?opt=receipt，读取成果只读。确认签收仅调signIn，不调用taskExecute。'],
    ['申请复核：status=5/7','PUT /drms/portal/drmsTaskWorkflow/reviewApply','{id,type:1,procTaskId}','确认后申请，成功回读。'],
    ['复核：status=6','PUT /drms/portal/drmsTaskWorkflow/review 或 /reject','{id,procTaskId,type,message}；type1通过，2不通过','message trim≤100；目标不通过必须非空。通过调review，不通过调reject。'],
    ['快速驳回：status=2/6','PUT /drms/portal/drmsTaskWorkflow/reject','{id,type:2,procTaskId}','确认“确定驳回？”后发送；取消无请求。'],
    ['撤回：发起人status=2/3','PUT /drms/portal/drmsTaskWorkflow/revocation','{id,type:3}','确认后发送，成功回读。'],
    ['催办：排除1/5/7/8/9/10','PUT /drms/portal/drmsTaskWorkflow/urge','{id,type:5,message}；message必填trim≤100','意见弹窗提交，成功回读；失败保留意见。'],
    ['关闭：发起人status=5；待办5/7且创建人为本人','PUT /drms/portal/drmsTaskWorkflow/close','{id,type:6}','确认后关闭；服务端校验创建人与状态。'],
    ['转办：待办排除2/3/6','PUT /drms/portal/drmsTaskWorkflow/turnTo','{id,type:4,procTaskId,assigneeId}','GET /common/user/deptuser/user/{deptId}加载人员；状态4/5/7选storyDeptId，否则用户部门；排除本人。'],
    ['流程图','GET /common/workflow/act/def/diagram','query:{procInstId:businessKey,t:timestamp}；blob响应','图像居中最大宽100%；专用axios携带会话/CSRF头，不直接套用公共客户端超时处理。'],
    ['办理历史','GET /drms/portal/drmsTaskWorkflow/histInst/{id}','任务id','环节taskName、createTime、finishTime、duration、candidate、comments[]、optName；错误与无记录分别呈现。'],
  ]),'',
  '任务提交页附件映射taskAttachment[]:{tasksId,fileName,fileKey:response}；数据库表映射taskTable[]:{tasksId,datasourceId,key,name,host,database,schema,tableName}。新增表弹窗618px，必填数据源名称和表名；先选数据源联动只读元数据。签收模式读取findTaskInfo、taskAttachmentList、taskTableList（type=0）。取消返回不会撤销已经发生的临时附件上传/删除。','',
  '### 咨询处理、回复与快照','',
  '咨询处理页按frontResource权限过滤待处理pending/已处理processed页签；不提供独立新增按钮。待处理筛选只有标题与时间，不显示普通列表的状态筛选。详情路径/drms/advisory/edit?optType=view&id={id}&procTaskId={procTaskId}&business=pending&opt=reply；已处理business=processed，type=1只读；列表business=list使用GET /drms/portal/drmsadvisors/{id}。','',
  '| 功能 | 方法与相对路径 | 参数与页面处理 |','|---|---|---|',
  ...rows([
    ['咨询列表','POST /drms/portal/drmsadvisors/page','{title,status,beginCreateTime?,endCreateTime?,pageRequest}，返回datas/total。'],
    ['待处理/已处理','POST /drms/portal/drmsadvisors/todoPage、/drmsadvisors/donePage','{title,beginCreateTime?,endCreateTime?,pageRequest}，无状态筛选。'],
    ['详情快照','POST /drms/portal/drmsadvisors/findTaskInfo','{id,procTaskId,type:0或1}。附件普通列表POST /drmsadvisorsattachment/list:{advisorsId}；快照POST /drmsadvisors/workflow/attachmentList:{advisorsId,procTaskId,type}。'],
    ['回复','PUT /drms/portal/drmsadvisors/submit','{id,type:1,procTaskId,replyContent}；回复内容trim后必填≤100；成功“回复成功”并返回。'],
    ['转办','PUT /drms/portal/drmsadvisors/turnTo','{id,type:4,procTaskId,assigneeId}；按咨询deptId加载候选，排除本人和createUser；必选。'],
    ['新增附件映射','POST /drms/portal/drmsadvisors','advisorsAttachment[]:{advisorsId?,fileName,fileKey:response}；不是需求附件的filePath字段。'],
  ]),'',
  '### 看板数据与排名','',
  'dateType取1本月、2本年、3全部。看板调用findReport后同一响应刷新projectNum/storiesNum/taskNum、storiesProgress、taskProgress、storiesProgressSort、storiesNumSort。进度比值以finish/showValue参与并列名次判断，规模以showValue判断；竞争排名按输入顺序得到1、1、3，前端没有另行排序。目标须对分母0、缺字段、无序输入和空数组设明确反馈，排序及统计范围不得凭样本推定。','',
];}

function renderNfrSection(){
  return ['## 9. 非功能性需求','',
    '本节定义可执行的质量目标；每项均有独立NFR编号，所有应用端与质量验收当前均未执行。指标的目标来源与既有实现差异见[核查记录](./核查记录.md)。','',
    '| 编号 | 质量属性 | 需求与量化指标/不变量 | 验收方法及通过条件 | 关联功能 | 状态 |','|---|---|---|---|---|---|',
    ...rows(NFRS.map(([id,q,req,test,features])=>[id,q,req,test,features,'未执行'])),'',
    '性能测量口径：在授权的隔离环境使用Windows10/11、Chrome/Edge当前及前一稳定大版本，记录具体版本、客户端CPU/内存、网络RTT/上下行带宽、服务端/数据库/网关资源与数据分布。查询响应从用户点击查询或提交筛选的同一时钟起，至表格显示本次结果且分页可操作止，包含网络与渲染；冷缓存与热缓存分别报告。50个独立读会话，预热3分钟、统计10分钟，每种查询至少500次成功样本并同时统计全部失败样本；按升序第ceil(p×N)项计算P50/P95/P99，报告吞吐、失败和限流次数。合法请求的5xx、超时、解析错误和错误业务结果计失败，预期业务拒绝单列；样本不足或环境信息缺失不能判通过。大文件上传按文件大小、带宽及服务端配置单独衡量，不套用3秒查询目标。',
    '当前材料没有月度可用率、RTO/RPO或吞吐实测，不定义未经业务批准的生产SLA。所有质量用例当前状态为未执行。',''];
}
function renderMain(previous='') {
  return renderDocument('main',previous);
}
function renderSub(previous='') {
  return renderDocument('sub',previous);
}
function renderDocument(type,previous='') {
  const entries=type==='main'?MAIN:SUB;
  const title=type==='main'?'业务需求管理系统业务需求说明':'业务需求管理系统子页面与操作需求细化';
  const requirements=entries.map(renderFeature).join('\n');
  const oldTable=preservedAcceptance(previous,type);
  const sourceRows=section(previous,8).split(/\r?\n/).filter(l=>/^\| DRMS-\d{3} \|/.test(l));
  if(type==='main'&&JSON.stringify(sourceRows.map(row=>row.split('|')[1].trim()))!==JSON.stringify(MAIN.map(e=>e.id)))throw new Error('DRMS published source rows missing or reordered');
  const intro=type==='main'?
    ['## 1. 业务目标与使用角色','','把部门的数据诉求归入项目，提交可追踪的需求申请，关联协作任务与咨询办理。使用角色由登录用户的服务端授权决定；业务申请人、需求受理人、项目负责人等具体角色名称和范围以权限契约为准。入口：需求管理 → 业务需求管理系统。','',
     '## 2. 业务范围','','覆盖需求看板、项目查询/新增/修改/删除、需求查询/新增/编辑/删除、任务列表/维护/办理、咨询列表/新增/处理，以及字段、附件和数据源关联。目标路由、按钮与状态条件逐条定义；没有页面入口的写接口不单独推导为产品功能。','',
     '## 3. 功能需求','',requirements,
     '## 4. 字段与业务规则','','各页面字段、绑定名、必填、默认值、长度、枚举和错误提示见对应功能字段表。跨页面枚举：需求状态1待启动、2已启动、3已关闭；任务状态1待提交、2待接收、3处理中、4待签收、5供数部门驳回、6复核中、7政数局复核驳回、8已关闭、9已撤回、10已完成；咨询状态1待处理、2已完成、3已撤回。数据库字段类型枚举为短字符、较长字符、长字符、日期型、整数型、小数型、逻辑型、文本型。','',
     '## 5. 主要业务流程','','1. 有权限的用户建立或选择所属部门项目。\n2. 用户创建需求，选择项目，补充业务用途、预期成效，并按需维护基础字段、数据源与附件。\n3. 用户从需求关联任务页创建协作任务；任务随后进入待接收、处理中、待签收/复核等按状态区分的工作流。\n4. 用户可以单独提交需求咨询；受理人回复或转办；完成与撤回状态由服务端返回。\n5. 看板按用户授权范围读取统计；看板不发起写操作。','',
     '## 6. 验收标准','',...oldTable,
     '## 7. 实现与交付边界','','现有可开发范围是字段与前端调用链已定义的页面交互；持久化结果、服务端角色矩阵、状态机事务与附件生命周期须按核查记录中的外部契约完成后，才可通过真实业务验收。静态实现定义与历史截图不代表当前服务端运行结果。','',...operationBoundary(),'',
     '需求申请可以增加AI辅助补全与相似需求检索，输出引用的申请字段和相似项依据，由用户明确采纳；模型不得自动保存需求、分派任务或上传附件。具体见[AI-001](../AI能力规划.md#ai-001-需求申请补全与相似需求检索拟定需求)。','',
     '## 8. 关联资料','','[子页面与操作细化](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [历史截图索引](../evidence/live-recheck-20261022/README.md) · [静态实现证据索引](../evidence/drms-review-20261026/README.md) · [调研记录归档](./调研记录.md)','',
     '| 需求编号 | 界面依据 | 详细记录 |','|---|---|---|',...sourceRows,'',...renderNfrSection()]:
    ['## 1. 范围与入口','','本文件补充[模块业务需求正文](./需求说明.md)，覆盖需求看板、项目管理、需求管理、任务中心和需求咨询五个实际导航分区及各自表单/处理页面。页面与静态实现的覆盖范围和限制见[核查记录](./核查记录.md)。','',
     '## 2. 证据与观察','','历史页面截图均来自2026-10-22、1500×1000视口，截图用途、路由和错误状态见[现场证据索引](./evidence/live-recheck-20261022/README.md)。静态公开资源于2026-10-26读取并离线分析；没有执行下载代码、调用业务接口或运行写入操作。','',
     '| 页面 | 当前功能编号 | 页面截图/元素 | 页面用途 |','|---|---|---|---|',
     ...rows([['需求看板 → 需求看板','DRMS-500',screenshot('P-DRMS-001'),'统计看板'],['项目管理 → 我的项目','DRMS-501、502、503',screenshot('P-DRMS-002')+'；'+screenshot('P-DRMS-002-op1')+'；'+screenshot('P-DRMS-002-op2'),'查询、新增、编辑'],['需求管理 → 我的需求','DRMS-504、512',screenshot('Y-DRMS-003')+'；'+screenshot('T-DRMS-requirement-add-direct'),'有效完整需求列表、四页签表单首屏'],['任务中心 → 我发起的任务','DRMS-505',screenshot('P-DRMS-004'),'发起人任务列表'],['任务中心 → 待处理任务','DRMS-506',screenshot('P-DRMS-005'),'待办列表'],['任务中心 → 已处理任务','DRMS-507',screenshot('P-DRMS-006'),'已办列表'],['需求咨询 → 咨询列表','DRMS-508、509',screenshot('P-DRMS-007')+'；'+screenshot('P-DRMS-007-op1'),'咨询查询与新增'],['需求咨询 → 咨询处理','DRMS-510、511',screenshot('Z-DRMS-008')+'；'+screenshot('P-DRMS-008-op1'),'有效处理页；共用新增咨询表单的入口冲突见核查记录']]),'',
     '## 3. 编号功能需求','',requirements,
     '## 4. 字段、枚举和约束','',...sharedRules(),'',
     '## 5. 主要流程','','项目 → 需求申请 → 人工关联任务 → 按工作流状态办理；咨询作为独立申请，由待处理办理人回复/转办；看板仅读取统计。任何关联均使用稳定id，名称只供显示。需求创建表单上的附件上传先于需求主记录提交，取消不撤销已发生的上传/删除；数据源、基础数据和附件清空规则按外部契约执行。','',
     '## 6. 验收用例','','以下集中回归保留既有验收编号；详细可操作步骤见对应功能的五条验收。全量应用端验收尚未执行。','',...oldTable,
     '## 7. 实现与交付边界','','任何空白属性表示现有证据没有证明其值，开发者必须依据核查记录中列明的接口或业务材料补齐，不能凭常见后台习惯推断。','',
     '| 历史操作编号 | 对象与操作 | 本版实现边界 |','|---|---|---|',
     ...rows([['DRMS-101','查看项目','详情字段和可见入口由页面路由、行操作确认；详情视图未单独采样。'],['DRMS-104','删除项目','前端仅relevance为假时显示；确认弹窗来自通用删除Mixin；未执行删除。'],['DRMS-106','查看需求','需求列表可进入需求任务；编辑页GET用于回显；独立只读详情页未采样。'],['DRMS-108','修改需求','页面status=1显示编辑；保存PUT /drmsstories/{id}；未提交写请求。'],['DRMS-109','删除需求','页面status=1显示删除；DELETE /drmsstories/{id}；未执行删除。'],['DRMS-111','查看任务','详情GET/工作流快照支持读取；真实后端权限未验收。'],['DRMS-112','新增任务','从需求关联任务页新建；不在我发起列表凭空增加新增按钮。'],['DRMS-113','修改任务','status=1允许编辑；PUT /drmstask/{id}；未执行。'],['DRMS-114','删除任务','status=1可删除；确认和服务端级联影响未验收。'],['DRMS-116','查看咨询','咨询列表/处理快照可读取；详情权限未验收。'],['DRMS-118','修改咨询','列表没有普通编辑入口；仅处理中的回复/转办动作，不把通用PUT API当作编辑。'],['DRMS-119','删除咨询','status=3显示删除；DELETE /drmsadvisors/{id}，未执行。']]),'',
     '## 8. 来源链接','','[核查记录](./核查记录.md) · [静态实现证据索引](../evidence/drms-review-20261026/README.md) · [现场截图索引](../evidence/live-recheck-20261022/README.md) · [AI能力规划](../AI能力规划.md#ai-001-需求申请补全与相似需求检索拟定需求) · [模块非功能性需求](./需求说明.md#9-非功能性需求)',''];
  return qualify(['# '+title,'','<!-- 业务规格格式:plain-v1 -->','<!-- drms:generated-spec-v1 -->','',`修订日期：2026-10-26。目标业务行为见本文；静态实现差异、外部依赖与验证边界见[独立核查记录](./核查记录.md)。`,``,...intro].join('\n')).replaceAll('(./evidence/','(../evidence/');
}
function preservedAcceptance(previous,type){
  const rowsOld=section(previous,6).split(/\r?\n/).filter(line=>/^\| DRMS-AC-\d{3} \|/.test(line));
  const start=type==='main'?1:500,end=type==='main'?66:538;
  const expected=Array.from({length:end-start+1},(_,i)=>`DRMS-AC-${String(start+i).padStart(3,'0')}`);
  if(JSON.stringify(rowsOld.map(row=>row.split('|')[1].trim()))!==JSON.stringify(expected))throw new Error('DRMS published acceptance rows missing, duplicated or reordered');
  return ['| 编号 | 场景 | 操作与结果 | 关联需求 | 执行状态 |','|---|---|---|---|---|',...rowsOld.map(line=>{
    const c=line.split('|').slice(1,-1).map(x=>x.trim());
    const sub=c.length===4;
    const ref=sub?c[2]:c[3];
    const clean=s=>s.replace(/【[^】]*】/g,'').replace(/待确认|拟定需求|本轮|源码/g,'外部契约').replace(/未知规则先完成产品确认。/g,'').replace(/规则未明确的分支先评审。/g,'').replaceAll('显示未取得数据','显示获取失败');
    return '| '+[c[0],clean(sub?'集中回归':c[1]||'业务验收场景'),clean(sub?c[1]:c[2]||'按关联功能规格执行并核对页面反馈与数据回读。'),ref,'未执行'].map(esc).join(' | ')+' |';
  }),''];
}
function section(text,number){
  const headings=[...text.matchAll(/^## (\d+)\.[^\n]*\n/gm)];
  const i=headings.findIndex(h=>Number(h[1])===number);
  if(i<0)return '';
  return text.slice(headings[i].index+headings[i][0].length,headings[i+1]?.index??text.length);
}
function writeDocuments(root){
  const dir=path.join(root,'doc/requirements/03-业务需求管理系统');
  const main=path.join(dir,'需求说明.md'),sub=path.join(dir,'子页面与操作细化.md');
  const nextMain=renderMain(fs.readFileSync(main,'utf8'));
  const nextSub=renderSub(fs.readFileSync(sub,'utf8'));
  fs.writeFileSync(main,nextMain,'utf8');
  fs.writeFileSync(sub,nextSub,'utf8');
}
module.exports={MAIN,SUB,FIELDS,PROFILES,NFRS,renderFeature,renderMain,renderSub,renderNfrSection,writeDocuments,apiRows,nfrFor,goal};
