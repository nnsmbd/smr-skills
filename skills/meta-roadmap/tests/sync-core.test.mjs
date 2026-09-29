import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyItem, applyPending, classify, itemState, planProposal, renderReport, validateProposal } from '../scripts/sync-core.mjs';

const load = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'));
const byId = (p, id) => p.items.find((i) => i.id === id);
const setup = () => {
  const board = load('board.json');
  const { proposal, dropped } = planProposal(board, load('proposal.json'), '2026-09-30T10:00:00Z');
  return { board, proposal, dropped };
};

test('plan fills `from`, drops no-ops and unknown targets', () => {
  const { proposal, dropped } = setup();
  assert.equal(byId(proposal, 'p-inprogress').patch[0].from, 'next');
  assert.ok(!byId(proposal, 'p-noop'));
  assert.ok(!byId(proposal, 'p-missing'));
  assert.deepEqual(dropped.map((d) => d.item.id).sort(), ['p-missing', 'p-noop']);
});

test('a commit or green tests never make a task "done" automatically', () => {
  const { proposal } = setup();
  const weak = byId(proposal, 'p-done-weak');
  assert.equal(weak.confidence, 'needs_verification');
  assert.match(weak.reason, /принято/);
  assert.equal(byId(proposal, 'p-inprogress').confidence, 'confirmed');
});

test('items without evidence are demoted to needs_verification', () => {
  const { proposal } = setup();
  assert.equal(byId(proposal, 'p-noevidence').confidence, 'needs_verification');
});

test('hand-edited fields become manual conflicts and are not applied by "apply confirmed"', () => {
  const { board, proposal } = setup();
  assert.deepEqual(byId(proposal, 'p-manual').manualConflicts, ['status']);
  board.meta.pendingSync = proposal;
  const buckets = classify(board, proposal);
  assert.ok(buckets.manual.some((i) => i.id === 'p-manual'));
  applyPending(board, { today: '2026-09-30' });
  const t2 = board.tasks.find((t) => t.id === 't2');
  assert.equal(t2.status, 'review', 'manual status kept');
  assert.equal(t2.manualNote, 'Моё', 'manual note untouched');
  assert.equal(t2.manualPriority, 'high');
  assert.ok(board.meta.pendingSync.items.some((i) => i.id === 'p-manual'), 'conflict stays pending');
});

test('explicit acceptance resolves a manual conflict and unprotects that field only', () => {
  const { board, proposal } = setup();
  board.meta.pendingSync = proposal;
  const { applied } = applyPending(board, { ids: ['p-manual'], acceptManual: true, today: '2026-09-30' });
  assert.equal(applied.length, 1);
  const t2 = board.tasks.find((t) => t.id === 't2');
  assert.equal(t2.status, 'done');
  assert.deepEqual(t2.manualFields, ['title']);
  assert.equal(t2.history.at(-1).by, 'agent');
});

test('apply confirmed: applies only confirmed items, records provenance and history, keeps the rest pending', () => {
  const { board, proposal } = setup();
  board.meta.pendingSync = proposal;
  const { applied } = applyPending(board, { today: '2026-09-30' });
  assert.deepEqual(applied.map((i) => i.id).sort(), ['p-create', 'p-inprogress']);
  const t1 = board.tasks.find((t) => t.id === 't1');
  assert.equal(t1.status, 'in_progress');
  assert.equal(t1.provenance.level, 'implemented');
  assert.equal(t1.provenance.lastVerified, '2026-09-30');
  assert.deepEqual(t1.provenance.evidence, ['branch x: deploy/restore-sqlite-snapshot.sh']);
  assert.ok(board.tasks.some((t) => t.id === 't3'));
  const left = board.meta.pendingSync.items.map((i) => i.id).sort();
  assert.deepEqual(left, ['p-check', 'p-done-weak', 'p-manual', 'p-noevidence']);
});

test('stale items are not applied when the board changed after planning', () => {
  const { board, proposal } = setup();
  board.tasks.find((t) => t.id === 't1').status = 'blocked';
  assert.equal(itemState(board, byId(proposal, 'p-inprogress')), 'stale');
  assert.equal(applyItem(board, byId(proposal, 'p-inprogress')), 'stale');
  assert.equal(board.tasks.find((t) => t.id === 't1').status, 'blocked');
});

test('idempotent: re-planning after apply proposes nothing new, re-applying changes nothing', () => {
  const { board, proposal } = setup();
  board.meta.pendingSync = proposal;
  applyPending(board, { today: '2026-09-30' });
  const snapshot = JSON.stringify(board.tasks);
  const again = planProposal(board, { items: [load('proposal.json').items[0], load('proposal.json').items[5]] });
  assert.equal(again.proposal.items.length, 0);
  assert.equal(applyItem(board, byId(proposal, 'p-inprogress')), 'applied');
  assert.equal(JSON.stringify(board.tasks), snapshot);
});

test('check items only mark "needs verification" and never change content', () => {
  const { board, proposal } = setup();
  const t2before = structuredClone(board.tasks.find((t) => t.id === 't2'));
  applyItem(board, byId(proposal, 'p-check'), { today: '2026-09-30' });
  const t2 = board.tasks.find((t) => t.id === 't2');
  assert.equal(t2.provenance.confidence, 'needs_verification');
  assert.equal(t2.status, t2before.status);
  assert.equal(t2.title, t2before.title);
});

test('manual-only fields can never be proposed', () => {
  assert.throws(() => validateProposal({ items: [{ id: 'x', kind: 'task', op: 'update', targetId: 't1', label: 'x', confidence: 'confirmed', level: '', evidence: ['e'], patch: [{ field: 'manualNote', to: 'y' }] }] }), /manual-only/);
});

test('all items handled → proposal closes and lastSync is recorded', () => {
  const { board, proposal } = setup();
  board.meta.pendingSync = { ...proposal, items: [byId(proposal, 'p-inprogress')] };
  applyPending(board, { today: '2026-09-30' });
  assert.equal(board.meta.pendingSync, null);
  assert.equal(board.meta.lastSync.at, '2026-09-30');
});

test('report shows confirmed, open questions and manual conflicts separately', () => {
  const { board, proposal, dropped } = setup();
  const text = renderReport(board, proposal, { dropped });
  assert.match(text, /ROADMAP UPDATE/);
  assert.match(text, /2 изменения подтверждены/);
  assert.match(text, /3 требуют решения/);
  assert.match(text, /1 конфликт с ручными правками/);
  assert.match(text, /\[Применить подтверждённое: 2\]/);
});
