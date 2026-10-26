/* Evidence-bounded datasource specification. No application requests are made here. */
const fs=require('node:fs');
const path=require('node:path');
const MAIN=[
  ['100','查询API数据源','apiList',539,['F029-DS-api-delete-cancel','F021-DS-api-query','F022-DS-api-reset']],
  ['102','新增API数据源','apiAdd',544,['F023-DS-api-add','F024-DS-api-add-cancel']],
  ['103','修改API数据源','apiEdit',549,['F025-DS-api-edit','F026-DS-api-edit-cancel']],
  ['104','删除API数据源','apiDelete',554,['F028-DS-api-delete','F027-DS-api-delete-guard','F029-DS-api-delete-cancel']],
  ['105','查询Kafka数据源','kafkaList',559,['F039-DS-kafka-delete-cancel','F031-DS-kafka-query','F032-DS-kafka-reset']],
  ['107','新增Kafka数据源','kafkaAdd',564,['F033-DS-kafka-add','F034-DS-kafka-add-cancel']],
  ['108','修改Kafka数据源','kafkaEdit',569,['F035-DS-kafka-edit','F036-DS-kafka-edit-cancel']],
  ['109','删除Kafka数据源','kafkaDelete',574,['F038-DS-kafka-delete','F037-DS-kafka-delete-guard','F039-DS-kafka-delete-cancel']],
  ['110','查询部门数据源','deptList',579,['F042-DS-department-reset','F041-DS-department-query']],
  ['112','新增部门数据源','deptAdd',584,['F043-DS-department-add']],
  ['115','查询数据源列表','available',589,['F047-DS-sources-reset','F046-DS-sources-query']],
  ['120','查询驱动','driverList',594,['F001-datasource-entry']],
  ['122','新增驱动','driverAdd',599,['F003-driver-add-elements']],
  ['125','查询数据源','sourceList',604,['F009-source-reset','F006-source-query','F005-source-edit','F011-source-driver-options']],
  ['127','新增数据源','sourceAdd',609,['F010-source-add-before-driver','F005-source-edit','F011-source-driver-options']],
  ['128','修改数据源','sourceEdit',614,['F005-source-edit','F011-source-driver-options']],
  ['129','删除数据源','sourceDelete',619,['F008-source-delete-elements','F007-source-delete-confirm','F005-source-edit','F011-source-driver-options']],
].map(([id,title,kind,start,sources])=>({id:'DS-'+id,title,kind,start,sources}));
const SUB=[
  ['500','数据源管理 → 驱动管理','driverList',624,['H-DS-001']],
  ['501','数据源管理 → 数据源管理','sourceList',629,['Z-DS-002']],
  ['505','数据源管理 → 新增','sourceAdd',634,['H-DS-002-op1']],
  ['506','数据源管理 → 编辑','sourceEdit',639,['H-DS-002-op2','H-DS-002-op2-options1','H-DS-002-op2-options2','H-DS-002-op2-options3','H-DS-002-op2-options4','H-DS-002-op2-options5']],
  ['502','数据源管理 → 部门数据源','deptList',644,['H-DS-003']],
  ['507','部门数据源 → 新增','deptAdd',649,['H-DS-003-op1']],
  ['503','数据源管理 → 数据源列表','available',654,['H-DS-004']],
  ['504','API数据源','apiList',659,['H-DS-005']],
  ['508','API数据源 → 新增','apiAdd',664,['H-DS-005-op1','H-DS-005-op1-options0','H-DS-005-op1-options1']],
  ['509','API数据源 → 编辑','apiEdit',669,['H-DS-005-op2','H-DS-005-op2-options1']],
  ['510','kafka数据源','kafkaList',674,['H-DS-006']],
  ['511','kafka数据源 → 新增','kafkaAdd',679,['H-DS-006-op1','H-DS-006-op1-options0']],
  ['512','kafka数据源 → 编辑','kafkaEdit',684,['H-DS-006-op2']],
].map(([id,title,kind,start,sources])=>({id:'DS-'+id,title,kind,start,sources}));
const D='/back/common/datasource',C='/back/common/collectionconfig';
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','|'+heads.map(()=>'---').join('|')+'|',...rows.map(r=>'| '+r.map(v=>String(v??'').replaceAll('|','&#124;').replaceAll('\n','<br>')).join(' | ')+' |'),''];
const field=(name,type,required='',value='',limit='',rule='',error='',state='')=>[name,type,required,value,limit,rule,error,state];
const ro=(name,type='只读文本',rule='',state='返回资料')=>field(name,type,'','','',rule,'',state);
const pageFields=[field('当前页 pageRequest.pageNo','integer','是','1','正整数','查询、重置、改变页大小回第1页','','列表请求'),field('每页条数 pageRequest.pageSize','integer','是','20','正整数','分页选择值；不以样本总数作上限','','列表请求'),field('排序 pageRequest.order','array<object>','是','[{prop:"id",asc:false}]','','prop为字段键，asc为boolean；允许字段由服务契约限制','','列表请求')];
const queryFields=(name='数据源名称',driver=false)=>[field(name+' obscureName','可清空文本','否','','','trim首尾空白；匹配语义由服务契约规定','','筛选'),...(driver?[field('是否初始化数据 inside','可清空单选 number','否','','0、1','1是、0否；0不能被当作未选择','','筛选')]:name==='数据源名称'?[field('是否启用 enabled','可清空单选 boolean','否','','true、false','是/否；false是有效筛选值','','筛选')]:[]),...pageFields];
const sourceColumns=[ro('序号','计算展示','pageSize×(pageNo−1)+行索引+1'),ro('数据源名称 name'),ro('所属部门 deptName'),ro('可见范围 accessLevel','number→文案','1私有、2公开、3自定义'),ro('是否启用 enabled','boolean→文案','true是、false否'),ro('应用场景 useSceneDisplay'),ro('备注 remark'),ro('创建时间 createTime','日期时间','统一格式展示；时区按服务契约'),ro('数据源 id','稳定标识','用于详情/维护/测试；不可用名称或driverId替代')];
const sourceFields=(edit=false,dept=false)=>[
  field('数据源名称 name','文本输入','是',edit?'当前记录':'空字符串','100字符','trim；blur非空','请输入数据源名称'),
  field('驱动 driverIds','搜索多选 array<ID>','是',edit?'当前记录':'[]','最多5个','driver/list候选id为值、name为显示；顺序对应驱动页签','请选择驱动',edit?'禁用':'新增可选'),
  field('所属部门 deptId','部门树单选 ID','是',edit?'当前记录':'空字符串','','按id绑定，不传显示name；'+(dept?'本人的部门候选由main/dept/list读取':'管理侧从dept/tree读取'),'请选择所属部门'),
  field('是否数仓 dataWareHouse','单选 boolean或空','否',edit?'当前记录':'空字符串','','true是、false否；不能将false转为空'),
  field('状态 enabled','单选 boolean','是',edit?'当前记录':'true','','true启用、false停用','请选择状态'),
  field('可见范围 accessLevel','单选 number','是',edit?'当前记录':'空字符串','1、2、3','私有、公开、自定义；由服务端核最终可见范围','请选择可见范围'),
  field('可见部门 accessDepts','部门树多选 array<ID>','条件必填',edit?'当前记录':'','','accessLevel=3才展示；树候选dept/tree，扁平多选、按层级排序；其他范围不作为授权依据','请选择可见部门','自定义范围'),
  field('应用场景 useScene','可搜索单选 字典值','否',edit?'当前记录':'空字符串','','sourceUseScene字典value为值、display为显示；旧记录缺候选时保留其useSceneDisplay'),
  field('使用场景 useEnv','单选 number','是',edit?'当前记录':'空字符串','0、1','0测试运行、1正式运行；0是有效值','请输入使用场景'),
  field('描述 remark','多行文本','否',edit?'当前记录':'','500字符','trim首尾空白'),
  ro('驱动类型 driver.typeName / 支持测试 supportConn / 模板 testConnMode','禁用文本及单选','supportConn:1支持/0不支持；testConnMode:1内置/0自定义','每个驱动页签'),
  ro('内置连接器 driver.testConnInfo','禁用单选','按type匹配name','testConnMode=1'),
  ro('驱动文件 driver.driverFile / 静态参数 driver.staticProperties','禁用文件列表/键值表','文件预览按授权下载；不是连接级可上传控件','驱动有值时'),
  field('动态参数 dynamicProperties[].key/type/required/defaultValue/defaultValues','按驱动生成的控件','由required定义','由驱动定义','','每个字段的标签、类型、候选、值、格式、布局均按已选驱动模板实例化，不增设通用主机/端口/账号字段','{字段名称}不能为空','driverDataInfoList对应驱动'),
  field('动态密码 type=password','遮蔽输入/加密string','由驱动定义','','','新值使用datasource/micro/key公钥RSA-OAEP SHA-256/MGF1 SHA-256后Base64；保留标记********不再加密；空值与不修改严格区分','','按模板条件出现'),
  field('动态文件 type=file','即时上传','由驱动定义','由驱动定义','每文件≤20 MiB；单文件1个或多文件5个','格式取字段format；上传form-data={file,fieldName,driverId}；先上传后保存','','按模板条件出现'),
  ro('记录 id / driverDataInfoList[].id','稳定标识','编辑保留连接及每个驱动配置的原ID；新增不伪造服务端标识'),
];
const apiFields=(edit=false)=>[
  field('数据源名称 dataSourceId','单选 ID','是',edit?'当前记录':'空字符串','','apiDataSource/list返回dataSourceId/dataSourceName；编辑禁用','请选择数据源名称'),
  field('API名称 name','文本输入','是',edit?'当前记录':'空字符串','200字符','blur非空；不据此承诺名称唯一','请输入API名称'),
  field('URL地址 url','文本输入','是',edit?'当前记录':'空字符串','500字符','blur非空及URL校验；此值属于连接配置，不是应用接口路径','请输入URL地址；请输入正确的URL地址'),
  field('Method method','单选 string','是',edit?'当前记录':'空字符串','GET、POST、PUT、DELETE','配置远端调用方式；不在本表单执行远端请求','请选择method'),
  field('请求头 headerParam / PATH pathParam / 请求参数 requestParam.params','array<object>','否',edit?'当前记录':'[]','每组最多300行','三组隔离；新增/删除只改当前表单草稿；各行paramKey及paramType必填','请求头/PATH/请求参数有参数名、类型未填写'),
  field('参数名 *.paramKey','文本输入','行内必填','空字符串','250字符','作为参数键；同组重名策略由交付契约约束，不能自动改名'),
  field('是否必填 *.paramNotNull','checkbox boolean','否','false','','这是被描述API的参数定义，不等于本页提交必填'),
  field('是否加密 *.secureKey','checkbox boolean','否','false','','选中时示例输入遮蔽；提交前以apiConfig/key公钥加密新非空值；取消加密时先清除旧保留标记'),
  field('类型 *.paramType','单选 string','行内必填','空字符串','string、number、boolean、object、array','参数元数据类型；示例仍以输入string提交，不自行JSON解析'),
  field('示例 *.paramValue','text/password','否','空字符串','150字符','新安全值先转UTF-8字节，再RSA-OAEP SHA-256/MGF1 SHA-256加密，最后Base64；********表示保留原值；不存入持久草稿'),
  field('参数说明 *.paramName','文本输入','否','空字符串','200字符','说明与paramKey分别保存'),
  field('是否开启分页 requestParam.paging','单选 boolean','否','false','','true展示两个分页参数选择器；关闭分页保留草稿但执行端不启用'),
  field('分页参数名 requestParam.pageName','搜索单选 string','条件必填','空字符串','','从当前requestParam.params的paramKey选择；删除或改名导致失效时清空','请选择分页参数名','paging=true'),
  field('分页取值范围参数名 requestParam.pageLimitName','搜索单选 string','条件必填','空字符串','','同上，绑定真实参数键','请选择分页取值范围参数名','paging=true'),
  field('返回体 responseParam','array<object>','否',edit?'当前记录':'[]','最多300行','每行参数名、类型必填；不是远端API返回实测样本','返回体有参数名、类型未填写'),
  field('返回参数名 responseParam[].paramKey / 类型 paramType','文本/单选','行内必填','空字符串','名称250字符；类型同5项枚举','两个控件分别绑定，不用行序号作标识'),
  field('是否主键 responseParam[].primaryKey','checkbox boolean','否','false','','仅元数据；是否可多主键按契约，不推出数据库约束'),
  field('长度 responseParam[].paramLength','number','否','255','min=1；step=1','控件没有max属性；不把输入框字符长度当数据库长度'),
  ro('API配置 id / 参数 order及非显示元数据','稳定ID/number','编辑id来自当前行；新增行order=0，通用行还含paramLength=255及primaryKey=false；不猜后端排序'),
];
const TYPES='LONG、BLOB、BOOLEAN、STRING、DATE、BIGDECIMAL、DOUBLE、ARRAY、FLOAT、INTEGER、CLOB、SHORT、TIMESTAMP、BYTE、BINARYSTREAM、MAP、BYTE[]';
const kafkaFields=(edit=false)=>[
  field('数据源名称 dataSourceId','单选 ID','是',edit?'当前记录':'空字符串','','kafkaDataSource/list候选dataSourceId为值，dataSourceName显示；编辑禁用','请选择数据源名称'),
  field('Topic配置 kafkaConfigInfoList','array<object>','是',edit?'当前记录':'[]','至少1条','本地配置集合；不是远端Topic创建清单','请配置topic信息'),
  field('手动Topic topicName','弹窗文本 string','是','空字符串','整框≤255字符；每名称3～255字符','英文逗号拆分，每段^[-_.0-9a-zA-Z]{3,255}$；支持点号；同批及已有草稿不重名','请输入topic名称；Topic名称支持输入字母、数字、中横杠、下划线，长度3-255位','手动添加800px弹窗'),
  field('Topic名称 kafkaConfigInfoList[].topicName','只读文本','是','','','配置字段弹窗中禁用；行删除只移除本地配置'),
  field('主体数据 *.mainBody','文本输入','否','空字符串','25字符','保持用户输入；不据名称推出消息解析算法'),
  field('数据库类型 *.sourceType','单选 string','是','mysql','mysql','当前唯一选项mysql','请选择'),
  field('Key序列化/反序列化类型 *.serialization','单选 string','是','手动为空；自动获取STRING',TYPES,'大小写保留原枚举','请选择'),
  field('Value序列化/反序列化类型 *.deserialization','单选 string','是','手动为空；自动获取STRING',TYPES,'与serialization分别绑定','请选择'),
  field('字段清单 *.columnList','array<object>','否','手动/自动获取为空数组','','配置弹窗新增行；空数组不与必填Topic混淆；同一Topic字段名唯一'),
  field('字段名称 *.columnList[].columnName','文本输入','行内必填','空字符串','1～255字符','^[_a-zA-Z][_0-9a-zA-Z]{0,254}$；同Topic不得重复','序号:{行号}，字段名称可以包含字母、数字、下划线，必须字母或下划线开头，长度1-255位'),
  field('字段类型 *.columnList[].columnType','单选 string','行内必填','空字符串',TYPES,'使用选项原值','序号:{行号}，字段类型没有选择'),
  field('是否主键 *.columnList[].primaryKey','checkbox boolean','否','false','','仅配置标记，不能推导远端数据库主键'),
  field('长度 *.columnList[].columnLength','number','否','255','1～2147483647；step=1','输入数值；单位与执行端映射按协议'),
  ro('Topic dataSourceId / 字段remark','隐藏元数据','模板dataSourceId=0、remark为空字符串；提交透传模型但实际所属以外层dataSourceId绑定，须服务端拒绝不一致'),
  field('Topic页 page.pageNo / page.pageSize','本地integer','是','1 / 20','正整数','在完整kafkaConfigInfoList上slice；翻页不发服务端列表请求；行索引必须换算全局索引'),
];
const driverFields=[
  field('驱动名称 basicForm.name','文本输入','是','空字符串','50字符','trim，blur非空','请输入驱动名称'),
  field('驱动类型 basicForm.type','搜索单选 字典值','是','空字符串','','driverType字典value为值、display为显示；改变类型读取连接器','请输入驱动类型'),
  field('是否支持测试连接 supportConn','radio number','是','1','1、0','支持/不支持；不因支持而自动测试','请选择是否支持测试连接'),
  field('模板类型 testConnMode','radio number','是','1','1、0','1内置、0自定义；编辑锁定模板类型','请选择模板类型'),
  field('内置连接器 testConnInfo','搜索单选 string','条件必填','空字符串','','按type匹配name；改变时重建必要动态与静态项','请选择内置连接器','testConnMode=1'),
  field('上传驱动文件 driverFile','即时上传 array<{url,name}>','否','[]','1个.jar；≤20 MiB','form-data键file；选择文件后立即上传，列表移除不证明远端文件已删除','只能上传1个文件，请先删除再上传'),
  field('静态参数 staticProperties[].key/value','键值列表','条件必填','[]','','每行key/value非空，内置模式包含连接器全部requiredStaticProperties键；选项由连接器定义','“第{行号}行-键/值”不能为空；缺少内部连接器要求的静态参数项'),
  field('动态表单项 dynamicProperties','可拖拽array<object>','由连接器定义','[]','','保留顺序；input单/多行、number、password、select四种、file、row，共10种组件；row仅布局'),
  field('字段类型 type / 宽度 parentComponent','只读类型/radio string','是','按组件 / 24','12、24','12半行、24整行；两个半行合行，可用row强制换行'),
  field('字段名称 name','文本输入','是','组件名称占位','40字符','trim；保存时不得为空或“未命名”'),
  field('唯一标识 key','文本输入','是','空字符串','2～40字符','^[a-zA-Z_]\\w+$；同模板非row项唯一；allowModify=false时禁改','唯一标识没有填写或不正确；动态表单项唯一标识重复'),
  field('是否必填 required / 是否允许修改 allowModify','boolean/服务元数据','是','true / true','','必填radio可修改性受allowModify控制；连接器必需项的type/key/required须精确匹配'),
  field('选项 items[].id/name','键值列表','条件适用','[]','','四种select组件适用；id、name各自不可重复；默认值必须存在于选项'),
  field('默认值 defaultValue/defaultValues','文本/number/单多选','否','按组件定义','文本200字符；数字编辑器1～9007199254740991','单值或数组按类型；数字组件初始1；密码与文件不提供默认值编辑器；删除选项同步清无效默认'),
  field('是否敏感 sensitiveField','radio boolean','否','false','','仅单行input显示；控制show-password，不能代替type=password提交加密'),
  field('文件格式 format / 是否多选 multiSelect','文本/radio boolean','否','按组件定义','format50字符','file适用；format为扩展名约束，多文件最多5个；数字min/max/precision保留模板定义，不自行补默认限制'),
];
const driverCandidate=['驱动候选','POST',D+'/driver/list','无页面业务参数','返回驱动id、name、typeName、supportConn、testConnMode、testConnInfo、driverFile、staticProperties、dynamicProperties'];
const deptTree=['组织树','POST','/back/common/user/dept/tree','无页面业务参数','按id/name/children树形消费；映射label=name，叶节点移除空children'];
const myDept=['本人部门','GET','/back/common/user/main/dept/list','无页面业务参数','用于部门新增/编辑的所属部门候选；不替代可见部门树'];
const sceneReq=['应用场景字典','GET','/back/common/dict/dictitem/category/sourceUseScene','无query业务参数','value/display候选；编辑回显兼容失效字典值'];
const keyReq=['连接密码公钥','GET',D+'/datasource/micro/key','无query业务参数','返回公钥文本；验证可解析及可加密后才允许提交新密码'];
const connectors=['内置连接器','GET',D+'/driver/connector','无query业务参数','type/name用于只读驱动信息，完整模板由driver/list/详情提供'];
const sourceBody='body {accessLevel,name,enabled,deptId,driverIds,useScene,useEnv,dataWareHouse,remark?,accessDepts?,driverDataInfoList:[{driverId,id,propertiesConfig:[{key,value,values}]}]}；编辑保留原ID，去除_$_前缀的临时字段；不臆造幂等/版本参数';
const apiBody='body {dataSourceId,name,url,method,headerParam,requestParam:{paging,pageName,pageLimitName,params},pathParam,responseParam}；行字段paramKey/paramName/paramType/paramValue/paramNotNull/order/paramLength/primaryKey/secureKey按各组保存；编辑保留服务端元数据';
const kafkaBody='body {dataSourceId,kafkaConfigInfoList:[{dataSourceId,topicName,mainBody,sourceType,serialization,deserialization,columnList:[{columnName,columnType,primaryKey,columnLength,remark}]}]}；当前调用直接传模型，编辑保留返回字段；拒绝跨来源子项';
const sourceLayout=[
  '保留顶部全局导航和左侧模块菜单，右侧页头左为新增/编辑/查看标题、右为返回；白色卡片上方先一行两列“数据源名称、驱动”，随后整行“所属部门、是否数仓”，再两列“状态、可见范围”和“应用场景、使用场景”，描述占整行。自定义范围时在范围之后插入整行可见部门。',
  '有驱动后，描述下方显示“驱动数据信息”及提示条、按选中顺序排列的卡片页签。每页签先驱动类型整行，再支持测试/模板两列、内置连接器、文件/静态参数及动态控件；动态宽度按12/24列排布。底部取消、绿色测试连接、蓝色提交靠右；未选驱动的初始页面可没有底部操作，不能当作完整编辑页。',
];
const apiLayout=[
  '右侧白卡顶部整行数据源选择，具备详情入口权限时选择器右侧显示数据源详情按钮；横线后自上而下为API名称、URL地址、Method，各整行标签在控件上方。随后为请求头、请求参数、PATH三页签，默认请求头；每页签右上新增，下面是可横向滚动的参数表。',
  '参数表列顺序为参数名、是否必填、是否加密、类型、示例、参数说明、操作；请求参数页签表下显示是否开启分页，开启后显示两个分页参数选择器。横线下是返回体，右上新增，列为参数名、是否主键、类型、长度、操作；底部固定栏右侧取消与蓝色提交，页头右侧返回。内容在独立区域纵向滚动，不能用首屏证明下部已覆盖。',
];
const kafkaLayout=[
  '右侧页头左为新增kafka/编辑/查看标题、右为返回；白卡第一行整行数据源选择，有权限时右侧详情。分隔线后“配置topic信息”标题靠左，手动添加topic、获取topic信息靠右；表格依次为序号、Topic名称、字段数量、主体数据、Key类型、Value类型、操作，表下本地分页；空清单显示暂无数据，底部取消与蓝色提交靠右。',
  '手动添加弹窗宽度样本定义800px，单个Topic名称框支持英文逗号批量；配置字段弹窗定义1200px，上方依次禁用Topic名、主体数据、数据库类型、Key类型、Value类型，下面右上新增和字段表：序号、字段名称、字段类型、是否主键、长度、操作。弹窗确认只回写页面草稿，取消丢弃弹窗副本；窄屏收缩并内滚，确认区保持可达。',
];
const PROFILES={};
function listProfile(kind,label,route,api,fields,columns,controls,sources,extra=[]){
  return {kind,route,goal:'在授权范围内按条件查找'+label+'，区分记录、空结果与读取失败，并以稳定标识进入适用动作。',fields:[...fields,...columns],
    controls:[['输入/清空筛选','修改当前条件草稿；查询才发请求，false/0作为有效值保留。'],['查询/Enter','使用同一查询入口，pageNo=1，提交当前条件；加载中显示忙碌，避免重复在途读取。'],['重置','恢复初始筛选并回第1页重新请求；不把重置解释成删除数据。'],['分页/每页条数','翻页读目标页，改变条数回1页；默认请求order=[{prop:"id",asc:false}]。'],...(['apiList','kafkaList'].includes(kind)?[]:[['创建时间列排序','仅重排已加载的当前页；不能把列排序箭头解释为全部数据排序，也不自动修改pageRequest.order。']]),...controls],
    flow:['进入页面，在当前身份/范围内读取'+api+'；响应按datas/total或数组映射到列表。','输入条件→查询→第1页；返回列表时恢复本路由已提交条件/页码，重入和切账号不得串用旧数据。','按稳定标识进入详情或授权动作；只读查询不会自动测试连接、初始化、上传或远端发现。',...extra],
    requests:[['查询'+label,'POST',api,'body {obscureName?, '+(kind==='driverList'?'inside?, ':['sourceList','deptList','available'].includes(kind)?'enabled?, ':'')+'pageRequest:{pageNo,pageSize,order}}；仅当前筛选及分页','列表读取datas/total；也兼容数组分支；稳定标识及显示字段见字段表']],
    layout:['全局深色导航位于顶端、约240px模块树位于左侧；右侧页头标题，下面白色筛选条输入靠左、查询/重置靠右；另一白卡放操作区、蓝色表头与条纹列表，底部靠右显示总数、每页条数、页码和跳页。宽表格在卡片内滚动，名称省略时可读完整文案。',...extra.filter(x=>x.startsWith('布局：')).map(x=>x.slice(3))],sources,
    checks:['合法身份查询'+label+'，逐列核'+columns.map(c=>c[0]).join('、')+'及返回总数，不以样本条数作容量规则。','分别查有/无匹配并重置、翻页、改变条数；请求中的obscureName和pageRequest、有效0/false与结果一一对应；有创建时间列排序时只重排当前页、不修改请求order。','点击名称核正确稳定ID与optType=view，只读详情不产生保存、删除、测试或上传请求；离页返回恢复本路由条件。','断网、202、5xx、慢请求及A/B条件交错，错误与空态分开、可重试，迟到响应不覆盖新条件。','隔离身份直接改路由/对象ID或部门上下文，服务端拒绝越权；无权限按钮隐藏且直接调用同样拒绝。']};
}
PROFILES.apiList=listProfile('apiList','API配置','/datasource/api/list',C+'/apiConfig/page',queryFields('API名称'),[ro('序号','计算展示'),ro('API名称 name'),ro('API地址 url'),ro('请求方式 method'),ro('配置 id','稳定ID','详情/编辑/删除使用id，不是dataSourceId')],[['新增/名称/编辑','分别以optType=add/view/edit进入/api/edit；编辑/查看query.id为当前API配置id；列表入页清除旧cacheApiAddData。'],['删除','使用当前API配置id打开警告确认，只有人工确认才发DELETE；取消保持原记录。']],['API-LIST','API-FORM','API-API']);
PROFILES.kafkaList=listProfile('kafkaList','Kafka配置','/datasource/kafka/list',C+'/kafkaConfig/page',queryFields('Kafka名称'),[ro('序号','计算展示'),ro('Kafka名称 dataSourceName'),ro('服务地址 servers'),ro('描述 remark'),ro('来源 dataSourceId','稳定ID','查看/编辑/删除把dataSourceId映射query.id；不能用API配置id代替')],[['新增/名称/编辑','以optType=add/view/edit进入/kafka/edit；query.id=行dataSourceId；入列表清旧cacheKafkaAddData。'],['删除','人工确认后DELETE配置；不把此动作当作删除远端Topic、消息或Kafka集群。']],['KAFKA-LIST','KAFKA-FORM','KAFKA-API']);
for(const [kind,label,route,suffix,bus]of [['sourceList','管理侧数据源','dataSourceManageList','', 'adminDataSource'],['deptList','部门数据源','myDataSourceManageList','/my/mgr','myDataSource'],['available','可用数据源','iCanUsedDataSourceList','/my/use','canUseDataSource']]){
  const available=kind==='available',p=listProfile(kind,label,'/datasource/dataSource/'+route,D+'/datasource/micro'+suffix+'/page',queryFields(),sourceColumns,[['名称/详情','进入/dataSource/dataSourceEdit，query={id:行id,optType:view,name:行name,busType:'+bus+'}；详情使用本分区接口，不借管理侧接口越权。'],...(available?[]:[['新增/编辑/删除','具有create/update/delete权限才提供；新增与编辑设置busType='+bus+'；删除经人工确认后只调用本分区DELETE。'],['启用/禁用','onOff权限；按当前enabled选择对应POST，明确成功后回读列表；不把点击瞬时文案当服务状态已改变。']]),['测试连接','test权限单独校验；点击会实际连接外部系统，必须由人发起；遮罩“测试连接中”，按name/status逐驱动返回结果，不等于保存。']],['MANAGE-API',kind==='sourceList'?'ADMIN-LIST':kind==='deptList'?'DEPT-LIST':'USE-LIST','SOURCE-FORM'],kind==='deptList'?['布局：历史部门列表样本只显示筛选和新增，表格正文空白；目标正常列表仍按本字段表实现，读取中/失败/合法空态分开。']:[]);
  p.requests.push(['详情','GET',D+'/datasource/micro'+suffix+'/{id}','path id=行数据源id','读取连接公共资料及driverDataInfoList，查看模式禁用全部写控件'],['测试连接','GET',D+'/datasource/micro/test/'+({sourceList:'conn2',deptList:'conn3',available:'conn4'}[kind])+'/{id}','path id；人工动作，不能因GET方法认定无副作用','返回array<{name,status}>，0不支持、1成功、2失败；finally关闭遮罩']);
  if(!available)p.requests.push(['启用/禁用','POST',D+'/datasource/micro'+suffix+'/{enableSource|disableSource}/{id}','path id；按当前enabled选择disableSource或enableSource；无额外body业务字段','成功提示并重查，不返回虚构bool或业务码'],['删除','DELETE',D+'/datasource/micro'+suffix+'/{id}','确认后path id','拒绝/引用冲突保留行；明确成功后重查']);
  PROFILES[kind]=p;
}
PROFILES.driverList=listProfile('driverList','驱动','/datasource/dataSource/driveList',D+'/driver/page',queryFields('驱动名称',true),[ro('序号','计算展示'),ro('驱动名称 name'),ro('驱动分类 typeName'),ro('是否支持测试连接 supportConn','number','1是、0否'),ro('模板类型 testConnMode','number','1内置、0自定义'),ro('是否初始化数据 inside','number','严格inside=1显示是'),ro('创建时间 createTime','日期时间'),ro('驱动 id / 是否被引用 used','稳定ID/boolean','用于设计/删除与操作可见条件')],[['名称/驱动设计','名称进入driveDesign，query={driverId:行id,optType:view,name:行name}；used为假且inside严格为0并有update权限才显示可编辑设计。'],['新增','有create权限时进入driveDesign?optType=add；不因为当前截图无按钮就取消此权限分支。'],['删除','只有未使用且inside=0及delete权限提供；警告确认后DELETE driver/{id}，服务端重新核引用。'],['初始化','initialize权限；POST driver/init，会改变初始化数据；不是查询刷新，不能在进入列表时自动触发。']],['DRIVER-LIST','DRIVER-DESIGN','DRIVER-API']);
PROFILES.driverList.requests.push(['驱动详情','GET',D+'/driver/{driverId}','行id映射query.driverId','驱动模板及静态/动态资料'],['初始化','POST',D+'/driver/init','人工授权动作，无body业务字段','成功后重查列表'],['删除','DELETE',D+'/driver/{id}','人工确认后path id','成功后重查；拒绝引用/内置/越权时保留']);
function sourceProfile(kind,edit=false,dept=false){
  const bus=dept?'myDataSource':'adminDataSource',suffix=dept?'/my/mgr':'',base=D+'/datasource/micro'+suffix;
  return {kind,route:'/datasource/dataSource/dataSourceEdit?optType='+(edit?'edit&id={id}':'add')+'&busType='+bus,goal:(edit?'维护既有':'新增')+(dept?'本部门授权范围的':'管理侧')+'数据源连接定义及按驱动展开的参数；连接测试、上传和保存分别处理。',fields:sourceFields(edit,dept),
    controls:[['名称/描述输入','trim与长度计数；校验不通过定位具体字段，仍保留有效草稿。'],['驱动选择/页签','新增搜索多选最多5项，每个驱动独立参数、候选、密码与文件；编辑禁用驱动选择。改变驱动保留仍选项的草稿，移除项不提交。页签切换不保存。'],['所属部门/可见部门树','所属部门单选；自定义范围时多选可见部门。失效部门清理并提示；部门列表失败不得放宽到全部部门。'],['状态/是否数仓/范围/场景','选择只更新模型；0和false可提交。范围变更清不适用授权；字典与驱动模板未就绪不可保存。'],['动态输入/密码/文件','按模板required、type与items校验；新密码加密成功后才组装请求，保留/替换/清空分开。文件选择可立即上传，取消页面不保证远端临时文件不存在。'],['测试连接','将当前完整草稿组装到POST conn1，实际触达连接；必须人工触发、有test动作权限；验证错误跳首个错误驱动页签；结果逐驱动显示。'],['提交','校验→依赖/公钥就绪→加密和构造driverDataInfoList→共享在途锁→'+(edit?'PUT更新':'POST新增')+'；finally解除遮罩/锁。'+(edit?'明确成功后提示修改成功，确认返回并回读。':'解析返回code=200提示、201警告与msg；201是否已持久化须核结果，不能当作全失败自动重试。')],['取消/返回/浏览器后退','返回上一页；不发连接保存、删除或测试。目标策略：有未保存编辑先确认放弃，继续编辑则保持；已经上传的临时文件按生命周期政策处置，秘密不进入持久缓存。']],
    flow:['确认busType='+bus+'与操作权限→读取驱动列表、组织范围、连接器和应用场景字典；'+(edit?'按本分区id读取详情并回显每个driverDataInfoList及文件。':'初始名称空、enabled=true、driverIds=[]；补齐公共必填后选择驱动，出现底部操作。'), '为每个驱动按key/type/required/defaultValue/defaultValues实例化；界面绑定_$_{序号}__S__{驱动名}__S__{key}，提交还原为propertiesConfig[{key,value,values}]并移除_$_临时字段。','文件对象{name,url}序列化为“url 空格 name”列表；密码仅type=password且新值非空、非********才加密。敏感单行input的遮蔽开关不等同于密码加密。','按需人工测试，检查每个驱动0/1/2结果；测试失败保留草稿且不宣称保存失败/成功。','人工保存→'+(edit?'PUT同一数据源id':'POST本分区')+'→解析本调用特有回执→返回同分区查询和详情核公共资料、驱动配置及可见范围。未知结果先核记录，不能自动重发。'],
    requests:[driverCandidate,deptTree,...(dept?[myDept]:[]),sceneReq,connectors,keyReq,...(edit?[['读取详情','GET',base+'/{id}','path id=当前行id','返回公共字段、driverIds、driverDataInfoList[{id,driverId,propertiesConfig}]']]:[]),[edit?'更新连接':'创建连接',edit?'PUT':'POST',base+(edit?'/{id}':''),sourceBody,edit?'resolve后提示修改成功；持久化及并发控制由服务契约':'读取data.code/data.msg；code200 tip、201 warn，其他值不得按成功处理'],['测试当前草稿','POST',D+'/datasource/micro/test/conn1',sourceBody+'；明确人工动作','array<{name,status}>；0不支持、1成功、2失败'],['连接级文件上传','POST',D+'/datasource/micro/'+(edit?'modifySource':'addSource')+'/upload','FormData {file,fieldName:动态合成key,driverId:本页签driver.id}；浏览器生成multipart boundary','返回对象key/url字符串→文件列表；失败不把未上传文件传成已可用'],['预览驱动文件','GET','/back/common/oss/oss/downloadFileObject','query {key:文件url,businessDescription:encodeURIComponent("数据源驱动下载")}；responseType=blob','创建临时下载链接后释放objectURL；下载鉴权独立于列表可见']],layout:sourceLayout,sources:['SOURCE-FORM','DYNAMIC','ITEM','KEYVALUE','MANAGE-API','DRIVER-API','COMMON-API'],
    checks:sourceChecks(edit,dept)};
}
function sourceChecks(edit,dept){return [
  (edit?'修改合法记录':'使用合法公共字段及已发布驱动模板新增')+'并保存；按'+(dept?'my/mgr':'管理侧')+'详情/列表回读字段、驱动配置id和范围，无虚假成功或串对象。',
  '名称长度100可输入、101受限制；空/全空白阻止提交；描述500/501边界分别检查，trim不改变秘密字段。',
  '新增driverIds最多5项，第6项拒绝；编辑禁用且篡改请求的驱动集合由服务端拒绝，回读不变。',
  '取消、返回、后退及有草稿放弃/继续分支逐项检查；连接保存/测试请求0次，已上传临时文件单独核清理。',
  '断网、业务拒绝、密钥失败、重复点击、双会话竞争与越权提交；保留有效草稿、解除锁，无明文回退及重复连接。',
  '部门树未就绪禁止保存；'+(dept?'所属部门候选限本人部门':'管理侧使用授权组织树')+'，选失效ID及跨权限部门服务端拒绝。',
  'enabled=false、dataWareHouse=false、useEnv=0均保持原类型和值，不被非空判断丢弃；无选择与false/0分开。',
  'accessLevel=1/2/3切换；3必须accessDepts非空，其余不扩大权限；服务端直接ID读取核私有/公开/自定义矩阵。',
  '字典候选取value/display；编辑缺失旧useScene时显示原useSceneDisplay；候选失败不伪选默认。',
  '每个driver页签核模板标签/key/type/required及12/24布局；同名key不同驱动的值、错误和密码不串用。',
  '参数校验失败自动切首个错误驱动页签并聚焦字段；修正后可再次提交，其他页签有效草稿不丢。',
  '新密码使用连接公钥的RSA-OAEP SHA256/MGF1 SHA256后Base64；请求、日志、缓存无明文；密钥失败发送0次保存/测试。',
  '编辑********不重复加密且保留原秘密；聚焦不输入、替换、清空分别按已发布契约处理，不能把保留标记写成真实密码。',
  'driverDataInfoList映射driverId、原配置id、propertiesConfig[{key,value,values}]，请求不含_$_临时字段；详情回显同一组。',
  '文件name/url包含空格时不损坏文件名；serialize“url 空格 name”与回显规则一致，不随意拼出公网地址。',
  '动态单文件第2个及多文件第6个拒绝；20 MiB允许、超1字节拒绝，format非法拒绝；服务端重复检大小/内容/授权。',
  '上传失败保留可重选状态，不写不可用key；页面取消、替换、无引用超期与失败临时文件按政策清理，不误删已引用文件。',
  '管理侧conn2、部门conn3、可用conn4和草稿POST conn1分别核参数及权限，逐项0不支持/1成功/2失败；不以HTTP GET证明无副作用。',
  '保存超时/响应丢失先核同一连接及审计结果再允许重试；取消遮罩不声称后端已终止。',
  '切换驱动/页签、延迟加载、快速返回时，旧模板和详情响应不能覆盖当前对象，仍选驱动草稿保持。',
  '删除项、数字0、布尔false和空数组的默认回显使用类型判断，不能用逻辑或默认值覆盖有效输入。',
  '驱动静态参数/文件只读；查看模式动态控件同样禁用，不能上传或清密码，下载只能读有权文件。',
  '新增code=200、201及未知code逐分支核提示与结果回读；201不自动重发，更新resolve不冒用新增code契约。',
  '启用/禁用、引用冲突及并发更新由服务端重新授权与校验；连接定义删除不删除远端数据库/表/消息。',
];}
PROFILES.sourceAdd=sourceProfile('sourceAdd');PROFILES.sourceEdit=sourceProfile('sourceEdit',true);PROFILES.deptAdd=sourceProfile('deptAdd',false,true);
function apiProfile(kind,edit=false){return {kind,route:'/datasource/api/edit?optType='+(edit?'edit&id={id}':'add'),goal:(edit?'维护既有':'新增')+'API采集配置，定义请求头、请求参数、PATH与返回体元数据，供后续接入使用；此页面不执行远端API。',fields:apiFields(edit),
  controls:[['数据源选择/详情','新增读取usedFilter=true、enabled=true候选；编辑读取false/false并锁定dataSourceId。详情按钮受特定入口权限控制，选择后才能用；进入数据源只读详情并返回恢复内存草稿。'],['名称/URL/Method','名称与URL长度计数，失焦非空及URL校验，Method选择即更新；本表单禁止原生submit，不给Enter额外发起保存。'],['三页签/各自新增与删除','默认header；新增向当前数组加默认行，每组上限300；本地删除后校验分页关联，切页签不丢其他行。'],['必填/加密/类型/示例/说明','逐行编辑元数据；加密开关改变输入遮蔽，新安全值提交前加密；旧********聚焦清空，失焦未填恢复标记，取消加密时清旧标记避免当字面值提交。'],['分页开关/两选择器','paging=true显示并要求两个选择；候选只取requestParam.params.paramKey；删除/改名后立即清失效引用并提示重新选择。'],['返回体新增/删除/主键/长度','只改返回元数据草稿；参数名与类型必须填写，长度min1步进1；不触发远端结构修改。'],['提交','先四组行校验及表单校验，公钥就绪且安全值加密成功才允许'+(edit?'PUT':'POST')+'；共享在途锁，失败解除且保留有权草稿；成功提示确认后回上一列表并回读。'],['取消/页头返回/后退','不发送API配置写入；未保存草稿按统一放弃确认，详情往返仅恢复当前会话内存草稿，不把安全值保存localStorage。']],
  flow:['进入'+(edit?'编辑按id读详情':'新增，模型各数组为空、paging=false')+'→读取API来源候选→非查看模式读apiConfig/key；所有依赖失败均分别显示。','选择授权来源、填写名称/URL/Method，分别维护headerParam、requestParam.params、pathParam与responseParam；每行保留不同绑定，分页名称只引用请求参数。','校验四个真实数组的paramKey/paramType及条件分页→在副本上加密secureKey新值→'+(edit?'PUT apiConfig/{id}':'POST apiConfig')+'，不能在原草稿覆盖为密文或因同步加密异常跳过解锁。','明确成功后提示并返回查询API配置，按id回读四组元数据与来源；失败不错误清草稿，超时先核是否已创建/修改。'],
  requests:[['API来源候选','POST',C+'/apiConfig/apiDataSource/list','body {usedFilter:'+(edit?'false':'true')+',enabled:'+(edit?'false':'true')+'}','返回array<{dataSourceId,dataSourceName,...}>；显示名称不作ID'],['API安全参数公钥','GET',C+'/apiConfig/key','无query业务参数','公钥文本→UTF-8安全值RSA-OAEP SHA-256/MGF1 SHA-256→Base64'],...(edit?[['读API配置','GET',C+'/apiConfig/{id}','path id=当前API配置id','返回dataSourceId/name/url/method及四组元数据']]:[]),[edit?'更新API':'创建API',edit?'PUT':'POST',C+'/apiConfig'+(edit?'/{id}':''),apiBody,'普通resolve后提示新增成功/修改成功，不另造业务code=0或返回id'],['来源只读详情','GET',D+'/datasource/micro/my/use/{id}','path id=选中dataSourceId；路由busType=canUseDataSource,optType=view','读取有权连接，返回原编辑草稿；秘密不进入持久缓存']],layout:apiLayout,sources:['API-FORM','API-API','API-CRYPTO'],
  checks:[
    '合法来源、名称、URL、Method和四组参数保存，按API配置id回读精确嵌套结构；记录来源dataSourceId不与API id混用。',
    'API名称200/201、URL500/501、空和非法URL逐项检查；Method只选GET/POST/PUT/DELETE；提交不调用被配置远端URL。',
    'headerParam、requestParam.params、pathParam、responseParam任一行缺paramKey/paramType均阻止保存且定位相应页签，不因requestParam是对象而漏校验params。',
    '取消/关闭放弃确认/后退及详情往返，配置写入0次，草稿恢复仅限当前会话内存；localStorage不含任何安全值。',
    '公钥失败、202、5xx、断网、响应丢失、并发与越权分别检查；无明文回退、虚假成功、重复配置，结果未知先回读。',
    '每组参数第300行允许，第301行拒绝；分组独立计数、切页签不丢其他组；不把单个样本行数当系统容量。',
    '参数名250/251、示例150/151、说明200/201及返回长度0/1/步进1边界检查；示例不按paramType擅自转数值或JSON。',
    'secureKey=true新非空值先转UTF-8，再用RSA-OAEP SHA256/MGF1 SHA256加密后Base64；********保留、聚焦未填恢复、取消加密清标记均不泄漏真实值。',
    'paging从false开true时两选择必填；候选只含params键，删除/改名使关联失效后清空；关闭分页不在执行端启用。',
    '编辑的dataSourceId禁用且篡改服务端拒绝；新增仅使用enabled/usedFilter条件候选，候选失效不能保存。',
    '查看optType=view时四组控件禁用、无提交/增删控件，不读新加密公钥或发生任何API配置写入；权限直接URL同样核验。',
  ]};}
