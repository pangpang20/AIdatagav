const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'doc/requirements/24-数据安全保护'),files=['需求说明.md','子页面与操作细化.md'];
const read=f=>fs.readFileSync(path.join(folder,f),'utf8'),published=require('../scripts/dsps-published-registry.json');
test('DSPS preserves 13 requirements and 104 acceptance IDs with concrete nine-section contracts',()=>{
 const spec=require('../scripts/dsps-requirement-spec');let count=0;
 for(const [i,file]of files.entries()){
  const text=read(file),base=published[i?'sub':'main'];
  assert.deepEqual([...text.matchAll(/^### (DSPS-\d{3})\b/gm)].map(m=>m[1]),base.entries.map(e=>e.id));
  const rows=[...text.matchAll(/^\| (DSPS-AC-\d{3}) \|.*$/gm)];count+=rows.length;
  assert.deepEqual(rows.map(m=>m[1]),base.acceptance.map(a=>a.id));
  for(const [row,id]of rows){assert.equal(row.split('|').at(-2).trim(),'未执行');assert.equal(row.split('|').at(-3).trim(),base.acceptance.find(a=>a.id===id).requirement);}
  for(const e of i?spec.SUB:spec.MAIN){const block=text.split('### '+e.id+' ')[1].split(/^### |^## /m)[0];
   for(const [j,h]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(block.includes('#### '+(j+1)+'. '+h+'（'+e.id+'）'),e.id+' '+h);
   const fields=block.split('#### 1.')[1].split('#### 2.')[0].split('\n').filter(s=>s.startsWith('|')&&!s.startsWith('|---')&&!s.includes('字段名称与绑定名'));
   assert.ok(fields.length>=3,e.id);for(const row of fields)assert.equal(row.split('|').slice(1,-1).length,8);
   for(const marker of ['**业务目的**：','**操作与规则**','**结果与异常处理**','**开发处理细则**'])assert.ok(block.includes(marker),e.id+' '+marker);
   assert.ok(block.includes('/back/dsps/portal/'));assert.ok(block.includes('.png'));assert.ok(block.includes('结果未知'));
  }
 }assert.equal(count,104);
});
test('DSPS renderer refuses missing IDs, association, evidence and frozen source rows',()=>{
 const spec=require('../scripts/dsps-requirement-spec');
 for(const [i,file]of files.entries()){
  const original=read(file),type=i?'sub':'main';assert.equal(spec.renderDocument(type,original),original);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^\| DSPS-AC-\d{3} \|.*\n/m,'')),/acceptance/);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^### DSPS-\d{3}.*\n/m,'')),/requirement IDs/);
  assert.throws(()=>spec.renderDocument(type,original.replace('<!-- 业务规格格式:plain-v1 -->','')),/format/);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^(\| DSPS-AC-\d{3} \|.*\| )DSPS-\d{3}( \| 未执行 \|)$/m,'$1DSPS-999$2')),/association/);
  if(!i)assert.throws(()=>spec.renderDocument(type,original.replace(published.main.sourceRows[0],'')),/source rows/);
  if(!i)assert.throws(()=>spec.renderDocument(type,original.replace(published.main.boundaries[0],'')),/boundaries/);
  if(i)assert.throws(()=>spec.renderDocument(type,original.replaceAll(published.sub.entries[0].sources[0],'missing.png')),/evidence/);
 }
});
test('DSPS NFRs and historical operation boundaries stay explicit and unexecuted',()=>{
 const text=read('需求说明.md'),rows=[...text.matchAll(/^\| (DSPS-NFR-\d{3}) \|.*$/gm)];assert.ok(rows.length>=15);assert.equal(rows.length,new Set(rows.map(m=>m[1])).size);
 for(const [row]of rows){assert.equal(row.split('|').slice(1,-1).length,6);assert.equal(row.split('|').at(-2).trim(),'未执行');}
 for(const row of published.main.boundaries)assert.ok(text.includes(row));
});
test('DSPS common augmenter keeps both documents byte stable',()=>{
 const os=require('node:os'),{augmentFile}=require('../scripts/augment-requirement-specs');
 for(const name of files){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsps-refresh-')),file=path.join(dir,name),before=read(name);try{fs.writeFileSync(file,before);assert.equal(augmentFile(file,new Map()).changed,false);assert.equal(fs.readFileSync(file,'utf8'),before);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
});

test('DSPS exact bindings and source differences remain explicit',()=>{
 const text=files.map(read).join('\n'),audit=read('核查记录.md');
 for(const k of ['algoithmId','isPrimaryKey','queryTableExampleData','uniqueColumnId','国密SM4','MD5','ruleType','fieldName','optType','generatorKey','2147483647','dictItemValue','≤1000','≤80'])assert.ok(text.includes(k),k);
 for(const k of ['F-DSPS-003','登录','尚无实测','外部依赖','未执行','Math.random','GET'])assert.ok(audit.includes(k),k);
 assert.doesNotMatch(text,/【|】|待确认|未观察到|源码|本轮|历史DOM|https?:[/][/]/);
 assert.doesNotMatch(text.replace(/!?\[[^\]]*\]\([^)]+\)/g,''),/拟定需求/);
 const evidence=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/dsps-review-20261027/index.json'),'utf8'));
 assert.equal(evidence.publicStaticGets,40);assert.equal(evidence.businessRequestsByCollector,0);assert.equal(evidence.applicationAcceptanceExecuted,false);
 const crypto=require('crypto');for(const s of evidence.sources)for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.equal(crypto.createHash('sha256').update(e.text).digest('hex'),e.sha256);assert.doesNotMatch(e.text,/https?:[/][/]/);}
});

