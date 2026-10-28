const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const spec=require('../scripts/bwm-requirement-spec'),{augmentFile}=require('../scripts/augment-requirement-specs'),{prepare,selections}=require('../scripts/prepare-bwm-evidence');
const ROOT=path.resolve(__dirname,'../doc/requirements'),DIR=path.join(ROOT,spec.catalog.group),EVIDENCE=path.join(ROOT,'evidence/bwm-review-20261028');
const read=n=>fs.readFileSync(path.join(DIR,n),'utf8').replace(/\r\n/g,'\n'),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
test('BWM generator reproduces reviewed documents and preserves 15/94 ledger',()=>{
 const text=spec.renderMain();assert.equal(read('需求说明.md'),text);assert.equal(read('子页面与操作细化.md'),spec.renderSubpages());assert.equal(spec.validateLedger(text),true);
 assert.equal(spec.features().length,15);assert.equal(spec.catalog.originalCases.length,94);assert.equal(new Set(spec.catalog.acceptanceOrder).size,94);
 assert.deepEqual([...text.matchAll(/^\| (BWM-AC-\d{3}) \|/gm)].map(x=>x[1]),spec.catalog.acceptanceOrder);
});
test('BWM rejects lost IDs, changed associations, false application passes and evidence loss',()=>{
 const t=spec.renderMain();
 assert.throws(()=>spec.validateLedger(t.replace('### BWM-015','### BWM-099')),/requirements/);
 assert.throws(()=>spec.validateLedger(t.replace('BWM-AC-094','BWM-AC-099')),/acceptance/);
 assert.throws(()=>spec.validateLedger(t.replace('| BWM-001 | 未执行 |','| BWM-002 | 未执行 |')),/association/);
 assert.throws(()=>spec.validateLedger(t.replace('| 未执行 |','| 通过 |')),/cannot pass/);
 assert.throws(()=>spec.validateLedger(t.replaceAll('R043-alerts.png','missing.png')),/missing evidence/);
 assert.throws(()=>spec.validateLedger(t.replace('| BWM-NFR-014 |','| BWM-NFR-099 |')),/NFR/);
});
test('BWM all nine areas have authored fields, controls, flows, APIs, layout and evidence',()=>{
 for(const f of spec.features()){
  const b=spec.renderMain().match(new RegExp('^### '+f.id+' ([\\s\\S]*?)(?=^### |^## |(?![\\s\\S]))','m'))[1];
  assert.deepEqual([...b.matchAll(/^#### (\d)\./gm)].map(x=>Number(x[1])),[1,2,3,4,5,6,7,8,9]);
  assert.ok(f.fields.length>1);assert.ok(f.controls.length>1);assert.ok(f.apis.length>0);assert.ok(f.checks.length===5);
  for(const n of f.nfr)assert.ok(n>=1&&n<=spec.NFR.length);
 }
 assert.doesNotMatch(spec.renderMain(),/【页面观察|【拟定需求|【待确认|待验证；从页面/);
});
test('BWM preserves historical screenshot/DOM bytes and each function evidence registration',()=>{
 const registry=require('../doc/requirements/采样清单.json').liveRecheck.documents.find(x=>x.code==='BWM');
 assert.deepEqual(registry.requirements,spec.catalog.requirements.map(({id,evidence})=>({id,evidence})));
 for(const [name,digest]of Object.entries(spec.catalog.evidenceHashes))assert.equal(sha(fs.readFileSync(path.join(ROOT,'evidence/live-recheck-20261022',name))),digest,name);
});
test('BWM 14 quality requirements match registry and all have function/measurement coverage',()=>{
 const registry=require('../doc/requirements/采样清单.json').liveRecheck.documents.find(x=>x.code==='BWM');
 assert.equal(spec.NFR.length,14);assert.equal(registry.qualityRequirements.length,14);assert.equal(registry.developmentReview.productionReady,false);
 registry.qualityRequirements.forEach((r,i)=>{assert.equal(r.id,'BWM-NFR-'+String(i+1).padStart(3,'0'));assert.deepEqual(r.relatedRequirements,spec.features().filter(f=>f.nfr.includes(i+1)).map(f=>f.id));assert.ok(r.relatedRequirements.length);});
 for(const p of ['ceil(p×N)','≥1000样本','RTT50ms','样本不足不判通过','合法请求5xx','零自动写请求重放','RTO/RPO','月度可用率'])assert.ok(spec.renderMain().includes(p),p);
});
test('BWM ordinary and forced generic refresh cannot replace reviewed specifications',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bwm-refresh-'));const saved=process.argv.slice();
 try{for(const force of [false,true]){if(force)process.argv.push('--refresh');for(const name of ['需求说明.md','子页面与操作细化.md']){const file=path.join(tmp,name),text=read(name);fs.writeFileSync(file,text);assert.equal(augmentFile(file).changed,false);assert.equal(fs.readFileSync(file,'utf8'),text);}}
  fs.writeFileSync(path.join(tmp,'需求说明.md'),spec.renderMain().replace('BWM-AC-094','BWM-AC-999'));assert.throws(()=>augmentFile(path.join(tmp,'需求说明.md')),/acceptance/);
 }finally{process.argv.splice(0,process.argv.length,...saved);fs.rmSync(tmp,{recursive:true,force:true});}
});
test('BWM read-only diagram and workorder details never inherit submit-success templates',()=>{
 const f=spec.features();for(const n of [12,13]){assert.ok(f[n].checks.some(x=>x.includes('零')||x.includes('无提交')));assert.ok(f[n].apis.every(a=>!a[1].endsWith('/save')&&!a[1].endsWith('/add/map')&&!a[1].endsWith('/deal')));}
 for(const p of ['只读图与详情不套用提交中或保存成功状态','进入myNewsEdit.created即PUT read','接收关系ID','JSON.stringify','/common/msg/msg/','/act/def/node/info/map','/act/def/node/add/map','/act/def/copyModel','/publishHis/{id}','needSnapshot:true','backTaskSid未进入','节点配置add/map是独立写入'])assert.ok(spec.renderMain().includes(p),p);
});
test('BWM exact field constraints and mode switches remain explicit',()=>{
 for(const p of ['templateTestJson','originalParam','10000','msgTypeDisplay','codeId','apiDataUpload','apiDataDownload','needExists:2','successful=false','yyyy-MM-ddTHH:mm:ss','categoryCodeIsDisabled','state=1','modelKey过滤'])assert.ok((spec.renderMain()+read('核查记录.md')).includes(p),p);
});
test('BWM minimal excerpts have correct receipt metadata, digests and UTF16 offsets',()=>{
 const index=JSON.parse(fs.readFileSync(path.join(EVIDENCE,'index.json')));assert.equal(index.staticResourcesFetched,62);assert.equal(index.businessWritesExecuted,false);assert.equal(index.authenticatedNetworkObserved,false);assert.equal(index.entries.length,55);
 assert.deepEqual(fs.readdirSync(EVIDENCE).filter(x=>x.endsWith('.txt')).sort(),index.entries.map(x=>x.file).sort());
 for(const e of index.entries){const b=fs.readFileSync(path.join(EVIDENCE,e.file)),s=b.toString('utf8');assert.equal(sha(b),e.excerptSha256);assert.equal(s.length,e.end-e.start);assert.ok(s.includes(e.anchor));assert.match(e.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(e.fetchedAt);assert.ok(b.length<e.sourceBytes);assert.match(e.resourcePath,/^\/module-(flow|common)\//);assert.doesNotMatch(s,/https?:\/\//);}
});
test('BWM extractor refuses modified source receipts and missing anchors before writing',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bwm-source-'));try{const name=selections[0][1];fs.writeFileSync(path.join(tmp,name),'changed');fs.writeFileSync(path.join(tmp,'receipt.json'),JSON.stringify([{localName:name,status:200,bytes:7,sha256:'0'.repeat(64)}]));assert.throws(()=>prepare(tmp,path.join(tmp,'out')),/receipt mismatch/);
 fs.writeFileSync(path.join(tmp,'receipt.json'),JSON.stringify([{localName:name,status:200,bytes:7,sha256:sha('changed')}]));assert.throws(()=>prepare(tmp,path.join(tmp,'out')),/anchor missing/);assert.equal(fs.existsSync(path.join(tmp,'out')),false);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('BWM archived source proves consequential differences without evaluating bundles',()=>{
 const r=n=>fs.readFileSync(path.join(EVIDENCE,n),'utf8');
 assert.match(r('view-10.txt'),/setReaded\)\(\{idStr:Number.parseInt/);assert.match(r('view-07.txt'),/setReaded1/);
 assert.match(r('api-news-announcemen.txt'),/\/msg\/publishHis\//);assert.match(r('view-12.txt'),/resendMessage1\)\(JSON.stringify/);
 assert.match(r('model-save.txt'),/modelDefId:e\.\$route\.query\.modelDefId/);assert.match(r('node-read.txt'),/createNodeConfig/);
 assert.match(r('flow-parent.txt'),/a.requestInstance=e.getRequestInstance\(\)/);
});
test('BWM audit distinguishes history/static material, current capability and blocked acceptance',()=>{
 const t=read('核查记录.md');for(const p of ['## 核查结论','## 外部依赖','## 验证状态','2026-10-22','62份','55个','BWM-DEP-01','BWM-DEP-07','未执行','/workorder','/common/workflow','不执行下载代码','未登录'])assert.ok(t.includes(p),p);
 for(const t of [spec.renderMain(),spec.renderSubpages(),read('核查记录.md')])assert.doesNotMatch(t,/https?:\/\/|Bearer\s+[A-Za-z0-9]|业务验收通过/);
});
