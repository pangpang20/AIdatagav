const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'doc/requirements/07-数据源管理');
const spec=require('../scripts/ds-requirement-spec');
const collector=require('../scripts/prepare-ds-evidence');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/ds-review-20261026/index.json'),'utf8'));
const raw=id=>{const source=data.sources.find(s=>s.id==='DS-SRC-'+id);assert.ok(source,id);return source.excerpts.map(e=>e.text).join(' ');};
const both=()=>read('需求说明.md')+read('子页面与操作细化.md');
const fields=kind=>spec.PROFILES[kind].fields;

test('all 30 DS specifications retain concrete eight-column fields, screenshots and 324 unique unexecuted acceptance IDs',()=>{
  const all=[];
  for(const [file,entries,total]of [['需求说明.md',spec.MAIN,220],['子页面与操作细化.md',spec.SUB,104]]){
    const text=read(file);
    assert.ok(text.includes('<!-- 业务规格格式:plain-v1 -->'));assert.ok(text.includes('<!-- ds:generated-spec-v1 -->'));
    assert.doesNotMatch(text,/【|】|待确认|未观察到|https?:\/\//);
    assert.deepEqual([...text.matchAll(/^### (DS-\d{3})\b/gm)].map(m=>m[1]),entries.map(e=>e.id));
    for(const entry of entries){
      const block=text.split('### '+entry.id+' ')[1]?.split(/^### |^## /m)[0];assert.ok(block,entry.id);
      for(const [i,h]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档'].entries())assert.ok(block.includes(`#### ${i+1}. ${h}（${entry.id}）`),entry.id+' '+h);
      const rows=block.split('#### 1. 页面字段清单')[1].split('#### 2. 页面交互规则')[0].split('\n').filter(l=>l.startsWith('|')&&!l.startsWith('|---')&&!l.includes('字段名称与绑定名'));
      assert.ok(rows.length>=4,entry.id+' fields');for(const row of rows){const cells=row.split('|').slice(1,-1);assert.equal(cells.length,8,entry.id);assert.ok(cells[0].trim(),entry.id+' unnamed field');}
      for(const id of entry.sources)assert.ok(block.includes(id+'.png'),entry.id+' '+id);
      assert.ok(block.includes('/back/common/'),entry.id+' concrete API');
    }
    const ac=[...text.matchAll(/^\| (DS-AC-\d{3}) \|.*$/gm)];assert.equal(ac.length,total);
    for(const row of ac){assert.equal(row[0].split('|').at(-2).trim(),'未执行');assert.equal(row[0].split('|').slice(1,-1).length,4);all.push(row[1]);}
  }
  assert.equal(new Set(all).size,324);
  for(const id of ['101','106','111','113','114','116','117','118','119','121','123','124','126'])assert.match(read('需求说明.md'),new RegExp('^\\| DS-'+id+' \\|','m'));
});

test('management, department and usable connections keep distinct scopes and external test calls',()=>{
  const manage=raw('MANAGE-API'),text=both();
  for(const [kind,suffix,testNo]of [['sourceList','',2],['deptList','/my/mgr',3],['available','/my/use',4]]){
    assert.ok(manage.includes('/datasource/micro'+suffix+'/page'));assert.ok(manage.includes('/datasource/micro/test/conn'+testNo+'/'));
    const requests=spec.PROFILES[kind].requests;
    assert.ok(requests.some(r=>r[1]==='POST'&&r[2]==='/back/common/datasource/datasource/micro'+suffix+'/page'));
    assert.ok(requests.some(r=>r[1]==='GET'&&r[2].endsWith('/test/conn'+testNo+'/{id}')));
  }
  assert.ok(!spec.PROFILES.available.requests.some(r=>['PUT','DELETE'].includes(r[1])));
  assert.ok(manage.includes('/datasource/micro/test/conn1","POST"'));
  for(const value of ['adminDataSourceDetail:A.adminDataSourceDetail','myDataSourceDetail:A.myDataSourceDetail','canUseDataSourceDetail:A.canUseDataSourceDetail'])assert.ok(raw('SOURCE-FORM').includes(value),value);
  for(const value of ['0不支持、1成功、2失败','不能因GET方法认定无副作用','main/dept/list','自定义'])assert.ok(text.includes(value),value);
});

test('source dynamic keys, typed defaults, five-driver limit and nested payload match the captured implementation',()=>{
  const source=raw('SOURCE-FORM'),text=both();
  assert.match(source,/"multiple-limit":5/);assert.match(source,/r\.value\|\|n\.defaultValue/);
  assert.ok(source.includes('key:e.key.split("__S__")[2],value:t,values:n'));
  assert.ok(source.includes('driverId:e.driver.id,id:e.id'));assert.ok(source.includes('driverDataInfoList:n'));
  for(const s of ['_$_{序号}__S__{驱动名}__S__{key}','propertiesConfig:[{key,value,values}]','false','useEnv=0','最多5个','每个驱动'])assert.ok(text.includes(s),s);
  const ff=fields('sourceAdd');assert.equal(ff.find(f=>f[0]==='数据源名称 name')[4],'100字符');assert.equal(ff.find(f=>f[0]==='描述 remark')[4],'500字符');
  assert.equal(ff.find(f=>f[0]==='状态 enabled')[3],'true');assert.equal(ff.find(f=>f[0]==='可见范围 accessLevel')[4],'1、2、3');
  const audit=read('核查记录.md');assert.ok(audit.includes('逻辑或覆盖有效值'));assert.ok(audit.includes('无真实driver/list/connector响应'));
});

test('driver design has ten actual components, key and default constraints without inventing universal connection fields',()=>{
  const dynamic=raw('DYNAMIC'),design=raw('DRIVER-DESIGN'),text=both();
  assert.equal([...dynamic.matchAll(/id:"inset-[^"]+"/g)].length,10);
  assert.ok(design.includes('/^[a-zA-Z_]\\w+$/'));assert.ok(design.includes('maxlength:"40"'));assert.ok(design.includes('maxlength:50'));
  assert.match(design,/disabled:!e\.formData\.allowModify/);
  for(const s of ['2～40字符','750px','9007199254740991','12半行、24整行','requiredStaticProperties','不是所有连接字段的固定业务默认','不补造主机、端口、账号'])assert.ok(text.includes(s),s);
  assert.match(raw('DRIVER-LIST'),/!.*\.row\.used/);assert.match(raw('DRIVER-API'),/\/driver\/init","POST"/);
  assert.ok(text.includes('inside=0'));assert.ok(read('核查记录.md').includes('当前样本未显示')||read('核查记录.md').includes('当前无新增/初始化'));
});

test('API fields, exact nested model and four-array validation track the 300-row and requestParam defects',()=>{
  const api=raw('API-FORM'),text=both(),audit=read('核查记录.md');
  const types=[...api.slice(0,api.indexOf('],h=')+1).matchAll(/value:"([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(types,['string','number','boolean','object','array']);
  for(const limit of ['200','500','250','150'])assert.ok(api.includes('maxlength:"'+limit+'"'),limit);
  assert.ok(api.includes('requestParam:{paging:!1,pageName:"",pageLimitName:"",params:[]}'));
  assert.match(api,/addRow:function\(e\)\{e\.length>300/);assert.match(api,/i=e\.requestParam,r=e\.responseParam/);assert.match(api,/u<i\.length/);
  for(const s of ['每组最多300行','第301行拒绝','requestParam.params','GET、POST、PUT、DELETE','paramKey','paramNotNull','paramName','paramLength'])assert.ok(text.includes(s),s);
  assert.ok(audit.includes('length>300'));assert.ok(audit.includes('requestParam.params检查'));
  assert.equal(fields('apiAdd').find(f=>f[0]==='长度 responseParam[].paramLength')[3],'255');
  assert.equal(fields('apiAdd').find(f=>f[0]==='长度 responseParam[].paramLength')[4],'min=1；step=1');
});

test('connection and API secrets retain distinct encryption and lifecycle evidence without false F12 guarantees',()=>{
  const dynamic=raw('DYNAMIC'),cryptoText=raw('API-CRYPTO'),source=raw('SOURCE-FORM'),text=both(),audit=read('核查记录.md');
  assert.ok(dynamic.includes('RSA-OAEP'));assert.ok(dynamic.includes('mgf1:{md:o.a.md.sha256.create()}'));assert.ok(dynamic.includes('encode64(r)'));
  assert.ok(cryptoText.includes('encodeUtf8(e)'));assert.ok(cryptoText.includes('RSA-OAEP'));assert.ok(cryptoText.includes('mgf1:{md:l.md.sha256.create()}'));
  assert.ok(source.includes('"password"===e.type'));assert.ok(dynamic.includes('"show-password":e.sensitiveField'));
  for(const s of ['********','保留/替换/清空','不承诺本人F12无法读取输入','不能套账号单向哈希','当前会话内存','加密失败不明文回退'])assert.ok(text.includes(s),s);
  for(const s of ['cacheApiAddData','未见API helper的encodeUtf8','异步读','没有明确公钥就绪门控'])assert.ok(audit.includes(s),s);
  assert.ok(raw('API-FORM').includes('localStorage.setItem("cacheApiAddData",JSON.stringify('));
});

test('Kafka uses source IDs, 17 case-preserved types and exact Topic and column naming rules',()=>{
  const types=raw('KAFKA-TYPES'),form=raw('KAFKA-FORM'),list=raw('KAFKA-LIST'),text=both();
  const options=[...types.matchAll(/value:"([^"]+)"/g)].map(m=>m[1]);assert.equal(options.length,17);assert.equal(new Set(options).size,17);
  assert.ok(options.includes('BYTE[]'));assert.ok(options.includes('BINARYSTREAM'));assert.ok(options.includes('BIGDECIMAL'));
  assert.ok(types.includes('p=/^[-_.0-9a-zA-Z]{3,255}$/'));assert.ok(types.includes('m=/^[_a-zA-Z][_0-9a-zA-Z]{0,254}$/'));
  assert.ok(list.includes('id:a.row.dataSourceId'));assert.ok(raw('API-LIST').includes('id:t.row.id'));
  assert.ok(form.includes('dataSourceId:0,topicName:"",mainBody:"",sourceType:"mysql",serialization:"",deserialization:""'));
  for(const s of ['整框≤255','英文逗号','不自动trim','1～2147483647','手动为空；自动获取STRING','配置字段弹窗定义1200px','手动添加800px弹窗'])assert.ok(text.includes(s),s);
});

test('Kafka pagination, draft changes and remote discovery have separate results and regression cases',()=>{
  const kafka=raw('KAFKA-FORM'),api=raw('KAFKA-API'),text=both(),audit=read('核查记录.md');
  assert.match(kafka,/slice\(\(this\.page\.pageNo-1\)\*this\.page\.pageSize,this\.page\.pageNo\*this\.page\.pageSize\)/);
  assert.ok(kafka.includes('this.audaqueFormInfoMixin.kafkaConfigInfoList.splice(t,1)'));
  assert.match(api,/\/kafkaConfig\/topicName\/list\/"\.concat\(n\),"GET"/);
  for(const s of ['第二页配置/删除','全局索引','主表再次检查所有Topic及字段','取消丢副本','最终保存完整清单','不在此创建远端Topic'])assert.ok(text.includes(s),s);
  for(const s of ['只用当前页$index','splice(s-1,0','主提交还要重验全部字段','cacheKafkaAddData'])assert.ok(audit.includes(s),s);
});

test('file selection is immediate multipart upload with file limits and scoped downloads, not implicit cancellation rollback',()=>{
  const text=both(),dynamic=raw('DYNAMIC');
  assert.ok(raw('DRIVER-API').includes('/driver/addDriver/upload'));assert.ok(raw('MANAGE-API').includes('/datasource/micro/modifySource/upload'));
  for(const s of ['FormData {file}','file,fieldName','20 MiB','单1/多5','取消页面不保证远端临时文件不存在','businessDescription:encodeURIComponent','释放objectURL'])assert.ok(text.includes(s),s);
  assert.ok(dynamic.includes('limit:1'));assert.ok(dynamic.includes('limit:5'));
  const sourceUpload=spec.PROFILES.sourceAdd.requests.find(r=>r[0]==='连接级文件上传');assert.equal(sourceUpload[1],'POST');assert.ok(sourceUpload[3].includes('driverId'));
});

test('public errors, fixed button timer and local column sorting do not invent service codes or full-data sorting',()=>{
  const text=both(),shell=raw('SHELL-REQUEST'),controls=raw('CONTROLS'),audit=read('核查记录.md');
  assert.ok(raw('BASE').includes('NETWORK_ERROR_CODE: 202'));assert.ok(shell.includes('2e4'));
  assert.ok(controls.includes('repeatTime:{type:Number,default:3e3}'));
  for(const s of ['code200 tip/201 warn','HTTP202','0可能无限','只重排当前页','不自动修改pageRequest.order'])assert.ok(text.includes(s),s);
  for(const kind of ['apiList','kafkaList'])assert.ok(!spec.PROFILES[kind].controls.some(c=>c[0].includes('排序')));
  assert.ok(audit.includes('没有sort-change请求映射'));assert.ok(audit.includes('固定时长后重新启用'));
});

test('query, deletion and maintenance exceptions stay scoped and historical operation links resolve to current boundaries',()=>{
  const block=kind=>spec.renderFeature(spec.MAIN.find(e=>e.kind===kind));
  for(const kind of ['apiList','kafkaList','sourceList','deptList','available','driverList']){
    const errors=block(kind).split('**结果与异常处理**')[1].split('#### 4.')[0];
    assert.ok(errors.includes('不据此认定查询故障'));assert.ok(errors.includes('不适用新增表单必填'));
    assert.doesNotMatch(errors,/同步加密或解析失败|阻止适用提交/);
  }
  for(const kind of ['apiDelete','kafkaDelete','sourceDelete']){
    const errors=block(kind).split('**结果与异常处理**')[1].split('#### 4.')[0];
    assert.ok(errors.includes('取消或关闭不发DELETE'));assert.ok(errors.includes('目标消失/已被其他人删除'));
    assert.ok(errors.includes('不适用必填表单或密码加密分支'));
  }
  const index=fs.readFileSync(path.join(root,'doc/requirements/逐操作需求索引.md'),'utf8');
  const rows=index.split('\n').filter(l=>l.startsWith('| DS /'));
  assert.equal(rows.length,6);assert.doesNotMatch(rows.join('\n'),/#7-待确认事项/);
  assert.equal((rows.join('\n').match(/#7-实现与交付边界/g)||[]).length,13);
  assert.doesNotMatch(read('需求说明.md').split('\n').filter(l=>/^\| DS-AC-/.test(l)).join('\n'),/SHA-256/);
});

test('DS evidence preserves hashes, relative resources and timestamps while keeping application acceptance unexecuted',()=>{
  assert.equal(data.sources.length,29);assert.equal(data.sources.reduce((n,s)=>n+s.excerpts.length,0),55);
  assert.equal(data.publicStaticGets,25);assert.equal(data.businessRequests,0);assert.equal(data.browserOperations,0);assert.equal(data.applicationAcceptanceExecuted,false);
  for(const source of data.sources){
    assert.match(source.resourcePath,/^\/(?!\/)/);assert.match(source.sha256,/^[a-f0-9]{64}$/);assert.ok(source.bytes>0);assert.ok(Number.isFinite(Date.parse(source.fetchedAt)));
    for(const excerpt of source.excerpts){assert.ok(excerpt.text.startsWith(excerpt.anchor));assert.equal(excerpt.end-excerpt.start,excerpt.text.length);assert.equal(excerpt.sha256,sha(excerpt.text));assert.doesNotMatch(excerpt.text,/https?:\/\//i);}
  }
  assert.ok(raw('CONFIG').includes('/datasource/index.html'));assert.ok(read('核查记录.md').includes('新截图0张'));
});

test('DS evidence verification rejects swapped originals, forged excerpts, wrong hashes, unknown groups and duplicate IDs',()=>{
  const {extractSources}=require('../scripts/prepare-workbench-evidence');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ds-evidence-'));
  try{
    const folders=['own','shared'].map(group=>{const folder=path.join(temp,group);fs.mkdirSync(folder);const text=group+' scene:{valid:true}';fs.writeFileSync(path.join(folder,'fixture.js'),text);fs.writeFileSync(path.join(folder,'receipt.json'),JSON.stringify([{path:'/datasource/static/js/fixture.js',localName:'fixture.js',bytes:Buffer.byteLength(text),sha256:sha(text),fetchedAt:'2026-10-26T00:00:00Z'}]));return folder;});
    const fixture={sources:folders.flatMap((folder,i)=>extractSources(folder,'2026-10-26T01:00:00Z',[['FIXTURE-'+i,'fixture.js',[['scene:',18]]]]).map(s=>({...s,sourceGroup:['own','shared'][i]})))};
    assert.deepEqual(collector.verifyAll(fixture,...folders),{sources:2,excerpts:2,errors:0});
    assert.throws(()=>collector.verifyAll(fixture,folders[1],folders[0]),/resource mismatch/);
    const forged=structuredClone(fixture);forged.sources[0].excerpts[0].text='scene:{valid:fake}';forged.sources[0].excerpts[0].sha256=sha(forged.sources[0].excerpts[0].text);assert.throws(()=>collector.verifyAll(forged,...folders),/excerpt mismatch/);
    const wrongHash=structuredClone(fixture);wrongHash.sources[1].sha256='0'.repeat(64);assert.throws(()=>collector.verifyAll(wrongHash,...folders),/resource mismatch/);
    const unknown=structuredClone(fixture);unknown.sources[0].sourceGroup='unknown';assert.throws(()=>collector.verifyAll(unknown,...folders),/unknown source group/);
    assert.throws(()=>collector.verifyAll({sources:[...fixture.sources,fixture.sources[0]]},...folders),/duplicate source id/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('DS literal selection handles nested and quoted braces without evaluation and rejects missing boundaries',()=>{
  const literal='group:{name:"a}, b",nested:{value:\'quoted \\\' }\'},tail:"${x},"}';
  const input='prefix '+literal+',other:{x:1},'+literal;
  const first=collector.objectSelection(input,'group:{'),last=collector.objectSelection(input,'group:{',true);
  assert.equal(first[1],literal.length);assert.equal(last[1],literal.length);assert.equal(last[2],true);
  assert.throws(()=>collector.objectSelection(input,'absent:{'),/anchor missing/);assert.throws(()=>collector.objectSelection('group:{x:{y:1}','group:{'),/incomplete object/);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ds-selection-'));
  try{fs.writeFileSync(path.join(temp,'views-dataSource-driveList.5790f2a8.js'),'const noComponent=true;');assert.throws(()=>collector.select(temp),/source anchor missing/);}
  finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('DS regeneration is idempotent and rejects lost, duplicate or reordered acceptance and source registries',()=>{
  const {augmentFile}=require('../scripts/augment-requirement-specs'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ds-spec-')),args=process.argv.slice();
  const swap=(text,a,b)=>{const lines=text.split('\n'),i=lines.findIndex(l=>l.startsWith('| '+a+' |')),j=lines.findIndex(l=>l.startsWith('| '+b+' |'));[lines[i],lines[j]]=[lines[j],lines[i]];return lines.join('\n');};
  try{
    process.argv.push('--refresh');
    for(const [file,render]of [['需求说明.md',spec.renderMain],['子页面与操作细化.md',spec.renderSub]]){
      const text=read(file),rows=text.match(/^\| DS-AC-\d{3} \|.*$/gm),last=rows.at(-1);
      assert.throws(()=>render(text.replace(last,'')),/published acceptance/);assert.throws(()=>render(text.replace(last,last+'\n'+last)),/published acceptance/);
      assert.throws(()=>render(swap(text,rows[0].split('|')[1].trim(),rows[1].split('|')[1].trim())),/published acceptance/);
      assert.equal(render(text),text);const target=path.join(temp,file);fs.writeFileSync(target,text);assert.equal(augmentFile(target).changed,false);assert.equal(fs.readFileSync(target,'utf8'),text);
    }
    const text=read('需求说明.md'),source=text.split('## 8. 关联资料')[1].match(/^\| DS-100 \|.*$/m)[0];assert.throws(()=>spec.renderMain(text.replace(source,'')),/published source/);
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/采样清单.json'),'utf8')).modules.find(m=>m.code==='DS');
    assert.equal(manifest.developmentReview.status,'partial-ui-only');assert.equal(manifest.developmentReview.productionReady,false);assert.equal(manifest.developmentReview.nonfunctionalRequirements,15);
    assert.deepEqual(manifest.developmentReview.expandedOperations,spec.MAIN.map(e=>e.id));
    assert.equal(sha(fs.readFileSync(path.join(dir,'调研记录.md'))),'28757a352fbebc1a7512d819c3ca26fcb0b0e8641cf0f4ec206b644082f131e5');
    assert.equal(sha(fs.readFileSync(path.join(dir,'调研记录.md'))),manifest.researchSha256);
  }finally{process.argv.splice(0,process.argv.length,...args);fs.rmSync(temp,{recursive:true,force:true});}
});

test('15 measurable NFRs and AI safeguards remain targets with independent unexecuted acceptance and explicit dependencies',()=>{
  const main=read('需求说明.md'),sub=read('子页面与操作细化.md'),audit=read('核查记录.md');
  const rows=[...main.matchAll(/^\| (DS-NFR-\d{3}) \|.*$/gm)];assert.deepEqual(rows.map(m=>m[1]),spec.NFRS.map(n=>n[0]));assert.equal(rows.length,15);
  for(const row of rows){const cells=row[0].split('|').slice(1,-1).map(s=>s.trim());assert.equal(cells.length,6);assert.ok(cells.slice(0,5).every(Boolean));assert.equal(cells[5],'未执行');}
  for(const s of ['P95≤3秒','P95≤4秒','ceil(p×N)','320 CSS像素','1万条模拟连接定义','1000个模拟Topic','20组','100次','人工标注30例','关键事实一致率≥95%'])assert.ok(main.includes(s),s);
  for(const s of ['源目标字段映射建议拟定需求','用户逐条采纳仅更新当前草稿','AI不得自动保存、测试连接、远端获取Topic、上传、初始化、启停、删除','取消丢弃迟到输出','不将安全值存入localStorage'])assert.ok(sub.includes(s),s);
  for(const h of ['核查结论','现有实现与目标规格差异','非功能目标来源','外部依赖','验证状态'])assert.ok(audit.includes('## '+h),h);
  assert.ok(audit.includes('324条功能验收与15项非功能验收全部未执行'));
  assert.ok(audit.includes('Unicode'));assert.ok(audit.includes('生成ID与唯一性范围'));assert.ok(audit.includes('文件存储与临时回收'));
});
