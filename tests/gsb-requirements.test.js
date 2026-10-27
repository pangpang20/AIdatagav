const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'doc/requirements/16-数据服务支撑');
const files=['需求说明.md','子页面与操作细化.md'];
const read=name=>fs.readFileSync(path.join(folder,name),'utf8');
const catalog=require('../scripts/gsb-requirement-catalog.json');
const spec=require('../scripts/gsb-requirement-spec');
const evidence=require('../doc/requirements/evidence/gsb-review-20261027/index.json');
const source=id=>evidence.sources.find(s=>s.id==='GSB-SRC-'+id).excerpts.map(e=>e.text).join('\n');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');

test('GSB preserves 12 published features and 96 ordered unexecuted cases with concrete nine-part specifications',()=>{
  const all=files.map(read).join('\n');
  assert.doesNotMatch(all,/【|】|待确认|未观察到|https?:\/\//);
  const cases=[...all.matchAll(/^\| (GSB-AC-\d{3}) \|.*$/gm)];
  assert.equal(cases.length,96);assert.equal(new Set(cases.map(m=>m[1])).size,96);
  assert.deepEqual(cases.map(m=>m[1]),[...catalog.mainCases,...catalog.subCases]);
  for(const row of cases)assert.equal(row[0].split('|').at(-2).trim(),'未执行');
  assert.deepEqual([...all.matchAll(/^### (GSB-\d{3})\b/gm)].map(m=>m[1]),[...spec.MAIN,...spec.SUB].map(e=>e.id));
  for(const entry of [...spec.MAIN,...spec.SUB]){
    const text=spec.MAIN.includes(entry)?read(files[0]):read(files[1]);
    const block=text.split('### '+entry.id+' ')[1].split(/^### |^## /m)[0];
    for(const [i,label]of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档','非功能性需求'].entries())assert.ok(block.includes(`#### ${i+1}. ${label}（${entry.id}）`));
    const rows=block.split('#### 1. 页面字段清单')[1].split('#### 2. 页面交互规则')[0].split('\n').filter(r=>r.startsWith('|')&&!r.startsWith('|---')&&!r.includes('字段名称与绑定名'));
    assert.ok(rows.length>=4,entry.id);
    for(const row of rows){const cells=row.split('|').slice(1,-1);assert.equal(cells.length,8);assert.ok(cells[0].trim());}
    for(const ref of entry.sources)assert.ok(block.includes('../evidence/'+ref),entry.id+' '+ref);
    assert.ok(block.includes('/back/gsb/platform/'));
    assert.equal(spec.PROFILES[entry.kind].checks.length,5);
  }
});

test('GSB registry, historical evidence and research archive retain their identities',()=>{
  const registry=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/采样清单.json'),'utf8'));
  const module=registry.modules.find(m=>m.code==='GSB');
  assert.deepEqual(module.businessRequirements.map(e=>e.id),spec.MAIN.map(e=>e.id));
  assert.deepEqual(registry.deepDive.find(m=>m.code==='GSB').requirements.map(e=>e.id),spec.SUB.map(e=>e.id));
  assert.equal(module.developmentReview.functionalSpecifications,12);
  assert.equal(module.developmentReview.functionalAcceptanceCases,96);
  assert.equal(module.developmentReview.nonfunctionalRequirements,16);
  assert.equal(module.developmentReview.applicationAcceptanceExecuted,false);
  assert.equal(module.developmentReview.productionReady,false);
  assert.equal(module.researchSha256,catalog.researchSha256);
  assert.equal(hash(fs.readFileSync(path.join(folder,'调研记录.md'))),catalog.researchSha256);
  for(const [name,digest]of Object.entries(catalog.historicalFiles))assert.equal(hash(fs.readFileSync(path.join(root,'doc/requirements/evidence',name))),digest,name);
});

test('GSB preserves actual API, parameter and lifecycle distinctions against literal source',()=>{
  const all=files.map(read).join('\n');
  assert.match(source('MANAGE'),/serviceStatus:2==e\?1:2/);
  assert.match(source('MANAGE'),/serviceRunStatus:2==e\?1:2/);
  assert.match(source('MANAGE'),/"active-value":2,"inactive-value":!1/);
  assert.match(all,/不能声称已验证2就是启动\/上架/);
  assert.match(source('TABLE'),/queryDynamicParamList\)\(\{serviceRegId:e\}/);
  assert.match(source('API'),/serviceRegType:3,serviceRegResponseType:1/);
  assert.match(source('APP'),/label:"不等于",value:"!="/);
  assert.match(spec.PROFILES.table.fields.find(r=>r[0]==='匹配 mateType')[4],/!=/);
  assert.doesNotMatch(spec.PROFILES.table.fields.find(r=>r[0]==='匹配 mateType')[4],/between/);
  for(const kind of ['table','api'])assert.match(spec.PROFILES[kind].fields.map(r=>r.join(' ')).join(' '),/严格<5 MiB/);
  assert.match(source('CONSUMPTION'),/consumptionTest/);assert.match(source('CONSUMPTION'),/targetProtocal/);
  assert.match(all,/可能产生真实下游写入/);assert.match(all,/申请id与serviceId不能互换/);
  assert.match(source('APPROVAL-API'),/"\/task\/reject","POST"/);
  assert.equal(spec.PROFILES.approval.requests.find(r=>r[0]==='驳回')[2],'/back/gsb/platform/task/reject');
  assert.match(all,/approveType1\/2与历史action2\/3不混用/);
  assert.match(source('CONTROL-API'),/"\/serviceAccessConfig\/"\+e,"PUT",t/);
  assert.match(source('CONFIG-API'),/datasourceId|scanresource/);
});

test('GSB known validation, selection and deployment gaps are explicit target corrections',()=>{
  const all=files.map(read).join('\n'),audit=read('核查记录.md');
  assert.match(source('IP-DETAIL'),/currentRow:\{\}/);assert.match(all,/每次新增清currentRow和id/);
  assert.match(source('VISIT'),/validityDate:\[\]/);assert.match(all,/清除时安全置空两端/);
  assert.match(all,/1～99999正整数/);assert.match(all,/先从当前策略回填所有值/);
  assert.match(source('DEPLOY'),/eval\(regstr\)/);assert.match(all,/安全替换不使用eval/);
  assert.match(source('CONFIG'),/resourceIds:\[\]/);assert.match(all,/打开弹窗重置筛选、分页和resourceIds/);
  for(const text of ['currentRow','resourceIds','eval','fileKey','5MiB','OR','202','GSB-C07'])assert.ok(audit.includes(text),text);
  assert.match(all,/between消费时|between拆|between.*兼容/);
  assert.match(all,/0\/false/);assert.match(all,/未知结果先/);
});

test('GSB quality matrix defines 16 measurable targets without fabricated application results',()=>{
  const main=read(files[0]),audit=read('核查记录.md');
  const rows=[...main.matchAll(/^\| (GSB-NFR-\d{3}) \|.*$/gm)];
  assert.equal(rows.length,16);assert.deepEqual(rows.map(m=>m[1]),spec.NFR.map(r=>'GSB-NFR-'+r[0]));
  for(const row of rows){assert.equal(row[0].split('|').slice(1,-1).length,6);assert.equal(row[0].split('|').at(-2).trim(),'未执行');}
  for(const text of ['30个独立用户','≥500请求','ceil','P99','20Mbit/s','RTT50ms','200%','1%','100次'])assert.ok(main.includes(text),text);
  for(const text of ['未执行','本轮新增','后端','登录','没有压测'])assert.ok(audit.includes(text),text);
  assert.equal(evidence.applicationAcceptanceExecuted,false);assert.equal(evidence.businessRequestsByCollector,0);
});

test('GSB refresh is byte-identical and rejects missing or reordered ledgers, evidence and fabricated passes',()=>{
  const {augmentFile}=require('../scripts/augment-requirement-specs');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gsb-spec-'));
  try{for(const [index,name]of files.entries()){
    const type=index?'sub':'main',original=read(name);
    assert.equal(spec.renderDocument(type,original),original);
    const file=path.join(tmp,name);fs.writeFileSync(file,original);augmentFile(file,new Map());assert.equal(fs.readFileSync(file,'utf8'),original);
    for(const [changed,reason]of [
      [original.replace(/^\| GSB-AC-\d{3} \|.*\n/m,''),/acceptance/],
      [original.replace(/^### GSB-\d{3}.*\n/m,''),/registry/],
      [original.replace('<!-- 业务规格格式:plain-v1 -->',''),/format/],
      [original.replace(/^\| GSB-AC-\d{3} \|.*$/m,r=>r.replace('未执行','通过')),/status/],
      [original.replace(catalog[type+'Cases'][0],catalog[type+'Cases'][1]),/acceptance/],
    ])assert.throws(()=>spec.renderDocument(type,changed),reason);
    const first=type==='main'?spec.MAIN[0]:spec.SUB[0],ref='../evidence/'+first.sources[0];
    assert.throws(()=>spec.renderDocument(type,original.replaceAll(ref,'missing-evidence')),/source/);
    if(!index){
      assert.throws(()=>spec.renderDocument(type,original.replace(/^\| GSB-NFR-001 \|.*\n/m,'')),/quality/);
      assert.throws(()=>spec.renderDocument(type,original.replace('| GSB-NFR-001 |','| GSB-NFR-002 |')),/quality/);
      assert.throws(()=>spec.renderDocument(type,original.replace(/^\| GSB-NFR-001 \|.*$/m,r=>r.replace('未执行','通过'))),/status/);
    }
  }}finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('GSB evidence retains acquisition provenance, source identities and literal slices',()=>{
  const collector=require('../scripts/prepare-gsb-evidence');
  assert.equal(evidence.publicStaticGets,49);assert.equal(evidence.sources.length,26);
  assert.equal(evidence.sources.reduce((n,s)=>n+s.excerpts.length,0),38);
  assert.equal(new Set(evidence.sources.map(s=>s.id)).size,evidence.sources.length);
  for(const s of evidence.sources){assert.ok(s.resourcePath.startsWith('/'));assert.match(s.fetchedAt,/2026-10-2[67]T/);for(const e of s.excerpts){assert.equal(e.end-e.start,e.text.length);assert.equal(hash(e.text),e.sha256);assert.doesNotMatch(e.text,/https?:\/\//);}}
  assert.throws(()=>collector.verifyAll({sources:[{id:'bad',sourceGroup:'other'}]},'.','.'),/source group/);
  assert.throws(()=>collector.verifyAll({sources:[{id:'same'},{id:'same'}]},'.','.'),/duplicate/);
});

test('GSB evidence validation rejects tampered raw bytes, offsets, hashes and swapped groups',()=>{
  const {verifyAll}=require('../scripts/prepare-gsb-evidence');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gsb-evidence-')),own=path.join(tmp,'own'),shared=path.join(tmp,'shared');
  fs.mkdirSync(own);fs.mkdirSync(shared);const raw='prefix 服务字段 suffix';
  const s={id:'fixture',localName:'raw.js',bytes:Buffer.byteLength(raw),sha256:hash(raw),excerpts:[{start:7,end:11,text:'服务字段',sha256:hash('服务字段')}]};
  try{
    fs.writeFileSync(path.join(own,'raw.js'),raw);fs.writeFileSync(path.join(shared,'raw.js'),'wrong group');
    assert.deepEqual(verifyAll({sources:[s]},own,shared),{sources:1,excerpts:1,errors:0});
    for(const mutate of [x=>x.excerpts[0].start++,x=>x.excerpts[0].sha256='0'.repeat(64),x=>x.sourceGroup='shared']){
      const bad=structuredClone(s);mutate(bad);assert.throws(()=>verifyAll({sources:[bad]},own,shared),/mismatch/);
    }
    fs.appendFileSync(path.join(own,'raw.js'),' altered');assert.throws(()=>verifyAll({sources:[s]},own,shared),/resource mismatch/);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
