# Voice Cues

These cues are executable summaries backed by [raw-anchors.md](raw-anchors.md). Do not treat missing channel evidence as permission to invent a style.

## Approved core cues

```yaml
- cue_id: core-honest-limitation-001
  layer: structure
  scope: core
  rule: State a material limitation instead of hiding it; answer the reader's immediate concern when possible.
  status: approved
  evidence: {source_id: tg-task-tracker-launch-001, evidence_type: user-original}

- cue_id: core-no-performative-tech-jokes-001
  layer: voice-marker
  scope: core
  rule: Do not add technical metaphors solely to sound witty or programmer-like.
  status: approved
  evidence: {source_id: feedback-rejected-technical-metaphor-001, evidence_type: explicit-rejection}
```

## Approved Telegram cues

```yaml
- cue_id: tg-launch-personality-001
  layer: voice-marker
  scope: telegram
  rule: A rare playful or absurd launch line is allowed when grounded in a real shipped result.
  status: approved
  evidence: {source_id: tg-task-tracker-launch-001, evidence_type: user-original}

- cue_id: tg-process-triad-001
  layer: rhythm
  scope: telegram
  rule: A three-part process detail may end with an honest self-deprecating admission; do not turn it into a quota.
  status: approved
  evidence: {source_id: tg-task-tracker-launch-001, evidence_type: user-original}

- cue_id: tg-plain-translation-001
  layer: structure
  scope: telegram
  rule: A serious description may be followed by a blunt plain-language translation when it clarifies rather than merely jokes.
  status: approved
  evidence: {source_id: tg-bullet-journal-001, evidence_type: user-original}
```

## Approved site-blog cues

```yaml
- cue_id: site-promise-first-structure-001
  layer: structure
  scope: site-blog
  rule: Build the section order from the article's promise; do not turn a product story into a commit log because repository facts are available.
  status: approved
  evidence: {source_id: feedback-task-tracker-structure-001, evidence_type: explicit-feedback}
```

## Provisional channel status

Instagram, Threads, and X currently have no approved Samir-specific cues. Use platform adapters conservatively and learn from future edits.
