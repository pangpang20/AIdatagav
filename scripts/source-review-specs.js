/* Evidence-backed additions. All application write acceptance remains unexecuted. */
const REVIEW = 'source-review-20261023';
const field = (name, type, required = '', defaultValue = '', length = '', format = '', error = '', state = '') =>
  [name, type, required, defaultValue, length, format, error, state];
const commonPending = [
  'P0：服务端必填、唯一范围、授权矩阵、响应业务码、审计及持久化结果仍需接口或后端证据。',
  'P1：超时结果核实、重复提交保护、取消确认和失败恢复需要在获授权的隔离测试环境验证。',
];
const shared = 'SRC-SHARED';
const userFields = [
  field('账号 account', 'string', '是（客户端）', '""（新增草稿）', 'maxlength=20', '^[a-zA-Z0-9]{4,20}$', 'locale: pleaseInputUsername / pleaseEnterTheAccountNumberInTheCorrectFormat', '编辑禁用'),
  field('姓名 name', 'string', '是（客户端）', '""', 'maxlength=10', '', 'locale: pleaseTypeInYourName'),
  field('初始密码 password', 'password', '是（新增客户端）', '""', '', 'pwdValidate；系统密码配置', '', '仅新增显示；focus清空，blur处理'),
  field('确认初始密码 confirmPassword', 'password', '是（新增客户端）', '""', '', '与初始密码一致', 'locale: viewsManageUserUserEditVue.theInitialPasswordIsInconsistent', '仅新增显示'),
  field('手机号码 mobilephone', 'string', '由USERINFO_REQUIRE.mobilephone控制', '""', 'maxlength=11', 'isMobilePhone校验器', 'locale: viewsManageUserUserEditVue.pleaseEnterAValidPhoneNumber'),
  field('邮箱 email', 'string', '由USERINFO_REQUIRE.email控制', '""', 'maxlength=50', 'isEmail校验器'),
  field('昵称 nickname', 'string', '', '""', 'maxlength=10'),
  field('英文名 englishName', 'string', '否（客户端required=false）', '""', 'maxlength=50', 'notContainChinese校验器'),
  field('工号 workNum', 'string', '由USERINFO_REQUIRE.workNum控制', '""', 'maxlength=20'),
  field('性别 gender', '枚举', '', '""', '', '男=0，女=1；编辑空值转换为-1'),
  field('用户类型 type', '字典枚举', '', '""', '', 'categoryKey=userType；候选value用parseInt转换', '', '字典有数据才显示'),
  field('隐私同意 privacyChecked', 'array', '显示时要求非空（客户端）', '[]', '', '数组校验', 'locale: pleaseReadThePrivacyStatement', 'privacyStatementUrl有值才显示'),
];
const userInteraction = [
  ['输入与校验', '账号、姓名及联系方式在blur校验；性别候选值是0/1。密码策略取systemConfig，不将静态样本或HTML min当作服务端策略。'],
  ['提交', '公共提交器validate→beforeHandle转换→loading=true→创建或更新；resolve/reject均清loading。用户页未传is-loading，不能据此认定提交按钮已禁用。'],
  ['取消/返回', '公共返回实现为router.go(-1)；该实现没有显示脏数据确认。提交catch没有重置表单代码；具体控件是否保留秘密值需运行验证。'],
];
const specs = {};
function add(id, group, title, sources, fields, interactions, flow, apis, checks, layout, pending = []) {
  specs[id] = { id, group, title, sources, fields, interactions, flow, apis, checks, layout, pending: [...pending, ...commonPending] };
}
add('BAS-001', '36-后台系统管理', '查询和定位平台用户', ['SRC-USER-API', 'SRC-USER-LIST'], [
  field('账号 account', 'string'), field('姓名 name', 'string'), field('分页 pageRequest', 'object'),
], [['查询/分页', '列表调用userPage，传筛选对象和pageRequest；这里是POST读取接口，不能只按HTTP方法判定写操作。']],
['设置账号、姓名及页面状态条件。', '调用列表接口并使用返回列表；真实分页响应键和失败结构待验证。'],
[['POST', '/common/user/user/page', '页面筛选对象，含pageRequest；完整运行时序列化待验证']],
['按测试账号查询并核对返回行身份。', '无匹配结果显示空状态，保留条件。', '分别验证无权与服务错误，不能都显示为空列表。', '快速切换页码及条件，核对迟到响应。', '重置后确认筛选、页码及实际请求；不把样本总数写成容量。'],
'原R011列表截图；筛选在列表上方，表格和分页分区。');
for (const [id, title, edit] of [['BAS-002', '创建用户并设置初始资料', false], ['BAS-003', '修改用户资料', true]]) {
  add(id, '36-后台系统管理', title, ['SRC-USER-FORM', 'SRC-USER-API', shared], edit ? userFields.filter(f => !/密码/.test(f[0])) : userFields,
    userInteraction,
    [edit ? '按id读取并回填资料，账号控件禁用。' : '初始化空字符串草稿；按配置决定联系方式必填和条件字段显示。',
      '按客户端规则校验，再复制草稿并删除password、confirmPassword。',
      edit ? '空gender/type转换为-1；未改联系方式发送null，已改联系方式RSA加密。' : '密码加密写入newPwd；手机与邮箱经RSA加密，原密码与确认密码不作为同名请求键发送。',
      '调用API包装器；公共成功分支显示提示，提示确认/关闭后返回。真实响应、重复账号错误、实际记录变化未验证。'],
    edit ? [['GET', '/common/user/user/{id}', '路径id'], ['PUT', '/common/user/user/{id}', '复制资料；gender/type转换；联系方式未改=null、已改=RSA结果']]
      : [['POST', '/common/user/user', 'account,name,nickname,englishName,mobilephone,email,workNum,gender,type,privacyChecked及newPwd；保留复制对象中的其他现有键']],
    [edit ? '读取测试用户；账号不可编辑，保存后回读除账号外的允许修改字段。' : '合法4/20位账号及合法资料创建；检查newPwd请求键并回读真实id。',
      '分别输入3/21位、含下划线/中文账号；前端不得正常提交；绕过前端的后端校验另测。',
      edit ? '联系方式未变/改变分别检查null和加密参数；gender空值检查-1。' : '两次密码不一致阻止提交；重复账号由真实后端拒绝且不能覆盖原用户。',
      '模拟网络中断与业务拒绝，核对loading清除、错误显示及草稿；超时先回读再重试。',
      '取消后无创建/更新请求；普通用户直接访问和重复提交分别检查授权及单次写入。'],
    '原R013新增/R014编辑截图；labelWidth=150px，字段顺序为账号、姓名、两项新增密码、手机、邮箱、昵称、英文名、工号、性别；用户类型和隐私声明按配置条件显示。',
    ['源码复制privacyChecked到请求，但服务端是否接收、是否过滤该键待验证；不把前端草稿直接当作后端DTO。', '页面没有已确认的部门、角色或租户输入；这些绑定由独立功能处理。']);
}
add('BAS-004', '36-后台系统管理', '设置账号有效期', ['SRC-USER-LIST', 'SRC-USER-API'], [
  field('有效期 date', 'datetimerange', '', '', '', 'yyyy-MM-ddTHH:mm:ss；default-time为00:00:00与23:59:59'),
], [['打开', '600px弹窗，date校验数组为空。默认时刻只用于日期时间选择，不等于账号默认有效期。'], ['确认', '非空范围转effectTime/expiredTime；清空转两个空字符串后调用接口。']],
['打开目标账号有效期弹窗。', '选范围或清空，确认后发送两个时间字段；服务端清空语义仍需确认。'],
[['PUT', '/common/user/user/effectExpired/{id}', '{effectTime,expiredTime}；清空时两者为""']],
['保存合法范围并回读边界。', '检查两个默认时刻和实际发送格式。', '结束早于开始、相同边界及过期账号由后端规则确认后验收。', '清空后回读并确认其真实业务含义。', '取消不请求；无权、超时与重复保存不伪报成功。'], '600px弹窗，依据R015。');
add('BAS-005', '36-后台系统管理', '用户角色与高影响操作', ['SRC-USER-LIST', 'SRC-USER-ROLE', 'SRC-USER-API', shared], [
  field('角色 bindRoleList', 'ID数组', '', '[]', '', '角色候选roleType=1；不可管理的既有角色禁用'),
  field('管理员密码 pwd', 'password', '配置分支内校验', '""'), field('新密码 newPwd', 'password', '配置分支内校验', '""'), field('确认密码 newPwd2', 'password', '配置分支内校验', '""', '', '需一致'),
], [['绑定角色', '候选取role/my/list；绑定分页pageSize=500只是本次请求大小。既有且不在候选内的角色补入禁用，提交整个绑定ID数组。'],
  ['启用/禁用/强制退出', 'warn确认的okEvent内才调用接口；本轮均未调用。'],
  ['重置密码', 'RESET_PASSWORD_SHOULD_INPUT_PASSWORD为真时输入管理员密码、新密码、确认密码，发adminPwd/newPwd的RSA结果；假时不传密码体。失败清loading并显示e.data.msg。']],
['定位账号与角色。', '按具体操作分支确认影响；确认角色是集合覆盖而非追加。', '成功后重新读取；配置分支无密码体不能推断系统默认密码。'],
[['GET', '/common/user/role/my/list', '{roleType:1}'], ['POST', '/common/user/userrole/role', '{roleType:1,leftId:id,pageRequest:{pageSize:500,order:[{prop:"createTime",asc:false}]}}'],
  ['POST', '/common/user/userrole/reset/{id}', '角色ID数组'], ['PUT', '/common/user/user/enable/{id}', '路径id'], ['PUT', '/common/user/user/disable/{id}', '路径id'], ['PUT', '/common/user/user/logout/{id}', '路径id'], ['PUT', '/common/user/user/password/{id}', '配置分支：{adminPwd:RSA结果,newPwd:RSA结果}或无密码体']],
['不可管理的既有角色不能被页面误删除；回读最终角色集合。', '取消启停/强制退出确认，不发请求；确认后只处理目标测试账号。', '分别测试两种重置配置；不记录密码或加密结果。', '密码不一致、管理员密码错误、无权与服务失败应拒绝且不伪报成功。', '核对强制退出实际会话范围、角色生效时机和审计；超时先回读，避免重复操作。'], 'R016更多菜单、R017角色页；角色页和重置弹窗是独立分支。');
add('BAS-006', '36-后台系统管理', '维护部门树', ['SRC-DEPT-FORM', 'SRC-DEPT-API'], [
  field('编码 code', 'string', '是（客户端）', '""', 'maxlength=20', '^[a-zA-Z0-9]{1,20}$', '', '编辑禁用'),
  field('名称 name', 'string', '是（客户端）', '""', 'maxlength=100', '1–100位英文字母、数字、空白或U+4E00–U+9FA5；拒绝纯空白', '', '一级节点编辑禁用'),
  field('类型 type', '字典枚举', '是（客户端）', '""', '', 'deptType字典'), field('角色 roleIds', 'ID数组', '', '[]'), field('标签 tagIds', 'ID数组', '', '[]'),
], [['新增/编辑', '新增pid取选中节点id；编辑pid取当前节点pid，目标id用于路径；role/tag候选canModify=false时禁用。'], ['删除', '源码定义删除接口；依赖、根节点与已有成员保护尚需后端验证。']],
['先选择真实部门节点。', '填写编码、名称、类型及可管理角色/标签。', '分别调用新增或更新，回读树；不将一级节点禁用状态推广为所有部门不可改名。'],
[['POST', '/common/user/dept/tree', '查询对象'], ['POST', '/common/user/dept', '{name,code,type,tagIds,roleIds,pid}'], ['PUT', '/common/user/dept/{id}', '上述资料及pid'], ['DELETE', '/common/user/dept/{id}', '路径id'], ['POST', '/common/user/deptadmin/reset/{id}', '管理员ID数组']],
['编码1/20位通过客户端，空/21位/中文编码阻止。', '名称100/101位、纯空白、混合空白分别核对；一级节点编辑状态正确。', '父节点pid对应所选节点；新增和编辑回读同一树。', '禁用候选不被越权提交；删除有子部门/成员时按后端规则保护。', '取消、失败、重复和并发移动均核对树及人员关系不误变更。'], '800px弹窗；编码→名称→类型→角色多选→标签多选；R018/R020/R023。');
add('BAS-007', '36-后台系统管理', '维护部门人员及职位', ['SRC-DEPT-MEMBER', 'SRC-DEPT-API'], [
  field('人员 id', '用户ID', '是（客户端）', '""', '', 'obscureName搜索；excludeDeptId=当前部门', '', '编辑时人员文本禁用'),
  field('职位 position', 'string', '否（客户端允许空）', '""', '非空1–100位', '英文字母、数字、空白或U+4E00–U+9FA5'),
  field('是否领导 leader', 'boolean', '是（客户端）', 'false', '', 'true/false'), field('角色 roleIds', 'ID数组', '', '[]'), field('标签 tagIds', 'ID数组', '', '[]'),
], [['新增', '人员候选排除当前部门成员；提交当前部门leftId及人员rightId。'], ['修改', '路径用部门成员关系id；body保留leftId/rightId，不能把关系id当用户id。'], ['移除', 'warn确认后发送关系ID数组；移除成员关系不等于删除用户。']],
['选择部门，打开800px成员弹窗。', '选择人员、职位、领导标记及角色/标签。', '创建或更新关系；成功刷新成员列表。移除当前本人所在部门的特殊分支会重新初始化页面。'],
[['POST', '/common/user/deptuser/page', '部门筛选与分页'], ['POST', '/common/user/deptuser/bind', '{position,leftId:deptId,rightId:userId,tagIds,roleIds,leader}'], ['PUT', '/common/user/deptuser/{relationId}', '{position,leftId,rightId,tagIds,roleIds,leader}'], ['DELETE', '/common/user/deptuser/remove', '[relationId]'], ['POST', '/common/user/deptuser/move', '排序参数结构待验证']],
['排除现有成员且编辑人员不可替换；重复绑定由后端拒绝。', '职位空与100/101位边界，leader=false可以表达非领导。', '回读关系id、用户id和部门id；移除后用户账号仍存在。', '取消移除无DELETE；本人关系移除后的页面和主部门需核对。', '跨部门越权、网络失败、重复与并发绑定核对成员集合和审计。'], 'R024成员弹窗，800px；人员、职位、领导、角色和标签分别维护。');
add('BAS-008', '36-后台系统管理', '维护角色与权限依赖', ['SRC-ROLE-FORM', 'SRC-PERMISSION', 'SRC-ROLE-API'], [
  field('角色名称 name', 'string', '是（客户端）', '""', 'maxlength=50'), field('权限选择', '树叶节点ID数组', '', '', '', 'node-key=id；提交getCheckedNodes(true).map(id).filter(Boolean)'),
], [['新增/修改角色', '角色名非空；roleEdit把loading绑定给详情表单。'], ['全选/取消全选', '改变本地树勾选；保存前不代表服务端授权已变。'], ['权限联动', '选中权限补directDepend；取消会移除同父节点内依赖该权限的勾选。不能推断循环或跨层依赖均已正确处理。']],
['创建/编辑角色名称。', '进入permissionType=2权限树，勾选和依赖联动。', '提交叶节点ID数组并回读；租户permissionType=3使用另一接口。'],
[['POST', '/common/user/role', '{name}'], ['GET', '/common/user/role/{id}', '路径id'], ['PUT', '/common/user/role/{id}', '{name}'], ['DELETE', '/common/user/role/{id}', '路径id'], ['POST', '/common/user/rolepermission/reset/{id}', '叶节点ID数组']],
['空/50/51位名称分别核对客户端规则及后端结果。', '勾选依赖权限，取消被依赖权限，核对本地集合。', '保存和回读叶节点，确认父节点不被误当业务授权。', '取消全选/取消页面不提交；删除已绑定角色保护待后端规则明确后执行。', '普通用户直达、跨租户授权、重复及并发保存应由后端鉴权并审计。'], 'R026列表、R027/R028角色名页、R029权限树。');
add('BAS-009', '36-后台系统管理', '维护租户及成员', ['SRC-TENANT-FORM', 'SRC-TENANT-MEMBER', 'SRC-TENANT-API', 'SRC-PERMISSION'], [
  field('名称 name', 'string', '是（客户端）', '""', 'maxlength=100', '1–100位英文字母、数字、空白或U+4E00–U+9FA5；拒绝纯空白'),
  field('管理员 managerId', '用户ID', '是（客户端）', '""', '', 'obscureAccount搜索；containAdmin=false'),
  field('启用工作区 enabledDop', 'boolean', '', 'true（新增草稿）', '', '', '', 'ENABLED_DOP且DOP_MULTI_SPACE显示；编辑禁用'),
  field('领域 realm', 'textarea/string', '', '""', 'maxlength=500'), field('租户成员 ids', 'ID数组', '绑定时非空（客户端）', '', '', 'containAdmin=false；notInTenant=tenantId'),
], [['保存租户', '成功通知父应用isUpdateTenantList=true后返回。'], ['绑定成员', 'ids映射为leftId=tenantId/rightId=userId对象数组。'], ['移除成员', '确认后DELETE，参数为用户rightId数组；不能描述为删除用户账号。'], ['租户授权', 'permissionType=3提交叶权限id数组，不能套用角色授权接口。']],
['建立租户资料并指定管理员。', '读取租户成员；仅选择符合候选条件的用户。', '绑定/移除后回读成员关系；授权采用租户权限接口。'],
[['POST', '/common/user/tenant', '{name,managerId,realm,enabledDop}'], ['GET', '/common/user/tenant/{id}', '路径id'], ['PUT', '/common/user/tenant/{id}', '租户资料'], ['DELETE', '/common/user/tenant/{id}', '路径id'], ['POST', '/common/user/tenantuser/binds', '[{leftId:tenantId,rightId:userId},...]'], ['DELETE', '/common/user/tenantuser/remove/{tenantId}', '[userRightId]'], ['POST', '/common/user/tenantpermission/reset/{id}', '叶权限ID数组']],
['名称空/100/101位和纯空白边界；管理员缺失阻止提交。', '分别核对启用工作区两个开关及编辑禁用；不把true强加给后端默认。', '多选绑定和移除回读关系集合；原账号仍存在。', '租户保存通知顶栏刷新；取消不发送租户或成员写请求。', '跨租户访问/授权、删除非空租户、并发绑定、网络与重复请求按后端结果验收。'], 'R030/R062系列；名称、管理员、条件开关、领域及独立租户用户列表。');
add('BAS-010', '36-后台系统管理', '本人可管理用户与部门', ['SRC-USER-API', 'SRC-DEPT-API'], [],
[['范围区分', 'myUser、myDept包装器独立于全局user/dept；空列表不证明没有人员，也不证明没有写权限。']],
['进入我的用户/我的部门。', '按本人范围读取；写操作使用相应my接口，不自动回退全局接口。'],
[['POST', '/common/user/myUser/page', '本人范围查询'], ['POST', '/common/user/myDept/tree', '本人部门树查询']],
['同账号比较全局与本人范围，记录服务端对象集合。', '无可管理对象呈空态，不能显示系统错误。', '跨范围id直接请求应拒绝，不能仅隐藏菜单。', '失权/过期会话不能提交；刷新后范围更新。', '核对my写接口、失败及审计；未确定接口参数前不照搬全局写契约。'], 'R031/R032；本人范围与全局管理为不同入口。');
add('BAS-011', '36-后台系统管理', '维护管理标签', ['SRC-TAG-FORM', 'SRC-TAG-API'], [
  field('名称 name', 'string', '是（客户端）', '""', '1–100位', '英文字母、数字、空白或U+4E00–U+9FFF'),
  field('业务编码 bizCode', 'string', '是（客户端）', '""', '1–20位', '^[a-zA-Z0-9]{1,20}$'),
  field('业务类型 bizType', 'string/null', '否（非空才校验）', '""', '非空≤100位', '英文逗号分隔的英文字母、数字、空白或中文段；空提交null'),
], [['新增/修改', '表单初始三个空字符串；bizType空值转null。源码补得表单不等于历史R033已打开该表单。'], ['删除', 'API定义指向taguser；与数据资产标签是不同对象。']],
['进入管理标签维护表单。', '按客户端正则填写；保存时转换可空业务类型。', '调用taguser接口并回读；纯空白名称的服务端行为待验证。'],
[['POST', '/common/user/taguser/page', '查询对象'], ['POST', '/common/user/taguser', '{name,bizCode,bizType}'], ['GET', '/common/user/taguser/{id}', '路径id'], ['PUT', '/common/user/taguser/{id}', '标签资料'], ['DELETE', '/common/user/taguser/{id}', '路径id']],
['编码1/20/21位及非法字符分别检查。', '名称空、100/101位及纯空白记录实际前后端差别。', '业务类型空转null；多个英文逗号段与非法分隔符校验。', '被部门或人员引用时删除保护，规则确认后验收。', '取消、失败、重复、无权与跨租户操作不误更新标签关系。'], '历史只有R033列表截图；新增/修改表单布局来自静态模板，仍需补现场截图。');
add('BAS-012', '36-后台系统管理', '账号和IP解禁', ['SRC-UNLOCK-FORM', 'SRC-UNLOCK-API'], [
  field('账号 account', 'string', '点击账号解禁时非空', '""', '4–20位', '^[a-zA-Z0-9]{4,20}$'),
  field('IP ip', 'string', '点击IP解禁时非空', '""', '', 'isIP校验器'),
], [['两个解禁按钮', '各自validateField(account/ip)，不是必须同时填写两个字段；校验后调用有副作用的DELETE接口，未执行。']],
['选择要解除限制的账号或IP分支。', '只校验该分支字段，调用对应解禁包装器。', '锁定状态回读和解禁影响范围待后端验证。'],
[['DELETE', '/common/auth/recover/account/{account}', '路径账号'], ['DELETE', '/common/auth/recover/ip/{ip}', '路径IP']],
['账号4/20位，3/21位与非法字符分别检查。', '只填账号可走账号分支，IP为空不应阻挡该分支。', '只填合法IP走IP分支；非法IP前端阻止。', '无锁定对象、无权、失败与超时不能伪报已解禁。', '重复解禁与审计、解禁后登录由隔离账号验证；取消不请求。'], 'R034两行字段与独立按钮。');
add('UAC-001', '02-工作台', '维护基本信息和头像', ['SRC-PORTAL-INFO', 'SRC-PORTAL-API'], [
  field('姓名 name', 'string', '是（客户端）', '', 'maxlength=100', '', '', 'disabled=isAdmin'),
  field('邮箱 email', 'string', 'USERINFO_REQUIRE.email', '', 'maxlength=50'), field('手机号 mobilephone', 'string', 'USERINFO_REQUIRE.mobilephone', '', 'maxlength=11'),
  field('头像 file', 'File', '', '', 'size/1024/1024≤0.1；宽高各≤200px', 'accept=image/*；客户端检查'),
], [['打开', '读取本人资料；600px弹窗，头像显示75×75。'], ['选择头像', 'handlePicture→uploadimage立即PUT上传，不等待基本信息确认。客户端拒绝大于0.1MiB或任一维度大于200px；相等未被这些比较拒绝。'],
  ['确认资料', '复制userForm；联系方式未变化删除该键，变化则RSA加密；resolve后刷新本人资料并提示。'], ['取消', '关闭资料弹窗不能撤销已完成的头像上传；未选择头像、未确认资料时关闭与已上传后的关闭分别验收。']],
['读取本人资料并填写允许的字段。', '可选头像独立即时上传，资料确认另走本人信息更新。', '分别核对头像和文本资料，不能把两次写入当作一个原子事务。'],
[['GET', '/common/user/main/self', '读取本人'], ['PUT', '/common/user/main/self', '复制userForm；未改联系方式删键、已改RSA'], ['PUT', '/common/user/main/icon', 'multipart/form-data，FormData字段file']],
['姓名空/100/101位及isAdmin禁用分支；核对前后端规则。', '分别检查联系方式未变删键与已变加密，服务错误不伪报成功。', '头像200px/201px及0.1MiB边界，拒绝时无上传。', '有效选图即有上传；随后取消资料不能错误承诺回滚头像。', '无头像变更时取消无资料PUT；无权、失败、超时和重复上传分别回读。'], 'R004；600px，头像→姓名→邮箱→手机号，底部操作。',
['头像MIME、文件内容检查、存储安全、失败后的旧头像保留和事务边界需后端证据。']);
add('UAC-002', '02-工作台', '修改本人密码', ['SRC-PORTAL-PASSWORD', 'SRC-PORTAL-API'], [
  field('原密码 oldPassword', 'password', '是（客户端）', '""', '模板min=6、maxlength=16', '实际校验取systemConfig'),
  field('新密码 newPassword', 'password', '是（客户端）', '""', '模板min=6、maxlength=16', 'minLen/maxLen/complexStrategy/sequentialLimit'),
  field('确认密码 confirmPassword', 'password', '是（客户端）', '""', '模板min=6、maxlength=16', '与新密码一致', 'locale: app.confirmationInitialPassword'),
], [['focus/blur', 'focus清空相应密码；非空blur走encryptStr。min属性不能证明密码最短长度为6。'], ['提交', 'validate并检查两次密码；获取公钥后forge RSA-OAEP，SHA-256/MGF1 SHA-256，Base64编码。成功Promise分支提示并调用退出流程。']],
['打开500px弹窗，按配置策略输入密码。', '校验并以oldPwd/newPwd请求键提交。', '成功分支调用退出；真正改密与其他会话撤销未验证。'],
[['GET', '/common/user/main/key', '取得公钥；实际响应结构待验证'], ['PUT', '/common/user/main/password', '{oldPwd,newPwd}；值为加密结果']],
['读取实际策略后测试minLen/maxLen及复杂度临界值。', '两次新密码不一致阻止请求；原密码错误由后端拒绝。', '只发送oldPwd/newPwd，不在日志和截图中记录秘密。', '真实成功后重新登录并核对其他会话策略；失败不伪报改密成功。', '取消无改密请求；超时先核实账号状态再重试，避免循环改密/退出。'], 'R005；500px、三项密码顺序及底部操作。', ['客户端maxlength=16与动态maxLen可能冲突，需核对运行配置；不能自行选一个阈值。']);
add('UAC-003', '02-工作台', '设置主部门', ['SRC-PORTAL-DEPT', 'SRC-PORTAL-API'], [
  field('主部门 deptId', '部门ID', '是（change校验）', '', '', '可清空、可搜索；当前id须在候选内才回填'),
], [['打开', '先刷新本人资料，再读取所属部门候选；已有deptId不在候选内则草稿为空。'], ['确认', 'PUT路径含选择的deptId，成功后刷新本人信息；权限和候选归属由服务端规则验证。']],
['读取本人及所属部门。', '选择候选并确认；清空触发非空校验。', '成功回读主部门；跨模块权限是否即时变化仍需验证。'],
[['GET', '/common/user/main/dept/list', '读取候选'], ['PUT', '/common/user/main/dept/main/{deptId}', '路径部门id']],
['候选含当前id回填；不含时为空。', '可搜索/清空，清空不能正常提交。', '合法更换后本人信息及业务上下文回读一致。', '部门移除、失权、并发选择或网络失败不得显示虚假成功。', '取消不PUT；重复保存、重入和审计按真实返回验收。'], 'R007；500px弹窗，一个搜索选择器。');
add('UAC-004', '02-工作台', '进入后台管理', ['SRC-PORTAL-API'], [],
[['鉴权检查', '公开bundle定义isAdmin读取接口；仅有定义不能证明该入口在所有路径都调用，也不能证明服务端授权。']],
['历史已实际导航到/module-common/index。', '后台各对象规则分别见BAS需求；不能由入口存在推断提交权限。'],
[['GET', '/common/user/user/isAdmin', '静态定义，入口调用覆盖仍待验证']],
['有权账号进入真实后台。', '普通账号直接地址访问由服务端拒绝。', '会话失效回到可恢复认证流程。', '不同租户/主部门下菜单和数据范围正确。', '导航失败重试不触发配置或权限写入。'], '历史R008/R009；入口和后台页面分别取证。');
add('UAC-005', '02-工作台', '退出登录', ['SRC-PORTAL-API'], [],
[['退出', '静态定义GET退出接口有副作用；本轮没有请求它，不能当作安全读取接口采样。']],
['点击入口的确认策略尚需运行验证。', '退出接口成功后会话、回跳和多端范围须由运行证据确认。'],
[['GET', '/common/auth/logout', '有副作用，未调用']],
['退出前取消的会话保持有效，确认框是否存在先核对。', '确认退出后回到真实登录路径。', '后退和受保护URL不能继续读取需认证数据。', '失效会话/网络异常明确区分，不伪报退出成功。', '多标签、多终端及重复退出范围按产品策略验收。'], 'R003只有菜单；没有本轮退出结果截图。');
const disFields = [
  field('任务名称 taskName', 'string', '是（客户端）', '""', 'maxlength=100', 'lengthGT(2)；DIS公共实现需核对'),
  field('源类型 srcDatasetType', '枚举string', '是（客户端）', '"1"', '', '本表单库表=1'), field('目标类型 trgDatasetType', '枚举string', '是（客户端）', '""', '', '库表=1，CSV=2'),
  field('最大并发 maxConcurrentNum', '数字字符串', '是（客户端）', '""', '数值1–10', '正整数；正则允许前导零'),
  field('同步速率 dataSyncRate', 'number/数字字符串', '空可通过该校验器', '10', '非空数值1–10', '非空正整数；单位待页面/locale核对'),
  field('脏数据阈值 errorLimitRecord', '数字字符串', '空可通过该校验器', '""', '', '^\\d{0,}$；允许0'),
  field('告警人员 alarmUserData', 'ID数组', '与告警方式成对填写', '[]'), field('告警方式 alarmTypeData', '枚举数组', '与告警人员成对填写', '[]', '', '本源码候选邮件=1'),
  field('说明 taskDesc', 'string', '', '""'), field('部门 deptId', 'ID', '', '""', '', '提交时取输出子组件'), field('映射 disDataDatasetMappingDoList', 'object[]', '', '[]'),
];
const disAPIs = [['POST', '/dis/base/disTask/page', '查询及分页对象'], ['GET', '/dis/base/disTask/findAllInfoById/{id}', '读取完整任务'],
  ['POST', '/dis/base/disTask/add', '主草稿+disDataTaskAlarmDo+disDataDatasetMappingDoList'], ['PUT', '/dis/base/disTask/update/{id}', '同表单映射，id来自目标任务'],
  ['DELETE', '/dis/base/disTask/remove/{id}', '删除任务'], ['PUT', '/dis/base/disTask/startTask/{id}', '启动任务'], ['PUT', '/dis/base/disTask/stopTask/{id}', '停止任务'], ['POST', '/dis/base/disTask/addSchedule', '调度参数结构待验证']];
