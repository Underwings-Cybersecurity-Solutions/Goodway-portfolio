const test = require('node:test');
const assert = require('node:assert');
const { resolveDoc, DOCS } = require('./docs');

test('brochure resolves to brochure file + label', () => {
  const d = resolveDoc('brochure');
  assert.strictEqual(d.key, 'brochure');
  assert.strictEqual(d.label, 'Brochure');
  assert.strictEqual(d.file, 'goodway-brochure.pdf');
});

test('company-profile resolves correctly', () => {
  const d = resolveDoc('company-profile');
  assert.strictEqual(d.key, 'company-profile');
  assert.strictEqual(d.label, 'Company Profile');
  assert.strictEqual(d.file, 'goodway-company-profile.pdf');
});

test('missing doc defaults to company-profile', () => {
  assert.strictEqual(resolveDoc(undefined).key, 'company-profile');
  assert.strictEqual(resolveDoc('').key, 'company-profile');
});

test('unknown doc defaults to company-profile', () => {
  assert.strictEqual(resolveDoc('garbage').key, 'company-profile');
});

test('DOCS contains exactly the two known documents', () => {
  assert.deepStrictEqual(Object.keys(DOCS).sort(), ['brochure', 'company-profile']);
});
