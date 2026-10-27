/* Pure offline specification renderer; never calls business services. */
const fs=require('node:fs'),path=require('node:path'),published=require('./tms-published-registry.json');
const ROOT=path.resolve(__dirname,'../doc/requirements');
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','|'+heads.map(()=>'---').join('|')+'|',...rows.map(r=>'| '+r.map(v=>String(v??'').replaceAll('|','&#124;').replaceAll('\n','<br>')).join(' | ')+' |'),''];
const f=(name,type,req='',value='',limit='',rule='',err='',state='')=>[name,type,req,value,limit,rule,err,state];
const ro=(n,r='')=>f(n,'只读','','','',r,'','读取成功后');
const input=(n,req='',len='',rule='')=>f(n,'文本',req,'',len,rule);
const sel=(n,req='',rule='',value='')=>f(n,'候选选择',req,value,'',rule);
const paging=[f('页号 pageRequest.pageNo','integer','是','1','≥1','查询/页大小变化回首页'),f('页大小 pageRequest.pageSize','integer','是','','正整数','普通列表跟随公共分页；特殊分页按本项约定')];
const api=(use,method,url,params='',read='校验响应结构及当前对象；写入后回读，不以受理代替终态')=>[use,method,'/back/tms/portal'+url,params,read];
const ctl=(name,condition,action,result='成功回读当前对象；失败保留安全上下文')=>[name,condition,action,'请求中共享动作锁；finally解锁并提示错误',result];
const PROFILES={};
function profile(k,purpose,fields,controls,flow,apis,layout,checks){PROFILES[k]={purpose,fields,controls,flow,api:apis,layout,checks};}
const overviewFields=[ro('已上线 onlineLabel / 未上线 offlineLabel / 已作废 abolishLabel','单位条；合法0与读取失败分开；不能从单次样本0推定无标签'),ro('资产分类 tagCategoryReport[]','key/value映射饼图name/value'),ro('模型统计 tagModelReport[]','key/value映射分类及数量'),ro('热门 labelList[] / name / rcount','rcount为图表读取字段；排序和统计窗口由统计契约定义'),ro('统计截止 statisticsDeadline','当前前端new Date，目标采用服务端数据截止时刻，不能把浏览器渲染时间当数据时间'),f('热门弹窗 pageRequest','object','是','pageNo=1、pageSize=10','','独立分页；切页大小回首页目标')];
const overviewAPI=[api('概览统计','GET','/common/getIndexReports','','onlineLabel/offlineLabel/abolishLabel/tagCategoryReport/tagModelReport/labelList'),api('热门更多','POST','/label/rcountPage','{pageRequest:{pageNo,pageSize}}','datas/total；name/rcount')];
profile('overview','查看授权范围内标签规模、分类、模型与热门统计。',overviewFields,
 [ctl('数字卡片','对应数量>0','进入数据标签列表；按卡片语义筛选状态，0不可点击'),ctl('五项指引','目标访问权限','模型→属性→标签→分群→画像；进入目标后独立鉴权'),ctl('更多/分页/关闭','热门统计','打开独立热门弹窗；关闭只清弹窗，不改变标签')],
 ['初始化获取概览，验证三类计数与各图表结构；失败不保留初始化0冒充有效结果。','统计时间应与结果同源；分类、模型与热门各按服务端口径，不自行计算热门或将查询次数等同rcount。','数字跳转当前三张卡片均传status=0，目标按批准状态映射分别筛选；五项指引当前history.pushState，目标同时确保目标组件加载和直达刷新一致。','热门分页读取datas/total；切页大小或重新打开重置有效页；旧响应不覆盖新页，错误与无记录区分。'],overviewAPI,
 '右侧标题“概览”；顶部绿/黄/粉三张数量卡，中部五列管理指引，下部左资产分类环图、右热门图及右上“更多”，更下方模型统计需纵向滚动。1500×1000历史图未覆盖完整底部，不推定底部尺寸。热门弹窗表格为名称、引用数及分页。',
 ['分别核对三计数、图表与真实截止时间，失败不显示0成功。','三卡片>0时进入正确状态筛选，0保持不可点击；不得全部status=0。','五项指引及直接URL都加载对应组件，刷新后路由/标题一致。','更多1/10分页读datas/total，换页大小回1，关闭不写入。','跨工作组权限变化拒绝旧响应；热门口径和统计窗口按契约回算。']);
profile('navigation','按业务对象进入六组标签管理菜单及其独立子页面。',[
 ro('菜单：数据标签总览/工作组'),ro('标签模型管理：标签模型/实体属性'),ro('数据标签体系：数据标签/用户分群/用户画像/属性分析/手工标签/任务调度配置'),ro('数据资产标签：资产标签/文件标签/文件检索/变更管理'),ro('个人中心：我的申请/我的审批/我的反馈；标签服务：API服务列表')],
 [ctl('菜单展开/收起','已取得菜单访问权','展开层级；收起侧栏保留目标页和当前对象'),ctl('菜单/指引/直接URL','已授权目标','完整相对路由匹配标题、组件和对象；业务动作再次鉴权')],
 ['从概览、全局菜单或直达进入，按本文件范围表匹配18个菜单目标，不能仅改地址而沿用上一页正文。','属性分析应加载模型/维度/条件/图表界面；我的申请应加载本人申请，不能展示用户画像或资产变更列表。','身份/授权切换清旧对象、筛选缓存和迟到响应；认证失效进入登录，不自动重发任何业务操作。'],overviewAPI,
 '顶部全局导航、左侧可滚动分组菜单、右侧标题/正文；选中项高亮；展开子菜单不改变右侧业务状态。无权限显示明确拒绝，不能以空白区域冒充可用目标页。',
 ['18个菜单与范围表路由对应，标题/正文一致。','属性分析和我的申请不复用前页残留正文。','直达/刷新/后退维持路由、选中项、对象一致。','无权菜单隐藏且直接URL/API仍被服务端拒绝。','失效认证不泄露旧对象，不自动提交或执行。']);
profile('group','查询维护工作组及成员关系，区分工作组ID、用户ID和成员关系ID。',[
 input('筛选 name/description'),...paging,ro('工作组 id/name/description/createUsername/createTime'),input('维护 name','是','≤50','trim后非空目标'),input('维护 description','','≤2000','trim'),ro('隐藏 dept','读取/common/user/main/self的mainDeptId，不由浏览器决定归属'),sel('新增成员 users[]','是','候选用户稳定ID'),ro('成员 workgroupId/workGroupId/wguid','列表关系wguid用于移除；workGroupId候选query与workgroupId提交大小写不同')],
 [ctl('查询/重置/分页','名称/说明','筛选与工作组表格联动，清空回首页'),ctl('新增/查看/编辑/删除','当前工作组id','表单name/description；删除确认影响，保护模型、标签和成员引用'),ctl('管理/查看成员、添加/移除','工作组id与关系wguid','成员独立列表；users多选提交；只读模式隐藏写入口')],
 ['工作组页POST分页；新增/修改先取得本人部门，隐藏dept必须服务端复验。','成员候选GET query {workGroupId}，添加POST {workgroupId,users}；移除DELETE以wguid，不以用户ID或组ID替代。','删除及移除需明确确认；有标签/模型/任务引用时服务端保护，不能默认级联删除。当前成员删除入口依赖可选检查钩子，目标统一确认及服务端检查。'],
 [api('工作组分页','POST','/tagworkgroup/page','{name,description,pageRequest}','datas/total'),api('详情','GET','/tagworkgroup/{id}'),api('新增','POST','/tagworkgroup','name/description/dept'),api('修改','PUT','/tagworkgroup/{id}','name/description/dept；只读字段不得覆盖'),api('删除','DELETE','/tagworkgroup/{id}'),api('成员分页','POST','/tagworkgroup/usersPage','workgroupId及pageRequest'),api('可加入成员','GET','/tagworkgroup/listUsers','query {workGroupId}'),api('加入成员','POST','/tagworkgroup/addUsers','{workgroupId,users}'),api('移除成员','DELETE','/tagworkgroup/removeUsers/{wguid}')],
 '上部名称/描述筛选和查询重置，右上新增；表格名称、描述、创建者、创建时间及操作。维护页全宽名称和描述；成员页显示姓名、操作，添加为多选弹窗。历史空列表不证明新增或成员维护已验收。',
 ['名称/描述筛选及分页正确，合法空与失败分开。','名称50/51、描述2000/2001与空白必填；dept由身份回读且服务端复验。','成员候选workGroupId、提交workgroupId准确，移除使用wguid。','取消/关闭无写；删除引用组或移除关键成员冲突后回读。','管理/查看成员与组维护分别鉴权，ID替换不能越权。']);
