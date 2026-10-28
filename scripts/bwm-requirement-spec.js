/* Reviewed authored specification. Application source is evidence, never executed. */
const catalog=require('./bwm-requirement-catalog.json');
const MARKER='<!-- bwm:reviewed-spec-v1 -->';
const pad=n=>String(n).padStart(3,'0');
const F=(name,type,required='',value='',range='',format='',error='',state='')=>[name,type,required,value,range,format,error,state];
const msg='/common/msg/msg',flow='/common/workflow';
const A=(method,url,data)=>[method,url,data];
const authored=[
{
 purpose:'按告警名称、标识、级别和产生时间定位平台异常，读取定位信息；清除告警是单独受控写入。',
 fields:[F('名称 name','string筛选','','','','trim'),F('告警ID obscureKey','string筛选','','','','trim'),F('级别 levelList','数组多选'),F('产生时间 createTimeBegin/createTimeEnd','string范围','','','','yyyy-MM-dd HH:mm:ss；清空为null'),F('详情 key/name/level/appName/createTime/content/helpUrl/alarmName/hostInfo/businessInfo','只读','','','','定位信息由hostInfo与businessInfo组合；helpUrl与alarmName单独展示'),F('告警结果','只读行','','','','名称、告警ID、级别、产生时间、来源、定位信息、定位业务URL、处理人；行id定位')],
 controls:[['查询/重置/分页','查询固定当前条件快照；重置清空可选条件并回第一页；页大小改变回第一页。迟到响应不得覆盖新筛选。'],['名称/定位URL','按行id读告警；链接检查协议、来源和当前资源权限，不直接信任日志内URL。'],['清除','显示目标告警及影响，确认后调用clean接口；回读同一告警及列表，不把清除解释为自动恢复、认领或删除。']],
 steps:['打开列表并加载 → 组合条件 → POST分页 → 展示datas/total及级别标签；有效零条、拒绝和格式错误分开显示。','时间逆序阻止查询；详情读取失败不可显示上一告警；清除超时显示结果未知，先回读，不自动再次清除。'],
 apis:[A('POST','/common/monitor/alarm/page','筛选+pageRequest，响应使用datas/total'),A('GET','/common/monitor/alarm/{id}','行id'),A('PUT','/common/monitor/alarm/clean/{id}','行id，独立写入')],
 layout:'后台菜单在左，右侧上部标题、筛选与查询/重置；条件展开后按名称、告警ID、级别、产生时间排列，下方表格及分页。定位字段过长可查看完整文本；空表格保留标题和条件。',
 checks:['检查名称、ID、级别数组及时间格式与请求一致，重置回第一页。','返回两页和有效空数据，total与分页一致，零条不显示故障。','模拟无权限、畸形数据和5xx，旧列表不冒充本次成功。','对定位URL注入外链和无权对象，拒绝危险导航；清除超时先回读。','快速改条件连续查询，仅最后一次结果可见；取消清除零写请求。'],nfr:[1,2,4,5,6,8,10]
},
{
 purpose:'管理消息类型编码及渠道所绑定的类型；渠道启停独立于类型创建和编辑。',
 fields:[F('消息类型 name','string','是','空字符串','24','trim','填写消息类型'),F('类型编号 code','string','是','空字符串','1–20','仅英文字母或数字','编号格式错误'),F('备注 remark','textarea','','空字符串','100','trim'),F('渠道名称 channelName','string','是','',100,'','填写渠道名称','禁用'),F('类型 msgTypeDisplay','number数组','是','','','候选value=codeId','请选择消息类型'),F('存储 msgType','string','','','','数组join(",")；读回split再Number'),F('渠道筛选 channelName/msgType/enable','string/编号/number','','','enable=1启用、0禁用')],
 controls:[['类型新增/详情/编辑/删除','新增校验name/code，详情禁用；API提供编辑删除不代表每个账号可见。编码重复与引用保护由后端拒绝，不允许客户端猜唯一范围。'],['渠道编辑','先读渠道与类型候选，回显数字数组；候选失败或截断时阻止覆盖保存，不因未知候选把已有绑定清空。渠道无新增规格。'],['渠道启停','enable=1走disable，否则走enable；执行前回读状态，确认影响后调用；界面忙碌防连击。']],
 steps:['列表分别查询 → 类型新增或渠道读取 → 本地校验 → 显式提交 → 回读同一id。','渠道类型转换保持codeId，不用类型行id或展示名称代替；停用对排队/在途消息的语义需渠道合同，不能承诺撤回已发送消息。'],
 apis:[A('POST',msg+'/type/page','类型筛选+pageRequest'),A('POST',msg+'/type/list','类型候选'),A('POST',msg+'/type','{name,code,remark}'),A('GET/PUT/DELETE',msg+'/type/{id}','读/更新允许字段/删除，分方法验权'),A('POST',msg+'/channel/page','{channelName,msgType,enable,pageRequest}'),A('GET/PUT',msg+'/channel/{id}','读回或更新{msgType,...批准字段}'),A('PUT',msg+'/channel/disable/{id}','停用'),A('PUT',msg+'/channel/enable/{id}','启用')],
 layout:'类型表单依次名称、编号、备注，底部取消/提交；渠道表单名称禁用、类型多选。渠道列表按名称、消息类型标签、状态、创建时间及操作排列，筛选在上、分页在下。',
 checks:['类型24/25、编号20/21及非法符号、备注100/101分别检查；空必填阻止提交。','渠道读取逗号串后回显codeId数组，保存再转串，未知绑定不丢失。','重复编码、引用删除与类型加载失败不显示保存成功。','停用/启用按最新状态与目标id请求，拒绝及超时不反转假状态。','取消表单或确认框零写请求，连续确认单次请求；两个并发管理员不得静默覆盖。'],nfr:[1,2,3,6,7,8,13]
},
{
 purpose:'维护短信、邮件和系统消息模板；模板保存与向指定接收者发测试消息是不同业务动作。',
 fields:[F('标题 templateName','string','是','空字符串','64','trim','填写模板标题'),F('编码 templateCode','string','是','空字符串','1–64','英文字母、数字、下划线','编码格式错误','编辑禁用'),F('用途 templateType','number','是','空字符串','1短信、2邮件、3系统','','请选择用途'),F('内容 templateContent','富文本string','是','空字符串','','非空富文本','填写模板内容'),F('格式 templateTestJson','textarea','','空字符串','1000','trim；不得自行解释为已通过JSON/schema校验'),F('测试原始数据 originalParam','textarea','是','','1000','JSON格式提示；解析/变量规则按批准渲染合同'),F('测试标题/摘要 title/messageAbstract','string','是','','64/100'),F('测试内容 templateContent','富文本string','是','','10000','测试页独立长度校验'),F('测试类型 type/级别 level','候选编号','是'),F('测试通知对象 receiveType','number','是','','2用户、3部门'),F('测试接收者 receiveCodeList','ID数组','是','','','用户远程查询或部门树；切换类型清空'),F('测试模板名 templateName','string','','','64')],
 controls:[['新增/编辑/查看/删除','编码编辑不可改；内置inside=1模板不显示删除入口，服务端仍须保护。用途筛选templateTypeList多选，标题与编码独立搜索。'],['富文本/格式','编辑仅更新草稿；保存前按批准变量合同验证缺失/未知变量，富文本显示和服务端均执行允许列表净化。不能把格式textarea当邮件投递证明。'],['消息测试','带模板id进入独立测试页，加载模板、类型、用户候选和部门；明确收件人与影响后提交。测试接口可能实际投递，预览不得调用test；取消不发送。']],
 steps:['读模板 → 按用途编辑 → 校验标题/编码/内容 → 单次创建或更新 → 回读。历史投递保存当时渲染内容，修改模板不回写历史。','测试页选择用户/部门时清空旧选择；候选一次200不等于完整名单；加载失败不以空数组提交。发送结果未知先查投递记录，禁止盲目重发。'],
 apis:[A('POST',msg+'/template/page','{templateCode,templateName,templateTypeList,pageRequest}'),A('POST',msg+'/template','模板五字段'),A('GET/PUT/DELETE',msg+'/template/{id}','读/更新/删除分别授权'),A('POST',msg+'/message/test','测试表单；已查包装器不提供纯预览语义'),A('POST','/common/user/user/page','{obscureName,pageRequest:{pageNo:1,pageSize:200}}，用户候选'),A('POST','/common/user/dept/tree','部门树候选')],
 layout:'标题与编码并列首行，用途下一行；内容为通栏富文本工具栏与编辑区，格式为底部通栏textarea；取消/提交在右下。测试页新增原始数据、标题摘要、类型级别和条件接收者区域，须滚动可达。',
 checks:['校验标题64/65、编码64/65和符号、用途三值；编辑编码伪造被后端拒绝。','格式1000/1001、内容空HTML、变量缺失与脚本载荷按批准合同拒绝/净化。','读失败不可保存空模板；inside=1直接删除也被服务端拒绝。','测试仅向选定对象发送；切换用户/部门后旧ID不进入请求；超时查结果。','取消/预览零test请求；双击只发一次；模板更新后旧消息内容不变。'],nfr:[1,2,3,6,7,8,9,11,13,14]
},
{
 purpose:'查看平台消息、渠道投递结果及不可编辑的消息内容，单独控制批量重发和删除。',
 fields:[F('筛选 uuidCode/appName/title','string','','','','trim'),F('typeList/sendStatusList','编号数组多选'),F('详情 title/messageAbstract/type/receiveType/level','只读','','','','标题、摘要、消息类型、通知对象、紧急程度','', '禁用'),F('content/originalParam','富文本只读','','','','type存在且不等于1时显示原始内容'),F('批量目标 multipleSelection','ID数组','','','','消息行id；不使用userMessageId'),F('投递结果','只读行','','','','编码、应用、标题、摘要、模板编码、类型、渠道、通知对象、投递状态及时间')],
 controls:[['筛选/详情','按当前消息id读取，查看不触发重发；状态展示渠道明细，发送状态与本人已读状态分开。'],['选择/重发','选择当前返回行id；无选择提示并零请求。调用端将ID数组JSON.stringify后传包装器；联调核实最终JSON字符串或数组的服务端合同。重发必须展示目标数量及原因、确认后单次执行。'],['删除','以逗号串idStr传DELETE体；确认删除范围与留存保护，不能暗示撤回外部渠道已投递内容。']],
 steps:['查询并固定条件快照 → 查看详情/渠道结果 → 返回原页；消息状态未知枚举显示原值与未知标签，不伪造成功。','重发接收成功与实际投递成功分阶段展示；部分失败保留逐项结果；超时核实投递批次，不自动重复触达。'],
 apis:[A('POST',msg+'/message/page','筛选+pageRequest'),A('GET',msg+'/message/{id}','平台消息详情'),A('GET',msg+'/message/user/{id}','用户消息详情的独立包装器'),A('POST',msg+'/message/resendMsgList','调用端JSON.stringify(消息ID数组)'),A('DELETE',msg+'/message/del','body={idStr:逗号串}')],
 layout:'上部筛选，表格前复选与序号、消息编码、应用、标题摘要等，表格上方重发/删除、底部分页。详情为标题/摘要、类型/通知对象/紧急程度等两列只读项；内容与原始内容通栏。',
 checks:['按uuidCode/appName/title和状态数组查询，详情id与行一致。','只读详情无提交入口且零resend请求；原始内容条件显示。','无选择重发零请求；有选择核对JSON.stringify及最终序列化。','部分失败、超时和业务拒绝不能全部标投递成功；按投递结果核实。','删除仅作用消息idStr授权范围；取消/连击/并发和重发去重分别验收。'],nfr:[1,2,4,5,6,7,8,9,14]
},
{
 purpose:'查看本人接收的消息和已读状态，明确打开详情本身具有标已读副作用。',
 fields:[F('筛选 uuidCode/appName/title/typeList','string/编号数组'),F('消息id/userMessageId','标识','','','','详情消息与接收关系分别定位'),F('readFlag','只读','','','1已读；0或null未读'),F('详情字段','只读','','','','title、messageAbstract、type、handlerStatus、receiveType、level、content、originalParam；type=3显示处理状态'),F('批量 multipleSelection','接收关系ID数组','','','','由row.userMessageId生成')],
 controls:[['详情','进入myNewsEdit.created即PUT read，idStr取parseInt(userMessageId)；必须把打开详情作为写入动作管理。用户授权查看且接受已读影响后才进入；无写权限提供明确受限状态。'],['批量已读/删除','选择userMessageId，已读传join逗号串；删除本人接收关系，与平台消息删除分开；空选提示。'],['全局通知','标已读成功后广播isUpdateNoticeList；广播刷新提醒列表不证明服务端持久化，须回读readFlag。']],
 steps:['读取本人消息 → 选择是否打开带已读副作用详情 → GET详情及PUT read → 回读同一接收关系；详情读取和已读失败分别呈现。','切换账号/空间清空缓存及选中项，后端从身份推导本人范围；伪造接收关系ID被拒绝。重复标已读不应重复业务通知。'],
 apis:[A('POST',msg+'/message/user','本人筛选+pageRequest'),A('GET',msg+'/message/user/{id}','详情'),A('PUT',msg+'/message/read','{idStr:number或逗号串}，前端两个调用形态须后端合同统一'),A('PUT',msg+'/message/loginRead','{idStr:userMessageId}，公告详情分支'),A('DELETE',msg+'/message/user/del','{idStr:逗号串接收关系ID}')],
 layout:'本人消息上部筛选，表头复选及上方批量已读/删除；未读与已读以文字和样式区分，不能只靠颜色。详情布局沿用消息详情，处理状态与原始内容条件显示。',
 checks:['本人查询不显示他人接收关系，账号切换无残留。','打开详情检查自动PUT read及userMessageId，不误当零写读取。','批量用接收关系ID逗号串；平台消息id不替代；空选零请求。','详情成功但已读失败须分别提示，广播后回读readFlag。','重复标读、跨用户ID、删除取消及网络超时按最小范围处理。'],nfr:[1,2,6,7,8,9,13]
},
{
 purpose:'创建公告草稿，分别发布、撤销及查看发布历史；本人公告阅读与管理端维护分离。',
 fields:[F('标题 title','string','是','空字符串','64','trim','填写标题'),F('内容 content','富文本string','是','空字符串','','非空富文本','填写内容'),F('摘要 messageAbstract','textarea','','空字符串','1000','trim'),F('紧急程度 level','编号','是','空字符串','','候选levelList','请选择紧急程度'),F('通知对象 receiveType','number','是','空字符串','1全部、2用户、3部门'),F('receiveCodeList','ID数组','条件必填','空数组','','receiveType=1可空，否则非空；切换清空'),F('历史 messageCode','string','','','','从行uuidCode取；不等于公告id'),F('发布状态 sendStatus','number只读','','','0或2进入发布分支，其他进入撤销分支；服务端批准状态表为准')],
 controls:[['新增/编辑/详情','保存只创建或更新公告内容，不隐式发布。用户远程查200条，部门树保留合法既有选择；详情读取publishHisList(messageCode)。'],['发布/撤销','发布或撤销前展示公告及接收范围，确认并重新验权；发送状态刷新后重新判定方向，不按旧行操作。'],['删除/本人阅读','deleteAnnouncemen包装器实际DELETE publishHis/{id}，须批准ID含义才启用，不能解释为公告实体删除。本人announcementDetails读取后自动loginRead；阅读有副作用。']],
 steps:['填标题内容、摘要、级别和对象 → 校验非空接收集合 → 保存 → 回读公告 → 按授权单独发布。','发布/重发/撤销历史与当前内容分开；撤销不承诺删除外部已送达副本。公告HTML展示使用innerHTML，目标要求净化，不能把既有渲染当安全证明。'],
 apis:[A('POST',msg+'/message/userNotice/page','管理筛选{title,levelList,sendStatusList,pageRequest}'),A('POST',msg+'/message/notice','公告表单'),A('GET/PUT',msg+'/message/notice/{id}','读/更新允许字段'),A('POST',msg+'/publishHis','{id:公告行id}发布'),A('POST',msg+'/publishHis/addRevoke','{id:公告行id}撤销'),A('POST',msg+'/publishHis/list','{messageCode:uuidCode}'),A('DELETE',msg+'/publishHis/{id}','删除发布历史；ID对应关系必须合同确认'),A('GET',msg+'/message/my/noticeMessage/{id}','本人公告详情，随后loginRead写入')],
 layout:'标题通栏，内容富文本占主要高度，下面摘要textarea，紧急程度/通知对象并列，再按对象显示用户选择或部门树；右下取消/提交。详情历史在下方滚动可达；本人阅读为标题、时间、内容。',
 checks:['标题64/65、摘要1000/1001、空HTML及紧急程度必填分别检查。','三种通知对象切换清空旧ID，候选失败禁止错误覆盖。','保存不发布；显式发布/撤销检查目标、当前状态、回读及审计。','删除历史ID不能冒充公告实体ID；内联HTML安全与阅读自动loginRead分别检查。','重复发布、并发编辑、超时及取消不造成重复通知；历史内容可追踪。'],nfr:[1,2,3,6,7,8,9,11,14]
},
{
 purpose:'分别显示可申请表单、本人发起、本人待办、本人已办与抄送工单，按关系与任务状态进入相应目标。',
 fields:[F('申请 formName/categoryCode','筛选string'),F('分类 categoryCode/标题 title','筛选string'),F('procStatusList/optTypeList/bizTypeList','编号数组筛选','','','','我的工单含操作类型；抄送含流程状态；待办/已办另有applicantName'),F('applyTimeRange','时间范围筛选','','','','本人/抄送转换applyTimeStart/applyTimeEnd；待办/已办转换createTimeStart/createTimeEnd；清空null'),F('列表结果','只读行','','','','来源应用、工单类型、业务编号、分类编号/名称、申请标题、申请时间、流程状态；本人/抄送含duration，本人含bizResult，待办含nodeDeadLine，待办/已办含taskName与applicantName'),F('工单身份 bizCode/taskId/formId/procInstId','标识','','','','业务、任务、表单、实例分别定位，不混用'),F('申请草稿','动态表单','','','','依据formJson和业务表单定义，不编造固定业务字段'),F('办理 optType/comment/ccUid/userStr/newAssigneeId','number/string/ID集合','','','','按操作显示；意见必填；候选来自当前taskId'),F('撤回/催办','操作参数','','','optType=2撤回、14催办','只表示包装器值，不是完整流程状态机')],
 controls:[['五个列表/查看','每种列表独立查询和分页；我的/抄送按bizCode，待办/已办按taskId读取；本人关系在服务端核验。'],['申请/保存/发起','申请先读可用表单，再显式创建biz/save；启动task/start是另一步，不假设保存即发起。动态表单读取失败阻止提交。'],['办理/撤回/催办/删除','任务办理仅待办授权入口，批准操作集合、节点候选、人员及意见后提交；并发重复办理服务端拒绝。撤回、催办、删除分别确认与限频，不能由详情查看触发。']],
 steps:['按本人关系进入列表 → 固定目标标识 → 读取基本信息/快照/轨迹 → 只读查看或显式进入办理。','办理页面发送optType,taskId,comment,ccUid,userStr,newAssigneeId；局部backTaskSid未进入已查提交体，退回节点语义须合同确认，不能捏造已支持指定退回。'],
 apis:[A('POST',flow+'/act/form/page','可申请表单'),A('POST',flow+'/act/biz/page','本人发起工单分页'),A('POST',flow+'/act/task/todo/page','待办'),A('POST',flow+'/act/task/done/page','已办'),A('POST',flow+'/act/biz/cc/page','抄送'),A('POST',flow+'/act/biz/save','创建业务工单，DTO按批准动态表单合同'),A('POST',flow+'/act/task/start','显式发起'),A('POST',flow+'/act/task/deal','办理；撤回追加optType:2，催办追加optType:14'),A('DELETE',flow+'/act/biz/{id}','删除目标工单'),A('POST',flow+'/act/task/next/node','{taskId}'),A('POST',flow+'/act/task/return/node','{taskId}')],
 layout:'左侧工作台五个叶菜单，右侧各自标题、条件和分页表。申请先选表单再进入动态内容；查看三页签见014；待办办理页多任务处理页签，不能强套三页签或给已办展示提交按钮。',
 checks:['五种列表按各自接口及本人关系加载，切换不串页。','申请读取formJson并校验，保存与发起分别触发及回读。','待办/已办分别以taskId读取，意见与条件人员校验，查看无deal请求。','重复办理/失权/超时不重复流转；撤回与催办分别检查optType及频率。','取消申请/办理/删除零写；直接路由和伪造bizCode/taskId仍验权。'],nfr:[1,2,4,5,6,7,8,9,12,14]
},
{
 purpose:'注册工作流业务分类，维护名称和说明，保持分类编码及已有模型/表单引用一致。',
 fields:[F('名称 categoryName','string','是','null','24','trim','填写业务名称'),F('编号 categoryCode','string','是','null','30','英文字母、数字、_、-','编号格式错误','编辑禁用'),F('备注 remark','textarea','','null','100','trim')],
 controls:[['新增/编辑/查看','新增可填编号；编辑先按id读取，编号禁用；查看全禁用。读取失败不提供可保存空表单。'],['提交/取消/删除','trim并校验后创建或更新，成功回读同一分类；取消草稿不请求。删除需引用清单和服务端事务保护，有模型/表单/实例引用按批准策略拒绝。']],
 steps:['查询分类 → 选择新增或读取现有 → 编辑草稿 → 校验 → 单次保存 → 回读列表。','唯一范围、编码大小写敏感、引用删除策略由分类合同固定；不得凭正则决定数据库唯一约束。'],
 apis:[A('POST',flow+'/act/category/page','筛选+pageRequest'),A('POST',flow+'/act/category/save','{categoryName,categoryCode,remark}'),A('POST',flow+'/act/category/one','{id}'),A('POST',flow+'/act/category/update','{id,...允许字段}'),A('DELETE',flow+'/act/category/{id}','分类标识')],
 layout:'详情右侧依次名称、编号和备注，底部右侧取消/提交；编辑编号置灰，查看全禁用。列表上方新增、下方分页，错误靠近字段与表单顶部。',
 checks:['名称24/25、编号30/31、备注100/101及必填检查。','编号允许字母数字_-，空格/其他符号拒绝，编辑伪造编号后端拒绝。','创建、读回、编辑与查看分支分别核对方法和id。','重复编号/引用删除/并发冲突不显示成功，保留可恢复草稿。','取消零请求，保存超时先查分类结果，连续提交单次创建。'],nfr:[1,2,3,6,7,8,13]
},
{
 purpose:'维护BPMN模型草稿与节点配置，分别执行复制、部署和已部署版本启停，保护运行实例的版本绑定。',
 fields:[F('模型名称 name','string','是','','100','批准命名规则'),F('业务分类 categoryCode','编号','是','','','候选值categoryCode','请选择业务','编辑禁用'),F('流程key','string只读','','','','从BPMN流程对象读取'),F('所属部门 deptIds','ID数组'),F('描述 description','textarea','','','500'),F('模型/定义/部署/版本 modelDefId/procDefId/deployId/version/modelKey','独立标识只读'),F('模型保存 xml/svg','string','','','','BPMN XML及SVG序列化'),F('复制 name/categoryCode/categoryName','string','是','','name最长100','分类选值组合拆分；名称英文字母、数字、中文、空白')],
 controls:[['画布编辑','新增/编辑显示节点工具栏，可选节点或流程并更新右栏；本地修改不等于已保存。校验节点标识唯一、连通性、网关条件及合法回路，不能一概禁止循环。'],['保存/节点配置','保存序列化XML/SVG，POST def/save；节点配置add/map是独立写入，不能声称与模型保存天然原子。失败保留草稿与未持久化提示。'],['复制/部署/版本','复制700px弹窗选分类/名称，以modelDefId为源；部署只传modelDefId；版本按categoryCode读取，启停用modelDefId与state=1/2。删除版本传deployId,procDefId,description:1。生成工单不属于复制/部署默认后果。']],
 steps:['加载分类/模型XML/deptIds → 草稿编辑 → 校验与单次保存 → 回读模型 → 明确授权后独立部署 → 刷新版本。','旧实例继续绑定其批准版本，不能由当前编辑图覆盖历史轨迹；重复部署和并发配置需后端版本/幂等协议。节点先保存而模型后失败时必须显示不同持久化结果，不能伪称全量回滚。'],
 apis:[A('POST',flow+'/act/def/model/page','{name,categoryCode,pageRequest}'),A('GET',flow+'/act/def/read','query={modelDefId,deployId,categoryCode}；使用readXml/deptIds'),A('POST',flow+'/act/def/save','{modelDefId,name,categoryCode,xml,svg,deptIds}，name/categoryCode由流程对象取值'),A('POST',flow+'/act/def/node/add/map','节点配置+{categoryCode,nodeId,procDefId}'),A('POST',flow+'/act/def/copyModel','{modelDefId,name,categoryCode,categoryName}；目标分类组合值按/拆分'),A('POST',flow+'/act/def/deploy','{modelDefId}'),A('POST',flow+'/act/def/list','版本查询，当前调用补categoryCode；modelKey过滤须合同固定'),A('POST',flow+'/act/def/model/enable','{modelDefId,state:1或2}模型启停'),A('POST',flow+'/act/def/enable','{modelDefId,state:1或2}版本启停'),A('POST',flow+'/act/def/del','模型或{deployId,description:1,procDefId}版本删除')],
 layout:'右侧工作区顶部工具栏，左窄列节点工具，中间网格画布，右属性栏；XML/SVG下载在右上，底部取消/提交仅编辑分支。属性栏名称、业务、key、部门、描述顺序；节点配置独立弹窗可内部滚动。',
 checks:['模型名100/101和描述500/501、分类失效、节点ID重复与断连按批准规则阻止保存。','XML读取失败不保存空模型；保存与节点配置分别核对结果。','复制新对象不覆盖源，部署与保存分开，失败不显示部署成功。','版本启停和删除使用各自标识；并发冲突、重复部署及旧实例版本绑定验证。','查看图零保存/部署；取消草稿和下载不调用写接口，失败保留草稿并可恢复。'],nfr:[1,2,3,6,7,8,10,12,13]
},
{
 purpose:'按运行/结束分区查看流程实例，分别授权挂起、恢复、结束及跳转。',
 fields:[F('分类/标题/申请人 categoryCode/title/applicantName','筛选'),F('状态 state/类型 bizTypeList','编号/数组'),F('时间 createTimeStart/createTimeEnd','范围','','','','清空null'),F('运行/结束 activeitem','number','','0','0运行、1结束','结束查询补finishProc=1及finishProcStatus=1'),F('实例 procInstId/定义 procDefId','标识'),F('状态切换 state','number','','','1/2切换；结束分支3','包装器参数不等于完整引擎状态枚举')],
 controls:[['运行/结束','切换重置条件及分页，结束分支补固定参数；旧响应不能回填新页签。'],['查看','800px轨迹弹窗传procInstId||bizCode及procDefId，读取轨迹不执行状态改变。'],['挂起/恢复/结束/跳转','每项独立验权并确认实例、目标节点及影响；跳转先读all/node候选，不能输入任意节点绕过审批。状态改变后回读实例/待办/审计。']],
 steps:['查询当前分区 → 选择实例 → 查看轨迹 → 明确授权的状态操作 → 回读。','并发结束或任务已完成时拒绝陈旧操作；超时先读实例结果，不能自动补发。对并行节点及补偿是否允许跳转须引擎合同。'],
 apis:[A('POST',flow+'/act/task/inst/page','筛选+pageRequest及结束固定参数'),A('POST',flow+'/act/task/inst/state','{procInstId,state:1/2/3}'),A('POST',flow+'/act/task/all/node','目标实例读取候选，完整参数见批准DTO'),A('POST',flow+'/act/task/deal','跳转参数需批准，不能按state接口拼造')],
 layout:'标题下方运行/结束页签，分类、标题、状态、申请人与时间/类型条件在上部展开区，列表、操作列和分页在下。轨迹弹窗覆盖中部，长图与表格各有可达滚动。',
 checks:['运行与结束查询固定参数正确，切换清理前一状态。','详情传实例和定义标识一致，零inst/state或deal写入。','挂起/恢复/结束分别确认及回读，越权不能改变实例。','跳转候选失效、并行节点和重复点击由服务端批准策略拒绝。','超时/并发结束后先查结果，不自动重复状态操作或伪称补偿完成。'],nfr:[1,2,4,5,6,7,8,12]
},
{
 purpose:'建立关联业务的表单定义，区分数据库表模式与接口模式，并保护既有引用。',
 fields:[F('数据类型 type','number','是','1','1数据库；2接口','切换清理除type外的草稿'),F('表单名称 formName','string','是','','24','trim','填写表单名称'),F('业务 categoryCode','编号','是','','','add候选needExists:2','请选择业务'),F('数据库表名 tableName','string','条件必填','','64','type=1显示','填写数据库表名'),F('表备注 tableDesc','string','','','64'),F('接口 apiDataAdd/apiDataSelectOne/apiDataSelect/apiDataUpdate/apiDataDelete/apiDataUpload/apiDataDownload','string','','','','type=2分别配置新增、单条、列表、更新、删除、上传、下载路径；方法/DTO不能由字段名猜测')],
 controls:[['新增/类型切换','打开弹窗type=1；切到接口模式删除其他草稿字段，提示丢弃影响。依赖分类未成功不能提交空候选。'],['编辑/设计/数据/删除','按可见权限进入；编辑根据tableName推类型，分类编辑条件受categoryCodeIsDisabled控制，服务端重新验约束。设计与数据管理为独立目标，未进入不能宣称已细化内部全部操作。'],['提交/关闭','验证当前可见模式字段后POST save/update，成功回读列表并关闭；失败解除loading保留草稿。关闭重置，不发送。']],
 steps:['读取分类 → 选数据类型和业务 → 按模式填写 → 校验 → 单次保存 → 回读定义。','数据库表名字段及data/table读取不证明保存实际创建物理表；DDL、命名约束、迁移回滚、接口模式鉴权及SSRF控制必须取得后端合同后交付，不允许AI补写任意建表或任意URL调用。'],
 apis:[A('POST',flow+'/act/form/formPage','{formName,categoryCode,tableName,pageRequest}'),A('POST',flow+'/act/category/list','新增候选{needExists:2}；列表全部分类独立读取'),A('POST',flow+'/act/form/save','当前模式ruleForm允许字段'),A('POST',flow+'/act/form/update','目标id及允许字段'),A('POST',flow+'/act/form/one','{id,needSnapshot}，上下文决定是否快照'),A('DELETE',flow+'/act/form/{id}','表单定义删除；引用保护'),A('GET',flow+'/act/form/data/table','数据库字段读取，query DTO需后端合同')],
 layout:'列表上部名称、业务和数据库表名筛选，下部表格和分页；新增为遮罩弹窗，先数据类型单选，随后名称、业务、表名和备注；接口模式显示七项接口配置，长内容内部滚动，底部取消/确定保持可达。',
 checks:['名称24/25、表名64/65及备注64/65，必填按模式校验。','切换type清理非type草稿，接口模式不发送隐藏旧tableName。','分类读取失败或过期阻止保存，needExists:2候选正确。','表名冲突、引用删除、版本和实际DDL效果只在批准隔离合同中验收。','关闭/取消零请求；失败保留草稿并解锁，重复提交不重复定义。'],nfr:[1,2,3,6,7,8,9,12,13]
},
{
 purpose:'按授权范围查询操作与登录审计；日志查看不提供篡改历史或批量删除能力。',
 fields:[F('操作类型 typeList','number数组','','','1查看、2新增、3修改、4删除、5上传导入、6下载导出、7启用、8禁用、99其他'),F('用户 obscureUsername','string','','','','trim'),F('分组 categoryIds','string ID数组','','','','树id转字符串；全选/取消只改本地集合'),F('操作时间 beginOptTime/endOptTime','string范围','','','','yyyy-MM-ddTHH:mm:ss'),F('结果 successful','boolean','','','true成功、false失败','清空不限定；false不得按空值丢弃'),F('登录账号 obscureAccount','string','','','','trim'),F('登录时间 beginLoginTime/endLoginTime','string范围','','','','yyyy-MM-ddTHH:mm:ss'),F('操作结果列','只读','','','','用户ID/操作用户/IP/类型/分组/时间/对象/结果/备注/异常；空间列受配置显示'),F('登录结果列','只读','','','','账号/姓名/登录方式/认证方式/IP/登录时间/成功/退出时间/退出方式')],
 controls:[['条件/分组全选','分别查询操作或登录日志，日期范围逆序阻止查询；全选使用当前已加载分类树，加载失败不能解释为无日志。'],['查询/重置/分页','成功false保留进请求；重置清categoryIds和时间端点，清空日期事件须防null解引用，条件快照关联响应。'],['详情文本','长对象、备注及异常安全转义和掩码；无编辑/删除/审批按钮。不以存在部分日志证明全事件完整审计。']],
 steps:['读取分类树 → 选范围/类型/用户/结果 → 请求日志页 → 只读展示与分页。登录页使用自己的时间键及接口，不混用操作事件。','时间使用批准时区与服务端时钟；留存、归档、访问审计和完整性验证由日志服务合同，未批准不可擅定月数或导出范围。'],
 apis:[A('POST','/common/log/opt/catagory/tree','分组树；catagory保留包装器原拼写'),A('POST','/common/log/opt/page','{typeList,obscureUsername,categoryIds,beginOptTime,endOptTime,successful,pageRequest}'),A('POST','/common/log/login/page','{obscureAccount,beginLoginTime,endLoginTime,successful,pageRequest}')],
 layout:'左菜单操作/登录日志，右上标题及横向条件，更多条件展开；结果表格占主要区域，下方总数、页大小及翻页。分组树下拉带全选/取消；时间范围控件两端并列。错误与空态占表区但保留查询条件。',
 checks:['操作类型多选与分类树ID正确，登录使用独立账号和时间键。','successful=false必须保留，空条件不等同失败记录。','清空时间/逆序/跨时区和分页不抛异常，不残留旧端点。','无权限、5xx、空结果分开；长异常安全显示且秘密不入结果。','直接访问日志越权被拒绝；所有展示均只读，既有审计不可修改。'],nfr:[1,2,4,5,6,8,9,10,13]
},
{
 purpose:'在指定版本的只读模型中读取流程、任务节点和审批配置，禁止因查看而写模型或节点配置。',
 fields:[F('流程名称/业务/key/部门/描述','只读','','','名称100、描述500','','','全部禁用'),F('节点 id/name/documentation','只读','','','name30、描述500','','','全部禁用'),F('节点类型','只读单选','','','','内部/外部节点','','禁用'),F('审核类型','只读多选','','','','指定用户、指定部门、指定角色、指定标签、是否领导、发起人、发起人部门、资源所在部门、资源所在用户','','禁用'),F('多人规则/会签率','只读','','','会签控件3位','并集/交集；百分比边界按引擎合同','','禁用'),F('催办提醒/处理期限','只读','','','数字控件4位','是否启用、数值及单位分别读取','','禁用')],
 controls:[['选流程/节点','改变选中对象只更新右侧只读属性；保持modelDefId/procDefId/deployId/categoryCode一致，版本切换清旧配置。'],['配置节点信息','点击节点配置打开遮罩弹窗，读取当前nodeId对应配置，滚动查看提醒及期限底部。只读弹窗关闭不调用add/map，不能套提交成功流程。'],['XML/SVG下载/返回','只下载授权内容，释放objectURL；返回来源列表保留条件；不提供保存/部署/编辑工具栏。']],
 steps:['按目标版本读取XML/deptIds → 展示只读图 → 选任务节点 → 读取配置 → 关闭或返回。','节点无配置展示明确空态；加载错误与无配置分开；失败不残留上一节点。百分比、缺员、单位换算是引擎运行合同，不能由输入maxlength推范围或审批人数。'],
 apis:[A('GET',flow+'/act/def/read','{modelDefId,deployId,categoryCode}'),A('POST',flow+'/act/def/node/info/map','{procDefId,categoryCode,nodeId}'),A('GET',flow+'/act/def/diagram','{procDefId}，blob图像分支')],
 layout:'顶部仅XML/SVG下载，中央网格流程图与连线，右侧流程或节点属性；没有编辑分支左侧工具条。节点配置居中遮罩，节点类型、审核类型、多人成员规则、会签率、提醒/期限从上至下，底部需滚动查看。',
 checks:['同一版本流程、节点和配置标识一致，切换模型不残留旧值。','点节点和配置仅read/info请求，零save、add/map、deploy。','所有配置禁用且无提交入口；非法直接写仍由服务端拒绝。','未配置、加载失败、缺员及未知单位分别展示，不推断审批成功。','关闭、返回、下载和重复打开无业务写入，释放图像资源。'],nfr:[1,2,6,8,10,11,12]
},
{
 purpose:'按同一工单分别读取基本资料、动态表单快照和审核历史，区分无表单数据与读取失败。',
 fields:[F('categoryCode/业务名称','只读','','','','编号和名称均由分类关联显示'),F('title/createTime/duration/procStatus/appCode/bizType/ccInfo','只读','','','','申请标题、申请时间、已流转、流程状态、来源应用、工单类型、抄送人'),F('formJson/bizInfo','JSON字符串','','','','定义快照/业务数据分开解析，不执行其中脚本'),F('轨迹','只读图及表','','','','步骤、节点名称、接收时间、完成时间、处理时长、参与者、审核意见、类型；实例/定义标识关联')],
 controls:[['基本信息','bizCode读业务信息，categoryCode映射名称，抄送uname合并仅用于显示；展示格式转换不覆盖原始状态码。'],['表单信息','formId读取needSnapshot:true，formJson存在才渲染禁用表单；无表单或空配置展示无表单信息，JSON坏数据明确失败，禁止当空表单。'],['审核历史','图与表并列追踪同一procInstId/procDefId；本人/抄送只读三标签，待办/已办目标另受007办理规则约束。']],
 steps:['先加载分类 → 读业务基本信息及表单快照 → 当前页签分别展示加载/空/失败 → 历史展示同一工单轨迹。','切换工单清所有页签缓存和旧在途请求；缺少表单权限不影响合法基本信息展示，但不能暴露无权字段；轨迹服务独立见既有工单公共链。'],
 apis:[A('POST',flow+'/act/biz/one','{bizCode}'),A('POST',flow+'/act/form/one','{id:formId,needSnapshot:true}'),A('POST',flow+'/act/task/todo/info','{taskId}，待办详情分支'),A('POST',flow+'/act/task/done/info','{taskId}，已办详情分支'),A('POST',flow+'/act/task/record','轨迹包装器；图表完整DTO依工单公共链批准合同')],
 layout:'标题和返回在顶部，基本信息、表单信息、审核历史页签横排。基本信息两列禁用字段；空表单页中央“暂无表单信息”；历史上部流程图、下部事件表格，长历史可滚动，图色不能作为唯一状态说明。',
 checks:['三个页签关联同一bizCode/formId/实例，标题与目标一致。','formJson存在与空表单两分支，坏JSON显示解析失败。','基本信息所有字段只读，无提交/标读/审批请求。','表单与轨迹任一路失败分别重试，不泄露旧工单或伪造空态。','切换两个工单并让旧请求迟到，所有页签只显示当前对象。'],nfr:[1,2,4,6,8,9,10,11]
},
{
 purpose:'按当前用户权限与对象状态展示模型、版本及表单动作，服务端独立拦截直接调用。',
 fields:[F('动作权限','当前上下文集合','','','','create、deploy、versioning、versionIsEnable、update/read/delete等分别判定'),F('模型 state','number','','','1启用、2禁用','1不显示编辑/删除；2显示启用，否则显示禁用'),F('表单 id/categoryCode/tableName','行对象','','','','用于设计/数据/编辑/删除目标，不作为权限证据')],
 controls:[['模型名称/复制/版本动作','名称进入只读图；复制入口无局部permission指令不能据此宣称人人可写。编辑还受state!=1控制，部署/版本/启停有各自权限键。'],['表单动作','按read/update/delete/create逐动作显示；设计和数据管理是独立路由，不因一个入口可见就授权其内部写入。'],['权限刷新/拒绝','账号、角色或资源状态变化后刷新动作及缓存；接口403/业务拒绝解除忙碌并提示，无权不伪装为空数据。']],
 steps:['读当前权限及对象状态 → 按动作和状态共同判定可见/可用 → 进入目标再次验证 → 服务端按对象/操作判定。','历史截图只见名称/复制而较早截图有编辑画布，不据此指定差异原因为权限、角色或版本；应以批准角色矩阵在同版本隔离环境验收。'],
 apis:[A('继承','/common/workflow/act/def/*','模型与版本逐动作验权；不创建泛化新接口'),A('继承','/common/workflow/act/form/*','表单读取与维护逐动作验权')],
 layout:'操作列只保留当前可执行动作，空操作列不放无效点击目标；名称链接与复制独立呈现。只读图与编辑画布工具栏明显不同，拒绝状态提供返回而非自动进入编辑。',
 checks:['同版本至少两种批准角色对照动作矩阵，名称和复制权限分别检查。','state=1不显示编辑/删除；state=2启用，状态变化刷新方向。','隐藏DOM后直接URL/HTTP调用仍被服务端拒绝。','失权、会话过期及账号切换清理缓存，不保留旧授权动作。','取消授权范围内操作零写；并发状态变化拒绝陈旧请求并回读。'],nfr:[1,2,6,8,10,13]
}
];
const NFR=[
 ['权限与会话','所有读写按身份、本人关系、对象和动作在服务端判定；跨用户/空间、隐藏DOM及伪造ID零越权成功；退出或账号切换清缓存。','隔离角色矩阵测试直接URL/接口、过期/撤销与账号切换，任一泄露或越权写入失败。'],
 ['传输与秘密','生产使用经验证的TLS且无混合内容；日志/URL/浏览器存储不保存凭据或完整敏感正文；富文本净化不能替代传输安全。','检查证书链/主机名和请求；用合成标记查存储/日志，证书错误不得绕过；本轮HTTP静态GET不能证明达标。'],
 ['字段与配置契约','字段必填/长度/枚举、动态表单和接口模式DTO有版本化合同；未知规则不得由生成AI默认；服务端拒绝额外写字段。','逐字段边界及未知枚举/额外字段测试；前后端差异作为失败。'],
 ['页面性能','普通列表/详情P95≤3s；100节点模型/500历史事件P95≤5s，交互忙碌反馈≤200ms。','按第9节环境与负载采样，起点导航/点击到内容及依赖完整且授权控件可用，目标不是实测。'],
 ['查询容量','100万消息、100万日志、10万实例种子数据，合法分页查询P95≤2s且技术失败率≤1%；无无界全量下载。','20并发隔离账号，测实际吞吐；有索引/时间范围和无匹配/末页场景，截断须明示。'],
 ['故障恢复与竞态','零自动写请求重放；读请求有限超时、仅最新响应可见；失败解锁保留安全草稿；写超时标结果未知并先核实。','注入断网/5xx/超时/迟到/连击，检查实际请求数、业务结果与锁；超时值依批准路由配置，不把兜底20s当现网保证。'],
 ['一致性与幂等','发送、发布、部署、办理等有服务端幂等/并发协议；单次意图至多一次业务变更；批量逐项结果可回读。','批准隔离环境重复请求/并发操作/部分失败后比对消息批次、版本和实例；未提供协议禁止宣称exactly-once。'],
 ['审计与可观测性','写入及授权拒绝记录操作者、动作、对象、结果、时间和关联标识；不含令牌/秘密及无权正文；审计不可由本模块改写。','成功、拒绝和结果未知各串联一次；校验时区及前后状态，缺失事件或秘密泄漏失败；留存周期依批准合同。'],
 ['富文本与数据隔离','模板/公告/原始参数/异常/动态表单禁止执行不可信脚本；目标URL使用协议及目标允许列表；接口配置须SSRF防护。','对合成脚本/危险URL/坏JSON/跨域目标测试，净化后可读且零执行，未知表单脚本不运行。'],
 ['兼容与适配','Windows 11上Chrome/Edge记录实际版本，1920×1080及1366×768、100%/200%缩放均可完成授权操作；弹窗不溢出不可达。','矩阵检查长名称、宽表、图、空/错/加载态；横向滚动可达操作，历史截图非全分辨率证明。'],
 ['可访问性','字段有标签和关联错误，键盘可达页签/弹窗/富文本，关闭恢复焦点；只读配置可读，状态不只靠颜色。','自动扫描结合人工键盘/读屏，焦点陷阱、无可读名称或无状态播报均失败，不因局部通过宣称全面符合。'],
 ['流程与恢复边界','旧实例绑定批准版本；图/节点/表单快照一致；节点独立保存和模型保存部分成功可辨识；恢复演练覆盖消息队列与流程状态。','版本切换、部分写失败及故障恢复后比对实例/待办/通知；RTO/RPO由业务批准后演练，不虚定可用率SLA。'],
 ['生成与资源稳定性','规格重生成字节稳定，保留15项/94AC及证据；普通refresh不得覆盖；反复开关50次无残留监听/定时器/objectURL。','执行生成与反例回归；隔离浏览器检查销毁/重复进入资源，无持续增长或重复副作用。'],
 ['抗滥用','消息测试/重发/发布/催办分别按批准账号、对象、渠道维度限流并返回可恢复提示，不允许客户端绕过或无限重试。','安全负责人提供窗口、阈值、冷却合同后在隔离环境测边界和恢复；未批准不得自行设置或对生产试错。']
];
function table(head,rows){return ['| '+head.join(' | ')+' |','|'+head.map(()=>'---').join('|')+'|',...rows.map(r=>'| '+r.map(x=>String(x??'').replace(/\|/g,'&#124;').replace(/\n/g,'<br>')).join(' | ')+' |')].join('\n');}
function features(){return catalog.requirements.map((r,i)=>({...r,...authored[i]}));}
function renderFeature(s,i){return [
 `### ${s.id} ${s.title}`,'',`**业务目的**：${s.purpose}`,'',`<!-- 完整规格:${s.id} -->`,'',
 `#### 1. 页面字段清单（${s.id}）`,'',table(['字段名称/键','类型','是否必填','默认值','长度/范围','格式规则','错误提示','页面状态'],s.fields),'',
 '空白属性表示证据不足，不等于无限制、默认空或允许AI自行决定；隐藏字段只按批准合同处理，不随表单对象任意透传。','',
 `#### 2. 页面交互规则（${s.id}）`,'',table(['控件/事件','行为及状态'],s.controls),'',
 `#### 3. 业务流程与异常分支（${s.id}）`,'',...s.steps.map((v,j)=>`${j+1}. ${v}`),'',
 '读取均区分初始化、有效空数据、无权、失败及格式错误；写入仅在有授权的编辑/办理分支显式触发。失败终结忙碌，保留安全上下文；取消零写入。未取得后端业务成功合同的动作不能仅以Promise resolve提示业务完成。','',
 `#### 4. 接口与数据规则（${s.id}）`,'',table(['HTTP方法','相对路径','参数、来源及响应规则'],s.apis),'',
 '服务前缀、序列化和公共响应边界见第4节；字段表与调用端允许键共同限定DTO，完整服务端合同、错误码及状态转移按核查记录外部依赖落实。','',
 `#### 5. 验收标准（${s.id}）`,'',table(['验收编号','前提、步骤与可检查结果','关联需求','状态'],s.checks.map((c,j)=>[`BWM-AC-${pad(20+i*5+j)}`,c,s.id,'未执行'])),'',
 `#### 6. 权限与安全要求（${s.id}）`,'',
 '采用批准的角色/动作/对象范围矩阵；服务端逐对象核验读取及每个动作的授权范围；直接URL、伪造ID、批量集合与当前身份切换在服务端复验。只读或禁用控件不等于后端拒绝写入，隐藏入口不构成鉴权。消息正文、接收者、工单及审计信息按最小权限显示；会话失效清理敏感缓存，保留安全返回路径。','',
 `#### 7. 页面布局与状态（${s.id}）`,'',s.layout,'',
 '历史视口仅用于区域和顺序校准，不硬编码全设备像素。加载/空/错误独立呈现；字段错误靠近控件，操作错误保留对象与重试信息；关闭弹窗恢复焦点。只读图与详情不套用提交中或保存成功状态。','',
 `#### 8. 关联文档（${s.id}）`,'',s.evidence.map(e=>`[${e}](../evidence/live-recheck-20261022/${e}.png) · [DOM](../evidence/live-recheck-20261022/${e}.json)`).join('；'),'','[必要源码及索引](../evidence/bwm-review-20261028/README.md) · [核查记录](./核查记录.md) · [子页面与操作细化](./子页面与操作细化.md)。','',
 `#### 9. 非功能要求（${s.id}）`,'',s.nfr.map(n=>`BWM-NFR-${pad(n)}`).join('、')+'；口径见第9节，均未执行。',''
].join('\n');}
function renderMain(){return ['# 后台消息、工作流与审计需求说明','', '<!-- 业务规格格式:plain-v1 -->',MARKER,'',
 '## 1. 业务目标与入口','','从后台管理进入监控、消息、工作流及日志管理。维护告警、消息分类/渠道/模板、消息投递及公告、本人相关工单、业务分类、流程模型/版本、实例与表单，按授权读取操作/登录审计。角色名称与可管理范围采用批准矩阵；本文不按一个采样账号扩大为全局管理权限。','',
 '## 2. 业务范围与操作边界','',table(['编号','功能及独立目标'],features().map(s=>[s.id,s.title])),'',
 '读取、保存、发送、已读、发布/撤销、部署、办理与删除分别定义。我的消息及本人公告打开详情会标已读，属于有副作用操作；模型查看及工单三页签保持只读。流程模型、定义、部署、实例、任务、业务工单与表单使用各自标识，不以展示名称替代。','',
 '## 3. 功能需求','',...features().map(renderFeature),
 '## 4. 公共接口、字段与响应约定','','路径表为已查API包装器默认前缀。模块通过bcab接收宿主getRequestInstance，MODULE_URL_PREFIX可覆盖commonMsg、commonMonitor、commonLog、commonWorkflow；默认分别为/common/msg、/common/monitor、/common/log、/common/workflow。消息包装器再拼/msg，故路径确为`/common/msg/msg/...`，不可擅自去重。宿主baseURL与网关前缀另行组合；既有宿主默认加`/back`，部署联调必须记录最终相对路径，不能将静态路径称为认证Network结果。','','GET参数经公共request放params，其余放data；普通JSON请求与DELETE body保持类型。消息重发调用端已经JSON.stringify，最终序列化须与后端明确是字符串还是数组；禁止擅改为逗号串。列表组件读取datas/total，候选和历史部分直接用数组；无真实响应不能补造code=0或success=true。','','公共历史传输链返回response.data，rawData分支可返回原response，配置NETWORK_ERROR_CODE触发异常映射；局部then并不充分证明持久化/投递/流转完成。flow模块接收宿主实例的证据与公共宿主片段相互关联，但当前覆盖配置、Cookie属性、CSRF/令牌和错误码的实际生效值仍须部署合同验证。超时可按配置/调用覆盖，20秒兜底不能作为每条请求有限超时保证。','','目标处理：字段校验阻止请求并关联错误；认证过期进入统一会话恢复，权限拒绝不按空列表处理；5xx/断网/解析失败结束loading。写超时显示结果未知，查询同一对象/批次/实例及审计后才允许人工重试。禁止无界透传读回对象、自动重发通知或静默覆盖新版本。','',
 '## 5. 跨页面流程','','管理列表定位稳定ID → 读对象/依赖 → 按动作及状态判权 → 编辑安全草稿 → 校验和确认影响 → 单次写入 → 确认业务结果 → 回读同一对象/版本 → 恢复来源筛选。批量选择仅代表实际已选ID，不隐式包含所有匹配页；分页/切换清理失效选中项。','','工作流分类→模型→部署版本→表单快照→实例→任务的引用需后端保持一致。已部署/运行实例引用保护、节点配置与模型分别保存的部分成功、队列重试去重及版本冲突必须显式处理。只读模型/历史图不因点击或关闭保存；我的消息打开已读副作用单独授权。','',
 '## 6. 模块验收用例','','保留原BWM-AC-001至094及原功能关联；020至094分别位于各功能，第001至019在此。全部应用验收未执行，文档测试不能变更为通过。','',
 table(['验收编号','前提、操作与可检查结果','关联需求','状态'],catalog.originalCases.filter(c=>Number(c.id.slice(-3))<20).map(c=>[c.id,c.text+'；在批准隔离环境检查请求、回读与审计，外部合同未落实不得判通过。',c.requirement,'未执行'])),'',
 '## 7. 开发与交付边界','','本文可用于字段、控件、布局、请求包装、只读视图及异常恢复开发。持久化DTO、唯一/引用规则、收件范围、渠道与队列投递、流程引擎状态机、版本绑定、表单DDL/接口模式、权限矩阵及审计留存必须取得批准合同和隔离环境再联调。缺口、责任与受阻验收见[核查记录](./核查记录.md)，不能让AI自行决定业务或后端协议。本文不新增AI代发消息、审批或修改日志能力。','',
 '## 8. 关联资料','','[子页面与操作细化](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [必要源码](../evidence/bwm-review-20261028/README.md) · [历史现场证据](../evidence/live-recheck-20261022/README.md) · [工单公共链](../evidence/wo-review-20261026/README.md) · [登录细化标准](../01-登录/需求说明.md) · [公共开发边界](../开发约定与交付边界.md) · [总索引](../README.md)。','',
 '## 9. 非功能需求与验收环境','',table(['编号','质量属性','指标/不变量','验证方法及失败判定','关联功能','状态'],NFR.map((r,i)=>['BWM-NFR-'+pad(i+1),...r,features().filter(s=>s.nfr.includes(i+1)).map(s=>s.id).join('、'),'未执行'])),'',
 '性能数值为本次新增开发验收目标，来源与权衡见核查记录，尚无实测，不是现网SLA或容量承诺。固定构建、Windows 11、8核16GiB、Chrome/Edge实际版本，网络100Mbps、RTT50ms；服务实例/CPU/内存、数据库与索引、网关、安全配置、队列及流程引擎版本全部登记，缺项不判通过。采用合成业务数据，不访问真实收件人。','','消息/日志各100万、实例10万，普通分页20/100条；图100节点、历史500事件分开统计。20并发独立账号、每用户最多1在途请求、思考1秒；预热5分钟、采样15分钟且每类≥1000样本，实际吞吐单列，并发不等于QPS。冷缓存与热缓存分开，客户端从点击/导航到完整可操作；API从发送到完整解析并确认业务结果，包含网络和网关。升序第ceil(p×N)项计算P50/P95/P99并报最大值、样本数与失败数；样本不足不判通过。合法请求5xx、超时、解析错、业务错和限流计失败，预期业务拒绝另报；不得关闭鉴权或安全策略换取指标。','','本次不执行压测、业务写入或恢复演练；月度可用率、RTO/RPO与审计留存未有批准值，不凭短测或静态读取宣称满足。账号密码哈希与密钥生命周期归登录公共安全合同，本模块不新增密码持久化。',''].join('\n');}