PROFILES.apiAdd=apiProfile('apiAdd');PROFILES.apiEdit=apiProfile('apiEdit',true);
function kafkaProfile(kind,edit=false){return {kind,route:'/datasource/kafka/edit?optType='+(edit?'edit&id={dataSourceId}':'add'),goal:(edit?'维护':'新增')+'已有Kafka连接下的Topic元数据配置，支持手动添加、授权获取候选与字段配置；不在此创建远端Topic。',fields:kafkaFields(edit),
  controls:[['数据源/详情','新增候选usedFilter=true、enabled=true；编辑false/false且锁定来源。详情往返恢复当前内存草稿，不能扩大为管理权限。'],['手动添加topic','打开800px弹窗；按英文逗号校验每段字符/长度、同批和已有清单重复，确认仅加入本地草稿，取消不改草稿；输入不自动trim，含空格应报格式错误。'],['获取topic信息','先选数据源，否则提示“请先选择一个数据源名称”；人工确认发GET topicName/list/{dataSourceId}实际访问远端。遮罩“获取topic信息中”，返回名称去除已存在项，新项mysql、STRING/STRING、columnList=[]；失败保留已有配置。'],['配置字段','复制当前Topic到1200px模态，Topic名禁用，编辑主体/数据库/Key/Value与字段；确认校验后回写全局正确行，取消丢副本。'],['Topic/字段本地删除','删除仅从草稿移除，最终提交前不请求服务器删除；分页行索引转全局索引，不能误删第1页同序行。'],['本地分页','基于完整kafkaConfigInfoList，默认1页/20条；变页大小回1页，删除后页码夹到有效范围；不发服务分页请求。'],['提交','来源必填、Topic至少1、每Topic sourceType/serialization/deserialization齐全，每个字段名唯一且格式/类型合法；'+(edit?'PUT':'POST')+'完整配置，在途锁、失败保留、成功提示返回并回读。'],['取消/返回/后退','不提交Topic配置；有未保存修改按放弃确认。已发生远端发现不声称可撤销，也不自动触发再次获取。']],
  flow:['进入'+(edit?'按query.id=来源dataSourceId读取配置':'新增模型dataSourceId为空且清单[]')+'，读取来源候选；所属ID不能从API记录或Topic序号推定。','选择来源→手动拆分名称或人工获取远端候选→去重加入草稿；获取失败与成功空清单分开。','逐Topic配置主体、mysql数据库类型、Key/Value枚举；增加字段，校验名称正则及唯一、字段类型、长度，模态确认写回正确全局行。','主表再次检查所有Topic及字段→人工保存完整模型→成功后回原列表及配置详情核清单。草稿行删除、配置删除、远端Topic删除是不同动作。'],
  requests:[['Kafka来源候选','POST',C+'/kafkaConfig/kafkaDataSource/list','body {usedFilter:'+(edit?'false':'true')+',enabled:'+(edit?'false':'true')+'}','返回dataSourceId/dataSourceName候选'],...(edit?[['读Kafka配置','GET',C+'/kafkaConfig/{id}','path id=来源dataSourceId','返回dataSourceId和kafkaConfigInfoList及字段']]:[]),['获取Topic候选','GET',C+'/kafkaConfig/topicName/list/{dataSourceId}','path dataSourceId；人工动作，实际远端访问','array<string>；只增加未在草稿名称中出现的项'],[edit?'更新Kafka配置':'创建Kafka配置',edit?'PUT':'POST',C+'/kafkaConfig'+(edit?'/{id}':''),kafkaBody,'普通resolve后提示新增/修改成功，不等于远端Topic已创建或消息已消费'],['来源只读详情','GET',D+'/datasource/micro/my/use/{id}','path id=选中dataSourceId','以busType=canUseDataSource只读进入并返回']],layout:kafkaLayout,sources:['KAFKA-FORM','KAFKA-API','KAFKA-TYPES'],
  checks:[
    '已有授权来源添加合法Topic并配置mysql、Key/Value及字段后保存，按来源dataSourceId回读完整清单；远端创建/删除请求0次。',
    '未选来源、空Topic清单、Topic缺数据库/Key/Value分别阻止提交并提示具体行；编辑来源禁用且不可篡改。',
    '手动名称2/3/255/256边界、整框255上限、点号/横杠/下划线、非法空格、空段与重复同批/已有项逐项检查，取消不加行。',
    '配置字段模态取消保留原Topic，第二页配置/删除及改变页大小作用于正确全局行；取消主页面保存0次。',
    '获取失败/202/超时保留现有草稿；保存未知结果先按来源查配置，重复保存和跨来源ID被后端去重/拒绝。',
    '人工获取先验证来源与权限；返回重复/新Topic时只加入新名，默认mysql、STRING/STRING和空字段，不自动调用保存。',
    '字段名1/255及非法开头/重复、类型缺失均阻止模态及主提交；长度1和2147483647允许、0/越界拒绝。',
    '主体数据25/26、17项Key/Value/字段类型枚举、primaryKey=false与columnLength=255默认逐字段核对，单位不擅改。',
    '行标识绑定外层dataSourceId；模板子项dataSourceId=0不被当成另一授权来源，服务端核子项归属。',
    '只读详情无手动添加、获取、配置、删除和提交；列表按servers/remark显示，不将服务地址写成新建表单字段。',
  ]};}