profile('model','按模型分类从授权元数据导入标签模型，维护模型说明、列及工作组白名单。',[
 input('分类过滤 filterText'),input('筛选 name/chineseName'),...paging,ro('分类 id/text/nodes、模型 id/name/chineseName/groupName/remark'),sel('导入 dataSourceId','是','授权来源稳定ID'),f('导入已选表','array','是','','','选择元数据表，按导入DTO提交'),input('模型 chineseName','是','≤50'),input('模型 remark','','≤100'),f('模型 columnList[]','array','是','','','name≤80/type/isPrimarykey/display/remark≤255/id；只提交选中列'),f('工作组白名单 groupList[]','array','','','','按模型ID读取/提交授权组')],
 [ctl('树过滤/节点/收起','有效分类','叶节点才读模型列表；上级选择清子上下文'),ctl('导入/批量删除','授权来源、表或选中模型','导入仅模型定义；删除须引用保护，不删除物理来源表'),ctl('模型名/修改/白名单/看板','模型id','只读/编辑模型；白名单维护独立权限；看板读取标签报表')],
 ['先queryModelCatalogTree再按分类读取分页；分类名称、归属与导入目标必须一致。','来源候选→元数据表分页→选表→importMetaDataToTagModel；导入失败保留选择，响应丢失先回读导入结果。','模型编辑当前仅PUT updateTagmodel，不能据add路由补造POST新增模型；name源表名只读，修改chineseName/remark及选中列，主键和显示列检查按代码/后端契约。','白名单不是模型删除许可；模型/属性/标签/调度引用保护、结构变更策略由服务端原子校验。'],
 [api('分类树','POST','/tagmodelcatalog/queryModelCatalogTree'),api('分类新增','POST','/tagmodelcatalog','分类模型按组件；name和归属契约补齐'),api('分类修改','PUT','/tagmodelcatalog/{id}'),api('分类删除','DELETE','/tagmodelcatalog/{id}'),api('模型分页','POST','/tagmodel/page','分类及name/chineseName/pageRequest'),api('来源候选','POST','/common/datasource/list'),api('元数据表分页','POST','/common/metaTable/findPage','dataSourceId及分页筛选'),api('导入模型','POST','/tagmodel/importMetaDataToTagModel','{metaTableId:选中表id数组,catalogId,dataSourceId,groupId}'),api('模型详情/修改','GET / PUT','/tagmodel/{id}','修改chineseName/remark/id/columnList/catalogId'),api('删除模型','DELETE','/tagmodel/{id}'),api('批量删除','DELETE','/tagmodel/removeBatch','选中模型集合，准确DTO由契约交付'),api('白名单读取','POST','/tagmodel/findWhiteList'),api('白名单修改','PUT','/tagmodel/modifyWhiteList/{id}'),api('标签看板','GET','/label/getLabelReport','query当前模型')],
 '左模型分类树及分类操作，右名称/中文备注筛选、导入和批量删除、列表分页。导入弹窗先来源再表格选择。编辑上部表名/中文备注/说明，下部宽列表含主键与显示选择，底部取消/提交。历史只显示分类框，正常表格布局依据静态组件。',
 ['叶分类查询正确，非叶不沿用旧模型；分类变更清选择。','来源→表候选→导入映射准确，取消不导入，结果未知先回读。','模型编辑PUT及选中列转换正确，name不可伪改；不补造模型POST。','批量删除逐项结果与引用保护，不删除源库表。','白名单直接API鉴权；撤权后缓存/看板不泄露数据。']);
const propFields=[input('筛选 modelName/columnName/name'),...paging,ro('属性 id/modelId/modelName/columnId/columnName/name/type/unitFormat/remark/groupName/createTime/updateTime'),sel('表 formData.modelId','是','模型输入返回id/name/groupId；切模型清列与字典'),f('列 formData.columnInfoList / tagModelPropertyList','array','是','[]','','columnId/columnName/name/type/unitFormat/dictList；列候选按modelId'),input('显示名 name','是','≤20','trim'),ro('数据类型 type','来自所选列，新增不可改'),input('单位格式 unitFormat','','≤20'),f('字典 dictList[]','array','','[]','','name/code各≤50且非空、精确去重；remark≤100；modelId随模型')];
const propAPI=[api('属性分页','POST','/tagmodelproperty/page','{modelName,columnName,name,pageRequest}','datas/total'),api('模型候选树','POST','/tagmodelcatalog/queryModelCatalogWithTagModelTree'),api('列候选','POST','/tagmodelcolumn/list','{modelId}','id/name/remark/type'),api('属性详情','GET','/tagmodelproperty/{id}'),api('新增属性','POST','/tagmodelproperty','modelId/modelName/groupId/columnInfoList/tagModelPropertyList；精简DTO由契约确认'),api('编辑属性','PUT','/tagmodelproperty/{id}','modelId/columnId/columnName/name/type/unitFormat/remark/dictList'),api('删除属性','DELETE','/tagmodelproperty/{id}')];
profile('property','查询实体属性并维护显示信息与字典，保护已有标签规则引用。',propFields,
 [ctl('查询/重置/分页','表名/列名/显示名','获取属性列表'),ctl('新增/编辑/删除','属性id或授权模型','新增进入propAdd，编辑propEdit，删除确认引用影响'),ctl('字典','属性行','显示字典信息；编辑页维护名称/编码/备注')],
 ['分页显示表、列、显示名、类型、单位、字典、工作组、创建和修改时间。','编辑按id回填；切模型重取列并清旧列/字典，不用名称代替columnId；字典作用域为当前属性。','删除前检查规则、分群、画像与调度引用；不可因列表空就认定无引用；失败保留记录。'],propAPI,
 '顶部表名/列名/显示名筛选，右上新增，下部属性宽表、操作及分页；编辑页模型/列/显示名/类型/单位，字典明细表位于下方。',
 ['三筛选和实际列绑定正确，失败与空态分开。','编辑回填稳定modelId/columnId，切模型不保留旧列/字典。','显示名20/21、单位20/21、字典50/51及备注100/101边界。','字典名称/编码空白和重复被拒；取消无保存。','引用属性删除/并发修改由服务端拒绝或按批准迁移规则处理。']);
profile('propertyAdd','在所选模型上批量建立列属性及其字典信息。',propFields.slice(2),
 [ctl('表名选择/列新增','有效modelId','读取列候选；新增空行并选中，未选表先提示'),ctl('选择列/显示名/单位','当前列ID','columnId回填columnName/type/name；显示名与单位可编辑'),ctl('删除列/字典新增删除/确定取消','已选本地行','删除仅草稿；字典确定写回当前行、取消丢字典草稿'),ctl('确定/取消/返回','至少有效列、有效表','校验全体实际提交列；保存后返回属性页，不执行标签')],
 ['初始modelId=0、modelName空、列数组空；选模型记录groupId并清旧列；列ID与显示名分开。','现有校验multipleSelection却提交columnInfoList全体，目标校验集合与提交集合一致；不允许未选中无效行绕过校验。','字典弹窗按当前列深拷贝；名称/编码非空及唯一；不能混入上一行dictList，也不能取消后仍修改父草稿。','新增POST /tagmodelproperty；成功回读属性/字典，超时先按模型及列检查防重复；取消和返回不写。'],propAPI.slice(1,5),
 '右上返回；表名选择占左半宽，下一行全宽列信息及右侧新增/删除，表列依次勾选、列名、显示名、类型、单位、字典；底部固定取消/确定。字典弹窗独立表及按钮，可滚动，避免遮挡底部提交。',
 ['未选表新增被阻止；选模型后列候选正确，换模型清行。','显示名/单位及字典边界、重复检查覆盖实际提交集合。','取消字典不污染父草稿，切两列字典不串行。','选中集合与POST tagModelPropertyList一致，无效未选行不混入。','取消无写；重复点击/响应丢失先回读，服务端拒绝越权模型列。']);
profile('dataTag','按私有、授权、公共分区维护标签规则、版本与申请使用。',[
 f('分区','页签','是','','私有/授权/公共','分区改变授权语义，不是共享一套写权限'),input('筛选 name/status / labelName/groupId/applyGroupId'),ro('分类 categoryId/publicCategoryId/text/nodes'),...paging,
 f('基本 label','object','是','','','categoryId/name/groupId/modelId/modelType/isAuto/autoCondition/remark/dataType/bizType/sqlinfo/execPolicyCycle/execPolicyId'),f('规则 tags/conditions/labelReferTables','array','按模式','','','属性组合和SQL分开；组合关系含稳定模型/列ID'),f('授权/公开申请','object','按动作','','','groupId/publicCategoryId/reason等只交授权字段'),ro('版本/结果/授权对象','labelId与categoryId不能互换')],
 [ctl('分区/树/查询','当前可见分区及分类','按分区加载分类和标签；非叶不沿用旧列表'),ctl('新增/规则步骤/保存','授权工作组、模型、创建类型','先基本信息后组合/SQL；保存不代表运行或上线'),ctl('上线/下线/作废/公开/授权/撤回','标签id、当前状态、引用关系','显示动作影响并确认，分别请求；返回后回读审批和标签状态'),ctl('详情/版本/样本/授权查看/反馈','标签稳定ID','只读结果和版本比较不执行SQL；反馈单独写入')],
 ['私有分区拥有维护入口，授权分区显示授出/获授/公开结果，公共分区可发申请；每个目标独立鉴权。','规则type=1组合、type=2 SQL，modelType单/关联模型分别校验；切模型清旧属性/条件/SQL联动；标识符和值必须服务端结构化验证，不直接拼接执行客户端SQL。','查看分支可能以categoryId读取label详情，目标区分分类ID与标签ID；保存校验与序列化按组件，完整嵌套DTO和枚举由后端契约补齐。','上线/下线/作废及公开/授权分别按服务端状态机，不能把按钮存在当完整状态机，也不将审批通过等同计算完成。','历史版本比较、授权组和样本按当前标签范围；结果数量、刷新时间与执行状态分开。'],
 [api('分类/公共分类','POST','/labelcategory/loadCategory','分区/组上下文；公共使用/labelcategory/load/public'),api('标签分页','POST','/label/page','分类/分区/筛选/pageRequest'),api('标签详情','GET','/label/{id}'),api('新增','POST','/label','{label,tags,conditions,labelReferTables,...}'),api('修改','PUT','/label/{id}','与创建模式一致的有效DTO'),api('删除','DELETE','/label/{id}'),api('操作处理','POST','/label/handler','稳定标签ID和批准动作DTO，不自造枚举'),api('公开','POST','/label/public/label'),api('撤回','POST','/label/withdraw/label'),api('授权申请','POST','/labelapply'),api('版本','POST','/label/version'),api('版本比较','POST','/label/version/compare'),api('授权组','POST','/labelapply/auth/group'),api('最近结果','GET','/labeldivreport/getLastLabelDivReport/{id}'),api('结果明细','POST','/labeldivreport/findLabelDivReportDetailBySql','授权标签/结果上下文；查询不获得任意SQL执行权'),api('手工标记结果','POST','/labelmanual/insertLabelManualName','显式标记动作；非只读')],
 '上方私有/授权/公共页签；左分类树与过滤，右列表及当前分区动作。规则页顶部两步，基本信息在前，属性组合或SQL编辑在后；版本、样本、授权、反馈有独立目标。历史截图仅空分类，嵌套编辑布局依据组件，不能声称已逐步实拍。',
 ['私有/授权/公共页签与分类、查询、独立权限一致。','基本信息与组合/SQL步骤、单/关联模型切换不残留旧条件。','labelId和categoryId分开，详情/版本/样本读取正确对象。','保存、计算、上线/作废申请与审批终态分别回读；冲突保留安全草稿。','SQL/对象/字段服务端授权验证，直接API不能绕过分区和工作组。']);
