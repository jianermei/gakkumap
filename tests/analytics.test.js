const vm = require('vm'), fs = require('fs'), assert = require('assert');
function setup(host) {
  const context = {location: {hostname:host, origin:'https://'+host, pathname:'/', search:'?address=private'}, document:{createElement:()=>({}), head:{appendChild:()=>{}}, addEventListener:()=>{}}};
  context.window = context;
  vm.createContext(context); vm.runInContext(fs.readFileSync('analytics.js','utf8'),context);
  return context;
}
const preview = setup('hash.gakkumap-beta.pages.dev');
preview.trackUsage('page_view'); assert(!preview.dataLayer);
['localhost', 'gakkumap.com.example.org'].forEach(host => assert(!setup(host).dataLayer));
const production = setup('gakkumap.com');
assert(production.dataLayer);
assert(JSON.stringify(production.dataLayer).includes('https://gakkumap.com/'));
assert(JSON.stringify(production.dataLayer).includes('G-BQH1G4QSHK'));
const c = setup('gakkumap-beta.pages.dev');
c.trackUsage('place_search_submitted',{query:'secret address',apiKey:'secret',duration_ms:12});
const data = JSON.stringify(c.dataLayer);
assert(!data.includes('secret')); assert(!data.includes('?address='));
assert(data.includes('place_search_submitted'));
const count = c.dataLayer.length; c.trackUsage('unapproved_event'); assert.equal(c.dataLayer.length,count);
console.log('PASS: hostname filtering, event allowlist and excluded properties');