for (const id of ['DIS-100', 'DIS-102', 'DIS-103', 'DIS-513', 'DIS-519']) {
  add(id, '08-数据集成采集', '表离线同步配置和任务操作', ['SRC-DIS-FORM', 'SRC-DIS-MAPPING', 'SRC-DIS-LIST', 'SRC-DIS-API'], disFields,
    [['提交', 'submitLoading=true；依次校验主表单、输入子组件、输出子组件；任一失败清loading。真实按钮禁用与可重复提交仍需运行验证。'],
      ['权限结果', '返回truthy时还检查permission===1/2，分别显示源/目标权限缺失表；不能只凭HTTP成功展示配置成功。'],
      ['任务控制', 'startTask/stopTask/remove有写副作用，仅登记定义，未执行。列表轮询不证明启动任务由页面导航触发。']],
    ['读取任务或初始化本表单。', '输入库表及输出库表/CSV，分别校验。', '告警人员/方式数组join逗号写入嵌套对象。', '映射数组按目标类型生成dbIn+dbOut或csvOut以及字段映射；deptId取输出子组件。', '调用新增/更新；区分权限提示分支、真正成功及网络失败，之后回读。'], disAPIs,
    ['最大并发空、0、1、10、11、负数和小数分别核对；速率空及同边界单独测试，单位先确认。',
      '告警只选人员/只选方式应失败；两者都空或成对时按后端规则验收。',
      '库表与CSV分支核对dbIn/dbOut/csvOut和字段映射；保留实际键columnSpilt与firstLineSkip=2。',
      '源/目标权限不足按permission分支显示；500、超时、失权及重复提交不能假成功。',
      '取消不保存；启动、停止、删除及调度仅在隔离任务执行，回读任务/运行记录和审计；不得重放现网任务。'],
    '本补充仅覆盖dataAcquisition表离线表单。历史截图引用沿用原需求；上方任务信息、中间输入输出与字段映射、底部提交；CSV分支是条件界面。',
    ['不把本规则复制到库离线、文件、API或KAFKA表单。', 'dbIn键：dataSourceId,schemaName,tabName,srcIntegratedType,srcIncrementCol,srcSrcSql,srcPartitionCol；dbOut键：dataSourceId,schemaName,tabName,preSql,postSql,tabDesc。',
      'csvOut键：fileSourceId,fileUrl,fileName,columnSpilt,characterSet,nullFormat,firstLineSkip；实际firstLineSkip=2的业务含义待后端确认。']);
}
const smsFields = [
  field('策略 strategy', 'number枚举', '', 'null', '', '1定时、2事件、3单次'), field('有效范围 timeRangeArr', 'array', '定时分支非空校验', '[]', '', 'yyyy-MM-ddTHH:mm:ss'),
  field('Cron cronExp', 'string', '定时分支非空校验', '""'), field('事件类型 eventType', '枚举', '事件分支非空校验', 'null'), field('上游流程 upFlow.dependId', 'ID', '上游事件分支非空校验', 'null'),
  field('访问令牌 api.accessToken', '秘密string', '接口事件分支非空校验', '""'), field('接口密钥 api.apiSecret', '秘密string', '接口事件分支非空校验', '""'),
  field('限制类型 api.limitType', 'number枚举', '', '0'), field('限制分钟 api.limitMinute', 'number', '', '0'), field('依赖 dependsOn', 'ID数组', '', '[]'), field('被依赖类型 beDependType', 'number', '', '0'),
];
for (const id of ['SMS-105', 'SMS-527']) {
  add(id, '09-任务编排与调度', '流程调度、策略保存及执行', ['SRC-SMS-LIST', 'SRC-SMS-SETTING', 'SRC-SMS-API'], smsFields,
    [['列表批量操作', '未选流程提示pleaseSelectProcess；启动/停止/执行传id数组；结果对话框并刷新列表。批量配置含status=4时阻止导航。'],
      ['切换策略/事件', '清除对应时间、依赖、事件或接口分支旧值；需测试保存失败前后的草稿。'],
      ['保存并运行', 'submitAndRun有warn确认；确认后先保存策略，再按strategy=3执行，其他策略启动，属于两次请求。'],
      ['令牌生成', '源码用Math.random生成32字符草稿；没有运行生成或保存。本事实不构成安全认可。']],
    ['选择单个/多个流程并进入scheduleSetting。', '按定时/事件/单次策略填写；源码事件校验按errors对象及分支判断，必须实测各缺项组合。',
      '单项保存策略；批量保存增加parseInt转换后的ids。', '若保存并运行，保存resolve后再调用start/exec；第二步失败不能承诺已回滚第一步。', '展示逐项结果并回读策略、任务及运行实例；不能把返回结果弹窗当所有流程成功。'],
    [['POST', '/schedule/common/flowdefinition/page', '筛选分页对象'], ['PUT', '/schedule/common/flowdefinition/strategy/{id}', '完整策略草稿'], ['PUT', '/schedule/common/flowdefinition/strategys', '策略草稿+整数ids'],
      ['PUT', '/schedule/common/flowdefinition/starts', 'id数组'], ['PUT', '/schedule/common/flowdefinition/stops', 'id数组'], ['PUT', '/schedule/common/flowdefinition/execs', 'id数组']],
    ['未选项不请求；批量含status=4时不进入配置，单项状态限制另测。', '定时范围/Cron、上游事件、接口事件逐个缺项和混合错误校验，覆盖源码errors分支。',
      '取消保存并运行确认不发保存/运行；确认后顺序为保存成功→start或exec。', '保存成功但运行失败时分别回读策略与运行状态，不伪报全部成功或自动回滚。',
      '批量部分失败、字符串/整数id差异、无权、超时、并发及重复执行检查运行实例与审计；不记录令牌值。'],
    '列表及独立/sms/schedule/manage/scheduleSetting；按三策略显示条件表单，结果弹窗宽600px。',
    ['客户端flowStatus=1开发/2发布/3已配置/4运行/5暂停/6停止；configStatus=0未配置/1已配置/2暂停，不代替服务端状态机。',
      '批量保存ids转换整数，随后运行调用split字符串数组，类型差异待服务端契约确认。', '令牌随机源、重放保护、访问签名及安全存储需产品和后端评审。']);
}

