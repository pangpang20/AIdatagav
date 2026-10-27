/*
 * Add an implementation-ready, evidence-bounded specification to every
 * formal requirement in the module documents. This script only reads the
 * captured evidence and Markdown; it never drives the target application.
 */
const fs = require('fs');
const path = require('path');
const { specs: reviewedSpecs, renderReviewedSpec } = require('./source-review-specs');
const { renderLoginSpec } = require('./login-requirement-spec');
const { renderHomeSpec } = require('./workbench-requirement-spec');
const { MAIN: drmsMain, SUB: drmsSub, renderFeature: renderDrmsFeature } = require('./drms-requirement-spec');
const { MAIN: dbmsMain, SUB: dbmsSub, renderFeature: renderDbmsFeature } = require('./dbms-requirement-spec');
const { MAIN: cmsMain, SUB: cmsSub, renderFeature: renderCmsFeature } = require('./cms-requirement-spec');
const { MAIN: woMain, SUB: woSub, renderFeature: renderWoFeature } = require('./wo-requirement-spec');
const { MAIN: dsMain, SUB: dsSub, renderFeature: renderDsFeature } = require('./ds-requirement-spec');
const { MAIN: smsMain, SUB: smsSub, renderFeature: renderSmsFeature } = require('./sms-requirement-spec');
const { MAIN: disMain, SUB: disSub, renderFeature: renderDisFeature } = require('./dis-requirement-spec');
const { MAIN: dmsMain, SUB: dmsSub, renderFeature: renderDmsFeature } = require('./dms-requirement-spec');
const { MAIN: gdrsMain, SUB: gdrsSub, renderFeature: renderGdrsFeature } = require('./gdrs-requirement-spec');
const { MAIN: gsbMain, SUB: gsbSub, renderFeature: renderGsbFeature } = require('./gsb-requirement-spec');
const { MAIN: dssMain, SUB: dssSub, renderFeature: renderDssFeature } = require('./dss-requirement-spec');
const { MAIN: dqMain, SUB: dqSub, renderFeature: renderDqFeature } = require('./dq-requirement-spec');
const { MAIN: dseMain, SUB: dseSub, renderFeature: renderDseFeature } = require('./dse-requirement-spec');

const { MAIN: dcsMain, SUB: dcsSub, renderFeature: renderDcsFeature } = require('./dcs-requirement-spec');

const { MAIN: gspMain, SUB: gspSub, renderFeature: renderGspFeature } = require('./gsp-requirement-spec');