test('DSPS evidence rejects changed bytes, slices, groups and duplicate IDs',()=>{
 const crypto=require('node:crypto'),os=require('node:os'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 const data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/dsps-review-20261027/index.json'),'utf8'));
 assert.equal(data.publicStaticGets,40);assert.equal(data.applicationAcceptanceExecuted,false);assert.equal(data.businessRequestsByCollector,0);assert.ok(data.sources.length>=40);
 for(const s of data.sources){assert.ok(s.resourcePath.startsWith('/'));assert.ok(s.fetchedAt);for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.equal(hash(e.text),e.sha256);assert.doesNotMatch(e.text,/https?:[/][/]/);}}
 const collector=require('../scripts/prepare-dsps-evidence'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dsps-evidence-')),own=path.join(tmp,'own'),shared=path.join(tmp,'shared');fs.mkdirSync(own);fs.mkdirSync(shared);
 const raw='prefix 元数据 suffix',s={id:'fixture',localName:'raw.js',bytes:Buffer.byteLength(raw),sha256:hash(raw),excerpts:[{start:7,end:10,text:'元数据',sha256:hash('元数据')}]};
 try{fs.writeFileSync(path.join(own,'raw.js'),raw);fs.writeFileSync(path.join(shared,'raw.js'),'other');assert.deepEqual(collector.verifyAll({sources:[s]},own,shared),{sources:1,excerpts:1,errors:0});
  for(const mutate of [s=>s.excerpts[0].start++,s=>s.excerpts[0].sha256='0'.repeat(64),s=>s.sourceGroup='shared']){const bad=structuredClone(s);mutate(bad);assert.throws(()=>collector.verifyAll({sources:[bad]},own,shared),/mismatch/);}
  assert.throws(()=>collector.verifyAll({sources:[s,s]},own,shared),/duplicate/);assert.throws(()=>collector.verifyAll({sources:[{...s,sourceGroup:'unknown'}]},own,shared),/source group/);
  fs.appendFileSync(path.join(own,'raw.js'),'changed');assert.throws(()=>collector.verifyAll({sources:[s]},own,shared),/resource mismatch/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
