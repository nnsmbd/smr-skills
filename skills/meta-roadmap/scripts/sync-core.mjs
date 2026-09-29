// meta-roadmap sync core: pure functions, no I/O.
// Plans a proposal against a board (evidence rules, manual-field protection, stale checks),
// applies approved items, and renders the human report.
// The board app implements the same apply semantics in src/sync.ts — keep them in step.

export const KINDS = { milestone: 'milestones', task: 'tasks', release: 'releases', decision: 'decisions', fact: 'facts' };
export const LEVELS = ['', 'planned', 'implemented', 'tested', 'deployed', 'verified', 'done'];
export const LEVEL_LABEL = {
  planned: 'только план',
  implemented: 'код написан',
  tested: 'тесты пройдены',
  deployed: 'выложено в прод',
  verified: 'проверено вживую',
  done: 'принято',
};
export const CONFIDENCES = ['confirmed', 'needs_verification', 'conflict'];
/** Never written by the agent, whatever the proposal says. */
export const MANUAL_ONLY = new Set(['manualNote', 'manualPriority', 'manualFields', 'history', 'id']);
/** Minimum evidence level for a status to be applied automatically. */
export const STATUS_MIN_LEVEL = {
  task: { done: 'done', review: 'implemented', in_progress: 'implemented' },
  milestone: { done: 'done' },
  release: { current: 'deployed', shipped: 'deployed' },
};

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const levelAtLeast = (level, min) => LEVELS.indexOf(level || '') >= LEVELS.indexOf(min);
const list = (board, kind) => board[KINDS[kind]] ?? [];

export class ProposalError extends Error {}

/** Structural validation of an agent-written proposal. Throws with every problem listed. */
export function validateProposal(p) {
  const errors = [];
  if (!p || typeof p !== 'object') throw new ProposalError('proposal is not an object');
  if (!Array.isArray(p.items)) errors.push('items must be an array');
  const ids = new Set();
  for (const [n, i] of (p.items ?? []).entries()) {
    const at = `items[${n}]`;
    if (!i.id || ids.has(i.id)) errors.push(`${at}: missing or duplicate id`);
    ids.add(i.id);
    if (!(i.kind in KINDS)) errors.push(`${at}: unknown kind ${i.kind}`);
    if (!['update', 'create', 'check'].includes(i.op)) errors.push(`${at}: op must be update|create|check`);
    if (!i.label) errors.push(`${at}: label (human line for the report) is required`);
    if (!CONFIDENCES.includes(i.confidence)) errors.push(`${at}: confidence must be one of ${CONFIDENCES.join(', ')}`);
    if (!LEVELS.includes(i.level ?? '')) errors.push(`${at}: level must be one of ${LEVELS.filter(Boolean).join(', ')}`);
    if (!Array.isArray(i.evidence)) errors.push(`${at}: evidence must be an array`);
    if (i.op === 'update' && (!i.targetId || !Array.isArray(i.patch) || !i.patch.length)) errors.push(`${at}: update needs targetId and a non-empty patch`);
    if (i.op === 'check' && !i.targetId) errors.push(`${at}: check needs targetId`);
    if (i.op === 'create' && (!i.entity || typeof i.entity.id !== 'string' || typeof i.entity.title !== 'string')) errors.push(`${at}: create needs entity with id and title`);
    for (const f of i.patch ?? []) if (MANUAL_ONLY.has(f.field)) errors.push(`${at}: field ${f.field} is manual-only and can never be proposed`);
  }
  if (errors.length) throw new ProposalError(errors.join('\n'));
  return true;
}

/**
 * Plans a proposal against the current board:
 * - fills `from` with the board's current values (so a later apply can detect staleness),
 * - drops no-op patches and items that change nothing,
 * - enforces evidence rules (a commit is not "done"),
 * - marks items touching hand-edited fields as manual conflicts,
 * - keeps unresolved items (needs_verification / conflict) — they are shown, never auto-applied.
 * Returns { proposal, dropped: [{item, why}] }.
 */