profile('userGroup','以标签规则定义用户分群，查看数量变化和执行记录。',[
 input('筛选 name/groupId/beginTime/endTime'),...paging,ro('分群 id/name/divReportCount/createType/createUsername/groupName/isAuto/createTime'),input('分群 name','是','≤50'),sel('groupId','是','myGroups授权组'),f('规则 modelId/modelType/labelReferTables/conditions/tags','object/array','是','','','单模型或关联模型；属性来自tagmodelproperty/list'),f('更新 isAuto','integer','是','0','0手工/1例行'),sel('周期 execPolicyCycle / 策略 execPolicyId','例行时是','0～4周期；validity=0策略；切周期清策略'),input('说明 remark','','≤500'),ro('实例状态','-1未知/0等待/1执行/2成功/3失败为详情组件读取；不等于标签发布状态')],
 [ctl('查询/重置/分页','名称/组/时间','列表日期两端和选择清空同步'),ctl('新增/编辑/删除','当前分群id','编辑或删除例行分群先查taskInSchedule；服务端仍原子复验'),ctl('详情/规则/执行','分群与结果id','详情按1/20和id降序读取历史；执行有副作用，确认后才提交')],
 ['分群列表固定isGroup=1；工作组候选使用稳定ID。','两步基本信息/规则；模型无属性时阻止进入；例行时周期/有效策略必选，0周期不能按空过滤。','提交label及conditions/tags/labelReferTables，isGroup=1与分群名，精确DTO见外部依赖；关联模型的条件清理按当前模型集合。','任务调度中不得改删；执行POST {id}，客户端timeout:0不是有限超时保证；查最近报告/历史确认实例结果，不以提示成功代替执行终态。'],
 [api('分群分页','POST','/label/page','{isGroup:1,name,groupId,beginTime,endTime,pageRequest}'),api('工作组','GET','/tagworkgroup/myGroups'),api('有效策略','POST','/execpolicy/list','{policyType,validity:0}'),api('调度检查','POST','/label/taskInSchedule','{id,isGroup}'),api('详情','GET','/label/{id}'),api('保存分群','POST','/label','label及tags/conditions/labelReferTables，新增/编辑具体语义须契约明确'),api('删除','DELETE','/label/{id}'),api('执行','POST','/label/execTask','{id}；timeout:0'),api('最近结果','GET','/labeldivreport/getLastLabelDivReport/{id}'),api('历史','POST','/labeldivreport/page','{labelId,beginTime,endTime,pageRequest:{pageNo:1,pageSize:20,order:[{prop:"id",asc:false}]}}')],
 '上部名称/工作组/时间筛选，右上新增分群；列为名称、数量、时间、创建方式、创建者、工作组、更新方式及操作。详情上部规则和执行入口，下部时间筛选、趋势图及结果列表；编辑两步，例行时出现周期/策略。',
 ['isGroup=1和筛选正确，清日期不带旧两端。','两步规则、模型属性和例行有效策略联动；0周期有效。','调度中编辑/删除被拒，前端检查与服务端原子检查一致。','执行受理与报告成功分开，结果未知不自动再执行。','历史20条及id降序正确，越权结果/导出拒绝。']);
profile('portrait','创建并查看自定义或SQL用户画像及其分析模板。',[
 input('筛选 pictureName/groupId'),...paging,ro('画像 id/pictureName/createType/createUsername/createTime/groupName/bizType'),f('创建方式 createType','integer','','','1界面创建/2保存结果'),f('画像类型 bizType','integer','是','','1自定义/2 SQL'),input('画像 pictureName','是','≤50'),sel('groupId/modelId','是','授权工作组和模型；关联模型含labelReferTables'),f('自定义 tags/conditions','array','自定义时是','','','属性组合条件'),input('SQL sqlinfo','SQL时是','','保留语法文本；服务端仅授权只读分析'),f('图表 pictureTemplates/pictureDivReport','array/object','','','','name/templateType/pictureType/rowName/columnName/modelId/chartId等；模板按当前结果')],
 [ctl('新增/类型选择','有新增权限','弹窗选自定义或SQL，进入createType=1的编辑目标'),ctl('步骤/分析/新增图表/保存','授权模型和有效条件','分析调用execFirstTaskReport，图表execSecondTaskReport，保存picture；分析本身可能执行任务'),ctl('查看/编辑/删除','当前画像ID','view整体只读；删除确认且引用保护')],
 ['列表按pictureName/groupId分页；新增选择bizType=1/2，createType=1/2与bizType含义不同。','画像分析先选择模型/组合条件或SQL，再生成结果，图表按属性/行列和模板配置；这些计算未授权执行，不因打开页面而宣称可用。','SQL头只读，用户SQL段单独保存；Base64仅序列化不构成加密或SQL安全。','execFirst/SecondTaskReport显式timeout:0；目标异步可查询任务与有限等待、结果未知先查，保存不等于新计算已完成。'],
 [api('画像分页','POST','/picture/page','pictureName/groupId/pageRequest'),api('读取画像','GET','/picture/queryLabel/{id}'),api('保存画像','POST','/picture','label/tags/conditions/labelReferTables/pictureTemplates/pictureDivReport按模式'),api('删除画像','DELETE','/picture/{id}'),api('SQL头','POST','/label/getSqlHead'),api('首步计算','POST','/picture/execFirstTaskReport','模式对应label/conditions等；timeout:0'),api('图表计算','POST','/picture/execSecondTaskReport','pictureTemplates及当前结果上下文；timeout:0')],
 '列表筛选名称/组，新增弹窗两种画像，表格展示创建方式和画像类型。编辑含规则、结果和图表配置，SQL编辑器与只读头分区；图表弹窗字段条件显示，失败不能把上一画像图表当新结果。',
 ['createType和bizType分开展示，列表/直达读取同一画像。','自定义/SQL及单/关联模型切换清失效规则。','首步、图表、保存为独立请求，失败不推进成功步骤。','SQL值不拼权限；服务端拒绝写SQL和越权列。','timeout:0遇断网保持未知态并查任务，取消不宣称服务端已停止。']);
profile('analysis','按授权模型、统计维度及条件执行属性分析并切换图形。',[
 sel('所属模型 modelId','是','选择后清countItems/searchItems并加载属性','0'),f('统计项 countItems[].id','array','至少一项','[{id:""}]','','dimensionList仅当前模型属性；新增/删除维度'),f('筛选 searchItems[]','array','','[]','','id/condition/value；字典属性只支持=/!=；无值操作不要求value'),f('关系 method','string','是','and','and/or'),f('图形 charType','integer','是','2','1树图/2柱图'),ro('分析结果 renderData/children','树节点name/nameKey/value/children；零值不当缺失')],
 [ctl('模型/维度/条件增删','当前有效模型','换模型清维度和条件；换属性重载字典并清旧操作和值'),ctl('统计/图形切换','模型、至少一维度、完整条件','提交统计；图形切换仅重绘已有结果，不重复执行')],
 ['属性分析应呈现此模型/维度/条件界面，历史K-TMS-008显示用户画像是错目标证据，不用于本页字段和布局。','条件操作为=/!=/>/</is null/is not null；有字典时仅=/!=；当前>和<用整数字符串正则，目标数值类型/负数/小数范围由属性契约决定，不能默默截断。','POST {modelId,method,dimensionList,conditionList}，conditionList当前拼接表达式并剥两端引号；目标服务端严格解析授权标识符/操作和值、参数化执行，客户端拼串不等于防注入。','失败清忙碌保留安全条件并标旧结果时间；零结果单独空态；模型变化后旧统计不能落屏。'],
 [api('属性候选','POST','/tagmodelproperty/list','{modelId}'),api('字典候选','POST','/tagmodelpropertydict/list','{propertyId}'),api('属性分析','POST','/tagAnalysis/userAnalysis','{modelId,method,dimensionList,conditionList}','renderData.children及树节点结构')],
 '独立分析页无普通列表分页、无保存；顶部模型选择，统计项可增删、条件组和and/or，统计按钮，树图/柱图切换及主图形区。布局依据静态模板，历史错误目标图不作产品样式。',
 ['属性分析路由展示模型/维度而非用户画像列表。','模型必选且至少一维度；字典和无值操作联动正确。','and/or及dimensionList/conditionList映射准确，0值可作为合法条件。','切图不发新分析；慢A模型结果不覆盖B。','条件引号/恶意标识符/越权模型由服务端安全解析和拒绝。']);
