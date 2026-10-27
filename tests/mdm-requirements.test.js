const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'doc/requirements/19-元数据管理'),files=['需求说明.md','子页面与操作细化.md'];
const read=f=>fs.readFileSync(path.join(folder,f),'utf8'),published=require('../scripts/mdm-published-registry.json');
test('MDM preserves 19 requirements and 162 acceptance IDs with concrete nine-section contracts',()=>{
 const spec=require('../scripts/mdm-requirement-spec');let count=0;
 for(const [i,file]of files.entries()){
  const text=read(file),base=published[i?'sub':'main'];
  assert.deepEqual([...text.matchAll(/^### (MDM-\d{3})\b/gm)].map(m=>m[1]),base.entries.map(e=>e.id));
  const rows=[...text.matchAll(/^\| (MDM-AC-\d{3}) \|.*$/gm)];count+=rows.length;
  assert.deepEqual(rows.map(m=>m[1]),base.acceptance.map(a=>a.id));
  for(const [row,id]of rows){assert.equal(row.split('|').at(-2).trim(),'未执行');assert.equal(row.split('|').at(-3).trim(),base.acceptance.find(a=>a.id===id).requirement);}
  for(const e of i?spec.SUB:spec.MAIN){const block=text.split('### '+e.id+' ')[1].split(/^### |^## /m)[0];
   for(const [j,h]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(block.includes('#### '+(j+1)+'. '+h+'（'+e.id+'）'),e.id+' '+h);
   const fields=block.split('#### 1.')[1].split('#### 2.')[0].split('\n').filter(s=>s.startsWith('|')&&!s.startsWith('|---')&&!s.includes('字段名称与绑定名'));
   assert.ok(fields.length>=3,e.id);for(const row of fields)assert.equal(row.split('|').slice(1,-1).length,8);
   assert.ok(block.includes('/back/mdm/portal/'));assert.ok(block.includes('.png'));assert.ok(block.includes('结果未知'));
  }
 }assert.equal(count,162);
});
test('MDM distinguishes scheduler, execution, snapshots, approval, metadata IDs and import reversal',()=>{
 const text=files.map(read).join('\n'),audit=read('核查记录.md');
 for(const k of ['scheduleStatus','jobInstId','15～59','effectiveTimeSeclet','未来五次','metatableExtension','metaTableId','tableExtensionIds','applyStatus=2','applyStatus=3','changeMetaObjId','fromVersionId','logDetails','5 MiB','取消导入','主键','categoryId','closeRemark'])assert.ok(text.includes(k),k);
 for(const k of ['请求异常','104','尚无实测','外部依赖','未执行','登录','关闭备注','前端计算'])assert.ok(audit.includes(k),k);
 assert.doesNotMatch(text,/【|】|待确认|未观察到|https?:[/][/]/);
});
test('MDM renderer refuses missing IDs, association, evidence and frozen source rows',()=>{
 const spec=require('../scripts/mdm-requirement-spec');
 for(const [i,file]of files.entries()){
  const original=read(file),type=i?'sub':'main';assert.equal(spec.renderDocument(type,original),original);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^\| MDM-AC-\d{3} \|.*\n/m,'')),/acceptance/);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^### MDM-\d{3}.*\n/m,'')),/requirement IDs/);
  assert.throws(()=>spec.renderDocument(type,original.replace('<!-- 业务规格格式:plain-v1 -->','')),/format/);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^(\| MDM-AC-\d{3} \|.*\| )MDM-\d{3}( \| 未执行 \|)$/m,'$1MDM-999$2')),/association/);
  if(!i)assert.throws(()=>spec.renderDocument(type,original.replace(published.main.sourceRows[0],'')),/source rows/);
  if(i)assert.throws(()=>spec.renderDocument(type,original.replaceAll(published.sub.entries[0].sources[0],'missing.png')),/evidence/);
 }
});
test('MDM evidence rejects changed bytes, slices, groups and duplicate IDs',()=>{
 const crypto=require('node:crypto'),os=require('node:os'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 const data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/mdm-review-20261027/index.json'),'utf8'));
 assert.equal(data.publicStaticGets,49);assert.equal(data.applicationAcceptanceExecuted,false);assert.equal(data.businessRequestsByCollector,0);assert.ok(data.sources.length>=40);
 for(const s of data.sources){assert.ok(s.resourcePath.startsWith('/'));assert.ok(s.fetchedAt);for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.equal(hash(e.text),e.sha256);assert.doesNotMatch(e.text,/https?:[/][/]/);}}
 const collector=require('../scripts/prepare-mdm-evidence'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mdm-evidence-')),own=path.join(tmp,'own'),shared=path.join(tmp,'shared');fs.mkdirSync(own);fs.mkdirSync(shared);
 const raw='prefix 元数据 suffix',s={id:'fixture',localName:'raw.js',bytes:Buffer.byteLength(raw),sha256:hash(raw),excerpts:[{start:7,end:10,text:'元数据',sha256:hash('元数据')}]};
 try{fs.writeFileSync(path.join(own,'raw.js'),raw);fs.writeFileSync(path.join(shared,'raw.js'),'other');assert.deepEqual(collector.verifyAll({sources:[s]},own,shared),{sources:1,excerpts:1,errors:0});
  for(const mutate of [s=>s.excerpts[0].start++,s=>s.excerpts[0].sha256='0'.repeat(64),s=>s.sourceGroup='shared']){const bad=structuredClone(s);mutate(bad);assert.throws(()=>collector.verifyAll({sources:[bad]},own,shared),/mismatch/);}
  assert.throws(()=>collector.verifyAll({sources:[s,s]},own,shared),/duplicate/);assert.throws(()=>collector.verifyAll({sources:[{...s,sourceGroup:'unknown'}]},own,shared),/source group/);
  fs.appendFileSync(path.join(own,'raw.js'),'changed');assert.throws(()=>collector.verifyAll({sources:[s]},own,shared),/resource mismatch/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('MDM NFRs and historical operation boundaries stay explicit and unexecuted',()=>{
 const text=read('需求说明.md'),rows=[...text.matchAll(/^\| (MDM-NFR-\d{3}) \|.*$/gm)];assert.ok(rows.length>=15);assert.equal(rows.length,new Set(rows.map(m=>m[1])).size);
 for(const [row]of rows){assert.equal(row.split('|').slice(1,-1).length,6);assert.equal(row.split('|').at(-2).trim(),'未执行');}
 for(const row of published.main.boundaries)assert.ok(text.includes(row));
});
test('MDM common augmenter keeps both documents byte stable',()=>{
 const os=require('node:os'),{augmentFile}=require('../scripts/augment-requirement-specs');
 for(const name of files){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mdm-refresh-')),file=path.join(dir,name),before=read(name);try{fs.writeFileSync(file,before);assert.equal(augmentFile(file,new Map()).changed,false);assert.equal(fs.readFileSync(file,'utf8'),before);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
});

test('MDM version limits and mapping stored values follow exact source bindings',()=>{
 const spec=require('../scripts/mdm-requirement-spec'),evidence=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/mdm-review-20261027/index.json'),'utf8'));
 const version=evidence.sources.find(s=>s.id==='MDM-SRC-VIEW-metadata-manage-metaVersionComparison').excerpts.map(e=>e.text).join('');
 assert.ok(version.includes('maxlength:"100"'));assert.ok(version.includes('maxlength:"200"'));
 assert.ok(spec.PROFILES.version.fields.some(f=>f[0].includes('versionName')&&f[4]==='≤100'));
 assert.ok(spec.PROFILES.version.fields.some(f=>f[0].includes('description')&&f[4]==='≤200'));
 assert.equal(spec.PROFILES.versionForm.fields.length,3);assert.equal(spec.PROFILES.versionForm.api[0][2],'/back/mdm/portal/common/datasourceWithTables/list');
 const mapping=evidence.sources.find(s=>s.id==='MDM-SRC-VIEW-metadata-analyse-bloodManageList').excerpts.map(e=>e.text).join('');
 assert.ok(mapping.includes('audaqueSearchMixin.importStatus'));assert.ok(mapping.includes('value:0,label:"覆盖"'));
 const text=read('子页面与操作细化.md');assert.ok(text.includes('importType存储0覆盖/1补充'));assert.doesNotMatch(text,/importResult/);
});

test('MDM change applications retain nested field conversion and type-only change correction',()=>{
 const text=read('子页面与操作细化.md'),audit=read('核查记录.md'),index=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/mdm-review-20261027/index.json'),'utf8'));
 const source=index.sources.find(s=>s.id==='MDM-SRC-VIEW-metadata-manage-applyEdit').excerpts.map(e=>e.text).join('');
 for(const k of ['newItem','columnType!=a.columnType','newAddFields','updateFields','deleteFields'])assert.ok(source.includes(k),k);
 for(const k of ['updateFields为{newItem:字段对象}','nullable反转为notNull','纯类型修改不得漏记','空deleteDetail'])assert.ok(text.includes(k),k);
 assert.ok(audit.includes('MDM-C11'));
});
