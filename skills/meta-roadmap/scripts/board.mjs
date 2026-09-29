#!/usr/bin/env node
// meta-roadmap CLI — talks to the Meta Agent roadmap board API.
//
//   node board.mjs pull [--out board.json]           save the live board (+ revision) and print its sync state
//   node board.mjs plan <proposal.json> [--board f]  dry-run: plan against the live (or a local) board, print the report
//   node board.mjs propose <proposal.json>           plan and store as the board's pending proposal (owner reviews in the UI)
//   node board.mjs apply [--ids a,b] [--accept-manual]  apply the pending proposal: confirmed items, or the listed ids
//   node board.mjs report                            print the pending proposal report
//
// Config (env): META_BOARD_URL (default https://meta-roadmap-board.vercel.app),
//   META_BOARD_KEY, or META_BOARD_KEY_FILE (a dotenv file with BOARD_ACCESS_KEY=…; default ~/meta-roadmap-board/.env.local).
// The key is never printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { applyPending, classify, planProposal, renderReport } from './sync-core.mjs';

const URL_BASE = (process.env.META_BOARD_URL || 'https://meta-roadmap-board.vercel.app').replace(/\/$/, '');
// The key travels with every request: only https (or a local dev server) is allowed.
if (!/^https:\/\//.test(URL_BASE) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(URL_BASE)) {
  console.error(`meta-roadmap: refusing to send the board key to ${URL_BASE} (https only).`);
  process.exit(1);
}

function readKey() {
  if (process.env.META_BOARD_KEY) return process.env.META_BOARD_KEY.trim();
  const file = process.env.META_BOARD_KEY_FILE || join(homedir(), 'meta-roadmap-board', '.env.local');
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    fail(`No board key: set META_BOARD_KEY or META_BOARD_KEY_FILE (tried ${file}).`);
  }
  const m = text.match(/^BOARD_ACCESS_KEY\s*=\s*["']?([^"'\s#]+)["']?/m);
  if (!m) fail(`BOARD_ACCESS_KEY not found in ${file}.`);
  return m[1].trim();
}

function fail(msg, code = 1) {
  console.error(`meta-roadmap: ${msg}`);
  process.exit(code);
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function fetchBoard() {
  const res = await fetch(`${URL_BASE}/api/board`, { headers: { 'x-board-key': readKey() }, cache: 'no-store' });
  if (res.status === 401) fail('board rejected the key (401).');
  if (!res.ok) fail(`board GET failed: ${res.status}`);
  const board = await res.json();
  if (board.schema !== 3) fail(`board schema ${board.schema} — this skill needs schema 3.`);
  return { board, rev: res.headers.get('x-board-rev') };
}

async function putBoard(board, rev) {
  const res = await fetch(`${URL_BASE}/api/board`, {
    method: 'PUT',
    headers: { 'x-board-key': readKey(), 'content-type': 'application/json', ...(rev ? { 'x-board-rev': rev } : {}) },
    body: JSON.stringify(board),
  });
  if (res.status === 409) fail('the board changed while we worked (409). Nothing was written — re-run the command.', 3);
  if (!res.ok) fail(`board PUT failed: ${res.status} ${await res.text()}`);
  return res.headers.get('x-board-rev');
}

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    fail(`cannot read ${path}: ${e.message}`);
  }
}

function syncState(board) {
  const verified = [...board.milestones, ...board.tasks, ...board.decisions]
    .map((x) => x.provenance?.lastVerified)
    .filter(Boolean)
    .sort();
  const manual = [...board.milestones, ...board.tasks, ...board.decisions, ...board.releases, ...board.facts].filter((x) => x.manualFields?.length);
  return {
    lastSync: board.meta.lastSync,
    since: board.meta.lastSync?.at || verified.at(-1) || null,
    oldestVerified: verified[0] || null,
    pending: board.meta.pendingSync ? board.meta.pendingSync.items.length : 0,
    counts: { milestones: board.milestones.length, tasks: board.tasks.length, decisions: board.decisions.length, releases: board.releases.length },
    currentMilestone: board.milestones.find((m) => m.id === board.meta.currentMilestoneId)?.title ?? null,
    manuallyEdited: manual.map((x) => ({ id: x.id, title: x.title, fields: x.manualFields })),
  };
}

