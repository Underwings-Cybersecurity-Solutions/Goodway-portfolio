/**
 * Document registry for gated downloads. Pure + dependency-free so it can be
 * unit-tested without touching the DB or notifier. Filenames are relative to
 * the public /assets directory.
 */
const DOCS = {
  'company-profile': { label: 'Company Profile', file: 'goodway-company-profile.pdf' },
  'brochure':        { label: 'Brochure',        file: 'goodway-brochure.pdf' },
};

const DEFAULT_KEY = 'company-profile';

/**
 * Normalise an arbitrary `doc` input to a known document descriptor.
 * Unknown / missing values fall back to the company profile.
 * @param {string} doc
 * @returns {{ key: string, label: string, file: string }}
 */
function resolveDoc(doc) {
  const key = Object.prototype.hasOwnProperty.call(DOCS, doc) ? doc : DEFAULT_KEY;
  return { key, label: DOCS[key].label, file: DOCS[key].file };
}

module.exports = { DOCS, resolveDoc, DEFAULT_KEY };