profile('manual','维护手工标签、标记记录、评价及冲突组关系。',[
 f('页签','页签','是','','手工标签/冲突标签'),input('树过滤/筛选 name/status'),ro('categoryId/groupId/labelCode/id','分类ID、工作组ID、标签ID、标记关系ID分开'),input('手工名称 name','是','≤100','trim'),input('remark','','≤255'),f('手工标签 type','integer','','0','0','新增编码UUID且只读'),f('评价 score/comment','number/text','是','score=5','','单选标签后评价；comment非空'),input('冲突组 name','是','≤50'),sel('冲突组 groupId','是','编辑禁改组'),f('冲突成员 manualIdList','array','是','[]','','同分类约束按服务端验证')],
 [ctl('页签/树/查询','可见组及分类','切页签清列表缓存，非叶不显示旧表'),ctl('新增/修改/删除/发布状态','手工标签ID','编码只读，状态独立操作并确认；不能据空树认为无功能'),ctl('评价/标记详情/取消标记','一个标签或标记关系','评价score/comment；取消标记有副作用，不是关闭详情'),ctl('冲突组/标签管理/添加移除','冲突组ID、manualIdList','约束当前分类；移除POST {id}，不是删除标签')],
 ['历史手工页是双页签和根分类空态；静态组件定义分类叶列表、评价、状态、标记与冲突组管理。','新增手工labelCode由UUID生成且type=0，groupId/categoryId取授权上下文；服务端验证编码唯一和归属。','标记详情用{manualId,page,rows}，unsign用标记关系id；冲突组删除不等于标签删除，引用与冲突规则由后端原子核验。','评价与取消标记可能直接提交，目标显式确认影响、共享锁和结果回读；取消弹窗不撤销已提交动作。'],
 [api('手工分类','POST','/labelcategory/load/manual'),api('手工列表','POST','/labelmanual/page','当前分类、name/status/pageRequest'),api('新增','POST','/labelmanual','name/labelCode/type=0/categoryId/groupId/remark'),api('读取/修改','GET / PUT','/labelmanual/{id}'),api('删除','DELETE','/labelmanual/{id}'),api('状态','PUT','/labelmanual/status/{id}','状态DTO由契约提供'),api('评价','POST','/labelmanualcomment','id/score/comment等有效字段'),api('标记明细','POST','/labelmanual/sign/detail','{manualId,page,rows}'),api('取消标记','DELETE','/labelmanual/unsign/{id}','标记关系ID'),api('冲突组分页','POST','/labelconflictgroup/page'),api('冲突组新增/修改','POST / PUT','/labelconflictgroup/{id?}','新增无id尾；name/groupId/remark'),api('冲突成员添加','POST','/labelmanual/conflict/add','{conflictId,manualIdList}'),api('冲突成员移除','POST','/labelmanual/conflict/remove','{id}')],
 '顶层手工/冲突页签，手工左侧分类过滤树和操作，右侧叶分类列表；当前历史根节点右侧空白。手工编辑标签信息页签含编码、名称、描述；冲突组为独立列表/表单及成员管理，评价和标记为弹窗。',
 ['根分类空态和叶列表分开，切页签不串缓存。','手工名100/101、冲突名50/51、描述255/256边界。','标记关系id和manualId分开，取消标记不删除标签。','冲突成员同分类约束、添加/移除与组删除原子保护。','评价/状态/取消标记分别鉴权和回读，重复点击只产生批准效果。']);
const scheduleFields=[input('策略名称 policyName','是','≤40','trim'),f('策略类型 policyType','integer','是','0','0分钟/1小时/2天/3月/4年'),f('日期 effectiveTime','date','是','空字符串','','yyyy-MM-dd'),f('时刻 effectiveTimeSeclet','time-select','是','空字符串','00:00～23:50，5分钟步长','提交effectiveTime=日期THH:mm:00'),f('频率 frequency','integer','是','空字符串','分钟15～59/小时1～23/天1～30/月1～11/年1～3','改类型清频率和说明'),f('有效性 validity','integer','是','空字符串','0有效/1无效','0不是空'),input('说明 description','','≤200','trim；频率变化生成每隔N单位执行一次'),ro('五次计划 last5TimeList','第1项为起点，再累计四次间隔；不是已执行历史')];
const scheduleAPI=[api('策略分页','POST','/execpolicy/page','policyName/policyType/validity/pageRequest','datas/total'),api('详情','GET','/execpolicy/{id}'),api('新增','POST','/execpolicy','policyName/policyType/effectiveTime/frequency/validity/description；辅助键规范由契约定义'),api('修改','PUT','/execpolicy/{id}','有效策略表单'),api('删除','DELETE','/execpolicy/{id}'),api('引用任务','POST','/execpolicy/job/page','策略ID及分页，实际参数见调用组件'),api('暂停引用任务','POST','/execpolicy/job/schedule/pause','任务行参数'),api('恢复引用任务','POST','/execpolicy/job/schedule/resume','任务行参数')];
profile('schedule','检索调度策略并查看引用任务，分别维护策略及任务调度资格。',[
 input('筛选 policyName/policyType/validity'),...paging,ro('策略 id/policyName/policyType/validity/description/createUsername/createTime/count'),ro('引用任务 jobName','任务ID与policyId分开'),...scheduleFields],
 [ctl('查询/重置/分页','策略名/类型/有效性','保留0类型及0有效性'),ctl('新增/名称查看/编辑/删除','策略id','view只读，删除确认引用保护'),ctl('引用任务数/暂停恢复','策略及任务ID','引用弹窗独立分页；只改变任务调度资格')],
 ['策略列表查execpolicy/page，引用数打开job/page；不可将策略ID用于任务暂停恢复。','有效性不是运行状态；暂停调度不保证终止在跑实例，错过执行和补跑按调度契约。','编辑/删除被引用策略须展示影响并服务端原子保护；成功后回读策略和引用任务，不默认级联删任务。'],scheduleAPI,
 '顶部策略名/类型/是否有效筛选，右上新增，表格名称/类型/有效性/说明/创建者/时间/引用任务数及操作；引用弹窗独立表及分页。',
 ['筛选0类型和0有效性不丢，清空回首页。','新增/编辑/view与40/200边界一致。','引用任务按策略查询、暂停恢复按任务，不混ID。','被引用策略删除/并发变更保护，失败不提前移除。','暂停不显示为执行中断或计算成功，审计区分策略/任务。']);
profile('scheduleForm','定义可复用的标签计算周期、起点、频率及有效性。',scheduleFields,
 [ctl('类型/频率/日期/时间','合法类型及频率','联动候选、说明、五次预览；改类型清旧预览目标'),ctl('提交/取消/返回','必填有效','POST新增或PUT编辑；取消草稿不启用任务')],
 ['新增默认policyType=0、有效性未选；日期与时刻分控件，提交用T连接，与元数据模块不同。','五次预览第一项等于起点，之后逐次加间隔；标题“最近五次执行时间”目标改为“计划执行预览”，不能据预览宣称已执行。','当前日期字符串直接与毫秒比较有误，目标合并日期时刻后按批准时区与服务端时钟校验；历史起点编辑保留规则由调度负责人提供。','类型变化要清频率、说明和旧预览；后端复算跨月末、闰年、时区/夏令时、补跑与并发。'],scheduleAPI.slice(1,4),
 '双列表单依次策略名称/类型、开始日期/选择时间、间隔频率/有效性、策略说明；底部取消/提交，右上返回。五次预览在表单下方条件出现；view不显示可写预览。',
 ['新增类型0且有效性未选，0有效可提交。','分钟14/15/59/60及小时23/24、天30/31、月11/12、年3/4边界。','effectiveTime提交含T和秒，Seclet辅助键不误当服务端规范。','五次含起点，改类型不留旧预览；过去/当前/未来按服务端时区校验。','保存不运行标签，取消无写，结果未知先查策略防重复。']);