export function planProposal(board, raw, now = new Date().toISOString()) {
  validateProposal(raw);
  const items = [];
  const dropped = [];
  for (const src of raw.items) {
    const item = structuredClone(src);
    item.source = item.source || 'github';
    item.level = item.level || '';
    item.reason = item.reason || '';
    const rows = list(board, item.kind);

    if (item.op === 'create') {
      if (rows.some((x) => x.id === item.entity.id)) {
        dropped.push({ item, why: 'уже есть на доске' });
        continue;
      }
      if (item.kind === 'task' && item.entity.milestoneId && !board.milestones.some((m) => m.id === item.entity.milestoneId)) {
        dropped.push({ item, why: `нет этапа ${item.entity.milestoneId}` });
        continue;
      }
      if (!item.evidence.length && item.confidence === 'confirmed') demote(item, 'нет доказательств');
      items.push(item);
      continue;
    }

    const target = rows.find((x) => x.id === item.targetId);
    if (!target) {
      dropped.push({ item, why: `на доске нет ${item.kind} ${item.targetId}` });
      continue;
    }
    if (item.op === 'check') {
      if (item.confidence === 'confirmed') item.confidence = 'needs_verification';
      items.push(item);
      continue;
    }

    item.patch = item.patch
      .map((p) => ({ field: p.field, from: target[p.field], to: p.to }))
      .filter((p) => !same(p.from, p.to));
    if (!item.patch.length) {
      dropped.push({ item, why: 'на доске уже так' });
      continue;
    }
    if (!item.evidence.length && item.confidence === 'confirmed') demote(item, 'нет доказательств');
    for (const p of item.patch) {
      if (p.field !== 'status') continue;
      const min = STATUS_MIN_LEVEL[item.kind]?.[p.to];
      if (min && !levelAtLeast(item.level, min) && item.confidence === 'confirmed') {
        demote(item, `статус «${p.to}» требует доказательств уровня «${LEVEL_LABEL[min]}», есть «${LEVEL_LABEL[item.level] ?? 'нет'}»`);
      }
    }
    const manual = item.patch.map((p) => p.field).filter((f) => (target.manualFields ?? []).includes(f));
    if (manual.length) item.manualConflicts = manual;
    items.push(item);
  }
  return {
    proposal: { id: raw.id || `sync-${now.slice(0, 16).replace(/[-:T]/g, '')}`, createdAt: raw.createdAt || now, summary: raw.summary || '', items },
    dropped,
  };
}

function demote(item, why) {
  item.confidence = 'needs_verification';
  item.reason = item.reason ? `${item.reason} · ${why}` : why;
}

/** State of an item against a board — identical rules to the board UI. */
export function itemState(board, item) {
  const rows = list(board, item.kind);
  if (item.op === 'create') return rows.some((x) => x.id === item.entity?.id) ? 'applied' : 'ready';
  const target = rows.find((x) => x.id === item.targetId);
  if (!target) return 'missing';
  if (item.op === 'check') return target.provenance?.confidence === 'needs_verification' && (target.history ?? []).some((h) => h.text === item.label) ? 'applied' : 'ready';
  const patch = item.patch ?? [];
  if (patch.some((p) => MANUAL_ONLY.has(p.field))) return 'invalid';
  if (patch.every((p) => same(target[p.field], p.to))) return 'applied';
  if (patch.some((p) => !same(target[p.field], p.from) && !same(target[p.field], p.to))) return 'stale';
  if (patch.some((p) => (target.manualFields ?? []).includes(p.field))) return 'manual';
  return 'ready';
}

/** Buckets for the report and for "apply confirmed". */
export function classify(board, proposal) {
  const out = { confirmed: [], needs: [], manual: [], outdated: [] };
  for (const i of proposal.items) {
    const s = itemState(board, i);
    if (s === 'manual') out.manual.push(i);
    else if (s !== 'ready') out.outdated.push({ ...i, state: s });
    else if (i.confidence === 'confirmed') out.confirmed.push(i);
    else out.needs.push(i);
  }
  return out;
}