const sourceSelections = [
  ['SRC-USER-FORM', 'views-manage-user-userEdit.dd9b1d2c.js', ['audaqueFormInfoMixin:{', 'audaqueFormBeforeHandleMixin:function', 'maxlength:20', 'privacyStatementUrl', 'encryptStr:function']],
  ['SRC-USER-API', 'api-manage-user.0761d4a0.js', ['var ', '/user/page', '/myUser/']],
  ['SRC-USER-LIST', 'views-manage-user-userList.0ccfd9d3.js', ['RESET_PASSWORD_SHOULD_INPUT_PASSWORD', 'effectExpired', 'default-time']],
  ['SRC-USER-ROLE', 'views-manage-user-userEditRole.06cad8df.js', ['bindRoleList', 'pageSize:500']],
  ['SRC-SHARED', 'module-common-chunk-@audaque_vue-utils.5c2b645c.js', ['audaqueGoBackMixin:function', 'audaqueSubmitMixin:function', 'notContainChinese:function']],
  ['SRC-DEPT-API', 'api-manage-department.25604b52.js', ['/dept/tree', '/deptuser/bind', '/myDept/tree']],
  ['SRC-DEPT-FORM', 'views-manage-department-departmentList.6341c861.js', ['code:[', 'width:"800px"', 'pid:']],
  ['SRC-DEPT-MEMBER', 'views-manage-department-departmentList.6341c861.js', ['b={id:"",position:', 'departmentBindUserList)({', 'deleteItem:function']],
  ['SRC-ROLE-FORM', 'views-manage-role-roleEdit.02feec2c.js', ['audaqueFormInfoMixin:', 'maxlength:50']],
  ['SRC-ROLE-API', 'api-manage-role.7ddd3da8.js', ['/role/page']],
  ['SRC-PERMISSION', 'views-manage-permission-permissionMenu.6056dfc4.js', ['directDepend', 'getCheckedNodes', 'permissionType']],
  ['SRC-TENANT-FORM', 'views-manage-tenant-tenantEdit.e25a6445.js', ['audaqueFormInfoMixin:', 'containAdmin', 'maxlength:500']],
  ['SRC-TENANT-MEMBER', 'views-manage-tenant-userList.f7d602eb.js', ['notInTenant', 'leftId:', 'rightId']],
  ['SRC-TENANT-API', 'api-manage-tenant.021f7e0d.js', ['/tenant/page', '/tenantuser/binds', '/tenantpermission/reset/']],
  ['SRC-TAG-FORM', 'views-manage-tag-tagEdit.1cdf8df4.js', ['audaqueFormInfoMixin:', 'audaqueFormBeforeHandleMixin']],
  ['SRC-TAG-API', 'api-manage-tag.05afa7b7.js', ['/taguser/page']],
  ['SRC-UNLOCK-FORM', 'views-manage-security-unlimit.2de1b724.js', ['account:', 'validateField']],
  ['SRC-UNLOCK-API', 'api-manage-security.e038784d.js', ['/recover/ip/']],
  ['SRC-PORTAL-API', 'app.7ec981a3.js', ['function os(', '/main/self', '/main/dept/list', 'ps+"/logout"']],
  ['SRC-PORTAL-INFO', 'app.7ec981a3.js', ['updateUserInfo:function', 'handlePicture:function', 'uploadimage:function']],
  ['SRC-PORTAL-PASSWORD', 'app.7ec981a3.js', ['oldPassword:""', 'function is(', 'encryptStr:function']],
  ['SRC-PORTAL-DEPT', 'app.7ec981a3.js', ['changeDepartment:function', '/main/dept/main/']],
  ['SRC-DIS-API', 'dis-api-taskManagement-dataAcquisition.2db4b912.js', ['/disTask/page', '/disTask/startTask/']],
  ['SRC-DIS-FORM', 'dis-views-taskManagement-dataAcquisition-edit.6bfb4354.js', ['audaqueFormInfoMixin:{', 'submit:function', 'maxlength:100']],
  ['SRC-DIS-MAPPING', 'dis-views-taskManagement-dataAcquisition-edit.6bfb4354.js', ['getParams:function']],
  ['SRC-DIS-LIST', 'dis-views-taskManagement-dataAcquisition-list.27402d6a.js', ['taskStatus', 'setInterval']],
  ['SRC-SMS-API', 'sms-api-modules-schedule-manage-scheduleList.1f35a70d.js', ['/flowdefinition/', '/starts', '/strategy/']],
  ['SRC-SMS-LIST', 'sms-views-schedule-manage-scheduleList.ea7c346d.js', ['pleaseSelectProcess', 'status', 'flowStatus']],
  ['SRC-SMS-SETTING', 'sms-views-schedule-manage-scheduleSetting.6532bd7f.js', ['audaqueFormInfoMixin:{', 'submit:function', 'changeStrategy:function', 'makeRandomString:function']],
];

