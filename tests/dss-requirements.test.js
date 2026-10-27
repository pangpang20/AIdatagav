const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'doc/requirements/11-数据标准管理');
const files=['需求说明.md','子页面与操作细化.md'];
const read=name=>fs.readFileSync(path.join(folder,name),'utf8');
const catalog=require('../scripts/dss-requirement-catalog.json');
const spec=require('../scripts/dss-requirement-spec');
const evidence=require('../doc/requirements/evidence/dss-review-20261027/index.json');
const source=id=>evidence.sources.find(s=>s.id==='DSS-SRC-'+id).excerpts.map(e=>e.text).join('\n');

test('DSS preserves 31 published features and 312 ordered cases with nine concrete sections',()=>{
  const all=files.map(read).join('\n');
  assert.doesNotMatch(all,/【|】|待确认|未观察到|https?:\/\//);
  const cases=[...all.matchAll(/^\| (DSS-AC-\d{3}) \|.*$/gm)];
  assert.equal(cases.length,312);assert.equal(new Set(cases.map(m=>m[1])).size,312);
  assert.deepEqual(cases.map(m=>m[1]),[...catalog.mainCases,...catalog.subCases]);
  for(const row of cases)assert.equal(row[0].split('|').at(-2).trim(),'未执行');
  assert.deepEqual([...all.matchAll(/^### (DSS-\d{3})\b/gm)].map(m=>m[1]),[...spec.MAIN,...spec.SUB].map(e=>e.id));
  for(const entry of [...spec.MAIN,...spec.SUB]){
    const text=spec.MAIN.includes(entry)?read(files[0]):read(files[1]);
    const block=text.split('### '+entry.id+' ')[1].split(/^### |^## /m)[0];
    for(const [i,label]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(block.includes(`#### ${i+1}. ${label}（${entry.id}）`));
    const fields=block.split('#### 1. 页面字段清单')[1].split('#### 2. 页面交互规则')[0].split('\n').filter(r=>r.startsWith('|')&&!r.startsWith('|---')&&!r.includes('字段名称与绑定名'));
    assert.ok(fields.length>=4,entry.id);
    for(const row of fields){const cells=row.split('|').slice(1,-1);assert.equal(cells.length,8);assert.ok(cells[0].trim());}
    for(const ref of entry.sources)assert.ok(block.includes('../evidence/'+ref),entry.id+' '+ref);
    assert.ok(block.includes('/back/dss/ms/'));
  }
});

test('DSS registry preserves original IDs and records bounded review rather than production readiness',()=>{
  const registry=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/采样清单.json'),'utf8'));
  const module=registry.modules.find(m=>m.code==='DSS');
  assert.deepEqual(module.businessRequirements.map(e=>e.id),spec.MAIN.map(e=>e.id));
  assert.deepEqual(registry.deepDive.find(m=>m.code==='DSS').requirements.map(e=>e.id),spec.SUB.map(e=>e.id));
  assert.equal(module.developmentReview.functionalAcceptanceCases,312);
  assert.equal(module.developmentReview.nonfunctionalRequirements,14);
  assert.equal(module.developmentReview.productionReady,false);
  assert.equal(module.researchSha256,require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(folder,'调研记录.md'))).digest('hex'));
});

test('DSS separates category, record, file, approval and selector contracts against original source',()=>{
  const all=files.map(read).join('\n'),audit=read('核查记录.md');
  assert.match(source('TABLE-API'),/\/dataset/);assert.match(source('TABLE-API'),/\/standardtable/);
  assert.match(spec.renderFeature(spec.SUB.find(e=>e.id==='DSS-511')),/\/back\/dss\/ms\/dataset/);
  assert.doesNotMatch(spec.PROFILES.datasetAdd.requests.map(r=>r[2]).join(' '),/standardtable/);
  for(const kind of ['nodeField','nodeCode'])assert.equal(spec.PROFILES[kind].requests[1][2],'/back/dss/ms/standardclassify');
  assert.match(source('DOC-SELECT'),/approveStatus:2,standardName/);
  assert.match(source('LINK-SELECT'),/dssStatus:2,codeNoOrName/);
  assert.match(all,/approveStatus:2,standardName/);assert.match(all,/codeNoOrName/);
  assert.match(source('AUDIT-DOC-1'),/prop:"str2"/);assert.match(source('AUDIT-DOC-1'),/prop:"remark"/);
  for(const kind of ['auditDoc','auditTable','auditField','auditCode']){
    const fields=spec.PROFILES[kind].fields.map(r=>r[0]).join(' ');
    assert.match(fields,/str1/);assert.match(fields,/str2/);assert.match(fields,/remark/);
    assert.doesNotMatch(fields,/对象名称:name|对象编码:code|原因说明:reason/);
  }
  assert.match(source('FIELD-LIST'),/row.dssVersion/);assert.match(all,/版本 dssVersion|版本:dssVersion|版本 dssVersion/);
  assert.match(audit,/standardtable\/ref.*空格/);
});

test('DSS tracks real clear-reference, unbounded validators and cross-page deletion gaps as target corrections',()=>{
  const audit=read('核查记录.md'),all=files.map(read).join('\n');
  assert.match(source('TERM-FORM'),/handleClearDoc:function\(\)\{this.docId="",this.audaqueFormInfoMixin.terminologySrc=""\}/);
  assert.match(source('TABLE-FORM'),/handleClearDoc:function\(\)\{this.docName=""/);
  assert.match(source('CODE-FORM'),/pageNo--/);assert.match(source('CODE-FORM'),/itemList.splice/);
  for(const key of ['handleClearDoc','globalIndex','total=0','比较符4','URL编码','3000ms','auditInfo','falsy','!response.code'])assert.ok(audit.includes(key),key);
  for(const key of ['先算globalIndex','同步清理','精度≥0','itemList','结果未知'])assert.ok(all.includes(key),key);
  assert.match(source('APPROVE'),/sent\|\|/);assert.match(source('AUDIT-ITEM'),/maxlength:"255"/);
});

test('DSS quality matrix has measurable module-specific targets and no claimed application result',()=>{
  const main=read(files[0]),audit=read('核查记录.md');
  const rows=[...main.matchAll(/^\| DSS-NFR-\d{3} \|.*$/gm)];
  assert.equal(rows.length,14);assert.equal(new Set(rows.map(m=>m[0].split('|')[1])).size,14);
  for(const row of rows){assert.equal(row[0].split('|').slice(1,-1).length,6);assert.equal(row[0].split('|').at(-2).trim(),'未执行');}
  for(const text of ['30并发','100000','ceil','P99','20Mbit/s','RTT50ms','500合法请求','200%','1%','100轮'])assert.ok(main.includes(text),text);
  for(const text of ['尚无实测','本次新增目标','外部依赖','登录控件','未执行','版本化OpenAPI'])assert.ok(audit.includes(text),text);
  assert.equal(evidence.applicationAcceptanceExecuted,false);assert.equal(evidence.businessRequestsByCollector,0);
});

test('DSS refresh is byte-identical and refuses lost IDs, evidence, quality rows or fabricated passes',()=>{
  const {augmentFile}=require('../scripts/augment-requirement-specs');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dss-spec-'));
  try{for(const [index,name]of files.entries()){
    const type=index?'sub':'main',original=read(name);
    assert.equal(spec.renderDocument(type,original),original);
    const file=path.join(tmp,name);fs.writeFileSync(file,original);augmentFile(file,new Map());assert.equal(fs.readFileSync(file,'utf8'),original);
    for(const [changed,reason]of [
      [original.replace(/^\| DSS-AC-\d{3} \|.*\n/m,''),/acceptance/],
      [original.replace(/^### DSS-\d{3}.*\n/m,''),/requirement IDs/],
      [original.replace('<!-- 业务规格格式:plain-v1 -->',''),/format/],
      [original.replace(/^\| DSS-AC-\d{3} \|.*$/m,r=>r.replace('未执行','通过')),/status/],
    ])assert.throws(()=>spec.renderDocument(type,changed),reason);
    const first=type==='main'?spec.MAIN[0]:spec.SUB[0];
    // Remove every occurrence, so both embedded image and source link are lost.
    const ref='../evidence/'+first.sources[0];
    assert.throws(()=>spec.renderDocument(type,original.replaceAll(ref,'missing-evidence')),/source rows/);
    if(!index)assert.throws(()=>spec.renderDocument(type,original.replace(/^\| DSS-NFR-001 \|.*\n/m,'')),/quality IDs/);
  }}finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('DSS evidence keeps acquisition provenance, source identities and literal slices',()=>{
  const collector=require('../scripts/prepare-dss-evidence');
  assert.equal(evidence.publicStaticGets,88);assert.equal(evidence.sources.length,44);
  assert.equal(evidence.sources.reduce((n,s)=>n+s.excerpts.length,0),54);
  assert.equal(new Set(evidence.sources.map(s=>s.id)).size,evidence.sources.length);
  for(const s of evidence.sources){assert.ok(s.resourcePath.startsWith('/'));assert.match(s.fetchedAt,/2026-10-2[67]T/);for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.doesNotMatch(e.text,/https?:\/\//);}}
  assert.throws(()=>collector.verifyAll({sources:[{id:'bad',sourceGroup:'other'}]},'.','.'),/source group/);
  assert.throws(()=>collector.verifyAll({sources:[{id:'same'},{id:'same'}]},'.','.'),/duplicate/);
});

test('DSS evidence validation rejects tampered raw, offsets, hashes and swapped groups',()=>{
  const {verifyAll}=require('../scripts/prepare-dss-evidence'),crypto=require('node:crypto');
  const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dss-evidence-')),own=path.join(tmp,'own'),shared=path.join(tmp,'shared');
  fs.mkdirSync(own);fs.mkdirSync(shared);const raw='prefix 标准字段 suffix';
  const s={id:'fixture',localName:'raw.js',bytes:Buffer.byteLength(raw),sha256:hash(raw),excerpts:[{start:7,end:11,text:'标准字段',sha256:hash('标准字段')}]};
  try{
    fs.writeFileSync(path.join(own,'raw.js'),raw);fs.writeFileSync(path.join(shared,'raw.js'),'wrong group');
    assert.deepEqual(verifyAll({sources:[s]},own,shared),{sources:1,excerpts:1,errors:0});
    for(const mutate of [x=>x.excerpts[0].start++,x=>x.excerpts[0].sha256='0'.repeat(64),x=>x.sourceGroup='shared']){
      const bad=structuredClone(s);mutate(bad);assert.throws(()=>verifyAll({sources:[bad]},own,shared),/mismatch/);
    }
    fs.appendFileSync(path.join(own,'raw.js'),' altered');assert.throws(()=>verifyAll({sources:[s]},own,shared),/resource mismatch/);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
