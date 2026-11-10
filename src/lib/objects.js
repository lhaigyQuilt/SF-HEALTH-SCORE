// Registry of Salesforce objects covered by this app. Each object's dataset shares the
// Field Health workbook's 46-column layout and is scored with the same formulas.
export const OBJECTS = [
  { key: 'opportunity', label: 'Opportunity', orgs: ['SBU', 'XBU'] },
  { key: 'case', label: 'Case', orgs: ['SBU', 'XBU'] },
  { key: 'account', label: 'Account', orgs: ['SBU', 'XBU'] },
  { key: 'lead', label: 'Lead', orgs: ['SBU', 'XBU'] },
  { key: 'contact', label: 'Contact', orgs: ['SBU', 'XBU'] },
];

export const OBJECT_BY_KEY = Object.fromEntries(OBJECTS.map(o => [o.key, o]));
