const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const folder=path.join(root,'doc/requirements/12-数据直报');
const files=['需求说明.md','子页面与操作细化.md'];
const read=name=>fs.readFileSync(path.join(folder,name),'utf8');
const published=require('../scripts/gdrs-published-registry.json');
test('GDRS preserves all 38 requirement IDs and 309 acceptance IDs with nine complete sections',()=>{
  const spec=require('../scripts/gdrs-requirement-spec');
  for(const [i,file]of files.entries()){
    const text=read(file),base=published[i?'sub':'main'];
    assert.deepEqual([...text.matchAll(/^### (GDRS-\d{3})\b/gm)].map(m=>m[1]),base.entries.map(e=>e.id));
    const cases=[...text.matchAll(/^\| (GDRS-AC-\d{3}) \|.*$/gm)];
    assert.deepEqual(cases.map(m=>m[1]),base.acceptance.map(a=>a.id));
    assert.equal(new Set(cases.map(m=>m[1])).size,cases.length);
    for(const [row]of cases)assert.equal(row.split('|').at(-2).trim(),'未执行');
    for(const e of i?spec.SUB:spec.MAIN){
      const block=text.split('### '+e.id+' ')[1].split(/^### |^## /m)[0];
      for(const [j,h]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(block.includes('#### '+(j+1)+'. '+h+'（'+e.id+'）'),e.id+' '+h);
      const fields=block.split('#### 1.')[1].split('#### 2.')[0].split('\n').filter(s=>s.startsWith('|')&&!s.startsWith('|---')&&!s.includes('字段名称与绑定名'));
      assert.ok(fields.length>=3,e.id);for(const row of fields){const c=row.split('|').slice(1,-1);assert.equal(c.length,8);assert.ok(c[0].trim());}
      assert.ok(block.includes('/back/gdrs/base/'));assert.ok(block.includes('.png'));assert.ok(block.includes('允许访问本页面'));
    }
  }
  assert.equal(published.main.acceptance.length+published.sub.acceptance.length,309);
});
test('GDRS preserves traceability and rejects lost IDs, format and source rows during refresh',()=>{
  const spec=require('../scripts/gdrs-requirement-spec'),{augmentFile}=require('../scripts/augment-requirement-specs'),os=require('node:os');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gdrs-spec-'));
  try{for(const [i,file]of files.entries()){
    const original=read(file),type=i?'sub':'main';assert.equal(spec.renderDocument(type,original),original);
    const copy=path.join(temp,file);fs.writeFileSync(copy,original);augmentFile(copy,new Map());assert.equal(fs.readFileSync(copy,'utf8'),original);
    assert.throws(()=>spec.renderDocument(type,original.replace(/^\| GDRS-AC-\d{3} \|.*\n/m,'')),/acceptance/);
    assert.throws(()=>spec.renderDocument(type,original.replace(/^### GDRS-\d{3}.*\n/m,'')),/requirement IDs/);
    assert.throws(()=>spec.renderDocument(type,original.replace('<!-- 业务规格格式:plain-v1 -->','')),/format/);
    if(!i)assert.throws(()=>spec.renderDocument(type,original.replace(/^\| GDRS-100 \| \[F244.*\n/m,'')),/source rows/);
  }}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('GDRS uses distinct option limits, upload branches, download key and side-effect semantics',()=>{
  const spec=require('../scripts/gdrs-requirement-spec'),all=files.map(read).join('\n'),audit=read('核查记录.md');
  for(const key of ['descrption','1～50','1～100','result.rows/result.total','useTemplates=0','unstructFile[]','excelFileList[]','localFileName','recordMode=2','result.datas/result.total','adq=businessId','fileName=encryptPublicKey','approveId','notifyDeptUserList','timingCron','有限超时','结果未知'])assert.ok(all.includes(key),key);
  assert.ok(spec.PROFILES.semiTask.api.some(r=>r[2]==='/structured/insertIntoDataBase.do'));
  assert.ok(spec.PROFILES.fileNotify.api.some(r=>r[2]==='/notifyTask/updateNotifyTask.do'));
  for(const key of ['H-GDRS-013','GET','登录','外部依赖','新增','尚无实测','未执行'])assert.ok(audit.includes(key),key);
});
test('GDRS source index is relative and verifies exact slices without evaluating bundles',()=>{
  const crypto=require('node:crypto'),data=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/gdrs-review-20261027/index.json'),'utf8'));
  assert.equal(data.applicationAcceptanceExecuted,false);assert.equal(data.publicStaticGets,108);assert.equal(data.businessRequestsByCollector,0);assert.ok(data.sources.length>=90);
  for(const s of data.sources){assert.ok(s.resourcePath.startsWith('/'));assert.ok(s.fetchedAt);for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.equal(crypto.createHash('sha256').update(e.text).digest('hex'),e.sha256);assert.doesNotMatch(e.text,/https?:[/][/]/);}}
  const source=prefix=>data.sources.find(s=>s.id==='GDRS-SRC-'+prefix).excerpts.map(e=>e.text).join('\n');
  assert.match(source('VIEW-gdrs-categoryManageEdit'),/descrption/);assert.match(source('VIEW-semiStructured-dataReportingImport'),/GET_SHEET_INFO/);assert.match(source('VIEW-message-public'),/UPDATE_MESSAGE_STGATE/);
  assert.match(source('VIEW-gdrs-structTemplateManage'),/fileName:.*encryptPublicKey/);assert.match(source('APP'),/responseType:"blob"/);
  assert.ok(source('CRYPTO').includes('encryptPublicKey(e,t,r="RSA-OAEP"'));
  assert.ok(source('CRYPTO').includes('mgf1:{md:i.md.sha256.create()}'));
  assert.match(source('CRYPTO'),/encodeUtf8/);assert.match(source('CRYPTO'),/encode64/);
  assert.ok(read('子页面与操作细化.md').includes('OAEP与MGF1均SHA-256'));
});
test('GDRS retains historical acceptance intent and correct main five-column associations',()=>{
  const text=read('需求说明.md');
  const expected=['100','100','102','102','001','100','100','102','102','102','102','102','102','001'];
  for(const [i,id]of expected.entries()){
    const ac='GDRS-AC-'+String(i+1).padStart(3,'0');
    const row=text.split('\n').find(s=>s.startsWith('| '+ac+' |'));
    assert.equal(row.split('|').at(-3).trim(),'GDRS-'+id);
  }
  for(const key of ['63、64、65','254、255、256','先发条件A再发B','任一指标加载失败时显示未取得数据'])assert.ok(text.includes(key),key);
});
test('GDRS rejects altered original, excerpt offset, hash, duplicate identity and source group',()=>{
  const collector=require('../scripts/prepare-gdrs-evidence'),crypto=require('node:crypto'),os=require('node:os'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gdrs-evidence-')),own=path.join(tmp,'own'),shared=path.join(tmp,'shared');fs.mkdirSync(own);fs.mkdirSync(shared);
  const raw='prefix 工作表 suffix',source={id:'fixture',localName:'raw.js',bytes:Buffer.byteLength(raw),sha256:hash(raw),excerpts:[{start:7,end:10,text:'工作表',sha256:hash('工作表')}]};
  try{fs.writeFileSync(path.join(own,'raw.js'),raw);fs.writeFileSync(path.join(shared,'raw.js'),'other');assert.deepEqual(collector.verifyAll({sources:[source]},own,shared),{sources:1,excerpts:1,errors:0});
    for(const mutate of [s=>s.excerpts[0].start++,s=>s.excerpts[0].sha256='0'.repeat(64),s=>s.sourceGroup='shared']){const s=structuredClone(source);mutate(s);assert.throws(()=>collector.verifyAll({sources:[s]},own,shared),/mismatch/);}
    assert.throws(()=>collector.verifyAll({sources:[source,source]},own,shared),/duplicate/);assert.throws(()=>collector.verifyAll({sources:[{...source,sourceGroup:'unknown'}]},own,shared),/source group/);
    fs.appendFileSync(path.join(own,'raw.js'),'changed');assert.throws(()=>collector.verifyAll({sources:[source]},own,shared),/resource mismatch/);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('GDRS business documents use reviewed specifications and separate investigation',()=>{
  for(const file of files){const text=read(file);assert.ok(text.includes('<!-- 业务规格格式:plain-v1 -->'));assert.ok(text.includes('./核查记录.md'));assert.doesNotMatch(text,/【|】|待确认|未观察到|https?:[/][/]/);}
});
test('GDRS quality targets have separate IDs, measurable criteria and unexecuted status',()=>{
  const rows=[...read('需求说明.md').matchAll(/^\| (GDRS-NFR-\d{3}) \|.*$/gm)];
  assert.ok(rows.length>=14);assert.equal(new Set(rows.map(m=>m[1])).size,rows.length);
  for(const [row] of rows){assert.equal(row.split('|').slice(1,-1).length,6);assert.equal(row.split('|').at(-2).trim(),'未执行');}
});
