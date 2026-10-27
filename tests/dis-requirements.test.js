const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const spec=require('../scripts/dis-requirement-spec');
const published=require('../scripts/dis-published-registry.json');
const dir=path.resolve(__dirname,'../doc/requirements/08-数据集成采集');
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');
const ids=text=>[...text.matchAll(/^\| (DIS-AC-\d{3}) \|/gm)].map(m=>m[1]);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');

test('DIS preserves every published feature and all 323 acceptance IDs in order',()=>{
  for(const [file,key]of [['需求说明.md','main'],['子页面与操作细化.md','sub']]){
    const t=read(file);assert.deepEqual([...t.matchAll(/^### (DIS-\d{3}) /gm)].map(m=>m[1]),published[key].entries.map(e=>e.id));
    assert.deepEqual(ids(t),published[key].acceptanceIds);assert.equal(new Set(ids(t)).size,ids(t).length);
    assert.doesNotMatch(t.replace(/\]\([^)]*\)/g,']'),/【|】|待确认|拟定需求|本轮|源码|历史DOM/);
    for(const row of t.split('\n').filter(l=>/^\| DIS-(?:AC|NFR)-/.test(l)))assert.equal(row.split('|').at(-2).trim(),'未执行');
  }
  assert.equal(ids(read('需求说明.md')).length+ids(read('子页面与操作细化.md')).length,323);
});
test('all operations have nine specific sections, fields and linked original evidence',()=>{
  for(const e of [...spec.MAIN,...spec.SUB]){
    const text=spec.renderFeature(e);for(let i=1;i<=9;i++)assert.ok(text.includes('#### '+i+'.'),e.id+' section '+i);
    assert.ok(text.includes('**开发处理细则**'));for(const source of e.sources)assert.ok(text.includes(source+'.png'),e.id+' '+source);
    assert.doesNotMatch(text,/以截图为准|未观察到默认值|HTTP成功即/);
  }
});
test('query profiles do not inherit configuration form or credential fields',()=>{
  for(const kind of ['tableList','dbList','interfaceList','fileList','realList','mqList']){
    const rows=spec.PROFILES[kind].fields;assert.ok(rows.some(f=>f[0].includes('pageRequest.pageNo')));
    assert.ok(!rows.some(f=>/maxConcurrentNum|alarmUserData|errorLimitRecord/.test(f[0])),kind);
    assert.ok(spec.PROFILES[kind].requests.some(r=>r[1]==='POST'&&/page|Page/.test(r[2])));
  }
  const api=spec.PROFILES.interfaceAdd.fields.map(f=>f[0]).join('、');assert.doesNotMatch(api,/preSql|errorLimitRecord|trgUpdateType/);assert.match(api,/targetTopicName/);
  const mq=spec.PROFILES.mqAdd.fields.map(f=>f[0]).join('、');assert.match(mq,/inputData.dataSourceId\/schemaName/);assert.doesNotMatch(mq,/preSql|errorLimitRecord/);
});
test('six task families retain separate paths, payloads and GET side effects',()=>{
  const t=read('子页面与操作细化.md');for(const s of ['/back/dis/base/disTask/add','/back/dis/base/dbMove','/back/dis/base/disapicollection','/back/dis/base/disTask/addFileParse','/back/dis/base/filecollection','/back/dis/base/real-time_acquisition/addMq','executionType','ftpFileList','apiMappingList','csvIn','excelIn','kafkaIn','kafkaOut'])assert.ok(t.includes(s),s);
  assert.ok(t.includes('GET仍有业务副作用'));assert.ok(t.includes('departmentId'));assert.ok(t.includes('deptId'));assert.ok(t.includes('targetType=0库表、1KAFKA'));
});
test('mapping, CSV, Excel, DML and unknown recovery semantics are explicit',()=>{
  const t=read('子页面与操作细化.md'),a=read('核查记录.md');
  for(const s of ['columnSpilt','firstLineSkip=2','dis_dc_date','startLine','headLine','rowSelection','keyFlag','dmlFilterType','0、1、3、5','4、6、8','MB/S','不将taskType=7'])assert.ok(t.includes(s),s);
  for(const s of ['原地修改','重复文件','权限弹窗','分页','去重','检查点'])assert.ok(a.includes(s),s);
});
test('task monitoring is log-scoped, details paginate independently and exception handling respects read scope',()=>{
  const t=read('子页面与操作细化.md');for(const s of ['logId','callbackId','任务ID','执行实例','1表离线、4库离线、8API、9文件解析','/disDataTaskLogDetail/page','/disapicollectionlogdetail/page','清空日期'])assert.ok(t.includes(s),s);
  const p=spec.PROFILES.monitorDetail;assert.ok(p.fields.every(f=>!f[0].includes('maxConcurrent')));
  const b=spec.renderFeature(spec.SUB.find(e=>e.kind==='alarm'));assert.ok(b.includes('不适用人工新增'));assert.ok(!b.includes('提交前校验主表单'));
});
test('17 measurable NFR targets are independent from functional IDs and do not claim runtime passage',()=>{
  const t=read('需求说明.md'),rows=[...t.matchAll(/^\| (DIS-NFR-\d{3}) \|.*$/gm)];assert.equal(rows.length,17);
  for(const r of rows){const c=r[0].split('|').slice(1,-1);assert.equal(c.length,6);assert.ok(c.every(s=>s.trim()));}
  for(const s of ['ceil(p×N)','P95≤3秒','P95≤5秒','1000条任务','100条表映射','10万行','检查点','RPO','320 CSS像素','100次'])assert.ok(t.includes(s),s);
  assert.ok(read('核查记录.md').includes('新增开发目标'));assert.ok(read('核查记录.md').includes('不是实测'));
  const home=spec.renderFeature(spec.MAIN.find(e=>e.kind==='home')).split('#### 9.')[1];assert.doesNotMatch(home,/DIS-NFR-004|DIS-NFR-008|DIS-NFR-009/);assert.match(home,/DIS-NFR-013/);
});
test('generation refuses acceptance/source loss and is idempotent through the existing refresh entrypoint',()=>{
  const {augmentFile}=require('../scripts/augment-requirement-specs');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dis-regression-')),args=process.argv.slice();
  try{process.argv.push('--refresh');for(const [file,render]of [['需求说明.md',spec.renderMain],['子页面与操作细化.md',spec.renderSub]]){
    const t=read(file),row=t.match(/^\| DIS-AC-\d{3} \|.*$/m)[0];assert.equal(render(t),t);
    assert.throws(()=>render(t.replace(row,'')),/published acceptance/);assert.throws(()=>render(t.replace(row,row+'\n'+row)),/published acceptance/);
    const p=path.join(temp,file);fs.writeFileSync(p,t);assert.equal(augmentFile(p).changed,false);
  }
  const t=read('需求说明.md'),row=t.split('\n## 8.')[1].match(/^\| DIS-100 \|.*$/m)[0];assert.throws(()=>spec.renderMain(t.replace(row,'')),/published source/);
  }finally{process.argv.splice(0,process.argv.length,...args);fs.rmSync(temp,{recursive:true,force:true});}
});
test('static evidence hashes and timestamps are real and old screenshots remain immutable',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(dir,'../evidence/dis-review-20261027/index.json'),'utf8'));
  assert.equal(d.sources.length,58);assert.equal(d.publicStaticGets,81);assert.equal(d.applicationWrites,0);assert.equal(d.applicationAcceptanceExecuted,false);assert.equal(d.browserObservation.finalRoute,'/module-login/login');
  for(const s of d.sources){assert.match(s.resourcePath,/^\//);assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.ok(Date.parse(s.fetchedAt));for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.equal(e.sha256,sha(e.text));assert.doesNotMatch(e.text,/https?:\/\//);}}
  assert.equal(sha(fs.readFileSync(path.join(dir,'调研记录.md'))),published.researchSha256);
});
test('audit retains explicit evidence gaps and no new AI execution promise',()=>{
  const a=read('核查记录.md');for(const s of ['## 核查结论','## 现有实现与目标规格差异','## 非功能目标来源','## 外部依赖','## 验证状态','323条功能验收','17项非功能','未执行','登录','负责人','Network'])assert.ok(a.includes(s),s);
  const t=read('子页面与操作细化.md');assert.ok(t.includes('人工采纳只改变当前草稿'));assert.ok(t.includes('不得自动保存、运行、补数、生成调度流程'));
});

