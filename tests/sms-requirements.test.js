const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'doc/requirements/09-任务编排与调度');
const registry=require('../scripts/sms-published-registry.json');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
test('SMS preserves every published requirement, acceptance ID, association and source',()=>{
  for(const [type,file]of [['main','需求说明.md'],['sub','子页面与操作细化.md']]){
    const s=read(file),old=registry[type];
    assert.match(s,/<!-- sms:generated-spec-v1 -->/);
    assert.deepEqual([...s.matchAll(/^### (SMS-\d{3}) /gm)].map(m=>m[1]),old.entries.map(e=>e.id));
    assert.deepEqual([...s.matchAll(/^\| (SMS-AC-\d+) \|/gm)].map(m=>m[1]),old.allAcceptance);
    for(const e of old.entries){const block=s.split('### '+e.id+' ')[1].split(/\n### |\n## /)[0];for(const source of e.sources)assert.ok(block.includes(source+'.png'),source);}
    for(const row of old.sourceRows)assert.ok(s.includes(row),'published source row');
    for(const row of s.split('\n').filter(x=>/^\| SMS-AC-/.test(x)))assert.match(row,/\| 未执行 \|$/);
    assert.doesNotMatch(s,/【(?:页面观察|拟定需求|待确认)】|^\|(?:\s*\|){8}$/m);
  }
  assert.equal(registry.main.entries.length+registry.sub.entries.length,41);
  assert.equal(registry.main.allAcceptance.length+registry.sub.allAcceptance.length,330);
});
test('SMS specification captures operational safety and distinct object states',()=>{
  const s=read('子页面与操作细化.md').replaceAll('&#124;','|');
  for(const text of ['先保存','第二步失败','逐项','code===0','eventType=2','5|6|61','添加分类','categoryinfo','saveInit','Base64','结果未知'])assert.ok(s.includes(text),text);
  const note=read('核查记录.md');for(const section of ['## 核查结论','## 外部依赖','## 验证状态'])assert.ok(note.includes(section));
  assert.ok(read('需求说明.md').includes('SMS-NFR-016'));
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'调研记录.md'))).digest('hex'),'412a1006e2da10975b7fe51f4f6a1a4ab99db7b834066985e1d168efc46bb0aa');
});
test('SMS regenerates deterministically and refuses damaged published ledgers',()=>{
  const spec=require('../scripts/sms-requirement-spec');
  for(const [file,render]of [['需求说明.md',spec.renderMain],['子页面与操作细化.md',spec.renderSub]]){
    const s=read(file);assert.equal(render(s),s);
    assert.throws(()=>render(s.replace(/\| SMS-AC-\d+ \|[^\n]+\n/,'')),/acceptance/);
    assert.throws(()=>render(s.replace(/(\| SMS-AC-\d+ \|[^\n]+\n)/,'$1$1')),/acceptance/);
    assert.throws(()=>render(s.replace(/(\| SMS-AC-\d+ \|[^\n]+\| )SMS-\d{3}( \| 未执行 \|)/,'$1SMS-999$2')),/association/);
  }
});
test('SMS refresh and legacy source supplement cannot restore superseded templates',()=>{
  const {augmentFile}=require('../scripts/augment-requirement-specs');
  const {reviewedSupplement}=require('../scripts/prepare-source-review');
  const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'sms-refresh-'));
  try{
    const moduleDir=path.join(temp,'09-任务编排与调度');fs.mkdirSync(moduleDir);
    for(const file of ['需求说明.md','子页面与操作细化.md']){
      const target=path.join(moduleDir,file);fs.writeFileSync(target,read(file));
      process.argv.push('--refresh');try{augmentFile(target);}finally{process.argv.pop();}
      assert.equal(fs.readFileSync(target,'utf8'),read(file));
    }
    assert.equal(reviewedSupplement(temp,'09-任务编排与调度'),read('源码核对补充.md'));
    assert.equal(reviewedSupplement(temp,'07-数据源管理'),null);
  }finally{fs.rmSync(temp,{recursive:true});}
});
test('SMS evidence detects altered originals and excerpts without application calls',()=>{
  const {verify}=require('../scripts/prepare-sms-evidence');
  const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'sms-test-'));
  const raw='data:function(){return {name:"test"}}';
  const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
  fs.writeFileSync(path.join(temp,'sample.js'),raw);
  const idx={sources:[{id:'test',localName:'sample.js',bytes:Buffer.byteLength(raw),sha256:sha(raw),excerpts:[{start:0,end:4,text:'data',sha256:sha('data')}]}]};
  try{assert.equal(verify(idx,temp).errors,0);const changed=structuredClone(idx);changed.sources[0].excerpts[0].text='fake';assert.throws(()=>verify(changed,temp),/excerpt mismatch/);fs.appendFileSync(path.join(temp,'sample.js'),'!');assert.throws(()=>verify(idx,temp),/resource mismatch/);}finally{fs.rmSync(temp,{recursive:true});}
});
test('SMS rules trace to static source and every functional profile has linked NFRs',()=>{
  const index=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/sms-review-20261027/index.json'),'utf8'));
  assert.equal(index.businessRequests,0);assert.equal(index.newScreenshots,0);assert.equal(index.applicationAcceptanceExecuted,false);
  const source=Object.fromEntries(index.sources.map(s=>[s.id,s.excerpts.map(e=>e.text).join('\n')]));
  for(const [key,values]of Object.entries({SETTING:['strategy_options','eventType_options','requestSettingFlowStrategy','batchSettings'],CATEGORY:['storageFlag','categoryLevel','r.length>10'],PERIODIC:['statusList:[1]','5|6|61'],REALTIME:['beginStartTime'],'REALTIME-API':['flowRealTimeList'],'CODE-EDIT':['audaqueSubmitMixin','deleteCodeId','standardTypeFlag'],'GL-FUNCTION-EDIT':['new FormData','ruleExpr','saveOrUpdateFunctionRuleByMppdb'],'IDE-INIT':['saveInit','initBegin','findInitRuLog'],'COMPONENT-EDIT':['handleSystemChange','executorKeyChange'],ENV:['testRds','rdsDbType']})){
    for(const value of values)assert.ok(source['SMS-SRC-'+key].includes(value),key+': '+value);
  }
  const spec=require('../scripts/sms-requirement-spec');
  for(const entry of [...spec.MAIN,...spec.SUB]){
    const block=spec.renderFeature(entry);
    assert.equal([...block.matchAll(/^#### \d+\./gm)].length,9);
    for(const key of spec.PROFILES[entry.kind].sources)assert.ok(source['SMS-SRC-'+key],entry.id+': '+key);
    assert.ok(block.includes('SMS-NFR-015'));
  }
  assert.equal(spec.NFRS.length,16);
});