PROFILES.kafkaAdd=kafkaProfile('kafkaAdd');PROFILES.kafkaEdit=kafkaProfile('kafkaEdit',true);
function deleteProfile(kind,label,listKind,idName,api){const list=PROFILES[listKind];return {kind,route:list.route,goal:'经人工确认删除选定'+label+'定义，防止越权、引用冲突及未知结果重放；不删除远端业务数据。',fields:[ro('目标标识 '+idName,'稳定ID','来自当前行；确认与请求绑定同一对象'),ro('目标名称','只读文本','确认中显示可辨识名称与对象类型'),ro('删除警告','提示文本','删除操作不能恢复，确定删除吗？'),ro('引用/权限/当前版本','服务端约束','不由前端隐藏按钮替代；事务重查后才能删除')],
  controls:[['删除入口','捕获当前对象稳定ID与名称，打开警告确认，不先发DELETE。'],['确认','同对象在途锁；重新核权限/引用/版本后发一次DELETE，明确成功才提示删除并重查。'],['取消/关闭','关闭确认层回列表，DELETE请求0次，不改变已提交筛选条件。'],['失败/结果未知','引用拒绝保留记录并显示可理解原因；未知结果按稳定ID查询后决定，不能盲目自动重试。']],
  flow:['在'+list.route+'选择正确'+label+'，核'+idName+'与名称；不能使用序号或相邻对象ID。','警告确认→取消则直接关闭；人工确认后DELETE目标ID，由服务端重新核权限、引用与并发。','成功后提示并重新查询；删除当页末条且非第1页时回前一有效页。失败仍保留记录；结果未知先按ID核查。'],requests:[['删除定义','DELETE',api+'/{id}','path id='+idName+'；无臆造body、强制级联或版本头','普通成功提示删除成功；取消不发送；引用/权限/并发拒绝不宣称删除'],...list.requests.filter(r=>r[0].startsWith('查询'))],layout:['删除警告在原列表上方居中显示，背景列表上下文仍可辨识；标题/内容与确认、取消按钮可通过键盘访问，确认后显示忙碌；失败提示保留对象上下文，关闭焦点回删除入口。','警告不是整页新增/编辑表单，不加入账号、密码、分页输入或虚构级联勾选。取消不跳到其他模块；窄屏不遮确认区。'],sources:[listKind==='apiList'?'API-LIST':listKind==='kafkaList'?'KAFKA-LIST':'ADMIN-LIST',listKind==='apiList'?'API-API':listKind==='kafkaList'?'KAFKA-API':'MANAGE-API','LIST-MIXINS'],checks:[
    '合法无引用对象人工确认后只发一次DELETE到正确'+idName+'，列表与按ID查询一致删除；不影响其他定义或远端资源。',
    '取消/关闭确认层，DELETE为0次，原目标及子项仍可按ID查询；重新发起绑定同一当前行。',
    '引用中新建引用/并发更新/越权分别由服务端拒绝并提示；拒绝后定义与子项均不变，不自动级联。',
    '断网/202/5xx/响应丢失不显示成功，结果未知先查当前ID；重复确认受在途锁和服务端去重约束。',
    '删除当页末条回有效页、保留查询条件并回读；会话过期清无权列表，不能因前端按钮可见绕过鉴权。',
  ]};}