/** Applies one item to a board (mutates). Manual conflicts need acceptManual. */
export function applyItem(board, item, { acceptManual = false, today = new Date().toISOString().slice(0, 10) } = {}) {
  const state = itemState(board, item);
  if (state !== 'ready' && state !== 'manual') return state;
  if (state === 'manual' && !acceptManual) return 'manual';
  const rows = list(board, item.kind);
  const provenance = { source: item.source, evidence: item.evidence, lastVerified: today, confidence: item.confidence, level: item.level ?? '' };
  const entry = { at: today, by: 'agent', text: item.label };
  if (item.op === 'create') {
    rows.push({ ...item.entity, provenance, history: [entry], manualFields: [], manualNote: '' });
    return 'applied';
  }
  const target = rows.find((x) => x.id === item.targetId);
  if (item.op === 'check') {
    target.provenance = { ...(target.provenance ?? {}), confidence: 'needs_verification', lastVerified: today };
    target.history = [...(target.history ?? []), entry];
    return 'applied';
  }
  for (const p of item.patch) {
    target[p.field] = p.to;
    if (acceptManual) target.manualFields = (target.manualFields ?? []).filter((f) => f !== p.field);
  }
  target.provenance = provenance;
  target.history = [...(target.history ?? []), entry];
  return 'applied';
}

/**
 * Applies the selected items of the board's pending proposal and settles it.
 * mode: 'confirmed' (default — only confirmed + ready) or an explicit id list.
 */
export function applyPending(board, { ids = null, acceptManual = false, today } = {}) {
  const p = board.meta.pendingSync;
  if (!p) return { applied: [], skipped: [] };
  const buckets = classify(board, p);
  const chosen = ids ? p.items.filter((i) => ids.includes(i.id)) : buckets.confirmed;
  const applied = [];
  const skipped = [];
  const handled = new Set();
  for (const i of chosen) {
    const r = applyItem(board, i, { acceptManual, today });
    if (r === 'applied') applied.push(i);
    else skipped.push({ item: i, why: r });
    if (r !== 'manual') handled.add(i.id);
  }
  const rest = p.items.filter((i) => !handled.has(i.id));
  if (rest.length) board.meta.pendingSync = { ...p, items: rest };
  else {
    board.meta.pendingSync = null;
    board.meta.lastSync = { at: today ?? new Date().toISOString().slice(0, 10), summary: p.summary || `применено: ${applied.length}` };
  }
  return { applied, skipped };
}

const titleOf = (board, item) => (item.op === 'create' ? item.entity.title : list(board, item.kind).find((x) => x.id === item.targetId)?.title ?? item.targetId);

/** Human sync report (Russian, Markdown). */
export function renderReport(board, proposal, { dropped = [] } = {}) {
  const b = classify(board, proposal);
  const line = (i, mark) => {
    const ev = i.evidence?.length ? `\n    ↳ ${[i.level && LEVEL_LABEL[i.level], ...i.evidence].filter(Boolean).join(' · ')}` : '';
    const why = i.reason ? `\n    ↳ ${i.reason}` : '';
    return `${mark} ${i.label} — «${titleOf(board, i)}»${why}${ev}`;
  };
  const out = ['ROADMAP UPDATE', ''];
  if (proposal.summary) out.push(proposal.summary, '');
  out.push(`${b.confirmed.length} ${plural(b.confirmed.length, 'изменение подтверждено', 'изменения подтверждены', 'изменений подтверждено')}`);
  out.push(...b.confirmed.map((i) => line(i, '✓')), '');
  out.push(`${b.needs.length} ${plural(b.needs.length, 'требует', 'требуют', 'требуют')} решения`);
  out.push(...b.needs.map((i) => line(i, '?')), '');
  if (b.manual.length) {
    out.push(`${b.manual.length} ${plural(b.manual.length, 'конфликт', 'конфликта', 'конфликтов')} с ручными правками (не применяются без вашего согласия)`);
    out.push(...b.manual.map((i) => `${line(i, '⚠')}\n    ↳ поля, изменённые вручную: ${(i.manualConflicts ?? []).join(', ')}`), '');
  }
  if (b.outdated.length) out.push(`Неактуально: ${b.outdated.map((i) => `${i.label} (${i.state})`).join('; ')}`, '');
  if (dropped.length) out.push(`Отброшено при планировании: ${dropped.map((d) => `${d.item.label} — ${d.why}`).join('; ')}`, '');
  out.push(b.confirmed.length ? `[Применить подтверждённое: ${b.confirmed.length}]` : 'Подтверждённых изменений нет.');
  return out.join('\n');
}

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