function renderSubpages(){return ['# 后台消息、工作流与审计子页面与操作细化','',MARKER,'',
 '本文件补充独立目标及操作界限；完整字段、校验、布局、请求与验收以[需求说明](./需求说明.md)逐项为准，不重复创建正式AC。历史采样日期2026-10-22，本轮未取得认证页面或新截图。','',
 table(['关联需求','目标/入口','进入与后续行为','覆盖边界'],[
 ['BWM-001','/module-common/monitor/alarmList → alarmEdit','名称查看；clear独立写入','列表历史零条；详情源码，清除未执行'],
 ['BWM-002','/module-common/news/newsTypeList、channelList','类型表单、渠道编辑和启停分离','类型新增、渠道编辑历史目标；未保存'],
 ['BWM-003','/module-common/news/templateList → templateEdit / sendTestMessage','模板新增/编辑/查看；测试页可能实际发出通知','前两者历史图；测试页仅源码，未发送'],
 ['BWM-004','/module-common/news/newsManage → newsManageEdit','平台详情只读；批量用消息id','历史详情；重发/删除未执行'],
 ['BWM-005','/module-common/news/myNewsList → myNewsEdit','打开即标已读，不能无授权当只读取证','历史列表受保护限制；本轮未打开详情'],
 ['BWM-006','/module-common/news/announcementList → announcementEdit','草稿保存、发布、撤销与历史删除分开','历史新增表单；发布/撤销未执行'],
 ['BWM-006','/module-common/news/myAnnouncementList → announcementDetails','读取内容后自动loginRead','仅源码；本轮未进入'],
 ['BWM-007','/module-flow/workbench/*','申请、我的、待办、已办、抄送独立查询及目标','历史五列表；业务创建/发起/审批未执行'],
 ['BWM-008','/module-flow/workflow/businessRegistration','新增/编辑业务分类','历史两表单；服务端唯一及引用未验收'],
 ['BWM-009','/module-flow/workflow/processModel → flowDesign / versionManagement','草稿、节点配置、复制、部署与版本启停分开','历史画布；版本/复制仅源码，写入未执行'],
 ['BWM-010','/module-flow/workflow/processMonitoring','运行/结束、轨迹及受控状态操作','历史列表；操作与补偿未执行'],
 ['BWM-011','/module-flow/formDesign/formList → design / dataList','新增定义两种模式；设计与数据管理独立','历史新增；后两目标未进入，内部持久化不得猜测'],
 ['BWM-012','/module-common/log/operation/list、/log/login/list','操作/登录两类只读审计','历史表格；当前完整性/留存未验收'],
 ['BWM-013','/module-flow/workflow/flowDesign?optType=view','图→节点→配置弹窗上下区域','历史有效ready图；无save/add/map/deploy'],
 ['BWM-014','工单详情基本/表单/历史','三页签分别加载，form/instance与业务同一对象','历史截图属于工单模块，/workorder与/common/workflow契约不混用'],
 ['BWM-015','模型/表单列表操作列','动作键与对象state共同判定','历史可见性差异不解释为确定角色变化']]),'',
 '截图与DOM均在各功能第8小节保留。无效旧目标U-BWM-model-diagram和不完整U-BWM-node-config不作为成功目标，分别使用ready及bottom记录。所有应用验收未执行。','',
 '[核查记录](./核查记录.md) · [源码片段索引](../evidence/bwm-review-20261028/README.md)',''].join('\n');}