const assetFields=[ro('编码 code','新增UUID生成且禁改，不是空默认'),input('名称 name','是','≤50','trim后非空'),input('规则 ruleContent','是','≤255','trim；语法由资产标签契约定义，不默认SQL'),input('描述 remark','','≤255','trim'),ro('归属 catalogId','来自选中叶分类；当前parseInt路由，目标验证完整合法ID'),ro('id/state/标记资源数','state1待发布/2发布审核中/3已发布/4已作废；不是数据标签状态枚举')];
const assetAPI=[api('分类树','GET','/configtagcatalog/queryTagTree'),api('列表','POST','/configtag/page','catalogId/name/code/beginTime/endTime/pageRequest','datas/total'),api('详情','GET','/configtag/{id}'),api('新增','POST','/configtag','code/name/ruleContent/remark/catalogId'),api('修改','PUT','/configtag/{id}'),api('删除','DELETE','/configtag/{id}'),api('发布','GET','/configtag/publishConfigTag/{id}','有副作用，禁止预取/自动重试；目标改为非GET需契约升级'),api('标记资源分页','POST','/configtagmapping/page','标签ID及分页'),api('取消关联','DELETE','/configtagmapping/{id}','关联ID，不是标签ID')];
profile('asset','按分类维护资产标签、发布流程与资源标记关系。',[
 input('筛选 name/code'),f('时间 dataRange/beginTime/endTime','date range','','[]','','起止转getTime毫秒，清空两端空字符串'),...paging,ro('分类 id/name/childNodes/isLeaf'),...assetFields],
 [ctl('树过滤/节点/分类维护','当前分类','叶节点加载列表；目录name必填≤100，维护分类独立鉴权'),ctl('查询/重置/展开','名称/编码/时间','时间单位毫秒，不套分群日期格式'),ctl('新增/名称查看/编辑/删除/发布','当前标签状态和id','新增须有效叶分类；发布是写操作，成功回读状态'),ctl('标记资源数/取消关联','标签及关联ID','关联独立分页；取消关联确认，不删除资源')],
 ['分类可能包含内置标签；是否可修改/删除/新增由服务端规则，不能按显示按钮推断内置可写。','新增catalogId来自当前叶，UUID编码只读；历史四条行政区标签及未来创建日期只是样本，不作默认数据和时钟依据。','发布GET有副作用，禁止以页面预加载、刷新、重试或链接预取触发；目标契约迁移非GET并保留防CSRF/幂等。','标记数打开映射页，取消用映射ID；删除标签保护映射/申请/规则引用，不默认删除被标记资产。'],assetAPI,
 '左分类过滤树和操作，右名称/编码/时间筛选及展开，右上新增；列表名称可查看、编码、描述、创建时间、资源数、状态和操作，底部分页；关联弹窗单独列表。',
 ['叶分类过滤正确，内置标签保护按服务规则，非叶不沿用旧表。','名称50/51、规则255/256、描述255/256及UUID禁改。','发布仅显式确认触发一次GET，预取/刷新不触发；状态回读。','取消关联使用映射ID，不删标签/资源，引用冲突可恢复。','时间毫秒与清空正确，所有维护/发布/关联操作服务端鉴权。']);
profile('assetForm','在授权分类下创建资产标签编码、名称和规则。',assetFields,
 [ctl('名称/规则/描述','当前叶分类及有效编码','分别trim；必填校验定位name或ruleContent'),ctl('提交/取消/返回','长度和规则有效','新增POST，编辑PUT，view禁写；取消不发布')],
 ['新增生成UUID编码，catalogId来自路由但必须与授权叶分类匹配；编码禁用不构成服务端可信。','name≤50且非空，ruleContent≤255且非空，remark≤255；规则不是任意可执行SQL，不自动运行。','成功回读标签对象和所在分类；超时按编码检查创建结果，不能无条件重发；取消丢草稿且不调用发布。'],assetAPI.slice(2,5),
 '表单首行左编码禁用、右名称带50计数，第二行左规则，第三行全宽四行描述；底部固定取消/提交，右上返回。历史新增编码有值，不能写默认为空。',
 ['新增UUID有值、编码禁用、catalogId匹配叶分类。','名称/规则空白、50/51及255/256边界，错误定位。','POST新增/PUT修改/view只读，不发生自动发布。','取消/返回不保存，超时先按编码回读。','伪改code/catalogId和越权分类由服务端拒绝。']);
profile('file','浏览授权FTP来源目录并维护文件标签关系。',[
 ro('来源 dataSourceId/path','来自已登记FTP；没有授权根路径则不浏览'),ro('面包屑 initPath/initPathList/pathList','限制在授权根内，不依赖客户端字符串检查'),ro('文件 fileList[]/name/path/标签','文件夹和文件操作分开'),sel('新增FTP dataSourceId','是','候选dataSourceName/dataSourceId'),f('文件标签 tagInfo.tags','array','','[]','','仅授权已发布标签；保存关联不上传文件')],
 [ctl('FTP节点/文件夹/返回','已授权dataSourceId和根路径','读取目录；失败恢复原路径，不上溯授权根之外'),ctl('新增FTP分类','候选来源ID','弹窗选择已有FTP来源后登记，不新增密码字段'),ctl('文件标签/保存/取消','当前文件和标签','读标签草稿，保存updateSftpTag；取消不改变关联')],
 ['加载已登记来源；有来源时自动读取首项目录，故打开不等于零请求，但本次未进入。历史FTP分类暂无数据不能证明右侧文件布局已实拍。','目录POST {dataSourceId,path}；文件夹进入/返回失败恢复面包屑，切来源后旧目录响应不能落屏。','新增来源是业务登记POST /ftpcatalog；凭据由数据源模块管理，标签页不采集FTP密码。','保存当前文件标签原子提交，服务端规范化路径、拒绝../及跨根/跨来源，符号链接和编码路径按来源安全策略。'],
 [api('已有FTP来源','POST','/ftpcatalog/list'),api('可登记FTP来源','GET','/ftpcatalog/findAllFtpService'),api('登记来源','POST','/ftpcatalog','{dataSourceId,dataSourceName}'),api('目录文件','POST','/ftpcatalog/getFTPFileList','{dataSourceId,path}','文件列表结构按来源契约'),api('更新文件标签','POST','/ftpcatalog/updateSftpTag','{resourceName,resourceId:dataSourceId,resourceType:17,tagIds,ftpUrl:path}')],
 '左FTP分类及新增/收起，右有来源时显示面包屑和文件区域；标签弹窗维护选择。历史只支持左分类空态，文件图标、详细列和标签弹窗依据静态组件且未新实拍。',
 ['无来源明确空态，有来源按授权首项加载目录。','目录/返回失败路径回滚，切来源丢弃旧响应。','新增选择稳定来源ID，取消不POST登记。','标签保存只修改当前文件关系，取消不提交，不上传/删除文件。','跨根、编码穿越、符号链接及越权文件访问由服务端拒绝。']);
profile('retrieval','按文件名和资产标签检索授权文件。',[
 input('文件名 resourceName','','','trim'),sel('标签 tagName/tagId','','展示name、值id；清空同时清tagId'),...paging,ro('文件 name/url/标签信息/createTime'),f('候选 name/state/rows','object','','state=3；rows=20','','输入关键词候选rows=1000；不是总容量上限')],
 [ctl('标签展开/远程输入/清空','可见已发布标签','空输入取20，关键词取1000；失败finally清loading，清空ID'),ctl('查询/重置/分页','文件名、标签id','读授权文件，不下载或执行文件')],
 ['按名称模糊规则需检索契约；tagName模型当前绑定id，目标展示名和提交tagId分开。','标签候选configtag/list {name,state:3,rows}；旧关键词慢回包不能覆盖新词，失败不留下永久loading。','findAllFileWithTag按当前条件分页；文件路径按文本展示，不将路径当可直接访问URL，也不据返回路径授权下载。'],
 [api('已发布候选','POST','/configtag/list','{name,state:3,rows:20或1000}'),api('文件检索','POST','/ftpcatalog/findAllFileWithTag','{resourceName,tagName,tagId,pageRequest}；仅契约允许键','datas/total；name/url/标签/createTime')],
 '顶部文件名输入、远程标签选择、查询/重置；下方序号、文件名、文件路径、标签信息、创建时间及分页。长路径局部换行/提示，错误不显示为无文件。',
 ['文件名与标签ID筛选正确，清标签不残留tagId。','20/1000是候选请求数，迟到响应与失败锁可恢复。','列表datas/total、换页和重置正确，不把路径自动当下载URL。','合法空与来源失败区分，重试保留当前有效查询。','越权文件、路径和标签候选服务端过滤，无凭据泄露。']);
profile('assetAudit','分别提交资产标签变更/作废申请并审核，回读标签生效状态。',[
 f('页签 fromType','string','是','apply','apply/audit'),input('筛选 name/processType/auditStatus'),...paging,ro('申请 id/tag.name/tag.code/processType/createUsername/createTime/updateTime/auditStatus'),sel('标签 tagIds','是','queryTagTree，仅选择授权标签'),input('申请 name/code/ruleContent','按变更类型','规则≤50','选择标签后详情回填'),input('remark','','≤200'),input('applyReason','变更时是','≤200'),f('审核结论 auditStatus','integer','审核时是','','2通过/3不通过'),input('审核意见 auditOpition','审核时是','≤250','保留原Opition拼写')],
 [ctl('申请/审核页签/查询','当前授权范围','两分区不同列表，筛选和分页不串用'),ctl('变更/作废申请','当前标签id及buttonType','变更可改规则、作废说明必填规则按代码；提交前显示影响'),ctl('查看/审核/提交/取消','申请id、当前待审状态','查看只读；审核右侧可写，仅待审且有权；取消不审批')],
 ['申请列表和审核列表调用auditprocess/page但参数及权限分别处理；processType与auditStatus不同枚举。','选择标签后GET configtag/{id}回填name/code/ruleContent/remark；变更POST configTagChangeApply，作废POST configTagInvalid，不直接DELETE标签。','审核按申请id读取旧新值，结论2/3及意见由服务端复验；并发已审要拒绝，不覆盖他人结果。','审批通过与标签新规则/作废生效须分别回读；失败保留安全草稿，响应丢失先查申请和审计。'],
 [api('申请/审核分页','POST','/auditprocess/page','name/processType/auditStatus/pageRequest及分区条件'),api('详情','GET','/auditprocess/{id}'),api('标签树','GET','/configtag/queryTagTree'),api('标签详情','GET','/configtag/{id}'),api('变更申请','POST','/auditprocess/configTagChangeApply','{id,name,code,ruleContent,remark,applyReason}'),api('作废申请','POST','/auditprocess/configTagInvalid','同申请表单，按批准字段集'),api('审核','POST','/auditprocess/auditConfigTag','{id,auditStatus,auditOpition,processType,businessId}')],
 '顶部变更申请/变更审核页签；申请侧有变更申请、作废申请，表格标签名称/编码、申请类型/人/时间、审批状态及操作。审核详情旧新标签分区、意见和结论，长规则局部滚动。',
 ['两页签筛选和权限隔离，processType与auditStatus不混。','选标签回填后仅允许变更字段，切标签不保留旧规则。','变更/作废走不同POST，取消不提交、不DELETE标签。','审核2/3及意见边界，并发审核仅一次生效。','审批结果与标签状态分别回读，越权审核/ID替换拒绝。']);