const ROOT = path.resolve(__dirname, '..');
const REQUIREMENTS = path.join(ROOT, 'doc', 'requirements');
const EVIDENCE = path.join(REQUIREMENTS, 'evidence', 'live-recheck-20261022');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function evidenceRefs(block, documentFile) {
  const refs = [];
  const re = /\]\(([^)\s]+\.png)(?:#[^)]*)?\)/g;
  let match;
  while ((match = re.exec(block))) {
    const image = match[1].replace(/\\/g, '/');
    if (/^[a-z]+:\/\//i.test(image)) continue;
    const id = path.posix.basename(image, '.png');
    if (refs.some((ref) => ref.id === id && ref.image === image)) continue;
    const jsonImage = image.replace(/\.png$/i, '.json');
    refs.push({
      id,
      image,
      jsonImage,
      jsonFile: path.resolve(path.dirname(documentFile), jsonImage),
    });
  }
  return refs;
}

function normalizeEvidenceRef(source) {
  if (typeof source !== 'string') return source;
  return {
    id: source,
    image: `../evidence/live-recheck-20261022/${source}.png`,
    jsonImage: `../evidence/live-recheck-20261022/${source}.json`,
    jsonFile: path.join(EVIDENCE, `${source}.json`),
  };
}

function evidence(source) {
  const ref = normalizeEvidenceRef(source);
  const file = ref?.jsonFile || path.join(EVIDENCE, `${ref?.id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(read(file));
  } catch {
    return null;
  }
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function cell(value) {
  return clean(value).replace(/\|/g, '&#124;') || '未观察到';
}

function tableCell(value) {
  return clean(value).replace(/\|/g, '&#124;');
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function fieldName(control) {
  const label = clean(control.label);
  if (label) return label;
  const placeholder = clean(control.placeholder);
  if (!placeholder) return '';
  return placeholder.replace(/^(?:请输入|请填写|请选择|选择|搜索)/, '') || '';
}

function buttonNamesFromControls(controls) {
  return unique((controls || [])
    .filter((control) => control.tag === 'BUTTON')
    .map((control) => {
      const text = clean(control.text || control.label || control['aria-label'] || control.title);
      return text;
    }));
}

function controlsFor(data) {
  const controls = [];
  for (const form of data?.forms || []) {
    for (const field of form.fields || []) {
      controls.push({
        tag: 'FORM_FIELD',
        type: field.type || '',
        label: clean(field.label || field.name),
        placeholder: clean(field.placeholder),
        required: form.requiredMarker === true,
        disabled: Boolean(field.disabled),
        readonly: Boolean(field.readonly),
        minlength: field.minlength ?? null,
        maxlength: field.maxlength ?? null,
        min: field.min ?? null,
        max: field.max ?? null,
        pattern: field.pattern ?? null,
        defaultValue: field.defaultValue ?? field.default ?? null,
        errorMessage: field.errorMessage ?? field.validationMessage ?? null,
      });
    }
  }
  for (const control of data?.controls || []) {
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(control.tag)) {
      controls.push(control);
    }
  }
  return controls;
}

function fieldRows(sourceIds) {
  const rows = [];
  const seen = new Set();
  for (const source of sourceIds) {
    const data = evidence(source);
    for (const control of controlsFor(data)) {
      if (control.tag === 'BUTTON') continue;
      const name = fieldName(control);
      const key = [name, control.type, control.maxlength, control.min, control.max].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const required = control.required === true ? '是（页面必填标记）' : '';
      const length = [
        control.minlength != null ? `minlength=${control.minlength}` : '',
        control.maxlength != null ? `maxlength=${control.maxlength}` : '',
      ].filter(Boolean).join('；');
      const range = [control.min != null ? `min=${control.min}` : '', control.max != null ? `max=${control.max}` : '']
        .filter(Boolean).join('；');
      const constraints = [length, range].filter(Boolean).join('；');
      const format = control.pattern ? `pattern=${control.pattern}` : '';
      const defaultValue = /password/i.test(control.type || '') ? '' : clean(control.defaultValue);
      const errorMessage = clean(control.errorMessage);
      const state = control.disabled === true ? '禁用（页面DOM）' : control.readonly === true ? '只读（页面DOM）' : control.disabled === false ? '启用（页面DOM）' : '';
      rows.push({
        name,
        type: control.type || '',
        required,
        defaultValue,
        length: constraints,
        format,
        errorMessage,
        state,
        source: `【页面观察】${source.id}截图/页面元素JSON；DOM属性只描述页面控件。`,
      });
    }
  }
  return rows;
}

function buttonNames(sourceIds) {
  return unique(sourceIds.flatMap((source) => buttonNamesFromControls(evidence(source)?.controls)));
}

function options(sourceIds) {
  return unique(sourceIds.flatMap((source) => (evidence(source)?.options || []).map((option) => option.text)));
}

function route(sourceIds) {
  return unique(sourceIds.map((source) => {
    const value = evidence(source)?.url;
    if (!value) return '';
    try {
      return new URL(value, 'http://local.invalid').pathname || '';
    } catch {
      return '';
    }
  }).filter(Boolean));
}

function sourceLinks(sourceIds) {
  if (!sourceIds.length) return '【待确认】本条需求没有可用截图/元素材料。';
  return sourceIds.map((source) => {
    const ref = normalizeEvidenceRef(source);
    return `[${ref.id}](${ref.image}) / [页面元素](${ref.jsonImage})`;
  }).join('；');
}

function operationType(title) {
  if (/删除|移除|禁用|退出|解禁|撤回/.test(title)) return 'delete';
  if (/新增|新建|创建|导入|注册/.test(title)) return 'create';
  if (/审批|发布|运行|执行|停止|启动|暂停|恢复|调度|生成|发送/.test(title)) return 'execute';
  if (/编辑|修改|设置|授权|配置|保存|提交/.test(title)) return 'update';
  return 'read';
}

function operationKind(title) {
  return {
    create: '写操作（创建）',
    update: '写操作（更新）',
    delete: '写操作（删除或状态变更）',
    execute: '写操作（任务或流程执行）',
    read: '读取或查询操作',
  }[operationType(title)];
}

function isWrite(title) {
  return operationType(title) !== 'read';
}

function flowSteps(type, title) {
  if (type === 'create') return [
    `1. 进入${cell(title)}，读取当前用户及租户/空间上下文；页面或候选项加载失败时保留当前页并提供重试。`,
    '2. 仅填写页面已观察字段；校验必填、格式、长度和跨字段关系。密码一致性、唯一范围和默认关联均须先查证。',
    '3. 提交前由服务端重新鉴权并验证唯一性；重复账号/对象返回可定位的冲突，不覆盖已有记录。',
    '4. 对账号重复、确认值不一致、字段校验、权限不足、网络超时及服务端错误分别显示状态；非秘密输入可按批准规则保留，秘密值不得回填。',
    '5. 取消不发送创建请求；超时结果不明时先按请求关联号或目标查询确认是否已创建，再决定是否重试。',
  ];
  if (type === 'update') return [
    `1. 进入${cell(title)}，读取目标稳定标识、当前版本和权限范围；对象不存在或无权限时不得进入可提交状态。`,
    '2. 展示当前值并标记修改草稿；校验只依据已确认规则，不将页面属性当作服务端校验。',
    '3. 提交时携带经证实的对象标识和版本条件；服务端再次鉴权并检测并发修改。',
    '4. 字段校验、权限变化、对象已删除、版本冲突、网络超时和服务端异常分别提示；失败后保留非秘密草稿并允许在重新读取后恢复。',
    '5. 取消不发送更新请求；超时后先回读当前值和版本，避免盲目重复覆盖。',
  ];
  if (type === 'delete') return [
    `1. 进入${cell(title)}，明确待处理对象、稳定标识、当前状态及引用/依赖影响；对象不明确时不得继续。`,
    '2. 【拟定需求】展示对象名称和影响范围并要求二次确认；确认框实际存在与文案待页面/源码验证。',
    '3. 服务端重新检查权限、引用保护、并发状态及幂等条件；只有明确成功响应后才从当前视图移除或刷新对象。',
    '4. 无权限、对象已变化、存在引用、重复请求、网络超时和服务端失败时显示可恢复结果，不伪报成功。',
    '5. 取消不发送删除/状态变更请求；超时后先回读对象状态，禁止未经确认重复执行。',
  ];
  if (type === 'execute') return [
    `1. 进入${cell(title)}，读取目标对象、当前状态、前置条件和操作权限；不满足前置条件时说明阻断原因。`,
    '2. 【拟定需求】执行前展示目标、范围及可能影响；任务参数、运行/停止/取消能力须由真实页面和接口证据确定。',
    '3. 服务端再次鉴权并返回稳定请求/运行标识及状态；前端按状态机展示排队、运行、成功、失败或取消。',
    '4. 前置状态冲突、重复触发、权限不足、网络超时及服务端异常分别处理；结果未知时先查询运行状态，不盲目重启。',
    '5. 取消/停止仅在原系统确有该操作且用户获授权时可用；重复提交不得产生重复运行实例。',
  ];
  return [
    `1. 进入${cell(title)}，在当前用户、租户/空间及数据权限范围内加载页面；加载失败时保留页面上下文并可重试。`,
    '2. 按已观察字段设置筛选条件；未确认的匹配方式、默认排序和状态枚举不得由实现人员推断。',
    '3. 查询成功展示结果及分页；空结果与加载失败、无权限、服务异常分别呈现。',
    '4. 网络超时、服务端校验失败、权限不足和响应异常须明确提示并保留筛选条件；不得把空结果判为故障。',
    '5. 分页、重复查询和条件变更不得串用旧响应；较早请求的迟到结果不能覆盖较新的筛选状态。',
  ];
}

function exceptionRows(type) {
  const rows = {
    create: [
      ['重复账号/对象', '展示服务端冲突字段与提示；不覆盖、不生成第二条记录。'],
      ['必填、格式或跨字段校验失败', '定位字段并保留可安全重试的数据；真实规则与提示待验证。'],
    ],
    update: [
      ['目标失效/版本冲突', '阻止覆盖并提示重新读取最新版本。'],
      ['字段或服务端校验失败', '定位可修正字段并保留非秘密草稿。'],
    ],
    delete: [
      ['存在引用/依赖或状态已变化', '按服务端保护规则阻止操作，展示可理解原因。'],
      ['目标不存在/已处理', '回读并显示当前状态，不将重复请求误报为新成功。'],
    ],
    execute: [
      ['前置状态不满足/重复触发', '阻止执行并说明状态；通过稳定请求号避免重复运行。'],
      ['结果未知/运行失败', '先查询运行状态；按可重试分类展示恢复入口。'],
    ],
    read: [
      ['空结果/无权限', '明确区分无匹配数据与无权访问，不显示为系统错误。'],
      ['网络或服务异常', '展示失败状态并保留筛选、分页上下文供重试。'],
    ],
  };
  return rows[type];
}

function interactionRows(buttons, write) {
  const names = buttons;
  return names.map((name) => {
    const observation = `【页面观察】页面存在“${cell(name)}”按钮。`;
    const pending = '【待确认】本轮未验证点击结果、确认框、请求和成功/失败状态。';
    if (/取消|返回|关闭/.test(name)) return `| ${cell(name)} | ${observation} ${pending} 【拟定需求】关闭或返回前检查未保存内容；取消不得发送业务写请求。 |`;
    if (/查询|搜索|刷新/.test(name)) return `| ${cell(name)} | ${observation} ${pending} 【拟定需求】按当前条件发起读取请求；加载中显示状态，失败保留条件并允许重试。 |`;
    if (/重置|清空/.test(name)) return `| ${cell(name)} | ${observation} ${pending} 【拟定需求】清空可见筛选/编辑值并回到页面约定的初始状态；是否自动重新查询待确认。 |`;
    if (/删除|移除|禁用|解禁|退出/.test(name)) return `| ${cell(name)} | ${observation} ${pending} 【拟定需求】先明确对象与影响并二次确认；确认前不得写入，取消不产生业务变化。 |`;
    if (/提交|保存|确认|新增|创建|编辑|修改|授权|发布|运行|执行|导入/.test(name)) return `| ${cell(name)} | ${observation} ${pending} 【拟定需求】提交中去重或禁用按钮；失败保留非秘密输入并展示可理解的字段/业务错误。 |`;
    return `| ${cell(name)} | ${observation} ${pending} 【待确认】具体业务语义和读写效果须通过前端事件处理器及接口核实。 |`;
  });
}

function inputInteractionRows(sourceIds) {
  const rows = [];
  const seen = new Set();
  for (const source of sourceIds) {
    const data = evidence(source);
    for (const control of controlsFor(data)) {
      if (control.tag === 'BUTTON') continue;
      const name = fieldName(control) || '未标注字段';
      const key = [name, control.tag, control.type, control.placeholder].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const description = [
        `${control.tag}/${control.type || '类型未标注'}`,
        control.placeholder ? `placeholder=${control.placeholder}` : '',
        control.maxlength != null ? `maxlength=${control.maxlength}` : '',
        control.min != null ? `min=${control.min}` : '',
        control.max != null ? `max=${control.max}` : '',
        control.disabled ? '当前禁用' : '',
        control.readonly ? '当前只读' : '',
      ].filter(Boolean).join('；');
      rows.push(`| ${cell(name)} | 【页面观察】${cell(description)}；来源：${source.id}页面元素JSON。【待确认】输入/选择后的校验时机、键盘行为、候选加载和错误文案尚未证实。 |`);
    }
  }
  return rows;
}

function buildSpec(id, title, block, sourceIds, acceptanceStart = 1) {
  const rows = fieldRows(sourceIds);
  const routeValues = route(sourceIds);
  const buttons = buttonNames(sourceIds);
  const optionValues = options(sourceIds);
  const type = operationType(title);
  const write = isWrite(title);
  const kind = operationKind(title);
  const fieldTable = rows.length
    ? rows.map((row) => `| ${tableCell(row.name)} | ${tableCell(row.type)} | ${tableCell(row.required)} | ${tableCell(row.defaultValue)} | ${tableCell(row.length)} | ${tableCell(row.format)} | ${tableCell(row.errorMessage)} | ${tableCell(row.state)} |`).join('\n')
    : '| | | | | | | | |';
  const buttonTable = interactionRows(buttons, write).join('\n');
  const optionText = optionValues.length ? `【页面观察】同屏候选样本：${optionValues.map(cell).join('、')}。候选是否完整、是否可配置及提交值待验证。` : '【待确认】本轮未取得下拉/单选候选值。';
  const layout = routeValues.length ? routeValues.join('、') : '未取得路由';
  const source = sourceLinks(sourceIds);
  const prefix = id.split('-')[0];
  const acceptanceId = (offset) => `${prefix}-AC-${String(acceptanceStart + offset).padStart(3, '0')}`;
  return [
    `<!-- 完整规格:${id} -->`,
    '',
    `#### 1. 页面字段清单（${id}）`,
    '',
    `规格对象：${cell(title.replace(/^\s+/, ''))}；操作类型：${kind}。`,
    '',
    '| 字段名称 | 类型 | 是否必填 | 默认值 | 长度/范围限制 | 格式规则 | 错误提示 | 页面状态 |',
    '|---|---|---|---|---|---|---|---|',
    fieldTable,
    '',
    '字段清单空白单元格表示现有页面证据未提供该值，不代表产品没有限制；不得把空白实现为无校验。',
    '',
    optionText,
    '',
    '字段规则边界：空白字段值须在前端源码、接口契约或获授权的测试请求中确认后再补齐；不得按常见后台惯例推定。',
    '',
    `#### 2. 页面交互规则（${id}）`,
    '',
    '| 控件/按钮 | 交互行为与状态 |',
    '|---|---|',
    buttonTable,
    '| 输入框/选择框 | 【拟定需求】输入时只更新草稿；失焦校验不得替代服务端校验；下拉候选加载失败要显示原因并可重试；秘密字段不得写日志。 |',
    '| 页面离开 | 【拟定需求】有未保存修改时提示；取消、返回和浏览器后退的确认策略待产品确认。 |',
    '',
    `#### 3. 业务流程与异常分支（${id}）`,
    '',
    `1. 进入${cell(title)}，读取当前用户、租户/空间和对象标识；页面加载失败时停留在当前页并提供重试。`,
    '2. 按字段表填写或选择；缺少必填值、长度越界、格式不合法或确认值不一致时阻止提交并定位字段。',
    ...flowSteps(type, title),
    '',
    '| 异常分支 | 预期页面响应（均为拟定，待产品/服务端确认） |',
    '|---|---|',
    ...exceptionRows(type).map(([name, behavior]) => `| ${name} | 【拟定需求】${behavior} |`),
    '| 网络超时/服务端错误 | 【拟定需求】展示可理解的失败状态，保留可安全保留的草稿；结果未知时先查询状态，避免错误重试。 |',
    '| 取消/重复提交 | 【拟定需求】取消不产生未确认写入；重复点击在客户端去重并由服务端幂等保护。 |',
    '',
    `#### 4. 接口与数据规则（${id}）`,
    '',
    '| 项目 | 规格 | 证据状态 |',
    '|---|---|---|',
    `| ${type === 'read' ? '读取/查询' : `${type === 'create' ? '创建' : type === 'update' ? '更新' : type === 'delete' ? '删除/状态变更' : '任务/流程执行'}`}方法与相对路径 | 待验证；从页面证据未取得可用的Network请求，不得猜测URL或HTTP方法。 | 【待确认】 |`,
    '| 请求参数 | 待验证；必须逐字段映射页面字段、稳定对象ID、租户/空间上下文和幂等信息；禁止把展示文本当ID。 | 【待确认】 |',
    '| 成功响应 | 待验证；需明确HTTP状态、业务码、消息、返回ID/版本及列表回读条件。 | 【待确认】 |',
    '| 失败响应 | 待验证；需区分字段校验、重复、权限、并发、超时和服务不可用，并定义可重试性。 | 【待确认】 |',
    `| 数据一致性 | 【拟定需求】${write ? `${type === 'create' ? '创建' : type === 'update' ? '更新' : type === 'delete' ? '删除/状态变更' : '执行'}操作需要明确幂等、结果回读及并发规则；取消不得发送写请求。` : '读取按当前筛选和权限范围返回；分页/排序参数与响应总数契约待验证。'} | 【拟定，待评审】 |`,
    '',
    '实现前检查顺序：查找前端事件处理器与API客户端；在只读条件下记录请求方法、相对路径、脱敏参数名和响应结构；必要的写请求只能在用户明确授权的测试环境执行。',
    '',
    `#### 5. 验收标准（${id}）`,
    '',
    '| 验收编号 | 可执行检查项 | 关联需求 | 状态 |',
    '|---|---|---|---|',
    `| ${acceptanceId(0)} | 页面打开后标题、路由、字段顺序、按钮和${write ? '写入对象' : '查询对象'}与证据一致。 | ${id} | 【拟定，未执行】 |`,
    `| ${acceptanceId(1)} | 合法输入${write ? '提交后显示服务端成功结果并回读目标记录' : '查询后展示结果、空结果和分页状态'}；不把页面文案当成后端成功。 | ${id} | 【拟定，未执行】 |`,
    `| ${acceptanceId(2)} | ${type === 'create' ? '必填缺失、长度/格式错误、重复对象和服务端校验失败' : type === 'update' ? '字段校验失败、对象失效和并发版本冲突' : type === 'delete' ? '存在引用、目标失效和权限不足' : type === 'execute' ? '前置状态不满足、重复触发和权限不足' : '空结果、无权限和服务端查询失败'}时显示相应状态，不伪报成功并保留可恢复上下文。 | ${id} | 【拟定，未执行】 |`,
    `| ${acceptanceId(3)} | 网络超时、服务不可用、权限不足和${type === 'read' ? '查询状态恢复' : '并发或重复请求'}均有明确处理；重试不会重复写入或覆盖新版本。 | ${id} | 【拟定，未执行】 |`,
    `| ${acceptanceId(4)} | 取消、关闭、返回和重复点击符合交互规则；${write ? '取消不新增/修改/删除/执行记录。' : '新条件不会被旧响应覆盖。'} | ${id} | 【拟定，未执行】 |`,
    '',
    `#### 6. 权限与安全要求（${id}）`,
    '',
    '- 【待确认】允许访问本页面及执行该操作的角色、部门、租户和数据范围；菜单可见不等于写权限。',
    `- 【拟定需求】服务端对${write ? '对象标识、租户/空间、操作权限、版本和幂等键' : '查询条件、对象标识、租户/空间和读取权限'}重新鉴权，拒绝越权参数；不能仅依赖前端隐藏按钮。`,
    '- 【拟定需求】全链路使用批准的传输保护；密码、令牌、Cookie和个人数据不写入日志、截图说明或错误消息；日志只保留必要的操作审计字段。',
    '- 【待确认】是否需要二次确认、审批、操作审计、敏感字段脱敏、数据导出限制和会话过期处理。',
    '',
    `#### 7. 页面布局与状态（${id}）`,
    '',
    `- 【页面观察】页面路由：${cell(layout)}；截图：${source}。`,
    '- 【页面观察】字段顺序、可见标题和当前控件以截图/元素 JSON 为准；动态样本名称、数量、日期和状态不构成固定规则。',
    '- 【拟定需求】加载中禁用会导致重复请求的控件并显示进度；空状态保留筛选入口和对象上下文；错误状态说明原因并提供重试；成功状态显示服务端返回结果。',
    '- 【待确认】不同分辨率、浏览器缩放、长文本、无数据、权限隐藏、接口慢响应和弹窗溢出时的布局规则。',
    '',
    `#### 8. 证据与待确认项（${id}）`,
    '',
    `- 页面观察/操作观察来源：${source}`,
    '- 【待确认】接口方法、请求参数、响应结构、后端校验、权限矩阵、持久化结果和审计记录均未由本轮只读页面证据确认。',
    '- 【待确认】字段默认值、完整长度与格式、逐按钮确认框、提交中禁用策略、错误文案、重试/幂等和状态恢复需逐项补证。',
    '- 【拟定需求】AI 实现前必须将上述待确认项转为调查任务；在证据补齐前只实现已观察的页面结构，并把未知行为显式作为配置或接口契约占位。',
    '',
  ].join('\n');
}

function augmentFile(file, acceptanceCounters = new Map()) {
  const originalText = read(file);
  let text = originalText;
  const heading = /^### ([A-Z]+-\d{3})([^\n]*)\n/gm;
  const matches = [...text.matchAll(heading)];
  const acceptanceStarts = new Map();
  if (matches.length) {
    const prefix = matches[0][1].split('-')[0];
    let nextAcceptance = Math.max(acceptanceCounters.get(prefix) || 1, maxAcceptanceSequence(path.dirname(file), prefix) + 1);
    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const block = text.slice(match.index, matches[index + 1]?.index ?? text.length);
      const markerIndex = block.indexOf(`<!-- 完整规格:${match[1]} -->`);
      const existing = markerIndex < 0 ? null : block.slice(markerIndex).match(new RegExp(`^\\| ${prefix}-AC-(\\d{3}) \\|`, 'm'));
      if (existing) {
        acceptanceStarts.set(match.index, Number(existing[1]));
      } else {
        acceptanceStarts.set(match.index, nextAcceptance);
        nextAcceptance += 5;
      }
    }
    acceptanceCounters.set(prefix, nextAcceptance);
  }
  let changed = false;
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const match = matches[i];
    const id = match[1];
    const title = clean(match[2]);
    const start = match.index;
    const contentStart = start + match[0].length;
    const nextSlice = text.slice(contentStart);
    const next = nextSlice.search(/\n### |\n## /);
    const end = next < 0 ? text.length : contentStart + next + 1;
    const block = text.slice(start, end);
    const marker = `<!-- 完整规格:${id} -->`;
    const markerIndex = block.indexOf(marker);
    if (markerIndex >= 0 && !process.argv.includes('--refresh')) continue;
    const originalBlock = markerIndex >= 0 ? block.slice(0, markerIndex).trimEnd() : block.trimEnd();
    const sourceRefs = evidenceRefs(originalBlock, file);
    const acceptanceStart = acceptanceStarts.get(start);
    if (originalText.includes('<!-- drms:generated-spec-v1 -->')) {
      const entry = [...drmsMain, ...drmsSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed DRMS requirement: ' + id);
      const replacement = renderDrmsFeature(entry) + '\n';
      text = text.slice(0, start) + replacement + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- dbms:generated-spec-v1 -->')) {
      const entry = [...dbmsMain, ...dbmsSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed DBMS requirement: ' + id);
      text = text.slice(0, start) + renderDbmsFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- cms:generated-spec-v1 -->')) {
      const entry = [...cmsMain, ...cmsSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed CMS requirement: ' + id);
      text = text.slice(0, start) + renderCmsFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- wo:generated-spec-v1 -->')) {
      const entry = [...woMain, ...woSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed WO requirement: ' + id);
      text = text.slice(0, start) + renderWoFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- dis:generated-spec-v1 -->')) {
      const entry = [...disMain, ...disSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed DIS requirement: ' + id);
      text = text.slice(0, start) + renderDisFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- sms:generated-spec-v1 -->')) {
      const entry = [...smsMain, ...smsSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed SMS requirement: ' + id);
      text = text.slice(0, start) + renderSmsFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- ds:generated-spec-v1 -->')) {
      const entry = [...dsMain, ...dsSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed DS requirement: ' + id);
      text = text.slice(0, start) + renderDsFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- gsb:generated-spec-v1 -->')) {
      const entry = [...gsbMain, ...gsbSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed GSB requirement: ' + id);
      text = text.slice(0, start) + renderGsbFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- dss:generated-spec-v1 -->')) {
      const entry = [...dssMain, ...dssSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed DSS requirement: ' + id);
      text = text.slice(0, start) + renderDssFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- gdrs:generated-spec-v1 -->')) {
      const entry = [...gdrsMain, ...gdrsSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed GDRS requirement: ' + id);
      text = text.slice(0, start) + renderGdrsFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- dms:generated-spec-v1 -->')) {
      const entry = [...dmsMain, ...dmsSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed DMS requirement: ' + id);
      text = text.slice(0, start) + renderDmsFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- dq:generated-spec-v1 -->')) {
      const entry = [...dqMain, ...dqSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed DQ requirement: ' + id);
      text = text.slice(0, start) + renderDqFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- dse:generated-spec-v1 -->')) {
      const entry = [...dseMain, ...dseSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed DSE requirement: ' + id);
      text = text.slice(0, start) + renderDseFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- mdm:generated-spec-v1 -->')) {
      const { MAIN, SUB, renderFeature } = require('./mdm-requirement-spec');
      const entry = [...MAIN, ...SUB].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed MDM requirement: ' + id);
      text = text.slice(0, start) + renderFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- tms:generated-spec-v1 -->')) {
      const { MAIN, SUB, renderFeature } = require('./tms-requirement-spec');
      const entry = [...MAIN, ...SUB].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed TMS requirement: ' + id);
      text = text.slice(0, start) + renderFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- dcs:generated-spec-v1 -->')) {
      const entry = [...dcsMain, ...dcsSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed DCS requirement: ' + id);
      text = text.slice(0, start) + renderDcsFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- gspa:generated-spec-v1 -->')) {
      const { MAIN, SUB, renderFeature } = require('./gspa-requirement-spec');
      const entry = [...MAIN, ...SUB].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed GSPA requirement: ' + id);
      text = text.slice(0, start) + renderFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- idqs:generated-spec-v1 -->')) {
      const { MAIN, SUB, renderFeature } = require('./idqs-requirement-spec');
      const entry = [...MAIN, ...SUB].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed IDQS requirement: ' + id);
      text = text.slice(0, start) + renderFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- dap:generated-spec-v1 -->')) {
      const { MAIN, SUB, renderFeature } = require('./dap-requirement-spec');
      const entry = [...MAIN, ...SUB].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed DAP requirement: ' + id);
      text = text.slice(0, start) + renderFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    if (originalText.includes('<!-- gsp:generated-spec-v1 -->')) {
      const entry = [...gspMain, ...gspSub].find(item => item.id === id);
      if (!entry) throw new Error('Unregistered reviewed GSP requirement: ' + id);
      text = text.slice(0, start) + renderGspFeature(entry) + '\n' + text.slice(end);
      continue;
    }
    const spec = id === 'AUTH-001' ? renderLoginSpec(acceptanceStart)
      : ['HOME-001', 'HOME-002'].includes(id) ? renderHomeSpec(id, acceptanceStart) : reviewedSpecs[id]
      ? renderReviewedSpec(reviewedSpecs[id], acceptanceStart, sourceLinks(sourceRefs))
      : buildSpec(id, title, block, sourceRefs, acceptanceStart);
    text = text.slice(0, start) + originalBlock + '\n\n' + spec + text.slice(end);
    changed = true;
  }
  changed = text !== originalText;
  if (changed) fs.writeFileSync(file, text, 'utf8');
  return { file, requirements: matches.length, changed };
}

function withoutGeneratedSpecs(text) {
  const headings = [...text.matchAll(/^### ([A-Z]+-\d{3})[^\n]*\n/gm)];
  for (let index = headings.length - 1; index >= 0; index -= 1) {
    const heading = headings[index];
    const contentStart = heading.index + heading[0].length;
    const tail = text.slice(contentStart);
    const next = tail.search(/\n### |\n## /);
    const end = next < 0 ? text.length : contentStart + next + 1;
    const marker = `<!-- 完整规格:${heading[1]} -->`;
    const markerIndex = text.slice(heading.index, end).indexOf(marker);
    if (markerIndex >= 0) text = text.slice(0, heading.index + markerIndex) + text.slice(end);
  }
  return text;
}

function maxAcceptanceSequence(directory, prefix) {
  let maximum = 0;
  for (const name of ['需求说明.md', '子页面与操作细化.md']) {
    const file = path.join(directory, name);
    if (!fs.existsSync(file)) continue;
    const text = read(file);
    const expression = new RegExp(`${prefix}-AC-(\\d{3})`, 'g');
    for (const match of text.matchAll(expression)) maximum = Math.max(maximum, Number(match[1]));
  }
  return maximum;
}

function syncBusinessAcceptance(root = REQUIREMENTS) {
  const file = path.join(root, '采样清单.json');
  const manifest = JSON.parse(read(file));
  let changed = 0;
  for (const module of manifest.modules) {
    if (!Array.isArray(module.businessAcceptance)) continue;
    const text = read(path.join(root, module.directory, '需求说明.md'));
    const cases = [...text.matchAll(/^\| ([A-Z]+-AC-\d{3}) \|/gm)].map((match) => match[1]);
    if (JSON.stringify(cases) === JSON.stringify(module.businessAcceptance)) continue;
    module.businessAcceptance = cases;
    changed += 1;
  }
  if (changed) fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return changed;
}

function refreshUserMenu(root = REQUIREMENTS) {
  const file = path.join(root, '02-工作台', '用户菜单补充清单.md');
  if (!fs.existsSync(file)) return false;
  const original = read(file);
  let text = original;
  const matches = [...text.matchAll(/^### (UAC-\d{3})[^\n]*\n/gm)];
  for (const match of matches.reverse()) {
    const id = match[1];
    if (!reviewedSpecs[id]) continue;
    const contentStart = match.index + match[0].length;
    const next = text.slice(contentStart).search(/\n### |\n## /);
    const end = next < 0 ? text.length : contentStart + next + 1;
    const block = text.slice(match.index, end);
    const marker = block.indexOf(`<!-- 完整规格:${id} -->`);
    const body = (marker < 0 ? block : block.slice(0, marker)).trimEnd();
    const cases = [...original.matchAll(/^\| (UAC-AC-\d{3}) \|([^\n]*)$/gm)]
      .filter(row => row[2].includes(`| ${id} |`));
    if (cases.length !== 5) throw new Error(`${id}: expected five existing user-menu acceptance cases`);
    const spec = renderReviewedSpec(reviewedSpecs[id], Number(cases[0][1].slice(-3)))
      .replace(/^\| (UAC-AC-\d{3}) \|/gm, '| 检查项（登记到$1） |');
    text = text.slice(0, match.index) + body + '\n\n' + spec + text.slice(end);
  }
  const caseIndexes = new Map();
  text = text.replace(/^\| (UAC-AC-\d{3}) \|([^\n]*)$/gm, (row, caseId, tail) => {
    const id = tail.match(/\| (UAC-\d{3}) \|/)?.[1];
    if (!reviewedSpecs[id]) return row;
    const index = caseIndexes.get(id) || 0;
    caseIndexes.set(id, index + 1);
    return `| ${caseId} | ${reviewedSpecs[id].checks[index].replace(/\|/g, '&#124;')} | ${id} | 【拟定，未执行】 |`;
  });
  if (text !== original) fs.writeFileSync(file, text, 'utf8');
  return text !== original;
}

function run() {
  const files = [];
  for (const dir of fs.readdirSync(REQUIREMENTS, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const name of ['需求说明.md', '子页面与操作细化.md']) {
      const file = path.join(REQUIREMENTS, dir.name, name);
      if (fs.existsSync(file)) files.push(file);
    }
  }
  const acceptanceCounters = new Map();
  const results = files.map((file) => augmentFile(file, acceptanceCounters));
  const changed = results.filter((result) => result.changed);
  const userMenuChanged = refreshUserMenu();
  const registriesChanged = syncBusinessAcceptance();
  console.log(JSON.stringify({ files: results.length, changed: changed.length, userMenuChanged, registriesChanged, requirements: results.reduce((n, result) => n + result.requirements, 0) }));
}

if (require.main === module) run();

module.exports = { buttonNamesFromControls, fieldName, buildSpec, operationType, augmentFile, maxAcceptanceSequence, withoutGeneratedSpecs, syncBusinessAcceptance, refreshUserMenu };
