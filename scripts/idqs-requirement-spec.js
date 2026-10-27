/* IDQS reviewed requirements. Pure offline renderer; never calls application APIs. */
const fs=require('node:fs'),path=require('node:path'),published=require('./idqs-published-registry.json');
const ROOT=path.resolve(__dirname,'../doc/requirements');
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','|'+heads.map(()=>'---').join('|')+'|',...rows.map(r=>'| '+r.map(v=>String(v??'').replaceAll('|','&#124;').replaceAll('\n','<br>')).join(' | ')+' |'),''];
const f=(name,type,required='',value='',limit='',rule='',error='',state='')=>[name,type,required,value,limit,rule,error,state];
const ro=(n,r='')=>f(n,'只读','','','',r,'','读取成功后');
const input=(n,req='',len='',rule='')=>f(n,'文本',req,'空字符串',len,rule,req?'必填值不能为空；长度/格式不合法时定位字段':len?'超限时定位字段并保留草稿':'');
const sel=(n,req='',rule='',value='空字符串')=>f(n,'候选选择',req,value,'',rule);
const paging=[f('页号 pageRequest.pageNo','integer','是','1','≥1','查询/重置/换页大小回首页'),f('页大小 pageRequest.pageSize','integer','是','20','正整数','普通列表公共mixin默认20；order默认[{prop:"id",asc:false}]；选择配置弹窗默认10；智能结果order为prop空字符串')];
const api=(use,method,url,params='',read='验证本项响应结构；维护成功后回读对象或列表')=>[use,method,'/back/idqs/base'+url,params,read];
const control=(n,input,act,result='成功回读当前对象；失败保留安全上下文')=>[n,input,act,'请求中禁相关重复入口，finally解除忙碌',result];
const PROFILES={};
function profile(k,purpose,fields,controls,flow,apis,layout,checks){PROFILES[k]={purpose,fields,controls,flow,api:apis,layout,checks};}
const composeFields=[
 sel('查询范围 rangValue → scopeId','是','从getListByUsers取id/scopeName；切换清失效关系、条件及显示列'),
 input('本地树搜索 filterText','','','按tableName/colName的indexOf匹配；不是后端模糊搜索'),
 ro('范围树 tables/columns','tableName/tableComment、colName/colDesc；根“全部表”vid=-1；临时guid/vid不能当业务ID'),
 f('已选表 queryTables','array','至少1','[]','','提交[{queryTable:tableName}]；多个表必须全体在关联图内连通'),
 f('关联 queryableRefs','array','多表时是','[]','','queryTable1/table1Col/queryTable2/table2Col必填；禁止自关联；首关系左表为主表；第二行起左表必须在前行已出现；相同有向表对refType一致'),
 f('关联方式 refType','integer','每条是','','1左连接/3内连接','候选为left join/inner join，不把3写成2或右连接'),
 input('关联备注 remark','','','可选；只校验真实必填键，不对整个关系Object.values一律判空'),
 f('条件模式 conTypeValue → whereType','integer','是','1','1自定义/2 SQL脚本','切模式清对应旧草稿；脚本是whereScript，不等同任意完整SQL执行权'),
 f('脚本 whereScript','textarea','按模式','空字符串','','语法、长度及可用表达式按批准查询契约；服务端受限解析/参数绑定，不拼接执行用户SQL'),
 f('条件项 conditionData','array','','[]','','queryTable/tableCol/whereType/whereVal/whereRefType；拖字段形成条件，最多两层；三个及以上条件时可拖拽设置组合、拆分和删除'),
 f('条件运算符 whereType（条件项）','integer','有条件时','','1等于/2不等于/3大于/4小于/5非空/6为空','与外层模式whereType同名但层级不同；5/6隐藏值，其余校验值；0/false是合法值'),
 f('组合关系 line1Value/whereRefType','integer','有条件时','1','1且/2或','提交嵌套whereTree={whereRefType,items}；无条件null，移除groupId/vid/colShow等页面辅助键'),
 f('显示列 queryColumns','array','至少1','[]','','queryTable/tableComment/queryColumn/columnName；同表同字段不重复；tuple判重；别名trim非空且唯一；可上下移动和删除'),
 input('配置名 saveModel.queryName','保存时是','≤100','trim后非空；执行不要求先保存'),input('配置描述 saveModel.queryDesc','','≤300'),
 sel('已有配置 selectedConfigValue','确认选择时是','必须当前scopeId；单选配置id','null'),
 f('选择弹窗 hasConfigParams','object','','pageNo1/pageSize10','','scopeId/queryName/createUser/pageRequest；关闭清筛选、选择与页号'),
 ro('结果 saveParams/pageResponse/queryColumns','结果页从route.params初始化；datas/total；列prop=columnName；直接刷新缺参数回编辑区'),
 f('结果筛选 searchObj/filterVal','文本映射','','{}','','按显示列筛选并回首页；目标按表+字段组合键隔离；新查询清筛选，分页保留'),...paging,
];
const composeAPI=[
 api('授权范围','POST','/queryscope/getListByUsers','','id/scopeName数组'),api('范围及表列','GET','/queryscope/detail/{id}','scopeId','tables/columns及范围信息'),
 api('选择配置候选用户','GET','/queryobject/users','','id/createUsername候选'),api('选择配置/配置列表','POST','/queryobject/page','{scopeId?,queryName,createUser,pageRequest}','datas/total；配置id/queryName/queryDesc等'),
 api('配置回填','GET','/queryobject/{id}','配置id','查询模型；校验引用仍有效后回填，不自动执行'),
 api('保存当前配置','POST','/queryobject','{id:inquireId,scopeId,whereScript,whereType,queryName,queryDesc,queryTables,queryableRefs,whereTree,queryColumns}','即使有id仍POST；新增/覆盖及版本语义由服务契约交付'),
 api('执行即席查询','POST','/queryobject/query','查询模型；queryName="search"；pageRequest初始1/20','pageResponse.datas/total和queryColumns；包装器timeout:0必须改为有限预算'),
 api('导出即席结果','POST','/queryobject/export','查询模型；queryName="export"；当前会删除各列filterVal','rawData/blob；当前范围不等同当前筛选，提交前明确导出条件及额度'),
];
profile('compose','在授权范围内选择表、连接、条件与显示列，复用和保存查询定义，明确执行查询及导出的边界。',composeFields,
 [control('切范围/勾选表/过滤树','授权scopeId及表列','切范围清草稿再读详情；取消表同时移除所有失效关联、条件及显示列'),control('新增/删除关系、拖拽条件和显示列','已选表及有效字段','维护本地模型；字段候选依赖所属表；拖拽另提供键盘替代'),control('选择已有配置/确认/取消','先选范围、单选配置id','弹窗1/10分页；确认GET详情回填，取消不改原草稿，不自动查询'),control('保存配置','名称≤100、描述≤300及有效模型','POST queryobject；成功回读；有id不得擅改成PUT'),control('查询/结果分页/筛选/返回','有效模型和当前授权','导航/idqs/result后执行；返回/inquire?cache=true保留草稿；刷新缺route.params不重发旧SQL'),control('导出/保存结果页配置','明确条件、额度和权限','导出前展示实际范围；保存只保存定义，文件错误体不保存为结果')],
 ['进入/inquire读取授权范围；无cache上下文时初始化空范围、表、条件和列，默认relation页签、条件模式1、组合关系1。没有范围展示操作指引，不发查询。','选择范围读取表/列；全树“全部表”仅为UI根，与范围管理的全部表策略分开。取消表要级联清关联/条件/显示列，候选失败不保留旧表。','至少一表和一显示列；多表以首关系左表为主表验证所有已选表连通，禁止自关联；有向表对方式一致。关联备注可选，显示别名非空唯一；服务端复验表列归属与权限。','自定义条件由树字段拖入，5非空/6为空不需要值，其余值区分0/false与缺失。切到自定义清conditionData及line1Value，切到脚本清whereScript；保存仅提交当前模式有效内容。','保存POST查询定义；选择配置GET后回填，不代表读取结果快照。范围、表列或权限已失效时定位错误，不静默放宽范围。','查询导航/result，created用route.params发/queryobject/query；queryName="search"、初始1/20，筛选值写queryColumns[].filterVal，分页保留筛选，新查询清筛选。结果页不得将缺失列/结构错误解释为空表。','导出当前实现移除filterVal并用queryName="export"，必须明确“按查询定义导出”的实际范围或经契约修正后才提供当前筛选导出。返回缓存只恢复草稿；刷新缺参数返回编辑区，不自动重跑昂贵查询。'],composeAPI,
 '1500×1000历史样本左侧模块导航、窄范围栏及表搜索树，右侧工作区；未选范围显示四步欢迎卡，选范围后关联/条件/显示列三页签，右上查询、重置、保存和选择已有配置。关系宽表局部横滚；条件分组和列顺序可读。结果页以筛选行+动态结果列及分页展示，页首返回、查询、保存和导出。保存与选择配置为独立弹窗。',
 ['选/取消范围与表后不遗留失效关系、条件及列；同表字段判重使用组合键。','1左连接/3内连接、自关联、孤立表、备注空、别名空/重复及0/false条件边界逐项验收。','选择配置仅回填；保存POST的嵌套whereTree和queryColumns准确，返回保草稿，取消无维护写入。','结果初始1/20、筛选/分页及迟到响应正确；无参数刷新不重发，timeout:0不得成为无限查询。','导出条件与当前筛选差异明确；错误blob/失权/超额拒绝；直接API的SQL/行列/范围越权全部失败。']);
