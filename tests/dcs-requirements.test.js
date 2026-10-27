const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'doc/requirements/14-目录管理系统'),files=['需求说明.md','子页面与操作细化.md'];
const read=f=>fs.readFileSync(path.join(folder,f),'utf8'),published=require('../scripts/dcs-published-registry.json');
test('DCS retains 37 requirements, 294 acceptance IDs, associations and concrete nine-section specifications',()=>{
 const spec=require('../scripts/dcs-requirement-spec');let count=0;
 for(const [i,file]of files.entries()){
  const text=read(file),base=published[i?'sub':'main'];
  assert.deepEqual([...text.matchAll(/^### (DCS-\d{3})\b/gm)].map(m=>m[1]),base.entries.map(e=>e.id));
  const rows=[...text.matchAll(/^\| (DCS-AC-\d{3}) \|.*$/gm)];count+=rows.length;
  assert.deepEqual(rows.map(m=>m[1]),base.acceptance.map(a=>a.id));
  for(const [row,id]of rows){assert.equal(row.split('|').at(-2).trim(),'未执行');assert.equal(row.split('|').at(-3).trim(),base.acceptance.find(a=>a.id===id).requirement);}
  for(const e of i?spec.SUB:spec.MAIN){const block=text.split('### '+e.id+' ')[1].split(/^### |^## /m)[0];
   for(const [j,h]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(block.includes('#### '+(j+1)+'. '+h+'（'+e.id+'）'),e.id+' '+h);
   const fields=block.split('#### 1.')[1].split('#### 2.')[0].split('\n').filter(s=>s.startsWith('|')&&!s.startsWith('|---')&&!s.includes('字段名称与绑定名'));
   assert.ok(fields.length>=3,e.id);for(const row of fields)assert.equal(row.split('|').slice(1,-1).length,8);
   assert.ok(block.includes('/back/dcs/'));assert.ok(block.includes('.png'));assert.ok(block.includes('结果未知'));
  }
 }
 assert.equal(count,294);
});
test('DCS handles resource relation IDs, three approval contracts, upload limits and catalogue lifecycle precisely',()=>{
 const text=files.map(read).join('\n'),audit=read('核查记录.md');
 for(const k of ['relationdeptresource','resourceId','isAuto','catalogueChangeSubmit','pass=1','pass=true','rejectTask','10 MiB','200 MiB','favoriteRelationId','catalogueItemId','categoryDigit','9999','资源导入','seq','queryAppliedProvideTypes','configLimitFreq','已保存，审核提交失败','TOP5','首行'])assert.ok(text.includes(k),k);
 for(const k of ['尾随空格','2～16','isDetailForm','validityDateChange','尚无实测','外部依赖','未执行','登录'])assert.ok(audit.includes(k),k);
 assert.doesNotMatch(text,/【|】|待确认|未观察到|https?:[/][/]/);
});
test('DCS refresh refuses lost published identifiers, evidence, format and source rows and is idempotent',()=>{
 const spec=require('../scripts/dcs-requirement-spec');
 for(const [i,file]of files.entries()){
  const original=read(file),type=i?'sub':'main';assert.equal(spec.renderDocument(type,original),original);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^\| DCS-AC-\d{3} \|.*\n/m,'')),/acceptance/);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^### DCS-\d{3}.*\n/m,'')),/requirement IDs/);
  assert.throws(()=>spec.renderDocument(type,original.replace('<!-- 业务规格格式:plain-v1 -->','')),/format/);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^(\| DCS-AC-\d{3} \|.*\| )DCS-\d{3}( \| 未执行 \|)$/m,'$1DCS-999$2')),/association/);
  if(!i)assert.throws(()=>spec.renderDocument(type,original.replace(published.main.sourceRows[0],'')),/source rows/);
  if(i)assert.throws(()=>spec.renderDocument(type,original.replaceAll(published.sub.entries[0].sources[0],'missing.png')),/evidence/);
 }
});
test('DCS evidence uses exact local source slices and rejects source tampering',()=>{
 const crypto=require('node:crypto'),os=require('node:os'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 const data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/dcs-review-20261027/index.json'),'utf8'));
 assert.equal(data.publicStaticGets,62);assert.equal(data.applicationAcceptanceExecuted,false);assert.equal(data.businessRequestsByCollector,0);assert.ok(data.sources.length>=45);
 for(const s of data.sources){assert.ok(s.resourcePath.startsWith('/'));assert.ok(s.fetchedAt);for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.equal(hash(e.text),e.sha256);assert.doesNotMatch(e.text,/https?:[/][/]/);}}
 const collector=require('../scripts/prepare-dcs-evidence'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dcs-evidence-')),own=path.join(tmp,'own'),shared=path.join(tmp,'shared');fs.mkdirSync(own);fs.mkdirSync(shared);
 const raw='prefix 目录 suffix',s={id:'fixture',localName:'raw.js',bytes:Buffer.byteLength(raw),sha256:hash(raw),excerpts:[{start:7,end:9,text:'目录',sha256:hash('目录')}]};
 try{fs.writeFileSync(path.join(own,'raw.js'),raw);fs.writeFileSync(path.join(shared,'raw.js'),'other');assert.deepEqual(collector.verifyAll({sources:[s]},own,shared),{sources:1,excerpts:1,errors:0});
  for(const mutate of [s=>s.excerpts[0].start++,s=>s.excerpts[0].sha256='0'.repeat(64),s=>s.sourceGroup='shared']){const bad=structuredClone(s);mutate(bad);assert.throws(()=>collector.verifyAll({sources:[bad]},own,shared),/mismatch/);}
  assert.throws(()=>collector.verifyAll({sources:[s,s]},own,shared),/duplicate/);assert.throws(()=>collector.verifyAll({sources:[{...s,sourceGroup:'unknown'}]},own,shared),/source group/);
  fs.appendFileSync(path.join(own,'raw.js'),'changed');assert.throws(()=>collector.verifyAll({sources:[s]},own,shared),/resource mismatch/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('DCS NFRs define measurement criteria and preserve all historical boundary IDs',()=>{
 const text=read('需求说明.md'),rows=[...text.matchAll(/^\| (DCS-NFR-\d{3}) \|.*$/gm)];assert.ok(rows.length>=15);assert.equal(rows.length,new Set(rows.map(m=>m[1])).size);
 for(const [row]of rows){assert.equal(row.split('|').slice(1,-1).length,6);assert.equal(row.split('|').at(-2).trim(),'未执行');}
 for(const [id]of published.main.boundaries)assert.ok(text.includes('| '+id+' |'));
});

test("DCS common augmenter refresh is byte-stable for both reviewed documents",()=>{
 const os=require("node:os"),{augmentFile}=require("../scripts/augment-requirement-specs");
 for(const name of files){const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dcs-refresh-")),file=path.join(dir,name),before=read(name);try{fs.writeFileSync(file,before);assert.equal(augmentFile(file,new Map()).changed,false);assert.equal(fs.readFileSync(file,"utf8"),before);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
});