test('evidence extractor reads text without evaluation and rejects missing, altered or unsafe sources',()=>{
  const extractor=require('../scripts/prepare-dis-evidence'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'dis-evidence-'));
  try{
    const sources=Object.values(extractor.GROUPS).map(prefix=>[prefix+'fixture.js','data:function(){return {name:"fixture"}}']);
    sources.push(['api-fixture.js','literal API wrapper']);
    sources.push(['app.fixture.js','bcab:function'+('x'.repeat(930))+['/taskManagement/dataAcquisition/edit','/taskManagement/kafkaAcquisition/edit','/taskMonitoring/taskMonitoring/list','/home'].map(r=>'path:"'+r+'",component:fixture,').join('')+['home','taskManagement','taskMonitoring','integratedAnalysis'].map(k=>k+':{title:"样本"},').join('')]);
    const receipts=sources.map(([name,raw])=>{fs.writeFileSync(path.join(temp,name),raw);return {localName:name,path:'/dis/js/'+name,bytes:Buffer.byteLength(raw),sha256:sha(raw),fetchedAt:'2026-10-27T00:00:00Z'};});
    const save=()=>fs.writeFileSync(path.join(temp,'receipt.json'),JSON.stringify(receipts));save();
    const result=extractor.collect(temp);assert.equal(result.sources.length,Object.keys(extractor.GROUPS).length+2);assert.equal(result.applicationWrites,0);
    assert.equal(extractor.verifyEvidence(result,temp).errors,0);
    const forged=structuredClone(result);forged.sources[0].id='DIS-SRC-FORGED';assert.throws(()=>extractor.verifyEvidence(forged,temp),/source registry/);
    forged.sources[0]=structuredClone(result.sources[0]);forged.sources[0].excerpts[0].text='invented';assert.throws(()=>extractor.verifyEvidence(forged,temp),/excerpt registry/);
    assert.throws(()=>extractor.verifyEvidence({...result,sources:result.sources.slice(1)},temp),/source registry/);
    const first=path.join(temp,sources[0][0]);fs.appendFileSync(first,'altered');assert.throws(()=>extractor.collect(temp),/receipt mismatch/);fs.writeFileSync(first,sources[0][1]);
    receipts[0].fetchedAt='not-a-time';save();assert.throws(()=>extractor.collect(temp),/invalid receipt time/);receipts[0].fetchedAt='2026-10-27T00:00:00Z';save();
    receipts[0].path='https://example.invalid/dis.js';save();assert.throws(()=>extractor.collect(temp),/relative resource/);receipts[0].path='/dis/js/'+receipts[0].localName;save();
    fs.writeFileSync(first,'no required anchors');assert.throws(()=>extractor.select(temp),/no selected evidence/);fs.rmSync(first);assert.throws(()=>extractor.select(temp),/source missing/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