profile('application','查看本人标签授权、上线与下线申请及其处理结果。',[
 input('筛选 labelName/status'),...paging,ro('本人 applyUid','先GET /back/common/user/main/self取id；服务端不能信任浏览器applyUid'),f('固定 biz/open','integer','','biz=0、open=-1','','不可拿前端筛选代替鉴权'),ro('申请 id/labelName/groupName/type/remark/reason/createTime/status'),ro('状态/申请类型','status0待审/1通过/2驳回；type1授权/6上线/5下线，与资产审核枚举不同')],
 [ctl('初始化/查询/重置','身份读取成功','applyUid就绪后才读本人申请；重置保留身份范围'),ctl('查看','申请id','进入myApplyEdit只读模式，不出现资产变更/作废入口')],
 ['当前静态定义为本人申请；历史K-TMS-015路由正确却显示资产变更列表，目标校准组件/菜单同步，不将旧画面字段套到本人申请。','身份GET成功才POST labelapply/page {labelName,status,applyUid,biz:0,open:-1,pageRequest}；身份失败不得退化为查询全部申请。','详情GET labelapply/{id}；只读显示理由、结论及相关标签；本人申请页无凭据、批量审批或资产作废。'],
 [api('本人申请','POST','/labelapply/page','{labelName,status,applyUid,biz:0,open:-1,pageRequest}'),api('申请详情','GET','/labelapply/{id}')],
 '标题“我的申请”，上部标签名/状态筛选；列表标签名、所属组、申请类型、描述、说明、时间、状态及查看。独立详情只读。历史错误目标图仅保留追踪，不作为布局依据。',
 ['路由/标题/本人申请列表一致，不出现资产变更按钮。','身份失败不请求全量；重置仍保留本人范围。','status0/1/2与type1/6/5映射独立准确。','详情仅当前授权申请，关闭返回原筛选页。','伪改applyUid/biz和申请ID不能读他人申请或审批。']);
profile('approval','审核授权范围内标签申请，分开处理详情、结论与授权生效。',[
 input('筛选 labelName/status'),...paging,f('固定 biz/open/labelType','integer','','1/-1/2','','服务端复验审核范围'),ro('申请 id/labelName/groupName/applyGroupName/type/remark/reason/createTime/status'),f('结论 status','integer','审核时是','','1通过/2驳回','原申请状态0待审；与资产审核2/3不同'),input('审批意见 opinion','是','≤250','trim；提交仅{status,opinion}')],
 [ctl('查询/重置/查看','当前审核范围','biz=1/open=-1/labelType=2列表；查看始终只读'),ctl('审核/提交/取消','待审且有审核权','myApplyEdit编辑审核区；服务端原子状态检查，取消不PUT')],
 ['读取申请后显示标签、所属组、申请组、类型、理由与当前状态；不能仅靠按钮判定审批人身份。','审核PUT /labelapply/{id}按详情模型提交；当前只读字段应移出可写集，禁止客户端伪造申请组或标签归属。','审批通过后分别读取申请终态和授权/上线/下线结果；并发拒绝，响应丢失先查申请，不盲重发。'],
 [api('待办/历史','POST','/labelapply/page','{labelName,status,biz:1,open:-1,labelType:2,pageRequest}'),api('详情','GET','/labelapply/{id}'),api('审核','PUT','/labelapply/{id}','{status,opinion}；status1通过/2驳回')],
 '上部标签名/状态筛选，下部标签、所属/申请组、类型、描述、说明、时间、状态和操作；详情基本信息只读，审核结论/说明区域仅待审模式可编辑，底部提交/取消。',
 ['固定审核参数和本人申请参数分开。','待审0可审核，有结论仅查看；1通过/2驳回不套资产2/3。','PUT只含允许审核键，不修改申请人/组/标签。','并发重复审核一个终态，取消无PUT，超时先回读。','越权组/直接API审批拒绝，通过后授权生效另验。']);
profile('feedback','分别查看本人发出反馈与处理收到的反馈。',[
 f('页签','页签','是','','我的反馈/我收到的反馈','frontResource分别myFeedbackList/myReceivedList'),input('筛选 labelName/status'),...paging,ro('反馈 id/labelName/groupName/feedback/createTime/updateTime/status'),ro('本人 applyUid','本人页先读取身份；收到页按服务端责任范围'),input('处理意见 comment','处理时是','','trim后非空目标'),ro('原反馈 feedback','查看/处理弹窗均只读；不能覆盖原意见')],
 [ctl('页签/查询/重置','对应frontResource权限','我的反馈pageUid，收到反馈page；独立缓存和分页'),ctl('查看/处理/取消','反馈id及status=0未处理','查看disabled；收到待处理才编辑comment，提交PUT并回读')],
 ['本人页先取得用户ID再分页；收到页按服务端授权，不把前端无applyUid解释为全员可见。','查看弹窗仅原feedback和处理comment；收到status=0时允许处理，其他状态只读。','处理PUT labelmanualcomment/{id}，完整可写键及状态需后端批准；原反馈和标签归属不可被客户端覆盖；取消不写。'],
 [api('本人反馈','POST','/labelmanualcomment/pageUid','{labelName,status,applyUid,pageRequest}'),api('收到反馈','POST','/labelmanualcomment/page','{labelName,status,pageRequest}'),api('处理反馈','PUT','/labelmanualcomment/{id}','{status:"1",comment}；禁止回传只读归属')],
 '顶部两个反馈页签，标签名/状态筛选和表格；收到页多展示反馈人/申请组，时间列与本人页updateTime不同。详情弹窗原反馈在上、处理意见在下，查看只读，处理仅待办开放。',
 ['两页签权限/接口/时间字段分开，缓存不串。','身份失败不放开本人查询，重置保留身份条件。','原反馈只读，待处理0才能提交comment。','取消无PUT，并发已处理拒绝后回读。','按对象服务端鉴权，输入HTML按文本显示且审计不含会话。']);
profile('api','查询标签API说明、查看契约与受控删除服务定义。',[
 input('筛选 name/labelName'),...paging,ro('服务 id/name/description/labelName/groupName/createTime','labelApiId列实际读取id'),input('详情 name','','≤64'),input('详情 description','','≤255'),ro('requestType/returnFormat/path/authRequestExample/requestExample'),ro('requestParam[]','JSON解析后name/type/required/explain'),ro('responseData[] / errorCode[]','响应name/type/value/explain；错误name/explain'),ro('responseExample','JSON编辑器view只读；解析失败必须显错')],
 [ctl('查询/重置/分页','API名/来源标签名','读取labelapi分页'),ctl('名称查看','当前服务id','读取契约，JSON解析失败不可空白成功；view锁定编辑器'),ctl('删除','当前服务id','确认调用影响及引用保护，删除定义不删除标签或自动撤销其他授权')],
 ['API列表展示说明而非执行测试工具；不因查看path就调用下游API。','详情JSON字段分别解析；当前catch吞解析异常，目标提示具体字段错误且禁用依赖展示，不渲染伪空契约。','新增API定义来自结果流程labelapi POST，不据本页没有新增按钮推定平台不支持；本页范围为检索/查看/删除，完整生成契约另作依赖。','删除回读服务及授权状态，响应丢失先查；API实际身份、限流、有效期、版本兼容与错误码由服务后端契约交付。'],
 [api('服务分页','POST','/labelapi/page','{name,labelName,pageRequest}','datas/total；id/name/description/labelName/groupName/createTime'),api('服务详情','GET','/labelapi/{id}','id','契约字段及四组JSON字符串'),api('删除服务','DELETE','/labelapi/{id}')],
 '顶部API名/来源筛选，下部名称链接、labelApiId、描述、来源、组、创建时间和删除；详情基本信息在上，请求/响应参数表、错误码和左右示例区在下，JSON编辑器独立滚动。',
 ['labelApiId读取id，筛选来源labelName且稳定分页。','详情JSON字段逐项解析，异常明确且不吞错伪空。','view所有表单/JSON编辑器只读，查看不调用下游API。','删除确认/取消/引用冲突和结果未知恢复正确。','服务说明、删除和实际调用权限分别验权；不暴露凭据示例。']);

