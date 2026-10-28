/* Authored BAS requirements. Downloaded application scripts are never evaluated. */
const catalog = require('./bas-requirement-catalog.json');
const MARKER = '<!-- bas:reviewed-spec-v1 -->';
const PLAIN = '<!-- 业务规格格式:plain-v1 -->';
const F = (name,type,required='',value='',range='',format='',error='',state='') => [name,type,required,value,range,format,error,state];
const extra = {
 'BAS-001': {
  purpose:'按账号、姓名和启用状态定位用户，分别核对身份、有效期、关联关系和可执行动作。',
  fields:[F('状态 enabled','boolean选择','','','true/false','启用=true；禁用=false；清空不限定状态'),F('结果 id/account/name/mobilephone/email/effectTime/expiredTime/createTime/enabled','只读行对象','','','','以id定位，联系方式按授权掩码显示')],
  controls:[['查询/重置','账号、姓名、启用状态组合查询；重置清空条件并回第一页。筛选请求关联条件快照，仅最新响应进入表格。'],['用户账号/详情','以行id进入userInfo；资料、角色、部门、租户及权限树分开读取，切换对象时清空前一对象结果。'],['新增/行内/更多','新增进入BAS-002；编辑进入003；有效期进入004；角色及重置、启停、默认租户使用、强退与删除按005分支处理。']],
  flow:['构造筛选、固定条件及pageRequest{pageNo,pageSize,order} → POST读取 → 有datas属性时取datas/total，否则按数组及length读取 → 有效空数据展示空态，拒绝或解析错误展示失败态。','有效期分别支持仅生效时间、仅到期时间、完整范围及未设置；启用状态独立显示。过期判断按批准时区与服务端时钟校准，不能把启用当作可登录保证。','详情携带当前用户id；角色按leftId、部门和租户按rightId读取，pageSize=500只表示本次读取大小。total大于已返回数时继续读取或明确截断，不宣称已显示完整关系。'],
  apis:[['GET','/common/user/permission/tree/{id}','查看目标用户权限树；只读'],['POST','/common/user/userrole/page','{leftId:用户id,pageRequest:{pageSize:500}}；读取角色关系'],['POST','/common/user/deptuser/page','{rightId:用户id,pageRequest:{pageSize:500}}；读取部门关系'],['POST','/common/user/tenantuser/tenant','{rightId:用户id,pageRequest:{pageSize:500}}；读取租户关系']],
  layout:'左侧为后台菜单，右侧顶部标题；账号、姓名、状态由左至右，查询/重置在条件行右端。新增在表格上方右侧；序号、账号、姓名、手机、邮箱、有效期、创建时间、状态、操作依次排列，分页在表格下方。详情页顶部页签切换资料与关联信息，各页签独立呈现加载/空/错误。',
  check:'返回含datas/total、数组、空数据、格式错误及迟到响应；详情切换两个用户，所有页签只显示当前id，500条截断不能冒充完整。'
 },
 'BAS-002': {
  purpose:'创建具有独立账号和初始资料的用户，按系统策略校验密码并安全传输敏感字段。',
  controls:[['密码focus/blur','focus清空当前密码控件；blur处理控件显示。模型仍可能保留原值；遮蔽和DOM换值不能保证浏览器调试不可读取。提交统一使用模型校验和加密，避免以显示密文再加密。'],['用户类型/隐私声明','userType字典有候选才显示；value经parseInt转换。privacyStatementUrl有值才显示声明与同意，打开声明后关闭或离页释放objectURL。候选失败单独提示，不能假装无配置。'],['确认提交','依赖配置和公钥加载成功、所有校验通过后进入共享提交锁；加密异常进入同一错误出口，不发明文请求。成功回读id；失败保留非敏感资料，清理密码并要求重新输入。']],
  flow:['按USERINFO_REQUIRE决定手机、邮箱、工号必填；账号trim后验证4至20位英文字母/数字，姓名trim后非空；密码不trim，策略来自配置。','复制允许资料 → 删除password/confirmPassword → 新增时手机、邮箱及password以RSA-OAEP、SHA-256/MGF1 SHA-256加密并Base64 → 密码写newPwd → POST创建。privacyChecked为前端数组；服务器可接受键由DTO合同限制，禁止无边界透传读回对象。','公钥、密码策略、字典或声明加载失败时显示相应错误；公钥未就绪不得提交；HTTP或业务拒绝不返回成功。成功提示关闭后返回并刷新列表；创建超时先按批准的结果查询协议核实，禁止自动重放。'],
  apis:[['GET','/common/auth/login/key','获取密码与联系方式加密公钥，不记录返回值'],['POST','/common/dict/dictitem/page','{categoryKey:"userType",pageRequest:{pageNo:1,pageSize:200}}；用户类型字典']],
  layout:'右侧为两列资料表单，标签宽度样本150px；账号/姓名、初始密码/确认密码、手机/邮箱、昵称/英文名成对排列，之后工号、性别，条件显示用户类型和隐私声明。底部右侧取消与确认，长表单可滚动；密码历史覆盖区域不作为产品颜色或真实值。',
  check:'公钥失败、加密抛错、连续点击与Enter并发均不产生明文或重复创建；检查newPwd存在而password/confirmPassword不存在，日志不含秘密。'
 },
 'BAS-003': {
  purpose:'更新目标用户允许修改的资料，保持账号标识及未改联系方式不被覆盖。',
  controls:[['初始化/编辑','按路径id读取后回显；账号禁用，初始密码两项不显示。读失败时禁止保存空草稿。'],['联系方式','与读回基线逐字段比较；未改发送null，已改才加密。不能把掩码文本当新手机号/邮箱，刷新或切换id后重建比较基线。'],['确认/取消','确认使用同一提交锁并重新校验对象权限；取消返回来源列表，无更新请求。有非敏感修改先提示是否放弃；成功后回读同一id。']],
  flow:['读取id对应资料和敏感字段比较基线 → 只允许编辑授权字段 → gender空字符串转-1，type按现有转换空值转-1。type=0同样落入现有假值转换，字典若含0需按BAS-DEP-03修订而非静默丢失。','删除password/confirmPassword，禁止附加newPwd走普通资料更新；未改手机/邮箱发送null，服务端保留语义由DTO合同固定。','并发冲突显示最新版本及当前非敏感草稿，不能静默覆盖；超时先回读。成功提示后返回来源列表并保留原查询上下文。'],
  layout:'沿用新增两列表单；账号禁用，密码行省略；用户类型与声明仍受配置控制。加载中锁定表单，字段校验错误靠近对应输入框；业务或读取错误单独展示重试，不能回落到可保存空表单。',
  check:'比较未改、改值和清空联系方式三分支；拒绝改账号、额外密码字段及伪造id，验证type=0与-1的批准映射。'
 },
 'BAS-004': {
  purpose:'为明确目标用户维护生效和到期时间，保证显示、认证判定和清空含义一致。',
  fields:[F('effectTime/expiredTime','请求string','','','','date非空取两端；清空时两者为""'),F('目标 id','路径标识','是','','','取被操作行id，切换目标重建上下文')],
  controls:[['范围选择/清空','日期时间范围使用yyyy-MM-ddTHH:mm:ss；00:00:00和23:59:59是选择器default-time，不是账号业务默认值。清空两个端点同时变为空字符串。'],['确认/取消/关闭','显示目标账号与范围；确认校验两端和批准时区规则后只更新目标id；取消及右上关闭不提交，清理本次弹窗草稿。']],
  flow:['从行对象打开600px弹窗 → 编辑范围或清空 → 转effectTime/expiredTime → PUT → 成功回读同一用户有效期。','结束早于开始在客户端和服务端拒绝；等于边界、仅一端、是否允许历史生效及清空的认证含义按BAS-DEP-04固定。未获得合同前不把空字符串解释为永久有效。','会话过期或无权限时保持原有效期；超时显示结果未知并先回读。客户端时间不作为服务端认证事实。'],
  layout:'列表上方遮罩居中600px弹窗，顶部标题和关闭，正文单行时间范围，底部右侧取消/确认。窄屏限定视口并允许内容滚动；恢复焦点到原行入口。',
  check:'测相等、逆序、仅一端、清空、跨时区和到期临界前后；核对请求格式、回读及认证行为，未批准合同不得自行选择永久有效。'
 },
 'BAS-005': {
  purpose:'按目标用户执行角色集合维护及重置、启停、默认租户使用、强退和删除等受控操作。',
  fields:[F('目标 id/enabled/useDefTenant','行对象','','','','id定位；enabled和useDefTenant分别决定操作方向'),F('角色候选 roleType','number','','1','','只查询可管理类型'),F('角色集合 roleIds','ID数组','','','','整个集合覆盖；不可管理既有角色保留')],
  controls:[['角色左右双列','读取可管理候选和已有绑定后再开放确认；左右移动仅变更草稿，保留不可管理既有角色。分页500未覆盖全量时不能直接覆盖提交。'],['启用/禁用/默认租户/强制退出/删除','确认中展示账号、动作及影响；取消不请求。提交前再次核对目标与状态，禁止把旧行方向应用于已变化状态。删除账号与移除部门/租户成员严格区分。'],['重置密码配置分支','RESET_PASSWORD_SHOULD_INPUT_PASSWORD=true：先取公钥，填写管理员密码、新密码、确认密码并加密adminPwd/newPwd；false：警示确认后无密码体调用，不能推断默认密码。失败恢复锁并清理秘密。']],
  flow:['角色候选GET role/my/list及既有绑定POST userrole/role全部完成 → 本地选集 → POST userrole/reset/{id}覆盖集合 → 回读；任一路失败不允许以空集合保存。','启停/默认租户使用/强退/删除均只在明确确认后调用；成功根据具体动作回读状态、可用租户、会话或对象存在性。强退是否撤销全部终端由服务端会话合同定义。','重置输入分支使用RSA-OAEP/SHA-256，管理员密码策略不能套用初始密码策略；两个配置分支分别验收。重置超时不自动再次重置，不显示旧密码或返回默认密码推断。','删除遇引用和当前账号/内置对象保护时保持原数据并提示批准规则；受保护对象判定由服务端完成，不能只靠隐藏行操作。'],
  apis:[['PUT','/common/user/user/enable/tenant/{id}','允许使用默认租户，无密码体'],['PUT','/common/user/user/disable/tenant/{id}','禁止使用默认租户，无密码体'],['DELETE','/common/user/user/{id}','删除平台账号，必须独立确认与后端引用检查'],['GET','/common/auth/login/key','重置输入分支加密公钥']],
  layout:'用户行操作后展开更多菜单；角色独立页中左右双列带搜索及移动按钮，底部右侧取消/确认。重置输入分支600px弹窗、150px标签，依次管理员密码、新密码、确认密码；非输入分支为警示确认。每个操作显示目标身份与忙碌状态。',
  check:'角色读取失败/500条截断时禁止覆盖；分别测试默认租户启停、账号启停、强退、删除与重置两配置分支，取消零写请求。'
 },
 'BAS-006': {
  purpose:'维护部门树、父子关系、部门角色标签、排序及管理员集合，保护已有组织关系。',
  fields:[F('父部门 pid','标识','是','','','新增取选中节点id；编辑取当前节点pid'),F('管理员 rids','用户ID数组','','既有管理员ID集合','','来源为当前部门成员；不是成员关系id'),F('排序 id/up/end','object','','','','up为方向boolean；end为快速移动标志')],
  controls:[['选择/新增/修改','选择真实部门节点后读取上下文；新增pid=所选id，编辑固定id及pid，一级节点编辑名称禁用，编码编辑禁用。'],['角色/标签','候选与既有关联合并，canModify=false项禁用并保留；候选加载失败禁止把集合当空覆盖。'],['部门排序','上下移动使用{id,up,end}；单次500ms合并，300ms内快速触发走end=true。界面等待服务端结果后重读树，目标校验及边界由服务器负责。'],['设置管理员','600px多选弹窗，候选为当前部门成员；关键词rightQo.obscureName，固定relationData=2和leftId。POST覆盖rids；移除自己管理资格后重新初始化可管理范围。']],
  flow:['读取部门树与deptType字典 → 选择有hasPermission的节点 → 读取角色/标签/详情 → 校验编码、名称、类型及pid → 新增/更新 → 重读树并恢复有效选中节点。','部门树POST /dept/tree没有请求体；不能从包装器补造筛选对象。根节点、带子部门/成员/主部门引用删除必须有服务端保护合同；拒绝后原树和关系保持。','管理员集合先读取deptadmin/admin{leftId}的datas，映射用户id → 从当前部门成员选择 → reset/{id}提交用户ID数组；不可用候选、重复、越权或失效成员拒绝并回读。','网络失败区分树失败、字典失败与成员失败；不把失败当空组织。排序超时先重读，不盲目重放；页面销毁取消尚未发送的合并计时器。'],
  apis:[['POST','/common/user/deptadmin/admin','{leftId:部门id}；读取管理员datas'],['POST','/common/user/dept/move','{id:部门id,up:boolean,end:boolean}；部门排序'],['GET','/common/user/dept/detail/{id}','部门详情及既有角色/标签'],['GET','/common/user/depttag/tagList/{id}','当前部门标签候选'],['GET','/common/user/deptRole/roleList/{id}','当前部门角色候选']],
  layout:'右侧内容区左为部门树和新增/编辑/删除/排序工具，右为所选部门成员表及分页。部门维护800px居中弹窗，编码→名称→类型→角色→标签；管理员600px弹窗单独维护。未选节点保留树并提示先选择；空树、无权限、加载失败分别显示。',
  check:'管理员候选必须是本部门成员，移除自身资格后不沿用旧权限；排序单击/快速点击/失败/销毁核对请求数量和树真实顺序。'
 },
 'BAS-007': {
  purpose:'以部门成员关系维护人员、职位、领导标记、关系角色标签及应用数据访问范围。',
  fields:[F('关系 id','路径标识','','','','编辑/移除/排序使用关系id，新增尚无关系id'),F('leftId/rightId','部门ID/用户ID','是','','','新增leftId=部门，rightId=用户'),F('应用 leftId','应用ID','数据权限分支必填','','','编辑应用禁用；与部门关系leftId不能混淆'),F('数据范围 accessLevel','枚举','数据权限分支必填','','1/2/3','1本部门及子部门；2本部门；3递归子部门'),F('数据权限 rightId/deptId','用户ID/部门ID','是','','','路由userId/deptId转换为数值')],
  controls:[['人员新增/编辑/详情','新增人员搜索obscureName且excludeDeptId排除当前成员；编辑人员不可替换；详情控件只读、关闭返回，不发更新。'],['关系排序/移除','成员排序用关系id及up/end；移除DELETE只发送关系ID数组。选择变化和失败先清理旧选择，确认显示部门与人员。'],['数据权限','从目标成员进入独立列表，应用与访问范围分别选择。新增排除已绑定应用；编辑应用固定，只改范围；删除移除应用访问关系。'],['确认/返回','成功后刷新当前部门成员或数据权限列表；取消弹窗零写；返回保留部门上下文。移除本人所在部门关系后重新初始化范围。']],
  flow:['选择部门 → POST deptuser/page带leftId、relationData=2及分页 → 读取datas/total → 新增绑定或按relationId修改 → 回读关系。','职位空允许，非空1至100位英数/空白/指定中文；leader=false必须作为合法布尔保留。角色/标签权限在服务端复核，不能随人员关系越权扩展。','数据权限固定rightId=用户、deptId=部门；POST /common/app/app/inside取应用，读取现有访问关系；新增body{accessLevel,leftId:应用id,rightId:用户id,deptId:部门id}，修改同结构；删除body{leftId:应用id,rightId,deptId}。','绑定超时或关系被删除先读现有关系；同一部门重复人员、并发调整职位/权限采用批准的冲突合同。移除关系成功不能宣称账号被删除或所有其他租户权限消失。'],
  apis:[['POST','/common/app/app/inside','无体，应用候选'],['POST','/common/app/appuser/app','{rightId,deptId,pageRequest}；取datas/total，候选排除另用pageSize=200/pageNo=1的平铺参数'],['POST','/common/app/appuser/bind','{accessLevel,leftId:应用id,rightId:用户id,deptId}'],['POST','/common/app/appuser/modify','同新增结构，应用不可替换'],['DELETE','/common/app/appuser/remove','{leftId:应用id,rightId:用户id,deptId}']],
  layout:'部门树右侧为成员表和独立操作列。成员800px弹窗依次人员、职位、是否领导、角色、标签；查看模式只提供关闭。数据权限独立页含应用名称、访问范围、编辑/删除及分页；800px维护弹窗依次应用和访问范围，底部确认/取消。后两者只有静态模板，无现场完整截图。',
  check:'核对关系id/用户id/部门id/应用id四者不可混用；测accessLevel三值与伪造值、已绑定应用排除、成员移除后账号仍存在。'
 },
 'BAS-008': {
  purpose:'维护角色名称及其叶权限集合，展示权限依赖并防止越权授予和误删引用。',
  fields:[F('查询角色名称 obscureName','string','','','','名称模糊条件，匹配细则由服务端合同固定'),F('角色 id','路径标识','编辑/授权必填','','','取目标角色id'),F('permissionType','number','','2','','角色授权类型；租户使用3'),F('directDepend','权限依赖数组','','','','读取依赖id，作为树联动输入')],
  controls:[['角色查询/新增/编辑/删除','角色列表按名称查询与重置；新增/编辑仅名称；删除独立确认并检查已有绑定。'],['权限树全选/取消全选','仅改变本地树勾选，保存才提交；父菜单使用_前缀临时id，不作为可授予业务权限。'],['依赖联动','选中含directDepend权限时补依赖；取消被依赖权限时处理相关选项。目标对跨层、循环、缺失依赖统一验证，不能只依赖同父节点的客户端实现。'],['保存/返回','提交选中叶节点id数组并回读；空集合的撤权影响需明确确认；返回未保存变更先提示，零授权请求。']],
  flow:['读取角色详情 → 校验名称 → POST或PUT → 回读；角色名是否唯一及作用范围由服务端合同固定。','读取main/permissionTree及rolepermission/permission/{id} → 生成父菜单与叶权限树 → 勾选及依赖闭包校验 → POST rolepermission/reset/{id} → 回读并按会话生效规则复测。','候选树或已选读取失败禁止空集合覆盖；服务端重新判断可授予上限、依赖和当前操作者资格，拒绝未授权叶节点及伪造父id；冲突时展示新集合供人工重新选择。'],
  apis:[['POST','/common/user/role/page','名称筛选及pageRequest，读取角色列表'],['GET','/common/user/main/permissionTree','角色模式查询对象为空'],['GET','/common/user/rolepermission/permission/{id}','既有角色叶权限集合']],
  layout:'角色列表条件在顶部，新增在表格上方，列为角色名、创建人、创建时间、操作。名称维护独立页只有名称输入和底部取消/确认。授权页顶部全选/取消全选，下方树可滚动；半选父节点与叶权限分别呈现，底部保存与返回。',
  check:'测试跨层依赖、循环、缺失节点及伪造_父id；读取任一路失败不得以空树保存，授权撤销按批准生效规则及审计回读。'
 },
 'BAS-009': {
  purpose:'维护租户资料、管理员、工作区选项、成员及独立租户权限集合，保持租户隔离。',
  fields:[F('查询租户名称 obscureName','string','','','','名称模糊条件，匹配细则由服务端合同固定')],
  controls:[['租户列表/资料','名称查询、重置、分页；新增/修改读取管理员候选，containAdmin=false。enabledDop只在ENABLED_DOP和DOP_MULTI_SPACE均真时显示；编辑禁用，不能伪造修改。'],['成员绑定/移除','候选containAdmin=false、notInTenant=tenantId，多选非空；绑定映射leftId=tenantId/rightId=userId数组，移除传用户rightId数组，不能传部门关系id。'],['租户授权','permissionType=3，权限树请求filterTenant=true；保存走tenantpermission/reset，禁止套用角色接口。'],['保存/删除/返回','保存成功及删除后通知父应用isUpdateTenantList=true刷新租户候选；删除需独立确认引用/配额合同，取消无写入。']],
  flow:['读取租户列表 → 新增/编辑name、managerId、realm、enabledDop → 校验名称和有效管理员 → POST/PUT → 回读并通知宿主。','成员页固定租户leftId → 分页读取关系 → 选择可管理用户 → binds或remove/{tenantId} → 回读集合；被移除者平台账号仍存在。','权限树与既有租户授权均成功再编辑；提交叶权限id数组，服务器检查租户许可上限与操作者授予权限；拒绝跨租户及工作区越权。','租户创建、成员和空间初始化的事务边界及失败补偿由BAS-DEP-06固定；不能以单次resolve证明空间和关系均就绪。超时先核实租户及各子结果。'],
  apis:[['POST','/common/user/tenant/page','租户名称条件与分页'],['POST','/common/user/tenantuser/page','{leftId:tenantId,pageRequest}；租户用户列表'],['GET','/common/user/main/permissionTree','{filterTenant:true}，租户模式'],['GET','/common/user/tenantpermission/permission/{id}','读取已绑定租户叶权限']],
  layout:'租户列表上方名称条件与查询/重置、右侧新增；表格列名称、管理员、创建时间及操作。资料页依次名称、管理员、条件工作区开关、领域textarea，底部取消/确认。成员独立页有多选绑定和行内删除；租户授权使用独立权限树布局。',
  check:'核对租户成员绑定对象数组与删除用户id数组；测试工作区开关组合/编辑伪造、成员重复和跨租户，部分失败不宣称全部成功。'
 },
 'BAS-010': {
  purpose:'在本人可管理范围内读取和维护用户、部门及相关关系，避免退回全局权限。',
  fields:[F('用户条件 obscureAccount/obscureName/enabled/pageRequest','查询对象','','','','沿用用户列表控件；服务端按本人管理关系限定'),F('部门树 id/pid/hasPermission','只读节点','','','','当前选中部门及授权状态'),F('userId/deptId/relationId','对象/关系标识','','','','分别映射用户、部门和成员关系；禁止相互替代')],
  controls:[['入口/查询','我的用户与我的部门独立路由，meta.isMyUser/isMyDept决定请求域；切换入口清除旧结果与选择。'],['本人用户维护','仅展示批准动作：详情、角色、重置、强退分别走myUser接口；包装器没有本人创建/更新/删除接口证据，不允许自动调用全局接口补齐。'],['本人部门维护','新增/改名/删除、管理员、成员及数据权限使用各自myDept包装器；复用字段与交互时保留范围鉴权和不同路径，不做机械字符串替换。']],
  flow:['本人身份 → myUser/page或myDept/tree → 可管理对象为空时显示正常空态，失败显示错误；空态不证明系统没有用户或操作者无任何写权限。','以当前范围对象ID进入详情/角色或部门成员 → 服务端再次鉴权 → 按对应my接口读取和写入 → 回读本人范围，失权对象立即移出可操作集合。','修改自身管理关系后重载范围；前端路由、disabled和缓存均不能替代服务端范围。超时不回退全局接口；直接伪造其他范围id由后端拒绝。'],
  apis:[['GET','/common/user/myUser/{id}','本人可管理用户详情'],['POST','/common/user/myUser/role/page','本人用户角色分页'],['POST','/common/user/myUser/role/reset/{id}','角色ID数组'],['PUT','/common/user/myUser/password/{id}','重置配置分支同005'],['PUT','/common/user/myUser/logout/{id}','强退目标会话'],['POST','/common/user/myDept','{name,code,type,tagIds,roleIds,pid}'],['PUT','/common/user/myDept/{id}','本人部门资料'],['DELETE','/common/user/myDept/{id}','本人部门删除'],['POST','/common/user/myDept/user/page','本人部门成员筛选及分页'],['POST','/common/user/myDept/user/bind','同007关系字段'],['PUT','/common/user/myDept/user/{relationId}','同007字段'],['DELETE','/common/user/myDept/user/remove','关系ID数组'],['POST','/common/user/myDept/user/move','{id:关系id,up,end}'],['POST','/common/user/myDept/admin/page','{leftId:部门id}'],['POST','/common/user/myDept/reset/admin/{id}','管理员用户ID数组'],['POST','/common/app/myDept/appuser/app','本人数据权限列表'],['POST','/common/app/myDept/appuser/bind','应用/用户/部门/accessLevel'],['POST','/common/app/myDept/appuser/modify','应用/用户/部门/accessLevel'],['DELETE','/common/app/myDept/appuser/remove','{leftId:应用id,rightId:用户id,deptId}']],
  layout:'复用用户列表或部门树加成员表的区域结构，标题和菜单明确本人范围。历史样本均为空态；不拿空态证明维护弹窗已进入。查询错误独立于无记录；返回保持本人入口、筛选和有效节点。',
  check:'对照全局与本人两组隔离身份，直接id和关系id越界全部拒绝；my接口失败不得触发任何全局写入回退。'
 },
 'BAS-011': {
  purpose:'维护后台用户域的管理标签名称、业务编码及业务类型，保护部门与人员已有引用。',
  fields:[F('查询标签名 obscureName','string','','','','标签名称模糊条件'),F('查询业务编码 obscureBizCode','string','','','','业务编码模糊条件'),F('查询业务类型 obscureBizType','string','','','','业务类型模糊条件'),F('目标 id','路径标识','编辑/删除必填','','','读取taguser详情后更新同一id')],
  controls:[['查询/重置/新增','按标签名、业务编码和业务类型查询，重置回第一页；新增三个空字符串草稿。'],['名称/编码/类型','名称1至100位指定英数/空白/中文，目标拒绝纯空白；bizCode为1至20位英数；bizType非空≤100位且按英文逗号分段，空字符串转null。'],['编辑/删除','读取详情后编辑；内置样本无行操作不能扩大为所有标签禁止维护。服务端识别内置保护和引用关系，删除确认显示名称与编码。']],
  flow:['查询taguser/page → 新增或按id读取 → 校验三字段 → 转换bizType空值为null → POST/PUT → 回读相同对象及列表。','纯空白名称是新增目标修正，原正则包含空白；trim、大小写和唯一范围由BAS-DEP-03批准后前后端统一。','引用中、内置保护、失权与并发删除分别保留原标签和引用，不能把请求失败伪报为删除成功；取消编辑不提交，超时先回读。'],
  layout:'顶部标签名/业务编码/业务类型与查询/重置，右侧新增；表格包含名称、业务编码、创建时间及允许的操作。维护表单依次名称、业务编码、业务类型，底部确认/取消；该表单仅有静态模板，现场截图尚缺，不推定当前部署像素布局。',
  check:'检验纯空白、100/101位名称、20/21位编码、英文/中文逗号和空类型转null；内置与被引用标签按批准合同拒绝修改或删除。'
 },
 'BAS-012': {
  purpose:'按单独指定的账号或IP解除安全限制，防止误操作其他对象和降低既有保护。',
  controls:[['账号解禁','仅校验account字段，trim后4至20位英数；IP为空不阻挡。按钮在账号输入右侧，触发DELETE即执行，不是只打开确认框。目标增加显示对象和影响的明确确认。'],['IP解禁','仅校验ip字段，trim并经isIP校验；控件maxlength=15。不能据此声称支持IPv6；服务器解析及IPv6协议未定前按现有IPv4输入边界开发。'],['反馈/重试','确认期间锁定对应动作；无锁定、无权、服务失败和结果未知分别提示。取消新增确认零DELETE；重复解除按批准幂等合同回读，不盲目重试。']],
  flow:['选择一个解禁对象 → 只校验该字段 → 显示对象与影响供确认 → DELETE recover/account或recover/ip → 根据真实业务响应显示结果与审计关联。','账号解禁不能代替用户启用、密码重置或延长有效期；IP解禁不能删除其他安全策略。是否同时影响账号与IP、计数器窗口及下一次登录结果由安全合同固定。','无分页、无普通新增/编辑、无保存草稿；离页清空解禁输入，出错保留非秘密对象以便核对，不能自动重复发起安全状态变更。'],
  layout:'右侧标题下两行或同一宽行内的账号、IP输入，每个输入右端独立解禁按钮；账号标签在前。历史1500×1000截图体现并排区域，模板标签宽80px、顶部padding15px；窄屏改为纵向但保持字段与对应按钮关联，错误靠近当前字段。',
  check:'仅账号/仅IP两分支、15/16字符、非法IP及IPv6输入边界；校验其他字段不阻挡本分支，确认取消零DELETE，执行结果与安全审计可回读。'
 }
};

