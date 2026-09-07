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

console.log('Validator scenarios passed.');