const kinds=['overview','group','model','property','propertyAdd','dataTag','userGroup','portrait','analysis','manual','schedule','scheduleForm','asset','assetForm','file','retrieval','assetAudit','application','approval','feedback','api'];
function entries(type){return published[type].entries.map((e,i)=>({...e,kind:type==='main'?(i?'navigation':'overview'):kinds[i],acceptance:published[type].acceptance.filter(a=>a.requirement===e.id).slice(0,5).map(a=>a.id)}));}
const MAIN=entries('main'),SUB=entries('sub');
const all='TMS-001/002、TMS-500～520';
const NFR=[
 ['001','权限与会话','所有菜单、对象、字段、规则、结果、文件、申请及写动作服务端独立验权；切身份/撤权清旧响应和缓存','隔离环境至少两组相互隔离账号，直接URL/API及ID替换、重置筛选、撤权/会话过期；任一越权读写即失败',all],
 ['002','传输与秘密','受保护会话和业务数据走TLS；不混合内容，不在文档/日志/URL示例输出凭据、SQL中秘密或FTP连接密码','发布配置、隔离请求与日志检查；任一秘密值或受保护明文传输即失败；部署配置证据不足不通过',all],
 ['003','查询性能','普通列表和候选端到端P95≤2秒、P99≤4秒；非预期失败率≤0.5%','Windows11、Chrome/Edge稳定版、4核8GiB、1366×768、20Mbps/RTT50ms；固定服务/库配置、10万标签/1000组、10并发用户每5秒一次读，预热5分钟统计15分钟且每场景≥300合法请求；记录P50/P95/P99/最大/失败数；禁止生产压测','TMS-501～503/505～507/509～510/512/515～520'],
 ['004','概览一致性与性能','概览数据可操作P95≤3秒；同一结果显示同源截止时间和范围；失败不能填0','同NFR-003环境，冷缓存30次、热缓存100次分别统计；从进入路由至所有必要卡片/图表可操作；缺字段、混时点和假0算失败','TMS-001/500'],
 ['005','反馈与重复动作','输入/按钮可感知反馈P95≤150ms；同一对象动作最多一个在途，写入最多一个批准业务效果','固定客户端下≥100次交互；10次连续触发及网络慢/失败注入，检查请求数、服务端效果和finally恢复；按钮loading不足以通过',all],
 ['006','任务与超时恢复','计算受理、执行中、成功、失败及结果未知分别显示；所有长计算须有限等待或任务ID可回查；离页不自动重发','隔离环境断网/丢响应/超时/5xx及重入各≥10例；检查任务ID、草稿和报告；timeout:0不能当20秒超时保证；有限阈值由容量合同批准','TMS-505～508/510～511'],
 ['007','规则与SQL安全','授权模型/列/操作白名单和参数化值处理；SQL仅批准只读范围；Base64不当加密或防注入','隔离规则集含引号、注释、越权标识符、写语句、多语句、深层条件与0/负数/小数；任一越权执行或错误静默截断即失败；复杂度阈值经契约批准','TMS-505～508/513'],
 ['008','一致性与并发','审批/发布/作废、成员/白名单、规则修改与标签引用原子校验；重复请求不重复生效，不覆盖较新版本','隔离环境两客户端对同一对象并发≥20对；验证最终状态、引用、版本和审计；冲突必须明确，不以最后写赢默认通过','TMS-501～507/509～514/516/518～520'],
 ['009','调度正确性','按批准时区复算起点、间隔、五次计划、月末闰年和错过执行；有效性与任务/实例状态分开','分钟14/15/59/60及四周期上下界，月底/闰年/时区切换/过去起点/改策略引用，各有固定时间测试；无调度契约不能验收','TMS-506/510～511'],
 ['010','文件路径与资源边界','文件浏览/标签/检索均限制授权来源与根路径；不因路径显示而授予下载，不输出FTP凭据','隔离FTP含../、双编码、符号链接、同名目录、跨根及失效来源；任何越权目录/文件读写即失败；无文件上传/存储容量承诺','TMS-514～515'],
 ['011','审计与可观测性','记录操作者、时间、对象类型/ID、动作、结果/冲突、前后版本及可关联请求/任务/申请ID；敏感内容最小化','至少一次成功、失败、越权、并发冲突，串联页面至服务审计；审计权限、留存期限和删除策略由负责人批准；缺证据不通过',all],
 ['012','兼容与布局','Chrome/Edge发布时稳定版及前一版；1366×768、1920×1080、200%缩放下关键字段/错误/按钮可达','登记精确构建及浏览器版本；宽表局部横滚，长表单纵滚，长标签/路径、空/失败、弹窗和图表分别检查；裁掉提交或错误即失败',all],
 ['013','可访问性','键盘可达全部控件；字段标签/错误关联，弹窗焦点进入与返回；状态不只靠颜色表达','自动扫描+人工Tab/ShiftTab/Enter/Esc和读屏，覆盖树/页签/弹窗/图表文本摘要；任一关键路径不能操作即失败，不宣称全面认证',all],
 ['014','资源稳定性','离页清定时器/监听/图表实例，重入不增加监听和重复请求；旧身份数据不留存','同页及跨页进入退出50次，核对resize监听、图表dispose、编辑器和在途请求；持续增长或后台重复执行即失败；不以单次打开证明','TMS-001/500/502/507～508'],
 ['015','契约与可维护性','接口相对路径、枚举域、DTO白名单及错误语义统一版本化；生成器保持23功能/182验收及历史证据不回流','离线文档/反例/生成器测试、基线保留检查；拒绝ID丢失/重排/错关联、来源丢失与伪报通过；服务契约变更另做兼容验证',all],
 ['016','恢复与可用性','服务故障期间保留安全查询/草稿，展示可恢复失败；恢复不自动重放计算、审批、发布或删除','隔离服务中断/恢复演练，核对定义、关系、申请/任务结果和审计；RTO/RPO/月度SLA须容量及备份计划批准，未提供不填写数字或据短测宣称达标',all],
];
const protocol='路径由TMS公共包装器模块前缀/tms/portal与父应用API_BASE_URL相对部分/back组合；MODULE_URL_PREFIX覆盖优先。TMS挂载注入utils.getInstance，parentdata桥接requestInstance。普通POST/PUT采用公共JSON与会话客户端，GET的参数走query，DELETE特殊body仅按对应包装器。公共HTTP 202进入业务错误，其他客户端接受状态返回data，不存在统一code=0依据。1109/1002/1003/1012公共认证分支与局部catch组合；路径非负超时覆盖优先，其次请求number超时，否则20000ms，0可能无有限超时；label/execTask和picture两计算显式timeout:0。真实成功body、全部错误及服务端权限需契约/隔离联调。';
function renderFeature(e){const p=PROFILES[e.kind];return [
 '### '+e.id+' '+e.title,'','**功能入口**：`'+e.route+'`。','', '**操作类型**：按下列控件区分只读、定义维护、计算、状态/审批及关系变更。','', '**业务目的**：'+p.purpose,'','**前置条件**：身份有效且允许访问本页面及目标对象。','','<!-- 完整规格:'+e.id+' -->','',
 '#### 1. 页面字段清单（'+e.id+'）','',...table(['字段名称与绑定名','类型/控件','是否必填','默认值','长度/范围/单位','格式及校验规则','错误提示','条件/状态'],p.fields),
 '空白单元格表示该属性缺少证据，不代表无约束；0、false、null、空字符串和未传不同。仅明确trim字段做trim；其余文本保留语义。名称、日期、数量和历史样本不是固定默认数据。对象ID精确类型由契约提供，不允许parseInt截断非法或长ID。','',
 '#### 2. 页面交互规则（'+e.id+'）','',...table(['控件/触发','前提及输入','行为及联动','忙碌与错误','完成与恢复'],p.controls),
 '#### 3. 业务流程与异常分支（'+e.id+'）','','**操作与规则**：','',...p.flow.map((s,i)=>(i+1)+'. '+s),'','**结果与异常处理**：','',...table(['分支','处理','恢复'],[
 ['候选/树/详情失败','禁依赖动作，保留有效查询，合法空和失败分开','人工重试；切对象/身份后拒绝旧响应'],['字段/引用/状态/并发冲突','定位具体输入或对象；服务端原子复验，不提前移除','保留安全草稿，回读后重新确认'],['超时/断网/202/5xx/解析失败','finally解锁；有副作用请求标结果未知，不伪报成功','只读人工重试；写操作先查对象/申请/任务/版本及审计'],['取消/关闭/返回/后退','草稿确认放弃；已提交动作不因离页自动撤销','回原列表有效页和条件；不自动重发写操作'],['身份或授权变化','清旧对象/候选/敏感内容及缓存','重新认证后重新读取，不自动计算、发布、审批或删除'],]),
 '#### 4. 接口与数据规则（'+e.id+'）','','**开发处理细则**：'+protocol,'',...table(['用途','HTTP方法','相对路径','请求参数及来源','返回与页面处理'],p.api),
 ...table(['参数类别','位置/类型','转换及范围'],[['本项表单/筛选','JSON body/query；依接口行','按当前模式只提交允许字段；客户端required/maxlength不证明服务端校验'],['ID与上下文','path/body/route，精确类型由契约交付','标签/分类/模型/列/成员关系/文件来源/申请/任务ID分开，路径安全编码'],['分页','body pageRequest {pageNo,pageSize,order?}','仅列表/独立弹窗采用；本项特殊page/rows单列，不虚构默认排序'],['日期/规则/JSON','按本项日期格式/毫秒/结构化对象或文本','不混T/空格/epoch；条件与SQL按授权契约校验；JSON解析失败不能吞错']]),
 ...table(['响应分支','判定与读取','结果及恢复'],[['读取resolve','验证数组、datas/total或本项详情结构','当前条件生效；缺结构/无权限不转空数据'],['写入resolve','按正式结果并回读对象和状态','受理、计算终态、审批、发布生效分开；结果未知先查'],['业务/HTTP失败','202与公共会话错误、权限/引用/状态冲突等','不硬编码code=0；清锁保留安全输入，错误可恢复'],['网络/结构/文件结果','超时/5xx/解析异常及独立导出格式','不把blob错误体当文件；不自动重发副作用请求']]),
 '#### 5. 验收标准（'+e.id+'）','',...table(['验收编号','前置、操作及可检查结果/回读','关联需求','状态'],e.acceptance.map((id,i)=>[id,p.checks[i],e.id,'未执行'])),
 '#### 6. 权限与安全要求（'+e.id+'）','','服务端逐对象核验授权范围，菜单、组成员、模型/属性、标签、规则执行、结果、文件、审批、发布、授权及删除分别验权。直接URL/API、ID替换、修改隐藏字段和撤权须覆盖；不按某个账号样本新增租户/空间字段或硬编码角色。','',
 '用户文本、标签名、规则、SQL、反馈、文件路径及JSON示例按文本转义；富文本/图表提示净化。SQL/条件由服务端验证授权对象和只读边界。TLS与会话、后端凭据保护分别验收；页面不输出Cookie/Token、密码、FTP秘密或含凭据请求示例。','',
 '#### 7. 页面布局与状态（'+e.id+'）','',p.layout,'','初始化、加载、可操作、合法空、无权、字段错误、依赖失败、并发冲突、结果未知与完成去向分别呈现。长表局部横滚、长页纵滚；弹窗焦点可进入/返回，缩放后错误与按钮可达；历史像素仅该视口样本。','',
 '#### 8. 关联文档（'+e.id+'）','',...e.sources.map(s=>'[历史图]('+s+') / [元素]('+s.replace(/\.png$/,'.json')+')'),'','[主规格](./需求说明.md) · [子页面](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [静态证据](../evidence/tms-review-20261027/README.md) · [调研归档](./调研记录.md)','',
 '#### 9. 非功能性需求（'+e.id+'）','','按[主文档质量要求](./需求说明.md#9-非功能性需求)TMS-NFR-001至016及关联范围验收；权限、状态、规则、路径、并发与结果未知为本项不变量。性能数字是本次开发目标，尚无实测；全部应用功能和非功能验收未执行，文档测试不替代应用验收。',''].join('\n');}