profile('guide','通过操作指引理解范围、关系与条件、显示列和结果的先后顺序，避免把导航或保存当作查询已完成。',
 [ro('四步操作指引','设置查询范围→选择查询范围→设置查询条件和显示列→搜索并展示数据'),sel('查询范围 scopeId','查询前是','授权id，不从文案生成ID'),ro('当前编辑/结果上下文','定义、执行及结果分别标识，空范围为欢迎态')],
 [control('设置范围入口/范围选择','具备范围读取或维护权限','导航范围管理或读取授权表列；不能因点击指引自动创建范围'),control('关联/条件/显示列页签','范围有效','切换只改草稿视图，不自动保存/执行'),control('查询/返回','有效查询定义','显式查询才进/result执行，返回仅恢复草稿')],
 ['进入欢迎态展示四步及对应入口，不生成查询配置、不自动执行查询；设置范围、选择范围、配置表列是不同动作。','按授权范围→表与关联→条件及显示列→查询结果组织工作；仅一表可没有关联，多表必须全连通；不把操作指引写成后台任务状态机。','每个入口独立验权；有无配置、空结果、无权、读取失败分别解释。指引展示不证明自然语言转SQL、数据返回或模型调用成功。','返回、关闭指引与换页签不产生维护或执行；查询、保存、导出各有独立确认和成功语义，细则由IDQS-500承接。'],
 composeAPI.slice(0,2),
 '欢迎卡位于主工作区，四步图文按视觉顺序展开；保持左侧范围入口可达，选范围后工作区转入编辑态。错误不覆盖为欢迎态，键盘可到达各入口。',
 ['初始空范围展示四步而非结果空表，说明顺序与历史图一致。','导航/切页签无POST保存或SQL执行；范围维护与选择范围区分。','单表/多表配置按相应规则引导，必填错误可定位。','无权、候选失败及合法空态文案有区别，重认证不自动执行。','从结果返回保留安全草稿；指引展示不标记AI/业务验收通过。']);
const rangeFields=[input('筛选 scopeName','','','trim'),sel('筛选 createUser','','候选id/createUsername'),...paging,
 ro('范围行','id/scopeName/scopeTargetName/scopeTables/scopeDesc/createUsername/lastModifyTime/isCurrentUser/roleList/deptList'),
 input('范围名 scopeName（表单）','是','≤100','trim后非空；新增/编辑可改，view只读'),input('范围描述 scopeDesc','','≤300','trim'),
 f('范围类型 scopeType','integer','是','1','1数据源','可见单选仅数据源；存在资源目录代码不构成可用入口'),
 sel('数据源 scopeTarget','新增时是','GET datasource/sources取id/name；变更清表候选及已选表，更新scopeTargetName'),ro('数据源名称 scopeTargetName','按稳定ID查候选；候选失效明确错误，不访问undefined.name'),
 f('范围表 scopeTablesArr/scopeTables','多选/字符串','新增时是','[]/空字符串','','表候选tableName；全部表与指定表互斥；scopeTableType=1全部/2指定，当前scopeTables逗号join且全部表用本地化文本哨兵；稳定编码和转义由契约交付'),
 f('角色权限 roleIdList/roleList','多选/array','','[]','','候选id/name；提交roleList:[{roleId}]'),f('部门权限 deptIds/deptList','树多选/array','','[]','','递归全选所有部门id；取消全选[]；提交deptList:[{deptId}]'),
];
const rangeAPI=[api('范围分页','POST','/queryscope/page','{scopeName,createUser,pageRequest}','datas/total及范围行'),api('创建人','GET','/queryscope/users','','id/createUsername'),api('范围详情','GET','/queryscope/{id}','范围id','表单回填；与查询编辑器用/detail/{id}的用途分开'),api('新增范围','POST','/queryscope','scopeName/scopeDesc/scopeType/scopeTarget/scopeTargetName/scopeTableType/scopeTables'),api('修改范围','PUT','/queryscope/{id}','范围id；目标仅名称/描述可改；拒绝隐藏源/表变更'),api('删除范围','DELETE','/queryscope/{id}','范围id；确认后提交，服务端引用/权限/版本保护'),api('数据源','GET','/datasource/sources','','id/name'),api('数据源表','GET','/datasource/tables','query id=scopeTarget','tableName候选'),api('角色候选','GET','/queryscope/roles','','id/name'),['部门树','POST','/back/common/user/dept/tree','','部门树；精确结构按正式契约'],api('更新权限','POST','/queryscope/updatePerm','{id,roleList:[{roleId}],deptList:[{deptId}]}','空数组和两集合组合语义由契约交付；回读权限及受影响身份')];
profile('range','维护可供查询的数据源表范围及角色/部门授权，保护已保存查询对范围的引用。',rangeFields,
 [control('查询/重置/分页','名称与创建人','trim筛选、回首页；重置清条件，公共列表1/20按id倒序'),control('新增/名称查看/编辑','范围id和模式','新增可选源表；edit/view禁改scopeType/源/表，edit只改名称描述'),control('删除/确认/取消','当前范围id及引用','明确名称和影响后DELETE；取消无DELETE；冲突回读不提前移除行'),control('设置权限/全选/确认/取消','本人入口+独立授权','回填roleList/deptList，确认POST updatePerm；取消不写，撤权即时失效策略由服务端落实')],
 ['读取范围分页和创建人候选；scopeName链接进view，新增进create；本人isCurrentUser显示编辑、删除和权限入口，各有独立权限键。服务端不能信任isCurrentUser。','新增默认scopeType=1，其余空；选数据源后读取表，多选指定表或互斥全部表。切源先清scopeTableType、scopeTables和scopeTablesArr，迟到候选不能覆盖新来源。','scopeName必填trim≤100、scopeDesc≤300。edit/view回填详情后禁源和表，view全只读；修改仅名称描述，不能借body隐藏键改源。','全部表当前序列化为本地化展示文本；交付采用服务端批准的稳定编码，并明确逗号/特殊标识符、后续新增表是否自动纳入与逐列鉴权。资源目录scopeType=2仅有残留代码/API包装器，不提供未经定义入口。','权限弹窗回填角色ID及部门ID，角色多选、部门树递归全选；确认提交{id,roleList,deptList}。空集合的拒绝/清空语义和角色部门OR/AND由契约决定，不能猜成公开访问。','删除先确认当前对象/引用，再DELETE；保存配置和查询历史引用需保护。权限变更或范围删除后所有已保存配置、智能查询、缓存和下载均重新鉴权，不因旧结果id续读。'],rangeAPI,
 '采用N-IDQS-002的正常范围列表：顶部范围名/创建人及查询重置，下方右侧新增，中间范围名、源、表、描述、创建人、更新时间及操作，底部分页。表单独立页，源/表依赖选择，名称描述可读。权限为600px历史弹窗，角色多选与部门树；不将历史宽度固定到小屏。',
 ['普通列表初始1/20按id倒序，名称trim、创建人稳定ID、名称查看只读正确。','100/101、300/301及纯空白边界；切源清旧表，全部表和指定表互斥。','新增POST、编辑PUT且禁源表；直接body篡改、跨用户id和资源目录伪入口拒绝。','权限回填及全选/清空提交精确；空数组/OR-AND/撤权按批准契约验证，取消不写。','引用中或并发变化的范围删除受保护；成功回读，结果未知先查；撤权后配置/结果/下载均失效。']);
