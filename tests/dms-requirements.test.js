const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const folder=path.join(root,'doc/requirements/10-规范化数据建模');
const read=name=>fs.readFileSync(path.join(folder,name),'utf8');
const files=['需求说明.md','子页面与操作细化.md'];

test('DMS replaces research templates with nine field-complete specifications and preserves 72 acceptance IDs',()=>{
  const all=files.map(read).join('\n');
  assert.doesNotMatch(all,/【|】|待确认|未观察到|https?:\/\//);
  const expected=['100','001','506','507','508','509','510','511','512'].map(n=>'DMS-'+n);
  assert.deepEqual([...all.matchAll(/^### (DMS-\d{3})\b/gm)].map(m=>m[1]),expected);
  const cases=[...all.matchAll(/^\| (DMS-AC-\d{3}) \|.*$/gm)];
  assert.equal(cases.length,72);assert.equal(new Set(cases.map(m=>m[1])).size,72);
  const registry=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/采样清单.json'),'utf8'));
  const module=registry.modules.find(m=>m.code==='DMS');
  assert.equal(module.developmentReview.productionReady,false);assert.equal(module.developmentReview.functionalAcceptanceCases,72);
  assert.equal(module.developmentReview.nonfunctionalRequirements,15);
  assert.deepEqual(module.businessRequirements.map(r=>r.id),expected.slice(0,2));
  assert.deepEqual(registry.deepDive.find(m=>m.code==='DMS').requirements.map(r=>r.id),expected.slice(2));
  for(const row of cases)assert.equal(row[0].split('|').at(-2).trim(),'未执行');
  for(const id of expected){
    const block=all.split('### '+id+' ')[1].split(/^### |^## /m)[0];
    for(const [i,h]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(block.includes(`#### ${i+1}. ${h}（${id}）`),id+' '+h);
    const fields=block.split('#### 1. 页面字段清单')[1].split('#### 2. 页面交互规则')[0].split('\n').filter(x=>x.startsWith('|')&&!x.startsWith('|---')&&!x.includes('字段名称与绑定名'));
    assert.ok(fields.length>=3,id);for(const row of fields){const cells=row.split('|').slice(1,-1);assert.equal(cells.length,8);assert.ok(cells[0].trim(),id+' unnamed field');}
    assert.ok(block.includes('.png'));assert.ok(block.includes('/back/dms/model/'));
  }
});

test('DMS records actual source versus target corrections for suffix validation, stale deletion, unknown task result and chart lifecycle',()=>{
  const audit=read('核查记录.md'),sub=read('子页面与操作细化.md');
  for(const key of ['dmsModelColConfigDos1','后置字段','deleteColumnList','isInstanceEnd','resize','未执行','外部依赖','登录页'])assert.ok(audit.includes(key),key);
  for(const key of ['staEndFlag','colSeq','deleteFlag','tabNameSegNum','curTabSuffixAbbr','allTabPrefixAbbr','nullable','keyFlag','colPrecision'])assert.ok(sub.includes(key),key);
  assert.match(sub,/2、3、4、5/);assert.match(sub,/普通模型.*数仓模型.*指标模型/);
  assert.match(sub,/char/);assert.match(sub,/number.*decimal.*numeric/);
});

test('DMS has quality requirements with explicit measurement conditions and unexecuted status',()=>{
  const main=read('需求说明.md');const rows=[...main.matchAll(/^\| DMS-NFR-\d{3} \|.*$/gm)];
  assert.equal(rows.length,15);assert.equal(new Set(rows.map(m=>m[0].split('|')[1])).size,15);
  for(const row of rows){assert.equal(row[0].split('|').slice(1,-1).length,6);assert.equal(row[0].split('|').at(-2).trim(),'未执行');}
  for(const key of ['P95','ceil','10000','200%','结果未知','物理','审计','未执行'])assert.ok(main.includes(key),key);
  const audit=read('核查记录.md');assert.match(audit,/新增.*目标/);assert.match(audit,/尚无实测/);
});

test('DMS refresh is byte-identical and generator rejects lost acceptance or source rows',()=>{
  const spec=require('../scripts/dms-requirement-spec');const {augmentFile}=require('../scripts/augment-requirement-specs');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dms-spec-'));
  try{for(const [i,file]of files.entries()){
    const original=read(file);assert.equal(spec.renderDocument(i?'sub':'main',original),original);
    const copy=path.join(temp,file);fs.writeFileSync(copy,original);augmentFile(copy,new Map());assert.equal(fs.readFileSync(copy,'utf8'),original);
    assert.throws(()=>spec.renderDocument(i?'sub':'main',original.replace(/^\| DMS-AC-\d{3} \|.*\n/m,'')),/acceptance/);
    assert.throws(()=>spec.renderDocument(i?'sub':'main',original.replace('<!-- 业务规格格式:plain-v1 -->','')),/format/);
    assert.throws(()=>spec.renderDocument(i?'sub':'main',original.replace(/^### DMS-\d{3}.*\n/m,'')),/requirement IDs/);
    if(!i)assert.throws(()=>spec.renderDocument('main',original.replace(/^\| DMS-100 \|.*\n/m,'')),/source rows/);
  }}finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('DMS static evidence verifies source identities and exact slices without evaluating bundles',()=>{
  const collector=require('../scripts/prepare-dms-evidence');
  const data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/dms-review-20261027/index.json'),'utf8'));
  assert.equal(data.applicationAcceptanceExecuted,false);assert.equal(data.publicStaticGets,55);
  assert.ok(data.sources.length>=20);for(const s of data.sources){assert.ok(s.resourcePath.startsWith('/'));for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.doesNotMatch(e.text,/https?:\/\//);}}
  assert.throws(()=>collector.verifyAll({sources:[{id:'bad',sourceGroup:'other'}]},'.','.'),/source group/);
  assert.throws(()=>collector.verifyAll({sources:[{id:'same'},{id:'same'}]},'.','.'),/duplicate/);
});

test('DMS collector rejects altered raw files, excerpt offsets, hashes and swapped source groups',()=>{
  const collector=require('../scripts/prepare-dms-evidence'),crypto=require('node:crypto');
  const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dms-evidence-'));
  const own=path.join(tmp,'own'),shared=path.join(tmp,'shared');fs.mkdirSync(own);fs.mkdirSync(shared);
  const raw='prefix 后置字段 suffix';
  const source={id:'fixture',localName:'raw.js',bytes:Buffer.byteLength(raw),sha256:hash(raw),excerpts:[{start:7,end:11,text:'后置字段',sha256:hash('后置字段')}]};
  try{
    fs.writeFileSync(path.join(own,'raw.js'),raw);fs.writeFileSync(path.join(shared,'raw.js'),'different raw');
    assert.deepEqual(collector.verifyAll({sources:[source]},own,shared),{sources:1,excerpts:1,errors:0});
    for(const change of [s=>s.excerpts[0].start++,s=>s.excerpts[0].sha256='0'.repeat(64),s=>s.sourceGroup='shared']){
      const changed=structuredClone(source);change(changed);assert.throws(()=>collector.verifyAll({sources:[changed]},own,shared),/mismatch/);
    }
    fs.appendFileSync(path.join(own,'raw.js'),'tampered');
    assert.throws(()=>collector.verifyAll({sources:[source]},own,shared),/resource mismatch/);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('DMS reviewed rules trace to captured implementation fragments rather than generated text alone',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/dms-review-20261027/index.json'),'utf8'));
  const source=id=>data.sources.find(s=>s.id==='DMS-SRC-'+id).excerpts.map(e=>e.text).join('\n');
  const property=source('PROPERTY');
  assert.ok((property.match(/validataCols\(this\.dmsModelColConfigDos1/g)||[]).length>=2);
  assert.match(property,/deleteColumnList/);assert.match(property,/colSeq/);
  assert.match(source('PHYSICS'),/label:"1".*fullCoverage/);assert.match(source('PHYSICS'),/label:"2".*incrementalUpdate/);
  assert.match(source('IMPORT'),/createTabType:"1"/);assert.match(source('IMPORT'),/label:"2".*newCreation/);
  assert.match(source('MODEL-API'),/deleteByModelId/);assert.match(source('MTRL-API'),/isInstanceEnd/);
});
