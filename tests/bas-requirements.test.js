const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {MARKER,catalog,NFR,features,renderMain,renderSourceNote,validateLedger}=require('../scripts/bas-requirement-spec');
const {augmentFile}=require('../scripts/augment-requirement-specs');
const {reviewedSupplement}=require('../scripts/prepare-source-review');
const {prepare,selections}=require('../scripts/prepare-bas-evidence');
const ROOT=path.resolve(__dirname,'../doc/requirements'),DIR=path.join(ROOT,catalog.group),read=n=>fs.readFileSync(path.join(DIR,n),'utf8').replace(/\r\n/g,'\n');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');

test('BAS authored sources reproduce both published documents exactly',()=>{
 assert.equal(read('需求说明.md'),renderMain());assert.equal(read('源码核对补充.md'),renderSourceNote());assert.equal(validateLedger(renderMain()),true);
});
test('BAS retains original 77 IDs and associations, plus 12 precise supplementary cases',()=>{
 const text=renderMain(),ids=[...text.matchAll(/^\| (BAS-AC-\d{3}) \|/gm)].map(x=>x[1]);
 assert.equal(catalog.originalCases.length,77);assert.equal(new Set(ids).size,89);assert.deepEqual(ids.slice(0,77),catalog.acceptanceOrder);
 assert.throws(()=>validateLedger(text.replace('BAS-AC-018','BAS-AC-099')),/acceptance/);
 assert.throws(()=>validateLedger(text.replace('| BAS-001 | 未执行 |','| BAS-002 | 未执行 |')),/association/);
 assert.throws(()=>validateLedger(text.replace('| 未执行 |','| 通过 |')),/cannot pass/);
});
test('BAS feature sections include all nine areas and reject lost evidence or numbering',()=>{
 const text=renderMain();assert.equal(features().length,12);
 for(const f of features()){
  const block=text.match(new RegExp('^### '+f.id+' ([\\s\\S]*?)(?=^### |^## |(?![\\s\\S]))','m'))[1];
  assert.deepEqual([...block.matchAll(/^#### (\d)\./gm)].map(x=>Number(x[1])),[1,2,3,4,5,6,7,8,9]);
  assert.ok(block.includes('**业务目的**'));assert.ok(block.includes('BAS-NFR-001至012'));
 }
 assert.throws(()=>validateLedger(text.replaceAll('R011-admin-users-ready.png','missing.png')),/missing evidence/);
 assert.throws(()=>validateLedger(text.replace('### BAS-012','### BAS-099')),/requirements/);
 assert.doesNotMatch(text,/【页面观察|【拟定需求|【待确认|【拟定，未执行】/);
});
test('BAS quality IDs have measurement conditions and cannot be dropped',()=>{
 const text=renderMain();assert.equal(NFR.length,12);
 assert.throws(()=>validateLedger(text.replace('| BAS-NFR-012 |','| BAS-NFR-099 |')),/NFR/);
 for(const p of ['ceil(p×N)','RTT50ms','≥1000样本','样本不足不判通过','零自动写请求重放','合法负载被限流','RTO/RPO'])assert.ok(text.includes(p),p);
 const live=require('../doc/requirements/采样清单.json').liveRecheck.documents.find(x=>x.code==='BAS');
 assert.deepEqual(live.qualityRequirements.map(x=>x.id),NFR.map((_,i)=>'BAS-NFR-'+String(i+1).padStart(3,'0')));
 for(const q of live.qualityRequirements)assert.deepEqual(q.relatedRequirements,catalog.requirements.map(x=>x.id));
 assert.equal(live.developmentReview.productionReady,false);
});
test('BAS source refresh and forced generic refresh preserve reviewed contracts',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bas-refresh-'));
 try{fs.mkdirSync(path.join(temp,catalog.group));for(const n of ['需求说明.md','源码核对补充.md'])fs.writeFileSync(path.join(temp,catalog.group,n),read(n));
  const args=process.argv.slice();try{process.argv.push('--refresh');for(const n of ['需求说明.md','源码核对补充.md']){const file=path.join(temp,catalog.group,n);assert.equal(augmentFile(file).changed,false);assert.equal(fs.readFileSync(file,'utf8'),read(n));}}finally{process.argv.splice(0,process.argv.length,...args);}
  assert.equal(reviewedSupplement(temp,catalog.group),renderSourceNote());
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('BAS ID, collection, request-domain and password boundaries remain distinct',()=>{
 const text=renderMain();for(const p of ['relationId','rightId:用户id','leftId:应用id','/common/app/myDept/appuser/remove','/common/user/myUser/password/{id}','/common/user/user/disable/tenant/{id}','/common/user/permission/tree/{id}','/common/user/tenantuser/page','叶节点id数组','RSA-OAEP','confirmPassword','timeout:0','NETWORK_ERROR_CODE','withCredentials=true','maxlength=15'])assert.ok(text.includes(p),p);
 assert.doesNotMatch(text,/\/common\/user\/tenantuser\/user\b|\/common\/user\/user\/permission\/tree/);
});
test('BAS archives minimal exact fragments with separate source and excerpt digests',()=>{
 const directory=path.join(ROOT,'evidence/bas-review-20261028'),index=JSON.parse(fs.readFileSync(path.join(directory,'index.json'),'utf8'));
 assert.equal(index.businessWritesExecuted,false);assert.equal(index.authenticatedNetworkObserved,false);assert.equal(index.entries.length,31);
 assert.deepEqual(fs.readdirSync(directory).filter(x=>x.endsWith('.txt')).sort(),index.entries.map(x=>x.file).sort());
 for(const e of index.entries){const raw=fs.readFileSync(path.join(directory,e.file));assert.equal(sha(raw),e.excerptSha256);assert.equal(raw.toString('utf8').length,e.end-e.start);assert.ok(raw.length<e.sourceBytes);assert.match(e.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(raw.toString('utf8').includes(e.anchor));assert.match(e.resourcePath,/^\/module-common\//);assert.doesNotMatch(raw.toString('utf8'),/https?:\/\//);}
});
test('BAS offline extractor rejects modified original receipts and absent anchors',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bas-extractor-'));
 try{
  const name=selections[0][1];fs.writeFileSync(path.join(temp,name),'changed');fs.writeFileSync(path.join(temp,'chunks-receipt.json'),JSON.stringify([{localName:name,sha256:'0'.repeat(64),bytes:7}]));fs.writeFileSync(path.join(temp,'shared-receipt.json'),'[]');
  assert.throws(()=>prepare(temp,path.join(temp,'out')),/receipt mismatch/);
  fs.writeFileSync(path.join(temp,'chunks-receipt.json'),'[]');assert.throws(()=>prepare(temp,path.join(temp,'out')),/anchor missing/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('BAS source supplement retains its original 60 review IDs without duplicate formal cases',()=>{
 const text=renderSourceNote(),ids=[...text.matchAll(/^\| (REVIEW-BAS-\d{3}-\d) \|/gm)].map(x=>x[1]);assert.equal(ids.length,60);assert.equal(new Set(ids).size,60);assert.doesNotMatch(text,/^\| BAS-AC-/m);assert.ok(text.includes(MARKER));
});
test('BAS audit keeps current login boundary, discrepancies and blocked application acceptance',()=>{
 const text=read('核查记录.md');for(const p of ['## 核查结论','## 外部依赖','## 验证状态','/module-login/login','BAS-DEP-01','BAS-DEP-07','未执行','type=0','集合截断'])assert.ok(text.includes(p));assert.doesNotMatch(text,/https?:\/\//);
});
