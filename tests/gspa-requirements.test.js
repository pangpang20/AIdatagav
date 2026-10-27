/* Documentation/tool regression only; never calls the deployed business system. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base=path.join(root,'doc/requirements'),dir=path.join(base,'18-数据服务门户后台管理');
const ledger=require('../scripts/gspa-published-registry.json'),gen=require('../scripts/gspa-requirement-spec');
const read=name=>fs.readFileSync(path.join(dir,name),'utf8'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const documents=[['main','需求说明.md'],['sub','子页面与操作细化.md']];
test('GSPA retains all 16 published features and all 128 acceptance IDs, order and associations',()=>{
 let features=0,cases=0;
 for(const [kind,file]of documents){const s=read(file),old=ledger[kind];
  assert.ok(s.includes('<!-- 业务规格格式:plain-v1 -->'));assert.doesNotMatch(s,/【|】|待确认|拟定需求|本轮|源码|历史DOM/);
  assert.deepEqual([...s.matchAll(/^### (GSPA-\d{3}) /gm)].map(x=>x[1]),old.entries.map(x=>x.id));
  assert.deepEqual([...s.matchAll(/^\| (GSPA-AC-\d{3}) \|/gm)].map(x=>x[1]),old.acceptance.map(x=>x.id));
  for(const row of s.matchAll(/^\| (GSPA-AC-\d{3}) \|.*$/gm)){const cells=row[0].split('|').map(x=>x.trim());assert.equal(cells.at(-3),old.acceptance.find(x=>x.id===row[1]).requirement);assert.equal(cells.at(-2),'未执行');cases++;}
  for(const e of old.entries){features++;const block=s.split('### '+e.id+' ')[1].split(/^### |^## /m)[0];
   for(const [i,title]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(block.includes('#### '+(i+1)+'. '+title+'（'+e.id+'）'),e.id+title);
   const fields=block.split('#### 2.')[0].split('\n').filter(x=>/^\|/.test(x));assert.ok(fields.length>3);for(const row of fields)assert.equal(row.split('|').length,10,e.id+row);
   assert.equal([...block.matchAll(/^\| GSPA-AC-/gm)].length,5);assert.ok(block.includes('允许访问本页面'));assert.ok(block.includes('HTTP方法 | 相对路径'));
  }
 }
 assert.equal(features,16);assert.equal(cases,128);
 for(const row of ledger.main.sourceRows)assert.ok(read('需求说明.md').includes(row));
 for(const id of ['101','102','103','104'])assert.ok(read('需求说明.md').includes('GSPA-'+id));
});
test('GSPA specifies actual conditional fields, typed states, exact APIs and distinct mutation boundaries',()=>{
 const s=read('需求说明.md')+read('子页面与操作细化.md'),audit=read('核查记录.md');
 for(const token of ['/back/gsp/manage/gspquickentry/{id}/change/{neighborId}','当前页','/gspinfo/add','stdCategory','yyyy-MM-ddTHH:mm:ss','deleteFlag:0','deleteFlag:1','最多5个','10 MiB','LIST','SLIDE_SHOW','lastModifyTime','sheetColumns','relationId','contentSize','1～30','titleShow','commitDate','CUSTOMIZATION','≤6字符','sheet:{id}','columnId','linkFlag','500 KiB','640×360','保存成功不代表发布成功','listGspTemplateDo','articleGspTemplateDo','templateType','status','/gspOss/temp/upload','ossInside','gsp_content_body_attachment','cms_content_body_attachment','xhr.withCredentials','20000ms','202','1002','1003','1012','1109'])assert.ok(s.includes(token),token);
 assert.match(s,/已有布局.*立即|已有布局.*即时/);assert.match(s,/父表取消不能/);assert.match(s,/只重试发布/);
 assert.doesNotMatch(s,/\/gspa\//);
 for(const t of ['audaqueFormRulesMixin.type','base64Url','seqs','beforeDestroy','0或多激活','未进入后台业务正文','27次静态GET','37个证据项','51个片段'])assert.ok(audit.includes(t),t);
});
test('GSPA NFRs are independent measurable targets with unexecuted application acceptance',()=>{
 const s=read('需求说明.md'),rows=[...s.matchAll(/^\| (GSPA-NFR-\d{3}) \|.*$/gm)];assert.equal(rows.length,15);
 assert.deepEqual(rows.map(x=>x[1]),Array.from({length:15},(_,i)=>'GSPA-NFR-'+String(i+1).padStart(3,'0')));
 for(const r of rows)assert.equal(r[0].split('|').at(-2).trim(),'未执行');
 for(const token of ['20个独立用户','10万内容','预热5分钟','统计15分钟','≥500请求','ceil(p×N)','P95','P99','RTT50ms','200%','RPO/RTO','失败率','4.5:1','出现一次越权即失败'])assert.ok(s.includes(token),token);
 assert.doesNotMatch(s,/已通过应用验收|全部验收通过/);
});
test('GSPA regeneration and shared augmentation are idempotent and reject lost evidence, IDs and false passes',()=>{
 const augment=require('../scripts/augment-requirement-specs');
 for(const [kind,file]of documents){const s=read(file);assert.equal(gen.renderDocument(kind,s),s);
  const rows=s.match(/^\| GSPA-AC-\d{3} \|.*$/gm),first=ledger[kind].acceptance[0];
  assert.throws(()=>gen.renderDocument(kind,s.replace(first.id,'GSPA-AC-999')),/acceptance/);
  assert.throws(()=>gen.renderDocument(kind,s.replace(rows[0],'__swap__').replace(rows[1],rows[0]).replace('__swap__',rows[1])),/acceptance/);
  assert.throws(()=>gen.renderDocument(kind,s.replace(rows[0],rows[0].replace(first.requirement,'GSPA-999'))),/association/);
  assert.throws(()=>gen.renderDocument(kind,s.replace(rows[0],rows[0].replace('未执行','通过'))),/overclaim/);
  assert.throws(()=>gen.renderDocument(kind,s.replace('<!-- 业务规格格式:plain-v1 -->','')),/plain/);
  const feature=(kind==='main'?gen.MAIN:gen.SUB)[0];assert.throws(()=>gen.renderDocument(kind,s.replace(feature.sources[0],'missing.png')),/evidence|source/);
  assert.throws(()=>gen.renderDocument(kind,s.replace('### '+feature.id+' ','### GSPA-999 ')),/registry/);
  if(kind==='main'){
   assert.throws(()=>gen.renderDocument(kind,s.replace(ledger.main.sourceRows[0],'')),/source/);
   const nfr=s.match(/^\| GSPA-NFR-001 \|.*$/m)[0];assert.throws(()=>gen.renderDocument(kind,s.replace(nfr,'')),/quality ledger/);
   assert.throws(()=>gen.renderDocument(kind,s.replace(nfr,nfr.replace('未执行','通过'))),/overclaim/);
  }
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gspa-refresh-'));try{const p=path.join(tmp,file);fs.writeFileSync(p,s);augment.augmentFile(p);assert.equal(fs.readFileSync(p,'utf8'),s);}finally{fs.rmSync(tmp,{recursive:true,force:true});}
 }
});
test('GSPA published source files, research and registered ledgers are preserved byte for byte',()=>{
 for(const [p,hash]of Object.entries(ledger.historicalFiles))assert.equal(sha(fs.readFileSync(path.join(base,p))),hash,p);
 assert.equal(sha(fs.readFileSync(path.join(dir,'调研记录.md'))),ledger.researchSha256);
 const manifest=JSON.parse(fs.readFileSync(path.join(base,'采样清单.json'),'utf8')),m=manifest.modules.find(x=>x.code==='GSPA'),d=manifest.deepDive.find(x=>x.code==='GSPA');
 assert.deepEqual(m.businessRequirements,ledger.registry.module.businessRequirements);assert.deepEqual(d,ledger.registry.deepDive);
 for(const k of ['status','productionReady','criticalDecisions','objectBoundary','expandedOperations'])assert.deepEqual(m.developmentReview[k],ledger.registry.module.developmentReview[k],k);
 assert.equal(m.developmentReview.functionalSpecifications,16);assert.equal(m.developmentReview.functionalAcceptanceCases,128);assert.equal(m.developmentReview.nonfunctionalRequirements,15);assert.equal(m.developmentReview.applicationAcceptanceExecuted,false);
});
test('GSPA static evidence preserves relative paths and exact inert excerpts without claiming execution',()=>{
 const e=require('../doc/requirements/evidence/gspa-review-20261027/index.json');assert.equal(e.publicStaticGets,27);assert.equal(e.businessRequestsByCollector,0);assert.equal(e.applicationAcceptanceExecuted,false);assert.equal(e.sources.length,37);assert.equal(new Set(e.sources.map(x=>x.id)).size,37);
 let excerpts=0;for(const s of e.sources){assert.match(s.resourcePath,/^\/(?!\/)/);assert.doesNotMatch(s.resourcePath,/https?:/);assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.ok(s.bytes>0);for(const x of s.excerpts){excerpts++;assert.equal(sha(x.text),x.sha256);assert.equal(x.end-x.start,x.text.length);assert.doesNotMatch(x.text,/https?:[/][/]/);}}
 assert.equal(excerpts,51);assert.doesNotMatch(fs.readFileSync(path.join(root,'scripts/prepare-gspa-evidence.js'),'utf8'),/\beval\s*\(|new Function|require\(.*views-/);
});
test('GSPA offline verifier detects altered full resources and altered excerpts',()=>{
 const {verifyAll}=require('../scripts/prepare-gspa-evidence'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gspa-evidence-'));
 try{const own=path.join(tmp,'own'),shared=path.join(tmp,'shared');fs.mkdirSync(own);fs.mkdirSync(shared);
  const raw='中文😀 inert source',entry={id:'GSPA-SRC-TEST',localName:'sample.js',bytes:Buffer.byteLength(raw),sha256:sha(raw),excerpts:[{start:2,end:4,text:raw.slice(2,4),sha256:sha(raw.slice(2,4))}]};fs.writeFileSync(path.join(own,'sample.js'),raw);
  assert.deepEqual(verifyAll({sources:[entry]},own,shared),{sources:1,excerpts:1,errors:0});
  assert.throws(()=>verifyAll({sources:[{...entry,sourceGroup:'network'}]},own,shared),/source group/);
  assert.throws(()=>verifyAll({sources:[entry,entry]},own,shared),/duplicate/);
  const bad=structuredClone(entry);bad.excerpts[0].text='xx';assert.throws(()=>verifyAll({sources:[bad]},own,shared),/excerpt mismatch/);
  fs.appendFileSync(path.join(own,'sample.js'),'changed');assert.throws(()=>verifyAll({sources:[entry]},own,shared),/resource mismatch/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