const configFields=[input('筛选 queryName','','','trim'),sel('筛选 createUser','','id/createUsername'),...paging,ro('查询配置行','id/queryName/queryDesc/createTime/createUsername/queryTime/isCurrentUser/hasPermission'),ro('查询耗时 queryTime','毫秒除1000保留3位秒；0显示0.000，null/缺失显示“-”')];
profile('configs','检索已保存查询定义，授权查看并回填编辑区，独立删除本人有权维护的定义。',configFields,
 [control('查询/重置/分页','配置名、创建人','普通列表分页；新筛选回首页'),control('查看','isCurrentUser或hasPermission入口、配置id','导航/inquire?id读取并回填；不自动查询或保存'),control('删除/确认/取消','本人入口及独立delete权限','公共删除确认后DELETE，成功回读并处理末页；取消不写')],
 ['普通分页取queryName/queryDesc/createTime/createUsername/queryTime；queryTime为毫秒显示秒，真实0与缺失分开。','查看入口条件isCurrentUser或hasPermission；转入/inquire?id后GET配置与范围详情并回填，不加载结果快照。服务端复验访问与行列权限。','本人显示删除入口及独立delete权限键，公共确认后DELETE /queryobject/{id}。不能将删除配置定义解释为删除源数据、查询日志或撤销已运行SQL。','返回保列表条件和有效页号；跨身份不得复用sessionStorage里的旧条件/数据。超时结果未知先读配置/审计，不盲目重试删除。'],
 [api('配置分页','POST','/queryobject/page','{queryName,createUser,pageRequest}','datas/total'),api('创建人','GET','/queryobject/users','','id/createUsername'),api('查看回填','GET','/queryobject/{id}','配置id','查询定义'),api('删除配置','DELETE','/queryobject/{id}','配置id；确认后','回读配置及列表；不删除源数据')],
 '顶部配置名、创建人筛选及查询重置；表格依次序号、配置名、描述、创建时间、创建人、查询耗时和操作；查看进入编辑工作区，删除独立确认，底部分页。',
 ['名称trim及创建人筛选、分页/重置正确；queryTime=0显示0.000秒。','本人/获授权配置可见查看；只打开页面不保存或执行查询。','删除确认/取消分开，确认仅配置id，回读及末页恢复正确。','替换他人配置id、失权用户和隐藏按钮直调均拒绝；旧条件不跨身份复用。','删除断网结果未知先回读，删除定义不改变源表数据或冒充撤回SQL。']);
profile('configView','将已保存配置作为可编辑草稿回填，保留范围、表列和条件的真实引用，避免把查看误作执行。',composeFields,
 [control('查看打开/回填','route.query.id','GET配置，再取scopeId详情并恢复树、关系、条件、列；数据不合法时禁止依赖执行'),control('保存/查询/返回','独立动作及有效模型','保存POST queryobject，查询另进/result；无提交返回不改已存定义')],
 ['从已有配置查看携带id进入/inquire?id；当前激活入口读取配置，随后scopeChange并恢复选表、关联、嵌套条件和显示列。','配置引用范围与授权表列实时复验；缺失源/字段或撤权明确失效，不悄悄丢条件或替换范围执行。','回填仅生成草稿，不自动执行SQL或保存；用户修改后分别选择保存、查询或放弃。POST携带id的覆盖/版本语义按正式契约，不能推定安全另存。','查询结果仅由显式查询产生；返回/inquire?cache=true保留本地草稿，缺route.params刷新结果页时返回编辑区。'],composeAPI,
 '历史K-IDQS-003-op1显示左范围/表树和右关系编辑区，已回填一条关系，右上查询/重置/保存/选择配置；这是编辑工作区，不能改写为只读详情表或结果页。',
 ['查看导航携带配置id并正确回填scopeId、关系、条件树及列顺序，无自动查询。','引用被删除/撤权/字段漂移时标失效并禁止执行，不静默扩大数据范围。','本地修改无POST；显式保存才POST且保配置id，覆盖冲突按服务契约处理。','取消选择配置不丢原草稿；返回/刷新不会重复执行旧SQL。','queryableRefs临时键剔除、whereTree嵌套及0/false合法值完整；跨配置id访问服务端拒绝。']);
