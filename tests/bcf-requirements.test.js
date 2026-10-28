const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {catalog,MARKER,features,NFR,renderMain,validateLedger}=require('../scripts/bcf-requirement-spec');
const {augmentFile}=require('../scripts/augment-requirement-specs');
const {prepare,selections}=require('../scripts/prepare-bcf-evidence');
const ROOT=path.resolve(__dirname,'../doc/requirements'),DIR=path.join(ROOT,catalog.group),read=n=>fs.readFileSync(path.join(DIR,n),'utf8').replace(/\r\n/g,'\n'),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
test('BCF authored generator reproduces the published document and all original identities',()=>{
 const text=read('需求说明.md');assert.equal(text,renderMain());assert.equal(validateLedger(text),true);assert.equal(catalog.originalCases.length,50);
 assert.deepEqual([...text.matchAll(/^\| (BCF-AC-\d{3}) \|/gm)].map(x=>x[1]),catalog.acceptanceOrder);
 assert.equal(features.length,8);assert.equal(NFR.length,12);assert.doesNotMatch(text,/【页面观察|【拟定需求|【待确认/);
 for(const f of features){const b=text.match(new RegExp('^### '+f.id+' ([\\s\\S]*?)(?=^### |^## |(?![\\s\\S]))','m'))[1];assert.deepEqual([...b.matchAll(/^#### (\d)\./gm)].map(x=>+x[1]),[1,2,3,4,5,6,7,8,9]);}
});
test('BCF regression gate rejects lost IDs, evidence, associations, sections and forged acceptance',()=>{
 const text=renderMain();
 for(const [a,b,error] of [['### BCF-008','### BCF-009',/requirements/],['BCF-AC-011','BCF-AC-099',/acceptance/],['| BCF-001 | 未执行 |','| BCF-002 | 未执行 |',/association/],['| 未执行 |','| 通过 |',/cannot pass/],['| BCF-NFR-012 |','| BCF-NFR-099 |',/NFR/],['#### 9. 非功能性需求（BCF-001）','非功能',/sections/]])assert.throws(()=>validateLedger(text.replace(a,b)),error);
 assert.throws(()=>validateLedger(text.replaceAll('R064-app-0.png','absent.png')),/missing evidence/);
});
test('BCF forced generic refresh is a no-op and still validates the ledger',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bcf-refresh-'));const before=process.argv.slice();
 try{process.argv.push('--refresh');const file=path.join(tmp,'需求说明.md');fs.writeFileSync(file,renderMain());assert.equal(augmentFile(file).changed,false);assert.equal(fs.readFileSync(file,'utf8'),renderMain());fs.writeFileSync(file,renderMain().replace('BCF-AC-011','BCF-AC-099'));assert.throws(()=>augmentFile(file),/acceptance/);}
 finally{process.argv.splice(0,process.argv.length,...before);fs.rmSync(tmp,{recursive:true,force:true});}
});
test('BCF quality registry and acceptance execution boundaries match the authored source',()=>{
 const d=require('../doc/requirements/采样清单.json').liveRecheck.documents.find(x=>x.code==='BCF');
 assert.deepEqual(d.businessAcceptance,catalog.acceptanceOrder);assert.equal(d.developmentReview.productionReady,false);
 assert.deepEqual(d.qualityRequirements.map(x=>x.id),NFR.map((_,i)=>'BCF-NFR-'+String(i+1).padStart(3,'0')));
 for(const n of d.qualityRequirements)assert.deepEqual(n.relatedRequirements,catalog.requirements.map(x=>x.id));
 for(const s of ['ceil(p×N)','RTT50ms','≥1000样本','样本不足不判通过','timeout:0','RTO/RPO','零自动写请求重放','合法请求被限流'])assert.ok(renderMain().includes(s),s);
});
test('BCF static evidence has exact bytes, separate digests, timestamps and replay offsets',()=>{
 const d=path.join(ROOT,'evidence/bcf-review-20261028'),j=JSON.parse(fs.readFileSync(path.join(d,'index.json')));
 assert.equal(j.businessWritesExecuted,false);assert.equal(j.authenticatedNetworkObserved,false);assert.equal(j.entries.length,32);
 assert.deepEqual(fs.readdirSync(d).filter(n=>n.endsWith('.txt')).sort(),j.entries.map(e=>e.file).sort());
 for(const e of j.entries){const b=fs.readFileSync(path.join(d,e.file));assert.equal(sha(b),e.excerptSha256);assert.equal(b.toString('utf8').length,e.end-e.start);assert.ok(b.toString('utf8').includes(e.anchor));assert.match(e.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(b.length<e.sourceBytes);assert.match(e.resourcePath,/^\/module-common\//);assert.ok(Date.parse(e.fetchedAt)>0);assert.doesNotMatch(b.toString('utf8'),/https?:\/\//);}
});
test('BCF extractor refuses changed or missing receipts and unavailable anchors',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'bcf-extract-'));try{
  const name=selections[0][1],bytes=Buffer.from('changed');fs.writeFileSync(path.join(d,name),bytes);
  fs.writeFileSync(path.join(d,'chunks-receipt.json'),JSON.stringify([{localName:name,sha256:'0'.repeat(64),bytes:bytes.length}]));assert.throws(()=>prepare(d,path.join(d,'out')),/receipt mismatch/);
  fs.writeFileSync(path.join(d,'chunks-receipt.json'),'[]');assert.throws(()=>prepare(d,path.join(d,'out')),/receipt mismatch/);
  fs.writeFileSync(path.join(d,'chunks-receipt.json'),JSON.stringify([{localName:name,sha256:sha(bytes),bytes:bytes.length}]));assert.throws(()=>prepare(d,path.join(d,'out')),/anchor missing/);
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('BCF API methods, identity conversions and side effects are source-bounded',()=>{
 const text=renderMain();
 for(const x of ['/common/user/main/key','/common/app/app/realSecret','/common/app/app/refreshSecret/{id}','GET refreshSecret也按有副作用处理','casService.logoutUrl','joinType','menu.key','FormData{file,fieldName:"userGuide"}','/common/app/system/modify/upload','/common/app/platform/system/unlinked','categories=[{categoryName:"",systems:本地systems}]','/common/calendar/calendarspecial','/common/license/license/upload','auto-upload=false','Date.now()-864e5','50480KiB','RSA-OAEP','SHA-256/MGF1 SHA-256'])assert.ok(text.includes(x),x);
 assert.doesNotMatch(text,/\/common\/auth\/login\/key|\bcode=0成功|50MiB.*当前阈值/);
 const evidence=n=>fs.readFileSync(path.join(ROOT,'evidence/bcf-review-20261028',n+'.txt'),'utf8');
 assert.ok(evidence('key').includes('/main/key'));assert.ok(evidence('app-api').includes('/app/refreshSecret/'));assert.ok(evidence('system-files').includes('20480'));assert.ok(evidence('platform-list').includes('50480'));assert.ok(evidence('date-form').includes('Date.now()-864e5'));assert.ok(evidence('license-form').includes('fileUploadSize:10'));
});
test('BCF audit distinguishes current login, historical screenshots and all blocked contracts',()=>{
 const text=read('核查记录.md');for(const s of ['## 核查结论','## 外部依赖','## 验证状态','/module-login/login','1500×1000','未执行','51691520','应用验收','动态下限','catch为空'])assert.ok(text.includes(s),s);
 for(let i=1;i<=7;i++)assert.ok(text.includes('BCF-DEP-'+String(i).padStart(2,'0')));assert.doesNotMatch(text,/https?:\/\//);assert.ok(read('需求说明.md').includes(MARKER));
});
