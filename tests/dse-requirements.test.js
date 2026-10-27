const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'doc/requirements/15-数据共享交换');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
test('DSE retains ordered requirement and acceptance identities with complete business sections',()=>{
 const ledger=require('../scripts/dse-published-registry.json');
 for(const [kind,name]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){
  const s=read(name);assert.ok(s.includes('<!-- 业务规格格式:plain-v1 -->'));assert.doesNotMatch(s,/【|】|待确认|本轮|源码|https?:\/\//);
  assert.deepEqual([...s.matchAll(/^### (DSE-\d{3}) /gm)].map(m=>m[1]),ledger[kind].ids);
  const rows=s.split('\n').filter(l=>l.startsWith('| DSE-AC-'));assert.deepEqual(rows.map(l=>l.split('|')[1].trim()),ledger[kind].acceptance);
  for(const row of rows){const c=row.split('|').map(v=>v.trim());assert.equal(c.at(-2),'未执行');assert.equal(c.at(-3),ledger[kind].associations[c[1]]);}
  for(const id of ledger[kind].ids){const block=s.split('### '+id+' ')[1].split(/^### |^## /m)[0];
   for(const label of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'])assert.ok(block.includes(label),id+label);
   assert.doesNotMatch(block,/^\|\s*\|/m);assert.ok(block.includes('.png'));assert.ok(block.includes('DSE-NFR-'));
  }
 }
});
test('DSE profiles distinguish statistics, three edit models, state-changing actions and read-only monitoring',()=>{
 const sub=read('子页面与操作细化.md'),audit=read('核查记录.md'),all=sub+audit;
 for(const key of ['runingRangeType','failed_total','success_total','exec_total','read_total','rangeType','taskStatus','execResult','15000','datasetMappingDoList','dseFileTaskMappingDos','apiColMappingDos','trgAutaCrttabFlag','targetSourceId','srcIncrementCol','getNextFiveFiredTimes','getLogDetail','lastModifyTime','innerHTML','>>','0 0 0 * * ? *'])assert.ok(all.includes(key),key);
 assert.match(all,/成功.*failed_total/);assert.match(all,/J-DSE-010.*日志/);
 assert.match(sub,/库表.*1.*文件.*2.*接口.*8/);
 assert.match(sub,/新增.*删除.*不提供/);
 assert.match(sub,/关闭.*不.*停止/);
});
test('DSE measurable NFR targets remain separate and application acceptance stays unexecuted',()=>{
 const s=read('需求说明.md'),rows=s.split('\n').filter(l=>l.startsWith('| DSE-NFR-'));assert.equal(rows.length,16);
 for(const r of rows)assert.equal(r.split('|').at(-2).trim(),'未执行');
 for(const text of ['P95','ceil','200%','10000','尚无实测'])assert.ok(s.includes(text),text);
});
test('DSE render and shared refresh are byte stable and reject lost or reordered ledgers and evidence',()=>{
 const spec=require('../scripts/dse-requirement-spec'),{augmentFile}=require('../scripts/augment-requirement-specs'),ledger=require('../scripts/dse-published-registry.json');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dse-doc-test-'));
 try{for(const [kind,n]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){
  const s=read(n);assert.equal(spec.renderDocument(kind,s),s);
  const p=path.join(tmp,n);fs.writeFileSync(p,s);augmentFile(p);assert.equal(fs.readFileSync(p,'utf8'),s);
  const rows=s.match(/^\| DSE-AC-\d{3} \|.*$/gm);assert.throws(()=>spec.renderDocument(kind,s.replace(rows[0],'')),/acceptance/);
  assert.throws(()=>spec.renderDocument(kind,s.replace(rows[0],'__swap__').replace(rows[1],rows[0]).replace('__swap__',rows[1])),/acceptance/);
  assert.throws(()=>spec.renderDocument(kind,s.replace(/^### DSE-\d{3}.*\n/m,'')),/requirement/);
  assert.throws(()=>spec.renderDocument(kind,s.replace('<!-- 业务规格格式:plain-v1 -->','')),/format/);
  if(kind==='main')assert.throws(()=>spec.renderDocument(kind,s.replace(ledger.main.sourceRows[0],'')),/source/);
 }}finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('DSE evidence hashes, groups and decoded excerpts are exact and tampering is rejected',()=>{
 const {verifyAll}=require('../scripts/prepare-dse-evidence'),hash=v=>crypto.createHash('sha256').update(v).digest('hex');
 const index=JSON.parse(fs.readFileSync(path.join(dir,'../evidence/dse-review-20261027/index.json'),'utf8'));
 assert.equal(index.applicationAcceptanceExecuted,false);assert.equal(index.businessRequestsByCollector,0);assert.equal(index.sources.length,17);
 for(const s of index.sources){assert.ok(s.resourcePath.startsWith('/'));for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.equal(hash(e.text),e.sha256);assert.doesNotMatch(e.text,/https?:\/\//);}}
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dse-evidence-test-')),own=path.join(tmp,'own'),common=path.join(tmp,'shared');
 try{fs.mkdirSync(own);fs.mkdirSync(common);fs.writeFileSync(path.join(own,'a.js'),'literal');
 const s={id:'A',localName:'a.js',bytes:7,sha256:hash('literal'),excerpts:[{start:0,end:7,text:'literal',sha256:hash('literal')}]};
 assert.equal(verifyAll({sources:[s]},own,common).errors,0);
 assert.throws(()=>verifyAll({sources:[s,s]},own,common),/duplicate/);
 assert.throws(()=>verifyAll({sources:[{...s,sourceGroup:'invalid'}]},own,common),/invalid/);
 assert.throws(()=>verifyAll({sources:[{...s,sourceGroup:'shared'}]},own,common),/ENOENT/);
 assert.throws(()=>verifyAll({sources:[{...s,excerpts:[{...s.excerpts[0],text:'changed'}]}]},own,common),/excerpt mismatch/);
 fs.writeFileSync(path.join(own,'a.js'),'changed');assert.throws(()=>verifyAll({sources:[s]},own,common),/resource mismatch/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
