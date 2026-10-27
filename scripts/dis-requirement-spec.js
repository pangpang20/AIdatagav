/* Reviewed business specifications. Reads published registries; never calls the application. */
const fs=require('node:fs');
const path=require('node:path');
const registry=require('./dis-published-registry.json');
const MAIN=registry.main.entries,SUB=registry.sub.entries;
const B='/back/dis/base';
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','|'+heads.map(()=>'---').join('|')+'|',...rows.map(r=>'| '+r.map(v=>String(v??'').replaceAll('|','&#124;').replaceAll('\n','<br>')).join(' | ')+' |'),''];
const f=(name,type,required='',value='',limit='',rule='',error='',state='')=>[name,type,required,value,limit,rule,error,state];
const ro=(name,rule='')=>f(name,'只读展示','','','',rule,'','返回数据');
const req=(purpose,method,url,params,read)=>[purpose,method,B+url,params,read];
const pageFields=[f('当前页 pageRequest.pageNo','integer','是','1','正整数','查询/重置/页大小变化回1页'),f('页大小 pageRequest.pageSize','integer','是','20','正整数','选项以分页组件为准；弹窗独立10条'),f('排序 pageRequest.order','array<object>','是','[{prop:"id",asc:false}]','','稳定字段prop、boolean asc；表头本地排序不代表全量排序')];
const alarms=[f('告警用户 alarmUserData','多选 array<ID>','与渠道成对','[]','','候选从本任务对应findUserList读取；以ID保存','请补充完整告警信息'),f('告警渠道 alarmTypeData','多选 array<string>','与用户成对','[]','邮件=1','当前表单只有邮件候选；无告警时两数组均空','请补充完整告警信息')];
const basic=(desc='taskDesc',dept='deptId',showDept=true)=>[f('任务名称 taskName','文本输入','是','空字符串','2～100字符','blur非空；lengthGT(2)实际为长度≥2；提交拒绝纯空白','请输入；至少输入两个字符'),...alarms,f('任务描述 '+desc,'多行文本','否','空字符串','','保留换行；长度无证据的属性留空'),...(showDept?[f('所属部门 '+dept,'部门树单选 ID','是','候选初始化','','按id绑定，不以部门名赋权；候选树与操作范围对应','请选择所属部门')]:[])];
const channel=[f('最大期望并发数 maxConcurrentNum','数字文本','是','空字符串','整数1～10','正整数正则允许前导零；0/负数/小数拒绝','请输入1～10的正整数'),f('数据同步限速 dataSyncRate','数字文本','否','10','非空整数1～10；MB/S','空可通过当前校验；前导零按服务契约处理；MB/S不折算成记录数','请输入1～10的正整数'),f('脏数据条数范围 errorLimitRecord','数字文本','否','空字符串','非负整数','^\\d{0,}$；0有效；不自行补无限容忍语义','请输入非负整数')];
const sourceFields=[f('来源分组 srcDataSourceId[].dataSourceId/schemaName','数据源/schema级联','是','一组空值','','换源清schema和失效候选；分库分表可增加/删除分组','请选择数据源和schema'),f('来源表 tableData[].tabName/srcInputName','选择表及来源标识','至少1项','[]','标识字母/数字/下划线','同一来源稳定键去重；来源标识不能只用行号','请选择来源表'),f('采集方式 srcIntegratedType','行内单选','是','新行按组件初始化','1全量、2增量','增量必须选择srcIncrementCol；不据此推导高水位协议'),f('增量字段 srcIncrementCol','字段单选','增量必填','','','候选来自当前源表字段；换表清失效字段','请选择增量字段'),f('筛选表达式 srcSrcSql / 切分字段 srcPartitionCol / 开始时间 dataStartDt','SQL编辑/字段/时间','按场景','','','筛选只描述读取范围，不自动执行SQL；起点与边界包含性受执行契约约束'),f('采集字段 rowSelection / disDataColMappingDoList','字段选择及映射子表','至少1条有效映射','[]','','元数据随来源改变失效；预览不视为完整采集')];
const mappingFields=[f('目的源 dataSourceId / schemaName','级联单选 ID/string','是','空字符串','','按候选ID→schema→目标表顺序加载；禁用失效项','请选择目的源和schema'),f('目标表类型 trgAutaCrttabFlag','行内单选','是','','1新建表、2使用已有表','新建可编辑表名/字段，已有表先回读元数据'),f('目的表 trgTabName','行内文本/选择','是','','字母、数字、下划线','非空；长度按目标数据库元数据限制；新建表重名冲突反馈到行','目的表不能为空'),f('写入方式 trgUpdateType','单选','按分支','','1追加、2覆盖、3更新','更新须至少一个keyFlag=1；覆盖和更新须有目标写权限'),f('异常策略 exceptionStrategy','行内单选','','','','不得把脏数据阈值当异常策略；使用执行契约枚举'),f('前置SQL preSql / 后置SQL postSql','多行SQL弹窗','','','','确认只回写当前草稿；保存配置不执行SQL'),f('目标列 trgColName/trgColDatatype/trgColLength/trgColPrecision/trgColDesc','映射行字段','有效映射必填列名/类型','','','来源列srcColName/srcColDatatype/srcColLength/srcColPrecision/srcColDesc只读；目标类型候选取目的连接'),f('主键 keyFlag / 更新列 updateCol / 采集日期 createTime','checkbox/开关','','','','keyFlag为0/1；updateCol为boolean；采集日期列单独处理；字段映射一对一')];
const csvFields=[f('CSV文件源 fileSourceId / 路径 fileUrl / 名称 fileName','ID/目录单选/文本','是','','','路径和文件名分开；同一路径+名称不得重复；不支持任意本机路径'),f('分隔符 columnSpilt','文本/分隔符选择','是','','','保留历史拼写columnSpilt，不能改为columnSplit'),f('字符集 characterSet','单选','','','UTF-8、GBK','CSV输出候选按原大小写'),f('空值 nullFormat / 首行 firstLineSkip','文本/序列化参数','','','','表离线CSV输出固定firstLineSkip=2；不猜业务含义或用于输入解析')];
const query=(department='deptId',status=true)=>[f('任务名称 taskName','可清空文本','否','空字符串','','名称条件不替代对象ID；trim后提交；匹配方式由服务契约定义'),f('所属部门 '+department,'可清空部门树','否','空字符串','','id为值；清空与0分开处理'),...(status?[f('任务状态 taskStatus','可清空单选','否','空字符串','','按本页面枚举；不同任务类型的相同数字不共用含义')]:[]),...pageFields];
const listControls=[['任务名称/部门/状态、查询/重置','修改只更新查询草稿；查询提交快照并回第1页；重置恢复该页初始条件并清日期。轮询使用最后一次提交条件，不清正在输入的草稿。'],['分页、页大小、排序','服务分页读取datas/total；页大小改变回1；原total与样本数量不是容量上限；表内局部排序不得宣传跨页全量排序。'],['新增/编辑/任务名','新增进入对应edit；编辑/查看携带原id和optType。只有服务端返回的可操作状态和权限均满足时可维护。'],['手动运行/启动/停止/删除/复制','分别人工触发、显示对象和影响、确认后调用。运行不是查询或保存；复制创建新定义但不自动运行。拒绝未知状态下盲目启停。'],['运行结果','用任务ID进入该任务类型执行记录页；运行实例及日志继续使用各自ID，不以定义保存成功代替运行成功。'],['生成调度流程','仅存在该按钮的任务页显示；选择任务后填写processName和checkType。确认提交才生成流程；不因选中或导航而执行。']];
const formControls=[['名称、描述、告警用户/渠道','名称blur校验；两告警数组成对或同空，候选加载失败不写入显示文本。描述保留换行。'],['数据源/schema/类型','上级改变先处理已有映射草稿，再清失效子值、候选及关联字段；迟到请求不得覆盖新来源。候选未加载不得提交。'],['来源选择、筛选、字段、预览','候选表/文件/API/Topic选择在弹窗副本中操作；查询和分页与主表独立；确认按稳定键回写、取消丢副本。预览由人工发起且有权限、行列限制。'],['目的表/字段映射/图形连线','同步文字表和可视化一对一关系；同侧或一列多连拒绝。删除来源同时清关联映射；目标连接变化后重验列类型和主键。'],['提交','提交前校验主表和实际存在的输入/输出子表，使用整个表单共享请求锁。构建请求不得原地修改草稿；异常统一释放锁并保留输入。'],['权限提示弹窗','有permission=1/2等权限资料时分别展示源/目标缺权表，保持表单可修正；弹窗分页独立。不得展示配置保存成功或自动申请权限。'],['取消/返回/关闭/后退','有未保存更改先确认；确认丢弃草稿并返回原列表上下文，取消离开仍停当前页。弹窗取消只丢弹窗副本。任务不因返回、刷新或重入自动提交。']];
const PROFILES={};
function addProfile(kind,route,goal,fields,controls,requests,flow,layout,sources){PROFILES[kind]={route,goal,fields,controls,requests,flow,layout,sources};}
const taskTypes={table:['dataAcquisition','/disTask/page','/disTask/add','/disTask/findAllInfoById/{id}','/disTask/update/{id}','TABLE'],db:['libraryMigration','/dbMove/page','/dbMove','/dbMove/{id}','/dbMove/{id}','DB'],file:['fileAcquisition','/filecollection/page','/filecollection','/filecollection/detail/{id}','/filecollection/{id}','FILE'],real:['realTimeAcquisition','/real-time_acquisition/page','/real-time_acquisition','/real-time_acquisition/{id}','/real-time_acquisition/{id}','REAL'],mq:['kafkaAcquisition','/real-time_acquisition/findRealTimeMqPage','/real-time_acquisition/addMq','/real-time_acquisition/mq/{id}','/real-time_acquisition/mq/{id}','MQ']};
const listCols={table:'任务名称、所属部门、数据源类型、目的源类型、执行次数execuNum、采集数据量readNum、创建时间、任务状态',db:'任务名称、所属部门、来源库srcSchemaName、目的库trgSchemaName、迁移表数moveTabNum、迁移数据量writeNum、创建时间、任务状态',file:'任务名称、所属部门departmentName、数据源、目的源、执行次数executionNum、采集文件数collectionFileNum、创建时间、任务状态',real:'任务名称、所属部门deptName、数据源、目的源、写入数据量writeNum、创建时间、任务状态',mq:'任务名称、所属部门deptName、数据源、目的源、写入数据量writeNum、创建时间、任务状态'};
for(const [family,d]of Object.entries(taskTypes)){
  const [stem,page,create,detail,update,source]=d;
  addProfile(family+'List','/dis/taskManagement/'+stem+'/list','定位任务定义，核对运行状态和后续有权操作；任务定义与执行实例分别读取。',[...query('deptId',!['real','mq'].includes(family)),ro('结果列',listCols[family]),ro('稳定任务标识 id','行操作、路由、启停和回读均使用任务id')],family==='table'?[...listControls,['更多：配置对账/补数据','进入对账或补数配置副本；只打开不写入，确认后分别保存。字段和请求见第4节专表。']]:listControls,
    [req('分页查询','POST',page,'body={...已提交筛选,pageRequest}；名称、部门、状态仅传本页定义的字段','返回datas、total；数据缺失与空数组分开'),req('定义读取','GET',detail,'path id=当前行任务id','按定义详情回显；不改变运行状态')],
    ['取得本页部门候选与访问权限后，以默认分页读取任务。','输入条件→查询→记录筛选快照→加载→原子替换datas/total；只接受最新条件响应。','有权选择目标任务并进入编辑/运行结果或人工确认动作，完成后回读定义和必要的执行实例。','离页停止轮询；返回恢复已提交条件与页码，权限失效清理敏感数据。'],
    '保留顶部平台导航和左侧任务菜单，右侧白色内容卡标题下为筛选行，查询/重置在右侧，条件可展开；任务操作工具条在表格上方右侧。表格横向显示序号、业务列及最右操作，分页在右下；长表横向滚动，不能遮住行标识。',[source+'-LIST']);
}
const tableFields=[...basic('taskDesc','deptId',false),...channel,f('源/目的类型 srcDatasetType/trgDatasetType','单选','是','源1；目的未选择','源1库表；目的1库表/2CSV','字符串枚举；目的变化时切换输出子组件'),...sourceFields,...mappingFields,...csvFields,ro('所属部门 deptId','由输出组件deptId写入；实际必填，不是无约束隐藏默认'),ro('固定类型 taskType','表离线提交为字符串1')];
const baseFlow=['加载本任务的候选与编辑原定义；编辑保留任务、表映射、字段映射原ID，不用名称或页内索引替代。','填写基本信息与条件子配置，按来源稳定键建立输入与输出关系；各弹窗确认只改草稿。','提交前检查主表、输入、输出和全部分页数据→构建独立请求快照→单次发送。','按权限资料、真正完成和明确失败分别处理；成功后回读定义并返回列表。超时显示结果未知，先核查再决定是否重试；保存不启动任务。'];
addProfile('tableAdd','/dis/taskManagement/dataAcquisition/edit','建立库表到库表或CSV的离线同步定义，明确来源、映射、写入方式与资源控制。',tableFields,formControls,[req('新增定义','POST','/disTask/add','body=主模型+disDataTaskAlarmDo+disDataDatasetMappingDoList；详见第4节模型','truthy权限资料进入权限弹窗；正常分支成功提示后回读定义'),req('源/schema/表/字段候选','POST','/disCommon/findDbList','body srcDatasetType；后续专用元数据接口见第4节','读取当前可用源，失败不填假候选')],baseFlow,'右侧纵向白卡依次为任务基本信息、数据通道控制、输入配置、输出配置；名称整行，告警用户左/邮件复选右、描述整行；通道并发左、限速右，脏数据下一行。输入数据源/schema并列、分库分表位于该区右上；下部来源表/映射表滚动。右上返回、底部固定取消/提交。',['TABLE-FORM','TABLE-INPUT','TABLE-OUTPUT','CSV-OUTPUT']);
addProfile('tableEdit',PROFILES.tableAdd.route,'读取并修改指定表离线同步定义；按可维护状态控制字段，保护运行中版本。',tableFields.map(x=>[...x.slice(0,3),x[0].includes('taskType')?x[3]:'当前定义',...x.slice(4)]),formControls,[req('读取原定义','GET','/disTask/findAllInfoById/{id}','path id来自行路由','回填主表和对应子组件'),req('修改定义','PUT','/disTask/update/{id}','path id=原任务；body同新增但保留原映射ID','按权限资料与完成分支处理，再回读')],baseFlow,PROFILES.tableAdd.layout,['TABLE-FORM','TABLE-INPUT','TABLE-OUTPUT']);
addProfile('dbAdd','/dis/taskManagement/libraryMigration/edit','把指定来源库/schema的表映射到另一目的库/schema，检查目标命名异常后保存迁移定义。',[...basic(),...channel.slice(0,2),f('来源/目的库类型 srcDbType/trgDbType','单选','是','空字符串','ORACLE、MYSQL、POSTGRESQL、DM','分别控制输入/输出组件；未知类型不能渲染成MYSQL'),f('来源 dataSourceId/schemaName/tableData','级联和表选择','是','null/null/[]','','读取schema和表；选择全部不是只选当前分页'),f('目的 dataSourceId/schemaName','级联单选','是','空字符串','','同数据源+同schema拒绝；允许不同schema','请调整源和目的'),f('表映射 dbIn.tabName / dbOut.tabName','行文本/异常表清单','是','','','目标默认原表名；checkTabName检查长度与已存在名冲突；exceptionFlag随表保存'),ro('固定类型 taskType / srcDatasetType / trgDatasetType','数值4 / 1 / 1')],formControls,[req('新增库迁移','POST','/dbMove','body=基本字段、告警、disDataDatasetMappingDoList[{id,srcInputName,trgOutputName,dbIn,dbOut}]','权限资料不视为保存成功'),req('校验目标名','POST','/dbMove/checkTabName','body=完整表映射，来自当前目的源/schema','读取异常表；重命名/删除异常草稿后重验'),req('可用库','POST','/disCommon/findDbMoveTaskDbList','当前库类型','来源/目的候选')],baseFlow,'基本信息与通道控制在上；输入区先库类型，再连接/schema和表选择；输出区目的库类型、所属部门、目的连接/schema、目标名异常清单。异常弹窗单独分页，批量删除只删草稿映射；提交固定右下。',['DB-FORM','DB-INPUT','DB-OUTPUT']);
addProfile('fileAdd','/dis/taskManagement/fileAcquisition/edit','在已配置FTP来源与目的源之间复制文件或文件夹，逐项选择目标目录与更新策略。',[...basic('remark','departmentId'),f('来源 srcFtpId ← inputData.dataSourceId','FTP数据源单选','是','null','','ftp/ftpsource候选；不能输入凭据或任意地址'),f('采集模式 collectMode.num → executionType','radio','是','1','1单文件→0；文件夹模式→1','换模式清失效文件草稿'),f('目的源 targetFtpId','FTP单选','是','空字符串','','不得等于来源FTP；按ID比较','目的源不能与数据源一致'),f('来源条目 ftpFileList[].fileName/fileType/srcFilePath','选择文件/目录','至少1项','[]','','目录查询来自ftp/{id}；单文件/文件夹按模式过滤'),f('目的目录 targetFolderPath / 更新 updateType','行内目录/单选','每行必选','','0替换、1追加','同fileName+targetFolderPath组合不重复；替换不自动清远端'),f('行备注 ftpFileList[].remark','文本','否','','','文件级备注与任务remark分别保存'),ro('任务模型 runFrequency','初始空字符串但无可见控件；不自行添加运行频率输入')],formControls.filter(c=>!c[0].includes('字段映射')),[req('新增文件同步','POST','/filecollection','body={taskName,departmentId,targetFtpId,srcFtpId,executionType,remark,disDataTaskAlarmDo,ftpFileList}；runFrequency按调用端模型','完成后回读定义；不开始复制'),req('FTP来源/目录','GET','/ftp/ftpsource','无业务参数；后续GET /ftp/{id}','候选与目录读取，不是文件上传')],baseFlow,'上部基本信息；输入区来源数据源与采集模式并列、下方选择文件(夹)及来源清单；输出区目的源/所属部门并列，下方逐行更新方式和目的目录。此表单没有并发、脏数据或字段映射区。',['FILE-FORM','FILE-INPUT','FILE-OUTPUT']);
addProfile('realAdd','/dis/taskManagement/realTimeAcquisition/edit','定义库表到库表实时同步，明确来源分组、采集字段和目的映射；配置与CDC执行分开。',[...basic('taskDesc','deptId',false),...sourceFields.filter(x=>!x[0].includes('dataStartDt')),f('源筛选 srcSrcSql / 切分字段 srcPartitionCol','SQL/字段选择','按场景','','','只作用当前来源行；目标协议以实时映射dbIn为准'),ro('增量类型 srcIncrementType','由来源组件逐表传入，枚举按执行契约，不推导日志或时间戳模式'),...mappingFields.filter(x=>!x[0].includes('preSql')),ro('所属部门 deptId','取输出组件部门ID，保存必填'),ro('类型 taskType/srcDatasetType/trgDatasetType','字符串3/1/1；所属部门取输出组件'),ro('模型runFrequency/taskBeginTime/taskEndTime','存在规则或日期函数不等于已有可见控件，不据此增加输入')],formControls,[req('新增实时定义','POST','/real-time_acquisition','body=主模型+告警+映射；dbIn含srcIncrementType，dbOut含tabDesc','成功后回读定义，CDC状态另验'),req('来源候选','POST','/disCommon/findRealTimeDbList','当前来源类型','可用连接；后续TabTime/Tab专用元数据路径')],baseFlow,'基本信息后直接输入配置和输出配置，没有离线通道控制卡；输入允许分库分表，来源清单含数据源、表名、说明、采集字段；输出含目的源、schema、所属部门，下面为目标表类型、表名及映射；底部固定操作。',['REAL-FORM','REAL-INPUT','REAL-OUTPUT']);
addProfile('mqAdd','/dis/taskManagement/kafkaAcquisition/edit','建立库表/KAFKA之间可支持的实时数据流，按方向使用独立输入、输出和映射结构。',[...basic(),f('源类型 srcDatasetType','单选','是','空字符串','1库表、5KAFKA','库表来源只允许目的5；KAFKA来源可目的1/5'),f('目的类型 trgDatasetType','单选','是','空字符串','1库表、5KAFKA','来源变化清目的类型和旧来源行，重新取候选'),f('DML过滤 dmlFilterType','复选→整数','库表来源条件','[]','0不筛选、1新增、3更新、5删除','0与其余互斥；组合映射4、6、8；全选不得自行猜值'),f('库表来源 inputData.dataSourceId/schemaName','连接/schema级联','源类型1必填','空字符串','','换连接清schema/表；库表→MQ不添加CSV或离线通道字段'),f('库表行 tabName/srcInputName/rowSelection','表选择/来源标识/采集字段','源类型1至少1表和有效字段','[]','','表和列取当前连接/schema；保留源表及列稳定ID'),f('源Topic kafkaIn.id/dsId/topicName','候选选择','KAFKA来源必填','','','id为Topic配置标识，dsId为数据源；不得与任务id混用'),f('目的Topic kafkaOut','候选与字段映射','KAFKA目的必填','','','输出Topic的稳定ID和字段由目的候选取得；不在本页创建远端Topic'),...mappingFields.filter(x=>!/(preSql|exceptionStrategy|trgUpdateType)/.test(x[0])),ro('固定模型 taskType / runFrequency','初始taskType=字符串7，runFrequency为空；不将taskType=7自动等同其他页任务类型')],formControls,[req('新增KAFKA同步','POST','/real-time_acquisition/addMq','按库表→MQ、MQ→库表、MQ→MQ组装disDataDatasetMappingDoList；见第4节方向表','权限资料与成功分别处理'),req('Kafka候选','POST','/disCommon/findKafkaList','无业务参数','只显示当前可用来源；发现Topic另行人工发起'),req('自动映射','POST','/disTask/autoMappingMq','当前有权来源/目的字段','建议只回写草稿，不自动保存或执行')],baseFlow,'基本信息后输入配置、输出配置分卡；初始只显示源类型、目的类型和所属部门。选源类型后显示库表/schema或Topic清单，库表来源出现DML过滤；目标类型控制目的库表或MQ组件。下部字段模态/图形映射有独立滚动，底部取消/提交不被遮挡。',['MQ-FORM','MQ-INPUT','MQ-DB','MQ-OUTPUT','MQ-DB-OUTPUT']);
const apiFields=[...basic('remark','departmentId'),f('API来源 srcApiSourceId','单选 ID','是','空字符串','','取disapicollection/datasource；换来源清所选API与映射'),f('目的类型 targetType','单选 string','是','空字符串','0库表、1KAFKA','targetType=0库表、1KAFKA，不套srcDatasetType=1/5'),f('API清单 apiMappingList[].apiId/apiName/srcApiId','选择API及字段','至少1条有效映射','[]','','srcApiId关联外层来源，apiId是API定义ID，apiName仅显示'),f('目标 targetSourceId/targetSourceName/targetSchema','目的连接ID/名称/schema','按目标类型','空字符串','','库表和KAFKA分别组装，名称不替代权限键'),f('API行 targetTableName/updateType/autoCreateTable/apiColMappingList','目标表/策略/字段映射','按方向','','','前后API及列ID保持对应；页内操作不修改API定义'),f('API行更新方式 updateType','单选','库表目的按行','','1追加、2覆盖','仅库表方向；不套用表同步trgUpdateType=3更新'),f('API目标Topic targetTopicName','Topic选择/文本','KAFKA目的按行','','','从当前目的配置取得；序列化不使用targetTableName'),f('API列映射 apiColMappingList','字段表/图形一对一映射','每个API至少1有效映射','[]','','保留srcColName/srcColDatatype等源列及trgColName/trgColDatatype等目标列，映射与当前apiId对应；不加入表同步前后SQL或采集日期列')];
const parseFields=[...basic(),...channel,f('输入类型 srcDatasetType','单选','是','空字符串','2CSV、3Excel','切类型清失效文件和解析字段；目标trgDatasetType=1库表'),f('采集模式 inputData.collectMode','模式单选','是','1','','各模式实际取值由组件候选，不推导为FTP的executionType'),f('文件源 fileSourceId/fileUrl/fileName','来源ID/路径/文件选择','是','null/空路径/[]','','选择远端文件不等于上传本机文件'),f('来源标识 srcInputName / 模板 templateName / 索引 srcIndex','逐文件文本/模板','','','','按当前文件模板建立列元数据；稳定标识不使用页码'),f('CSV解析 firstLineSkip/columnSpilt/characterSet','逐文件设置','CSV分支','','','编码候选UTF-8、gbk；与CSV输出大写GBK及固定首行值分别处理'),f('Excel sheetName/headFlag/headLine/startLine','工作表/表头/数字','Excel分支','','','sheet来自文件；startLine>0；headFlag=2时headLine>0且startLine>headLine','起始行需大于表头行且大于0'),f('采集字段 rowSelection / 映射 disDataColMappingDoList','字段多选/映射','每个文件非空','[]','','换文件或sheet须重读字段并重验；预览“前1000条”不是实际采集总量'),...mappingFields];
addProfile('interfaceList','/dis/taskManagement/apiAndFileCollection/public','分别查询API采集与文件解析定义；两个页签不是一个共享请求或共享状态机。',[...query('departmentId',false),f('文件解析筛选 deptId/taskName/taskStatus','文件页签筛选','','空字符串','','文件页签模型与API的departmentId分开'),ro('API列','任务名称、departmentName、API、targetType、executionNum、collectionDataNum、创建时间、状态'),ro('文件解析列','任务名称、deptName、源/目的类型、execuNum、readNum、创建时间、状态')],[['API采集/文件解析页签','分别加载各自列表，保留各自已提交筛选和分页；切换后旧请求不得写入新页签。'],...listControls],[req('API分页','POST','/disapicollection/page','body=API页筛选+pageRequest','datas/total'),req('文件解析分页','POST','/disTask/findCsvExcelPage','body=文件页筛选+pageRequest','datas/total')],PROFILES.tableList.flow,'内容卡顶部API采集/文件解析页签；当前页签筛选在其下、查询/重置右侧，工具条生成调度流程/新增位于表格右上。两页签表格列、空态及分页独立。',['TABS','API-LIST','PARSE-LIST']);
addProfile('interfaceAdd','/dis/taskManagement/apiAndFileCollection/components/apiCollection/edit；/dis/taskManagement/apiAndFileCollection/components/fileCollection/edit','从当前页签建立API采集或CSV/Excel解析定义，避免把接口、文件及目的地协议混为一份模型。',apiFields,formControls,[req('API保存','POST','/disapicollection','body=API基本信息+apiMappingList；KAFKA目的用getKafkaParams方向模型','权限资料不等于成功'),req('文件解析保存','POST','/disTask/addFileParse','body=文件解析基本信息+csvIn或excelIn+dbOut+列映射','完成后回读findAllInfoByIdFile/{id}')],baseFlow,'API表单：基本信息、输入配置（来源选择/来源API表）、输出配置（目的类型/部门/目标表与映射）；不出现离线通道限制。文件解析表单另有通道控制卡，输入按CSV/Excel切换解析参数，目的库表区在下，固定底栏取消/提交。',['API-FORM','API-INPUT','API-OUTPUT','API-MQ','PARSE-FORM','PARSE-CSV','PARSE-EXCEL','PARSE-OUTPUT']);
const monitorFields=[...query('deptId',false),f('任务类型 taskType','可清空单选','否','空字符串','1表离线、4库离线、8API、9文件解析','这是监控枚举，不是创建taskType'),f('运行结果 execResult','可清空单选','否','空字符串','0成功、1失败','字符串0有效，不能按truthy过滤'),f('运行时间 dataCheck→execStartTime/execEndTime','日期范围','否','[]/空字符串','','清空日期时同时清起止字段；开始≤结束，时区按统计契约'),ro('执行记录','任务名称、deptName、taskType、运行时间、execTotalTime、execResult、writeNum'),ro('执行实例标识 id→logId','任务ID只定位定义，详情必须带当前执行实例logId')];
addProfile('monitor','/dis/taskMonitoring/taskMonitoring/list','按定义与执行实例条件追踪一次任务执行结果和采集量，不修改历史运行记录。',monitorFields,[['查询/重置/展开','按主列表规则提交筛选；展开只显示额外筛选，不改变业务状态；清空日期须清后端起止字段。'],['详情/分页','按行taskType选择对应表、库、文件、API模态，传logId。弹窗默认10条独立分页，保留主列表上下文。'],['日志','读取当前明细ID/callbackId；转义展示失败原因，不执行日志中的HTML、SQL或链接。']], [req('运行记录','POST','/disDataTaskLog/findLogPage','body={taskName,deptId,taskType,execResult,execStartTime,execEndTime,dataCheck,pageRequest}','datas/total'),req('部门树','POST','/disCommon/findTreeMonitor','无业务参数','监控范围候选')],['提交合法查询→服务按授权范围返回执行实例。','选择实例详情→按类型读取该logId明细→独立翻页或读取日志。','关闭弹窗回原筛选/页码；读取失败保留上下文且不展示旧实例日志。'],'标题下首行任务名、部门、任务类型及右侧查询/重置/展开；展开区含结果和运行时间。表格最右详情；详情在居中白色模态，背景保留主表，标题、关闭、明细表、右下分页。',['MONITOR']);
addProfile('monitorDetail',PROFILES.monitor.route,'查看选中执行实例的输入源、目标、起止时间、读写量及日志。',[ro('父执行标识 logId','当前实例id；非任务ID'),ro('明细标识 id / callbackId','从当前明细行取得；不跨实例复用'),ro('明细字段','srcDatasetName/trgDatasetName、起止时间、execTotalTime、运行结果、readNum、writeNum；API另srcApiName/targetTableName/result/dataNum'),f('明细分页 pageRequest','分页对象','是','pageNo=1,pageSize=10,order=id倒序','','各类型弹窗与日志清单独立；主列表仍20条'),ro('日志 logData','只读文本；缺失、加载、错误与空日志分别显示')],PROFILES.monitor.controls,[req('表/库/文件明细','POST','/disDataTaskLogDetail/page','body={logId,pageRequest}','返回datas/total；按对应模态回填'),req('API明细','POST','/disapicollectionlogdetail/page','body={logId,pageRequest}','API明细'),req('日志','POST','/disTask/getMsgByCallbackId','body来自当前明细callbackId；不拼显示文本','只读日志；按调用端实际读取字段接入，不猜响应包')],PROFILES.monitor.flow,PROFILES.monitor.layout,['MONITOR']);
addProfile('alarm','/dis/taskMonitoring/abnormal/list','查询系统生成的报警及通知发送结果；发送失败与同步执行失败分别表达。',[f('报警任务 taskName','可清空文本','否','空字符串','','提交名称条件'),f('任务类型 taskType','单选','否','空字符串','1表离线、2文件、3实时表、4库、7MQ、8API、9文件解析','与监控枚举作用域分开'),f('报警时间 time/startTime/endTime','日期范围','否','空字符串','','清空日期同步清起止；时间边界由服务契约定义'),...pageFields,ro('报警记录','报警时间、报警任务、任务类型、接收人、报警方式、发送状态、报警内容')],[['条件/查询/重置/分页','按已提交快照查询，保留筛选和错误恢复；无记录为空态。'],['报警内容','作为转义文本查看；系统生成日志不适用人工新增、编辑、删除或自动重发通知。']],[req('报警记录','POST','/datataskalarmrecord/page','body={taskName,taskType,time,startTime,endTime,pageRequest}','datas/total；渠道按返回值转换')],['输入任务、类型、时间→查询→显示系统报警记录和发送状态。','零记录不代表无故障；查询失败显示读取失败，允许有界重试；不在页面重发报警。'],'单行任务名/类型/日期范围筛选，右侧查询/重置；下方八列报警表，无维护工具栏；正文过长换行或安全文本详情，分页右下。',['ALARM']);
addProfile('check','/dis/taskMonitoring/dataReconciliation/list','查看任务最近一次对账结果，继续进入历史记录、差异或经授权补数。',[...query('departmentId',false),f('对账结果 checkResult','可清空单选','否','空字符串','0成功、1失败','0不转为空；不把失败自动判为源目标数据不同'),f('对账时间 dataCheck→dataStartCheck/dataEndCheck','范围','否','空字符串','','清空日期清所有派生字段'),f('任务类型 taskType','单选','否','空字符串','当前候选仅字符串1表离线','不为其他同步类型自动启用对账'),ro('结果列','任务名、部门、任务类型、最近一次对账时间/结果、数据是否异常'),ro('对账记录 taskId / 明细id','分别用于任务对账历史和异常差异分页')],[['查询/重置/展开/记录/异常','查询只读；记录进入dataReconciliation/edit?id=任务id；对账详情和差异分页独立，保留父上下文。'],['补数据','startSupplyDataTask是写操作，须人工确认范围和权限；GET仍有业务副作用；不得因打开异常或刷新自动调用。']],[req('任务对账摘要','POST','/disDataCheck/findCheck','body=当前筛选+pageRequest','datas/total；异常与对账失败分开'),req('历史记录','POST','/disDataCheck/findCheckList','body={taskId,...详情筛选,pageRequest}','对应任务历史'),req('明细/差异','POST','/disDataCheckDetail/page','当前对账记录稳定ID+pageRequest；异常另/disDataCheckAbnormal/page','源/目的差异分别显示'),req('补数触发','GET','/supplydatatask/startSupplyDataTask/{id}','path id来自当前有权目标；只在确认后发送','接受后回读补数任务，不显示数据修复完成')],['读取摘要→用户选择任务对账历史→选择对账记录读取差异。','补数配置与执行分别授权；有权人工确认后才提交并追踪独立补数实例。'],'主列表与监控类似，展开区对账结果/时间；明细独立路由，差异和日志采用居中模态分别展示源与目的数据；空态不显示“对账通过”。',['CHECK','CHECK-DETAIL']);
addProfile('supply','/dis/taskMonitoring/repairdata/list','查询补数据定义及执行记录，区分重跑请求被接受与补数完成。',[...query('deptId',false),f('运行状态 taskStatus','单选','否','空字符串','字符串1运行中、2暂存中、3已完成','不套正常任务状态字典'),ro('结果列','原任务名称taskName、补数名称supplyTaskName、deptName、运行状态、运行时间'),ro('补数ID id / 原任务ID taskId','详情和重跑使用补数ID；来源定义单独保持taskId')],[['查询/重置/详情','详情跳repairdata/edit?id=补数id；按原任务/补数关系读执行结果，详情结果和日志分别分页。'],['重新运行','人工确认原补数范围，调用GET rerun/{id}。GET仍有业务副作用，不预加载、不轮询、不自动重试；回读状态及新执行记录。']],[req('补数列表','POST','/supplydatatask/page','body={taskName,taskStatus,deptId,pageRequest}','datas/total'),req('重跑','GET','/supplydatatask/rerun/{id}','人工确认后的补数id','回读任务和独立执行记录'),req('执行历史','POST','/disDataTaskLog/supplyDataTaskLogPage','body={taskId:当前补数id,execResult,pageRequest}','实例清单；详情/disDataTaskLogDetail/findSupplyPage')],['读取补数清单→查看有权补数实例和明细/日志。','重跑只在人工确认后提交，明确失败可修正；超时先查实例，不再次触发同一补数。'],'筛选行任务名称、部门、运行状态，右侧查询/重置；表列补数与原任务并置、右端操作；详情路由下再开明细/日志模态。',['SUPPLY','SUPPLY-DETAIL']);
const statControls=[['时间粒度、日期/范围、部门/类型','每块条件独立，日/月/年切换使用对应格式并重新读取该块；禁止未来日期、倒置范围和迟到覆盖；清空后按该控件规则处理。'],['图形、图例和指标','展示单位、统计周期、数据时间和分母；数值0与未取得数据分开。长数字、空数组、缺字段、分母0不能出现NaN/Infinity。'],['加载/失败/重试','各块加载和失败互不冒充全页成功；单块重试不重置其他块条件。统计/系统生成记录不适用人工新增、修改或删除。']];
addProfile('home','/dis/home','展示任务定义、今日执行和采集资源指标，保留各统计口径。',[ro('概览六卡','任务总数(次)、今日成功/失败实例、今日新增目的表、字段、写入表数据量；各自昨日比较'),ro('六类运行卡','总数、运行中、成功/失败；实时表/MQ展示停止而非失败'),ro('接口指标','tableMeanwhile/libraryMeanwhile/interfaceFileAnalysis/fileMeanwhile/tableRealTime/mqRealTime；成功/失败概览当前仅汇总表离线和接口解析'),ro('运行占比','运行中÷该类实例总数×100，保留两位；分母为0用0%而非除0；总数和状态以服务统计快照为准')],statControls,[req('今日概览','GET','/taskstatistics/todayDataOverview','无业务参数','按返回各字段计算卡片；未知字段不补0'),req('今日运行','GET','/taskstatistics/todayTaskRunStatus','无业务参数','各类Total/Run/Success/Failed或Stop')],['进入页面分别请求两组概览→逐卡展示真实读取值及口径。','任一依赖失败只标该组读取失败，不沿用旧数据冒充今日；重新进入按当前权限回读。'],'顶部六个彩色概览卡；下方“今日任务运行情况”按六类排列仪表卡，离线卡成功/失败并列、实时卡停止；超过可视高度纵向滚动，没有分页列表或提交栏。',['HOME']);
addProfile('taskAnalysis','/dis/integratedAnalysis/taskAnalysis','按日、月、年核对任务累计、运行情况和任务趋势，避免不同类型统计相互代入。',[f('任务总计 totalTasks/日期','日月年页签+日期','是','日；昨日/上月/上年','recordType=1/2/3','日期动态计算，跨年跨月正确；日均来自aveCollection'),f('运行情况 taskAnalysis/日期','独立粒度/日期','是','日','','不复用任务总计当前日期'),f('趋势 taskTrend/collectionType/起止','粒度/类型/日期范围','是','日/类型1/近7个已完成日','趋势1表离线、2库、3接口解析、4文件、5实时表、7MQ','collectionType与创建taskType不同'),ro('统计与图形','累计任务/采集/成功/失败/日均；六类运行分布；趋势系列；成功率分母为累计采集次数')],statControls,[req('任务总计','POST','/taskstatistics/taskTotal','body={recordDate,recordType}，按对应日/月/年格式','数组读取cumulativeTask、cumulativeCollection、成功/失败、aveCollection'),req('运行分布','POST','/taskstatistics/taskRun','body按当前日期/粒度','按类型显示已结束与运行中'),req('趋势','POST','/taskstatistics/taskTrend','当前起止、粒度和collectionType；真实键见调用片段','系列数据；不猜后端补齐空日期规则')],['初始化三个区块的独立日期→分别查询总计、运行分布和趋势。','切换某区条件只刷新该区；按服务统计周期核对分子分母和零分母；跨年用例单独验收。'],'顶部任务总计四个指标卡，右上粒度和日期；中部六类运行环图，右上独立时间；底部趋势图、类型选择与起止范围，内容纵向滚动。',['TASK-ANALYSIS']);
addProfile('dataAnalysis','/dis/integratedAnalysis/dataAnalysis','按部门和周期核对接入、写入、分布及累计读写量，区分记录数、表数和字段数。',[f('接入粒度/日期/部门 deptId','独立页签/日期/部门树','是/部门可清','日/昨日/空部门','recordType=1/2/3','仅作用接入区；具体请求键见静态调用'),f('写入粒度/日期/部门 deptIdWrite','独立页签/日期/部门树','是/部门可清','日/昨日/空部门','','与接入条件隔离'),f('分析日期/部门与累计 deptIdRead','页签/日期/部门','按区块','日/昨日','','累计读取与写入使用各自部门，不按当前页样本推全局'),ro('结果','接入源/库/表/读数量及上期比较；目标库/新增表/写数量/新增字段；频率与类型/写入分布；累计读写')],statControls,[req('部门候选','POST','/disCommon/findTreeAnalyse','无业务参数','树候选'),req('接入/写入统计','POST','/dataanalysis/accessStatistics','当前日期、粒度、部门；写入用/dataanalysis/writeStatistics','按返回字段展示总量与上期值'),req('分析','POST','/dataanalysis/analysis','当前日期/粒度/部门','更新频率和分布'),req('累计/写入分布','POST','/disTaskAnalysis/findCount','当前有权部门；写分布另/disTaskAnalysis/findWrite','明确单位与累计起止，不套表格分页')],PROFILES.taskAnalysis.flow,'接入数据统计、写入数据统计分别一排四卡；第三块有更新仪表、成功采集/类型/写入分布环图；底部累计读取与写入分布。各块右上独立日期/粒度/部门，纵向滚动；无维护工具栏。',['DATA-ANALYSIS']);

