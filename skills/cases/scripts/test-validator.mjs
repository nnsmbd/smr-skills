#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const validator = join(scriptDir, 'validate-case-record.mjs');
const fixture = join(scriptDir, 'fixtures', 'valid-case.json');
const template = join(scriptDir, '..', 'assets', 'public-case.json');
const node = process.execPath;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validate(record) {
  const directory = mkdtempSync(join(tmpdir(), 'cases-validator-'));
  const file = join(directory, 'case.json');
  try {
    writeFileSync(file, JSON.stringify(record));
    return spawnSync(node, [validator, file], { encoding: 'utf8' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function expectValid(name, record) {
  const result = validate(record);
  assert.equal(result.status, 0, `${name}: ${result.stderr}`);
}

function expectInvalid(name, record, expectedText) {
  const result = validate(record);
  assert.equal(result.status, 1, `${name}: expected validation failure`);
  assert.match(result.stderr, expectedText, `${name}: ${result.stderr}`);
}

const base = JSON.parse(readFileSync(resolve(fixture), 'utf8'));

expectValid('A: Meta-only historical case', base);

const metaAndShopify = clone(base);
metaAndShopify.sources.push({ id: 'shopify-q1', type: 'shopify' });
metaAndShopify.metrics.push({
  id: 'shopify-orders-q1',
  metric: 'Shopify orders',
  value: 2,
  unit: 'orders',
  period: { from: '2026-01-01', to: '2026-03-31' },
  classification: 'FACT',
  source_ids: ['shopify-q1'],
  source_scope: 'Shopify orders',
  verified: true,
  visibility: 'private',
});
expectValid('B: Meta and Shopify can coexist without automatic merging', metaAndShopify);

const conflict = clone(metaAndShopify);
conflict.workflow.unresolved_conflicts = [{ metric_id: 'cpa-q1', evidence_ids: ['meta-q1', 'shopify-q1'] }];
expectInvalid('C: conflict blocks a public Meta metric', conflict, /unresolved conflict/);

const unavailable = {
  schema_version: '1.0',
  case_id: 'meta-unavailable',
  workflow: { source_status: { meta_ads: { status: 'unavailable', reason: 'Skill not installed' } } },
  case_config: {
    sources: {
      meta_ads: {
        mode: 'auto',
        depth: 'standard',
        inspect: { creatives: 'auto', targeting: 'auto' },
        selection: { periods: [], campaigns: [] },
      },
    },
  },
  sources: [],
  metrics: [],
};
expectValid('D: unavailable Meta source does not block the case', unavailable);

const ambiguous = clone(unavailable);
ambiguous.workflow.source_status.meta_ads.status = 'needs_selection';
expectValid('E: ambiguous project waits for a user selection', ambiguous);

const disabled = clone(unavailable);
disabled.workflow.source_status.meta_ads.status = 'disabled';
disabled.case_config.sources.meta_ads.mode = 'disabled';
expectValid('F: disabled Meta source makes no acquisition requirement', disabled);

const shallow = clone(unavailable);
shallow.case_config.sources.meta_ads.depth = 'overview';
expectValid('G: shallow extraction configuration is valid', shallow);

const deep = clone(base);
deep.case_config.sources = {
  meta_ads: {
    mode: 'auto',
    depth: 'deep',
    inspect: { creatives: 'auto', targeting: 'auto' },
    selection: {
      project: { value: 'validator-fixture', status: 'selected' },
      account: { value: 'private-account-id', status: 'selected' },
      periods: [{ id: 'result', from: '2026-01-01', to: '2026-03-31', role: 'result', status: 'selected' }],
      campaigns: [{ id: 'campaign-1', name: 'Sales campaign', intent: 'sales', period_ids: ['result'], status: 'selected' }],
    },
  },
};
expectValid('H: deep case keeps selective Meta configuration', deep);

const mixed = clone(base);
mixed.metrics[0].meta_evidence.result_spec.metric_status = 'mixed';
expectInvalid('ResultSpec guard rejects a mixed Meta result', mixed, /non-publishable metric_status/);

const articleWithoutEvidence = clone(base);
articleWithoutEvidence.public_case.claim_evidence['article.sections.5'] = [];
expectInvalid(
  'I: a quantified article section needs its own evidence',
  articleWithoutEvidence,
  /Public claim article\.sections\.5 needs claim_evidence/,
);

const editorialSection = clone(base);
editorialSection.public_case.case.article.sections.push({
  title: 'Как продолжили работу',
  paragraphs: ['Дальше продолжили теми же связками, что показали себя лучше.'],
});
expectValid('J: an editorial section without numbers needs no evidence mapping', editorialSection);

const unsafeScreenshot = clone(base);
unsafeScreenshot.public_case.case.article.sections[2].screenshot.src = '//example.com/shot.png';
expectInvalid('K: unsafe screenshot source is rejected', unsafeScreenshot, /screenshot\.src must be/);

const emptyParagraph = clone(base);
emptyParagraph.public_case.case.article.sections[0].paragraphs = ['   '];
expectInvalid('L: an empty paragraph is rejected', emptyParagraph, /paragraphs\[0\] must be non-empty/);

const leakedId = clone(base);
leakedId.public_case.case.article.sections[2].paragraphs[0] =
  'Основной объём дала кампания 120223862795230122.';
expectInvalid('M: an internal platform ID cannot reach the public case', leakedId, /internal platform ID/);

const leakedField = clone(base);
leakedField.public_case.case.summary = 'Итог по cost_per_result за период.';
expectInvalid('N: an internal technical field cannot reach the public case', leakedField, /internal technical field/);

const plainMoney = clone(base);
plainMoney.public_case.case.metrics[0].value = '$8 764';
plainMoney.public_case.case.article.sections[5].paragraphs[0] =
  'Расход составил $8 764 при 1 053 покупках.';
expectValid('O: ordinary money and counts are not treated as internal IDs', plainMoney);

const missingFullStory = clone(base);
delete missingFullStory.public_case.case.fullStory.approach;
expectInvalid(
  'P: article does not replace fullStory required by cards and previews',
  missingFullStory,
  /fullStory\.approach must be non-empty/,
);

const userCorrection = clone(base);
userCorrection.sources.push({ id: 'owner-aggregate', type: 'user' });
userCorrection.metrics.push({
  id: 'cpa-final',
  metric: 'CPA',
  value: 8.32,
  unit: 'USD per purchase',
  period: { from: '2026-01-01', to: '2026-03-31' },
  classification: 'USER_CLAIM',
  source_ids: ['owner-aggregate'],
  source_scope: 'Owner-confirmed aggregate for the whole engagement',
  verified: true,
  visibility: 'public',
});
userCorrection.workflow.unresolved_conflicts = [
  {
    metric_ids: ['cpa-q1', 'cpa-final'],
    evidence_ids: ['meta-q1', 'owner-aggregate'],
    note: 'Owner aggregate differs from the compatible purchase-only review.',
  },
];
userCorrection.public_case.case.metrics = [
  { value: '$8.32', label: 'CPA', isPrimary: true },
];
userCorrection.public_case.metric_evidence = { CPA: ['cpa-final'] };
expectInvalid(
  'Q: an unresolved user correction cannot be published silently',
  userCorrection,
  /unresolved conflict/,
);

const resolvedCorrection = clone(userCorrection);
resolvedCorrection.workflow.unresolved_conflicts[0].resolution = {
  decision: 'publish_selected_metric',
  selected_metric_id: 'cpa-final',
  approved_by: 'owner',
  approved_at: '2026-09-11',
  note: 'Owner-confirmed aggregate is the published figure; source evidence is retained.',
};
expectValid('R: a recorded resolution publishes the selected metric only', resolvedCorrection);

const wrongSelection = clone(resolvedCorrection);
wrongSelection.public_case.metric_evidence = { CPA: ['cpa-q1'] };
wrongSelection.public_case.case.metrics = [
  { value: '$6.74', label: 'CPA', isPrimary: true },
];
expectInvalid(
  'S: the unselected side of a resolved conflict stays unpublishable',
  wrongSelection,
  /selected another metric/,
);

const noProvenance = clone(resolvedCorrection);
noProvenance.metrics.find((metric) => metric.id === 'cpa-final').source_ids = [];
expectInvalid('T: a public user claim needs provenance', noProvenance, /user claim without provenance/);

const shippedTemplate = clone(base);
shippedTemplate.public_case.case = JSON.parse(readFileSync(resolve(template), 'utf8'));
shippedTemplate.public_case.metric_evidence = {
  Покупки: ['cpa-q1'],
  CPA: ['cpa-q1'],
  Расход: ['cpa-q1'],
};
shippedTemplate.public_case.claim_evidence = {
  title: ['cpa-q1'],
  summary: ['cpa-q1'],
  'fullStory.task': ['client-brief'],
  'fullStory.approach': ['work-log'],
  'fullStory.result': ['cpa-q1'],
};
expectValid('U: the shipped public-case template matches the current contract', shippedTemplate);

console.log('Validator scenarios passed.');
