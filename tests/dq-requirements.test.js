const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const folder=path.join(root,'doc/requirements/13-数据查询系统');
const read=name=>fs.readFileSync(path.join(folder,name),'utf8');
test('DQ specifications preserve identities and use complete business rules',()=>{
  const all=['需求说明.md','子页面与操作细化.md'].map(read).join('\n');
  assert.doesNotMatch(all,/【|】|待确认|未观察到|https?:\/\//);
  assert.deepEqual([...all.matchAll(/^### (DQ-\d{3}) /gm)].map(m=>m[1]),['DQ-100','DQ-001','DQ-500','DQ-501','DQ-502']);
  for(const id of ['DQ-100','DQ-001','DQ-500','DQ-501','DQ-502']){
    const block=all.split('### '+id+' ')[1].split(/^### |^## /m)[0];
    for(const [i,name]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(block.includes('#### '+(i+1)+'. '+name+'（'+id+'）'),id+' '+name);
    assert.doesNotMatch(block,/^\|\s*\|/m);assert.ok(block.includes('.png'));
  }
  const registry=require('../scripts/dq-published-registry.json');
  const ids=[...all.matchAll(/^\| (DQ-AC-\d{3}) \|/gm)].map(m=>m[1]);
  assert.deepEqual([...ids].sort(),[...registry.acceptance].sort());
  assert.equal(new Set(ids).size,ids.length);
  for(const type of ['main','sub'])for(const [id,requirement]of Object.entries(registry[type].associations)){
    const row=all.split('\n').find(l=>l.startsWith('| '+id+' |'));
    assert.equal(row.split('|').at(-3).trim(),requirement,id+' association');
  }
  for(const row of all.split('\n').filter(l=>/^\| DQ-AC-/.test(l)))assert.equal(row.split('|').at(-2).trim(),'未执行');
  const ac=id=>all.split('\n').find(l=>l.startsWith('| '+id+' |'));
  assert.match(ac('DQ-AC-004'),/条件A.*B.*页码/);
  assert.match(ac('DQ-AC-006'),/total.*costSec/);
  assert.match(ac('DQ-AC-504'),/queryId.*不自动重放SQL/);
  assert.match(ac('DQ-AC-506'),/日志.*五列/);
  assert.match(ac('DQ-AC-507'),/日志及用户候选/);
});
test('DQ defines actual SQL lifecycle, history, log export and target corrections',()=>{
  const all=read('子页面与操作细化.md')+read('核查记录.md');
  for(const key of ['dataSourceId','sqlContent','myQueryId','logId','headerCn','costSec','tagKeyword','beginCreateTime','userIds','obsName','obscureName','rawData','HTTP 202','clearMyLastLog','5000','五秒','结果未知','共享数组','queryId','近30次','只读','导出'])assert.ok(all.includes(key),key);
  assert.match(all,/保存SQL脚本.*本地/);assert.match(all,/日志.*人工新增/);
});
test('DQ quality requirements have measurement and honest acceptance status',()=>{
  const main=read('需求说明.md'),audit=read('核查记录.md');
  const rows=main.split('\n').filter(l=>/^\| DQ-NFR-\d{3} \|/.test(l));
  assert.equal(rows.length,15);for(const row of rows){assert.equal(row.split('|').slice(1,-1).length,6);assert.equal(row.split('|').at(-2).trim(),'未执行');}
  for(const key of ['P95','ceil','200%','10000','行列权限','截断','尚无实测','新增'])assert.ok((main+audit).includes(key),key);
});
test('DQ source and rendered documents rebuild deterministically and reject lost evidence',()=>{
  const spec=require('../scripts/dq-requirement-spec');
  const {augmentFile}=require('../scripts/augment-requirement-specs');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dq-doc-test-'));
  try{for(const [type,name]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){
    const original=read(name);assert.equal(spec.renderDocument(type,original),original);
    const file=path.join(tmp,name);fs.writeFileSync(file,original);augmentFile(file,new Map());assert.equal(fs.readFileSync(file,'utf8'),original);
    assert.throws(()=>spec.renderDocument(type,original.replace(/^\| DQ-AC-\d{3} \|.*\n/m,'')),/acceptance/);
    const rows=original.match(/^\| DQ-AC-\d{3} \|.*$/gm);
    assert.throws(()=>spec.renderDocument(type,original.replace(rows[0],'__SWAP__').replace(rows[1],rows[0]).replace('__SWAP__',rows[1])),/reordered/);
    assert.throws(()=>spec.renderDocument(type,original.replace('<!-- 业务规格格式:plain-v1 -->','')),/format/);
    assert.throws(()=>spec.renderDocument(type,original.replace(/^### DQ-\d{3}.*\n/m,'')),/requirement/);
    if(type==='main')assert.throws(()=>spec.renderDocument(type,original.replace(require('../scripts/dq-published-registry.json').main.sourceRows[0],'')),/source rows/);
  }}finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('DQ offline evidence verification rejects changed content, duplicate identities and invalid groups',()=>{
  const crypto=require('node:crypto');
  const {verifyAll}=require('../scripts/prepare-dq-evidence');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dq-evidence-test-'));
  const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
  try{
    const own=path.join(tmp,'own'),shared=path.join(tmp,'shared');fs.mkdirSync(own);fs.mkdirSync(shared);
    const raw='literal source';fs.writeFileSync(path.join(own,'a.js'),raw);
    const s={id:'A',localName:'a.js',bytes:Buffer.byteLength(raw),sha256:hash(raw),excerpts:[{start:0,end:7,text:'literal',sha256:hash('literal')}]};
    assert.deepEqual(verifyAll({sources:[s]},own,shared),{sources:1,excerpts:1,errors:0});
    assert.throws(()=>verifyAll({sources:[s,s]},own,shared),/duplicate/);
    assert.throws(()=>verifyAll({sources:[{...s,sourceGroup:'unknown'}]},own,shared),/invalid source group/);
    assert.throws(()=>verifyAll({sources:[{...s,sourceGroup:'shared'}]},own,shared),/ENOENT/);
    assert.throws(()=>verifyAll({sources:[{...s,excerpts:[{...s.excerpts[0],text:'changed'}]}]},own,shared),/excerpt mismatch/);
    fs.writeFileSync(path.join(own,'a.js'),'tampered');
    assert.throws(()=>verifyAll({sources:[s]},own,shared),/resource mismatch/);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('DQ evidence slices match hashes, relative paths, and unexecuted application status',()=>{
  const crypto=require('node:crypto');
  const data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/dq-review-20261027/index.json'),'utf8'));
  assert.equal(data.applicationAcceptanceExecuted,false);assert.equal(data.businessRequestsByCollector,0);
  assert.ok(data.sources.length>=10);
  for(const s of data.sources){assert.ok(s.resourcePath.startsWith('/'));for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.equal(crypto.createHash('sha256').update(e.text).digest('hex'),e.sha256);assert.doesNotMatch(e.text,/https?:\/\//);}}
});