const cmd = process.argv[2];

if (cmd === 'pull') {
  const { board, rev } = await fetchBoard();
  const out = arg('--out') || 'board.json';
  writeFileSync(out, JSON.stringify({ rev, board }, null, 2));
  console.log(JSON.stringify({ savedTo: out, ...syncState(board) }, null, 2));
} else if (cmd === 'plan') {
  const file = process.argv[3] || fail('usage: plan <proposal.json> [--board board.json]');
  const local = arg('--board');
  const board = local ? (loadJson(local).board ?? loadJson(local)) : (await fetchBoard()).board;
  const { proposal, dropped } = planProposal(board, loadJson(file));
  const plannedPath = /\.json$/.test(file) ? file.replace(/\.json$/, '.planned.json') : `${file}.planned.json`;
  writeFileSync(plannedPath, JSON.stringify(proposal, null, 2));
  console.log(renderReport(board, proposal, { dropped }));
  console.log(`\n(dry-run: nothing written to the board; planned proposal saved next to ${file})`);
} else if (cmd === 'propose') {
  const file = process.argv[3] || fail('usage: propose <proposal.json>');
  const { board, rev } = await fetchBoard();
  if (board.meta.pendingSync && !process.argv.includes('--replace')) fail('the board already has a pending proposal. Review/apply it first, or pass --replace.', 2);
  const { proposal, dropped } = planProposal(board, loadJson(file));
  if (!proposal.items.length) {
    console.log(renderReport(board, proposal, { dropped }));
    console.log('\nNothing to propose — the board already matches.');
    process.exit(0);
  }
  board.meta.pendingSync = proposal;
  await putBoard(board, rev);
  console.log(renderReport(board, proposal, { dropped }));
  console.log(`\nProposal stored on the board — the owner reviews it in «Ещё → Обновить из GitHub». Nothing applied yet.`);
} else if (cmd === 'apply') {
  const { board, rev } = await fetchBoard();
  if (!board.meta.pendingSync) fail('no pending proposal on the board.');
  if (process.argv.includes('--ids') && !arg('--ids')) fail('--ids needs a comma-separated list of item ids.');
  const ids = arg('--ids')?.split(',').map((s) => s.trim()).filter(Boolean) ?? null;
  const unknown = ids?.filter((id) => !board.meta.pendingSync.items.some((i) => i.id === id)) ?? [];
  if (unknown.length) fail(`unknown item ids: ${unknown.join(', ')}`);
  const acceptManual = process.argv.includes('--accept-manual');
  if (acceptManual && !ids) fail('--accept-manual needs an explicit --ids list: manual conflicts are resolved one by one.');
  const { applied, skipped } = applyPending(board, { ids, acceptManual });
  if (!applied.length) {
    console.log(`Nothing applied. Skipped: ${skipped.map((s) => `${s.item.label} (${s.why})`).join('; ') || '—'}`);
    process.exit(0);
  }
  await putBoard(board, rev);
  console.log(`Applied ${applied.length}:\n${applied.map((i) => `✓ ${i.label}`).join('\n')}`);
  if (skipped.length) console.log(`Skipped: ${skipped.map((s) => `${s.item.label} (${s.why})`).join('; ')}`);
  const left = board.meta.pendingSync ? classify(board, board.meta.pendingSync) : null;
  if (left) console.log(`Still pending: ${left.needs.length} need a decision, ${left.manual.length} manual conflicts.`);
} else if (cmd === 'report') {
  const { board } = await fetchBoard();
  if (!board.meta.pendingSync) console.log(`No pending proposal. Last sync: ${board.meta.lastSync ? `${board.meta.lastSync.at} — ${board.meta.lastSync.summary}` : 'never'}`);
  else console.log(renderReport(board, board.meta.pendingSync));
} else {
  console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 12).join('\n').replace(/^\/\/ ?/gm, ''));
  process.exit(cmd ? 1 : 0);
}
