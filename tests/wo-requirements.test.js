const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'doc/requirements/06-我的工单');
const spec=require('../scripts/wo-requirement-spec');
const collector=require('../scripts/prepare-wo-evidence');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const evidence=()=>JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/evidence/wo-review-20261026/index.json'),'utf8'));
const raw=id=>evidence().sources.find(s=>s.id==='WO-SRC-'+id).excerpts.map(e=>e.text).join(' ');

test('all nine WO requirements have complete concrete field tables and stable 72 acceptance IDs',()=>{
  for(const [file,entries,total]of [['需求说明.md',spec.MAIN,16],['子页面与操作细化.md',spec.SUB,56]]){
    const txt=read(file);
    assert.ok(txt.includes('<!-- 业务规格格式:plain-v1 -->'));assert.ok(txt.includes('<!-- wo:generated-spec-v1 -->'));
    assert.doesNotMatch(txt,/【|】|待确认|未观察到|https?:\/\//);
    assert.deepEqual([...txt.matchAll(/^### (WO-\d{3})\b/gm)].map(m=>m[1]),entries.map(e=>e.id));
    for(const e of entries){
      const b=txt.split('### '+e.id+' ')[1]?.split(/^### |^## /m)[0];assert.ok(b,e.id);
      for(const h of ['页面字段清单','页面交互规则','业务流程与异常分支','接口与数据规则','验收标准','权限与安全要求','页面布局与状态','关联文档'])assert.ok(b.includes(h),e.id+' '+h);
      const rows=b.split('#### 1. 页面字段清单')[1].split('#### 2. 页面交互规则')[0].split('\n').filter(l=>l.startsWith('|')&&!l.startsWith('|---')&&!l.includes('字段名称与绑定名'));
      assert.ok(rows.length>2,e.id);
      for(const row of rows){const c=row.split('|').slice(1,-1);assert.equal(c.length,8,e.id);assert.ok(c[0].trim(),e.id+' unnamed field');}
      for(const s of e.sources)assert.ok(b.includes(s+'.png'),e.id+' '+s);
      assert.ok(b.includes('/back/common/workflow/'),e.id+' API');
    }
    const ac=[...txt.matchAll(/^\| (WO-AC-\d{3}) \|.*$/gm)];assert.equal(ac.length,total);assert.equal(new Set(ac.map(m=>m[1])).size,total);
    for(const row of ac)assert.equal(row[0].split('|').at(-2).trim(),'未执行');
  }
});

test('WO uses its own three API and time mappings and numeric process-state options',()=>{
  const sub=read('子页面与操作细化.md');
  for(const [id,api]of [['TODO-API','/act/task/todo/page'],['DONE-API','/act/task/done/page'],['MINE-API','/act/biz/page']]){assert.ok(raw(id).includes(api),id);assert.ok(sub.includes('/back/common/workflow'+api),api);}
  for(const id of ['TODO','DONE']){assert.match(raw(id),/createTimeStart=e\?e\[0\]:null/);assert.match(raw(id),/createTimeEnd=e\?e\[1\]:null/);}
  assert.match(raw('MINE'),/applyTimeStart=e\?e\[0\]:null/);assert.match(raw('MINE'),/applyTimeEnd=e\?e\[1\]:null/);
  assert.match(raw('MINE'),/value:Number\(t\)/);assert.ok(sub.includes('Number(t)'));
  assert.match(raw('MINE'),/0===t\.row\.procStatus/);assert.match(raw('MINE'),/1===t\.row\.procStatus/);
  for(const key of ['update','start','delete','revoke','urge'])assert.ok(raw('MINE').includes('key:"'+key+'"'),key);
});

test('task submission is exactly six parameters and a local UUID is never a server task id',()=>{
  const task=raw('TASK'),call=/taskSubmit\)\(\{([^}]+)\}\)/.exec(task);assert.ok(call);
  const keys=call[1].split(',').map(v=>v.split(':')[0]);assert.deepEqual(keys,['optType','taskId','comment','ccUid','userStr','newAssigneeId']);
  assert.match(call[1],/userStr:e\.ruleForm\.userIds/);assert.match(task,/userIds:\[\],ccUid:\[\]/);
  assert.match(task,/nodeId:W\(\)/);assert.doesNotMatch(call[1],/nodeId|backTaskSid|procInstId/);
  const txt=read('子页面与操作细化.md');assert.ok(txt.includes('{optType,taskId,comment,ccUid,userStr:ruleForm.userIds,newAssigneeId}'));
  assert.ok(txt.includes('userStr仍为数组'));assert.ok(txt.includes('协议接通前禁止此分支提交'));
  const audit=read('核查记录.md');assert.ok(audit.includes('prop为optType'));assert.ok(audit.includes('procStatus>=2'));assert.ok(audit.includes('1秒定时'));
});

test('field limits and explicit empty defaults match WO forms without copying limits into search',()=>{
  assert.match(raw('TASK'),/maxlength:"70"/);assert.match(raw('MINE'),/maxlength="200"/);
  const taskFields=spec.PROFILES.handling.fields;
  for(const [name,n]of [['审核意见 ruleForm.comment','70字符']])assert.equal(taskFields.find(f=>f[0]===name)[4],n);
  assert.equal(spec.PROFILES.mine.fields.find(f=>f[0]==='催办信息 urgeRuleForm.message')[4],'200字符');
  for(const k of ['todo','done','mine'])for(const name of ['申请标题 title',...(k==='mine'?[]:['发起人 applicantName'])]){
    const f=spec.PROFILES[k].fields.find(f=>f[0]===name);assert.equal(f[3],'');assert.equal(f[4],'');
  }
  assert.match(raw('LANGUAGE'),/pleaseEnterInformationContent:"请输入信息内容"/);
  assert.match(raw('LANGUAGE'),/pleaseEnterReviewComments:"请输入审核意见"/);
  assert.ok(read('子页面与操作细化.md').includes('字段与校验由formId发布快照逐项定义'));
});

test('personal maintenance contracts distinguish edit, start, deletion, revoke and urge',()=>{
  const mine=raw('MINE'),api=raw('MINE-API'),sub=read('子页面与操作细化.md');
  assert.match(mine,/updateActBiz\)\(\{title:e\.title,id:e\.id,bizInfo:JSON\.stringify\(t\)\}/);
  assert.match(mine,/appKey:"ubp"/);assert.match(api,/concat\(t\),"DELETE"/);
  for(const op of ['optType:14','optType:2','/act/task/start','/act/biz/update'])assert.ok(api.includes(op),op);
  for(const k of ['只针对草稿业务id','原事件直接提交','等待回执再关闭','成功回执不证明通知已送达','取消不发送'])assert.ok(sub.includes(k),k);
  assert.match(raw('LIST-MIXINS'),/删除操作不能恢复，确定删除吗？/);
  for(const id of ['WO-101','WO-102','WO-103','WO-104'])assert.match(read('需求说明.md'),new RegExp('^\\| '+id+' \\|','m'));
});

test('read-only snapshots and historical layout conflicts remain explicit and scoped',()=>{
  const txt=read('子页面与操作细化.md'),audit=read('核查记录.md');
  assert.match(raw('TODO-API'),/needSnapshot:!0/);assert.match(raw('DETAIL'),/isDisabled:"view"===e\.optType/);assert.match(raw('TASK'),/isDisabled:!0/);
  assert.match(raw('DETAIL'),/procStatus:e\.procStatus,procInstId:e\.userInfoForm\.procInstId\|\|e\.userInfoForm\.bizCode,categoryCode:e\.userInfoForm\.categoryCode/);
  assert.match(raw('TASK'),/"upcoming"===e\.pageType\?r\("el-tab-pane"/);
  assert.ok(txt.includes('不是工作台左右双栏弹窗'));assert.ok(txt.includes('默认基本0'));
  for(const k of ['正文却仍为“我的待办”','没有可见抄送不代表','仅显示“暂无表单信息!”','1500×1000'])assert.ok(audit.includes(k),k);
  const history=raw('HISTORY');assert.match(history,/row\.createTime/);assert.match(history,/createObjectURL/);assert.match(history,/"19"===t\[0\]\.comments\[0\]\.type/);
  assert.ok(txt.includes('8列条纹表格'));assert.ok(txt.includes('图像与记录独立加载'));
});

test('WO evidence preserves original text hashes, static count and invalid entry without invented observations',()=>{
  const data=evidence();assert.equal(data.sources.length,21);assert.equal(data.sources.reduce((n,s)=>n+s.excerpts.length,0),37);
  assert.equal(data.publicStaticGets,16);assert.equal(data.businessRequests,0);assert.equal(data.browserOperations,0);assert.equal(data.applicationAcceptanceExecuted,false);
  assert.equal(data.invalidSamples.length,1);assert.equal(data.invalidSamples[0].path,'/workorder/');assert.equal(data.invalidSamples[0].bytes,1505);
  for(const s of data.sources){assert.match(s.resourcePath,/^\/(?!\/)/);assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.ok(s.bytes>0);assert.ok(Number.isFinite(Date.parse(s.fetchedAt)));
    for(const e of s.excerpts){assert.ok(e.text.startsWith(e.anchor));assert.equal(e.end-e.start,e.text.length);assert.equal(e.sha256,sha(e.text));assert.doesNotMatch(e.text,/https?:\/\//i);}}
  assert.ok(raw('CONFIG').includes('/workorder/index.html'));assert.ok(raw('LIST-MIXINS').includes('pageSize:20'));
  assert.match(raw('CONTROLS'),/keydown:function/);assert.match(raw('CONTROLS'),/pageRequest:\{pageNo:1,pageSize:200\}/);
  assert.match(raw('CONTROLS'),/Date\.now\(\)-t>500\|\|setTimeout/);
  assert.ok(read('子页面与操作细化.md').includes('首屏body {pageRequest:{pageNo:1,pageSize:20}}'));
});

test('WO evidence verification rejects source swaps, forged excerpts, unknown groups and duplicate ids',()=>{
  const {extractSources}=require('../scripts/prepare-workbench-evidence');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'wo-evidence-'));
  try{
    const folders=['own','shared'].map(group=>{const folder=path.join(temp,group);fs.mkdirSync(folder);const txt=group+' scene:{valid:true}';fs.writeFileSync(path.join(folder,'fixture.js'),txt);fs.writeFileSync(path.join(folder,'receipt.json'),JSON.stringify([{path:'/workorder/static/js/fixture.js',localName:'fixture.js',bytes:Buffer.byteLength(txt),sha256:sha(txt),fetchedAt:'2026-10-26T00:00:00Z'}]));return folder;});
    const data={sources:folders.flatMap((f,i)=>extractSources(f,'2026-10-26T01:00:00Z',[['FIXTURE-'+i,'fixture.js',[['scene:',18]]]]).map(s=>({...s,sourceGroup:['own','shared'][i]})))};
    assert.deepEqual(collector.verifyAll(data,...folders),{sources:2,excerpts:2,errors:0});
    assert.throws(()=>collector.verifyAll(data,folders[1],folders[0]),/resource mismatch/);
    const forged=structuredClone(data);forged.sources[0].excerpts[0].text='scene:{false:true}';forged.sources[0].excerpts[0].sha256=sha(forged.sources[0].excerpts[0].text);assert.throws(()=>collector.verifyAll(forged,...folders),/excerpt mismatch/);
    const unknown=structuredClone(data);unknown.sources[0].sourceGroup='missing';assert.throws(()=>collector.verifyAll(unknown,...folders),/unknown source group/);
    assert.throws(()=>collector.verifyAll({sources:[...data.sources,data.sources[0]]},...folders),/duplicate source id/);
    const invalid={...data,invalidSamples:[{...data.sources[0],path:'/workorder/'}]};assert.deepEqual(collector.verifyAll(invalid,...folders),{sources:2,excerpts:2,errors:0});
    invalid.invalidSamples[0].sha256='0'.repeat(64);assert.throws(()=>collector.verifyAll(invalid,...folders),/resource mismatch/);
    invalid.invalidSamples[0].path='/other/';assert.throws(()=>collector.verifyAll(invalid,...folders),/invalid sample path mismatch/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('WO refresh is idempotent and refuses lost or reordered acceptance/source records',()=>{
  const {augmentFile}=require('../scripts/augment-requirement-specs'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'wo-spec-')),args=process.argv.slice();
  try{
    process.argv.push('--refresh');
    for(const [file,render]of [['需求说明.md',spec.renderMain],['子页面与操作细化.md',spec.renderSub]]){
      const txt=read(file),rows=txt.match(/^\| WO-AC-\d{3} \|.*$/gm),last=rows.at(-1);
      assert.throws(()=>render(txt.replace(last,'')),/published acceptance/);assert.throws(()=>render(txt.replace(last,last+'\n'+last)),/published acceptance/);
      assert.equal(render(txt),txt,'full render');const target=path.join(temp,file);fs.writeFileSync(target,txt);assert.equal(augmentFile(target).changed,false);assert.equal(fs.readFileSync(target,'utf8'),txt);
    }
    const txt=read('需求说明.md'),source=txt.match(/^\| WO-001 \|.*$/m)[0];assert.throws(()=>spec.renderMain(txt.replace(source,'')),/published source/);
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'doc/requirements/采样清单.json'),'utf8')).modules.find(m=>m.code==='WO');
    assert.equal(manifest.developmentReview.productionReady,false);assert.deepEqual(manifest.developmentReview.expandedOperations,['WO-100','WO-001']);assert.equal(sha(fs.readFileSync(path.join(dir,'调研记录.md'))),manifest.researchSha256);
  }finally{process.argv.splice(0,process.argv.length,...args);fs.rmSync(temp,{recursive:true,force:true});}
});

test('13 NFRs and AI safeguards are measurable targets with all application acceptance unexecuted',()=>{
  const main=read('需求说明.md'),sub=read('子页面与操作细化.md'),audit=read('核查记录.md'),rows=[...main.matchAll(/^\| (WO-NFR-\d{3}) \|.*$/gm)];assert.equal(rows.length,13);assert.deepEqual(rows.map(m=>m[1]),spec.NFRS.map(n=>n[0]));
  for(const row of rows){const c=row[0].split('|').slice(1,-1).map(v=>v.trim());assert.equal(c.length,6);assert.ok(c.slice(0,5).every(Boolean));assert.equal(c[5],'未执行');}
  for(const key of ['P95≤3秒','200%','320 CSS像素','objectURL','30例','ceil(p×N)','1万条'])assert.ok(main.includes(key),key);
  for(const key of ['事实摘要','审核意见','不静默截断','不执行任何办理/维护','不自动读取其他工单'])assert.ok((main+sub).includes(key),key);
  for(const h of ['核查结论','现有实现与目标规格差异','非功能目标来源','外部依赖','验证状态'])assert.ok(audit.includes('## '+h),h);
  assert.match(audit,/72条功能验收与13项非功能验收全部未执行/);
});