const NFR = [
 ['传输与秘密保护','用户密码、管理员密码、联系方式、公钥使用过程和令牌分别保护；接口使用TLS且无混合内容。加密失败零明文回退，秘密零写入URL、日志、持久草稿及普通审计；服务端密码哈希算法/参数由安全合同固定。','受控标记、网络与日志/存储检查；任何明文秘密泄露或失败回退即失败。'],
 ['对象权限与范围隔离','全局、本人、部门、租户、角色及应用数据范围在服务端按每次动作重新鉴权；直接id、关系id、混合批量和越权叶权限零授权成功。','至少两组隔离身份逐动作测试；确认拒绝响应且无业务变更，失权后零全局接口回退。'],
 ['会话与高影响操作','重置、启停、默认租户使用、强退、删除、解禁及空集合撤权明确确认对象和影响；会话撤销和新权限生效按批准窗口。客户端显示隐藏不作为服务端授权。','隔离测试取消、会话过期/撤销、跨终端强退及权限变化；窗口、范围和限流策略先取得安全合同，无合同不得判通过。'],
 ['幂等、并发与结果未知','一次提交意图最多一次用户/部门/租户创建或集合更新；共享锁覆盖点击和Enter。超时先核查结果，零自动写请求重放；集合版本冲突不静默覆盖。','20组重复点击、并发修改、响应丢失和断网；按批准关联标识回读，对象重复或旧版本覆盖即失败。幂等键和保留期不自创。'],
 ['权限与关系一致性','用户/成员/部门/租户/应用ID映射不混淆；候选失败或截断不覆盖既有集合。角色依赖、继承和租户空间/成员事务不产生部分授权或孤立关系。','固定种子关系集覆盖跨层/循环/缺失依赖、500条截断、部分失败和成员移除；批准事务/补偿和继承规则后逐集合回读。'],
 ['页面与接口性能','指定环境下冷页到可操作P95≤4秒、热页P95≤2秒；分页读取P95≤2秒、P99≤4秒，合法请求失败率≤1%；交互反馈P95≤100ms。','每页冷/热各30次；20并发虚拟用户、预热2分钟、统计10分钟且每类读取≥1000样本；报告样本数、吞吐、P50/P95/P99/最大值和失败。'],
 ['超时与失败恢复','读取必须有有限生效超时；写入超时与响应目标分开。失败后1秒内解除页面忙碌并显示恢复入口；旧响应零覆盖，不以空列表冒充失败。','受控超时、断网、202/5xx和畸形响应，各20次；读取可手动重试，写入只提供结果核查。路径超时和timeout=0需先核对生效配置。'],
 ['审计与抗滥用','记录操作者、目标对象/关系、范围、动作、结果、时间和请求关联；权限集合变更记录脱敏前后差异。解禁/重置等按批准账号/IP/操作者维度限流。','每类动作成功、拒绝和故障各一次串联审计；边界限流及恢复只在隔离环境测试。保留期、查阅权限和阈值取得批准契约后验收。'],
 ['时间与恢复','有效期展示、认证判定使用同一批准时区和边界规则；备份恢复同时保证用户、部门、租户、权限及审计关系一致。','跨时区、夏令时、边界前后、清空及相等/逆序测试；RTO/RPO与备份策略先批准，再在隔离环境恢复并逐关系核对，不虚构可用率。'],
 ['兼容与可访问性','Windows 11 Chrome/Edge稳定版记录准确版本；1500×1000、1366×768、1024×768，100%/200%缩放可完成操作。键盘可达树、穿梭选择、表单和确认，字段错误与状态可读屏播报。','按矩阵检查长文本、滚动、焦点返回、首错定位和文本对比度；单张截图不代表兼容或全面无障碍通过。'],
 ['资源与长时稳定性','离页释放定时器、事件、敏感模型和声明objectURL；停止未发送排序任务，重入不叠加监听。密码不持久化，失败及关闭及时清理。','100次重入/开关/切换和乱序请求，遗留定时器/监听/objectURL为0，跨对象旧值为0；取可复现资源记录。'],
 ['规格与契约可维护性','保留BAS-001至012、原77项验收及所有历史证据；源码刷新与--refresh不得覆盖细化正文。配置、DTO、枚举、错误与ID映射可追溯。','运行生成一致性、编号/证据、反例和片段摘要/偏移回归；生产就绪与应用执行状态不能由文档测试升级。']
];
const cell = s => String(s ?? '').replace(/\|/g,'&#124;').replace(/\n/g,' ');
const table = (head,rows) => ['| '+head.join(' | ')+' |','|'+head.map(()=> '---').join('|')+'|',...rows.map(r=>'| '+r.map(cell).join(' | ')+' |')].join('\n');
const idNum = n => String(n).padStart(3,'0');
function features() { return catalog.features.map(s=>({...s,...extra[s.id],fields:[...s.fields.map(r=>s.id==='BAS-001'?[r[0].replace(' account',' obscureAccount').replace(' name',' obscureName'),...r.slice(1)]:s.id==='BAS-012'&&r[0]==='IP ip'?[...r.slice(0,4),'maxlength=15',...r.slice(5)]:r),...(extra[s.id].fields||[])],apis:[...s.apis,...(extra[s.id].apis||[])],controls:extra[s.id].controls})); }
function sourceLinks(id) { const r=catalog.requirements.find(x=>x.id===id); return r.evidence.map(e=>`[${e}](../evidence/live-recheck-20261022/${e}.png) / [页面元素](../evidence/live-recheck-20261022/${e}.json)`).join('；'); }
function renderFeature(s) {
 const n=Number(s.id.slice(-3));
 const fields=s.fields.map(r=>r.map(v=>String(v).replace(/（客户端）/g,'').replace(/（新增客户端）/g,'（新增）')));
 const apis=s.apis.map(([method,url,arg])=>[method,url,plain(arg)]);
 if(s.id==='BAS-006')apis.find(r=>r[1]==='/common/user/dept/tree')[2]='无请求体；读取部门树';
 const oldCases=catalog.originalCases.filter(c=>c.requirement===s.id&&Number(c.id.slice(-3))>=18);
 return [`### ${s.id} ${s.title}`,'',`**业务目的**：${s.purpose}`,'',`**入口与前置条件**：从系统管理对应菜单进入，按当前对象和动作权限开放；维护/授权必须取得合法对象上下文。全局与本人范围分离，不因菜单可见认定有权写入。`,'',
 `#### 1. 页面字段清单（${s.id}）`,'',table(['字段名称与绑定名','类型/控件','必填','默认值','长度/范围/单位','格式与转换','错误提示','条件/状态'],fields),'',
 '字段属性空白表示现有合同未给出该属性，不授权开发自行补造。初始草稿与后端默认分开；编辑必须以成功读取的对象建立基线。具体错误语言键与原文追溯见源码补充。','',
 `#### 2. 页面交互规则（${s.id}）`,'',table(['控件/触发','行为、联动及反馈'],s.controls.map(([a,b])=>[a,plain(b)])),'',
 `#### 3. 业务流程与异常分支（${s.id}）`,'',...s.flow.map((v,i)=>`${i+1}. ${v}`),'',
 '依赖读取失败、字段错误、无权限、重复/引用冲突、会话过期及技术失败分别呈现；未取得真实成功响应不得进入成功跳转。读操作允许手动重查；写入结果未知先核查对象和审计，不以再次点击代替结果确认。只读详情没有新增或提交流程。','',
 `#### 4. 接口与数据规则（${s.id}）`,'',table(['HTTP方法','模块服务相对路径','请求参数/读取目的'],apis),'',
 '上述为模块路径；完整默认网关路径、宿主注入、序列化、超时及响应处理统一见第4节。请求仅使用本分支批准字段，路径ID、关系ID、父ID与候选ID保留各自语义；幂等/版本键、成功DTO和错误码由后端合同固定，不能由页面自行命名。','',
 `#### 5. 验收标准（${s.id}）`,'',table(['验收编号','前提、步骤与可检查结果','关联需求','状态'],oldCases.map(c=>[c.id,plain(c.text),s.id,'未执行'])),'',
 `#### 6. 权限与安全要求（${s.id}）`,'',
 '服务端按操作者、目标对象和关联范围逐动作鉴权；直接路由、伪造ID、不可管理候选和批量混入对象同样拒绝。读取权限与维护、授权、删除、重置、强退、解禁分别授予。敏感字段不写日志或持久草稿；加密不替代TLS及服务端安全存储。权限与继承矩阵按核查记录BAS-DEP-02落实。','',
 `#### 7. 页面布局与状态（${s.id}）`,'',s.layout,'',
 '初始化与依赖加载时显示忙碌并限制相关操作；空态、加载失败和无权分开。字段错误关联控件，提交失败恢复操作并保持可安全重用的资料；成功后回读，取消/返回不自动保存。弹窗焦点受控，关闭后回到触发入口；窄屏保持标签与按钮对应。','',
 `#### 8. 关联文档（${s.id}）`,'',sourceLinks(s.id),'',
 `历史源码标识：${s.sources.join('、')}；[源码与参数对照](./源码核对补充.md) · [本轮必要片段](../evidence/bas-review-20261028/index.json) · [核查记录](./核查记录.md)。历史截图及源码时间不同，未据此证明当前页面已实现全部目标。`,'',
 `#### 9. 非功能性需求（${s.id}）`,'',
 '适用BAS-NFR-001至012；列表与详情重点检查权限、性能、竞态和空/错状态，资料维护增加敏感字段与幂等，集合/权限变更增加一致性，高影响动作增加确认、会话撤销与审计。统一指标及测量环境见第9节，全部应用验收未执行。',''].join('\n');
}
function plain(text) {
 return text.replace(/本轮均未调用。?/g,'').replace(/，未执行。?/g,'。').replace(/；完整运行时序列化待验证/g,'；序列化见公共合同').replace(/；保留复制对象中的其他现有键/g,'；实际请求字段以批准DTO白名单为限').replace(/；依赖、根节点与已有成员保护尚需后端验证/g,'；按批准引用保护拒绝危险删除').replace(/排序参数结构待验证/g,'{id:关系id,up:boolean,end:boolean}').replace(/，规则确认后验收/g,'，按批准规则验收');
}
function renderMain() {
 const fs=features();
 const legacy=catalog.originalCases.filter(c=>Number(c.id.slice(-3))<18);
 return ['# 后台系统管理需求说明','',PLAIN,MARKER,'',
 '## 1. 业务目标与角色','',
 '从右上角“后台管理”进入`/module-common/index`，展开系统管理；管理平台用户、部门与成员、角色菜单权限、租户及成员、本人可管理对象、管理标签与账号/IP解禁。后台管理标签属于用户管理域，与数据资产标签分离。操作者使用批准角色和管理范围；平台、租户、部门管理员的可见与可写权限逐动作在服务端执行。','',
 '## 2. 业务范围','',
 table(['需求','独立目标及操作'],fs.map(s=>[s.id,s.title])),'',
 '菜单入口、资料表单、成员关系、角色集合、权限树、有效期与重置/解禁是独立操作分支；保存资料不隐式执行授权、启停或解禁。本人范围禁止回退全局接口。完整字段和可开发边界由本文件、源码补充与核查记录共同约束。','',
 '## 3. 功能需求','',...fs.map(renderFeature),
 '## 4. 公共接口、字段及响应规则','',
 '模块通过parentdata取得宿主getRequestInstance；MODULE_URL_PREFIX优先覆盖服务前缀，缺省commonUser=/common/user、commonAuth=/common/auth、commonApp=/common/app、commonDict=/common/dict。已查宿主API_BASE_URL加`/back`；例如用户读取默认POST `/back/common/user/user/page`，解禁默认DELETE `/back/common/auth/recover/account/{account}`。实际部署覆盖必须在联调记录核对，不能把包装器路径当认证Network结果。','',
 '宿主request去掉路径首个斜线后与baseURL组合；GET参数置params，其他方法参数置data，未传参数时使用空对象。普通请求Content-Type为application/json;，withCredentials=true；请求按配置附加CSRF、令牌及时间/nonce/sign字段，本文不保存这些值。JSON数组保持数组，DELETE的关系数组和对象不能转成查询字符串；路径标识须按批准URL编码合同处理。','',
 '超时依次取匹配路径规则的非负值、请求number类型timeout、最后20000ms兜底；0未被排除。user/page和myUser/page包装器传timeout:0，不得声称现网请求必定20秒结束。目标要求有限生效超时与结果核查，见BAS-NFR-007。','',
 table(['响应分支','客户端已查读取与目标处理'],[
 ['正常HTTP响应','除配置NETWORK_ERROR_CODE（当前202）外，公共拦截器返回response.data，rawData分支返回原response；不存在可泛化的code=0判断。写入成功DTO和字段错误需后端合同。'],
 ['202/业务拒绝','进入公共异常处理并reject；读取data.msg或Blob错误消息，局部配置isHiddleErrorMessage影响提示。页面不得在catch后继续按成功处理。'],
 ['1002/1109/1012/1003','宿主分别处理失效认证、改密路径、刷新和无权限路径；详情/列表的局部catch仍须终结loading及保留非敏感恢复上下文。'],
 ['超时/断网/5xx/解析失败','保留可安全重用的非敏感资料；清理密码，解除锁；读取可重查，写入显示结果未知并先核实。'],
 ['列表/树','用户列表已查datas/total或数组分支；部门成员与多数关系列表用datas/total；树有children/permissions与hasPermission。畸形响应不能当合法空态。']]),'',
 '未取得实际后端响应、Cookie属性、幂等及版本协议时，以上仅约束已查客户端调用与目标恢复，不授权补造成功body或安全参数。公共客户端来源及版本边界见核查记录。','',
 '## 5. 跨页面流程','',
 '定位对象 → 读取对象及依赖候选 → 核对当前管理范围 → 编辑本地草稿 → 校验并明确提交影响 → 单次请求 → 明确业务成功 → 回读同一对象/关系 → 刷新来源上下文。权限与成员集合是覆盖或关系变更，必须取得完整既有集合；依赖失败/截断禁止空集合提交。','',
 '普通返回保留非敏感查询条件、页码和有效选中节点；非敏感未保存修改提示放弃，密码离页清理。结果未知不保证回滚，先查对象及审计。删除平台账号、删除部门、删除租户、移除成员和解除安全限制分别核对对象及引用，不互相替代。','',
 '## 6. 模块验收与发布编号','',
 table(['验收编号','前提、步骤与可检查结果','关联需求','状态'],[
 ...legacy.map(c=>[c.id,plain(c.text),c.requirement,'未执行']),
 ...fs.map((s,i)=>['BAS-AC-'+idNum(78+i),s.check,s.id,'未执行'])]),'',
 '保留原77项正式验收编号；新增078至089覆盖本轮补齐的关键分支。所有应用验收均未执行，文档/生成器测试不能改变此状态。','',
 '## 7. 实现与交付边界','',
 '可据字段、布局、参数和状态约束开发页面、依赖加载及客户端转换。真实持久化、账号唯一范围、密码/会话、角色依赖与继承、租户配额/事务、有效期边界和解禁效果必须按已批准后端与安全合同联调；缺口、已查范围、责任及受阻验收见[核查记录](./核查记录.md)。不把页面原型或静态检查判定为权限、安全及生产运行就绪。','',
 '## 8. 关联资料','',
 '[源码核对补充](./源码核对补充.md) · [核查记录](./核查记录.md) · [必要原文片段](../evidence/bas-review-20261028/README.md) · [历史现场证据](../evidence/live-recheck-20261022/README.md) · [历史源码证据](../evidence/source-review-20261023/README.md) · [登录标准](../01-登录/需求说明.md) · [用户菜单](../02-工作台/用户菜单补充清单.md) · [公共开发边界](../开发约定与交付边界.md) · [总索引](../README.md)。','',
 '## 9. 非功能需求与测量环境','',
 table(['编号','质量属性','指标/不变量','验收方法与失败判定','关联功能','状态'],NFR.map((v,i)=>['BAS-NFR-'+idNum(i+1),...v,'BAS-001至012','未执行'])),'',
 '上述性能数值是本次新增开发验收目标，尚无实测，不作为现网容量或SLA。测量环境固定构建版本、Windows 11/8核16GiB客户端、准确浏览器版本、100Mbps上下行与RTT50ms；服务端实例/CPU/内存/数据库/索引、网关及安全策略在报告登记，未固定不判通过。隔离种子数据10万用户、1万部门节点（最多10层）、1000角色、100租户；条件与关系规模固定且可复现，敏感数据使用合成值。20并发各用隔离账号，会话/思考时间/在途请求和实际吞吐单列，不把并发当QPS。','',
 '页面起点为导航触发，终点为目标内容和依赖加载完成且授权控件可操作；接口从客户端发送到完整解析并校验业务结果，包含网络/网关。冷/热缓存分开；样本排序取第ceil(p×N)项，给出P50/P95/P99、最大值、N及失败次数。5xx、超时、解析/错误业务结果及合法负载被限流均计失败；预期拒绝单列。样本不足不判通过，不关闭安全策略提高成绩。RTO/RPO、保留期、会话撤销和抗滥用阈值取得批准合同后验证；不填无依据的月度可用率。压测、故障注入及后台写入须另获环境授权，当前均未执行。',''].join('\n');
}
function renderSourceNote() {
 return ['# 后台系统管理接口与源码对照','',PLAIN,MARKER,'',
 '本文件维护与主规格一致的参数、原始校验语言键及追溯入口，业务目标和验收以[需求说明](./需求说明.md)为准。来源、差异、外部合同与本轮验证统一见[核查记录](./核查记录.md)。源码定义不等于认证Network或后端验收。','',
 ...features().flatMap(s=>[`## ${s.id} ${s.title}`,'',table(['HTTP方法','模块服务路径','参数及转换'],s.apis.map(([a,b,c])=>[a,b,s.id==='BAS-006'&&b==='/common/user/dept/tree'?'无请求体；部门树':plain(c)])),'',
 table(['原字段','客户端规则/语言键','目标约束'],s.fields.map(r=>[r[0],[r[4],r[5],r[6],r[7]].filter(Boolean).join('；'),'依主规格字段与流程；服务端独立校验'])),'',
 `历史源码：${s.sources.join('、')}；[原片段](../evidence/source-review-20261023/index.json) · [本轮补齐片段](../evidence/bas-review-20261028/index.json)。`,'',sourceLinks(s.id),'',
 table(['保留检查行标识','对应正式验收','状态'],s.checks.map((_,i)=>[`REVIEW-BAS-${s.id.slice(-3)}-${(i+1)%5+1}`,'BAS-AC-'+idNum(18+(Number(s.id.slice(-3))-1)*5+i),'未执行'])),'']),
 'REVIEW标识沿用原补充文件的顺序，不新建正式验收；原检查内容已合入对应正式BAS-AC用例。无当前独立截图的部门详情/数据权限/管理员及标签表单按静态模板限定可开发范围，不能宣称已进入。',''].join('\n');
}
function validateLedger(text) {
 const ids=[...text.matchAll(/^### (BAS-\d{3})\b/gm)].map(x=>x[1]);
 if(JSON.stringify(ids)!==JSON.stringify(catalog.requirements.map(x=>x.id)))throw Error('BAS requirements lost or reordered');
 const cases=[...text.matchAll(/^\| (BAS-AC-\d{3}) \|/gm)].map(x=>x[1]);
 const expected=[...catalog.acceptanceOrder,...Array.from({length:12},(_,i)=>'BAS-AC-'+idNum(i+78))];
 if(JSON.stringify(cases)!==JSON.stringify(expected))throw Error('BAS acceptance lost or reordered');
 const associations=new Map(catalog.originalCases.map(c=>[c.id,c.requirement]));
 for(let i=0;i<12;i++)associations.set('BAS-AC-'+idNum(78+i),'BAS-'+idNum(i+1));
 for(const row of text.split('\n').filter(x=>/^\| BAS-AC-/.test(x))){const cols=row.split('|').map(x=>x.trim());if(cols.at(-3)!==associations.get(cols[1]))throw Error('BAS acceptance association changed');}
 const nfrs=[...text.matchAll(/^\| (BAS-NFR-\d{3}) \|/gm)].map(x=>x[1]);
 if(JSON.stringify(nfrs)!==JSON.stringify(NFR.map((_,i)=>'BAS-NFR-'+idNum(i+1))))throw Error('BAS NFR registry lost or reordered');
 for(const row of text.split('\n').filter(x=>/^\| BAS-(AC|NFR)-/.test(x)))if(row.split('|').at(-2).trim()!=='未执行')throw Error('BAS application acceptance cannot pass through documents');
 for(const r of catalog.requirements){const block=text.match(new RegExp('^### '+r.id+' ([\\s\\S]*?)(?=^### |^## |(?![\\s\\S]))','m'))?.[1]||'';for(const e of r.evidence)if(!block.includes(e+'.png'))throw Error('BAS missing evidence '+r.id);}
 return true;
}
module.exports={MARKER,NFR,catalog,features,renderMain,renderSourceNote,validateLedger};
if(require.main===module){const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../doc/requirements/36-后台系统管理');const main=renderMain();validateLedger(main);fs.writeFileSync(path.join(root,'需求说明.md'),main);fs.writeFileSync(path.join(root,'源码核对补充.md'),renderSourceNote());console.log('BAS: 12 features, 89 acceptance cases, 12 NFR; application acceptance unexecuted');}
