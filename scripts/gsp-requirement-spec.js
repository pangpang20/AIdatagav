/* Portal requirements: downloaded bundles are evidence, never executable imports. */
const fs=require('node:fs'),path=require('node:path'),ledger=require('./gsp-published-registry.json');
const MAIN=[{id:'GSP-100',title:'查询数据清单',kind:'list',route:'/gsp-portal/samcheong',start:524,evidence:'E096-portal-data-list'},{id:'GSP-001',title:'浏览门户与数据清单',kind:'navigation',route:'/gsp-portal/home',start:529,evidence:'E095-portal-tab'}];
const SUB=[
 ['500','首页','home','home','V-GSP-001'],['501','业务图谱','atlas','atlas','V-GSP-002'],
 ['502','数据资源','resource','resource','V-GSP-003'],['505','数据资源 → 资源详情','detail','resource/detail','AA-GSP-resource-detail'],
 ['506','数据资源 → 资源信息','items','resource/detail','AA-GSP-resource-info'],['503','数据清单','list','samcheong','V-GSP-004'],
 ['504','资料下载','down','down','V-GSP-005'],['507','购数车','cart','dataSet','AA-GSP-cart']
].map(([id,title,kind,route,evidence],i)=>({id:'GSP-'+id,title,kind,route:'/gsp-portal/'+route,start:534+i*5,evidence}));
const table=(h,r)=>['| '+h.join(' | ')+' |','|'+h.map(()=>'---').join('|')+'|',...r.map(x=>'| '+x.map(v=>String(v??'').replaceAll('|','&#124;')).join(' | ')+' |'),''];
const f=(n,t,req='',initial='',range='',rule='',error='',state='')=>[n,t,req,initial,range,rule,error,state];
const api=(use,m,suffix,params,result)=>[use,m,suffix.startsWith('/back/')?suffix:'/back/gsp/portal'+suffix,params,result];
const dictApi=api('业务字典','POST','/back/common/dict/dictitem/page','JSON {categoryKey}；仅查询所需分类','读取datas中的value/display；缓存空数组会重取，失败不可当无候选');
const listFields=[
 f('目录名称 catalogueName','string / clearable input','否','空字符串','','保持输入；目标trim后查询，不把名称当ID'),
 f('目录分类 categoryId','ID / clearable select','否','空字符串','','POST treelist({categoryType:3})读取id/categoryName；控件展示顶层返回数组，不擅自承诺多级联选'),
 f('信息资源类型 resourceType','字典value / clearable select','否','空字符串','','catalogueResourceTypeData；清空与选择枚举保真'),
 f('更新周期 updateCycle','字典value / clearable select','否','空字符串','','updateCycleTypeData'),
 f('清单页签 activeName','string / tabs','是','duty','duty责任清单；negative负面清单','页签切换重置四条件及分页；两接口分开'),
 f('分页 pageRequest','object / pagination','是','{pageNo:1,pageSize:10}','条数候选10/20/30/40/50/100','序号=pageSize×(pageNo−1)+index+1；查询/条数变化回第1页，返回恢复已提交快照'),
 ...[['序号','计算值'],['目录名称','catalogueName'],['目录分类','categoryName'],['提供方','provideName'],['资源类型','resourceType'],['安全等级','securityLevel'],['更新周期','updateCycle'],['共享类型','shareType'],['供数方式','provideType'],['关联事项名称','matterNames'],['不予共享的依据','shareCondition']].map(([n,b])=>f(n+' '+b,'只读结果列','','','','枚举按对应字典display；未知显示明确未知，不映射成允许共享','',n==='供数方式'||n==='关联事项名称'?'仅责任清单':n==='不予共享的依据'?'仅负面清单':'两页签'))
];
const baseFields=[
 ...[['数据原名','catalogueName'],['资源目录分类','categoryName'],['信息资源格式','resourceFormat'],['信息资源类型','resourceType'],['安全级别','securityLevel'],['关联应用系统','systemName'],['关联事项','matterNames'],['信息资源摘要','catalogueAbstract'],['更新周期','updateCycle'],['共享类型','shareType'],['共享条件','shareCondition'],['是否向社会开放','openType'],['开放条件','useDemand'],['供数方式','provideType']].map(([n,b])=>f(n+' '+b,'只读文本','','','','字典取value/display；0开放值显示否，其他合法值按后端合同；null/未知不显示是','','目录基本信息'))
];
const itemFields=[
 f('资源集合 resourceVoList[]','array / table','','[]','','序号、resourceName资源名称、resourceType→catalogueResourceTypeName资源类型；resourceDo.dataSourceDo.name/key为数据源/类型；缺嵌套显示占位，不暴露凭据','','只读，无分页定义'),
 ...[['信息项名称','itemName'],['字段英文名','columnName'],['数据类型','dataType'],['字段长度','columnLength'],['字段精度','dataPrecision'],['是否主键','asPrimaryKey'],['共享类型','shareType'],['共享范围','shareScope'],['是否开放','openType'],['安全级别','securityLevel']].map(([n,b])=>f(n+' itemList[].'+b,'只读信息项列','','','','shareScope逗号分割按字典显示；主键/开放0为否，未知不默认为是；长度/精度为元数据，不是本页输入上限','','库表资源显示')),
 f('申请信息项 catalogueItemList[]','array<ID> / selection','库表申请至少一项','','','只在购数车showSelection=true；选择id/cascadeGuid，不以英文名作身份','','详情showSelection=false；文件showItem=false')
];
const resourceFields=[
 f('名称 catalogueName','string / search input','否','空字符串','','点击搜索创建条件快照；普通输入不写服务端'),
 f('三类目录选择 basicCategoryIds/subjectCategoryIds/categoryIds','array<ID> / lazy checkbox tree','否','[]','','根基础1/主题2/部门3不可选；首层按categoryType取treelist，后续用children；勾选按节点categoryType分数组'),
 f('分类页签 activeName','string / tabs','是','"3"','3资源类型；4所属层级；5共享类型','GET catalogClassify/findList({type:activeName})得到value/name；切页签不清其他维度'),
 f('资源类型 resourceType','string / selectable tag','否','"-1"','-1全部；1库表/2文件/3 API/4服务API','候选来自分类接口；值与数据清单字典保持合同映射'),
 f('所属层级 tempShareScope → shareScopes','string→string[] / tags','否','"-1" → []','2→["5","6","7"]；3→["3","4"]；4→["1","2"]','-1清空；层级标签按接口，不把本地显示当鉴权依据'),
 f('共享类型 shareType','string / tags','否','"-1"','','候选来自type5；"3"在详情/列表禁止加入车及申请'),
 f('排序 orderField/orderType','number/string / toggle','否','空字符串','字段1更新时间/2订阅量/3访问量/4所属层级/5安全等级；方向1升/2降','首次点击方向2，再1/2交替；目标变更回第1页'),
 f('分页 pageRequest','object','是','{pageSize:4,pageNo:1}','正整数','分类/勾选搜索重置页码；有总数才展示分页；卡片/列表共享数据'),
 f('布局 listModel','string / two icons','是','list','list/card','只改显示不新增业务查询或写入'),
 ...[['目录标识/名称','id/catalogueName'],['提供单位','deptName'],['资源类型','resourceType'],['共享范围','shareScope'],['更新周期','updateCycle'],['共享类型','shareType'],['安全等级','securityLevel'],['更新时间','lastModifyTime'],['目录总数','total'],['动作可用性','canAddCars/canApply/canFavorites']].map(([n,b])=>f(n+' '+b,'结果只读','','','','按服务端返回；total只证明目录数，关联资源总量另取独立口径','','卡片/列表一致'))
];
const cartFields=[
 f('购数车条目 id / catalogueDto.id','ID / checkbox','申请至少一条','均不选','','DELETE使用车条目id；resDtos使用目录id；query.catalogueId原parseInt，目标按合同保真验证，禁止静默截断'),
 f('全选 checkAll / isIndeterminate / checkedCatalougue','boolean/array / checkbox','否','false/false/[]','','全选仅当前车条目；单选重算半选和所选数量；读取失败不能清真实车'),
 f('申请单位/申请人 catalogApplyUser.deptName/name','string / disabled','身份有效','','','GET /catalogApply/user回填；仅显示，不加入申请body；服务端从会话确定申请主体','','不可编辑'),
 f('申请标题 applyName','string / input','是','空字符串','最多50字符','blur required；目标trim后非空，保留正文语义','不能为空'),
 f('申请说明 applyDesc','string / input','是','空字符串','最多200字符','blur required；拒绝纯空白','不能为空'),
 f('申请依据 applyBasis','string / textarea','是','空字符串','最多500字符；5行','textarea maxlength=500，表单项30不是输入上限；保留换行','不能为空'),
 f('供数方式 provideType','number / radio','是','catalogueDto.resourceType','库表1、文件2','按资源类型仅展示对应单选；API3/服务API4没有对应选项的交付受合同约束，不生成错误交换任务','','展开目录'),
 f('自动交换 autoExchange','boolean→0/1 / switch','否','0','0否/1是','只库表显示；勾选后显示执行时间；申请不直接启动引擎'),
 f('执行时间 execStartTime','timestamp / datetime','自动交换时是','空字符串','毫秒时间戳（value-format="timestamp"）','目标自动交换时必填且按批准时区/时间窗验证；关闭时清隐藏时间；原提交有值或空字符串','','库表自动交换'),
 ...itemFields,
 f('附件 file / tempFileList / ossFileIds','File/array<ID> / upload','否','[]','扩展名.xls/.xlsx/.doc/.docx/.pdf；单文件size < 10×1024×1024字节','扩展名转小写；选择即FormData上传，code=0/file；成功返回值加入ossFileIds；类型/实际内容/病毒及总量服务端复核','只能上传.xls,.xlsx,.doc,.docx,.pdf文件；上传大小不能超过10MB','未有数量上限合同；等于10MiB按当前校验拒绝'),
 f('请求资源 resDtos[]','array<object>','是','占位初始项不作为有效申请','','catalogueId目录id；provideType；autoExchange数字0/1；execStartTime；库表catalogueItemList[]={catalogueItemId:id,cascadeGuidItem:cascadeGuid}','请先选择订阅的数据！；未选择信息项[目录名]！','以所选条目重建请求')
];
const readDetail=api('目录详情','GET','/catalogueInfo/{id}','path目录ID ← query.id','整个infoModel；嵌套resourceVoList/itemList/字典回填；缺ID阻断，不请求undefined');
const cartActions=[
 api('加入车/快速订阅第一步','POST','/enoughCars','JSON {catalogueId:目录id}','成功加入后canAddCars=false；快速订阅再进/dataSet?catalogueId；不是申请成功'),
 api('收藏','POST','/gspcollection/add','JSON {collectType:1,bizType:resourceType,bizId:目录id}','成功canFavorites=false；失败维持原态'),
 api('取消收藏','POST','/gspcollection/physicallyRemove','同收藏body','成功canFavorites=true；不能当查询；物理删除只限本用户收藏引用')
];
const listApis=[api('责任清单','POST','/index/responsibilities/page','JSON {catalogueName,categoryId,resourceType,updateCycle,pageRequest}','{datas,total}；供数方式/关联事项列'),api('负面清单','POST','/index/negative/page','同四条件和分页','{datas,total}；不予共享依据列；不得据可见性授予申请'),api('分类候选','POST','/catalogueInfo/treelist','JSON {categoryType:3}','id/categoryName/children'),dictApi];
const navigationFields=[
 f('主导航 route','link','是','/gsp-portal/home','home/atlas/resource/samcheong/down','保留路由大小写dataSet；菜单、ID直接访问均鉴权'),
 f('购数车入口','link','','','','/gsp-portal/dataSet；仅进入读取，不自动正式订阅'),
 f('身份展示及个人中心','readonly/menu','','','','使用会话身份，个人中心/personal为后续办理入口，审批/授权不在资源列表执行'),
 f('跨应用 switchApp','message','','','','首页应用项使用appId:key/openStyle:2/name/url，宿主按注册应用和安全目标白名单切换')
];
function profile(e){
 switch(e.kind){
 case 'atlas':return{
  goal:'从部门、业务域、事项、系统、库表和目录关系定位资源并核对关联信息。',
  fields:[
   ...[['部门名称','deptName'],['事项','matterName'],['系统名称','systemName']].map(([n,b])=>f(n+' searchParams.'+b,'string / input','否','空字符串','','查询POST graph/query；无前端长度证据，不自定匹配语义')),
   f('表名/系统 systemParams.tableName/systemId','string/ID / input+node','否','空字符串','','没有systemId时表名输入禁用；选择系统节点后查其表，跨系统重置页码'),
   f('系统资源分页 systemParams.pageRequest','object','是','{pageNo:1,pageSize:20}','','独立于全图查询；按系统保存分页/total；箭头不能穿越边界'),
   f('图谱节点 graphNode/atlasData[]','tree / canvas','','[]','nodeType:1部门/2业务/3事项/4系统/5库表/6目录','id/name/nodeType/children；表节点另存resourceId和deptName；图谱id与底层资源resourceId区分'),
   f('六统计 deptNum/businessNum/matterNum/systemNum/tableNum/catalogueNum','number / readonly','','','个','0/缺值/失败分开，初始关联表常量6不作为真实数量'),
   f('部门浮层','readonly summary','','','','name及六统计；graph/query({deptId})获取','','右键nodeType1'),
   f('业务浮层','readonly summary/text','','','','name/matterCount/systemCount/tableCount/catalogueCount/remark','','右键2'),
   f('事项浮层','readonly text/summary','','','','name/systemCount/tableCount/catalogueCount/matterCode/matterType/matterCategory/deptName；类型/分类字典映射','','右键3'),
   f('系统浮层','readonly text/summary','','','','name/matterCount/tableCount/catalogueCount/systemName/systemType/securityLevel/systemStatus/mgtStatus/bearNetwork/remark；字典显示','','右键4'),
   f('库表浮层','readonly table','','','','name/dataSourceName/resourceName（当前数据源类型绑定）/deptName；tableInfo[]列columnName/dataType/dataPrecision/columnLength/asPrimaryKey/remark；正确源类型字段依合同','','右键5'),
   ...baseFields,...itemFields
  ],
  controls:[
   ['查询/重置','表名非空时查当前系统资源，否则查全图；重置三文本、表名和systemId，再读取全图；目标同时重置系统分页','读取失败可重试，空图和协议错误分开'],
   ['系统节点单击及<、>','节点4选择systemId并POST资源页，箭头前后翻；第一页/最后页提示；替换该系统的children','系统切换回第1页；无datas也必须完成promise'],
   ['库表节点单击','以节点resourceId GET关联目录，生成nodeType6 children','缺目录保持空关系；迟到不挂入其他节点'],
   ['六类节点右键/关闭','按nodeType取详情并显示对应浮层，目录浮层含基本/资源标签','目标提供键盘等价入口；切对象清旧dialogModel，关闭回焦；只读不保存'],
   ['拖动/缩放/离页','径向图允许roam；重绘复用同实例、重绑处理器，销毁dispose','保留当前筛选，不因图绘制错误清成功统计']
  ],
  apis:[
   api('全图/部门摘要','POST','/graph/query','JSON {deptName,matterName,systemName}；部门右键{deptId:节点id}','六统计及graphNode(id/name/nodeType/children)'),
   api('系统库表分页','POST','/graph/resource/page','JSON {systemId,tableName,pageRequest:{pageNo,pageSize}}','datas/total；行id→图节点id、resourceDo.id→resourceId、deptDto.name→deptName'),
   api('表到目录','GET','/graph/catalogue/resource/{resourceId}','path底层资源ID','catalogueId/catalogueName→目录子节点；不是图谱表行id'),
   ...['business','matter','system','resource','catalogue'].map((type,i)=>api('节点详情 '+type,'GET','/graph/'+type+'/{id}','nodeType='+[2,3,4,5,6][i]+'；path图节点ID','dialogModel；resource含tableInfo，catalogue含资源/字段，按对应字段表展示')),
   api('目录浮层分类补充','POST','/back/dcs/mgt/mgtcatalogue/tree','无业务参数；公共request默认JSON {}；relationCategory.categoryId匹配','categoryName；失败显示未知'),api('目录浮层应用补充','POST','/back/dcs/mgt/appsystem/list','无业务参数；公共request默认JSON {}；systemId匹配','systemName；失败显示未知'),
   dictApi
  ],
  layout:'面包屑下左侧窄白卡依次部门名称、事项、系统名称、表名，底部查询/重置；右侧六统计横排、六色图例及大径向画布。六类详情浮层置于图区域，右上X关闭，内容独立滚动。',
  flow:'读全图→三条件筛选→点击系统按页读取表→点击表读取关联目录→右键节点核详情→关闭返回同图；不在图中改目录或运行交换。',
  checks:['三文本全图筛选、表名禁用条件、重置及六统计正确，缺值/空/失败不同态。','切两个系统及其前后页，分别核systemId/页码/total，不沿用其他系统末页；缺datas不能永久挂起。','表行id与resourceDo.id区分，表到目录路径使用resourceId，生成正确目录子节点。','右键六类详情及关闭/目录双标签，五详情GET和部门POST正确；迟到结果不串浮层、无权不泄露。','重入/缩放/拖动/重绘和键盘替代可用；销毁释放图实例/处理器，不以颜色或右键作为唯一入口。']
 };
 case 'navigation':return{goal:'组织门户浏览、资源核对和申请入口，分离目录、购物意向、正式申请、审批授权及交换执行。',fields:navigationFields,controls:[['首页/业务图谱/数据资源/数据清单/资料下载','导航到独立路由，保留选中状态；清单实际为/samcheong','初始/无权/服务失败分别提示'],['购数车、个人中心、跨应用','按会话与对象范围进入，离页处理未提交申请草稿','不自动提交申请、登出或变更授权']],apis:[api('首页应用入口','GET','/index/app/appList','无业务参数','分组categories[].systems[]→应用卡；缺注册项拒绝跳转'),...listApis],layout:'独立门户顶栏从左为名称、五主导航，右侧购数车和身份。主体居中，页面自有横幅/面包屑，底部站点信息；导航不要套管理台左侧菜单。',flow:'选择导航→对应读取/筛选→核对目录及字段共享条件→明确点击购数/申请→单独提交→后续审批授权及任务另行核查。',checks:['逐条进入五主路由和购数车，验证导航、身份及目标正文；/dataSet大小写正确。','快速订阅只加入车并带目录上下文；目录可见或申请提交不等于授权生效。','拒绝无效ID/跨身份/失效会话和非注册跨应用目标；不泄露秘密。','返回资源页恢复已提交查询；未保存申请提示，取消不自动重放写请求。','目录新建/编辑/删除属于目录管理，门户只维护个人收藏/车/申请引用；不生成通用目录CRUD。']};
 case 'home':return{goal:'展示资源汇总、分类引导、访问热点、应用入口和排行。',fields:[f('分类 classify','tabs','是','subject','subject主题/basic基础','本地分类卡展示；卡片当前都进入/resource，不携带分类筛选'),...['catalogueCount','dbCatalogueCount','fileCatalogueCount','apiCatalogueCount','gsbCatalogueCount'].map(n=>f('汇总 fetchAccessInfoData.'+n,'number / readonly','','','个','合法0必须显示0；缺值/失败显示未知，不用truthy把0显示-')),f('访问热点 topVisitsData[]','readonly cards','','[]','请求4项','id/catalogueName/deptName/visitNum；点击按id进详情'),f('应用 appList[]','readonly carousel','','[]','每页3项；autoplay=false','从categories[].systems[]展开；name/introduction，缺说明显示暂无说明；点击发送switchApp'),f('排行 topAccessData/topSubjectSubscriptionData/topBaseSubscriptionData','readonly lists','','[]','请求7/5/5项','共享用indexName/count；主题/基础用catalogueName/applyNum；前三名颜色只表达排名，不证明统计周期')],controls:[['立即体验/分类卡','进入/resource；主题/基础只改本地卡组','不隐含筛选或创建'],['访问热点/应用/轮播','热点进入目录详情；应用切宿主；左右轮播仅翻应用卡','热点详情有独立访问计数，失败不冒充0'],['各汇总与排行','各区独立加载/空态/错误重试','一个失败不清其他成功区']],apis:[api('五汇总','POST','/index/fetchAccessInfo','无业务参数；公共request默认JSON {}','五Count字段'),api('访问热点','GET','/index/topVisits/4','path条数4','array id/catalogueName/deptName/visitNum'),api('共享排行','GET','/index/access/7','path条数7','array indexName/count'),api('主题排行','GET','/index/topSubjectSubscription/5','path条数5','array catalogueName/applyNum'),api('基础排行','GET','/index/topBaseSubscription/5','path条数5','array catalogueName/applyNum'),api('应用列表','GET','/index/app/appList','无业务参数','categories[].systems[]')],layout:'顶栏下大横幅，左标题说明和立即体验，右插画；下方横列五指标，再分类卡、热点、应用轮播及三列排行；页面纵向滚动。历史首屏仅到分类卡，底部靠元素/模板约束。',flow:'进入首页并行读取五块数据→独立显示成功/空/失败→选择分类/热点/应用→按目标路由或宿主消息进入。',checks:['汇总返回0、缺值和失败，分别显示0/未知/失败，不能混同。','主题/基础切换只改卡组；了解详情进入/resource且不杜撰分类条件。','热点4项及7/5/5排行依返回排列，核对各计数字段与单位，日期口径依聚合合同。','应用每页3项、手工轮播，缺描述和空分组可用；安全处理宿主跳转。','部分接口断网/乱序返回仅影响自身区块；没有独立分页或数据维护按钮。']};
 case 'list':return{goal:'按条件查询责任清单与负面清单，核对供方、共享方式及不予共享依据。',fields:listFields,controls:[['四筛选框/查询','只更新草稿；查询提交快照并回第1页；清空合法','失败保留条件，字典失败可重试'],['重置/责任与负面页签','清四条件、pageNo=1/pageSize=10；保留当前页签','仅读取；迟到响应不得串页签'],['翻页/条数/目录链接','分页按当前快照；点击目录按行id进/resource/detail','表格空态和错误分开；返回恢复上下文']],apis:listApis,layout:'面包屑下白色筛选卡：目录名称、分类、资源类型、更新周期横排，右下查询/重置。下卡先责任/负面页签，再固定高滚动表格，分页右下；负面页签以依据列替换供数/事项列。',flow:'加载分类及四字典→默认责任清单查询→提交条件或切页签→展示datas/total→按稳定id进入详情→返回恢复快照。',checks:['分别准备责任/负面数据，核对两个POST路径、四字段与pageRequest，不把负面清单解释成可订阅。','查询/重置/切页签/清空/翻页/条数逐一验证；新查询回1且序号跨页连续。','负面只显示不予共享依据；责任显示供数方式及关联事项；未知字典不显示允许。','失败、空、无权、旧响应分开；乱序返回不覆盖当前页签/条件。','目录ID链接及直接URL鉴权，返回恢复筛选页码；进入详情可发生独立访问量更新，非业务授权。']};
 case 'resource':return{goal:'通过目录树、筛选、排序及两种布局发现资源，执行独立的个人车/收藏动作。',fields:resourceFields,controls:[['搜索/树勾选/分类标签','读取独立条件；重置页码；树三根分开映射；标签跨维度组合','加载失败不伪装空树；不串旧候选'],['排序/页码/显示布局','方向首次降序再切换；只布局切换不重新授权','排序/新筛选回1；迟到列表隔离'],['加入购数车/快速订阅','依据canAddCars/canApply及shareType!="3"门控；快速订阅先加入购数车再跳/dataSet','写入单在途；仅受理成功后更新标识；未知结果先回读车'],['收藏/已收藏','canFavorites真添加、假取消，collectType1/bizType/bizId','失败恢复原状态，非目录删除'],['目录名/我的购数车','按目录id进详情，购数车按钮进/dataSet','详情将自动更新访问量；不把浏览声明为绝对零写入']],apis:[api('树根/子类','POST','/catalogueInfo/treelist','JSON {categoryType:1|2|3}','id/categoryName/categoryType/children'),api('筛选候选','GET','/catalogClassify/findList','query {type:"3"|"4"|"5"}','array value/name；不能用样本固定全部枚举'),api('目录查询','POST','/catalogueInfo/findPage','JSON paramsObj全部筛选+pageRequest','{datas,total}；两布局同数据'),...cartActions,dictApi],layout:'横幅左名称搜索与我的购数车、右插画；主体左目录树，右上三分类页签及标签、总数/排序/布局切换，再资源列表或网格，分页在右下。卡列展示提供方/范围/频率/类型/等级/更新时间，动作在卡右下。',flow:'加载树/分类/字典→组合筛选查询→核对卡片共享条件→详情或明确个人动作→回读相应车/收藏结果；申请另走购数车。',checks:['三类树勾选分入正确ID数组；层级映射与type标签、共享类型条件共同发送。','五排序字段及方向、卡片/列表、分页一致，total不伪作关联资源总数。','已加入/已申请或shareType3禁用，直接请求仍须服务端拒绝无权，不以隐藏代替。','加入车、快速订阅及收藏/取消分别核对body和回读；写超时不自动重复提交。','空数组、字典失败、树加载失败、乱序和失效目录正确恢复；路由返回保留查询。']};
 case 'detail':return{goal:'在申请前核对目录基本信息及共享开放条件。',fields:[f('目录 id','ID / route.query','是','','','由资源/清单/热点传入；保真验证；缺失不调用visitNum'),...['lastModifyTime','deptName','resourceType','updateCycle','shareScope','openType','shareType','securityLevel','canAddCars','canApply'].map(n=>f('目录摘要 infoModel.'+n,'readonly','','','','范围字典按目录数据，不将null开放值显示是','','上方摘要')),f('页签 activeName','tabs','是','basicInfo','basicInfo；resourceType1显示resourceInfo、2显示fileInfo','API/服务API不擅自展示库表信息项表'),...baseFields],controls:[['进入详情','校验id后读取目录；访问计数PUT为独立副作用','计数失败不自动无限重试；详情失败清旧对象'],['目录基本信息/资源信息/文件信息','按类型切换，组件复用当前infoModel及字典','无需因切标签重复增加访问计数'],['加入购数车/快速订阅','与资源列表同门控及POST行为','快速订阅先加入车再进入申请；不是立即授权'],['返回/面包屑','返回来源；无有效历史时去/resource','恢复查询；不回滚既有计数/车写入']],apis:[readDetail,api('访问计数','PUT','/catalogueInfo/visitNum/{id}','path目录id，无业务body','created时独立调用；自动更新访问量，不能称纯读取'),cartActions[0],dictApi],layout:'沿用资源横幅；面包屑右侧返回；摘要白卡显示时间、单位/格式/频率/范围、开放/共享/等级，右下两动作；下卡标签，基本属性和共享开放属性分组，两列文本。',flow:'有效目录id→独立详情读取及访问计数→字典解码→核目录及字段条件→明确选择加入车/快速订阅→申请表另提交。',checks:['从列表/清单/热点携带同一id，GET详情与PUT访问计数分开核对；缺ID阻断。','基本属性14项与摘要/共享开放信息完整；0与null/未知开放状态不混同。','资源类型1/2分别有资源/文件页签，API不伪造信息项；切页签不再计访问。','共享类型3或动作标记不可用时禁止申请；服务端验证目录/字段权限及当前有效状态。','返回恢复来源；详情/字典失败不泄露上次目录数据，计数失败不妨碍明确报告读取状态。']};
 case 'items':return{goal:'核对目录挂载资源及信息项级共享、安全和字段元数据。',fields:itemFields,controls:[['资源信息/文件信息页签','资源类型1展示两表；类型2只资源表','从当前目录模型读取，不另造分页或预览请求'],['表格/溢出提示','展开可读长字段；共享/开放/安全未知值明确显示','不允许在详情改字段或任意下载数据'],['购数车字段选择（复用组件）','仅申请上下文开启勾选，写本地catalogueItemList','选择不保存目录元数据，不构成授权']],apis:[readDetail,dictApi],layout:'摘要下白卡中选中资源信息，先基本信息表，后信息项信息长表；序号左，名称/英文名/类型/长度/精度/主键/共享类型/范围/开放/安全依次排。纵向滚动可看完整行，横向表独立滚动。',flow:'进入目录详情→选资源信息→核资源和字段政策→申请上下文才选择字段→生成catalogueItemId/cascadeGuidItem；不能凭字段名获取数据。',checks:['resourceVoList及itemList逐列对应，不把varchar长度255等样本当本页输入校验。','null/空shareScope和缺dataSourceDo不崩溃，不把未知主键/开放显示是。','详情无选择列，购数车显示选择列且至少一库表字段；两个上下文不污染。','字段与目录共享范围冲突由服务端有效策略裁决；直接换字段ID不得越权。','长表、长字段名、类型2文件无信息项、空数据/读取失败布局均可区分；无任意行数据预览承诺。']};
 case 'cart':return{goal:'选择目录与信息项、供数及附件，提交可回查的订阅申请。',fields:cartFields,controls:[['全选/单选/展开目录','重算所选及半选；展开基本/库表/文件标签，库表字段逐选','普通进车均不选；quick query上下文只选择匹配条目'],['移除','确认“确认从购数车中移除？”→DELETE车条目id→回读列表并清选择','取消确认不删；移除不删原目录、不撤销已批准订阅'],['自动交换/执行时间/信息项','库表自动交换显示时间，字段选择只改本地申请草稿','自动交换时间/字段不合法阻止提交；不同目录草稿隔离'],['点击上传/移除附件','选文件后立即上传；成功保存返回ID；移除按uid维护ID映射','上传中禁订阅；失败可重试；取消不代表回滚已上传附件'],['订阅','验证三文本/选目录/库表字段/上传完成/条件供数时间→POST申请','同一申请单在途；成功提示操作成功并进入/resource；不是授权完成'],['取消/返回/继续订阅','取消/返回走历史，继续订阅去/resource；有草稿给离页提示','不发送申请、不隐式清服务端车；已上传附件按批准留存/清理合同']],apis:[api('申请主体','GET','/catalogApply/user','无业务参数','deptName/name；提交身份由服务端确定'),api('读取车','POST','/enoughCars/list','普通调用传空字符串，经公共request的r或{}转为JSON {}；快捷入口JSON {catalogueId:query目录id}','array车id/catalogueDto；默认provideType=resourceType,autoExchange=0,checked=false'),api('移除车条目','DELETE','/enoughCars/{id}','path车条目ID','成功回读列表、清选择/半选'),api('上传申请附件','POST','/back/dcs/catalogue/oss/applycatalogue/catalogueSubscribe/upload','FormData code=0,file；由客户端生成multipart边界，不手工JSON化','返回值作为附件ID push到ossFileIds；需服务端合同确认类型/归属'),api('正式申请','POST','/catalogApply','JSON {applyName,applyDesc,applyBasis,ossFileIds,resDtos}','正常解包链后提示并跳/resource；申请号/状态/幂等回查合同是接通门槛')],layout:'面包屑右返回；上方全选和目录/供方/类型/操作行，展开行内供数、自动交换/执行时间及基本/字段页签。下白卡申请表：单位/人两列只读，标题/说明两列，依据全宽，附件在下；底条左继续订阅及计数，右取消/订阅。',flow:'读身份与车→明确选择目录→核供数/字段/时间→填写三文本→可选附件立即上传→校验并人工订阅→核申请结果→后续审批授权/交换另办。',checks:['空车/未选目录、纯空白三文本、超50/200/500、库表无字段、自动交换无时间均阻止申请。','不同车id/目录id/字段id/cascadeGuid正确序列化；自动交换0/1和毫秒时间，非自动清旧时间。','允许后缀大小写、等于/小于10×1024×1024、伪装类型/上传失败/乱序完成；ID与uid一一对应，上传中不能提交。','移除确认取消无删除，成功回读；取消申请不承诺回滚附件/清车；重入不残留重复checked条目。','一次合法申请成功回查、拒绝/断网/超时未知先核申请号或幂等键；重复点击不重复申请，申请受理不代表授权/任务启动。']};
 case 'down':return{goal:'按资料类别及内容查询已发布资料，查看正文并按授权下载关联附件。',fields:[f('正文查询 paramsObj.body','string / input','否','空字符串','','点击搜索查询；后端匹配语义依合同'),f('发布条件 paramsObj.status','number / hidden','是','1','','用于资料page，不作为客户端唯一权限判断'),f('类别 activeName → category','tabs→number','是','"0" → 1','0政策依据/1标准规范/2对接指引/3操作指引；category=索引+1','页签切换重查，保留body；无已查客户端分页控件'),f('资料摘要 infoData.datas[]','readonly list','','[]','','id/title/body→bodyText/createTime/viewCount；文本摘要去标签不是正文安全净化'),f('资料详情 detailObj','readonly content','','{}','','title/lastModifyTime/deptName/viewCount/body；body为富文本，须白名单净化后渲染'),f('相关附件 gspAttachmentDos[]','array / links','','[]','','name为文件名；url作为下载path后缀；不允许任意源URL、路径穿越或无权对象')],controls:[['搜索/四页签','POST已发布资料页；页签0..3映射category1..4','空/失败分开，旧结果不能覆盖新类别'],['资料标题/返回','/down/detail?id={id}读取详情；返回列表条件','此GET是否计浏览量由后端合同，不声称无副作用'],['相关附件下载','明确点击后GET原始响应→saveAsFile(response,name)','HTTP错误/JSON错误体不能保存成文件；无权和下载失败可重试']],apis:[api('资料列表','POST','/back/gsp/manage/gspinfo/page','JSON {status:1,body,category:1..4}；未传pageRequest','{datas,...}；当前无翻页控件，完整条数/后端默认截断须合同'),api('资料详情','GET','/gspinfoPortal/{id}','path资料ID','detailObj含正文与附件集合；不从列表摘要拼接正文'),api('资料附件下载','GET','/back/gsp/manage/gspOss/download1/{url}','path附件url字段；query {}；options performance.rawData=true,responseType="blob"','含Blob的原始response对象交SDK saveAsFile(response,name)；rawData提前返回，绕过普通HTTP 202拒绝分支；SDK解包及类型/状态/文件名按下载合同校验')],layout:'大横幅左标题/说明/搜索、右插画；下方四横排类别标签，中白卡显示类别及资料标题、摘要、时间/访问量。详情为面包屑/返回、标题、时间/部门/浏览量、富文本正文和相关附件链接。',flow:'查询已发布资料→打开资料详情→安全渲染正文→明确选择附件→服务端下载鉴权→二进制保存；这不是资源数据批量导出。',checks:['四类别和body/status请求准确；正文摘要/标题/时间/浏览量与返回一致，不杜撰资料分页。','合法/无效资料id及返回恢复；空资料、失权、查询失败分别显示。','富文本含脚本/事件/危险链接被净化，innerHTML不得直接信任；安全正文保留格式。','下载对url/对象/身份授权，路径穿越及跨身份拒绝，非200/JSON错误不另存为正常附件。','长文、无附件、附件同名和断网恢复可用；列表不伪称下载完成或资源数据获授权。']};
 default:throw Error('Unknown GSP profile '+e.kind);
 }
}
const NFR=[
 ['001','传输与秘密','门户、申请、上传/下载全链路使用批准TLS；日志/URL/错误/存储不含令牌或附件内容。','隔离环境核链路及标记秘密，任一明文或混合内容泄露失败。'],
 ['002','目录及字段授权','100%查询、图谱节点、车、收藏、申请、附件请求由服务端逐对象核验范围；负面/下线/撤权对象不可申请。','两身份矩阵直接URL/目录/字段/附件换ID，0条越权；按钮隐藏不计通过。'],
 ['003','申请一致性','申请主体来自会话，提交时重新检查目录版本/字段/材料/供数与时间；申请受理、审批授权、交换任务分别记录。','并发下线/字段撤权/跨账号提交故障注入，非法申请0条；回查申请ID和有效权限。'],
 ['004','首屏与交互','门户冷首屏P95≤4秒；本地标签/布局/选择反馈P95≤150ms；失败区不阻塞其他区。','固定浏览器/1500×1000、下行20Mbps/RTT50ms，冷/热各50次，进入路由到关键控件可操作；失败计入。'],
 ['005','查询容量','隔离环境50并发用户、10万目录/100万字段，列表/清单P95≤2秒、P99≤5秒，非预期失败率≤1%。','批准资源和索引配置，思考2秒、预热5分钟/统计15分钟且≥1000请求，报告实际QPS/在途/失败；不足样本不通过。'],
 ['006','超时与竞态','HTTP读/JSON申请须有限期限；超时1秒内解除忙碌，旧响应0次覆盖新上下文；申请和上传不盲目重放。','分别注入延迟/断网/乱序和离页重入50次；记录请求数及草稿/状态；业务任务时限独立。'],
 ['007','幂等与结果未知','同一车加入/收藏/申请重复点击不重复写入；申请未知结果按批准幂等/回查合同恢复。','客户端共享锁加服务端并发重复请求，核唯一业务记录；未有回查合同不能以提示成功验收。'],
 ['008','上传安全','单文件严格<10MiB且后缀白名单；服务端核内容/病毒/归属；100%上传ID与文件uid映射，失败/乱序不误删其他ID。','0字节、边界值、双扩展名、大小写、伪装类型及3文件乱序完成；后端签署数量/总大小/留存上限后测。'],
 ['009','下载与富文本','正文白名单净化；下载授权、二进制/错误体判别及文件名规范化，0条脚本执行/路径穿越。','隔离样本含事件/脚本/危险URL及错误JSON、同名/超长文件名，验证保存内容/类型与拒绝。'],
 ['010','图谱性能与资源','隔离图谱1000节点/2000边首次绘图P95≤3秒，拖动缩放反馈P95≤150ms；按系统独立分页及释放实例。','固定客户端与图数据50次；重入100次监听/实例不增长，首末稳定堆内存增幅≤10%，失败不挂起promise。'],
 ['011','审计','申请/附件/车/收藏/访问量等按批准级别记录主体、对象、动作、时间、结果及请求关联；不记录附件正文/凭据。','成功/拒绝/未知各串联服务端审计与对象回读，缺关联失败；期限和可见角色按签署政策，不自定天数。'],
 ['012','兼容与布局','交付时记录Windows11当前稳定Chrome/Edge完整版本；1366×768、1500×1000、1920×1080及200%缩放操作可达。','逐页/长表/长文/空/错误/弹层矩阵，正文换行、二维表内部滚动，页签及取消/提交不能被裁掉。'],
 ['013','可访问性','100%实际输入/图标有可读名称；键盘可导航、提交/关闭回焦、错误关联字段；图谱提供可键盘访问的同等关系信息。','自动扫描加键盘/读屏人工核查10功能，普通文字对比≥4.5:1；不能以自动扫描替代整体符合性。'],
 ['014','抗滥用与隔离','查询/计数、上传/下载及申请分别有服务端限流维度/窗口/阈值/恢复；账号切换清候选/草稿/附件缓存。','使用批准策略边界及恢复测试，不在生产试错；跨账号缓存泄露0条，限流仍保留可恢复上下文。'],
 ['015','契约与可维护','字段/类型/字典/网关/错误/时区/图谱及申请回查合同可版本化；原编号、来源与生成刷新100%保留。','契约样本+离线hash验证、损坏/重排反例、两次刷新零差异；不从HTTP成功猜code=0。'],
 ['016','留存与恢复','车、申请、附件临时/正式对象归属及取消/失败清理按批准政策；恢复不重放历史订阅或交换。','签署留存及恢复方案后演练断点/清理/恢复；有效附件误删0、孤儿超期0，未有批准RTO/RPO不造数。']
];
const shot=id=>'['+id+'图](../evidence/'+(id.startsWith('E0')?'':'live-recheck-20261022/')+id+'.png) / [原元素与采样时间](../evidence/'+(id.startsWith('E0')?'':'live-recheck-20261022/')+id+'.json)';
function renderFeature(e){const p=profile(e);return[
 '### '+e.id+' '+e.title,'','**业务目的**：'+p.goal,'','**入口与前置条件**：'+e.route+'；有效会话及本页对象/动作授权；资源详情需query.id，快捷申请需query.catalogueId。','',
 '<!-- 完整规格:'+e.id+' -->','',
 '#### 1. 页面字段清单（'+e.id+'）','',...table(['字段与绑定名','类型/控件','是否必填','默认值','长度/范围/单位','格式及校验','错误提示','条件/状态'],p.fields),
 '属性空白表示没有可采纳的已交付约束，不代表无限制；按核查记录具名合同接通，禁止自行增加租户/角色/审批DTO。','',
 '#### 2. 页面交互规则（'+e.id+'）','','**操作与规则**：逐控件采用下表行为，写动作与浏览分开授权。','',...table(['控件/触发','行为及联动','忙碌/失败/恢复'],p.controls),
 '#### 3. 业务流程与异常分支（'+e.id+'）','','1. '+p.flow,'2. 校验当前路由和稳定ID，依赖加载与业务列表独立管理；以请求快照和序号隔离迟到响应。','3. 空数据、候选失败、无权、业务拒绝、网络/解析失败分别显示；失败不覆盖上次有效上下文或把未知数量写0。','4. 写结果未知先按批准合同回查；恢复认证不自动重放申请/上传/删除。离页取消本地等待，不承诺服务端回滚。','','**结果与异常处理**：字段错误定位到输入，保留安全草稿；显式重试读取。新申请由服务端结果回读，界面提示、访问次数和按钮状态均不证明授权或交换完成。','',
 '#### 4. 接口与数据规则（'+e.id+'）','','**开发处理细则**：方法、路径、参数与ID作用域按表；默认网关/序列化/响应与时间规则见第4节，实际生效配置以交付合同为准。','',...table(['用途','HTTP方法','相对路径','参数来源/序列化','返回与处理'],p.apis),
 '普通响应链读取response.data，HTTP 202进入业务reject；performance.rawData=true提前返回整个response并绕过该202分支，下载单独核状态与内容；1002认证失效、1003无权、1109改密、1012刷新由宿主处理。局部finally解除忙碌，失败与空数组分开；无统一code=0成功判断。没有后端响应合同的写/下载回查不得以虚构成功码接通。','',
 '#### 5. 验收标准（'+e.id+'）','',...table(['验收编号','前提、操作与可检查结果','关联需求','状态'],p.checks.map((s,i)=>['GSP-AC-'+(e.start+i),s,e.id,'未执行'])),
 '#### 6. 权限与安全要求（'+e.id+'）','','服务端逐对象核验目录、资源、信息项、图谱节点、个人车/收藏、申请及附件所属范围。查看、车/收藏变更、提交申请、审批授权、交换运行和下载独立鉴权；不根据canApply或菜单推定后端角色矩阵。直接URL/换ID、下线/撤权均检查；正文/错误输出编码或净化，敏感数据源详情按权限脱敏。','',
 '#### 7. 页面布局与状态（'+e.id+'）','',p.layout,'','分别定义初始化、加载、有值、空、失败、无权和适用的校验/提交/结果未知状态；布局留足重试/错误空间，长文本不压住按钮。弹层清上个对象并回焦；窄屏换行、表内滚动。1500×1000历史样本不固定所有视口尺寸。','',
 '#### 8. 关联文档（'+e.id+'）','',shot(e.evidence),'','[规则核查与差异](./核查记录.md) · [专项原文及摘要](../evidence/gsp-review-20261027/README.md) · [主规格](./需求说明.md) · [子页面](./子页面与操作细化.md)','',
 '#### 9. 非功能性需求（'+e.id+'）','','关联GSP-NFR-001至016；统计/列表适用性能、权限、恢复及布局；图谱另验资源与键盘替代；申请适用幂等、一致性/附件留存；资料适用富文本/下载安全。没有上传的页面不强加上传控件，目录浏览不等于数据导出。全部应用验收未执行。',''
 ].join('\n');}