const NFRS=[
  ['DIS-NFR-001','权限与隔离','服务端对租户/空间/部门、连接、任务定义、执行实例及日志分别验权；来源读取与目标写入权限分别检查；角色切换清旧数据。','隔离环境两部门/空间、普通与维护账号，合法/越权/失效ID矩阵；越权零读取、零任务副作用。','全部功能'],
  ['DIS-NFR-002','秘密和传输','部署使用TLS；连接密码、Token、远端API安全参数不进入页面普通字段、预览、日志、浏览器持久缓存及AI输入。任务只引用授权连接ID，执行端可恢复密文凭据与平台登录密码哈希分开。','标记秘密检查请求/日志/本地存储和脱敏错误；后端配置审查；不得以Base64或禁F12替代保护。','所有配置、预览和日志'],
  ['DIS-NFR-003','外连与危险操作','预览、读取文件、API调用、数据库SQL、Kafka发现和任务运行均受服务端连接白名单/网络范围/对象权限限制；GET运行、重跑、补数不得由缓存预取或重试触发。','隔离假连接和受控目的端记录调用；未经授权和导航/刷新产生的业务执行请求数必须为0。','DIS-102、DIS-107、DIS-112、DIS-117、DIS-122、DIS-524、DIS-528、DIS-529'],
  ['DIS-NFR-004','配置原子性与幂等','一次保存原子提交主任务、告警、全部表/文件/API/Topic及列映射；重复提交和并发版本冲突不得形成部分配置、重复定义或覆盖较新版本。','两客户端并发、重复保存、事务中断20组；每组回读完整树并核对条数、稳定ID与审计。后端版本/去重协议缺失不得判通过。','全部新增修改与条件保存'],
  ['DIS-NFR-005','页面恢复与轮询','轮询沿最后提交条件，单页同类查询最多1个在途；离页/页签销毁停止定时器，旧响应不得覆盖新筛选/实例。失败保留表单和已确认子项。','慢依赖与乱序响应、清日期、切页签、重入100次；无重叠轮询、筛选丢失、跨实例显示或销毁后请求。10秒为当前列表轮询配置，不是实时性实测。','六类列表、监控、统计'],
  ['DIS-NFR-006','任务结果未知与恢复','配置保存、启动接受、运行完成分别呈现。超时或断网先核查定义/执行实例，禁止自动重放启动/停止/重跑；明确失败后才允许受控重试。','注入提交前、服务接受后、响应丢失三时点故障，核对请求、任务和目标数据；每次用户动作最多一次有效执行，不假报完成。','全部保存、运行、调度、补数'],
  ['DIS-NFR-007','离线数据一致性','每批记录读取/成功写入/更新/跳过/脏数据及检查点；批次重启后去重，不漏数据。增量高水位、空值、时区、相等时间戳、覆盖边界和源表变化均有版本契约。','每种获支持方向使用10万行固定数据（空值、重复键、多字节、精度边界），批中断恢复后按业务键/列值及计数全量比对；零丢失、无协议外重复。','表离线、库迁移、API与文件解析'],
  ['DIS-NFR-008','文件安全和解析一致性','远端路径限定连接根目录，拒绝目录穿越；编码、分隔符、引号换行、表头/sheet/空文件/损坏文件与同名更新有可复现规则；预览按授权列并截断。模板上传归属及临时回收单独管理。','小/空/多字节/换行/损坏/越界路径文件矩阵，字节和解析记录对照；替换和追加不误写相邻目录；未知文件大小上限不得放行生产。','DIS-112、DIS-117、DIS-516、DIS-518'],
  ['DIS-NFR-009','实时检查点与背压','每方向契约化CDC日志/offset、消费组、提交顺序、重放去重、乱序/迟到及删除处理；目的端变慢须有有界队列/背压，offset推进不得先于数据可恢复落地。','隔离源目标故障及恢复，至少3个检查点边界断开20组；按主键/offset核对零丢失及协议内重复；未有引擎契约不宣称exactly-once。','DIS-122、DIS-522、DIS-524'],
  ['DIS-NFR-010','审计和可观测性','保存、删除、运行、停止、复制、调度、对账/补数记录操作者、时间/时区、范围、任务/实例ID、动作、结果、请求关联与版本；错误/日志过滤秘密且可追溯。','一次成功、拒绝、结果未知与恢复事件串联；同一动作关联到定义/实例/目标变更，缺字段或秘密泄露即失败；留存周期按发布策略验收。','所有条件写入和日志'],
  ['DIS-NFR-011','页面响应性能','指定验收环境，1000条任务分页冷启动P95≤3秒；100条表映射表单到可操作P95≤5秒；操作到可见反馈P95≤100ms。','冷/热分别≥100样本；同钟navigationStart至候选/控件可用，交互从输入事件至下一次可见反馈；报P50/P95/P99/最大及失败数，样本不足不通过。','列表、配置、详情'],
  ['DIS-NFR-012','接口容量与任务资源','1万条定义/10万条执行记录下，20独立用户、最多20在途的列表/详情端到端P95≤2秒、P99≤5秒，非预期失败率≤0.1%；保存100表映射P95≤5秒。同步吞吐按连接/引擎实测并制定容量，不以maxConcurrentNum=10证明10任务全局容量。','预热2分钟/统计10分钟，每端点至少200成功样本；保留5xx/超时/解析/错误业务/限流失败分母，报实际吞吐及资源；真实或模拟依赖分别标注。','配置接口、运行记录、执行引擎'],
  ['DIS-NFR-013','统计正确性','概览/趋势/对账在相同授权范围和统计快照下可追溯；定义数、执行次数、读写记录、文件数、表/字段数不可混用；零分母/无数据/读取失败分别显示。','固定任务与实例夹具逐字段手工对照；跨日月年、时区、迟到数据和0分母20组；舍入到显示精度，不出现NaN/Infinity。','DIS-001、DIS-500、DIS-525、DIS-528、DIS-530、DIS-531'],
  ['DIS-NFR-014','可用性和恢复目标','验收发布后连续30天，每分钟一次授权健康读取，成功时隙/应测时隙≥99.9%，失败/无效/漏测计非成功且含计划维护；配置恢复目标RTO≤30分钟、已确认配置RPO=0；数据流RPO按检查点协议。','部署、备份和故障恢复演练保留开始/恢复时间及配置版本，完整窗口≥43200时隙；短测不能证明月度可用率。副作用探测禁止使用运行接口。','模块服务及执行配置'],
  ['DIS-NFR-015','兼容和可访问性','Windows 11、Chrome/Edge验收时稳定版及前一主版本，1440×1000/1500×1000、200%缩放和320 CSS像素宽；键盘可达、标签关联、错误播报、对话框焦点进入/恢复、正文对比度≥4.5:1。','逐分辨率/缩放/浏览器矩阵，长文本、空态、加载、失败及全部条件模态；自动扫描加人工键盘/读屏；二维数据表可横滚但不能裁掉主要按钮。','全部页面与模态'],
  ['DIS-NFR-016','长时资源稳定性','反复开关映射图、预览、日志及页签100次，不累计定时器、监听、图表/编辑器实例或文件objectURL；长时任务内存和队列有监测上限。','固定构建连续8小时，记录基线/100次循环/末尾内存与在途数；页面关闭后零所属在途任务和定时器；引擎容量阈值未制定不判生产稳定。','图表、映射、预览、轮询及任务引擎'],
  ['DIS-NFR-017','可维护性与契约','源/目的方向、DTO、枚举作用域、失败/权限分支与版本纳入契约；相对前缀统一配置；需求刷新不得丢原编号、截图/来源与未执行状态，所有新工具具拒绝伪造回归。','文档/生成器/证据摘要测试、两次刷新字节一致、原归档保留审计；接口契约和模拟/真实联调分别报告；缺契约部分不得让AI自行定义生产语义。','全部功能及文档工具'],
];
function applicableNfr(kind){
  const form=/Add|Edit/.test(kind),list=kind.endsWith('List');
  const codes=new Set([1,2,5,11,12,14,15,16,17]);
  if(form||list||['check','supply'].includes(kind))for(const n of [3,6,10])codes.add(n);
  if(form)codes.add(4);
  if(['tableAdd','tableEdit','dbAdd','interfaceAdd','check','supply'].includes(kind))codes.add(7);
  if(['interfaceAdd','fileAdd'].includes(kind))codes.add(8);
  if(['realAdd','mqAdd'].includes(kind))codes.add(9);
  if(['home','monitor','monitorDetail','check','taskAnalysis','dataAnalysis'].includes(kind))codes.add(13);
  if(['monitor','monitorDetail','alarm'].includes(kind))codes.add(10);
  return [...codes].sort((a,b)=>a-b).map(n=>'DIS-NFR-'+String(n).padStart(3,'0')).join('、');
}
function acceptanceFor(e){
  const p=PROFILES[e.kind],form=/Add|Edit/.test(e.kind),list=e.kind.endsWith('List');
  let cases=form?[
    '准备本任务类型合法数据，逐项核对字段、候选、条件子组件与默认；名称1/2/100/101及纯空白应按字段规则反馈；适用并发/速率空、0、1、10、11、负数、小数分别验证，非适用表单不增加通道字段。',
    '分别只选告警用户/只选渠道/两者均空/成对，检查成对规则和逗号序列化；修改来源/schema/文件或Topic后，失效字段和映射全部清理，最新候选不被迟到响应覆盖。',
    '合法输入与全部分页子项→确认弹窗→提交，核对'+p.requests[0][1]+' '+p.requests[0][2]+'及本类型模型；回读完整任务和映射ID；配置保存不新增执行实例。',
    '构造权限资料permission=1/2、明确失败、202/5xx、断网、响应丢失、同步构建异常与并发版本冲突；分别保持草稿、解锁、定位缺权表，结果未知先核查，零假成功或自动重放。',
    '修改草稿后分别取消弹窗/取消主表/返回/后退、重新进入并回读原值；连续点击/Enter同一提交入口只形成一次请求；文件模板上传等即时动作按实际生命周期回收，不把取消称为远端回滚。',
  ]:list?[
    '在授权范围准备匹配、不匹配和跨部门任务；按名称/本页状态/部门查询，核对请求body、datas/total、结果列及来源ID；列表不出现新增表单字段。',
    '查询、重置、翻页、改变页大小、清空筛选和返回各执行一次；重置回默认第1页；若有轮询仅使用已提交快照，不清用户正在编辑的条件。',
    '切换条件/页签并乱序返回响应；空数组展示空态，5xx/断网保留条件和失败反馈；未知状态不能显示为结束或启用危险动作。',
    '按稳定任务ID打开编辑/查看/运行结果，核对对应类型路由和执行实例上下文；无权直接URL/ID被服务拒绝；轮询/导航不发运行或删除请求。',
    '仅隔离环境人工确认一次运行/停止/复制/删除或生成流程，分别回读定义、实例和目标影响；取消不写入；超时不重放；页面销毁停止其轮询。',
  ]:[
    '按本功能入口和授权范围打开，核对字段、布局、类型枚举及各指标/结果含义；系统生成记录不添加人工维护按钮。',
    '准备合法、零结果、缺字段和零分母数据，读取'+p.requests[0][2]+'，逐字段核对类型/单位/总数或明细，空态与失败分开。',
    '改变日期/粒度/部门或明细分页，清空日期并乱序返回；清除所有派生起止字段，各区块和各实例数据不串用。',
    '模拟失权、错误实例ID、202/5xx/断网，保持可恢复上下文且不泄露其他范围；只读重试不触发运行/重跑/补数。',
    '关闭/返回/重入核对焦点、筛选、分页、资源回收；如本功能有补数/重跑操作，仅隔离人工确认并回读实例和业务数据，确认接受不代表完成。',
  ];
  return cases.map((c,i)=>['DIS-AC-'+String(e.start+i).padStart(3,'0'),c,e.id,'未执行']);
}
function renderFeature(e){
  const p=PROFILES[e.kind];if(!p)throw new Error('DIS unknown profile: '+e.kind);
  const form=/Add|Edit/.test(e.kind),sources=e.sources||[];
  return [`### ${e.id} ${e.title}`,'',`**功能入口**：${p.route}。`,'',`**操作类型**：${form?'任务定义维护及条件子项':'查询、展示及明确授权的条件动作'}。`,'',`**业务目的**：${p.goal}`,'','**前置条件**：已有有效登录会话与本对象访问权限；读取连接、数据预览、目标写入、保存、删除、启停、生成流程和补数分别授权，菜单可见不授予业务接口权限。','',`<!-- 完整规格:${e.id} -->`,'',
    `#### 1. 页面字段清单（${e.id}）`,'',...table(['字段名称与绑定名','类型/控件','是否必填','默认值','长度/范围/单位','格式及校验规则','错误提示','条件/状态'],p.fields),
    ...(e.kind==='interfaceAdd'?['**文件解析分支字段**：本页签使用独立文件表单，不能提交API模型。','',...table(['字段名称与绑定名','类型/控件','是否必填','默认值','长度/范围/单位','格式及校验规则','错误提示','条件/状态'],parseFields)]:[]),
    '属性空白表示证据没有给出该约束，不是无约束或授权AI自定。明确初始空字符串、null、0、false与未选择分开处理；候选初始化的部门不是固定产品默认。列名和局部数组分页不改变稳定对象ID。','',
    `#### 2. 页面交互规则（${e.id}）`,'',...table(['控件/触发方式','行为、条件联动、忙碌/禁用、反馈与草稿处理'],p.controls),
    `#### 3. 业务流程与异常分支（${e.id}）`,'','**操作与规则**：','',...p.flow.map((x,i)=>(i+1)+'. '+x),'','**结果与异常处理**：','',
    ...table(['分支','结果、数据影响与恢复'],[
      ['输入/依赖失败',form?'主表或条件子表无效时逐字段提示并定位；候选加载/解析/预览失败停在当前草稿。禁止传显示名称代ID、空映射或失效目标。':'筛选或日期范围不合法不发请求；合法查询零结果为空态，不据此判定查询失败。无人工维护表单时不适用新增必填与加密分支。'],
      ['权限/状态冲突','服务拒绝时保留可修正上下文；会话过期清敏感显示并交统一认证入口。权限资料、运行接受和完成分别表达；业务未知状态显示原值/未知，不猜完成。'],
      ['超时/网络/晚响应',form?'释放请求锁并保留草稿，显示结果未知，核查原定义/版本后再决定重试；迟到响应不得覆盖已改变的上下文。':'读取失败保留条件并提示重试；区块和实例独立，晚响应不覆盖新条件。运行/补数等条件动作超时先查实例，不自动重试。'],
      ['取消/离开',form?'弹窗取消只丢副本；主表确认丢草稿并返回原列表，离开不保存、不运行。已发生即时上传的文件生命周期独立处理。':'关闭明细回原列表；统计和日志为系统生成，常规读取不适用人工新增/编辑/删除；条件动作仅在单独确认时执行。'],
    ]),
    `#### 4. 接口与数据规则（${e.id}）`,'',...table(['用途','HTTP方法','相对路径','参数名称/位置/来源/转换','返回读取与页面处理'],p.requests),
    '**开发处理细则**：通过父应用会话客户端请求，默认API_BASE_URL路径/back，dis服务默认/dis/base，MODULE_URL_PREFIX可覆盖。普通JSON请求Content-Type为application/json；GET第三参数进入query，其他方法body，路由id单独入path。列表合并pageRequest并读取datas/total。HTTP202走公共业务错误reject，正常响应解包data；没有统一code=0成功判定。1002/1003/1012/1109等公共分支及超时覆盖规则见第4节；成功body和引擎行为按已交付契约处理。缺失的服务端契约见[核查记录](./核查记录.md#外部依赖)，不得补造DTO或运行成功码。','',
    `#### 5. 验收标准（${e.id}）`,'',...table(['验收编号','前置数据、操作、可检查结果及回读','关联需求','状态'],acceptanceFor(e)),
    `#### 6. 权限与安全要求（${e.id}）`,'','服务端逐对象核验连接/任务/实例及其所属范围，源读、目标写和运行权分别检查。直接URL/ID不绕过鉴权；预览与日志按行列范围脱敏并转义。错误不得包含凭据、原始安全参数或无权数据。仅打开页面不授权保存、上传、运行、复制、删除、调度或补数。','',
    `#### 7. 页面布局与状态（${e.id}）`,'',p.layout,'','初始化、加载、可操作、空数据、校验错误、服务拒绝、网络失败与结果未知各有明确状态；忙碌控件保留可读标签。窄屏按区域换行、二维表独立滚动，200%缩放不裁掉操作。统计无保存中状态，运行接受不能显示已完成。','',
    `#### 8. 关联文档（${e.id}）`,'',...sources.map(s=>{const live=/^H-|^R/.test(s)?'live-recheck-20261022/':'';return `- [${s}原图](../evidence/${live}${s}.png) / [原元素与采样时间](../evidence/${live}${s}.json)。`;}),
    '- [专项静态原文与摘要](../evidence/dis-review-20261027/index.json)：'+p.sources.map(s=>'DIS-SRC-'+s).join('、')+'；[核查记录](./核查记录.md)登记差异与证据边界；[公共数据规则](./子页面与操作细化.md#4-字段枚举和约束)登记子协议。','',
    `#### 9. 非功能性需求（${e.id}）`,'',`适用[模块非功能要求](./需求说明.md#非功能性需求与验收口径)：${applicableNfr(e.kind)}。只读统计不适用文件上传、配置保存或CDC故障注入；表单只对实际支持方向验收一致性/解析/CDC，不能用配置测试替代引擎测试。每项独立验收，状态均为未执行。`,'',
  ].join('\n');
}