PROFILES.apiDelete=deleteProfile('apiDelete','API配置','apiList','API配置id',C+'/apiConfig');
PROFILES.kafkaDelete=deleteProfile('kafkaDelete','Kafka配置','kafkaList','来源dataSourceId',C+'/kafkaConfig');
PROFILES.sourceDelete=deleteProfile('sourceDelete','数据源连接','sourceList','连接id',D+'/datasource/micro');
PROFILES.driverAdd={kind:'driverAdd',route:'/datasource/dataSource/driveDesign?optType=add',goal:'维护可复用的驱动模板，配置连接器、驱动文件、静态参数及动态字段，使连接表单按明确模型生成。',fields:driverFields,
  controls:[['名称/类型/支持测试/模板','名称trim；类型读取连接器并选首个返回type；内置/自定义改变会重建必要动态/静态项，切换前先确认避免无提示丢草稿；不自动测试连接。'],['内置连接器','展示requiredProperties、optionalProperties与requiredStaticProperties；必要动态项allowModify=false，key/type/required须匹配；自定义模式不继承内置必需项。'],['左侧组件/中间画布','单击或拖入复制组件并赋本地UUID；可调整顺序、删除可修改项；双击打开右侧750px属性抽屉；row强制换行，无业务值。'],['属性抽屉','逐项编辑字段名/唯一key/宽度/必填、条件选项及默认、文件格式/多选或单行敏感；默认值必须存在选项；删除选项清无效默认。抽屉直接更新所选草稿项，关闭不是服务器保存。'],['文件上传/移除/预览','点击选择.jar即POST上传，≤20 MiB、最多1个；成功加入{name,url}；移除只改文件列表，预览按授权下载。取消整个设计不能承诺从未上传。'],['静态键值','新增/删除本地行；内置要求键必须齐全，每行键值非空；连接器预定义选项限制取值。'],['提交','表单校验+动态名称/key唯一/选项默认/连接器必需项齐全；深拷贝动态项并去顶层_前缀临时属性，POST driver；共享在途锁；成功提示后返回列表回读。'],['取消/返回/后退','不保存驱动；未保存变更先放弃确认，已上传临时文件单独处置；不自动初始化。']],
  flow:['新增读取driverType字典→选择类型GET connectorByDriverType/{type}→确定模板与连接器。','按内置连接器重建必要静态/动态配置，或在自定义模式拖入组件；为非row项定义名称及唯一key、类型、required、宽度、候选和默认值。','如需驱动文件，人工选择即时上传；成功后才保存文件引用；静态参数与动态项分别校验。','提交basicForm加dynamicProperties，只有通过已查动态结构验证才允许POST；回读driver详情与列表核模板可生成数据源表单。失败保留草稿，未知结果先查询。'],
  requests:[['驱动分类字典','GET','/back/common/dict/dictitem/category/driverType','无query业务参数','返回value/display'],['分类连接器','GET',D+'/driver/connectorByDriverType/{type}','path type=已选字典value','返回type/name/requiredProperties/optionalProperties/requiredStaticProperties'],['补读连接器','GET',D+'/driver/connector/{type}','编辑旧驱动连接器不在当前列表时','返回旧连接器定义；不擅改旧模板'],['即时上传驱动','POST',D+'/driver/addDriver/upload','FormData {file}；浏览器设置multipart boundary','返回文件key/url字符串；文件名取本地file.name'],['创建驱动','POST',D+'/driver','body {name,type,supportConn,driverFile,staticProperties,testConnMode,testConnInfo,dynamicProperties}；动态项保留业务属性，去顶层_前缀键','普通resolve提示新增驱动成功；服务端ID不由本地UUID替代'],['驱动回读','GET',D+'/driver/{driverId}','path id=真实服务标识','回读模板及约束；创建响应标识与唯一性作用域须遵守后端契约']],
  layout:['在顶端导航和左模块树右侧，独立“驱动设计”页头；设计页左侧还有一列10种可拖入组件，中间为白色表单画布。画布前两行两列：名称/驱动类型，支持测试/模板类型；内置连接器整行，下面上传、动态表单配置大区及静态键值表；底部右侧取消、提交。','双击动态项从右打开750px抽屉，自上而下类型、宽度、名称、唯一标识、必填，按组件条件显示多选、选项、文件格式、敏感及默认值。查看模式隐藏组件侧栏和底部写操作、禁用画布及拖拽；抽屉/画布分别可滚，错误明确定位字段，不让浮层遮提交。'],sources:['DRIVER-DESIGN','DRIVER-API','DYNAMIC','KEYVALUE','ITEM','COMMON-API'],
  checks:[
    '合法类型、连接器、静态和动态项保存后回读driver详情及列表；新数据源可按该模板生成字段，不自动建立连接。','名称50/51、空/全空白，分类/支持/模板/内置连接器缺失分别阻止；自定义不要求内置连接器。','非row字段名称≤40且非空非未命名，key=2～40、^[a-zA-Z_]\\w+$且唯一；缺必需项或改type/key/required拒绝。','取消设计不POST driver；已上传文件、抽屉直接草稿更新及切连接器放弃确认分别核对，不把取消当远端清理成功。','无create权限、引用竞争、网络失败、响应丢失和重复提交受保护；失败保留草稿，未知结果先核驱动而非自动重发。','10种组件拖入/重排/删除、12/24宽及row换行、750px属性抽屉和查看禁用分别核，不能只靠拖拽操作。','staticProperties每行key/value非空且内置必需键齐全；选项ID和名称各自唯一、默认值属于候选，删除候选清无效默认。','单行sensitiveField仅遮蔽；密码/文件不提供默认编辑器；number初始1和默认编辑器范围不误写为所有连接参数范围。','只允许.jar、单文件1个、20 MiB边界；文件选择即上传，非法文件服务端复检，删除本地引用不等于物理删除文件。','POST体严格basicForm+dynamicProperties，UUID与_前缀临时项不变服务ID；静态/动态版本按发布契约，反序列化不执行脚本。','inside=0且!used和update/delete权限才显示设计/删除；initialize单独动作权限，查看及初始化不能自动保存驱动。',
  ]};
