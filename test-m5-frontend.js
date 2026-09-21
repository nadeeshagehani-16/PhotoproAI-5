// M5 frontend validation unit test: calendar.js _validateCalEditServiceForm (stubbed DOM)
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, 'Photopro-AI', 'js', 'pages', 'calendar.js'), 'utf8');

// Stub DOM
const fields = {};
const documentStub = {
  getElementById: (id) => (fields[id] !== undefined ? fields[id] : { value: '' })
};
const sandbox = { document: documentStub, lucide: { createIcons: () => {} }, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

function setFields(o) {
  for (const k of Object.keys(fields)) delete fields[k];
  Object.assign(fields, o);
}
function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const validClient = '507f1f77bcf86cd799439011';
let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS  ' + name); }
  else { failed++; console.log('FAIL  ' + name + '  >> ' + detail); }
}

const base = {
  'cesb-client': { value: validClient },
  'cesb-event': { value: 'Wedding' },
  'cesb-date': { value: dateStr(3) },
  'cesb-start': { value: '10:00' },
  'cesb-end': { value: '12:00' },
  'cesb-location': { value: 'Colombo' },
  'cesb-amount': { value: '5000' },
  'cesb-notes': { value: 'ok' },
};

function run(mod) {
  setFields(JSON.parse(JSON.stringify(base)));
  if (mod) {
    for (const k of Object.keys(mod)) {
      fields[k] = (typeof mod[k] === 'object' && mod[k] !== null && 'value' in mod[k]) ? mod[k] : { value: mod[k] };
    }
  }
  return sandbox._validateCalEditServiceForm();
}

let errs;

errs = run();
check('T1  valid form produces no errors', errs.length === 0, JSON.stringify(errs));

errs = run({ 'cesb-date': { value: dateStr(-7) } });
check('T2  past date rejected with clear message', errs.some(e => /past/i.test(e)), JSON.stringify(errs));

errs = run({ 'cesb-date': { value: dateStr(0) } });
check('T3  today date allowed', errs.length === 0, JSON.stringify(errs));

errs = run({ 'cesb-end': { value: '09:00' } });
check('T4  end before start rejected', errs.some(e => /after start/i.test(e)), JSON.stringify(errs));

errs = run({ 'cesb-end': { value: '10:00' } });
check('T5  end equal to start rejected', errs.some(e => /after start/i.test(e)), JSON.stringify(errs));

errs = run({ 'cesb-amount': { value: '-100' } });
check('T6  negative amount rejected', errs.some(e => /negative/i.test(e)), JSON.stringify(errs));

errs = run({ 'cesb-amount': { value: '0' } });
check('T7  zero amount allowed', errs.length === 0, JSON.stringify(errs));

errs = run({ 'cesb-event': { value: '   ' } });
check('T8  empty event rejected (required)', errs.some(e => /required/i.test(e)), JSON.stringify(errs));

errs = run({ 'cesb-location': { value: '' } });
check('T9  empty location rejected (required)', errs.some(e => /required/i.test(e)), JSON.stringify(errs));

errs = run({ 'cesb-client': { value: 'not-an-objectid' } });
check('T10 invalid client id rejected', errs.some(e => /valid client/i.test(e)), JSON.stringify(errs));

errs = run({ 'cesb-start': { value: '9am' } });
check('T11 invalid time format rejected', errs.some(e => /format/i.test(e)), JSON.stringify(errs));

errs = run({ 'cesb-notes': { value: 'x'.repeat(1001) } });
check('T12 notes >1000 chars rejected', errs.some(e => /1000/.test(e)), JSON.stringify(errs));

errs = run({ 'cesb-date': { value: dateStr(-1) }, 'cesb-amount': { value: '-5' }, 'cesb-location': { value: '' } });
check('T13 multiple errors all reported together', errs.length === 3, JSON.stringify(errs));

// Sanity: the validator is wired into the handler (source check)
const src = code;
check('T14 handler wires validator before API call',
  /const errors = _validateCalEditServiceForm\(\);\s*\n\s*if \(errors\.length > 0\) \{ _calShowErrors\(errEl, errors, btn, 'Save Changes'\); return; \}/.test(src),
  'wiring not found in handleCalUpdateService');

console.log('');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
