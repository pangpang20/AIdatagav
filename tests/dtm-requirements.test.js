const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'doc/requirements/25-数据表管理'),files=['需求说明.md','子页面与操作细化.md'];
const read=f=>fs.readFileSync(path.join(folder,f),'utf8'),published=require('../scripts/dtm-published-registry.json');
test('DTM preserves 7 requirements and 56 acceptance IDs with concrete nine-section contracts',()=>{
 const spec=require('../scripts/dtm-requirement-spec');let count=0;
 for(const [i,file]of files.entries()){
  const text=read(file),base=published[i?'sub':'main'];
  assert.deepEqual([...text.matchAll(/^### (DTM-\d{3})\b/gm)].map(m=>m[1]),base.entries.map(e=>e.id));
  const rows=[...text.matchAll(/^\| (DTM-AC-\d{3}) \|.*$/gm)];count+=rows.length;
  assert.deepEqual(rows.map(m=>m[1]),base.acceptance.map(a=>a.id));
  for(const [row,id]of rows){assert.equal(row.split('|').at(-2).trim(),'未执行');assert.equal(row.split('|').at(-3).trim(),base.acceptance.find(a=>a.id===id).requirement);}
  for(const e of i?spec.SUB:spec.MAIN){const block=text.split('### '+e.id+' ')[1].split(/^### |^## /m)[0];
   for(const [j,h]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(block.includes('#### '+(j+1)+'. '+h+'（'+e.id+'）'),e.id+' '+h);
   const fields=block.split('#### 1.')[1].split('#### 2.')[0].split('\n').filter(s=>s.startsWith('|')&&!s.startsWith('|---')&&!s.includes('字段名称与绑定名'));
   assert.ok(fields.length>=3,e.id);for(const row of fields)assert.equal(row.split('|').slice(1,-1).length,8);
   assert.ok(block.includes('/back/dtm/portal/'));assert.ok(block.includes('.png'));assert.ok(block.includes('结果未知'));
  }
 }assert.equal(count,56);
});
test('DTM contracts retain source-specific identifiers and operation boundaries',()=>{
 const text=files.map(read).join('\n'),audit=read('核查记录.md');
 for(const k of ['dataSourceIds','obscureName','dataSourcePort','tableRemark','tableTypeIds','begainTime','beginDate','metaColumnId','TABLE/COLUMN','65535','myWorkFlowFrom','applyHistoryId','beforPrincipalId','bizType:2','readExample','10MB','hasDelete','2/4/8/16'])assert.ok(text.includes(k),k);
 for(const k of ['DTM-C16','N-DTM-003','V-DTM-003','未执行压测','外部依赖','未执行','登录','立即上传','36项','34个来源','98个片段'])assert.ok(audit.includes(k),k);
 assert.doesNotMatch(text,/【|】|待确认|未观察到|https?:[/][/]/);
});
test('DTM renderer refuses missing IDs, association, evidence and frozen source rows',()=>{
 const spec=require('../scripts/dtm-requirement-spec');
 for(const [i,file]of files.entries()){
  const original=read(file),type=i?'sub':'main';assert.equal(spec.renderDocument(type,original),original);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^(\| DTM-AC-\d{3} \|.*\| )未执行( \|)$/m,'$1通过$2')),/unexecuted/);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^\| DTM-AC-\d{3} \|.*\n/m,'')),/acceptance/);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^### DTM-\d{3}.*\n/m,'')),/requirement IDs/);
  assert.throws(()=>spec.renderDocument(type,original.replace('<!-- 业务规格格式:plain-v1 -->','')),/format/);
  assert.throws(()=>spec.renderDocument(type,original.replace(/^(\| DTM-AC-\d{3} \|.*\| )DTM-\d{3}( \| 未执行 \|)$/m,'$1DTM-999$2')),/association/);
  if(!i){assert.throws(()=>spec.renderDocument(type,original.replace(published.main.sourceRows[0],'')),/source rows/);assert.throws(()=>spec.renderDocument(type,original.replace(/^\| DTM-NFR-\d{3} \|.*\n/m,'')),/NFR ledger/);assert.throws(()=>spec.renderDocument(type,original.replace(published.main.boundaries[0],'')),/boundary/);}
  if(i)assert.throws(()=>spec.renderDocument(type,original.replaceAll(published.sub.entries[0].sources[0],'missing.png')),/evidence/);
 }
});
test('DTM evidence rejects changed bytes, slices, groups and duplicate IDs',()=>{
 const crypto=require('node:crypto'),os=require('node:os'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 const data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/dtm-review-20261027/index.json'),'utf8'));
 assert.equal(data.publicStaticGets,36);assert.equal(data.applicationAcceptanceExecuted,false);assert.equal(data.businessRequestsByCollector,0);assert.equal(data.sources.length,34);
 for(const s of data.sources){assert.ok(s.resourcePath.startsWith('/'));assert.ok(s.fetchedAt);for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.equal(hash(e.text),e.sha256);assert.doesNotMatch(e.text,/https?:[/][/]/);}}
 const collector=require('../scripts/prepare-dtm-evidence'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dtm-evidence-')),own=path.join(tmp,'own'),shared=path.join(tmp,'shared');fs.mkdirSync(own);fs.mkdirSync(shared);
 const raw='prefix 元数据 suffix',s={id:'fixture',localName:'raw.js',bytes:Buffer.byteLength(raw),sha256:hash(raw),excerpts:[{start:7,end:10,text:'元数据',sha256:hash('元数据')}]};
 try{fs.writeFileSync(path.join(own,'raw.js'),raw);fs.writeFileSync(path.join(shared,'raw.js'),'other');assert.deepEqual(collector.verifyAll({sources:[s]},own,shared),{sources:1,excerpts:1,errors:0});
  for(const mutate of [s=>s.excerpts[0].start++,s=>s.excerpts[0].sha256='0'.repeat(64),s=>s.sourceGroup='shared']){const bad=structuredClone(s);mutate(bad);assert.throws(()=>collector.verifyAll({sources:[bad]},own,shared),/mismatch/);}
  assert.throws(()=>collector.verifyAll({sources:[s],applicationAcceptanceExecuted:true},own,shared),/unexecuted/);
  assert.throws(()=>collector.verifyAll({sources:[s],businessRequestsByCollector:1},own,shared),/business requests/);
  assert.throws(()=>collector.verifyAll({sources:[s,s]},own,shared),/duplicate/);assert.throws(()=>collector.verifyAll({sources:[{...s,sourceGroup:'unknown'}]},own,shared),/source group/);
  fs.appendFileSync(path.join(own,'raw.js'),'changed');assert.throws(()=>collector.verifyAll({sources:[s]},own,shared),/resource mismatch/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('DTM NFRs and historical operation boundaries stay explicit and unexecuted',()=>{
 const text=read('需求说明.md'),rows=[...text.matchAll(/^\| (DTM-NFR-\d{3}) \|.*$/gm)];assert.equal(rows.length,16);assert.equal(rows.length,new Set(rows.map(m=>m[1])).size);
 for(const [row]of rows){assert.equal(row.split('|').slice(1,-1).length,6);assert.equal(row.split('|').at(-2).trim(),'未执行');}
 for(const row of published.main.boundaries)assert.ok(text.includes(row));
});
test('DTM common augmenter keeps both documents byte stable',()=>{
 const os=require('node:os'),{augmentFile}=require('../scripts/augment-requirement-specs');
 for(const name of files){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dtm-refresh-')),file=path.join(dir,name),before=read(name);try{fs.writeFileSync(file,before);assert.equal(augmentFile(file,new Map()).changed,false);assert.equal(fs.readFileSync(file,'utf8'),before);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
});

test('DTM critical contracts are bound to exact source excerpts',()=>{
 const spec=require('../scripts/dtm-requirement-spec');
 const evidence=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/dtm-review-20261027/index.json'),'utf8'));
 const source=id=>{const x=evidence.sources.find(s=>s.id==='DTM-SRC-'+id);assert.ok(x,id);return x.excerpts.map(e=>e.text).join('\n');};
 const apply=source('VIEW-warehouseResources-applicationInformation');
 for(const k of ['maxlength:32','maxlength:200','limit:2','e.size/1024/1024>10','t.append("file",e.file)','begainTime','permissionType=2','applyType=1','deletefile.push'])assert.ok(apply.includes(k),k);
 const grant=source('VIEW-authorizationManage-edit');
 for(const k of ['pageSize:65535','columnId:e.id','permissionType:2','id:1,name:"读表数据"','id:4,name:"改表结构"','e.join(",")'])assert.ok(grant.includes(k),k);
 const edit=source('VIEW-authorizationManage-authorizedInformationEdit');
 for(const k of ['id:2,name:"读表数据"','id:16,name:"改表结构"','value:"TABLE"','value:"COLUMN"','metaColumnId:e.id','beginDate=e[0]'])assert.ok(edit.includes(k),k);
 const my=source('VIEW-myApplication');assert.ok(my.includes('procInstId:e.bizCode,id:e.formId'));assert.ok(my.includes('1==t.row.bizInfo'));
 const api=source('API-moduleName-myApplication');assert.ok(api.includes('/workflow/myWorkFlowFrom'));assert.ok(api.includes('/workflow/revoke","POST"'));
 assert.ok(source('VIEW-approvalCentre-edit').includes('comment:"",approvalStatus:2'));
 assert.ok(source('VIEW-myResources-transferInformation').includes('maxlength:200'));
 assert.ok(source('API-moduleName-myResources').includes('bizType:2'));
 assert.ok(source('BRIDGE').includes('n.d(e,"d",(function(){return c}))'));
 const grants=source('VIEW-authorizationManage');assert.ok(grants.includes('Object(n.selectList)()'));assert.ok(grants.includes('key:"accredit1"'));assert.ok(grants.includes('attrs:{filterable:"",clearable:"",multiple:""'));
 assert.ok(spec.PROFILES.grants.api.some(a=>a[1]==='DELETE'&&a[2].endsWith('/datatablepermission/{id}')));
 assert.ok(spec.PROFILES.applications.api.some(a=>a[1]==='POST'&&a[2].endsWith('/workflow/revoke')));
 assert.ok(evidence.sources.every(s=>!s.localName.includes('businessName')));
});
