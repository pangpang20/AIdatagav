const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const test = require('node:test');
const root = path.resolve(__dirname,'..');
const folder = path.join(root,'doc/requirements/03-业务需求管理系统');
const read = name => fs.readFileSync(path.join(folder,name),'utf8');
const spec = require('../scripts/drms-requirement-spec');
const {augmentFile}=require('../scripts/augment-requirement-specs');
const evidenceTool=require('../scripts/prepare-drms-evidence');
const {extractSources}=require('../scripts/prepare-workbench-evidence');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');

test('page-specific rules exclude irrelevant pagination, attachments and write controls',()=>{
  const find=kind=>spec.renderFeature(spec.MAIN.concat(spec.SUB).find(e=>e.kind===kind));
  const project=find('projectAdd');
  assert.doesNotMatch(project,/主对象保存取消不等同撤销已经完成的附件写入|无匹配数据/);
  assert.doesNotMatch(find('kanban'),/新条件回第一页|列表分页封装|空列表或空子表/);
  assert.doesNotMatch(find('taskProcessed'),/取消确认不发写请求/);
  assert.match(find('requirementList'),/标题“我的需求列表”/);
  assert.doesNotMatch(find('workflowProgress'),/(?<!\/portal)\/drmsTaskWorkflow\//);
});

test('DRMS evidence uses exact hashes, relative paths and honest execution metadata',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/drms-review-20261026/index.json'),'utf8'));
  assert.equal(data.sources.length,33);
  assert.equal(data.sources.reduce((n,s)=>n+s.excerpts.length,0),63);
  assert.equal(data.businessRequests,0);assert.equal(data.browserOperations,0);
  assert.equal(data.applicationAcceptanceExecuted,false);
  assert.equal(new Set(data.sources.map(s=>s.id)).size,data.sources.length);
  for(const source of data.sources){
    assert.match(source.resourcePath,/^\/(?!\/)/);assert.doesNotMatch(source.resourcePath,/https?:\/\//i);
    assert.match(source.sha256,/^[a-f0-9]{64}$/);assert.ok(source.bytes>0);
    assert.ok(Number.isFinite(Date.parse(source.fetchedAt)));
    for(const p of source.excerpts){assert.ok(p.text.startsWith(p.anchor));assert.equal(p.end-p.start,p.text.length);assert.equal(p.sha256,sha(p.text));assert.doesNotMatch(p.text,/https?:\/\//i);}
  }
});

test('field validation prompts and length limits trace to exact form excerpts',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/drms-review-20261026/index.json'),'utf8'));
  const raw=id=>data.sources.find(s=>s.id==='DRMS-SRC-'+id).excerpts.map(e=>e.text).join(' ');
  for(const [name,fields,limits] of [
    ['PROJECT-FORM',spec.FIELDS.projectForm,[50,500]],
    ['REQUIREMENT-FORM',spec.FIELDS.requirementForm.slice(0,4),[50,500]],
    ['COLUMN-FORM',spec.FIELDS.requirementForm.slice(6,14),[200,10,500]],
    ['TASK-FORM',spec.FIELDS.taskForm.slice(0,4),[50,500]],
    ['ADVISORY-FORM',spec.FIELDS.advisoryForm,[50,500]],
  ]){
    const source=raw(name);
    for(const field of fields)if(field[7])assert.ok(source.includes(field[7]),name+' prompt '+field[0]);
    for(const n of limits)assert.match(source,new RegExp('maxlength:(?:"'+n+'"|'+n+')(?=[,}])'),name+' maxlength '+n);
  }
  const assignee=spec.PROFILES.advisoryHandle.fields.find(f=>f[1]==='assigneeId');
  assert.ok(raw('ADVISORY-PENDING').includes(assignee[7]));
  assert.ok(raw('TASK-PENDING').includes(spec.FIELDS.workflow.find(f=>f[1]==='assigneeId')[7]));
});

test('DRMS offline verifier routes shared resources correctly and rejects tampering',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'drms-evidence-'));
  try{
    for(const group of ['own','shared']){
      const folder=path.join(dir,group);fs.mkdirSync(folder);
      const raw=group+' scene:{ok:true}',localName='fixture.js';
      fs.writeFileSync(path.join(folder,localName),raw);
      fs.writeFileSync(path.join(folder,'receipt.json'),JSON.stringify([{path:'/drms/static/js/fixture.js',localName,bytes:Buffer.byteLength(raw),sha256:sha(raw),fetchedAt:'2026-10-26T00:00:00Z'}]));
    }
    const ownDir=path.join(dir,'own'),sharedDir=path.join(dir,'shared');
    const selected=[['FIXTURE','fixture.js',[['scene:',15]]]];
    const own=extractSources(ownDir,'2026-10-26T01:00:00Z',selected);
    const shared=extractSources(sharedDir,'2026-10-26T01:00:00Z',selected).map(s=>({...s,sourceGroup:'shared'}));
    const data={sources:[...own,...shared]};
    assert.deepEqual(evidenceTool.verifyAll(data,ownDir,sharedDir),{sources:2,excerpts:2,errors:0});
    const forged=structuredClone(data);forged.sources[1].excerpts[0].text='scene:{bad:one}';forged.sources[1].excerpts[0].sha256=sha(forged.sources[1].excerpts[0].text);
    assert.throws(()=>evidenceTool.verifyAll(forged,ownDir,sharedDir),/excerpt mismatch/);
    assert.throws(()=>evidenceTool.verifyAll(data,sharedDir,ownDir),/resource mismatch/);
    fs.appendFileSync(path.join(sharedDir,'fixture.js'),'changed');
    assert.throws(()=>evidenceTool.verifyAll(data,ownDir,sharedDir),/resource mismatch/);
    assert.throws(()=>evidenceTool.select(ownDir),/ENOENT/);
    fs.writeFileSync(path.join(ownDir,evidenceTool.definitions[0][1]),'missing anchor');
    assert.throws(()=>evidenceTool.select(ownDir),/anchor not found/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('document regeneration refuses missing or reordered published acceptance and sources',()=>{
  for(const [name,render] of [['需求说明.md',spec.renderMain],['子页面与操作细化.md',spec.renderSub]]){
    const text=read(name),acRows=text.match(/^\| DRMS-AC-\d{3} \|.*$/gm),last=acRows.at(-1);
    assert.throws(()=>render(text.replace(last,'')),/published acceptance/);
    assert.throws(()=>render(text.replace(last,last+'\n'+last)),/published acceptance/);
  }
  const main=read('需求说明.md'),lastSource=main.match(/^\| DRMS-\d{3} \|.*$/gm).at(-1);
  assert.throws(()=>spec.renderMain(main.replace(lastSource,'')),/published source/);
  assert.throws(()=>spec.renderMain(''),/published acceptance/);
});

test('both DRMS specifications retain all published IDs, real fields and plain business format',()=>{
  for(const [file,entries] of [['需求说明.md',spec.MAIN],['子页面与操作细化.md',spec.SUB]]){
    const text=read(file);
    assert.ok(text.includes('<!-- 业务规格格式:plain-v1 -->'));
    assert.deepEqual([...text.matchAll(/^### (DRMS-\d{3})\b/gm)].map(m=>m[1]),entries.map(e=>e.id));
    const prose=text.replace(/!?\[[^\]]*\]\([^)]+\)/g,m=>m.split('](')[0]+']');
    assert.doesNotMatch(prose,/【|】|待确认|拟定需求|本轮|源码|未观察到|未取得/);
    for(const e of entries){
      const block=text.split('### '+e.id+' ')[1]?.split(/^### |^## /m)[0];
      assert.ok(block,e.id);
      const table=block.split('#### 1. 页面字段清单')[1].split('#### 2. 页面交互规则')[0];
      const fields=table.split(/\r?\n/).filter(l=>l.startsWith('|')).slice(2);
      assert.ok(fields.length>0,e.id+' fields');
      for(const row of fields){const cells=row.split('|').slice(1,-1);assert.equal(cells.length,8,e.id+' field width');assert.ok(cells[0].trim(),e.id+' empty field');}
      for(const name of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档'])assert.ok(block.includes(name),e.id+' '+name);
      assert.ok(block.includes('/back/'),e.id+' actual gateway path');
    }
  }
});

test('project, requirement, advisory and workflow contracts do not invent request fields or methods',()=>{
  const text=read('需求说明.md')+read('子页面与操作细化.md');
  for(const token of ['projectName','deptId','description','storyTitle','projectId','purpose','expectedEffect','colName','colDesc','colLength','colPrecision','nullable','primaryKey','storiesColumn','storiesSource','storiesAttachment','advisorsAttachment','filePath','fileKey','procTaskId','taskExplain','assigneeId','replyContent'])assert.ok(text.includes(token),token);
  for(const token of ['/back/drms/portal/drmsproject/myPage','/back/drms/portal/drmsstories/myPage','/back/drms/portal/drmsTaskWorkflow/todoPage','/back/drms/portal/drmsTaskWorkflow/donePage','/back/drms/portal/drmsadvisors/page','/back/common/user/deptuser/dept/{userId}'])assert.ok(text.includes(token),token);
  assert.match(text,/GET[^\n]*\/back\/drms\/portal\/drmsstoriescolumn\/downloadTemplate/);
  assert.match(text,/确认签收[^\n]*signIn/);
  assert.match(text,/form\.relevance为真/);
  assert.match(text,/createTimes[^\n]*beginCreateTime/);
  assert.ok(!spec.PROFILES.advisoryAdd.request.includes('deptId,applicant'));
});

test('draft, immediate file writes, clearing collections and screenshot conflicts are explicitly covered',()=>{
  const business=read('需求说明.md')+read('子页面与操作细化.md'),audit=read('核查记录.md');
  for(const token of ['立即上传','取消','本地解析','555px','小数型','日期型','0/1','taskRelation','columnRelation','sourceRelation'])assert.ok(business.includes(token),token);
  for(const token of ['P-DRMS-003','P-DRMS-008','reviewForm.review','reviewForm.type','<200','非空数组','fileDownload','原获取回执','浏览器操作0次'])assert.ok(audit.includes(token),token);
  for(const h of ['核查结论','外部依赖','验证状态'])assert.ok(audit.includes('## '+h));
});

test('twelve distinct quality requirements have scope, methods and unexecuted status',()=>{
  const text=read('需求说明.md');
  const rows=[...text.matchAll(/^\| (DRMS-NFR-\d{3}) \|.*$/gm)];
  assert.deepEqual(rows.map(m=>m[1]),spec.NFRS.map(e=>e[0]));
  for(const m of rows){const c=m[0].split('|').slice(1,-1).map(x=>x.trim());assert.equal(c.length,6);assert.ok(c.slice(0,5).every(Boolean));assert.equal(c.at(-1),'未执行');}
  for(const token of ['200MiB','P95≤3秒','10,000','50个并发读会话','320 CSS像素','200%','objectURL','幂等','审计'])assert.ok(text.includes(token),token);
});

test('refresh preserves the reviewed DRMS text, stable acceptance IDs and archive',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'drms-spec-'));
  const args=process.argv.slice();
  try{
    process.argv.push('--refresh');
    for(const name of ['需求说明.md','子页面与操作细化.md']){
      const original=read(name),file=path.join(dir,name);
      fs.writeFileSync(file,original);
      assert.equal(augmentFile(file).changed,false);
      assert.equal(fs.readFileSync(file,'utf8'),original);
      const ids=[...original.matchAll(/^\| (DRMS-AC-\d{3}) \|/gm)].map(m=>m[1]);
      assert.equal(ids.length,new Set(ids).size);
      assert.equal(ids.length,name==='需求说明.md'?116:104);
      for(const row of original.split(/\r?\n/).filter(l=>/^\| DRMS-AC-/.test(l)))assert.equal(row.split('|').at(-2).trim(),'未执行');
    }
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/采样清单.json'),'utf8'));
    const mod=manifest.modules.find(m=>m.code==='DRMS');
    assert.equal(mod.developmentReview.productionReady,false);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(folder,'调研记录.md'))).digest('hex'),mod.researchSha256);
  }finally{process.argv.splice(0,process.argv.length,...args);fs.rmSync(dir,{recursive:true,force:true});}
});