function esc(value) { return String(value ?? '').replace(/\|/g, '&#124;').replace(/\r?\n/g, ' '); }
function renderReviewedSpec(spec, acceptanceStart = 1, originalSources = '') {
  const id = spec.id;
  const evidence = `../evidence/${REVIEW}/README.md`;
  const rows = spec.fields.length ? spec.fields.map(f => `| ${f.map(esc).join(' | ')} |`) : ['| | | | | | | | |'];
  return [
    `<!-- 完整规格:${id} -->`, '', `#### 1. 页面字段清单（${id}）`, '',
    `【页面观察，来源：前端源码】以下是${spec.title}的客户端定义；运行时配置、后端校验与业务结果分别验证。来源：${spec.sources.join('、')}，见[源码证据索引](${evidence})。`, '',
    '| 字段名称 | 类型 | 是否必填 | 默认值 | 长度/范围限制 | 格式规则 | 错误提示 | 页面状态 |', '|---|---|---|---|---|---|---|---|', ...rows, '',
    '字段清单空白单元格表示现有页面证据未提供该值，不代表产品没有限制；不得把空白实现为无校验。源码明确的初始草稿不等于服务端默认值。locale键只证明代码选用的消息键，不是已观察到的最终错误文案。', '',
    `#### 2. 页面交互规则（${id}）`, '', '| 控件/按钮 | 交互行为与状态 |', '|---|---|',
    ...spec.interactions.map(([name, text]) => `| ${esc(name)} | 【页面观察，来源：前端源码】${esc(text)} |`), '',
    `#### 3. 业务流程与异常分支（${id}）`, '', ...spec.flow.map((text, i) => `${i + 1}. 【页面观察，来源：前端源码】${text}`), '',
    '【拟定需求】服务端校验拒绝、重复对象、失权、网络异常与响应结构不合法分别提示。超时结果未知时先回读；不得盲目重放写请求。安全保留草稿、恢复与重复保护的实际行为待运行验证。', '',
    `#### 4. 接口与数据规则（${id}）`, '',
    '【页面观察，来源：前端源码】下表为API包装器定义的方法与相对路径，尚未取得本轮Network或后端响应。服务路径可受模块配置覆盖；配置中的API_BASE_URL还可能加网关前缀，不将这些路径冒充实际请求URL。', '',
    '| HTTP方法 | 服务相对路径 | 调用处参数/转换 |', '|---|---|---|',
    ...spec.apis.map(row => `| ${row.map(esc).join(' | ')} |`), '',
    '【待确认】实际请求序列化、完整DTO、成功响应及业务码、失败响应结构、幂等协议、服务端校验与权限。Promise resolve只证明客户端成功分支写法，不能证明业务操作已成功。', '',
    `#### 5. 验收标准（${id}）`, '', '| 验收编号 | 可执行检查项 | 关联需求 | 状态 |', '|---|---|---|---|',
    ...spec.checks.map((text, i) => `| ${id.split('-')[0]}-AC-${String(acceptanceStart + i).padStart(3, '0')} | ${esc(text)} | ${id} | 【拟定，未执行】 |`), '',
    `#### 6. 权限与安全要求（${id}）`, '',
    '- 【待确认】允许访问本页面及执行该操作的角色、部门、租户和数据范围；服务端权限、密码安全存储与操作审计没有本轮后端证据。',
    '- 【拟定需求】以对象ID、关系ID及租户/部门范围在服务端重新鉴权，拒绝伪造参数；密码与凭证不得写日志或回显。客户端RSA不能替代受保护传输，也不能证明服务端使用了安全密码哈希。', '',
    `#### 7. 页面布局与状态（${id}）`, '', `【页面观察，来源：历史截图与前端模板】${spec.layout}`, '',
    originalSources ? `历史页面材料：${originalSources}` : '历史完整截图与页面元素见本模块原需求来源；本轮源码调查没有生成新的页面截图。', '',
    '【拟定需求】对加载、空态、失败、长文本、200%缩放和窄屏分别验收，弹窗内容可滚动且键盘可达；实际响应式断点、焦点、按钮禁用与恢复行为待运行确认。', '',
    `#### 8. 证据与待确认项（${id}）`, '',
    `- 源码证据：${spec.sources.join('、')}；[原文片段、资源SHA及时间](${evidence})。`,
    ...spec.pending.map(text => `- 【待确认】${text}`),
    '- 本轮只读取公开静态文件并离线分析，没有执行下载的脚本，没有调用业务写接口；全部应用业务验收仍为【拟定，未执行】。', '',
  ].join('\n');
}

module.exports = { REVIEW, specs, sourceSelections, renderReviewedSpec };