const NFRS=[
  ['DS-NFR-001','范围与动作授权','服务端分别验证驱动、管理侧、部门、可用来源、API、Kafka及文件；查询、查看、create/update/delete/test/onOff/initialize按动作控制。直接URL、改id/driverId/dataSourceId/部门及文件key不能扩大范围，公开不等于无认证。','隔离身份×私有/公开/自定义×三种来源接口矩阵，读取/修改越权成功0次，秘密泄漏0项；页面隐藏与直接请求均验证。','DS-100～129、DS-500～512'],
  ['DS-NFR-002','传输、凭据和存储','全链路TLS；新密码和secureKey安全值按各自公钥契约加密，加密失败发送保存/测试0次。连接凭据因连接需要采用受控可恢复加密存储与密钥隔离，不能套账号单向哈希；日志、前端持久缓存、截图说明及模型不含凭据。','标记凭据检查请求/日志/缓存/存储/密钥权限；轮换、保留/替换/清空及加密失败逐项验证，无明文回退。输入遮蔽或客户端加密不能保证本人F12读不到输入。','DS-102、DS-103、DS-112、DS-127、DS-128'],
  ['DS-NFR-003','外部连接与防滥用','测试连接、Topic发现及配置远端URL由服务端检查协议、目标授权、DNS解析和重定向；拒绝越权网络/云元数据及文件协议读取。每身份同一来源最多1个在途测试/发现，后端采用版本化限流、超时和隔离策略，进入页面不自动连接。','隔离受控端点核允许/拒绝、DNS变化/重定向/超时及并发限流，未经授权外连0次；超时不能遗留无限后台连接。不得对生产内网试探。','DS-107、DS-108、DS-110、DS-115、DS-125、DS-127、DS-128'],
  ['DS-NFR-004','动态表单与异步隔离','驱动模板、连接器、字段key/type/required/候选/默认、连接配置id须绑定同一版本和驱动顺序；有效0/false不被默认覆盖。响应迟到或切对象不串表单，配置文本不执行脚本。','至少20组切换驱动/对象/范围及乱序响应；跨驱动字段串值、迟到覆盖、脚本执行0次，模板契约变化有明确迁移/拒绝行为。','DS-122、DS-127、DS-128、DS-505～507'],
  ['DS-NFR-005','保存、并发与未知结果','同对象同动作最多1个在途提交；后端事务核引用、授权和版本，重复/竞争至多1个逻辑结果；保存超时先按稳定ID/请求关联核结果，不能无条件重放。201警告和未知新增code不等于可重试失败。','20组双会话更新/删除/重复提交及响应丢失，重复定义、部分成功误报和无依据重放0次，失败后数据可回读解释。','DS-102～104、DS-107～109、DS-112、DS-122、DS-127～129'],
  ['DS-NFR-006','文件安全与归属','驱动.jar≤20 MiB且单文件1个；连接文件按format、单1/多5及每文件20 MiB限制。服务端复核扩展名、内容、大小、归属和可执行文件策略，禁止任意路径/跨来源key；上传成功不等于模板保存。','19 MiB、20 MiB、超1字节、伪扩展名、超数量及跨范围下载矩阵；不合格进入可用存储0次。取消/失败临时文件按批准留存回收，已引用文件误删0次。','DS-122、DS-112、DS-127、DS-128'],
  ['DS-NFR-007','查询与本地交互性能','基准内列表点击查询到新表格及分页可操作P95≤3秒；数据源表单依赖齐全到可输入P95≤4秒；本地输入/切页签反馈P95≤100ms，忙碌提示≤200ms。外部连接完成时间单独计量。','每场景≥200样本报告P50/P95/P99/最大值、总失败；依赖未就绪不得把骨架屏算可操作，未记录资源或样本不足不判通过。','DS-100、DS-105、DS-110、DS-115、DS-120、DS-125、DS-505～512'],
  ['DS-NFR-008','容量与分页正确性','API每组参数最多300行；数据源最多5个驱动；Kafka按完整清单分页，局部行必须映射全局行。合法数据量内不静默截断、串页删除或把样本总数当上限。','API各组300行、5驱动及1000个模拟Topic各20字段，翻页/改条数/最后页删除/保存回读一致；全部功能验收在授权隔离环境运行。','DS-102、DS-103、DS-107、DS-108、DS-127、DS-128'],
  ['DS-NFR-009','超时与恢复','所有读取、上传、保存、测试/发现采用有限超时，依赖读目标20秒、人工测试/发现目标30秒；超时后1秒内恢复界面可控并说明未知结果。取消UI不宣称已终止远端；重试仅由人对适用操作发起。','故障注入超时/断网/202/5xx，核锁/遮罩恢复与有效草稿、请求数及后端结果；无限等待、旧响应覆盖和写入自动重放0次。','DS-100～129、DS-500～512'],
  ['DS-NFR-010','审计与可观测性','记录操作者/范围、来源与驱动/配置标识、动作、请求关联、字段名层面的变更、时间、结果和拒绝原因；测试与发现记录外连目的分类及状态，不记密码/安全值/完整连接字符串。','成功/拒绝/未知结果可从页面关联到后端审计；新增/更新/删除/启停/初始化/上传/测试/发现各1组，审计缺失和秘密泄漏0项。','DS-102～104、DS-107～109、DS-112、DS-122、DS-125～129'],
  ['DS-NFR-011','兼容与响应布局','Windows 11当前稳定Chrome/Edge记录版本；1366×768、1500×1000、1920×1080与200%缩放；320 CSS像素宽内容重排，宽表/1200px模态在自身可滚区域内展示，底部操作不被遮挡。','覆盖6列表、驱动画布/750px抽屉、动态5页签、API3页签/返回体与800/1200px模态；长名称、错误提示、空/加载/失败下按钮均可达。','DS-100～129、DS-500～512'],
  ['DS-NFR-012','可访问性','字段有真实标签，必填/错误关联控件；页签、树、多选、模态和所有动作支持键盘，焦点可见且关闭返回入口。驱动拖拽提供选择后新增/上下移动/删除的键盘等效操作；连接0/1/2不能只靠颜色区别。','键盘/读屏完成选择、查询、配置、校验及取消；普通文本对比度≥4.5:1，大字/非文本控件≥3:1；自动扫描加人工覆盖，焦点不可达判失败。','DS-100～129、DS-500～512'],
  ['DS-NFR-013','资源与临时内容生命周期','离页清理resize监听、定时器、遮罩、详情草稿与未用候选；下载objectURL及时释放；临时文件使用服务端归属/引用/留存政策清理，不由浏览器任意删除。切身份清全部旧秘密及授权数据。','100次打开/返回API、Kafka、连接与驱动设计，离页遗留监听/遮罩/秘密0；创建与释放objectURL数量匹配，临时与已引用文件核对。','DS-102、DS-103、DS-107、DS-108、DS-122、DS-127、DS-128'],
  ['DS-NFR-014','契约与可维护性','统一管理网关前缀、三范围来源接口、API/Kafka不同ID与嵌套模型、密钥/加密编码、模板版本和错误DTO；文档生成可重复并保留发布编号与历史来源。未知后端结构禁止AI自选。','契约测试覆盖GET/POST/PUT/DELETE、JSON/FormData、code200/201和HTTP202、动态映射与模板迁移；生成刷新0变化，编号/来源/原文篡改反例能拒绝。','DS-100～129、DS-500～512'],
  ['DS-NFR-015','AI质量、权限与费用','AI仅读取用户显式选择且有权的去秘密模板/参数元数据和错误码，生成检查清单、参数说明与Topic字段建议，并引用来源。不得读取凭据或完整服务端点，不自动保存、测试、发现、上传、初始化、启停或删除。单次输入≤10000字符、输出≤2000字符，30秒超时可取消；费用超版本化预算不调用。','人工标注30例，来源可回溯100%、关键事实一致率≥95%、自动业务动作/秘密泄漏0；≥50次记录整体P95≤20秒、失败/取消和token/费用，失败时原人工流程可用。','DS-102、DS-103、DS-107、DS-108、DS-122、DS-127、DS-128'],
];
function acceptanceFor(kind){if(!PROFILES[kind])throw new Error('DS unknown feature profile');return PROFILES[kind].checks;}
function screenshot(id){const folder=/^[HZ]-DS-/.test(id)?'live-recheck-20261022/':'';return `[${id}截图](../evidence/${folder}${id}.png) / [元素](../evidence/${folder}${id}.json)`;}
function exceptionsFor(kind){
  if(kind.endsWith('Delete'))return [
    ['目标消失/已被其他人删除','按原ID回读并说明当前结果；不切换到相邻行或重新创建，不误报本次成功删除。'],
    ['有引用/内置保护/版本冲突','服务端拒绝后保留对象及原列表条件，展示冲突原因并允许回读；不自动级联或绕过保护。'],
    ['无权限/会话过期','禁止发送或拒绝删除，清理失权内容，重新登录后重新核对象资格，不能重放原确认。'],
    ['HTTP202/5xx/断网/响应丢失','区别明确拒绝与结果未知；解除确认锁，未知结果先按ID核查，不盲目重试。'],
    ['取消/关闭/重复确认','取消或关闭不发DELETE，原筛选和对象保持；共享在途锁保证同一动作不并发发送。删除确认没有业务资料编辑字段，不适用必填表单或密码加密分支。'],
  ];
  if(kind.endsWith('List')||kind==='available')return [
    ['读取中/合法空结果','读取中保留当前条件与忙碌反馈；成功空结果展示空态，不据此认定查询故障。'],
    ['HTTP202/5xx/断网/响应结构错误','错误态与空态分开，保留条件并允许原条件重试；页码越界按有效页回读，不静默显示为无记录。'],
    ['查看/条件动作无权限','服务端核对象和动作；失权时清内容，直接URL或对象ID也不能绕过。只读查询不自动执行行级动作。'],
    ['快速查询/翻页/离页后响应迟到','按本次条件和对象隔离响应；旧结果不覆盖新查询，离页清理加载状态与监听。'],
    ['表单维护分支','本页筛选不创建或修改定义，不适用新增表单必填、保存加密或临时文件回滚；行级维护及外部测试转对应功能规则。'],
  ];
  return [
    ['候选/详情/模板失败','区分失败对象与合法空态；局部重试保留有效且有权的草稿。依赖失败不放宽来源、部门或字段校验，不虚构默认。'],
    ['必填/长度/格式/枚举/引用失效','阻止提交，定位字段及所在页签；服务端拒绝映射到可理解错误，保留有效输入。不自行生成额外必填。'],
    ['重复/引用/并发/权限拒绝','保留仍存在的对象、解释拒绝并提供回读；不强制级联、不覆盖他人更新、不自动放宽范围。会话过期清无权内容，重新认证后重新校验。'],
    ['HTTP202/5xx/断网/解析失败'+(['apiAdd','apiEdit','sourceAdd','sourceEdit','deptAdd'].includes(kind)?'/加密失败':''),'业务拒绝与技术失败分别展示；finally解除锁/遮罩。'+(['apiAdd','apiEdit','sourceAdd','sourceEdit','deptAdd'].includes(kind)?'加密失败不明文回退，':'')+'保存及已发外连/上传的未知结果先核查，再由人决定适用重试。'],
    ['取消/重复点击/迟到响应','取消不提交新的维护请求；已经发起的外连或即时上传单独处置。共享在途锁和服务端事务/去重共同保护；旧对象或模板的响应不得覆盖当前草稿。'],
  ];
}
function renderFeature(entry){
  const p=PROFILES[entry.kind];if(!p)throw new Error('DS unknown feature profile');
  const action=entry.kind.endsWith('List')||entry.kind==='available'?'查询、详情及有权条件动作':entry.kind.endsWith('Delete')?'人工确认删除定义':entry.kind.endsWith('Edit')?'修改定义及条件子项':entry.kind==='driverAdd'?'驱动模板设计、即时上传与保存':'新增定义及条件子项';
  return [`### ${entry.id} ${entry.title}`,'',`**功能入口**：${p.route}。`,'',`**操作类型**：${action}。`,'',`**业务目的**：${p.goal}`,'','**前置条件**：已登录且服务端允许读取当前对象；新增、修改、删除、启停、初始化、上传、测试连接及Topic发现分别具有对应权限，菜单可见不授予接口权限。','',`<!-- 完整规格:${entry.id} -->`,'',
    `#### 1. 页面字段清单（${entry.id}）`,'',...table(['字段名称与绑定名','类型/控件','是否必填','默认值','长度/范围/单位','格式及校验规则','错误提示','条件/状态'],p.fields),
    '空白属性不等于无校验，也不授权AI自定；数字0、布尔false、未选择和空字符串分别处理。样本记录名称、时间、数量和当前值不是固定产品规则；只读字段不能转成可编辑参数。','',
    `#### 2. 页面交互规则（${entry.id}）`,'',...table(['控件/触发方式','行为、联动、禁用、草稿与反馈'],p.controls),
    `#### 3. 业务流程与异常分支（${entry.id}）`,'','**操作与规则**：','',...p.flow.map((s,i)=>(i+1)+'. '+s),'','**结果与异常处理**：','',
    ...table(['分支','页面结果、数据影响与恢复'],exceptionsFor(entry.kind)),
    `#### 4. 接口与数据规则（${entry.id}）`,'','**请求方法与相对路径**：路径按当前默认网关列出；path、query与body分别映射，不补造参数。','',...table(['用途','HTTP方法','相对路径','请求参数、来源与序列化','返回读取与页面处理'],p.requests),
    '**开发处理细则**：使用父应用公共会话客户端，API_BASE_URL路径为/back，MODULE_URL_PREFIX可覆盖/common/datasource、/common/collectionconfig、/common/user、/common/dict和/common/oss。普通请求Content-Type为application/json；GET参数在query、其余在body，FormData由浏览器设置multipart边界。HTTP202走公共业务错误reject，普通接受响应解包response.data；连接新增另读code=200/201及msg，不为API/Kafka/驱动套此业务码。服务DTO、未知code、生成ID、授权、并发与审计按[公共数据规则](./子页面与操作细化.md#4-字段枚举和约束)及交付契约接入。','',
    `#### 5. 验收标准（${entry.id}）`,'',...table(['验收编号','操作与可检查结果','关联需求','状态'],acceptanceFor(entry.kind).slice(0,5).map((s,i)=>['DS-AC-'+String(entry.start+i).padStart(3,'0'),s,entry.id,'未执行'])),
    `#### 6. 权限与安全要求（${entry.id}）`,'',
    '- 允许访问本页面的身份须有当前范围读取权限；服务端再按动作验证create/update/delete/test/onOff/initialize及上传/下载/发现，不给普通用户默认管理权限。adminDataSource、myDataSource和canUseDataSource使用各自接口，直接改busType或ID不能绕过范围。',
    '- id、driverId、dataSourceId及文件key分属不同对象；子项归属、引用保护及可见部门由服务端核验。只读禁用和遮蔽不能替代权限，也不能通过界面删除定义擅自删除远端数据库、表、Topic或消息。',
    '- 凭据输入遮蔽、客户端加密、TLS、服务端可恢复密文、日志和临时文件分别治理；不承诺本人F12无法读取输入。密码、secureKey值、Cookie/Token不进持久草稿、通用日志或模型；外部连接及文件防护按模块NFR。','',
    `#### 7. 页面布局与状态（${entry.id}）`,'',...p.layout.map(s=>'- '+s),
    '- 分别呈现依赖初始化、可操作、合法无数据、字段错误、业务拒绝、技术失败与失权；维护另有提交中、未知结果核查、成功回读，测试/上传/发现有各自进度与结果。窄屏、缩放、长文本、键盘与焦点按模块非功能要求验收。','',
    `#### 8. 关联文档（${entry.id}）`,'',...entry.sources.map(s=>'- '+screenshot(s)+'。'),
    '- 对应静态证据组：'+p.sources.map(s=>'DS-SRC-'+s).join('、')+'；公共组GATEWAY、SHELL-REQUEST、BASE、CONFIG、LANGUAGE、LIST-MIXINS、VALIDATORS及CONTROLS的时间/原文/摘要见[必要原文](../evidence/ds-review-20261026/index.json)。',
    '- [核查记录](./核查记录.md) · [截图及证据索引](../evidence/ds-review-20261026/README.md) · [公共数据规则](./子页面与操作细化.md#4-字段枚举和约束) · [非功能性需求](./需求说明.md#9-非功能性需求)。全部应用验收未执行，来源差异和外部依赖独立登记。','',
  ].join('\n');
}
function section(text,n){const h=[...text.matchAll(/^## (\d+)\.[^\n]*\n/gm)],i=h.findIndex(x=>Number(x[1])===n);return i<0?'':text.slice(h[i].index+h[i][0].length,h[i+1]?.index??text.length);}
function preservedAcceptance(previous,type){
  const entries=type==='main'?MAIN:SUB,start=type==='main'?1:500,count=type==='main'?135:39;
  const expected=entries.flatMap(e=>Array.from({length:5},(_,i)=>e.start+i)).concat(Array.from({length:count},(_,i)=>start+i)).map(n=>'DS-AC-'+String(n).padStart(3,'0'));
  const actual=[...previous.matchAll(/^\| (DS-AC-\d{3}) \|/gm)].map(m=>m[1]);
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('DS published acceptance rows missing, duplicated or reordered');
  const counts=new Map(),rows=section(previous,6).split(/\r?\n/).filter(l=>/^\| DS-AC-\d{3} \|/.test(l));
  return table(['编号','操作与可检查结果','关联需求','状态'],rows.map(row=>{
    const c=row.split('|').slice(1,-1).map(x=>x.trim()),ref=c.find(x=>/^DS-\d{3}$/.test(x)),entry=entries.find(e=>e.id===ref);
    if(!entry)throw new Error('DS centralized acceptance association missing');
    const i=counts.get(ref)||0;counts.set(ref,i+1);
    const checks=acceptanceFor(entry.kind),index=type==='sub'?[0,3,4][i]:i;
    if(!checks[index])throw new Error('DS acceptance detail missing: '+ref+' '+index);
    return [c[0],checks[index],ref,'未执行'];
  }));
}
function boundaries(){return table(['历史编号','操作范围及交付边界'],[
  ['DS-101','API名称→/datasource/api/edit?optType=view&id={API配置id}，读GET apiConfig/{id}，来源禁用、四组参数只读、无提交。纳入DS-100/504详情分支。'],
  ['DS-106','Kafka名称→/datasource/kafka/edit?optType=view&id={dataSourceId}，读GET kafkaConfig/{id}；无手动添加/发现/配置/删除/保存，纳入DS-105/510。'],
  ['DS-111','部门名称进入dataSourceEdit，busType=myDataSource,optType=view，使用my/mgr/{id}；不借管理侧详情，纳入DS-110/502。'],
  ['DS-113','部门编辑使用busType=myDataSource，PUT datasource/micro/my/mgr/{id}，字段/动态规则同DS-128；所属部门读本人部门列表，driverIds仍禁用，应用验收不作完成。'],
  ['DS-114','部门删除需delete权限与人工确认，DELETE datasource/micro/my/mgr/{id}；只删定义，引用/未知结果保护同DS-129，纳入DS-110/502动作分支。'],
  ['DS-116','可用来源名称只读GET datasource/micro/my/use/{id}，无写控件，纳入DS-115/503。'],
  ['DS-117','可用数据源列表是授权结果视图，没有独立人工新增此列表对象；新增定义在管理侧/部门分区维护，再按可见性进入列表。'],
  ['DS-118','可用列表不提供连接编辑；不可因可读就调用管理PUT，维护走具有动作权限的分区。'],
  ['DS-119','可用列表不提供删除定义；无权限访问管理/部门DELETE同样必须拒绝。'],
  ['DS-121','驱动名称只读设计页query.driverId=行id,optType=view；GET driver/{driverId}及连接器，隐藏组件侧栏/底部保存、禁用拖拽。'],
  ['DS-123','驱动未使用且inside=0及update权限才可设计编辑；PUT driver/{driverId}，类型和testConnMode锁定；文件上传使用driver/modifyDriver/upload。其他字段/动态规则同DS-122。'],
  ['DS-124','驱动!used且inside=0及delete权限才提供确认删除；DELETE driver/{id}，服务端再核引用/内置标志。驱动初始化另为POST driver/init，不合并为查询或删除。'],
  ['DS-126','管理侧名称只读GET datasource/micro/{id}；query.busType=adminDataSource、optType=view，驱动/参数/文件全部禁写。纳入DS-125/501。'],
]);}
function sharedRules(){return [
  '### 对象、来源与操作矩阵','',...table(['对象/范围','列表、详情及维护','稳定标识与边界'],[
    ['驱动模板','POST driver/page/list；GET driver/{id}；POST driver；PUT/DELETE driver/{id}；POST driver/init','driverId定义模板；!used且inside=0才显示设计/删除；初始化有持久影响。'],
    ['管理侧连接','POST datasource/micro/page；GET/PUT/DELETE datasource/micro/{id}；POST datasource/micro','连接id；busType=adminDataSource；test conn2；enableSource/disableSource。'],
    ['部门连接','POST datasource/micro/my/mgr/page；GET/PUT/DELETE …/my/mgr/{id}；POST …/my/mgr','连接id；busType=myDataSource；test conn3；本人所属部门候选不等于全组织维护权。'],
    ['可用连接列表','POST datasource/micro/my/use/page；GET …/my/use/{id}','连接id；busType=canUseDataSource；仅详情和test conn4，无新增/编辑/删除；可读不表示可维护。'],
    ['API定义','POST apiConfig/page、apiDataSource/list；GET/PUT/DELETE apiConfig/{id}；POST apiConfig','API配置id独立于dataSourceId；四组请求/响应元数据，不把API Method当保存HTTP方法。'],
    ['Kafka Topic配置','POST kafkaConfig/page、kafkaDataSource/list；GET/PUT/DELETE kafkaConfig/{id}；POST kafkaConfig','本模块行dataSourceId映射query.id/path id；Topic/字段是配置子项，不代表远端创建/删除Topic。'],
  ]),
  '表内接口省略的完整前缀：驱动/连接为`/back/common/datasource`，API/Kafka配置为`/back/common/collectionconfig`；每个功能表给出完整相对路径。前缀通过MODULE_URL_PREFIX读取，不硬编码部署域名。','',
  '### 动态驱动模板、字段与序列化','',
  'driverIds为最多5个ID的有序多选。每个选中驱动以dynamicProperties定义单/多行input、number、password、select(1下拉单选/2下拉多选/3展开单选/4展开多选)、file或row，标签name、业务key、required、allowModify、parentComponent与items/defaultValue/defaultValues独立保存。组件的初始默认不是所有连接字段的固定业务默认；没有模板属性时不补造主机、端口、账号或密码必填规则。','',
  ...table(['模板属性/实例','规则与数据映射'],[
    ['type、name、key、required','按模板实例化；真实驱动的完整字段协议交付后才能接通该驱动。API驱动历史样本动态标签为Url、Method、Protocol、Json且带必填标记，不把四个标签自动当作所有驱动字段或猜其绑定key。'],
    ['parentComponent、row','12半行、24整行，row强制换行且不参与propertiesConfig有效业务key。'],
    ['select选项及默认','items[].id/name为值/显示；2/4使用defaultValues数组，其余defaultValue；0/false必须按类型回显。数字模板min/max/precision不等于当前渲染层已经传递执行。'],
    ['本地动态绑定','_$_{驱动序号}__S__{驱动名}__S__{字段key}；表单验证失败切首个错误驱动页签，保存移除全部_$_临时键。'],
    ['driverDataInfoList','每项{driverId,id,propertiesConfig:[{key,value,values}]}；key由合成键第三段还原，保留编辑原配置id；不以本地UUID代服务端id。'],
    ['文件值','上传返回{name,url}对象→提交values中“url 空格 name”字符串；读取遇字符串首空格拆url和name，后续空格保留名称。file单1/多5、format与每文件20 MiB，multipart含file/fieldName/driverId。'],
    ['动态密码','type=password新非空、非********值使用连接公钥加密；敏感input仅show-password不保证加密。保留/清空/替换必须使用后端明确语义；密钥就绪门控，失败零发送。'],
  ]),
  '### API请求与响应元数据','',
  '顶层请求严格为`{dataSourceId,name,url,method,headerParam,requestParam:{paging,pageName,pageLimitName,params},pathParam,responseParam}`。前三组请求行使用paramKey、paramNotNull、secureKey、paramType、paramValue、paramName；返回行使用paramKey、primaryKey、paramType、paramLength。当前新增通用行还带order=0、paramLength=255等未显示元数据，服务端接收白名单和未知字段处理须契约化。','',
  '每组上限300；每行paramKey/paramType必填，不把requestParam对象当数组漏掉params。参数名250、示例150、说明200字符，API名200、URL500字符。类型为string/number/boolean/object/array；Method为GET/POST/PUT/DELETE。返回长度min1、step1，无已知控件max。paging=true两个关联键必选且来自params；删除或改名立即清失效引用。名称唯一性、PATH占位语法、主键组合及分页执行算法不由元数据表自行推导。','',
  'secureKey安全值新非空且非********时用`GET /back/common/collectionconfig/apiConfig/key`公钥，以UTF-8字节RSA-OAEP SHA-256/MGF1 SHA-256加密后Base64。旧标记聚焦清、未填失焦恢复；取消加密清标记。数据源详情往返只允许当前会话内存草稿，不将安全值存入localStorage。只读view不出现新增/删除/提交，不能因模型存在而发写请求。','',
  '### Kafka Topic及字段子表','',
  '提交`{dataSourceId,kafkaConfigInfoList:[{dataSourceId,topicName,mainBody,sourceType,serialization,deserialization,columnList:[{columnName,columnType,primaryKey,columnLength,remark}]}]}`。模板子dataSourceId=0属于当前调用默认，实际归属由外层与后端契约核对，不扩大权限或自行替换ID。手动输入整框≤255，英文逗号拆分，逐名3～255且匹配`^[-_.0-9a-zA-Z]{3,255}$`，支持点；不自动trim，重复同批/已有名拒绝。','',
  '手动和自动获取新项均sourceType=mysql、columnList=[]；手动Key/Value为空、获取项为STRING。清单至少1条，每Topic数据库/Key/Value必填；mainBody可空且≤25。字段可空数组，每行名称匹配`^[_a-zA-Z][_0-9a-zA-Z]{0,254}$`且在Topic内唯一、类型必选、primaryKey=false、长度初始255且1～2147483647。枚举为'+TYPES+'。','',
  '配置弹窗使用副本，确认后回写所选全局行、取消不改变；Topic删除也按全局索引，`(pageNo−1)×pageSize+当前行索引`，删除末页后夹页、改条数回1页；不在第二页误删首条。分页仅本地slice，最终保存完整清单。GET topicName/list属于真实远端发现，必须人工发起，不因为GET认定安全或自动重试。','',
  '### 公共请求、响应与错误','',...table(['分支/资料','明确规则'],[
    ['网关与会话','父客户端经/back接收微应用request；MODULE_URL_PREFIX提供各模块覆盖值，凭据由客户端统一处理，不在文档复制秘密头或Cookie值。'],
    ['序列化','JSON普通请求，GET参数放query、其余body；FormData不能手填application/json或缺boundary。查询pageRequest默认1/20/order[{prop:id,asc:false}]，query/reset回1页。'],
    ['列表','解包data后，存在datas则取datas及total，否则取数组与length；表格状态1读取、2有数据、3空、4错误。超出分页或非法结构不是零记录。'],
    ['普通成功及HTTP202','普通接受响应返回response.data；HTTP202按公共业务拒绝reject。API/Kafka/驱动普通resolve提示成功；连接新增还读code200 tip/201 warn与msg，不能统一编造code=0。'],
    ['测试连接','草稿POST conn1，管理/部门/可用GET conn2/3/4/{id}；按返回name和status逐驱动展示0不支持/1成功/2失败。保存结果与连接结果分别判断。'],
    ['已知公共错误','1002认证失效、1003权限不足、1109进入密码修改、1012刷新按父客户端处理；字段重复/引用/并发错误DTO由后端交付，不能杜撰本模块数字码。'],
    ['超时覆盖','先取路径配置非负timeout，再取请求number timeout，否则20000ms回退；0可能无限，不能将回退值当当前每个接口生效超时。目标有限超时按DS-NFR-009。'],
    ['成功回读/错误恢复','记录身份由后端返回/查询解析，不虚构创建返回id；明确成功再回读，警告/未知结果先查。接口不接受臆造幂等键或版本头，相关契约就绪再接通。'],
  ]),
  '### AI辅助配置检查与说明草拟','',
  '保留既有[AI-003源目标字段映射规划](../AI能力规划.md#ai-003-源目标字段映射建议拟定需求)的登记与范围。本模块另补充配置检查和说明草拟规划：用户显式选择已授权驱动模板/参数元数据后，系统先排除密码、secureKey值、完整连接字符串、个人内容和真实服务地址，再允许AI检查必填遗漏、枚举/默认不一致、字段名冲突并草拟API参数说明或Topic字段映射。输出逐条列规则、影响字段和来源；没有来源的规则不得当成已实现校验。','',
  '用户逐条采纳仅更新当前草稿；AI不得自动保存、测试连接、远端获取Topic、上传、初始化、启停、删除或执行接入任务，也不得搜索其他部门数据。结果过期、模板改变或权限撤销时作废。模型失败/超时/取消回退原人工表单，取消丢弃迟到输出；引用质量、秘密过滤、延迟、token及预算按DS-NFR-015。','',
];}
function renderNfrSection(){return ['## 9. 非功能性需求','',
  '以下15项为独立交付要求，应用验收全部未执行；数值目标来源与现有实现差异见核查记录。验收在获得授权的隔离环境进行，不对生产执行压测、越权试探、连接发现或文件测试。','',
  '性能基准记录构建版本、Windows/浏览器实际版本、CPU/内存、网关/服务/数据库资源及安全策略。默认目标场景为10个独立会话、每用户最多1个在途列表请求、100 Mbps/RTT≤50ms、1万条模拟连接定义；冷/热缓存分开，驱动模板最多5个，API300行/组与Kafka1000个模拟Topic×20字段另测。预热2分钟、统计10分钟且每场景≥200样本，未达到条件不判通过。','',
  '同一时钟测点击到对应本次结果可操作；时延使用升序第ceil(p×N)项，报告P50/P95/P99/最大值、样本量及失败数。合法请求的超时、5xx、解析和错误业务结果均计失败，业务预期拒绝单列；实际外部服务和模拟服务分开。连接完成时长、服务端限流窗口、文件留存和恢复政策由批准契约定义，不能从一次静态复核推定SLA。','',
  ...table(['编号','质量属性','要求与指标/不变量','验收方法及通过条件','关联功能','状态'],NFRS.map(r=>[...r,'未执行'])),
];}
function renderDocument(type,previous){
  const entries=type==='main'?MAIN:SUB,ac=preservedAcceptance(previous,type),sourceRows=type==='main'?section(previous,8).split(/\r?\n/).filter(l=>/^\| DS-\d{3} \|/.test(l)):[];
  if(type==='main'&&JSON.stringify(sourceRows.map(l=>l.split('|')[1].trim()))!==JSON.stringify(MAIN.map(e=>e.id)))throw new Error('DS published source rows missing, duplicated or reordered');
  const intro=type==='main'?[
    '## 1. 业务目标与使用角色','','数据接入维护者管理驱动模板及连接定义，部门维护者在所属范围维护连接，使用者查看有权数据源并按授权测试；API/Kafka配置者在已有连接上描述采集元数据。角色是业务责任划分，不作为已存在的固定角色名或默认管理员权限。','',
    '## 2. 业务范围','',...table(['分区','核心对象与操作','边界'],[
      ['驱动管理','驱动查询/查看/设计/文件及初始化','初始化、上传、保存与测试分别授权；被使用/内置驱动受保护。'],['数据源管理','管理侧连接增删改查、启停、人工测试','公共资料+最多5个驱动模板实例；不创建远端数据库。'],['部门数据源','部门范围连接维护','my/mgr接口及本人部门候选，不能用管理接口替代。'],['数据源列表','可用连接查询/查看/测试','可用视图无独立增删改入口，可读不表示可维护。'],['API数据源','API定义增删改查及四组子项','配置Method/请求头/参数/PATH/返回体，不执行远端API。'],['Kafka数据源','来源下Topic及字段配置增删改查','获取Topic为人工远端动作，删除配置不等于删除Topic/消息。'],
    ]),'主文档17项及子文档13项共30项功能规格、324条功能验收；15项非功能要求另列。历史13个操作编号保留在第7节，不强行新建无独立对象的增删改功能。','',
  ]:[
    '## 1. 范围与入口','','本文件细化6类页面与条件子项，驱动设计、数据源动态模板、API参数页签与Kafka两种模态均按独立目标行为展开；[主规格](./需求说明.md)按业务操作组织。','',
    '## 2. 页面与操作覆盖','','现有截图保留原采样时间；没有本次浏览器点击、Network或新截图。正常正文、空白样本及未补图模态分别登记在[专项证据索引](../evidence/ds-review-20261026/README.md)，不把按钮存在或前端定义当业务验收通过。','',
    ...table(['页面/操作','功能编号','截图/元素','覆盖边界'],SUB.map(e=>[e.title,e.id,e.sources.map(screenshot).join('；'),e.kind==='deptList'?'历史正文空白；正常列表列头由组件定义补齐':e.kind==='sourceEdit'?'API驱动首屏及五组选项；不代表全部动态模板':e.kind.startsWith('kafka')?'列表/主表单；字段模态及远端发现按定义，无本次实拍':'历史样本及组件定义，应用提交未验收'])),
  ];
  return ['# 数据源管理'+(type==='main'?'业务需求说明':'子页面与操作需求细化'),'','<!-- 业务规格格式:plain-v1 -->','<!-- ds:generated-spec-v1 -->','',
    '修订日期：2026-10-26。正文定义业务与目标交互，依据、原系统差异、缺图与后端交付依赖集中在[核查记录](./核查记录.md)。','',...intro,
    type==='main'?'## 3. 功能需求':'## 3. 编号功能需求','',...entries.map(renderFeature),
    type==='main'?'## 4. 字段与业务规则':'## 4. 字段、枚举和约束','',...(type==='main'?[
      '驱动id、连接id、API配置id和Kafka来源dataSourceId不可互换。公共资料、模板默认与当前样本分开；API参数四组、条件分页、Kafka Topic/字段、动态属性映射、密码保留及文件生命周期详见[公共数据规则](./子页面与操作细化.md#4-字段枚举和约束)。空白属性不得自行设定业务规则。','',
    ]:sharedRules()),
    type==='main'?'## 5. 主要业务流程':'## 5. 主要流程','',
    '1. 在驱动管理查找已发布模板；有设计权限时维护类型、连接器、动态字段、静态参数及文件，经人工保存。\n2. 在管理侧或部门分区新增连接，填写公共字段、选择最多5个驱动并维护各模板参数/凭据，文件单独上传。\n3. 按需人工测试草稿或既有连接；逐驱动结果独立于定义保存状态，失败可修正，不能因进入页面自动外连。\n4. 已有连接按可见范围进入可用列表；有权用户在API中定义四组参数，在Kafka中手动或人工获取Topic并配置字段，分别保存元数据。\n5. 编辑保持稳定ID及锁定来源/驱动集合；删除、启停和初始化分别授权，保护引用，失败保留、未知结果先核。返回列表回读同范围资料，不由成功文案推断远端数据变化。','',
    type==='main'?'## 6. 验收标准':'## 6. 验收用例','',type==='main'?'以下135条集中用例与功能内85条共220条；全部未执行。':'以下39条集中用例与功能内65条共104条；全部未执行。与主文档合计324条功能验收，15项非功能验收另列。','',...ac,
    '## 7. 实现与交付边界','','页面字段、已查调用模型、相对接口、目标异常规则及布局足以支持该范围前端和契约测试开发。真实持久化与生产接入仍依赖完整驱动模板/连接器协议、后端DTO和错误结构、生成ID/唯一性、秘密保留与轮换、三种范围与动作权限、事务/并发/去重/201回执、外连网络政策及文件生命周期。相关[外部依赖](./核查记录.md#外部依赖)未交付前不允许AI自选规则，不宣称端到端就绪。','',
    ...(type==='main'?boundaries():['13个历史操作编号及其详情/设计/部门维护/可用视图边界见[主规格第7节](./需求说明.md#7-实现与交付边界)。','']),
    '### AI开发审查结论','','前端字段、控件、接口封装与布局已细化，仍有明确后端及隔离环境交付依赖。全部功能/非功能应用验收未执行；不得把文档测试通过当成数据接入可用。','',
    '### AI辅助规划汇总','','配置遗漏/枚举检查、API参数说明草拟、Topic字段映射建议属于独立规划；仅对显式授权且去秘密的元数据操作，人工采纳只改草稿，不自动保存、测试、发现或执行任务。规则见[AI辅助细则](./子页面与操作细化.md#ai辅助配置检查与说明草拟)、DS-NFR-015与既有[AI-003规划](../AI能力规划.md#ai-003-源目标字段映射建议拟定需求)。','',
    type==='main'?'## 8. 关联资料':'## 8. 来源链接','',
    '[主规格](./需求说明.md) · [子页面细化](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [专项证据](../evidence/ds-review-20261026/README.md) · [历史调研归档](./调研记录.md) · [总索引](../README.md)','',
    ...(type==='main'?[...table(['需求编号','界面依据','详细记录'],[]).slice(0,2),...sourceRows,'',...renderNfrSection()]:[]),
  ].join('\n');
}
function renderMain(previous){return renderDocument('main',previous);}
function renderSub(previous){return renderDocument('sub',previous);}
function writeDocuments(root){const dir=path.join(root,'doc/requirements/07-数据源管理');for(const [file,type]of [['需求说明.md','main'],['子页面与操作细化.md','sub']]){const target=path.join(dir,file);fs.writeFileSync(target,renderDocument(type,fs.readFileSync(target,'utf8')));}}
module.exports={MAIN,SUB,PROFILES,NFRS,acceptanceFor,renderFeature,renderMain,renderSub,renderNfrSection,writeDocuments};
