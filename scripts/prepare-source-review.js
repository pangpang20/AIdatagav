/* Offline evidence extraction. No application requests or script evaluation. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { REVIEW, specs, sourceSelections, renderReviewedSpec } = require('./source-review-specs');
const root = path.resolve(__dirname, '..', 'doc', 'requirements');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function extract(text, anchor, size = 4300) {
  const index = text.indexOf(anchor);
  if (index < 0) throw new Error(`missing source anchor: ${anchor}`);
  const start = Math.max(0, index - 120);
  const end = Math.min(text.length, index + size);
  return { anchor, start, end, offsetUnit: 'UTF-16 code units; start inclusive, end exclusive', text: text.slice(start, end), sha256: sha(text.slice(start, end)) };
}
function prepare(sourceDirectory) {
  const receipts = ['chunks-receipt.json', 'shared-receipt.json', 'tasks-receipt.json', 'setting-receipt.json']
    .flatMap(name => JSON.parse(fs.readFileSync(path.join(sourceDirectory, name), 'utf8')));
  const inspectedAt = new Date().toISOString();
  const sources = sourceSelections.map(([id, filename, anchors]) => {
    const bytes = fs.readFileSync(path.join(sourceDirectory, filename));
    const text = bytes.toString('utf8');
    const receipt = receipts.find(item => item.localName === filename);
    if (receipt && (sha(bytes) !== receipt.sha256 || bytes.length !== receipt.bytes)) throw new Error(`receipt mismatch: ${id}`);
    const resourcePath = receipt?.path || ({ 'app.7ec981a3.js': '/static/js/app.7ec981a3.js' })[filename];
    if (!resourcePath) throw new Error(`resource path missing: ${id}`);
    const excerpts = anchors.map(anchor => extract(text, anchor, id === 'SRC-PORTAL-PASSWORD' && anchor === 'oldPassword:""' ? 6600 : 4300));
    for (const excerpt of excerpts) {
      if (/https?:\/\//i.test(excerpt.text)) throw new Error(`full URL in excerpt: ${id} ${excerpt.anchor}`);
    }
    return { id, evidenceType: 'static-source', resourcePath, bytes: bytes.length, sha256: sha(bytes), fetchedAt: receipt?.fetchedAt || null,
      inspectedAt, acquisitionNote: receipt ? '公开静态资源GET获取登记；本脚本仅离线提取' : '既有本地公开静态资源；精确获取时间未登记，使用本次复核时间',
      applicationAcceptanceExecuted: false, excerpts };
  });
  const data = { schemaVersion: 1, batch: REVIEW, inspectedAt, networkRequestsByExtractor: 0, applicationWrites: 0,
    limitations: ['静态源码不是Network抓包或服务端响应', '模块服务前缀和网关前缀可能由部署配置覆盖', '不提交整包JS、原配置、秘密或不必要个人信息', '没有本轮新页面截图，沿用明确链接的历史截图'],
    requirements: Object.values(specs).map(spec => ({ id: spec.id, group: spec.group, sourceIds: spec.sources, applicationAcceptanceExecuted: false })), sources };
  const directory = path.join(root, 'evidence', REVIEW);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.json'), JSON.stringify(data, null, 2) + '\n');
  const index = [
    '# 前端源码核对证据', '', '本批仅对公开静态资源做只读GET取得后的离线阅读，未执行所下载JavaScript，未调用业务接口。静态定义只证明客户端写法，不证明运行配置、后端契约、成功结果或权限。', '',
    `- 复核UTC时间：${inspectedAt}；逐文件获取时间见下表，缺少获取登记的文件不补造时间。`,
    '- 分发范围：限获授权项目人员。仅保存必要原文片段、资源相对路径和摘要；完整原包及部署配置保留本机临时目录，不纳入Git。',
    '- 来源分类：【页面观察，来源：前端源码】；所有应用验收仍为【拟定，未执行】。原文偏移按UTF-16 code unit计数，左闭右开；每段及原资源各有SHA-256。',
    '- 本轮没有新页面截图。页面外观使用[2026-10-22历史截图索引](../live-recheck-20261022/README.md)，历史页面与本轮bundle是否同版本尚未确认。',
    '- [机器索引与原文片段](./index.json)；不能将片段SHA当作原资源SHA，或把静态API包装器地址当实际Network请求URL。', '',
    '| 证据ID | 资源相对路径 | 获取UTC时间 | 字节数 | 用途与关联需求 |', '|---|---|---|---|---|',
    ...sources.map(source => `| ${source.id} | ${source.resourcePath} | ${source.fetchedAt || ''} | ${source.bytes} | ${data.requirements.filter(r => r.sourceIds.includes(source.id)).map(r => r.id).join('、')}；静态定义 |`), '',
    '[返回总索引](../../README.md)', '',
  ].join('\n');
  fs.writeFileSync(path.join(directory, 'README.md'), index);
  for (const group of new Set(Object.values(specs).map(spec => spec.group))) {
    const contents = ['# 前端源码核对补充', '',
      '本文件与正式需求共用同一份可重建规格；只确认客户端定义。未知字段单元格留空，应用业务验收全部未执行，接口仍需Network及后端核对。', '',
      '[源码证据](../evidence/' + REVIEW + '/README.md) · [正式需求](./需求说明.md) · [业务验收执行计划](../业务验收执行计划.md)', '',
      ...Object.values(specs).filter(spec => spec.group === group).flatMap((spec, i) => [
        `## ${spec.id} ${spec.title}`, '',
        renderReviewedSpec(spec, 901 + i * 5).replace(/\| ([A-Z]+)-AC-(\d{3,}) \|/g, (_, prefix, number) => `| REVIEW-${prefix}-${spec.id.split('-')[1]}-${Number(number) % 5 + 1} |`),
      ]),
      '补充文件的REVIEW编号仅为本地检查行标识，不新增或替换正式验收编号；实际执行须登记正式需求中的原验收编号。', '',
    ].join('\n');
    fs.writeFileSync(path.join(root, group, '源码核对补充.md'), contents);
  }
  return { sources: sources.length, requirements: Object.keys(specs).length, applicationWrites: 0 };
}
if (require.main === module) {
  const argument = process.argv.indexOf('--source-dir');
  if (argument < 0 || !process.argv[argument + 1]) throw new Error('offline source directory required: --source-dir <directory>');
  console.log(JSON.stringify(prepare(path.resolve(process.argv[argument + 1]))));
}
module.exports = { extract, prepare };
