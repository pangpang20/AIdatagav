const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'doc/requirements/20-指标管理'),read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const headings=['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'];

test('DAP keeps published IDs, sources, order, and nine sections for every functional spec',()=>{
 const ledger=require('../scripts/dap-published-registry.json');
 for(const [kind,file]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){
  const text=read(file),entries=ledger[kind];assert.ok(text.includes('<!-- 业务规格格式:plain-v1 -->'));
  assert.doesNotMatch(text,/【|】|待确认|拟定需求|本轮|源码/);
  assert.deepEqual([...text.matchAll(/^### (DAP-\d{3}) /gm)].map(x=>x[1]),entries.requirements.map(x=>x.id));
  assert.deepEqual([...text.matchAll(/^\| (DAP-AC-\d{3}) \|/gm)].map(x=>x[1]),entries.acceptance);
  for(const line of text.split('\n').filter(x=>/^\| DAP-AC-/.test(x))){const cells=line.split('|').map(x=>x.trim());assert.equal(cells[3],entries.associations[cells[1]]);assert.equal(cells[4],'未执行');}
  for(const e of entries.requirements){const block=text.match(new RegExp('^### '+e.id+' ([\\s\\S]*?)(?=^### |^## |(?![\\s\\S]))','m'))?.[1]||'';for(const [i,title]of headings.entries())assert.ok(block.includes('#### '+(i+1)+'. '+title+'（'+e.id+'）'),e.id+' '+title);}
 }
 assert.equal(ledger.main.requirements.length+ledger.sub.requirements.length,46);
 assert.equal(ledger.main.acceptance.length+ledger.sub.acceptance.length,368);
});

test('DAP records observed distinctions and independent quality targets without claiming application success',()=>{
 const text=read('需求说明.md')+read('子页面与操作细化.md'),audit=read('核查记录.md');
 for(const value of ['/collectlogictable','/facttable/attr/page','/dataanalysis/updatedatastatus','/bi/board/publish/{id}','/schedule/pause/{id}','tabcols/addsrc','accType=5','accType=1','顶层null/空字符串/0/false变为{}'])assert.ok(text.includes(value),value);
 for(const value of ['368条功能验收','全部368条功能验收和18条非功能验收为**未执行**','95项逐条带有回执','navigation-error','不等于指标新增'])assert.ok(audit.includes(value),value);
 const nfr=[...read('需求说明.md').matchAll(/^\| DAP-NFR-\d{3} \|/gm)];assert.equal(nfr.length,18);assert.doesNotMatch(text,/已通过应用验收|生产就绪/);
 const spec=require('../scripts/dap-requirement-spec'),prompt=spec.profile(spec.SUB.find(x=>x.id==='DAP-517'));
 assert.equal(prompt.apis.length,0);assert.ok(prompt.flow.includes('当前历史证据未证明后续实体表单已打开'));
 assert.ok(spec.profile(spec.SUB.find(x=>x.id==='DAP-540')).layout.includes('没有普通列表分页'));
 assert.match(spec.profile(spec.SUB.find(x=>x.id==='DAP-531')).apis.find(x=>x[0]==='关联 notassociatedaccs')[3],/取body\.id后删除/);
});

test('DAP generation is stable and rejects lost or altered IDs, associations, and evidence',()=>{
 const spec=require('../scripts/dap-requirement-spec'),augment=require('../scripts/augment-requirement-specs'),ledger=require('../scripts/dap-published-registry.json');
 for(const [kind,file]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){
  const text=read(file);assert.equal(spec.renderDocument(kind,text),text);
  assert.throws(()=>spec.renderDocument(kind,text.replace('DAP-AC-'+(kind==='main'?'632':'642'),'DAP-AC-999')),/acceptance/);
  assert.throws(()=>spec.renderDocument(kind,text.replace('<!-- 业务规格格式:plain-v1 -->','')),/plain/);
  const first=ledger[kind].requirements[0],evidence=first.evidence[0];assert.throws(()=>spec.renderDocument(kind,text.replaceAll(evidence+'.png','lost.png')),/evidence|source/);
  const row=text.match(/^\| DAP-AC-\d{3} \|.*$/m)[0],assoc=ledger[kind].associations[row.split('|')[1].trim()];assert.throws(()=>spec.renderDocument(kind,text.replace(row,row.replace(assoc,'DAP-999'))),/association/);
  assert.throws(()=>spec.renderDocument(kind,text.replace(row,row.replace('未执行','已执行'))),/cannot be marked passed/);
  if(kind==='main'){const quality=text.match(/^\| DAP-NFR-001 \|.*$/m)[0];assert.throws(()=>spec.renderDocument(kind,text.replace(quality,'')),/NFR registry/);assert.throws(()=>spec.renderDocument(kind,text.replace(quality,quality.replace('未执行','通过'))),/cannot be marked passed/);}
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dap-refresh-'));try{const target=path.join(temp,file);fs.writeFileSync(target,text);augment.augmentFile(target);assert.equal(fs.readFileSync(target,'utf8'),text);}finally{fs.rmSync(temp,{recursive:true,force:true});}
 }
});

test('DAP evidence excerpts are precise, relative, unique, and inert',()=>{
 const evidence=require('../doc/requirements/evidence/dap-review-20261027/index.json'),extractor=fs.readFileSync(path.join(root,'scripts/prepare-dap-evidence.js'),'utf8');
 assert.equal(evidence.publicStaticGets,96);assert.equal(evidence.receiptedGets,95);assert.equal(evidence.additionalPathProbe,1);assert.equal(evidence.businessRequestsByCollector,0);assert.equal(evidence.applicationAcceptanceExecuted,false);assert.equal(evidence.visuallyInspectedHistoricalScreenshots,28);assert.equal(evidence.availableHistoricalTargetScreenshots,76);
 assert.equal(evidence.sources.length,84);assert.equal(new Set(evidence.sources.map(x=>x.id)).size,84);
 for(const source of evidence.sources){assert.ok(source.resourcePath.startsWith('/'));assert.doesNotMatch(source.resourcePath,/https?:\/\//i);for(const excerpt of source.excerpts){assert.equal(crypto.createHash('sha256').update(excerpt.text).digest('hex'),excerpt.sha256);assert.equal(excerpt.end-excerpt.start,excerpt.text.length);assert.doesNotMatch(excerpt.text,/https?:\/\//i);}}
 assert.doesNotMatch(extractor,/\beval\s*\(|new Function|require\(.*views-/);
 const prepare=require('../scripts/prepare-dap-evidence');const changed=structuredClone(evidence);changed.sources[0].sourceGroup='unexpected';assert.throws(()=>prepare.verifyAll(changed,'unused','unused'),/unknown source group/);const altered=structuredClone(evidence);altered.sources[0].excerpts[0].sha256='0'.repeat(64);assert.throws(()=>prepare.verifyAll(altered,'C:/Users/pangpang/AppData/Local/Temp/aida-survey/dap-review-20261027','C:/Users/pangpang/AppData/Local/Temp/aida-survey/workbench-review-20261026'),/mismatch/);
});
