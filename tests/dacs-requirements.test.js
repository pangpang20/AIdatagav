const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'doc/requirements/23-资产目录系统'),files=['需求说明.md','子页面与操作细化.md'];
const read=name=>fs.readFileSync(path.join(folder,name),'utf8'),registry=require('../scripts/dacs-published-registry.json');
const digest=text=>crypto.createHash('sha256').update(text).digest('hex');

test('DACS retains published requirement and acceptance IDs with complete feature sections',()=>{
 const spec=require('../scripts/dacs-requirement-spec');let total=0;
 for(const [i,name]of files.entries()){
  const text=read(name),kind=i?'sub':'main',ledger=registry[kind],requirements=ledger.requirements;
  assert.deepEqual([...text.matchAll(/^### (DACS-\d{3}) /gm)].map(m=>m[1]),requirements.map(e=>e.id));
  const acceptance=[...text.matchAll(/^\| (DACS-AC-\d{3}) \|.*$/gm)];total+=acceptance.length;
  assert.deepEqual(acceptance.map(m=>m[1]),ledger.acceptance);
  for(const [row,id]of acceptance){
   const cells=row.split('|').map(c=>c.trim());
   assert.equal(cells.find(c=>/^DACS-\d{3}$/.test(c)),ledger.associations[id]);
   assert.equal(cells.at(-2),'未执行');
  }
  for(const feature of requirements){
   const start=text.indexOf('### '+feature.id+' '),next=[text.indexOf('\n### ',start+1),text.indexOf('\n## ',start+1)].filter(position=>position>=0),end=next.length?Math.min(...next):text.length,block=text.slice(start,end);
   for(const [n,title]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(block.includes(`#### ${n+1}. ${title}（${feature.id}）`),`${feature.id} ${title}`);
   assert.ok(block.includes('结果未知'));assert.ok(block.includes('.png'));
  }
  assert.equal(spec.renderDocument(kind,text),text);
 }
 assert.equal(total,125);
});

test('DACS renderer rejects lost history, evidence, associations, or false passes',()=>{
 const spec=require('../scripts/dacs-requirement-spec'),main=read('需求说明.md'),sub=read('子页面与操作细化.md');
 assert.throws(()=>spec.renderDocument('main',main.replace(/^\| DACS-AC-539 \|.*\n/m,'')),/acceptance/);
 assert.throws(()=>spec.renderDocument('main',main.replace(/^### DACS-001.*\n/m,'')),/requirement registry/);
 assert.throws(()=>spec.renderDocument('main',main.replace(registry.main.sourceRows[0],'')),/source rows/);
 assert.throws(()=>spec.renderDocument('main',main.replaceAll('E048-asset-catalog.png','missing.png')),/source rows lost/);
 assert.throws(()=>spec.renderDocument('main',main.replace(/^(\| DACS-AC-539 \|.*\| )未执行( \|)$/m,'$1通过$2')),/cannot be marked passed/);
 assert.throws(()=>spec.renderDocument('main',main.replace(/^\| DACS-NFR-001 \|.*\n/m,'')),/NFR registry/);
 assert.throws(()=>spec.renderDocument('main',main.replace(/^(\| DACS-NFR-001 \|.*\| )未执行( \|)$/m,'$1通过$2')),/NFR cannot be marked passed/);
 assert.throws(()=>spec.renderDocument('sub',sub.replaceAll('V-DACS-001.png','missing.png')),/evidence missing DACS-500/);
 const historical=main.split('## 7. 实现与交付边界')[1].split('## 8.')[0],rows=historical.split('\n').filter(line=>/^\| DACS-1\d\d \|/.test(line));
 assert.equal(rows.length,15);for(const row of rows)assert.equal(row.split('|').slice(1,-1).length,3);
});

test('DACS quality targets and evidence remain explicitly unexecuted and traceable',()=>{
 const text=read('需求说明.md'),nfr=[...text.matchAll(/^\| (DACS-NFR-\d{3}) \|.*$/gm)],index=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/dacs-review-20261027/index.json'),'utf8'));
 assert.equal(nfr.length,13);assert.equal(new Set(nfr.map(m=>m[1])).size,13);
 for(const [row]of nfr){assert.equal(row.split('|').slice(1,-1).length,6);assert.equal(row.split('|').at(-2).trim(),'未执行');}
 assert.equal(index.publicStaticGets,22);assert.equal(index.businessRequestsByCollector,0);assert.equal(index.applicationAcceptanceExecuted,false);assert.equal(index.sources.length,15);
 assert.equal(index.sources.reduce((count,source)=>count+source.excerpts.length,0),70);
 for(const source of index.sources){assert.ok(source.resourcePath.startsWith('/'));for(const excerpt of source.excerpts){assert.equal(excerpt.end-excerpt.start,excerpt.text.length);assert.equal(digest(excerpt.text),excerpt.sha256);assert.doesNotMatch(excerpt.text,/https?:[/][/]/);}}
});

test('DACS evidence verifier rejects changed slices, hashes, groups, and duplicate IDs',()=>{
 const collector=require('../scripts/prepare-dacs-evidence'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dacs-evidence-')),own=path.join(tmp,'own'),shared=path.join(tmp,'shared');fs.mkdirSync(own);fs.mkdirSync(shared);
 const ownText='prefix 数据 suffix',sharedText='共享目录来源',make=(id,localName,text,start,end,sourceGroup)=>({id,localName,bytes:Buffer.byteLength(text),sha256:digest(text),sourceGroup,excerpts:[{start,end,text:text.slice(start,end),sha256:digest(text.slice(start,end))}]});
 const ownSource=make('own-source','own.js',ownText,7,9,'own'),sharedSource=make('shared-source','shared.js',sharedText,0,2,'shared');
 try{
  fs.writeFileSync(path.join(own,ownSource.localName),ownText);fs.writeFileSync(path.join(shared,sharedSource.localName),sharedText);
  assert.deepEqual(collector.verifyAll({sources:[ownSource,sharedSource]},own,shared),{sources:2,excerpts:2,errors:0});
  for(const mutate of [source=>source.excerpts[0].start++,source=>source.excerpts[0].sha256='0'.repeat(64),source=>source.sourceGroup='unknown']){const bad=structuredClone(ownSource);mutate(bad);assert.throws(()=>collector.verifyAll({sources:[bad]},own,shared),/mismatch|source group/);}
  assert.throws(()=>collector.verifyAll({sources:[ownSource,ownSource]},own,shared),/duplicate/);
  fs.appendFileSync(path.join(own,ownSource.localName),'changed');assert.throws(()=>collector.verifyAll({sources:[ownSource]},own,shared),/resource mismatch/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('DACS common augmenter leaves already generated pages unchanged',()=>{
 const {augmentFile}=require('../scripts/augment-requirement-specs');
 for(const name of files){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dacs-refresh-')),file=path.join(dir,name),before=read(name);try{fs.writeFileSync(file,before);assert.equal(augmentFile(file,new Map()).changed,false);assert.equal(fs.readFileSync(file,'utf8'),before);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
});

test('DACS refresh augmenter rebuilds a modified generated feature block',()=>{
 const {augmentFile}=require('../scripts/augment-requirement-specs'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'dacs-refresh-run-')),file=path.join(dir,files[0]),before=read(files[0]);
 const damaged=before.replace(/(\*\*结果与异常处理\*\*：)[^\n]+/,'$1刷新回归哨兵');
 assert.notEqual(damaged,before);
 const originalArgs=process.argv.slice();
 try{
  fs.writeFileSync(file,damaged);process.argv.push('--refresh');
  const result=augmentFile(file,new Map());
  assert.equal(result.changed,true);assert.equal(fs.readFileSync(file,'utf8'),before);
 }finally{process.argv.splice(0,process.argv.length,...originalArgs);fs.rmSync(dir,{recursive:true,force:true});}
});
