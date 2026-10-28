/* Offline text extraction only. This tool never fetches or evaluates assets. */
const fs = require('node:fs');
const path = require('node:path');
const { extractSources } = require('./prepare-workbench-evidence');
const { verify } = require('./prepare-login-evidence');
const output = path.resolve(__dirname, '../doc/requirements/evidence/space-review-20261028');
const selections = {
  page: [
    ['SPACE-SRC-LIST', 'views-projectSpace.0cf916e8.js', [
      ['d049:function', '},d42c:function'], ['"7ded":function', '},"841c":function'],
    ]],
    ['SPACE-SRC-EDIT', 'views-projectSpace-edit.027c0d25.js', [['"705b":function', '},"7db0":function']]],
    ['SPACE-SRC-CONFIG', 'views-projectSpace-config.435aeb1e.js', [['4205:function', '},4416:function']]],
  ],
  dop: [
    ['SPACE-SRC-API', 'api-projectSpace.254a1938.js', [['bc19:function', null]]],
    ['SPACE-SRC-DOP', 'app.73911832.js', [
      ['"5c0b":function', '},"5c6c":function'], ['bcab:function', '},c04e:function'],
      ['de5f:function', '},df75:function'],
      ['p=function(e){return Object(r.d)().request((Object(r.b)("commonUser")', '},d=function'],
      ['projectSpace:{', '},viewsWorkbenchWorkflowFinishedAndReviewEditVue:'],
      ['viewsProjectSpaceIndexVue:{', '},viewsRequirementCollectionEditVue:'],
    ]],
    ['SPACE-SRC-MIXINS', 'chunk-@audaque-vue-utils.dd200c95.js', [
      ['var o=function(e){return{data:function(){return{audaqueDeleteHintMixin:', '}});function u(e,t,r)'],
      ['var d=function(e,t,r){return{data:function(){return{audaqueFormAddMixin:', '},h={data:function'],
      ['var V={bind:function', ';function q()'],
    ]],
  ],
  shared: [
    ['SPACE-SRC-REQUEST', 'shell-app.7ec981a3.js', [
      ['qa={"Content-Type":"application/json;', 1050],
      ['Ka=window.__$__BASE,Ya=function', 1710],
      ['key:"request",value:function(e,t,r)', 405],
      ['function lu(e){return function(e){if(1002===e)', 558],
      ['Qs=window.__$__.MODULE_URL_PREFIX.dopSpace', 2970],
      ['Za(lu,{baseURL:Zc.API_BASE_URL}', 70],
    ]],
    ['SPACE-SRC-BASE', 'serviceConfig.base.js', [['NETWORK_ERROR_CODE: 202', 23]]],
    ['SPACE-SRC-CONFIGURATION', 'serviceConfig.prod.js', [
      ["API_BASE_URL: baseUrl + '/back'", 39], ['MODULE_URL_PREFIX: {}', 21],
    ]],
  ],
};

function select(directory, group) {
  return selections[group].map(([id, file, ranges]) => {
    const text = fs.readFileSync(path.join(directory, file), 'utf8');
    return [id, file, ranges.map(([anchor, end]) => {
      const start = text.indexOf(anchor);
      if (start < 0) throw new Error(id + ': missing anchor');
      const finish = typeof end === 'number' ? start + end : end === null ? text.length : text.indexOf(end, start) + 1;
      if (finish <= start) throw new Error(id + ': missing end');
      return [anchor, finish - start];
    })];
  });
}

function verifyAll(data, directories) {
  if (data.evidenceType !== 'static-source' || data.businessRequests !== 0 || data.browserOperations !== 0 || data.applicationAcceptanceExecuted !== false) {
    throw new Error('static evidence cannot claim application execution');
  }
  const ids = data.sources.map(s => s.id);
  const expected = Object.values(selections).flat().map(s => s[0]);
  if (JSON.stringify(ids) !== JSON.stringify(expected)) throw new Error('source ID/order mismatch');
  let excerpts = 0;
  for (const group of Object.keys(selections)) {
    const sources = data.sources.filter(s => s.sourceGroup === group);
    const selection = select(directories[group], group);
    if (sources.length !== selection.length) throw new Error('source group mismatch');
    const canonical = extractSources(directories[group], data.inspectedAt, selection)
      .map(s => ({ ...s, sourceGroup: group }));
    if (JSON.stringify(sources) !== JSON.stringify(canonical)) throw new Error('source/excerpt/receipt mismatch');
    const result = verify({ sources }, directories[group]);
    excerpts += result.excerpts;
  }
  return { sources: ids.length, excerpts, errors: 0 };
}

function prepare(directories) {
  const inspectedAt = new Date().toISOString();
  const sources = Object.keys(selections).flatMap(group =>
    extractSources(directories[group], inspectedAt, select(directories[group], group))
      .map(s => ({ ...s, sourceGroup: group })));
  const data = { schemaVersion: 1, inspectedAt, evidenceType: 'static-source', businessRequests: 0,
    browserOperations: 0, applicationAcceptanceExecuted: false,
    limitations: ['只读静态GET后的离线文本核查，不执行下载代码', '复用2026-10-22历史截图，不保证与静态包同一版本',
      '没有调用业务API、登录、保存、删除或切换空间，没有新增截图或Network', '前端定义不证明后端隔离、权限、事务、配额或业务成功'], sources };
  verifyAll(data, directories);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'index.json'), JSON.stringify(data, null, 2) + '\n');
  return { sources: sources.length, excerpts: sources.reduce((n, s) => n + s.excerpts.length, 0), businessRequests: 0 };
}
if (require.main === module) {
  const directories = {};
  for (const group of Object.keys(selections)) {
    const index = process.argv.indexOf('--' + group + '-dir');
    if (index < 0 || !process.argv[index + 1]) throw new Error('--' + group + '-dir required');
    directories[group] = path.resolve(process.argv[index + 1]);
  }
  console.log(JSON.stringify(process.argv.includes('--verify')
    ? verifyAll(JSON.parse(fs.readFileSync(path.join(output, 'index.json'), 'utf8')), directories)
    : prepare(directories)));
}
module.exports = { select, selections, prepare, verifyAll };
