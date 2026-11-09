// Registry of Salesforce objects covered by this app. Each object's Field Health
// workbook shares the same 46-column layout, but the Band formula evolved between
// builds — Opportunity's adds a Managed Package band that Case's build never had.
export const OBJECTS = [
  { key: 'opportunity', label: 'Opportunity', hasManagedPackageBand: true, orgs: ['SBU', 'XBU'] },
  { key: 'case', label: 'Case', hasManagedPackageBand: false, orgs: ['SBU', 'XBU'] },
  { key: 'account', label: 'Account', hasManagedPackageBand: false, orgs: ['XBU'] },
];

export const OBJECT_BY_KEY = Object.fromEntries(OBJECTS.map(o => [o.key, o]));
