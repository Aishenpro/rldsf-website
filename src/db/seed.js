
const db = require('./index');

const programs = [
  [
    'child-welfare',
    'Child Welfare',
    'Care, education and protection for children.'
  ],
  [
    'disability-support',
    'Disability Support',
    'Inclusion, accessibility and equal opportunities.'
  ],
  [
    'feeding-program',
    'Feeding Program',
    'Supporting nutrition and food security.'
  ],
  [
    'women-empowerment',
    'Women Empowerment',
    'Skills development and community support.'
  ],
  [
    'community-outreach',
    'Community Outreach',
    'Health awareness and community development.'
  ]
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO programs
  (slug, title, summary)
  VALUES (?, ?, ?)
`);

const seed = db.transaction(items => {
  for (const item of items) {
    insert.run(...item);
  }
});

seed(programs);

console.log('Programs seeded successfully.');