function validateLedger(text){
 const ids=[...text.matchAll(/^### (BWM-\d{3})\b/gm)].map(x=>x[1]);if(JSON.stringify(ids)!==JSON.stringify(catalog.requirements.map(x=>x.id)))throw Error('BWM requirements lost or reordered');
 const cases=[...text.matchAll(/^\| (BWM-AC-\d{3}) \|/gm)].map(x=>x[1]);if(JSON.stringify(cases)!==JSON.stringify(catalog.acceptanceOrder))throw Error('BWM acceptance lost or reordered');
 const map=new Map(catalog.originalCases.map(c=>[c.id,c.requirement]));for(const row of text.split('\n').filter(x=>/^\| BWM-AC-/.test(x))){const cols=row.split('|').map(x=>x.trim());if(cols.at(-3)!==map.get(cols[1]))throw Error('BWM association changed');}
 const nfr=[...text.matchAll(/^\| (BWM-NFR-\d{3}) \|/gm)].map(x=>x[1]);if(JSON.stringify(nfr)!==JSON.stringify(NFR.map((_,i)=>'BWM-NFR-'+pad(i+1))))throw Error('BWM NFR lost');
 for(const row of text.split('\n').filter(x=>/^\| BWM-(AC|NFR)-/.test(x)))if(row.split('|').at(-2).trim()!=='未执行')throw Error('BWM application acceptance cannot pass through documents');
 for(const r of catalog.requirements){const block=text.match(new RegExp('^### '+r.id+' ([\\s\\S]*?)(?=^### |^## |(?![\\s\\S]))','m'))?.[1]||'';for(const e of r.evidence)if(!block.includes(e+'.png'))throw Error('BWM missing evidence '+r.id);}
 return true;
}
module.exports={MARKER,catalog,NFR,features,renderMain,renderSubpages,validateLedger};
if(require.main===module){const fs=require('fs'),path=require('path'),dir=path.resolve(__dirname,'../doc/requirements/38-后台消息工作流与审计');const text=renderMain();validateLedger(text);fs.writeFileSync(path.join(dir,'需求说明.md'),text);fs.writeFileSync(path.join(dir,'子页面与操作细化.md'),renderSubpages());console.log('BWM: 15 features; 94 acceptance cases; 14 NFR; application acceptance unexecuted');}