function validateLedger(kind,old){
 const l=ledger[kind],ids=[...old.matchAll(/^### (GSP-\d{3}) /gm)].map(x=>x[1]),ac=[...old.matchAll(/^\| (GSP-AC-\d{3}) \|/gm)].map(x=>x[1]);
 if(JSON.stringify(ids)!==JSON.stringify(l.requirements.map(x=>x.id)))throw Error('GSP requirement registry lost/reordered');
 if(JSON.stringify(ac)!==JSON.stringify(l.acceptance))throw Error('GSP acceptance lost/reordered');
 if(old.includes('gsp:generated-spec-v1')&&!old.includes('<!-- 业务规格格式:plain-v1 -->'))throw Error('GSP plain format missing');
 for(const row of old.split('\n').filter(x=>/^\| GSP-AC-/.test(x))){const c=row.split('|').map(x=>x.trim());if(c.find(x=>/^GSP-\d{3}$/.test(x))!==l.associations[c[1]])throw Error('GSP acceptance association changed');}
 for(const row of l.sourceRows)if(!old.split(/\r?\n/).includes(row))throw Error('GSP source rows lost');
 const entries=kind==='main'?MAIN:SUB;for(const e of entries){const b=old.split('### '+e.id+' ')[1]?.split(/^### |^## /m)[0]||'';if(!b.includes(e.evidence+'.png'))throw Error('GSP evidence missing '+e.id);}
}
function renderDocument(kind,old){validateLedger(kind,old);const entries=kind==='main'?MAIN:SUB,l=ledger[kind],tail=l.acceptance.filter(x=>+x.split('-').at(-1)<524);
 return['# 数据服务门户'+(kind==='main'?'业务需求说明':'子页面与操作需求细化'),'','<!-- 业务规格格式:plain-v1 -->','<!-- gsp:generated-spec-v1 -->','',
 '## 1. 业务目标与使用角色','','帮助数据使用者发现目录、核对资源及字段条件，形成可回查的订阅申请；门户维护个人车/收藏/申请引用，目录生命周期由目录管理系统负责。数据使用者只是业务角色称谓，实际角色矩阵及对象范围由服务端合同确定。','',
 '## 2. 业务范围','','首页、业务图谱、数据资源、资源基本/字段详情、责任与负面清单、资料/附件下载、购数车及申请。保留原需求/验收编号和来源；资料详情及图谱节点浮层在所属功能内细化，不冒用新编号。个人中心后续审批/授权及交换引擎只定义交接边界。','',
 ...table(['对象','维护/查询范围','业务边界'],[['目录及信息项','发现、查看、核对共享条件','新增、编辑、删除原目录在目录管理模块；本门户不提供目录CRUD'],['购数车及收藏','加入、移除和选择','不改变原目录、正式申请或既有授权'],['订阅申请及附件','条件选择、材料上传、正式提交','申请受理不代表授权；上传选择即写入，取消不自动回滚'],['图谱/汇总/资料','只读查询及独立计数/下载','打开目录详情有访问计数副作用；下载按对象重新鉴权']]),
 '## 3. 功能需求','','以下是目标业务规则；现有实现与修正的对应关系见独立核查记录。全部功能及非功能应用验收未执行。','',entries.map(renderFeature).join('\n'),
 '## 4. 字段与业务规则','','### 网关与公共请求','','应用基路径/gsp-portal；默认API_BASE_URL为/back，gspPortal=/gsp/portal，gspManage=/gsp/manage，commonBasic=/common/dict，rdmCatalogue=/dcs/catalogue，dsesMgt=/dcs/mgt。MODULE_URL_PREFIX可覆盖；微应用从宿主getRequestInstance取得请求，不在页面拼部署地址。','',
 '普通POST为JSON，非GET公共request使用data=r或{}，顶层null/空字符串/0/false转为空对象，嵌套字段不由此规则转换；GET只在参数truthy时设置params，再由公共序列化器处理。目标接口必须明确各字段的空值与类型，ID按签署类型保真，不能用展示名/序号或未经验证parseInt替代。上传使用FormData，浏览器生成multipart边界；下载responseType="blob"且performance.rawData=true，不按普通业务JSON解包。会话/防伪及签名头仅登记名称adq-token、X-CSRF-TOKEN、X-TIMESTAMP、X-NONCE、X-SIGN，不记值。','',
 '普通HTTP链返回response.data，HTTP 202走业务拒绝；rawData提前返回整个response，绕过普通202分支，下载必须单独校验；全局1002/1003/1109/1012分别处理失效、无权、改密和刷新；不是code=0通用成功。超时先取路径规则非负数，再取请求number timeout，无数值才回退20000ms；0可能无限，目标是有限期限。超时不证明未提交，申请幂等/回查、附件归属、下载错误体识别是接通前合同。','',
 '### 字典、分页与时间','','清单四条件默认为空字符串；pageNo1/pageSize10，类别3树和业务字典独立加载；目标查询/条数变化回1、页签重置条件，维护草稿与已提交快照。资源列表pageNo1/pageSize4，三类目录数组分开；资源层级2/3/4映射shareScopes=[5,6,7]/[3,4]/[1,2]字符串数组，-1为空。排序字段1..5、方向首次2后1/2；布局list/card不影响数据。资料page未传分页参数，不虚构全量下载/分页能力。','',
 '目录共享范围在列表按本地SHARED_SCOPE显示，详情/信息项按业务字典；必须交付统一映射与目录/字段继承及覆盖策略，不能依文案判权限。openType/asPrimaryKey的0为否，其余值须合法枚举，未知不默认是。visitNum、申请数、授权数、独立资源总数及目录数必须分口径；统计周期/去重依聚合合同。','',
 '### 申请、附件与结果一致性','','快捷订阅POST enoughCars后带catalogueId到/dataSet；普通车读取调用参数为空字符串，经公共request的r或{}变成JSON {}，快捷读取对象。车条目id、catalogueDto.id、信息项id/cascadeGuid、ossFileId分别管理。三文本50/200/500字符且拒绝纯空白；库表须选信息项，自动交换须有效execStartTime毫秒timestamp，关闭清隐藏值。API/服务API虽有资源卡，车只有库表/文件供数单选，未交付相应协议不能承诺可完成API订阅。','',
 '请求仅applyName/applyDesc/applyBasis/ossFileIds/resDtos；不追加客户端申请人/部门/角色。resDtos每项catalogueId、provideType、autoExchange数字0/1、execStartTime，库表catalogueItemList每项catalogueItemId/cascadeGuidItem。服务端重新核主体、目录/字段/材料及版本，申请回查与审批授权分离。','',
 '上传单文件严格小于10×1024×1024字节（代码提示10MB）；允许xls/xlsx/doc/docx/pdf，立即写附件。附件ID与uid绑定，删除任一项不能误删其他ID；移除本地引用不证明服务器对象删除。取消不回滚已上传文件，按批准临时归属/留存/清理合同执行。资料正文innerHTML必须白名单净化，附件url只作为批准对象后缀，禁止路径穿越与任意源下载。','',
 '## 5. 主要业务流程','','发现目录→查看目录/字段共享条件→明确加入购数车或快捷进入申请→选目录/字段/供数/时间→填三文本和可选材料→提交并回查申请→审批及授权确认→独立交换配置/运行。目录浏览、申请受理及访问量都不是授权完成的证据。资料查询→资料详情→授权附件下载为独立流程。','',
 '## 6. 验收标准','','按第3节逐项执行，保留以下原验收编号及归属。记录身份、数据、前提、请求/回读、期望/实际、证据和时间，全部未执行。','',
 ...table(['验收编号','前提、操作与可检查结果','关联需求','状态'],tail.map((id,i)=>{const rid=l.associations[id],e=entries.find(x=>x.id===rid);return[id,profile(e).checks[i%5],rid,'未执行'];})),
 '## 7. 实现与交付边界','',...(kind==='main'?table(['历史编号','操作','归属/交付边界'],[['GSP-101','数据清单详情','GSP-505/506及目录id；不新增目录维护页'],['GSP-102','新增数据清单','原目录新增在目录管理；本门户只新增个人车/收藏/申请'],['GSP-103','编辑数据清单','目录元数据维护在目录管理；申请草稿单独管理'],['GSP-104','删除确认','门户只删除个人车/收藏引用，原目录删除不在本模块']]):[]),
 '页面/已查调用端及目标恢复可开发。后端DTO/字典/权限、统计口径、图谱节点详情、API订阅支持、附件限制与留存、申请幂等/回查/审批授权、下载及交换交接均按核查记录交付包接通。无合同不猜状态码、授权有效期或任务执行保障。未新增AI自动申请/审批/授权能力。','',
 '## 8. 关联资料','',...(kind==='main'?['| 需求编号 | 界面依据 | 详细记录 |','|---|---|---|',...l.sourceRows,'']:table(['需求编号','历史依据','核查'],entries.map(e=>[e.id,shot(e.evidence),'[核查记录](./核查记录.md)']))),
 '[主规格](./需求说明.md) · [子页面](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [原始调研](./调研记录.md) · [证据](../evidence/gsp-review-20261027/README.md) · [总索引](../README.md)','',
 ...(kind==='main'?['## 9. 非功能性需求','','以下为新增交付目标，未有实测。来源与取舍见核查记录；记录构建、客户端完整版本/CPU/内存、网络RTT/带宽、冷热缓存、服务器/数据库/索引/安全/限流配置、真实业务规模。分位采用升序第ceil(p×N)项，报告P50/P95/P99/最大值、N、吞吐及失败次数；合法请求的限流/5xx/超时/解析/错误业务结果均计失败，预期业务拒绝单列。零或不足样本不判通过；月度SLA/RTO/RPO须批准合同及持续观测/演练。','',...table(['编号','质量属性','指标/不变量','环境、方法与失败判定','关联功能','状态'],NFR.map(([n,q,s,v])=>['GSP-NFR-'+n,q,s,v,'GSP-100、001、500至507','未执行']))]:[]),''
 ].join('\n').trimEnd()+'\n';
}
function write(root=path.resolve(__dirname,'../doc/requirements')){let changed=0;for(const [k,n]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){const p=path.join(root,'17-数据服务门户',n),old=fs.readFileSync(p,'utf8'),next=renderDocument(k,old);if(next!==old){fs.writeFileSync(p,next);changed++;}}return{changed,requirements:10,acceptance:80,nonfunctional:16};}
if(require.main===module)console.log(JSON.stringify(write()));
module.exports={MAIN,SUB,NFR,profile,renderFeature,renderDocument,write};
