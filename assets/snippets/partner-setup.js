// High risk partner set-up - paste into the partner portal's browser console
// while the new partner's dashboard is open (address contains /app/<partnerId>/).
//
// 1. Reads the partner's name and ID
// 2. Reads the partner's products and removes all but the high risk product
//    (skipped if that is already the only one)
// 3. Creates the sales organisation "Sales Organisation" (skipped if it exists)
// 4. Creates the sales team "Sales Team" in it (skipped if it exists)
//
// Shows the plan in a confirm box first; nothing changes until OK. Safe to
// re-run: finished steps are detected and skipped. The API address and auth
// scope are read from the portal's own config at run time.
(async () => {
  const KEEP_ID = '01KBF8NKP5Q17Q2VZPXRWXKZA0';
  const KEEP_NAME = 'ECOM - Integrated / Gateway (High Risk)';
  const ORG_NAME = 'Sales Organisation';
  const TEAM_NAME = 'Sales Team';

  const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  const stop = msg => console.error('STOP: ' + msg);

  const m = location.pathname.match(/\/app\/([0-9A-HJKMNP-TV-Z]{26})(\/|$)/i);
  if (!m) return stop("Open the partner's dashboard first (address like .../app/<partnerId>/...), then paste again.");
  const PARTNER_ID = m[1].toUpperCase();

  const cfg = await (await fetch('/config/config.json')).json();
  const apiCfg = cfg.msalConfig.apis[0];
  const API = apiCfg.uri.replace(/\/$/, '');
  const scopeId = apiCfg.scopes[0].split('/')[3];

  const now = Math.floor(Date.now() / 1000);
  const token = [...Object.values(sessionStorage), ...Object.values(localStorage)]
    .map(v => { try { return JSON.parse(v); } catch { return null; } })
    .filter(o => o?.credentialType === 'AccessToken' && o?.secret && String(o?.target || '').includes(scopeId)
      && Number(o.expiresOn || 0) - 60 > now)
    .sort((a, b) => Number(b.expiresOn) - Number(a.expiresOn))[0]?.secret;
  if (!token) return stop('No valid API token found. Refresh the portal page (it renews your session), then paste again.');

  async function api(method, path, body) {
    const r = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`${method} ${path} -> HTTP ${r.status} ${text.slice(0, 300)}`);
    try { return text ? JSON.parse(text) : null; } catch { return text; }   // create calls return a bare id
  }
  const asId = v => { const s = String(v ?? '').replace(/^"|"$/g, '').trim(); return ULID.test(s) ? s : null; };

  async function getProducts() {
    const all = [];
    for (let page = 1; ; page++) {
      const d = await api('GET', `/v2/partners/${PARTNER_ID}/product-definitions?pageNum=${page}&pageSize=100`);
      all.push(...d.items);
      if (!d.hasNextPage) break;
    }
    return all;
  }
  const getOrgs = async () => (await api('GET', `/v1/sales-organizations?partnerId=${PARTNER_ID}`) || []).filter(o => !o.partnerId || o.partnerId === PARTNER_ID);
  const getTeams = async () => (await api('GET', `/sales-teams?partnerId=${PARTNER_ID}`) || []).filter(t => !t.partnerId || t.partnerId === PARTNER_ID);

  try {
    // 1. Partner
    let partnerName = '(name not found)';
    try { partnerName = (await api('GET', `/v1/partners/${PARTNER_ID}`)).name || partnerName; }
    catch { try { partnerName = (await api('GET', `/v1/partners/${PARTNER_ID}/appearance-settings`)).partnerName || partnerName; } catch {} }
    console.log(`Partner: ${partnerName} (ID ${PARTNER_ID})`);

    // 2. Products
    const products = await getProducts();
    const keep = products.find(p => p.id === KEEP_ID);
    if (!keep) return stop(`"${KEEP_NAME}" is not assigned to ${partnerName}. Add it to the partner first. Nothing was changed.`);
    if (keep.name.trim() !== KEEP_NAME) return stop(`Product ${KEEP_ID} is now called "${keep.name}", expected "${KEEP_NAME}". Nothing was changed.`);
    const toRemove = products.filter(p => p.id !== KEEP_ID);

    let org = (await getOrgs()).find(o => same(o.name, ORG_NAME));
    let team = org ? (await getTeams()).find(t => same(t.name, TEAM_NAME) && t.salesOrganizationId === org.id) : null;

    // Plan, asked once
    console.log(`Products: ${products.length} assigned. Keeping "${KEEP_NAME}".`);
    if (toRemove.length) {
      console.log(`Will remove ${toRemove.length}:`);
      console.table(toRemove.map(p => ({ id: p.id, name: p.name, category: p.category, status: p.status })));
    }
    const plan = [
      toRemove.length ? `- Remove ${toRemove.length} products (keep only "${KEEP_NAME}")` : `- Products: already only "${KEEP_NAME}" - skip`,
      org ? `- Sales org "${ORG_NAME}": already exists - skip` : `- Create sales org "${ORG_NAME}"`,
      team ? `- Sales team "${TEAM_NAME}": already exists - skip` : `- Create sales team "${TEAM_NAME}" in "${ORG_NAME}"`
    ];
    console.log('Plan:\n' + plan.join('\n'));
    if (!toRemove.length && org && team) return console.log(`DONE: ${partnerName} is already fully set up. Nothing to do.`);

    if (!confirm(`Partner: ${partnerName}\n(${PARTNER_ID})\n\n${plan.join('\n')}\n\nProduct removal can't be undone (the partner's price-sheet copies are deleted).\n\nGo ahead?`)) {
      return console.log('Cancelled - nothing was changed.');
    }

    // 3. Remove products
    if (toRemove.length) {
      console.log(`Removing ${toRemove.length} products...`);
      const failed = [];
      for (const p of toRemove) {
        try { await api('DELETE', `/partners/${PARTNER_ID}/products/${p.id}`); console.log(`OK  ${p.name}`); }
        catch (e) { failed.push({ name: p.name, id: p.id, error: e.message }); console.log(`ERR ${p.name}`); }
        await new Promise(res => setTimeout(res, 150));
      }
      if (failed.length) {
        console.table(failed);
        // A new sales team copies every product the partner has, so it is not created while extras remain.
        return stop(`${failed.length} product(s) failed to remove, so the sales org and team were NOT created. Paste again to retry.`);
      }
      const left = await getProducts();
      if (left.length !== 1 || left[0].id !== KEEP_ID) {
        console.table(left.map(p => ({ id: p.id, name: p.name })));
        return stop(`Partner still has ${left.length} products after removal, so the sales org and team were NOT created. Paste again to retry.`);
      }
      console.log(`OK  Only "${KEEP_NAME}" remains.`);
    }

    // 4. Sales organisation
    if (!org) {
      const created = asId(await api('POST', `/v1/sales-organizations?partnerId=${PARTNER_ID}`, { name: ORG_NAME }));
      org = (await getOrgs()).find(o => (created && o.id === created) || same(o.name, ORG_NAME));
      if (!org) return stop(`Sales org was sent but can't be found on ${partnerName}. Check the Sales Organisations page before re-running.`);
      console.log(`OK  Sales org "${org.name}" created (ID ${org.id})`);
    }

    // 5. Sales team
    if (!team) {
      const created = asId(await api('POST', '/sales-teams', { name: TEAM_NAME, salesOrganizationId: org.id }));
      team = (await getTeams()).find(t => (created && t.id === created) || (same(t.name, TEAM_NAME) && t.salesOrganizationId === org.id));
      if (!team) return stop(`Sales team was sent but can't be found on ${partnerName}. Check the Sales Teams page before re-running.`);
      console.log(`OK  Sales team "${team.name}" created (ID ${team.id})`);
    }

    // Final check
    const finalProducts = await getProducts();
    console.table([
      { item: 'Partner', value: `${partnerName} (${PARTNER_ID})` },
      { item: 'Products', value: finalProducts.map(p => p.name).join(', ') },
      { item: 'Sales org', value: `${org.name} (${org.id})` },
      { item: 'Sales team', value: `${team.name} (${team.id}) in ${team.salesOrganizationName || org.name}` }
    ]);
    console.log(finalProducts.length === 1 && finalProducts[0].id === KEEP_ID
      ? `DONE: ${partnerName} is set up.`
      : `CHECK: product list isn't just "${KEEP_NAME}" - look at the Products page.`);
    console.log('Note: the sales team shows as inactive until it has at least one manager and one agent.');
  } catch (e) {
    stop(`Something went wrong: ${e.message}\nPaste again to carry on - finished steps are skipped.`);
  }
})();