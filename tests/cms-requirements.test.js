const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'doc/requirements/05-构件管理');
const spec=require('../scripts/cms-requirement-spec');
const collector=require('../scripts/prepare-cms-evidence');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');
const evidence=()=>JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/cms-review-20261026/index.json'),'utf8'));
const raw=id=>evidence().sources.find(s=>s.id==='CMS-SRC-'+id).excerpts.map(e=>e.text).join(' ');

test('all 21 CMS feature blocks have concrete fields, interactions and stable acceptance IDs',()=>{
  for(const [file,entries,total] of [['需求说明.md',spec.MAIN,110],['子页面与操作细化.md',spec.SUB,88]]){
    const txt=read(file);
    assert.ok(txt.includes('<!-- 业务规格格式:plain-v1 -->'));
    assert.ok(txt.includes('<!-- cms:generated-spec-v1 -->'));
    assert.deepEqual([...txt.matchAll(/^### (CMS-\d{3})\b/gm)].map(m=>m[1]),entries.map(e=>e.id));
    assert.doesNotMatch(txt,/【|】|待确认|拟定需求|未观察到|https?:\/\//);
    for(const entry of entries){
      const block=txt.split('### '+entry.id+' ')[1]?.split(/^### |^## /m)[0];assert.ok(block,entry.id);
      for(const h of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档'])assert.ok(block.includes(h),entry.id+' '+h);
      const table=block.split('#### 1. 页面字段清单')[1].split('#### 2. 页面交互规则')[0];
      const rows=table.split('\n').filter(l=>l.startsWith('|')&&!l.startsWith('|---')&&!l.includes('字段名称与绑定名'));
      assert.ok(rows.length,entry.id+' no fields');
      for(const row of rows){const c=row.split('|').slice(1,-1);assert.equal(c.length,8,entry.id+' field columns');assert.ok(c[0].trim(),entry.id+' empty field');}
      for(const sid of entry.sources)assert.ok(block.includes(sid+'.png'),entry.id+' '+sid);
      assert.ok(block.includes('/back/'),entry.id+' concrete gateway');
    }
    const ac=[...txt.matchAll(/^\| (CMS-AC-\d{3}) \|.*$/gm)];assert.equal(ac.length,total);assert.equal(new Set(ac.map(m=>m[1])).size,total);
    for(const row of ac)assert.equal(row[0].split('|').at(-2).trim(),'未执行');
  }
});

test('CMS development models follow the real add/edit contracts and condition branches',()=>{
  const form=raw('DEVELOP-FORM'),api=raw('DEVELOP-API'),txt=read('子页面与操作细化.md');
  assert.match(form,/Object\.assign\(\{\},e\.componentInfoExtDo,e\.componentDo\)/);
  assert.match(form,/e\.push\(\{componentDo:t,componentInfoExtDo:o\}\)/);
  assert.match(form,/o\.ruleContent=Object\(p\.toBase64\)/);
  for(const k of ['addComponentInfo','editComponentInfoByRelevanceId','componentInfoByRelevanceId/','componentInfoByName','addComponentPullList'])assert.ok(api.includes(k),k);
  for(const k of ['新增根数组','编辑根数组','componentInfoExtDoList','componentTypes','databaseObjects','UTF-8','500ms','Base64不替代加密'])assert.ok(txt.includes(k),k);
  assert.match(txt,/37显示ruleType=1枚举\/2连续/);assert.match(txt,/39要求fileKey且ruleContent可空/);assert.match(txt,/41且分类31/);
  assert.match(form,/ruleType:37==e\?"1":""/);
  assert.match(txt,/保存成功须取得稳定身份并回读/);assert.match(txt,/全部待提交组合/);
  assert.match(raw('ENCODING'),/btoa/);assert.match(raw('ENCODING'),/atob/);
});

test('field limits and language messages come from the correct form instead of query controls',()=>{
  const limits=id=>[...raw(id).matchAll(/maxlength(?::|=)(?:"(\d+)"|(\d+(?:e\d+)?))/g)].map(m=>Number(m[1]||m[2]));
  for(const n of [50,100,500])assert.ok(limits('DEVELOP-FORM').includes(n),'develop '+n);
  for(const n of [100,500])assert.ok(limits('NAME').includes(n),'name '+n);
  for(const n of [50,500])assert.ok(limits('CLASSIFY').includes(n),'classify '+n);
  const formName=spec.FIELDS.form.find(f=>f[0].includes('componentDo.componentName'));
  const functionExpression=spec.FIELDS.form.find(f=>f[0].includes('functionRepresentation'));
  assert.equal(formName[4],'');assert.equal(functionExpression[4],'');
  for(const field of [...spec.FIELDS.nameAdd,...spec.FIELDS.classifyForm])if(field[6])assert.ok(raw('LANGUAGE').includes(field[6]),field[6]);
  assert.match(raw('NAME'),/formInfo:\{componentDescription:"",componentName:"",businessId:"",id:""\}/);
  assert.match(read('子页面与操作细化.md'),/业务分类字典/);
  assert.doesNotMatch(spec.FIELDS.classifyForm.map(f=>f[0]).join(' '),/父|编码|parentId/);
});

test('side effect GETs, three deletion scopes and immediate upload are not read-only claims',()=>{
  const txt=read('需求说明.md')+read('子页面与操作细化.md');
  const api=raw('DEVELOP-API')+raw('NAME-API')+raw('MINE-API');
  for(const k of ['publishComponentInfo/','noPublishComponentInfo/','deleteComponentInfo/','removeComponentInfo/','myComponentListRemove/']){assert.ok(api.includes(k),k);assert.ok(txt.includes(k),k);}
  assert.match(api,/removeComponentInfo\/"\+n,"GET"/);
  assert.match(txt,/个人移除不删除共享名称或开发规则/);
  assert.match(txt,/选择.jar立即上传/);
  assert.match(raw('DEVELOP-FORM'),/n\.append\("file",e\.file\)/);
  assert.match(txt,/取消主表不宣称撤销文件/);
  assert.match(txt,/有副作用GET不得被预取\/重试\/只读探测/);
});

test('shop corrections and export-record incompatibilities retain their exact static evidence',()=>{
  const shop=raw('SHOP'),mineApi=raw('MINE-API'),txt=read('子页面与操作细化.md'),audit=read('核查记录.md');
  assert.match(shop,/pageRequest:\{pageNo:1,pageSize:10,order:\[\]\}/);
  assert.match(mineApi,/myComponentExportRecordList ","GET"/);
  assert.match(txt,/pageNo=currentPage/);assert.match(txt,/20\/40\/60\/100/);
  assert.match(txt,/本页id/);assert.match(txt,/databaseObjectId/);assert.match(txt,/componentDbIdList/);
  assert.match(txt,/batchId作为固定上下文保留/);
  for(const k of ['U+0020','固定1/10','搜索按钮','全量','navigation-error','空框架','F152','16次','原获取'])assert.ok(audit.includes(k),k);
  assert.match(txt,/接通前明确提示筛选\/分页不可用/);
});

test('CMS evidence records original hashes, positions and no invented browser or business results',()=>{
  const d=evidence();assert.equal(d.sources.length,20);assert.equal(d.sources.reduce((n,s)=>n+s.excerpts.length,0),32);
  assert.equal(d.publicStaticGets,16);assert.equal(d.businessRequests,0);assert.equal(d.browserOperations,0);assert.equal(d.applicationAcceptanceExecuted,false);
  for(const s of d.sources){
    assert.match(s.resourcePath,/^\/(?!\/)/);assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.ok(s.bytes>0);assert.ok(Number.isFinite(Date.parse(s.fetchedAt)));
    for(const e of s.excerpts){assert.ok(e.text.startsWith(e.anchor));assert.equal(e.end-e.start,e.text.length);assert.equal(e.sha256,sha(e.text));assert.doesNotMatch(e.text,/https?:\/\//i);}
  }
});

test('CMS evidence verifier rejects source swaps, forged excerpts and unrecognized groups',()=>{
  const {extractSources}=require('../scripts/prepare-workbench-evidence');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cms-evidence-'));
  try{
    const folders=['own','shared','utility'].map(group=>{
      const folder=path.join(temp,group);fs.mkdirSync(folder);const txt=group+' scene:{valid:true}';
      fs.writeFileSync(path.join(folder,'fixture.js'),txt);fs.writeFileSync(path.join(folder,'receipt.json'),JSON.stringify([{path:'/dop/static/js/fixture.js',localName:'fixture.js',bytes:Buffer.byteLength(txt),sha256:sha(txt),fetchedAt:'2026-10-26T00:00:00Z'}]));
      return folder;
    });
    const data={sources:folders.flatMap((folder,i)=>extractSources(folder,'2026-10-26T01:00:00Z',[['FIXTURE-'+i,'fixture.js',[['scene:',18]]]]).map(s=>({...s,sourceGroup:['own','shared','utility'][i]})))};
    assert.deepEqual(collector.verifyAll(data,...folders),{sources:3,excerpts:3,errors:0});
    assert.throws(()=>collector.verifyAll(data,folders[1],folders[0],folders[2]),/resource mismatch/);
    const forged=structuredClone(data);forged.sources[2].excerpts[0].text='scene:{false:true}';forged.sources[2].excerpts[0].sha256=sha(forged.sources[2].excerpts[0].text);
    assert.throws(()=>collector.verifyAll(forged,...folders),/excerpt mismatch/);
    const unknown=structuredClone(data);unknown.sources[0].sourceGroup='missing';assert.throws(()=>collector.verifyAll(unknown,...folders),/unknown source group/);
    assert.throws(()=>collector.verifyAll({sources:[...data.sources,data.sources[0]]},...folders),/duplicate source id/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('CMS refresh preserves published acceptance, source rows and every screenshot reference',()=>{
  const {augmentFile}=require('../scripts/augment-requirement-specs');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cms-spec-')),args=process.argv.slice();
  try{
    process.argv.push('--refresh');
    for(const [file,render] of [['需求说明.md',spec.renderMain],['子页面与操作细化.md',spec.renderSub]]){
      const txt=read(file),rows=txt.match(/^\| CMS-AC-\d{3} \|.*$/gm),last=rows.at(-1);
      assert.throws(()=>render(txt.replace(last,'')),/published acceptance/);
      assert.throws(()=>render(txt.replace(last,last+'\n'+last)),/published acceptance/);
      assert.equal(render(txt),txt,'full rendering idempotency');
      const target=path.join(temp,file);fs.writeFileSync(target,txt);assert.equal(augmentFile(target).changed,false);assert.equal(fs.readFileSync(target,'utf8'),txt);
    }
    const txt=read('需求说明.md'),rows=txt.match(/^\| CMS-\d{3} \|.*$/gm).slice(-10);
    assert.equal(rows.length,10);assert.throws(()=>spec.renderMain(txt.replace(rows.at(-1),'')),/published source/);
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/采样清单.json'),'utf8')).modules.find(m=>m.code==='CMS');
    assert.equal(manifest.developmentReview.productionReady,false);assert.equal(sha(fs.readFileSync(path.join(dir,'调研记录.md'))),manifest.researchSha256);
  }finally{process.argv.splice(0,process.argv.length,...args);fs.rmSync(temp,{recursive:true,force:true});}
});

test('14 quality requirements and AI limits separate development targets from application validation',()=>{
  const txt=read('需求说明.md'),sub=read('子页面与操作细化.md'),audit=read('核查记录.md');
  const rows=[...txt.matchAll(/^\| (CMS-NFR-\d{3}) \|.*$/gm)];assert.equal(rows.length,14);assert.deepEqual(rows.map(m=>m[1]),spec.NFRS.map(n=>n[0]));
  for(const row of rows){const c=row[0].split('|').slice(1,-1).map(v=>v.trim());assert.equal(c.length,6);assert.ok(c.slice(0,5).every(Boolean));assert.equal(c[5],'未执行');}
  for(const key of ['P95≤3秒','100KiB','200%','320 CSS像素','objectURL','30例'])assert.ok(txt.includes(key),key);
  for(const key of ['规则草稿','静态风险','匹配依据','不自动创建名称','不上传','失败'])assert.ok((txt+sub).includes(key),key);
  for(const h of ['核查结论','现有实现与目标规格差异','非功能目标来源','外部依赖','验证状态'])assert.ok(audit.includes('## '+h),h);
  assert.match(audit,/198[\s\S]*14[\s\S]*未执行/);
});
