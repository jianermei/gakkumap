// Run with node tests/lazySchoolData.test.js; no packages or paid API requests.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let requests = [], selected = 'school', rendered, messages = [];
let respond = path => Promise.resolve({ok: true, json: () => Promise.resolve({schools: {school: []}})});
const ctx = {
  trackUsage: () => {}, Map, console, document: {addEventListener: () => {}}, modernSchools: {school: {id: 'school', name: 'School', address: 'Address', boundary: 'chunk.json'}},
  fetch: url => { requests.push(url); return respond(url); },
  $: () => ({val: () => selected, text: s => messages.push(s)}),
  renderModernSchool: school => { rendered = school; },
  clearSchoolBoundary: () => { ctx.boundaryLoadVersion++; },
  deletePoly: () => { ctx.boundaryLoadVersion++; }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('lazySchoolData.js', 'utf8'), ctx);
(async function () {
  assert.equal(requests.length, 0);
  await ctx.loadSelectedBoundary();
  assert.equal(rendered.name, 'School'); assert.equal(requests.length, 1);
  await ctx.loadSelectedBoundary(); assert.equal(requests.length, 1, 'Repeat draw should reuse chunk');
  ctx.dataCache.clear(); rendered = null;
  let finish;
  respond = () => new Promise(resolve => { finish = resolve; });
  const pending = ctx.loadSelectedBoundary();
  ctx.deletePoly();
  finish({ok: true, json: () => Promise.resolve({schools: {school: []}})});
  await pending; assert.equal(rendered, null, 'Old response must not redraw after selection/clear');
  ctx.dataCache.clear();
  respond = () => Promise.resolve({ok: false, status: 404});
  await ctx.loadSelectedBoundary(); assert.equal(ctx.dataCache.size, 0);
  respond = () => Promise.resolve({ok: true, json: () => Promise.resolve({schools: {school: []}})});
  await ctx.loadSelectedBoundary(); assert(rendered, 'Failed downloads must be retryable');
  for (let i=0;i<20;i++) await ctx.loadMapAsset('chunk-'+i+'.json');
  assert(ctx.dataCache.size <= 12, 'Bounded memory cache');
  ctx.dataCache.clear(); requests = [];
  ctx.dataRoot = './data/elementary/2023/'; await ctx.loadMapAsset('same.json');
  ctx.dataRoot = './data/junior-high/2023/'; await ctx.loadMapAsset('same.json');
  assert.equal(requests.length, 2, 'School types must not share cache entries');
  console.log('PASS: lazy requests, reuse, stale-result cancellation, failure retry, bounded cache');
})().catch(e => { console.error(e); process.exitCode=1; });