function sharedRules(){return [
  '### 任务类型、接口及动作矩阵','',
  ...table(['任务对象','分页 / 详情 / 新增 / 更新 / 删除（省略/back/dis/base）','人工运行动作与边界'],[
    ['表离线','POST /disTask/page；GET /disTask/findAllInfoById/{id}；POST /disTask/add；PUT /disTask/update/{id}；DELETE /disTask/remove/{id}','PUT /disTask/startTask/{id}、/stopTask/{id}；POST /disTask/addSchedule；PUT /disTask/copy/{id}的原包装器额外尾空格列为修正差异。'],
    ['库离线','POST /dbMove/page；GET/PUT/DELETE /dbMove/{id}；POST /dbMove','PUT /dbMove/startTask/{id}、/endTask/{id}、/copy/{id}；校验目标表名POST /dbMove/checkTabName。'],
    ['API采集','POST /disapicollection/page；GET /disapicollection/detail/{id}；POST /disapicollection；PUT/DELETE /disapicollection/{id}','GET /disapicollection/task/{id}，query status=1手动运行；POST /disapicollection/addScheduleApi、PUT /disapicollection/copy/{id}；GET仍有业务副作用。'],
    ['文件解析','POST /disTask/findCsvExcelPage；GET /disTask/findAllInfoByIdFile/{id}；POST /disTask/addFileParse；PUT /disTask/updateFileParse/{id}；DELETE /disTask/removeFileParse/{id}','PUT /disTask/startTaskFileParse/{id}、/stopTaskFileParse/{id}；POST /disTask/addScheduleFileParse。'],
    ['FTP文件同步','POST /filecollection/page；GET /filecollection/detail/{id}；POST /filecollection；PUT/DELETE /filecollection/{id}','GET /filecollection/task/{id}?status={status}，status=0运行、2停止；POST /filecollection/addScheduleFile，PUT /filecollection/copy/{id}。GET不表示只读。'],
    ['表实时','POST /real-time_acquisition/page；GET/PUT/DELETE /real-time_acquisition/{id}；POST /real-time_acquisition','PUT /real-time_acquisition/startTask/{id}、/endTask/{id}、/copy/{id}。'],
    ['KAFKA同步','POST /real-time_acquisition/findRealTimeMqPage；GET/PUT/DELETE /real-time_acquisition/mq/{id}；POST /real-time_acquisition/addMq','PUT /real-time_acquisition/startTaskMq/{id}、/endTaskMq/{id}；完整运行状态准入由服务端契约控制。'],
  ]),
  '所有路径均为相对路径。定义保存只写配置；启停、复制、生成流程、对账配置、补数/重跑单独确认并核权限。删除确认先显示对象及引用影响，取消/关闭不发DELETE；是否可删、历史留存和运行中保护必须由服务端返回，前端不能按按钮存在认定允许。详情使用相同edit组件时optType=view禁止全部提交入口；新增/编辑分别optType=add/edit、原id从路由取得。','',
  '### 字段及模型的作用域','',
  '表离线taskType="1"；库迁移taskType=4（number）；表实时taskType="3"；文件解析和KAFKA模型均出现taskType="7"，不将taskType=7推导成全模块同一业务类型。任务趋势collectionType是1表离线、2库、3接口解析、4文件、5实时表、7MQ；监控taskType为1表离线、4库离线、8API、9文件解析；报警为1表离线、2文件、3实时表、4库、7MQ、8API、9文件解析。','',
  '列表状态也分别定义：表离线1运行中/2暂存中/3已结束/4待停止；库迁移另有5执行调度、6启动中、7新建中、8新建失败；表实时1运行中/2暂存中/3已结束/4待停止/5调度/6启动中；FTP文件0运行中/1待停止/2已结束/3暂存中；API0暂存中/1运行中/2已结束。状态候选不授予任意状态转换权限，按钮各自条件仍需服务核验。','',
  '任务名称控件maxlength=100，公共lengthGT(2)拒绝长度<2而非≤2；客户端非空工具不能代替trim后非空目标。主任务、表/文件/API/Topic子项、列映射保留各自原ID；表格分页索引和本地UUID不作为服务端ID。告警数组以英文逗号join进入disDataTaskAlarmDo.alarmUser/alarmType；界面当前候选邮件=1不表示报警记录只会有邮件。','',
  '### 表离线与实时映射','',
  '主模型包含taskName、taskType、deptId、srcDatasetType、trgDatasetType、taskDesc、告警和disDataDatasetMappingDoList；离线另有maxConcurrentNum、dataSyncRate、errorLimitRecord。每项包含id、srcInputName、trgOutputName、trgUpdateType、trgAutaCrttabFlag、exceptionStrategy、srcDatasetId、trgDatasetId、dbIn、dbOut或csvOut，以及disDataColMappingDoList。不得把这些属性按相同名称默认写入FTP/API任务。','',
  ...table(['子对象','实际字段、来源与转换'],[
    ['dbIn','dataSourceId、schemaName、tabName、srcIntegratedType、srcIncrementCol、srcSrcSql、srcPartitionCol，离线tabDesc/comment按输出分支，行dataStartDt单独传；实时另含srcIncrementType。'],
    ['dbOut','dataSourceId、schemaName、tabName、preSql、postSql、tabDesc；实时调用端不传离线前后SQL；目标连接/schema来自输出组件，逐行表名与映射按同一来源稳定键对应。'],
    ['csvOut','fileSourceId、fileUrl、fileName、columnSpilt、characterSet、nullFormat、firstLineSkip=2；源库dbIn仍存在；重复路径+文件名拒绝。firstLineSkip=2在此是调用常量，不推导表头含义。'],
    ['列映射','srcColName/srcColDatatype/srcColLength/srcColPrecision/srcColDesc → trgColName/trgColDatatype/trgColLength/trgColPrecision/trgColDesc；keyFlag、updateCol保持类型。更新策略3需有keyFlag=1。'],
    ['采集日期','表离线新增采集日期启用且非使用已有表时追加dis_dc_date：VARCHAR、length50、precision0、keyFlag0、updateCol=true；不能重复追加。不要从空映射直接取最后一列。'],
    ['目标列归一化','实时与MQ→库表当前移除目标名双引号和反引号。大小写/引用标识应按数据库元数据契约保真，不能把该客户端转换当通用服务规则。'],
  ]),
  '来源表模式1全量、2增量，增量字段必选。候选按连接→schema→表→列读取；筛选SQL或预览可能执行真实源查询，必须人工授权且服务端只读和行列限界。预览“前1000条”不代表全量读取上限。输出新增表/已有表、追加/覆盖/更新、主键和一对一映射须重验全部分页行。目标表名客户端允许字母数字下划线，但真实最大长度、大小写与类型兼容由目标数据库契约约束。','',
  '### 库迁移、API、CSV/Excel解析与文件同步','',
  ...table(['分支','序列化与可检查规则'],[
    ['库迁移','srcDbType/trgDbType控制ORACLE、MYSQL、POSTGRESQL、DM；每映射dbIn={dataSourceId,schemaName,tabName}、dbOut={dataSourceId,schemaName,tabName,exceptionFlag}；新增构建映射，当前修改分支使用verifyTableData；必须防止未重验使用空数组覆盖。'],
    ['API→库表','主模型taskName、departmentId、srcApiSourceId、targetType、remark、告警；targetSourceId/name/targetSchema来自输出。apiMappingList项{id,apiId,apiName,srcApiId,targetTableName,updateType,autoCreateTable,apiColMappingList}；targetType=0库表、1KAFKA；真实DTO需白名单确认。'],
    ['API→KAFKA','主模型同API基础字段，targetType=1；getKafkaParams写入targetSourceId及apiMappingList[{id,apiId,apiName,srcApiId,targetTopicName,apiColMappingList}]。targetTopicName取当前目的Topic，列映射取对应Topic字段；不沿用库表targetSchema/targetTableName。'],
    ['CSV输入','csvIn={fileSourceId,integratedType,fileUrl,fileName,srcIndex,templateName,firstLineSkip,columnSpilt,characterSet}；rowSelection字段至少1；编码候选UTF-8/gbk，不套CSV输出固定firstLineSkip=2。'],
    ['Excel输入','excelIn={fileSourceId,integratedType,fileUrl,fileName,srcIndex,templateName,sheetName,headFlag,headLine,startLine}；headFlag=2则headLine>0且startLine>headLine，startLine始终>0；非数字、小数及非有限数必须拒绝。'],
    ['FTP文件','srcFtpId来自输入连接，targetFtpId来自目的选择；executionType按collectMode.num=1映射0，否则1；ftpFileList=[{id,fileName,fileType,srcFilePath,targetFolderPath,updateType,remark}]；同名+目的目录重复须阻止请求，updateType=0替换/1追加。'],
  ]),
  '文件解析模板选择或上传、sheet/字段弹窗、前后SQL、预览、异常表及可视化映射分别以副本操作；上传是即时外部动作，取消表单不保证远端临时文件不存在。当前仅公开前端未查明模板上传全链和临时归属，按核查记录阻断其生产接入，不得自造上传URL、文件大小限制或回滚承诺。','',
  '### KAFKA方向与DML过滤','',
  '源类型1库表只允许目的5KAFKA；源5KAFKA允许目的1库表或5KAFKA。切换来源先清来源连接/行和目的类型，然后重新获取候选；切换目标重读其元数据，清失效映射。DML过滤候选0、1、3、5；0不筛选与其余互斥；1+3→4，1+5→6，3+5→8，单选分别保留其值。全选三个和空选的服务端编码必须契约化，不能推算9或自动当0。构建请求使用副本，不把数组原地改为数字，避免失败重试时调用.length/join出错。','',
  ...table(['方向','映射数据'],[
    ['MQ→库表','getMQParams逐项{id,srcInputName,trgOutputName,trgAutaCrttabFlag,kafkaIn:{id,dsId,topicName},dbOut:{dataSourceId,schemaName,tabName},disDataColMappingDoList}；任务映射id、Topic配置id/kafkaId与dsId分别保持。'],
    ['库表→MQ','submit先POST getKafkaTopicList，body={srcConId:目的连接ID}，按topicName=当前行trgTabName定位目的Topic；每项{srcInputName,trgOutputName,srcDatasetId,trgDatasetId,dbIn,kafkaOut:{id,dsId,topicName},disDataColMappingDoList}。dbIn取inputData连接/schema和行tabName/tabDesc/srcIntegratedType/srcIncrementType/srcIncrementCol/srcSrcSql/srcPartitionCol。未返回唯一目标Topic则拒绝保存，不从空数组取[0]；不自动建Topic。'],
    ['MQ→MQ','submit同样按目的连接和当前trgTabName重新读取目的Topic；每项{srcInputName,trgOutputName,srcDatasetId,trgDatasetId,kafkaIn:{id:行isExist?行id:行kafkaId,dsId:来源dsId,topicName:来源topicName},kafkaOut:{id:目的Topicid,dsId:目的dsId,topicName:目的topicName},disDataColMappingDoList}。两个方向连接分别授权，不复用同一dsId；相同连接/Topic回环限制、序列化和消费组语义按执行契约。'],
  ]),
  '### 元数据读取与参数来源','',
  ...table(['用途','方法及相对路径（省略/back/dis/base）','参数/读取规则'],[
    ['表离线连接/schema/表/列','POST /disCommon/findDbList；POST /disCommon/getSchemasByConnId/{id}；POST /disCommon/getTabsByConnIdAndSchema；POST /disCommon/getColumnsByTabName','连接候选按srcDatasetType；schema的id=连接id；表查询当前connId/schema，字段和预览据当前表构建，具体字面键查TABLE-INPUT/OUTPUT原文。'],
    ['表离线转换/预览','POST /disCommon/getColumnsTransferBySql、/getSrcToTrgColumn、/getHeaderAndDatas','SQL/连接/schema/当前表及字段；转换结果回草稿，预览限当前授权行列。'],
    ['库迁移','POST /disCommon/findDbMoveTaskDbList、/getSchemasByConnIdSchema/{id}、/getTabsByConnIdAndSchemaSch','源/目的库类型及连接/schema；命名校验按全部选表。'],
    ['API定义和预览','GET /disapicollection/datasource、/apilist/{id}、/apicollist/{id}、/apipreviewdata/{id}','来源ID→API列表/响应字段；预览可能访问外部API，禁止自动发起或无条件重试。'],
    ['文件解析','GET /disCommon/sourceListToCsv、/ftp/folderList/{id}；POST /disCommon/getFilesBySourceIdAndPath、/getHeaderAndDatasByFile、/getExcelSheetNameByPath','当前文件源和目录/文件，读取预览、sheet、字段；不能混用本机文件路径和远端目录。'],
    ['表实时','POST /disCommon/findRealTimeDbList、/getSchemasByConnIdTabTime/{id}、/getTabsByConnIdAndSchemaTab、/getColumnsByTabNameTab','当前来源/目标连接及schema；其他Time/Tab元数据包装器以专项API原文为准。'],
    ['KAFKA发现/映射','POST /disCommon/findKafkaList、/getKafkaTopicList、/getTopicFields、/getSrcToTrgColumnTab、/getTrgColListBySrcColList；POST /disTask/autoMappingMq','Topic候选关联连接ID；自动映射仅建议；发现/预览涉及外部访问，人工触发。'],
    ['部门和告警','POST /disCommon/findTree、findTreeSchema、findTreeFile、findTreeAPI、findTreeFileParse、findTreeTabTime、findTreeMq、findTreeMonitor、findTreeAnalyse；各类findUserList对应后缀','每类任务读取自身范围，不跨用tree或将返回树当角色矩阵。具体方法均POST，完整路径和客户端名称见专项API原文。'],
  ]),
  '### 对账配置、补数据、调度和日志','',
  ...table(['配置/页面','字段与请求、恢复'],[
    ['表任务“配置对账”弹窗','reconciliation={openCheck:false,checkType:1,dayRate:1,startTime:""}；POST /back/dis/base/disDataCheckConfig/configureCheck。开关true→openCheck=0、false→1；即时checkType=1仅传openCheck/checkType/taskId，周期型另传startTime、checkRunDate、checkInterval=1、checkCycle。dayRate=1/2/3→cycle=5/4/3；每周由起始日期映射SUN…SAT。取消不请求；开关关闭但请求resolve也不能显示“已执行对账”。'],
    ['表任务“补数据”弹窗','supplyTaskName、taskMode=1依据对账/0自定义、taskSwitch、parallel、parallelNum、replenishDateList[{startTime,endTime}]；taskMode=0每段起止齐全有序；并发开启时正整数1～10，关时按契约不传并发值。POST /supplydatatask新增，PUT /supplydatatask/{id}修改，taskType=5、taskId原定义、deptId/taskName、timeList；修改另带taskSwitch 1/0。开关在新增请求中的缺失须后端澄清，不自行补造。'],
    ['补数/重跑','GET /supplydatatask/startSupplyDataTask/{id}、/rerun/{id}为人工写动作；超时结果未知先回读/supplydatatask/{id}及独立执行日志，再决定重试。'],
    ['生成调度流程','选中taskQueue→processName必填、checkType初始0；按任务类型调用addSchedule/addScheduleApi/addScheduleFile/addScheduleFileParse。body={scheduleName:process.processName,scheduleMode:process.checkType,ids:taskQueue.map(e=>e.id)}，正常分支读取标量flowId。流程生成与运行授权分开，不跨任务类型混选。'],
    ['监控详情','任务ID≠执行实例ID≠明细ID≠callbackId；详情以logId分页，pageNo=1/pageSize=10/order=id倒序；各模态独立页码，换实例清旧日志/明细。库/表/文件与API详情路径分别为/disDataTaskLogDetail/page和/disapicollectionlogdetail/page。'],
    ['运行记录','各任务类型对应taskOperation/list、libraryMigration、realTimeList、kafkaTimeList、fileList、fileCollection及API taskOperation，query.id为任务ID；字段/执行详情再用返回实例ID。日志POST getMsgByCallbackId/…Tab/…File按所属类型调用。'],
  ]),
  '### 公共请求、成功失败与时间','',
  ...table(['分支','可开发规则与边界'],[
    ['前缀/会话','dis微应用bcab模块把请求交父应用；默认服务/dis/base和网关/back合成/back/dis/base。运行时MODULE_URL_PREFIX可覆盖，部署域名、端口和秘密查询值不写入正文。会话由公共客户端接续，不自行添加新Cookie/Token机制。'],
    ['正常HTTP响应','父客户端解包data；202单独业务reject，不能套统一code=0或HTTP200必成功。任务保存当前truthy响应当权限资料数组（permission1源/2目标），falsy正常分支提示保存成功。后端真实成功body、空数组语义和错误结构须契约化。'],
    ['全局与局部错误','1002认证失效、1003无权、1012公共刷新、1109修改密码流程由父应用处理；本模块catch通常只清loading，不证明有完整错误文案。目标统一提示、释放锁且不重复弹错，未知业务码保留诊断关联。'],
    ['超时','路径级非负timeout优先，再number请求timeout，再20000ms兜底；0可能无限，不能声称本模块当前全部20秒截止。目标按查询、元数据/预览、配置和长任务分别配置有限超时；执行时长独立于HTTP超时。'],
    ['日期/时间','统计日/月/年分别YYYY-MM-DD/YYYY-MM/YYYY；初始昨日/上月/上年为动态值，跨年不得产生YYYY-00。服务时区、范围端点包含性、任务持续时长单位须契约化；日期清空清派生起止字段。'],
    ['执行协议','保存、接受、启动中、运行中、停止中、已结束/失败和部分成功分开。数据库类型映射、增量检查点、API分页/重试、Kafka offset/消费组、FTP更新、RPO/重放须执行端设计，不能从客户端字段推导。'],
  ]),
].join('\n');}
function renderNfrSection(){return ['### 非功能性需求与验收口径','',
  '下列数值为本次新增开发验收目标，目标来源、当前差异和取舍在[核查记录](./核查记录.md#非功能目标来源)登记；未做实测，不代表现网能力。功能与质量验收分别执行，查询/保存时延不等于数据同步吞吐或完成时延。','',
  ...table(['编号','质量属性','需求与指标/不变量','环境、测量方法及失败判定','关联功能','状态'],NFRS.map(n=>[...n,'未执行'])),
  '性能环境固定为验收构建、Windows 11/至少4核8GiB客户端、记录浏览器精确版本，100Mbps上下行/RTT50ms，冷/热缓存分开；服务端实例/CPU/内存、数据库/索引/网关、加密/限流、真实或模拟源目标完整登记。无真实环境时使用模拟数据只能验页面，不能代服务/引擎测试。','',
  '延迟从用户触发至控件可用或服务业务结果回读完成，以同一时钟计；样本升序第ceil(p×N)项计算分位。报告N、P50/P95/P99/最大、实际吞吐、失败数及失败原因；预期校验失败单列，合法请求5xx/超时/解析/业务错误/限流都计非预期失败，不从分母移除。零样本或不足最低样本不能判通过。','',
  '同步、CDC、文件和API引擎按各连接能力分别设置数据量/并发/吞吐预算，不复制登录认证指标。服务持续探测、压测、故障注入、真实源读写与任务执行均需隔离环境及相应授权；本次全部未执行。','',
].join('\n');}
function boundaries(){return table(['关联编号','操作范围','明确调用端与受阻交付项'],registry.boundaries.map(line=>{
  const c=line.split('|').slice(1,-1).map(x=>x.trim()),id=c[0];let detail;
  if(['DIS-125','DIS-127'].includes(id))detail=id==='DIS-125'?'KAFKA列表已在DIS-523及任务矩阵细化；本编号保留为业务别名，权限与运行态准入仍需服务契约。':'KAFKA新增已在DIS-524及方向矩阵细化；本编号保留，不能重复实现第二套协议。';
  else detail='本对象详情/修改/删除的客户端路径和参数见任务矩阵；详情只读、编辑保留原ID、删除确认后才DELETE。运行中保护、引用关系、服务端版本/事务/历史保留未取得，需后端负责人交付后方可完成对应业务验收。';
  return [id,c[1],detail];
})).join('\n');}
function legacyRows(key){return registry[key].legacyAcceptance.map(line=>line.replaceAll('【拟定需求】','').replaceAll('【页面观察】','').replaceAll('按公共规则建议评审','按本模块字段规则和服务契约验证').replaceAll('按评审后的例外规则处理','按即时动作生命周期处理'));}
function guard(previous,key){
  const actual=[...previous.matchAll(/^\| (DIS-AC-\d{3}) \|/gm)].map(m=>m[1]);
  if(JSON.stringify(actual)!==JSON.stringify(registry[key].acceptanceIds))throw new Error('DIS published acceptance registry changed');
  for(const row of registry[key].sourceRows)if(!previous.includes(row))throw new Error('DIS published source lost');
}
function renderDocument(key,previous){
  guard(previous,key);const entries=key==='main'?MAIN:SUB;
  return ['# '+(key==='main'?'数据集成采集业务需求说明':'数据集成采集子页面与操作需求细化'),'','<!-- 业务规格格式:plain-v1 -->','<!-- dis:generated-spec-v1 -->','',
    '## 1. 业务目标与使用角色','',
    '配置来源到目的地的数据集成，分别管理任务定义、执行实例、监控/报警、对账、补数据和统计。入口为数据开发→数据集成采集；集成人员和运维人员各按服务端授权范围操作，不能把一个账号可见菜单当角色权限矩阵。','',
    '## 2. 业务范围','',
    '覆盖表离线、库离线、API采集、CSV/Excel解析、FTP文件同步、表实时、KAFKA同步，以及首页、任务监控/详情/日志、异常告警、数据对账、补数据、任务分析、数据分析。API采集与文件解析保留独立页签、模型和协议。原业务及验收编号保持，KAFKA原边界编号与已展开子需求交叉关联。','',
    ...table(['对象/页面','本版规格位置','交付条件'],[
      ['六类任务与接口/文件页签','第3节逐功能、第4节任务矩阵及方向模型','页面/已知调用端可开发；后端DTO、权限、运行态和引擎契约按第7节限制接通。'],
      ['监控/日志/报警','子页面DIS-525～527','系统生成只读记录，不强加人工CRUD；日志需行列授权与秘密过滤。'],
      ['对账/补数/调度','子页面DIS-528～529及第4节条件操作','配置、触发和运行完成分别授权/验收；不因HTTP GET推断只读。'],
      ['首页与分析','DIS-001、DIS-500、DIS-530～531','明确分子分母、时间、单位及无数据；后端聚合范围与统计快照需契约。'],
    ]),
    '## 3. 功能需求','',...entries.map(renderFeature),
    '## 4. 字段、枚举和约束','',sharedRules(),
    '## 5. 主要流程','',
    '1. 用户在授权任务类型列表选择新增或原任务维护，加载该类型候选；不能跨用API/文件、实时/MQ的模型或枚举。',
    '2. 基本信息→适用通道参数→来源及采集字段→目的及写入策略/映射→完整校验→保存定义并回读；告警和全部子项原子保存。',
    '3. 有权用户单独确认运行或生成调度，提交后追踪执行实例；运行日志、读写计数和目标数据回读共同证明实际结果。',
    '4. 告警与对账记录作为系统结果只读；需要补数或重跑时独立配置与确认，按原任务/补数/实例不同ID追踪，超时先核结果。',
    '5. 失权、状态/版本冲突、源目标变化、候选加载失败、空结果、网络失败及结果未知分别恢复；离页终止页面轮询，后台任务依执行协议继续。','',
    '## 6. 验收标准','',
    '功能验收逐项在第3节，第6节保留已发布的补充用例编号和触发语义。应用验收全部未执行；文档校验、静态检查与历史页面材料不替代受控运行验收。','',
    ...(key==='main'?table(['验收编号','场景','操作、可检查结果与回读','关联需求','状态'],[]):table(['验收编号','操作、可检查结果与回读','关联需求','状态'],[])).slice(0,2),...legacyRows(key),'',
    ...(key==='main'?[renderNfrSection()]:[]),
    '## 7. 实现与交付边界','',
    '可开发范围为本文明确的界面、控件、校验、调用端模型及目标恢复交互；模拟数据须可见标识。真实持久化、运行、外部源目标访问、CDC恢复及生产可用性必须取得相应后端/引擎协议并通过隔离验收。字段属性空白不授予自由选择业务规则的权限。','',boundaries(),'',
    '全部功能与非功能应用验收均未执行。证据缺口、已查调用链、所需材料、负责人和受阻验收见[核查记录](./核查记录.md#外部依赖)。只读打开详情不授权运行、上传、删除、压测或改权限。','',
    '### AI辅助的采纳边界','',
    '关联[源目标字段映射建议](../AI能力规划.md#ai-003-源目标字段映射建议拟定需求)。该规划不是现有系统能力；输入只含获授权且已脱敏的字段元数据，输出注明来源类型/版本、映射和不兼容原因。人工采纳只改变当前草稿，重新执行确定性类型/主键/权限校验；不得自动保存、运行、补数、生成调度流程、删除或读取原始秘密。失败/取消丢弃迟到输出并允许人工配置；实际AI质量与成本验收需独立规划授权，应用验收未执行。','',
    '## 8. 关联资料','',
    '[模块主规格](./需求说明.md) · [子页面规格](./子页面与操作细化.md) · [核查记录](./核查记录.md) · [静态证据](../evidence/dis-review-20261027/README.md) · [历史调研归档](./调研记录.md) · [历史补充与适用范围](./源码核对补充.md) · [总索引](../README.md)','',
    ...table(['需求编号','界面依据','详细记录'],[]).slice(0,2),...registry[key].sourceRows,'',
  ].join('\n');
}
const renderMain=t=>renderDocument('main',t),renderSub=t=>renderDocument('sub',t);
function writeDocuments(root){const dir=path.join(root,'doc/requirements/08-数据集成采集');for(const [file,render]of [['需求说明.md',renderMain],['子页面与操作细化.md',renderSub]]){const p=path.join(dir,file);fs.writeFileSync(p,render(fs.readFileSync(p,'utf8')));}}
if(require.main===module)writeDocuments(path.resolve(__dirname,'..'));
module.exports={MAIN,SUB,PROFILES,NFRS,acceptanceFor,renderFeature,renderMain,renderSub,writeDocuments};
