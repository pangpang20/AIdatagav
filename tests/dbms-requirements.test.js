const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'doc/requirements/04-数据需求管理');
const spec=require('../scripts/dbms-requirement-spec');
const collector=require('../scripts/prepare-dbms-evidence');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');

test('DBMS distinguishes plan-scoped maintenance, immediate writes and actual status codes',()=>{
  const feature=kind=>spec.renderFeature(spec.MAIN.concat(spec.SUB).find(e=>e.kind===kind));
  const resource=feature('resource');
  for(const word of ['surveyPlanId','optType','dataItemList','万条','/back/dop/factory/surveyReportSysData/page'])assert.ok(resource.includes(word),word);
  assert.match(feature('collection'),/judgeCollect[^\n]*1[^\n]*3[^\n]*2/);
  assert.match(feature('track'),/0已完成[^\n]*1进行中/);
  assert.match(feature('documentForm'),/选择文件立即上传/);
  assert.match(feature('configView'),/即时DELETE/);
  assert.doesNotMatch(feature('overview'),/取消主对象|保存中|新条件回第一页/);
  assert.doesNotMatch(feature('configList'),/name,leader|调研目的/);
});

test('all 35 reviewed feature blocks have concrete fields, eight sections and stable acceptance',()=>{
  for(const [file,entries,total] of [['需求说明.md',spec.MAIN,129],['子页面与操作细化.md',spec.SUB,184]]){
    const text=read(file);
    assert.ok(text.includes('<!-- 业务规格格式:plain-v1 -->'));
    assert.ok(text.includes('<!-- dbms:generated-spec-v1 -->'));
    assert.deepEqual([...text.matchAll(/^### (DBMS-\d{3})\b/gm)].map(m=>m[1]),entries.map(e=>e.id));
    const prose=text.replace(/!?\[[^\]]*\]\([^)]+\)/g,m=>m.split('](')[0]+']');
    assert.doesNotMatch(prose,/【|】|待确认|拟定需求|本轮|源码|未观察到|未取得|https?:\/\//);
    for(const entry of entries){
      const block=text.split('### '+entry.id+' ')[1]?.split(/^### |^## /m)[0];assert.ok(block,entry.id);
      for(const part of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档'])assert.ok(block.includes(part),entry.id+' '+part);
      const table=block.split('#### 1. 页面字段清单')[1].split('#### 2. 页面交互规则')[0];
      const rows=table.split('\n').filter(l=>l.startsWith('|')).filter(l=>!l.startsWith('|---')&&!l.includes('字段名称与绑定名'));
      assert.ok(rows.length,entry.id);
      for(const row of rows){const cells=row.split('|').slice(1,-1);assert.equal(cells.length,8,entry.id+' width');assert.ok(cells[0].trim(),entry.id+' empty field');}
      assert.ok(block.includes('/back/'),entry.id+' gateway');
      for(const sid of entry.sources)assert.ok(block.includes(sid+'.png'),entry.id+' screenshot '+sid);
    }
    const ac=[...text.matchAll(/^\| (DBMS-AC-\d{3}) \|.*$/gm)];assert.equal(ac.length,total);
    assert.equal(new Set(ac.map(m=>m[1])).size,total);
    for(const row of ac)assert.equal(row[0].split('|').at(-2).trim(),'未执行');
  }
});

test('DBMS exact contracts, conditional rules and cancelled side effects are explicit',()=>{
  const txt=read('需求说明.md')+read('子页面与操作细化.md');
  for(const key of ['surveyTeamMemberList','memberId','surveyPlanTeamList','surveyTeamId','messageMainDo','messageSource','fileCategoryId','associatedComponentIdList','backupId','columnNameEn','applyConfigDoList','isPullFlag','dataCollect','collectChargeUserName','collectTime','explanation','optionalType','enName','businessDescription'])assert.ok(txt.includes(key),key);
  for(const p of ['/back/dop/space/common/upload','/back/dop/factory/tdatadictionary/addDataDictionary','/back/dop/factory/tapplyconfig/modifys','/back/dop/factory/surveyPlan/finish','/back/dop/factory/surveyPlan/reOpen/{id}','/back/common/oss/oss/downloadFileObject'])assert.ok(txt.includes(p),p);
  assert.match(txt,/手机号格式不正确/);
  assert.match(txt,/0～20字符/);
  assert.match(txt,/替换dataItemList/);
  assert.match(txt,/实际FormData[^\n]*file/);
  assert.match(txt,/HTTP[^\n]*202/);
  assert.match(txt,/取消[^\n]*不能撤销|取消[^\n]*不撤销|取消[^\n]*不因取消自动恢复/);
  assert.doesNotMatch(txt,/HTTP[^\n]*200[^\n]*code\s*===?\s*0/);
});

test('DBMS evidence is exact, relative and honest about runtime coverage',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/dbms-review-20261026/index.json'),'utf8'));
  assert.equal(data.sources.length,76);assert.equal(data.sources.reduce((n,s)=>n+s.excerpts.length,0),102);
  assert.equal(data.businessRequests,0);assert.equal(data.browserOperations,0);assert.equal(data.applicationAcceptanceExecuted,false);
  assert.equal(new Set(data.sources.map(s=>s.id)).size,data.sources.length);
  for(const source of data.sources){
    assert.match(source.resourcePath,/^\/(?!\/)/);assert.ok(source.bytes>0);assert.match(source.sha256,/^[a-f0-9]{64}$/);
    assert.ok(Number.isFinite(Date.parse(source.fetchedAt)));
    for(const p of source.excerpts){assert.ok(p.text.startsWith(p.anchor));assert.equal(p.end-p.start,p.text.length);assert.equal(p.sha256,sha(p.text));assert.doesNotMatch(p.text,/https?:\/\//i);}
  }
  const raw=id=>data.sources.find(s=>s.id==='DBMS-SRC-'+id).excerpts.map(e=>e.text).join(' ');
  for(const [id,keys] of [['OFFICE-FORM',['contactJob','contactPhone','500']],['PLAN-FORM',['surveyPlanTeamList','messageMainDo','surveyTeamId']],['DICTIONARY-FORM',['projectSysId','associatedComponentIdList']],['COLLECTION-FORM',['judgeCollect','collectDataSize','planningTime']],['CHART-COLLECTION',['flag:t.dateType','count:t.count/1e4']]])for(const key of keys)assert.ok(raw(id).includes(key),id+' '+key);
  assert.doesNotMatch(raw('OFFICE-FORM'),/leaderPhone:"\+?\d{6,}"/);
});

test('specific length limits, phone regex and validation messages trace to original excerpts',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/dbms-review-20261026/index.json'),'utf8'));
  const raw=id=>d.sources.find(s=>s.id==='DBMS-SRC-'+id).excerpts.map(p=>p.text).join(' ');
  for(const [id,limits] of [['OFFICE-FORM',[100,500]],['TEAM-FORM',[100,500]],['MILESTONE-FORM',[30,1000]],['PLAN-FORM',[100,200]],['SYSTEM-FORM',[100,150,500]],['RESOURCE-FORM',[100,50]],['DICTIONARY-FORM',[50]],['INTERFACE-FORM',[100,500]],['DATA-DEMAND-FORM',[100]],['BUSINESS-DEMAND-FORM',[100,50]],['COLLECTION-FORM',[30]]]){
    const values=[...raw(id).matchAll(/maxlength:(?:"(\d+)"|(\d+(?:e\d+)?))(?=[,}])/g)].map(m=>Number(m[1]||m[2]));
    for(const n of limits)assert.ok(values.includes(n),id+' limit '+n);
  }
  assert.ok(raw('OFFICE-FORM').includes('/^[\\d+]{0,20}$/'));
  const lang=raw('LANGUAGE');
  for(const kind of ['system','dictionary'])for(const field of spec.REPORTS[kind].fields)if(field[6])assert.ok(lang.includes(field[6]),kind+' '+field[6]);
  assert.ok(raw('DICTIONARY-FORM').includes('_l(e._options.SURVEY_REPORT_SYS_DATA_ITEM__DATA_TYPE'));
  assert.match(spec.REPORTS.dictionary.fields.find(f=>f[0].includes('columnType'))[5],/SURVEY_REPORT_SYS_DATA_ITEM__DATA_TYPE/);
  for(const [kind,id] of [['interface','INTERFACE-FORM'],['dataDemand','DATA-DEMAND-FORM'],['businessDemand','BUSINESS-DEMAND-FORM']]){
    const source=raw(id),i=source.lastIndexOf('_l(e.audaqueFormInfoMixin.applyConfigDoList');
    assert.ok(i>=0,id+' dynamic render');
    const render=source.slice(i).split(')],1)}))')[0];
    assert.match(render,/t\("el-input"/);assert.doesNotMatch(render,/t\("el-select"|type:"textarea"/);
    assert.equal(spec.REPORTS[kind].fields.find(f=>f[0].includes('applyConfigDoList[].fieldValue'))[1],'string / input');
  }
});

test('DBMS verifier rejects resource substitution and excerpt forgery across source groups',()=>{
  const {extractSources}=require('../scripts/prepare-workbench-evidence');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dbms-evidence-'));
  try{
    for(const group of ['own','shared']){const folder=path.join(temp,group);fs.mkdirSync(folder);const raw=group+' scene:{valid:true}';fs.writeFileSync(path.join(folder,'fixture.js'),raw);fs.writeFileSync(path.join(folder,'receipt.json'),JSON.stringify([{path:'/dop/static/js/fixture.js',localName:'fixture.js',bytes:Buffer.byteLength(raw),sha256:sha(raw),fetchedAt:'2026-10-26T00:00:00Z'}]));}
    const own=path.join(temp,'own'),shared=path.join(temp,'shared'),selection=[['FIXTURE','fixture.js',[['scene:',18]]]];
    const data={sources:[...extractSources(own,'2026-10-26T01:00:00Z',selection),...extractSources(shared,'2026-10-26T01:00:00Z',selection).map(s=>({...s,sourceGroup:'shared'}))]};
    assert.deepEqual(collector.verifyAll(data,own,shared),{sources:2,excerpts:2,errors:0});
    assert.throws(()=>collector.verifyAll(data,shared,own),/resource mismatch/);
    const forged=structuredClone(data);forged.sources[0].excerpts[0].text='scene:{false:true}';forged.sources[0].excerpts[0].sha256=sha(forged.sources[0].excerpts[0].text);
    assert.throws(()=>collector.verifyAll(forged,own,shared),/excerpt mismatch/);
    fs.appendFileSync(path.join(shared,'fixture.js'),'changed');assert.throws(()=>collector.verifyAll(data,own,shared),/resource mismatch/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('rendering refuses published ledger/source loss and refresh is idempotent',()=>{
  const {augmentFile}=require('../scripts/augment-requirement-specs');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dbms-spec-')),args=process.argv.slice();
  try{process.argv.push('--refresh');
    for(const [file,render] of [['需求说明.md',spec.renderMain],['子页面与操作细化.md',spec.renderSub]]){
      const txt=read(file),rows=txt.match(/^\| DBMS-AC-\d{3} \|.*$/gm),last=rows.at(-1);
      assert.throws(()=>render(txt.replace(last,'')),/published acceptance/);
      assert.throws(()=>render(txt.replace(last,last+'\n'+last)),/published acceptance/);
      const target=path.join(temp,file);fs.writeFileSync(target,txt);assert.equal(augmentFile(target).changed,false);assert.equal(fs.readFileSync(target,'utf8'),txt);
    }
    const main=read('需求说明.md'),sources=main.match(/^\| DBMS-\d{3} \|.*$/gm).slice(-12);assert.equal(sources.length,12);
    assert.throws(()=>spec.renderMain(main.replace(sources.at(-1),'')),/published source/);
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/采样清单.json'),'utf8')).modules.find(m=>m.code==='DBMS');
    assert.equal(manifest.developmentReview.productionReady,false);assert.equal(sha(fs.readFileSync(path.join(dir,'调研记录.md'))),manifest.researchSha256);
  }finally{process.argv.splice(0,process.argv.length,...args);fs.rmSync(temp,{recursive:true,force:true});}
});

test('quality targets and audit separate goals from unsupported backend claims',()=>{
  const text=read('需求说明.md'),audit=read('核查记录.md');
  const rows=[...text.matchAll(/^\| (DBMS-NFR-\d{3}) \|.*$/gm)];assert.equal(rows.length,14);assert.deepEqual(rows.map(m=>m[1]),spec.NFRS.map(e=>e[0]));
  for(const row of rows){const c=row[0].split('|').slice(1,-1).map(s=>s.trim());assert.equal(c.length,6);assert.ok(c.slice(0,5).every(Boolean));assert.equal(c.at(-1),'未执行');}
  for(const h of ['核查结论','外部依赖','验证状态'])assert.ok(audit.includes('## '+h));
  for(const key of ['86','0次','calendar','yyyyMMdd','202','H-DBMS-004-op1','leaderPhone','服务器','原获取'])assert.ok(audit.includes(key),key);
  for(const key of ['10000','P95≤3秒','320 CSS像素','200%','幂等','multipart','objectURL','AI'])assert.ok(text.includes(key),key);
});