const aiFields=[
 sel('查询范围 scopeId','是','授权范围id'),input('问题 question','是','','trim非空；问题最大长度、模型预算和敏感内容处理由批准契约定义'),
 ro('推荐/历史 queryText/question','top5推荐与top10历史分开；点推荐立即toSearch，历史autocomplete取queryText'),
 ro('会话结果 chatHistory[].id/question/scopeId/sql/headers/pageResponse','每条响应绑定原问题及scopeId；headers动态列、datas/total，whereVal筛选行不计入结果总数'),
 f('SQL草稿 sqlText','textarea','重跑时是','','','查看SQL仅本地展示；编辑后显式runSql，不以生成SQL代表安全正确'),
 f('筛选 whereVal','object','','{}','','按当前消息id隔离，筛选回首页'),f('分页 pageRequest','object','是','pageNo1/pageSize20','','order:[{prop:"",asc:false}]；最大页大小/排序白名单按契约'),
 f('图表 graphicType','integer','绘图时是','空字符串','1饼/2柱/3折线','选择类型清columnIndex；pie默认dataRange10，bar/line20'),
 sel('图表维度 rowIndex → rowCol','绘图时是','picCol返回allCols候选'),f('图表数值 columnIndex → columnCols','多选','绘图时是','[]','','picCol返回numberCols候选；提交lineNumber=dataRange、picType=graphicType'),
 ro('图表 uuid/cakes/columnar','picCol取uuid；queryPic/{uuid}返回picType及cakes或columnar；缺序列不得自动补0冒充数据'),
 f('语音 file','WAV Blob/FormData','上传时是','','16 bit/16000 Hz/单声道','麦克风需用户明确触发授权；文件大小/时长/格式及识别预算按批准契约'),
 ro('语音状态 checkState/voiceText','1识别中/2成功/3失败；确认识别文本仅填question，不自动查询'),
];
const aiAPI=[api('授权范围','POST','/queryscope/getListByUsers','','id/scopeName'),api('推荐问题','GET','/queryrecommend/top5','','获授权启用问题；排名及scope适用性按契约'),api('历史问题','GET','/queryai/top10','','queryText/id；历史隔离与留存独立校验'),api('删除历史','DELETE','/queryai/{id}','历史id；确认影响后','重读历史，保留与审计策略由契约交付'),api('自然语言查询/重新生成','POST','/queryai/search','{question,scopeId,pageRequest:{pageNo:1,pageSize:20,order:[{prop:"",asc:false}]}}','id/question/scopeId/sql/headers/pageResponse；整体响应，未定义流式协议'),api('编辑SQL重跑','POST','/queryai/runSql/{id}','{sql:sqlText,pageRequest}','按原查询id及授权执行；只读解析/预算不可由客户端保证'),api('筛选/分页','POST','/queryai/filter/{id}','{pageRequest,whereVal}','pageResponse.datas/total，独立绑定消息id'),api('下载结果','GET','/queryai/download/{id}','查询id','rawData/blob；鉴权并检查真实文件/错误体'),api('图表列','GET','/queryai/picCol/{id}','查询id','uuid/allCols/numberCols'),api('生成图表','POST','/queryai/queryPic/{uuid}','{rowCol,columnCols,lineNumber,picType}','picType/cakes或columnar；检查列及序列一致性'),api('导出图表Word','POST','/queryai/word','{imgBase64:chart.getDataURL()}','rawData/blob；图片会被上传，独立授权及额度'),api('语音转文本','POST','/queryai/voice2Text','FormData {file:WAVBlob}','识别文本；允许用户校正，失败不当空问题继续查询')];
profile('intelligent','在授权数据范围内提交自然语言问题，检查和重跑受限SQL，核对结果并独立筛选、下载、绘图或语音输入。',aiFields,
 [control('发送/问题Enter/点推荐/重新生成','scopeId+trim问题','点推荐立即查询需明确提示；重新生成沿原消息question/scopeId，不串当前范围'),control('查看SQL/编辑/重跑','原消息id及SQL草稿','查看只本地；重跑明确影响与预算后POST runSql，不自动信任模型输出'),control('筛选Enter/分页/下载','当前消息id','筛选回首页；每条消息独立whereVal/页号；下载先验额度与文件体'),control('复制SQL','当前消息SQL草稿','只复制当前SQL到用户剪贴板，不发API、不执行；检查复制结果，失败不提示成功'),control('图表/绘图/Word','picCol候选及uuid','类型1/2/3；选择维度与数值列后queryPic；导出显式上传图像'),control('语音打开/停止/确认/关闭','用户触发和麦克风授权','打开开始录制，停止才上传识别；确认只填问题；关闭/拒绝权限/离页释放所有音轨'),control('删除历史/重置/离页','明确作用范围','历史DELETE需确认；重置只清本地scope/question/chatHistory，不撤回在途SQL、不删服务端历史')],
 ['进入读取top5推荐与授权范围；空搜索autocomplete读取top10历史。问题非空且范围有效才可发送；推荐点击当前会立即触发，交付界面必须让用户预知查询范围和影响。','POST search完整返回后校验id、原question/scopeId、headers和pageResponse；将whereVal筛选控件行与真实datas分开，不让总数/导出多一条。空数据不等同模型无答案或权限失败。','每个历史结果独立绑定id和原scopeId；重新生成沿原问题/范围，不使用当前下拉替换。重复/并发和切范围/身份/离页的旧响应不得串入当前会话。','查看SQL仅本地增加展示块；复制仅复制当前草稿，现有execCommand返回值未经判断，交付须处理失败。编辑SQL后显式runSql。服务端解析为单条受限只读查询，复验库表列、行权限、函数、查询预算及导出额度；模型输出和客户端正则不能作为执行许可。','筛选/翻页POST filter/{id}且whereVal按消息独立；下载GET download/{id}。结果过期、撤权、已删历史与解析错误分别提示，不取上一消息结果替代。','图表先GET picCol取uuid/allCols/numberCols，选择饼/柱/折线及维度数值，POST queryPic；饼默认10行、柱折20行是前端默认，不证明服务端额度。长标签、空/缺序列与重复维度明确呈现，不把缺失补0。Word导出POST图表base64，成功前检查文件体。','语音对话框打开即getUserMedia，停止后上传WAV识别，确认仅填question；拒绝麦克风、无设备、识别失败、取消和离页均停止tracks、关闭AudioContext、取消动画帧并清对象URL。图表dispose、resize监听和防抖同样释放。','服务端现有1001错误由msg按冒号拆消息/SQL/id可能截断SQL，交付必须采用批准的结构化错误，不解析拼接文案；失败清isDisable锁，重置不等于服务端取消，取消/查状态接口由后端契约交付。'],aiAPI,
 '历史欢迎态中间推荐卡，底部固定范围选择、问题输入、麦克风和前往按钮；查询后按消息块显示问题、结果、SQL及操作。结果动态表头与独立筛选/分页，宽列局部横滚。图表和语音各自弹窗，录音/识别/失败可感知；底部输入在缩放时不遮挡结果或按钮。',
 ['trim空问题、无范围被阻止；点推荐立即查询可预知；重新生成使用原question/scopeId。','响应缺结构、空结果、1001含冒号SQL和失败状态正确，不把筛选行当数据或报AI已验证。','SQL查看无请求；重跑显式POST；多语句/DML/DDL/越权函数/跨表列和超预算全部服务端拒绝。','消息级筛选、分页、下载、uuid图表及Word上传隔离；错误blob和缺序列不伪造结果。','麦克风拒绝/无设备/关闭/识别失败/离页资源释放；确认只填问题；旧响应丢弃且重置不冒充撤回SQL。']);