function renderDocument(type,previous){
 const base=published[type],list=type==='main'?MAIN:SUB;
 if(previous.includes('tms:generated-spec-v1')&&!previous.includes('<!-- 业务规格格式:plain-v1 -->'))throw new Error('TMS format missing');
 const ids=[...previous.matchAll(/^### (TMS-\d{3})\b/gm)].map(m=>m[1]);if(JSON.stringify(ids)!==JSON.stringify(list.map(e=>e.id)))throw new Error('TMS requirement IDs missing, duplicated or reordered');
 const ac=[...previous.matchAll(/^\| (TMS-AC-\d{3}) \|/gm)].map(m=>m[1]);if(JSON.stringify(ac)!==JSON.stringify(base.acceptance.map(a=>a.id)))throw new Error('TMS acceptance missing, duplicated or reordered');
 for(const row of previous.matchAll(/^\| (TMS-AC-\d{3}) \|.*$/gm))if(row[0].split('|').at(-3).trim()!==base.acceptance.find(x=>x.id===row[1]).requirement)throw new Error('TMS acceptance association changed');
 if(type==='main'&&base.sourceRows.some(s=>!previous.includes(s)))throw new Error('TMS source rows missing or changed');
 if(type==='sub'&&base.entries.some(e=>e.sources.some(s=>!previous.includes(s))))throw new Error('TMS evidence missing');
 const formal=new Set(list.flatMap(e=>e.acceptance)),retained=base.acceptance.filter(a=>!formal.has(a.id)).map(a=>[a.id,a.text.replaceAll('跨空间标识','跨工作组对象标识'),a.requirement,'未执行']);
 return ['# 标签管理'+(type==='main'?'业务需求说明':'子页面与操作需求细化'),'','<!-- 业务规格格式:plain-v1 -->','<!-- tms:generated-spec-v1 -->','','按登录需求的字段、逐控件交互、接口、异常、权限、布局与质量标准细化；依据和差异单列[核查记录](./核查记录.md)。全部应用验收未执行；文档细化不代表系统已实现或生产就绪。','',
 '## 1. 业务目标与使用角色','','组织工作组及成员、导入模型、抽取属性，建立标签规则和分群/画像，管理调度、资产/文件标签、申请审批、反馈和API说明。标签开发、运营、审核和使用是业务责任分工，实际角色及授权矩阵由服务端契约交付。业务入口：数据资产→标签管理。','',
 '## 2. 业务范围','',...table(['功能编号','入口','目标范围'],list.map(e=>[e.id,e.route,PROFILES[e.kind].purpose])),
 '保留23项正式功能（主2、子21）、182条验收及15条历史操作边界；不新增未证明的标签回滚、来源表DDL、FTP上传/删除或自动审批。AI-008指标口径与标签规则草稿仍属[原AI规划](../AI能力规划.md#ai-008-指标口径与标签规则草稿拟定需求)，人工采纳，不自动执行SQL、保存、发布或授权。','',
 '## 3. 功能需求','',...list.map(renderFeature),
 '## 4. 字段与业务规则','','完整字段按每功能第1节。工作组id、成员wguid、模型/列/属性id、标签id、分类id、资产标签code、映射id、申请id、调度policyId与任务ID分别使用；名称不替代稳定ID。客户端禁用/隐藏字段仍需服务端验证。','',
 '数据标签、资产标签、申请审核、执行实例各自有状态域；禁止通用status枚举。个人申请status0待审/1通过/2驳回，资产审核auditStatus1待审/2通过/3不通过；资产标签state1待发布/2发布审核/3已发布/4已作废。实际状态转移和引用保护由服务端合同交付。','',
 '工作组名≤50、描述≤2000；模型中文备注≤50、模型说明≤100、列名≤80、列备注≤255；实体显示名/单位各≤20、字典名/码各≤50、字典备注≤100；分群名≤50、说明≤500；画像名≤50、图表名≤20。手工名≤100、冲突组名≤50；资产新增名称≤50、规则/描述各≤255，资产变更页规则≤50、描述/申请说明≤200，不能将不同页面上限混为一条。','',
 '个人审核提交{status,opinion}，opinion必填≤250；资产审核提交{id,auditStatus,auditOpition,processType,businessId}，auditOpition必填≤250，保留原拼写。当前资产审核onSubmit校验左侧表单而非右侧审核规则，目标校验实际审核字段，防空意见绕过。反馈处理提交{status:"1",comment}，原feedback只读。','',
 '调度policyType0～4，分钟15～59/小时1～23/天1～30/月1～11/年1～3，validity0有效1无效。日期与时刻拼日期THH:mm:00；五次计划包含起点。资产列表时间毫秒、分群时间和调度文本格式分别按调用定义，不互套。','',
 '## 5. 主要业务流程','','工作组/成员授权→模型分类及元数据导入→实体属性/字典→标签组合或SQL规则→分群/画像与调度→执行报告→授权/上线申请与审批→可用服务及反馈。资产标签分类/定义→发布/变更/作废审批→资产或FTP文件标记→检索。保存、执行受理、计算完成、审批通过和发布生效分别回读。','',
 '## 6. 验收标准','','每项功能五组具体验收和下列历史跨流程用例保持编号、顺序和关联。记录环境、构建、授权数据、输入、请求与回读证据；所有应用用例未执行。','',...table(['验收编号','前置、操作及可检查结果/回读','关联需求','状态'],retained),
 '## 7. 实现与交付边界','',...(type==='main'?['| 历史编号 | 原操作范围 | 原登记边界 |','|---|---|---|',...base.boundaries,'']:[]),
 '历史边界用于追踪，工作组由TMS-501、模型/属性由502～504、标签体系由505～511承接。已登记的字段/界面/包装器可用于受控原型与契约设计；真实持久化、运行、权限、状态机、审批和路径访问先完成[外部依赖](./核查记录.md#外部依赖)，不能交由AI自行选择协议或枚举。','',
 '## 8. 需求依据与关联资料','',...(type==='main'?['| 需求编号 | 界面依据 | 详细记录 |','|---|---|---|',...base.sourceRows,'']:table(['需求编号','原图与元素','规则依据'],list.map(e=>[e.id,e.sources.map(s=>'[图]('+s+') / [元素]('+s.replace(/\.png$/,'.json')+')').join('；'),'[静态索引](../evidence/tms-review-20261027/README.md)及[核查记录](./核查记录.md)']))),
 '[主规格](./需求说明.md) · [子页面](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [调研归档](./调研记录.md) · [总索引](../README.md)','',
 ...(type==='main'?['## 9. 非功能性需求','','以下数值为本次开发验收目标，非登录指标套用，尚无实测；来源与取舍见核查记录。环境缺失、零样本或不足样本不通过。性能端到端从用户触发至当前有效数据可操作，接口从发出至完整解析；分位取升序第ceil(p×N)项，成功时延和失败数分别报告。固定并记录服务端实例/CPU/内存/数据库/索引/网关和安全策略，不关闭权限或限流压测；业务预期失败单列，合法请求5xx/超时/解析错误/错误结果/限流均计非预期失败。','',...table(['编号','质量属性','指标或不变量','验收环境/方法/失败判定','关联功能','状态'],NFR.map(([id,...r])=>['TMS-NFR-'+id,...r,'未执行']))]:[]),
 ].join('\n');
}
function write(root=ROOT){const folder=path.join(root,'21-标签管理');let changed=0;for(const [type,name]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){const file=path.join(folder,name),before=fs.readFileSync(file,'utf8'),after=renderDocument(type,before);if(before!==after){fs.writeFileSync(file,after);changed++;}}return {changed,requirements:23};}
if(require.main===module)console.log(JSON.stringify(write()));
module.exports={MAIN,SUB,PROFILES,NFR,renderFeature,renderDocument,write};
