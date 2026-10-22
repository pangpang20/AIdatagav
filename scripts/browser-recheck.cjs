/* Helpers for the existing authenticated, read-only research browser. */
module.exports = function install({ page, capture, fs, evRoot, journalName = 'crawl-ledger.json' }) {
  const settle = async () => {
    await page.waitForTimeout(1800);
    await page.locator('.el-loading-mask:visible').first()
      .waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(250);
    const body = await page.locator('body').innerText();
    if (!await page.locator('input:visible, textarea:visible, table:visible, .el-empty:visible').count())
      await page.waitForTimeout(3500);
  };
  const visibleText = text => page.getByText(text, { exact: true })
    .and(page.locator(':visible')).first();
  const report = async id => {
    if (fs.existsSync(evRoot + '/' + id + '.json') || fs.existsSync(evRoot + '/' + id + '.png'))
      throw new Error('Evidence ID already exists; use a new batch prefix');
    let d = await capture(id, page);
    if (d.text !== (await page.locator('body').innerText()).split(new URL(page.url()).origin).join(''))
      d.captureTimingLimit = 'Body changed during screenshot; verify image and metadata independently.';
    const main = page.locator('.el-main:visible').first();
    const content = await main.count() ? await main.innerText() : d.text;
    d.content = content;
    d = JSON.parse(JSON.stringify(d).split(new URL(page.url()).origin).join(''));
    fs.writeFileSync(evRoot + '/' + id + '.json', JSON.stringify(d, null, 2) + '\n');
    console.log(JSON.stringify({ id, url: d.url, headers: d.headers,
      actions: [...new Set(d.actions.map(x => x.text || x.title))].slice(0, 35),
      forms: d.forms.map(f => ({ label: f.label, required: f.requiredMarker,
        fields: f.fields.slice(0, 3) })),
      options: d.options.filter(x => x.text),
      tail: content.slice(-450), blocked: d.blockedRequests }));
    return d;
  };
  const goto = async url => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(4500);
    await settle();
  };
  const waitForContentChange = async before => {
    await page.waitForFunction(text => document.body.innerText !== text, before,
      { timeout: 8000 }).catch(() => {});
    await settle();
  };
  const menu = async (name, id, occurrence) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const target = page.locator('.el-menu-item:visible')
      .filter({ hasText: new RegExp('^\\s*' + escaped + '\\s*$') });
    if (await target.count() === 0 || (occurrence == null && await target.count() !== 1))
      throw new Error('Menu is missing or ambiguous: ' + name);
    const beforePath = new URL(page.url()).pathname;
    const before = await page.locator('body').innerText();
    await (occurrence == null ? target : target.nth(occurrence)).click();
    await page.waitForFunction(path => location.pathname !== path, beforePath, { timeout: 3500 }).catch(() => {});
    await waitForContentChange(before);
    return report(id);
  };
  const actionText = text => {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const controls = page.locator('button:visible, a:visible, [role="button"]:visible, .el-link:visible, .audaque-action-icon--opreate:visible, .audaque-action-icon:visible, .audaque-link-text:visible');
    return controls.filter({ hasText: new RegExp('^\\s*' + escaped + '\\s*$') })
      .or(page.locator('[title=' + JSON.stringify(text) + ']:visible')).first();
  };
  const cancel = async () => {
    const button = page.getByRole('button', { name: /^(取\s*消|关\s*闭)$/ })
      .and(page.locator(':visible')).last();
    if (await button.count()) { await button.click(); await settle(); return; }
    const close = page.locator('.el-dialog:visible .el-dialog__headerbtn').last();
    if (await close.count()) { await close.click(); await settle(); return; }
    throw new Error('No observed cancel/close control');
  };
  const open = async (text, id) => {
    await visibleText(text).click();
    await settle();
    return report(id);
  };
  const title = async (text, id) => {
    await page.locator('[title=' + JSON.stringify(text) + ']:visible').first().click();
    await settle();
    return report(id);
  };
  const expandAll = async () => {
    for (let n = 0; n < 40; n++) {
      const closed = page.locator('.el-submenu:not(.is-opened) > .el-submenu__title:visible').first();
      if (!await closed.count()) break;
      await closed.click();
      await page.waitForTimeout(120);
    }
  };
  const leafNames = async () => page.locator('.el-menu-item:visible')
    .evaluateAll(es => [...new Set(es.map(e => e.innerText.trim()))]);
  const leafLinks = async () => page.locator('.el-menu-item:visible').evaluateAll(es => {
    const counts = {};
    return es.map(e => {
      const name = e.innerText.trim(); const parts = [name];
      for (let p = e.parentElement; p; p = p.parentElement) {
        if (p.classList.contains('el-submenu')) {
          const title = p.querySelector(':scope > .el-submenu__title');
          if (title) parts.unshift(title.innerText.trim());
        }
      }
      const occurrence = counts[name] || 0; counts[name] = occurrence + 1;
      return { name, hierarchy: parts.join(' → '), occurrence };
    });
  });
  const sweep = async (name, prefix, labels = ['新增', '编辑', '查看详情', '详情', '查看']) => {
    await expandAll();
    const list = await menu(name, prefix + '-list');
    const base = page.url();
    for (const label of labels) {
      if (!['新增', '编辑', '查看详情', '详情', '查看', '关联权限', '租户用户列表',
        '新增部门人员', '设置账号有效期'].includes(label)) throw new Error('Action not allowlisted');
      const target = actionText(label);
      if (!await target.count()) continue;
      const before = await page.locator('body').innerText();
      await target.click();
      await settle();
      const d = await report(prefix + '-' + labels.indexOf(label));
      d.operation = { menu: name, action: label, source: list.id,
        changedContent: before !== d.text, businessWriteExecuted: false };
      fs.writeFileSync(evRoot + '/' + d.id + '.json', JSON.stringify(d, null, 2) + '\n');
      try { await cancel(); }
      catch { await page.goto(base); await settle(); }
      await expandAll();
    }
  };
  const inspectOperations = async (link, base) => {
    link.operations = [];
    const labels = ['新增', '新建', '编辑', '修改', '查看详情', '详情', '查看', '设计', '版本管理', '运行结果', '库表注册', '第三方接口注册', '资源导入', '编目', '需求任务'];
    for (const label of labels) {
      const target = actionText(label);
      if (!await target.count()) continue;
      const op = { name: label, status: 'pending', businessWriteExecuted: false };
      link.operations.push(op);
      try {
        const beforeText = await page.locator('body').innerText();
        const beforePath = page.url();
        await target.click(); await waitForContentChange(beforeText);
        // Maintenance pages may receive unsaved router state. Reloading them
        // discards that state, so observe the click result in the same document.
        const d = await report(link.id + '-op' + link.operations.length);
        op.evidence = d.id; op.path = d.url;
        const changed = beforeText !== d.text || beforePath !== page.url();
        op.status = !changed ? 'target-not-observed' : d.blockedRequests.length ? 'opened-with-request-limits' : 'opened-review-content';
        d.operation = { menu: link.hierarchy || link.name, action: label, source: link.evidence,
          changedContent: changed, businessWriteExecuted: false };
        fs.writeFileSync(evRoot + '/' + d.id + '.json', JSON.stringify(d, null, 2) + '\n');
        if (d.forms.length) {
          const selects = page.locator('.el-form-item .el-select input[placeholder]:visible');
          const count = await selects.count();
          op.selectControls = count;
          for (let i = 0; i < Math.min(count, 6); i++) {
            const s = selects.nth(i);
            if (await s.isDisabled()) continue;
            try {
              await s.click(); await page.waitForTimeout(300);
              const options = await report(d.id + '-options' + i);
              (op.optionEvidence ||= []).push(options.id);
              await s.click();
            } catch (e) { op.optionLimit = e.name; break; }
          }
        }
      } catch (e) { op.status = 'navigation-error'; op.reason = e.name; }
      try { await cancel(); } catch {}
      await goto(base);
      await expandAll();
    }
    const more = visibleText('更多');
    if (await more.count()) {
      try { await more.click(); await page.waitForTimeout(350);
        const d = await report(link.id + '-more'); link.moreEvidence = d.id;
        await page.mouse.move(1450, 100); await page.keyboard.press('Escape');
      } catch (e) { link.moreLimit = e.name; }
    }
  };
  const walkModule = async (code, root, operations = true, prefix = 'V') => {
    const manifest = JSON.parse(fs.readFileSync(root + '/doc/requirements/采样清单.json', 'utf8'));
    const mod = manifest.modules.find(m => m.code === code);
    const source = JSON.parse(fs.readFileSync(root + '/doc/requirements/evidence/' + mod.evidence[0] + '.json', 'utf8'));
    const route = source.url;
    if (!route.startsWith('/') || route.startsWith('//')) throw new Error('Expected observed application path');
    const journalPath = evRoot + '/' + journalName;
    const journal = fs.existsSync(journalPath) ? JSON.parse(fs.readFileSync(journalPath, 'utf8')) : [];
    const save = () => fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2) + '\n');
    await goto(new URL(route, page.url()).href);
    await expandAll();
    const entry = await report(prefix + '-' + code + '-000-entry');
    await settle();
    await expandAll();
    const names = await leafLinks();
    const group = { code, name: mod.name, source: mod.evidence[0], entry: entry.id,
      discoveredAt: new Date().toISOString(), links: names.map((link, i) => ({ ...link, id: prefix + '-' + code + '-' + String(i + 1).padStart(3, '0'), status: 'pending' })) };
    journal.push(group); save();
    for (const link of group.links) {
      if (fs.existsSync(evRoot + '/pause-requested')) {
        console.log(JSON.stringify({ code, status: 'paused-at-menu-boundary' }));
        save(); return;
      }
      if (/^(退出登录|注销|重启服务|停止服务|启动服务|执行任务|立即运行|提交|保存|删除|发布)$/.test(link.name)) {
        link.status = 'write-risk-not-opened'; save(); continue;
      }
      try {
        await expandAll();
        const d = await menu(link.name, link.id, link.occurrence);
        link.path = d.url; link.evidence = d.id;
        link.status = d.blockedRequests.length ? 'opened-with-request-limits' : 'opened-review-content';
        save();
        if (operations) { await inspectOperations(link, page.url()); save(); }
      } catch (e) {
        link.status = 'navigation-error'; link.reason = e.name || 'Error';
        console.log(JSON.stringify({ code, link: link.name, status: link.status }));
      }
      save();
    }
    console.log(JSON.stringify({ code, discovered: group.links.length, states: group.links.map(x => [x.name, x.status]) }));
  };
  return { goto, settle, visibleText, actionText, report, menu, cancel, open, title, expandAll, leafNames, leafLinks, sweep, inspectOperations, walkModule };
};