const recommendFields=[input('筛选 recommendDesc','','','trim'),sel('筛选 lastModifyUser','','id/lastModifyUsername'),sel('筛选 recommendStatus','','0停用/1启用'),...paging,ro('推荐行','id/recommendDesc/recommendOrder/recommendStatus/lastModifyUsername/lastModifyTime'),input('问题描述 recommendDesc（表单）','是','≤300','textarea、trim后非空'),f('排序 recommendOrder','select/integer','是','空字符串','1～5','没有默认排序；重复位次及top5选择由契约定义'),f('状态 recommendStatus（表单）','select/integer','是','空字符串','0停用/1启用','0合法；无默认启用；未知状态不显示直接改变动作')];
const recommendAPI=[api('推荐分页','POST','/queryrecommend/page','{recommendDesc,lastModifyUser,recommendStatus,pageRequest}','datas/total'),api('更新人','GET','/queryrecommend/users','','id/lastModifyUsername'),api('详情','GET','/queryrecommend/{id}','推荐id','recommendDesc/recommendOrder/recommendStatus'),api('新增','POST','/queryrecommend','{recommendDesc,recommendOrder,recommendStatus}'),api('编辑','PUT','/queryrecommend/{id}','推荐id+有效三字段'),api('启用','POST','/queryrecommend/enable','JSON数组[id]','回读列表及top5；不是{id}'),api('停用','POST','/queryrecommend/disable','JSON数组[id]','回读列表及top5'),api('查询页推荐','GET','/queryrecommend/top5','','排序/去重/范围适用性由后端契约交付')];
profile('recommend','维护智能查询推荐问题和排序，明确启停对查询页推荐入口的影响。',recommendFields,
 [control('查询/重置/分页','描述、更新人、0/1状态','trim描述；保留0筛选；公共分页1/20'),control('新增/描述查看/编辑','独立操作权限、推荐id','view全禁，新增空三字段，edit读详情回填'),control('启用/停用','当前id和已知状态','展示影响并确认后POST数组[id]；取消无写；未知状态不默认可停用')],
 ['列表按描述、更新人、状态筛选；0停用/1启用。名称查看只读、编辑先回填；不从列表样本问题推定固定推荐内容。','新增/编辑分别POST/PUT三字段；问题描述必填trim≤300，排序1～5，状态0/1必选。初始三个字段都是空字符串，没有默认启用。','启用与停用当前直接POST [id]，交付补充影响说明及确认，再回读列表/top5；不能把客户端开关切换当后端已生效。','未发现推荐删除API或可用入口，范围不扩为删除功能。重复问题/排序唯一性、top5取舍和范围适配需正式契约，不因1～5排序推定最多只能五条记录。'],recommendAPI,
 '顶部描述、更新人、状态和查询重置，下方右上新增；表格含序号、描述链接、排序、状态、更新人、更新时间及编辑/启停。新增编辑独立表单，上全宽描述带300计数，下一行排序/状态双列，右上返回、底右取消/提交。',
 ['描述trim、更新人稳定ID和0状态筛选正确，普通分页/重置回首页。','view全禁、编辑GET回填，新增三字段空，不默认启用。','启用/停用分别提交数组[id]并回读top5；确认取消不写、未知状态不误操作。','300/301、空白问题、1～5及0合法边界；并发旧版本覆盖/重复位次按批准契约拒绝或处理。','直接API越权拒绝；不出现无依据删除入口；推荐点击查询的范围和执行影响明确。']);
profile('recommendForm','新增一条明确描述、排序和启停状态的智能查询推荐问题。',recommendFields.slice(-3),
 [control('输入/选择','描述、排序、状态','只改本地草稿；选项1～5和0/1，0不可被必填判空'),control('提交','trim有效三字段及新增权限','POST queryrecommend，不调用enable/disable代替新增，成功回列表回读'),control('取消/返回','未提交草稿','有修改按放弃策略提示；不发POST/PUT')],
 ['从新增进入/queryRecommend/edit，三个字段均空；文本域描述必填≤300，排序必选1～5，状态必选0/1。','描述trim后校验长度和空白；0停用合法，不能用truthy拒绝。排序及重复问题的后端约束独立复验。','显式提交POST三字段，忙碌防双击；受理后回读新增对象/列表，超时结果未知先查审计，不自动再次创建。','取消/返回不保存；新增推荐不是执行自然语言问题。已存在对象编辑走IDQS-505的PUT，view只读。'],recommendAPI.slice(2,5),
 'K-IDQS-005-op1为独立页：上部全宽描述文本域及300计数，下一行排序和状态两列；排序下拉1～5、状态停用/启用有独立历史选项图。右上返回，底部右对齐取消/提交；错误靠近对应字段。',
 ['新增初始描述、排序、状态全空；1～5和0/1选项与历史图一致。','纯空白、300/301及缺选阻止；0停用通过必填；前后端校验一致。','仅显式提交POST三字段，成功回读列表和推荐可见性，不自动执行问题。','取消/返回无写；双击和超时结果未知先查，不能重复创建。','新增权限及重复描述/位次冲突服务端验收，越权/恶意文本安全显示不执行。']);
