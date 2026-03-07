import { mkdirSync, writeFileSync } from 'node:fs';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
const graphqlUrl = `${backendUrl.replace(/\/$/, '')}/graphql`;
const outputDir = 'dist/101485572_comp3133_assignment2/browser';
const outputFile = `${outputDir}/env.js`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(
  outputFile,
  `window.__env = {\n  GRAPHQL_URL: '${graphqlUrl}',\n};\n`,
  'utf8',
);
