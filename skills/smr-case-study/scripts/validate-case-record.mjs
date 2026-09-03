#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const classifications = new Set([
  'FACT',
  'CALCULATED',
  'INFERENCE',
  'USER_CLAIM',
  'UNKNOWN',
]);
const states = new Set([
  'unknown',
  'unavailable',
  'not_applicable',
  'intentionally_omitted',
  'private',
]);

function fail(message) {
  errors.push(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read valid JSON from ${path}: ${error.message}`);
  }
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertPublicCase(value, prefix = 'public case') {
  if (!value || typeof value !== 'object') {
    fail(`${prefix} must be an object.`);
    return;
  }

  for (const field of ['slug', 'title', 'niche', 'period', 'summary']) {
    if (!isText(value[field])) fail(`${prefix}.${field} must be non-empty text.`);
  }
  if (isText(value.slug) && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) {
    fail(`${prefix}.slug must contain lowercase letters, digits, and single hyphens only.`);
  }
  if (!Array.isArray(value.metrics) || value.metrics.length < 1 || value.metrics.length > 12) {
    fail(`${prefix}.metrics must contain 1–12 metrics.`);
  } else {
    const primary = value.metrics.filter((metric) => metric?.isPrimary === true);
    if (primary.length !== 1) fail(`${prefix}.metrics must have exactly one primary metric.`);
    const labels = new Set();
    value.metrics.forEach((metric, index) => {
      if (!isText(metric?.label) || !isText(metric?.value)) {
        fail(`${prefix}.metrics[${index}] needs non-empty label and value.`);
      }
      if (labels.has(metric?.label)) fail(`${prefix}.metrics has duplicate label: ${metric?.label}.`);
      labels.add(metric?.label);
    });
  }
  for (const field of ['task', 'approach', 'result']) {
    if (!isText(value.fullStory?.[field])) {
      fail(`${prefix}.fullStory.${field} must be non-empty text.`);
    }
  }
}

function hasConflict(metricId, conflicts) {
  return conflicts.some((conflict) => {
    if (typeof conflict === 'string') return conflict === metricId;
    return conflict?.metric_id === metricId || conflict?.claim_id === metricId;
  });
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: validate-case-record.mjs <path/to/case.json>');
  process.exit(2);
}

const file = resolve(args[0]);
const record = readJson(file);
const errors = [];

for (const field of ['schema_version', 'case_id', 'workflow', 'case_config']) {
  if (!(field in record)) fail(`Missing top-level field: ${field}.`);
}
if (!Array.isArray(record.sources)) fail('sources must be an array.');
if (!Array.isArray(record.metrics)) fail('metrics must be an array.');

const sourceIds = new Set();
for (const [index, source] of (record.sources ?? []).entries()) {
  if (!isText(source?.id)) fail(`sources[${index}] needs an id.`);
  else if (sourceIds.has(source.id)) fail(`Duplicate source id: ${source.id}.`);
  else sourceIds.add(source.id);
  if (!isText(source?.type)) fail(`sources[${index}] needs a type.`);
}

const metricIds = new Set();
for (const [index, metric] of (record.metrics ?? []).entries()) {
  const location = `metrics[${index}]`;
  if (!isText(metric?.id)) fail(`${location} needs an id.`);
  else if (metricIds.has(metric.id)) fail(`Duplicate metric id: ${metric.id}.`);
  else metricIds.add(metric.id);
  if (!isText(metric?.metric)) fail(`${location} needs a metric name.`);
  if (!classifications.has(metric?.classification)) {
    fail(`${location}.classification must be FACT, CALCULATED, INFERENCE, USER_CLAIM, or UNKNOWN.`);
  }
  for (const sourceId of metric?.source_ids ?? []) {
    if (!sourceIds.has(sourceId)) fail(`${location} references unknown source: ${sourceId}.`);
  }
  if (metric?.classification === 'CALCULATED') {
    if (!isText(metric.calculation?.formula)) fail(`${location} calculated metric needs a formula.`);
    if (!Array.isArray(metric.calculation?.input_metric_ids) || metric.calculation.input_metric_ids.length === 0) {
      fail(`${location} calculated metric needs input metric IDs.`);
    }
  }
  if (metric?.status && !states.has(metric.status)) {
    fail(`${location}.status is not a supported missing-data state.`);
  }
}

const projection = record.public_case;
if (projection !== null && projection !== undefined) {
  const publicCase = projection.case ?? projection;
  assertPublicCase(publicCase);
  const evidence = projection.metric_evidence ?? {};
  const conflicts = record.workflow?.unresolved_conflicts ?? [];
  for (const metric of publicCase?.metrics ?? []) {
    const ids = evidence[metric.label] ?? [];
    if (!Array.isArray(ids) || ids.length === 0) {
      fail(`Public metric ${metric.label} needs metric_evidence.`);
      continue;
    }
    for (const id of ids) {
      if (!metricIds.has(id)) fail(`Public metric ${metric.label} references unknown metric: ${id}.`);
      if (hasConflict(id, conflicts)) fail(`Public metric ${metric.label} has an unresolved conflict: ${id}.`);
      const canonicalMetric = record.metrics.find((candidate) => candidate.id === id);
      if (canonicalMetric?.visibility !== 'public') {
        fail(`Public metric ${metric.label} is not marked public: ${id}.`);
      }
      if (canonicalMetric?.verified !== true) {
        fail(`Public metric ${metric.label} is not verified: ${id}.`);
      }
      if (canonicalMetric?.classification === 'UNKNOWN') {
        fail(`Public metric ${metric.label} cannot be UNKNOWN: ${id}.`);
      }
      if (!canonicalMetric?.period && !isText(canonicalMetric?.source_scope)) {
        fail(`Public metric ${metric.label} needs a period or stated source scope: ${id}.`);
      }
    }
  }
  const claimEvidence = projection.claim_evidence ?? {};
  for (const claim of ['title', 'summary', 'fullStory.task', 'fullStory.approach', 'fullStory.result']) {
    const ids = claimEvidence[claim] ?? [];
    if (!Array.isArray(ids) || ids.length === 0) {
      fail(`Public claim ${claim} needs claim_evidence.`);
      continue;
    }
    for (const id of ids) {
      if (!sourceIds.has(id) && !metricIds.has(id)) {
        fail(`Public claim ${claim} references unknown source or metric: ${id}.`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Case record is invalid (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Case record is valid: ${record.case_id}`);