const kinds={'001':'compose','002':'guide',500:'compose',501:'range',502:'configs',503:'configView',504:'intelligent',505:'recommend',506:'recommendForm'};
function entries(type){return published[type].entries.map(e=>({...e,kind:kinds[e.id.slice(5)],acceptance:published[type].acceptance.filter(a=>a.requirement===e.id).slice(0,5).map(a=>a.id)}));}
const MAIN=entries('main'),SUB=entries('sub'),all='IDQS-001/002、IDQS-500～506';
const NFR=[
 ['001','对象与数据授权','范围、配置、自然语言、SQL重跑、结果分页/筛选、历史、图表uuid、下载、Word及语音逐动作服务端鉴权；按表、列及行隔离，撤权不保留旧结果访问。','A/B身份、ID替换、直接API、跨源/部门、role/dept空集合、撤权和缓存；任何越权成功为失败。',all],
 ['002','SQL执行安全','查询只允许批准的单条只读语法、函数、库表列；where脚本/模型SQL均受解析白名单、参数绑定及数据库最低权限保护，禁止DML/DDL、多语句、写文件和外连。','隔离库用注入/注释/CTE/子查询/函数/笛卡尔积/系统表等对抗集验证；客户端拦截不计服务端通过；源数据变化或越权读取即失败。','IDQS-001/500/503/504'],
 ['003','范围与配置一致性','表列ID与别名稳定，所有已选表连通；变更范围/取消表清失效字段；已存配置执行前复验；全部表动态扩展和权限集合规则按批准契约。','单表、多表孤立节点、同名字段、无分隔拼接碰撞、0/false、来源漂移和并发撤权矩阵核对请求与真实结果。','IDQS-001/500/501/502/503'],
 ['004','有限查询预算','每类查询/SQL重跑均有限时、扫描行/返回行/内存/并发预算，服务端提供取消或可靠超时终止及结果状态契约；timeout:0不能作为交付默认。','按固定隔离数据集注入慢查询、深分页/大关联和断网；验证DB实际终止/配额及锁释放，前端返回不计服务端停止；预算由容量负责人批准。','IDQS-001/500/503/504'],
 ['005','并发与未知结果','每动作共享忙碌锁与服务端维护防重/版本检查；迟到响应按身份/范围/消息id丢弃；写入超时结果未知先回读，查询重试也计预算。','双击、并发编辑/启停、切范围、响应丢失和重认证测试，确认至多一次维护效果及查询次数；重置不宣称取消SQL。',all],
 ['006','错误与超时恢复','为每路径配置有限timeout及错误分类；断网/202/5xx/解析错误后1秒内恢复本地操作态；不得冒号拆错误消息中的SQL，不自动重发有影响操作。','固定构建故障注入，检查isDisable及消息级状态、结构错误、错误blob与只读重试；1秒为本次提出的本地恢复目标。',all],
 ['007','页面性能','普通列表/详情/候选冷启动P95≤4秒，本地输入/页签反馈P95≤150毫秒；智能查询总响应另测，不套登录时延。','Windows4核8GB、批准Chrome/Edge版本、下20Mbps/上10Mbps/RTT50ms，固定服务和DB资源；冷/热各30次，报P50/P95/P99/最大及失败。',all],
 ['008','查询性能与容量','建议隔离基线100张表/100万行代表数据、10独立会话每会话1在途；分页P95≤3秒、智能查询整体P95≤30秒、非预期失败率≤1%；实际扫描规模/选择性分层报告。','固定表结构/索引/行列权限/模型版本及资源；预热2分钟、测10分钟且各类有效样本≥200，思考1秒；报实际QPS/并发/成功时延/超时/5xx/限流，复杂查询独立基线。','IDQS-001/500/504'],
 ['009','模型输出与可解释性','真实模型、版本、提供方、授权输入、SQL/数据依据和不确定性可追溯；无权限/不支持/歧义时拒答或澄清，不编结果；生成与运行分别记录。','批准脱敏金标集≥100题，覆盖聚合/连接/时间/同名列/空结果/歧义/无权/恶意指令；业务结果正确率目标≥95%，越权或写操作成功为0；按难度报分母、误差及人工复核。','IDQS-504'],
 ['010','模型数据与成本','仅发送必要授权元数据和脱敏问题；模型不得取得连接秘密或任意全表数据；训练/留存/地域/供应商条款和单用户token/费用/速率/日额度经批准。','模型请求脱敏抓取、审计与供应商配置核验，提示注入/敏感字段外发/越额度均受控；仅前端search接口不能证明已接入LLM或通过隐私验收。','IDQS-504'],
 ['011','语音与资源','用户明确授权才录音；关闭/拒绝/无设备/离页停止tracks、关闭AudioContext、断开节点并取消动画帧；识别文本确认仅填问题；音频限额、留存和清理获批准。','录音权限允许/拒绝/撤销、设备断开、网络失败及20次开关，浏览器麦克风指示和资源回基线；确认前不发search，取消后不继续录音/上传。','IDQS-504'],
 ['012','文件与导出','即席导出条件与filterVal差异明确；结果下载和Word逐次验权及额度；校验MIME/文件体/错误JSON，CSV公式等安全转义，释放blob URL。','空结果/大文件/撤权/超额/错误体/公式前缀/多语言文件名/过期id及图像上传边界；文件行列与批准导出范围核对，不用页面显示行代替。','IDQS-001/500/503/504'],
 ['013','展示与秘密保护','SQL、问题、字段、备注、模型输出和文件名安全文本；传输采用批准保护，token/连接秘密/原始敏感值不写普通日志、示例或错误体。','HTML/脚本/多行SQL/控制字符与错误回包注入，验证DOM、导出和日志；敏感内容泄露或执行为失败。',all],
 ['014','审计与观测','记录主体、范围/源、配置id、查询id/图表uuid、动作、时间/时区、模型版本、预算/耗时/行数、结果及关联请求；日志只存必要脱敏摘要。','维护、授权、执行/重跑、拒绝、下载/Word/语音、取消/超时串联审计；无结果状态关联或秘密泄露失败。',all],
 ['015','兼容与可访问性','批准Chrome/Edge版本；1366×768、1500×1000、1920×1080和200%缩放操作可达；键盘替代拖拽，树/页签/弹窗焦点和读屏标签完整。','登记OS/浏览器版本；宽关系表、条件分组、图表长标签、底部固定输入、长表单及空/忙/错态，键盘/读屏与自动扫描组合；局部扫描不称全面合规。',all],
 ['016','长稳与缓存','离页释放resize监听、防抖、echarts、录音、对象URL及旧请求落屏资格；sessionStorage仅安全筛选，不跨身份复用结果；50次往返资源回基线。','固定构建50次页签/弹窗往返并长时间观察，记录堆、监听、音轨和在途，离页不继续录音/查询；身份切换清缓存及草稿。',all],
 ['017','留存恢复与可用率','配置、范围权限、推荐、历史问题/SQL/结果、音频及审计分级留存和删除；RTO/RPO与可用率目标按批准SLA，不默认删除历史等于删除审计或结果。','交付负责人、留存/备份/清理及RTO/RPO后隔离恢复演练；可用率固定日历窗口/探测频率，失败/漏测不计成功，维护排除口径批准后计算；未演练不通过。',all],
 ['018','契约与可维护性','请求字段、枚举、ID/数值类型、错误、分页、范围权限、模型及文件协议受版本管理；生成刷新保留已发布编号、归属和来源。','文档/生成器/证据SHA和UTF16偏移回归；丢编号/错关联/来源丢失/片段篡改/混组必须拒绝，全部应用验收状态保持未执行。',all],
];
const protocol='公共客户端默认JSON及withCredentials；动态token/CSRF/nonce/timestamp/sign只登记头名称，不存值。API_BASE_URL默认/back，IDQS默认/idqs/base，commonUser默认/common/user，MODULE_URL_PREFIX可覆盖，parentdata桥接宿主request实例。HTTP 202进入业务错误reject，其他可接受状态返回data，不假设统一code=0。超时优先路径非负配置、其次number请求timeout、最后20000ms；0可能不限时，queryobject/query显式timeout:0必须按IDQS-NFR-004/006改为有限预算。1002会话、1003授权、1109改密及1012刷新走公共处理；真实响应需隔离验证。rawData/blob需独立检查HTTP、MIME和错误体；FormData不手写boundary。';
function renderFeature(e){
 const p=PROFILES[e.kind];if(!p)throw new Error('IDQS profile missing '+e.id);
 return ['### '+e.id+' '+e.title,'','**业务目的**：'+p.purpose,'','入口：'+e.route+'；前提：有效会话、对象读取权限及独立动作授权。按当前目标区分读取、本地草稿、维护、查询执行及文件传输。'+(e.kind==='guide'?'本项只解释与导航，无独立维护表单、分页、上传或结果表；执行规则由IDQS-500承接。':e.kind==='recommendForm'?'本项是新增表单，不含列表分页、文件或查询执行。':''),'','**操作与规则**','',...p.flow.map((s,i)=>(i+1)+'. '+s),'','**结果与异常处理**：加载、合法空、无权、结构错误、冲突、超预算和结果未知分别呈现；保存定义、生成SQL、执行查询、下载文件是不同结果。','','**开发处理细则**：按下述字段、控件、调用和验收实现；缺少的后端属性由核查记录列出的契约补足，不自行发明DTO、错误码、角色或租户/空间字段。','','<!-- 完整规格:'+e.id+' -->','',
 '#### 1. 页面字段清单（'+e.id+'）','',...table(['字段名称与绑定名','类型/控件','是否必填','默认值','长度/范围/单位','格式及校验规则','错误提示','条件/状态'],p.fields),
 '空白表示该属性缺少证据，不是无约束。ID精确类型、字段级错误及可恢复性由正式契约交付；ID不盲目parseInt，0/false/null/空字符串/未传不混同。历史样本名称、数量和记录不是固定默认或容量上限。','',
 '#### 2. 页面交互规则（'+e.id+'）','',...table(['控件/触发','前提及输入','行为及联动','忙碌与错误','结果和恢复'],p.controls),
 '#### 3. 业务流程与异常分支（'+e.id+'）','',...p.flow.map((s,i)=>(i+1)+'. '+s),'',...table(['分支','页面与数据处理','恢复'],[
 ['候选/详情/结果失败','合法空与结构错误/无权分开，禁依赖执行','保留安全草稿重读；切对象后旧响应不落屏'],['字段/引用/版本冲突','定位表列、模式或字段；服务端原子复验','不静默删条件/扩大范围，回读再确认'],['网络/202/5xx/超时','finally解锁；维护结果未知不假成功','写入查对象/审计；查询先查状态及预算，不自动重发'],['重复/并发/撤权','动作锁、维护防重及服务端鉴权','至多一次维护效果；旧身份内容和响应清除'],['取消/关闭/返回','未提交草稿可确认放弃；关闭不等于服务端取消',e.kind==='intelligent'?'已受理查询按状态/取消契约处理；录音立即停止':'已受理动作按对象回读处理；导航/查看不自动保存或执行'],['会话失效','清敏感内容及旧身份缓存','重认证后回读，不自动重发保存、查询、上传或导出'],]),
 '#### 4. 接口与数据规则（'+e.id+'）','',protocol,'',...table(['用途','HTTP方法','相对路径','请求参数及来源','返回与页面处理'],p.api),
 ...table(['参数类别','位置/类型','条件与转换'],[
 ['业务字段','JSON body/query','仅当前模式有效字段；候选用稳定ID；未定义长度不自行无限放行'],
 ['本项对象ID','route/path/body；精确类型由契约交付','scopeId/配置id/查询id/uuid按本项API使用；路径安全编码，不互换或绕过授权'],
 ...(['compose','configView','configs','range','intelligent','recommend'].includes(e.kind)?[['pageRequest','object {pageNo,pageSize,order?}','普通列表1/20按id倒序；选择配置1/10；结果1/20；智能order.prop为空字符串，支持排序列须契约确认']]:[]),
 ...(['compose','configView'].includes(e.kind)?[['查询定义','queryTables/queryableRefs/whereTree/queryColumns','移除临时vid等UI键；嵌套条件保结构；SQL执行与保存定义分开']]:[]),
 ...(['compose','configView','intelligent'].includes(e.kind)?[['文件与语音','blob或FormData，仅本项实际API适用','先检查内容类型/错误体及授权额度；语音仅IDQS-504，取消后不继续上传']]:[]),
 ]),
 ...table(['响应分支','判定与页面处理'],[['读取resolve','校验数组、datas/total、pageResponse或本项详情结构，当前身份/消息/范围匹配才生效'],['维护resolve','正式业务结果+对象回读；未取得回读不得以toast判持久化成功'],['查询resolve','记录查询id、范围、列和结果；生成SQL不等于正确，受理不等于执行成功'],['文件/错误','HTTP/MIME/错误JSON/部分结果分别处理，错误体不当文件或正常空结果'],['reject/未知结果','按正式结构化错误与公共会话处理；解除锁并保留安全恢复上下文']]),
 '#### 5. 验收标准（'+e.id+'）','',...table(['验收编号','前置、操作及可检查结果/回读','关联需求','状态'],e.acceptance.map((id,i)=>[id,p.checks[i],e.id,'未执行'])),
 '#### 6. 权限与安全要求（'+e.id+'）','','服务端逐对象核验授权范围，对范围/配置/查询结果/uuid核验表列及行权限，查询、保存、范围维护/授权、推荐启停、历史删除、下载/Word和语音独立鉴权；按钮隐藏和isCurrentUser不是授权依据。测试直达URL/API、ID替换、隐藏字段、授权撤销和缓存重用。','','SQL与where脚本只能经受限解析、参数绑定和数据库最低权限执行；问题、模型输出、字段名、备注及SQL按文本安全展示，不能因生成可信。秘密/原始敏感数据不进入普通日志或模型输入；语音和图像上传采用批准的最小化、限额及留存策略。','',
 '#### 7. 页面布局与状态（'+e.id+'）','',p.layout,'','初始、加载、可操作、合法空、无权、字段错误、服务失败、冲突、超预算、结果未知及完成去向分别呈现。宽表局部横滚、长表单纵滚；错误可定位，弹窗焦点进入/返回；图表缺失值与真实0区分。','',
 '#### 8. 关联文档（'+e.id+'）','',...e.sources.map(s=>'[历史图]('+s+') / [元素]('+s.replace(/\.png$/,'.json')+')'),...(e.id==='IDQS-501'?['[正常范围列表历史图](../evidence/live-recheck-20261022/N-IDQS-002.png) / [元素](../evidence/live-recheck-20261022/N-IDQS-002.json)']:[]),'','[主规格](./需求说明.md) · [子页面细则](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [静态证据](../evidence/idqs-review-20261027/README.md) · [原调研](./调研记录.md)','',
 '#### 9. 非功能性需求（'+e.id+'）','','按[主文档质量要求](./需求说明.md#9-非功能性需求)IDQS-NFR-001至018及其关联范围验收；本项字段、授权、查询预算、资源释放与恢复不变量均为交付要求。数值为本次提出的目标，尚无实测。全部应用功能与非功能验收未执行，文档测试不替代系统或模型验收。',''].join('\n');
}
function renderDocument(type,previous){
 const base=published[type],list=type==='main'?MAIN:SUB;
 if(previous.includes('idqs:generated-spec-v1')&&!previous.includes('<!-- 业务规格格式:plain-v1 -->'))throw new Error('IDQS format missing');
 const ids=[...previous.matchAll(/^### (IDQS-\d{3})\b/gm)].map(m=>m[1]);if(JSON.stringify(ids)!==JSON.stringify(list.map(e=>e.id)))throw new Error('IDQS requirement IDs missing, duplicated or reordered');
 const ac=[...previous.matchAll(/^\| (IDQS-AC-\d{3}) \|/gm)].map(m=>m[1]);if(JSON.stringify(ac)!==JSON.stringify(base.acceptance.map(a=>a.id)))throw new Error('IDQS acceptance missing, duplicated or reordered');
 for(const row of previous.matchAll(/^\| (IDQS-AC-\d{3}) \|.*$/gm))if(row[0].split('|').at(-3).trim()!==base.acceptance.find(x=>x.id===row[1]).requirement)throw new Error('IDQS acceptance association changed');
 if(type==='main'&&base.sourceRows.some(s=>!previous.includes(s)))throw new Error('IDQS source rows missing or changed');
 if(type==='main'&&base.boundaries.some(s=>!previous.includes(s)))throw new Error('IDQS boundary missing or changed');
 if(type==='sub'&&base.entries.some(e=>e.sources.some(s=>!previous.includes(s))))throw new Error('IDQS evidence missing');
 if(type==='main'&&previous.includes('idqs:generated-spec-v1')){const nfr=[...previous.matchAll(/^\| (IDQS-NFR-\d{3}) \|/gm)].map(m=>m[1]);if(JSON.stringify(nfr)!==JSON.stringify(NFR.map(n=>'IDQS-NFR-'+n[0])))throw new Error('IDQS NFR ledger missing or reordered');}
 const formal=new Set(list.flatMap(e=>e.acceptance)),offsets={};
 const retained=base.acceptance.filter(a=>!formal.has(a.id)).map(a=>{const n=offsets[a.requirement]||0;offsets[a.requirement]=n+1;return [a.id,PROFILES[kinds[a.requirement.slice(5)]].checks[n%5],a.requirement,'未执行'];});
 return ['# 智能查询系统'+(type==='main'?'业务需求说明':'子页面与操作需求细化'),'','<!-- 业务规格格式:plain-v1 -->','<!-- idqs:generated-spec-v1 -->','','沿用登录需求的字段、交互、接口、异常、布局与质量要求结构；依据、现有差异及后端依赖归入[核查记录](./核查记录.md)。应用验收全部未执行，文档细化不代表业务已实现或生产就绪。','',
 '## 1. 业务目标与使用角色','','在授权数据源范围内组织即席查询，保存/复用定义并显式执行；通过自然语言查询检查SQL和结果，独立筛选、绘图、导出或语音输入；维护范围授权和推荐问题。查询使用、范围维护/授权及推荐维护是责任分工，具体身份及数据范围由服务端授权矩阵交付。','',
 '## 2. 业务范围','',...table(['功能编号','入口','目标范围'],list.map(e=>[e.id,e.route,PROFILES[e.kind].purpose])),
 '保留9项正式功能（主2、子7）、70条验收及5项历史范围操作边界；主IDQS-001/002由IDQS-500及关联维护承接。查询定义、执行结果、历史问题、推荐、范围授权和图表uuid是不同对象；不扩为任意SQL控制台、资源目录维护、推荐删除或源库DDL。AI-004自然语言查询与SQL草稿沿用原规划，前端入口不证明真实模型已部署。','',
 '## 3. 功能需求','',...list.map(renderFeature),
 '## 4. 字段与业务规则','','完整字段、请求层级和模式按各功能第1/4节。scopeId、配置id、查询id、图表uuid与表列标识不混用。普通列表初始pageNo=1/pageSize=20、order为id降序，选择配置1/10、结果1/20；智能结果order.prop空字符串不等于批准任意排序。服务端精确数字/ID类型、最大页大小与排序白名单由版本契约交付。','','范围名和配置名≤100、描述≤300；推荐描述≤300，排序1～5、状态0停用/1启用，新建无默认启用。范围scopeType可见仅1数据源，scopeTableType为1全部/2指定；全部表的稳定编码、动态扩展和角色/部门组合规则必须服务端确认后实施。','','关联refType为1左连接/3内连接；首关系左表为主表，禁止自关联及孤立表。条件模式1自定义/2脚本，条件项运算符1等于2不等于3大于4小于5非空6为空，逻辑1且2或；条件whereType与外层模式同名但层级不同。显示列别名非空唯一，0/false不是缺失。','','保存定义POST queryobject即使有id，覆盖/新建按正式契约；查询queryName="search"，导出"export"且当前移除filterVal。智能查询整体响应，未定义SSE；生成SQL、执行SQL、结果正确、模型可信分开验收。','',
 '## 5. 主要业务流程','','范围维护及授权→选择有效范围→表/关联→条件/显示列→可选保存/复用定义→显式查询→核对结果→独立筛选/导出。智能分支为范围+问题→显式search→核对SQL及数据依据→可选显式重跑/筛选/绘图/下载。语音确认仅填问题，推荐点击当前会立即查询；重置本地会话不撤回SQL。','',
 '## 6. 验收标准','','各功能五组验收及下列跨流程条目保留原编号、关联与顺序；旧通用统计模板改为本模块检查项。记录构建、环境、身份/授权、输入、真实请求、对象/结果回读及证据。全部应用验收未执行。','',...table(['验收编号','前置、操作及可检查结果/回读','关联需求','状态'],retained),
 '## 7. 实现与交付边界','',...(type==='main'?['| 历史编号 | 原操作范围 | 原登记边界 |','|---|---|---|',...base.boundaries,'']:[]),
 '历史IDQS-100～104由IDQS-501的范围列表/查看/新增/编辑/删除及授权细则承接，原登记保留用于追踪，不重复增加正式功能。可先实现受控界面和明确标识的模拟交互；真实SQL、权限生效、模型/语音、下载及维护须先取得[外部依赖](./核查记录.md#外部依赖)契约并在授权隔离环境验证，AI不得自行决定缺失规则。','',
 '## 8. 需求依据与关联资料','',...(type==='main'?['| 需求编号 | 界面依据 | 详细记录 |','|---|---|---|',...base.sourceRows,'']:table(['需求编号','原图与元素','规则依据'],list.map(e=>[e.id,e.sources.map(s=>'[图]('+s+') / [元素]('+s.replace(/\.png$/,'.json')+')').join('；'),'[静态索引](../evidence/idqs-review-20261027/README.md)及[核查记录](./核查记录.md)']))),
 '[主规格](./需求说明.md) · [子页面细则](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [原调研](./调研记录.md) · [总索引](../README.md) · [AI-004](../AI能力规划.md#ai-004-自然语言查询与sql草稿拟定需求)','',
 ...(type==='main'?['## 9. 非功能性需求','','以下数值为本次提出的交付目标，尚无实测；来源和测量条件见核查记录，未知预算/SLA由负责人批准后验收。端到端从用户触发到当前有效数据可操作，接口从发出到完整解析；分位取升序第ceil(p×N)项，成功时延与失败样本单报，样本不足不通过。固定并登记前后端构建、服务CPU/内存/实例、数据库/索引、模型/提供方版本及安全策略，不为压测关闭权限。','',...table(['编号','质量属性','指标或不变量','验收环境/方法/失败判定','关联功能','状态'],NFR.map(([id,...r])=>['IDQS-NFR-'+id,...r,'未执行']))]:[]),
 ].join('\n');
}
function write(root=ROOT){const folder=path.join(root,'22-智能查询系统');let changed=0;for(const [type,name]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){const file=path.join(folder,name),before=fs.readFileSync(file,'utf8'),after=renderDocument(type,before);if(before!==after){fs.writeFileSync(file,after);changed++;}}return {changed,requirements:9};}
if(require.main===module)console.log(JSON.stringify(write()));
module.exports={MAIN,SUB,PROFILES,NFR,renderFeature,renderDocument,write};
