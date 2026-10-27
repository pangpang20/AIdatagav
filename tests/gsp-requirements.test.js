const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'doc/requirements/17-数据服务门户'),read=n=>fs.readFileSync(path.join(dir,n),'utf8');
test('GSP preserves every published requirement and acceptance association with concrete nine-section specifications',()=>{
 const ledger=require('../scripts/gsp-published-registry.json');
 for(const [kind,file]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){
  const s=read(file);assert.ok(s.includes('<!-- 业务规格格式:plain-v1 -->'));assert.doesNotMatch(s,/【|】|待确认|拟定需求|本轮|源码|未取得.*截图|来自模板|历史图.*不能证明/);
  assert.deepEqual([...s.matchAll(/^### (GSP-\d{3}) /gm)].map(x=>x[1]),ledger[kind].requirements.map(x=>x.id));
  assert.deepEqual([...s.matchAll(/^\| (GSP-AC-\d{3}) \|/gm)].map(x=>x[1]),ledger[kind].acceptance);
  for(const row of s.split('\n').filter(x=>/^\| GSP-AC-/.test(x))){const c=row.split('|').map(x=>x.trim());assert.equal(c[3],ledger[kind].associations[c[1]]);assert.equal(c[4],'未执行');}
  for(const e of ledger[kind].requirements){const b=s.match(new RegExp('^### '+e.id+' ([\\s\\S]*?)(?=^### |^## |(?![\\s\\S]))','m'))?.[1]||'';for(const [i,t]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(b.includes('#### '+(i+1)+'. '+t+'（'+e.id+'）'),e.id+t);}
  assert.doesNotMatch(s,/\|(?:\s*\|){8}/);
 }
});
test('GSP distinguishes catalogue discovery, visit writes, cart mutation, immediate upload, application and authorization',()=>{
 const s=read('需求说明.md')+read('子页面与操作细化.md'),a=read('核查记录.md');
 for(const token of ['categoryIds','subjectCategoryIds','basicCategoryIds','orderField','shareScopes','responsibilities/page','negative/page','visitNum','PUT','enoughCars','catalogApply','catalogueItemId','cascadeGuidItem','ossFileIds','execStartTime','timestamp','autoExchange','FormData','code=0','10×1024×1024','gspOss/download1','responseType','innerHTML','saveAsFile(response,name)','顶层null/空字符串/0/false转为空对象'])assert.ok(s.includes(token),token);
 assert.match(s,/快速订阅.*加入购数车/);assert.match(s,/取消.*不.*回滚/);assert.match(s,/申请.*不.*授权/);
 for(const token of ['findIndex','10MB','共享范围','迟到','getResourcePage','0','自动更新访问量'])assert.ok(a.includes(token),token);
 assert.doesNotMatch(s,/新增目录表单|删除目录接口|code=200.*成功/);
});
test('GSP NFRs have measurable acceptance and retain explicit unexecuted application status',()=>{
 const s=read('需求说明.md');assert.equal([...s.matchAll(/^\| GSP-NFR-\d{3} \|/gm)].length,16);
 for(const token of ['ceil(p×N)','P95','100%','50','200%','未执行','限流','恢复','上传','留存'])assert.ok(s.includes(token),token);
 assert.doesNotMatch(s,/生产就绪|已通过应用验收/);
});
test('GSP generator and shared refresh are stable and refuse lost identifiers, sources and associations',()=>{
 const gen=require('../scripts/gsp-requirement-spec'),augment=require('../scripts/augment-requirement-specs'),ledger=require('../scripts/gsp-published-registry.json');
 for(const [kind,file]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){
  const s=read(file);assert.equal(gen.renderDocument(kind,s),s);
  assert.throws(()=>gen.renderDocument(kind,s.replace('GSP-AC-'+(kind==='main'?'524':'534'),'GSP-AC-999')),/acceptance/);
  assert.throws(()=>gen.renderDocument(kind,s.replace('<!-- 业务规格格式:plain-v1 -->','')),/plain/);
  const source=kind==='main'?'E096-portal-data-list.png':'V-GSP-001.png';assert.throws(()=>gen.renderDocument(kind,s.replaceAll(source,'lost.png')),/evidence|source/);
  const rows=s.match(/^\| GSP-AC-\d{3} \|.*$/gm);
  assert.throws(()=>gen.renderDocument(kind,s.replace(rows[0],'__swap__').replace(rows[1],rows[0]).replace('__swap__',rows[1])),/acceptance/);
  const wrong=rows[0].replace(ledger[kind].associations[rows[0].split('|')[1].trim()],'GSP-999');
  assert.throws(()=>gen.renderDocument(kind,s.replace(rows[0],wrong)),/association/);
  const first=s.indexOf(source);assert.throws(()=>gen.renderDocument(kind,s.slice(0,first)+'lost.png'+s.slice(first+source.length)),/evidence/);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gsp-refresh-'));try{const p=path.join(temp,file);fs.writeFileSync(p,s);augment.augmentFile(p);assert.equal(fs.readFileSync(p,'utf8'),s);}finally{fs.rmSync(temp,{recursive:true,force:true});}
  assert.equal(ledger[kind].requirements.length,kind==='main'?2:8);
 }
});
test('GSP evidence is exact inert text with relative sources and unchanged application status',()=>{
 const e=require('../doc/requirements/evidence/gsp-review-20261027/index.json');assert.equal(e.publicStaticGets,21);assert.equal(e.businessRequestsByCollector,0);assert.equal(e.applicationAcceptanceExecuted,false);assert.equal(e.sources.length,20);
 assert.equal(new Set(e.sources.map(x=>x.id)).size,20);
 for(const s of e.sources){assert.ok(s.resourcePath.startsWith('/'));for(const x of s.excerpts){assert.equal(crypto.createHash('sha256').update(x.text).digest('hex'),x.sha256);assert.equal(x.end-x.start,x.text.length);}}
 const extractor=fs.readFileSync(path.join(root,'scripts/prepare-gsp-evidence.js'),'utf8');assert.doesNotMatch(extractor,/\beval\s*\(|new Function|require\(.*views-/);
});
