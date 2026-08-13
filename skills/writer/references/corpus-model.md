# Corpus Model

Maintain three evidence levels with provenance.

## 1. Raw anchors

Store original user text, explicit feedback, and before/after pairs without stylistic cleanup. Raw anchors are the audit truth, not the default runtime context.

Required metadata:

```yaml
source_id:
content_id:
channel:
source_type: user-original | user-edited | explicit-feedback | ai-draft
date:
approval: approved | candidate | rejected
canonical: true | false
derived_from:
location:
```

## 2. Normalized anchors

Create clean, runtime-ready excerpts or full examples from approved raw anchors. Correct accidental spelling and remove editorial comments without rewriting the underlying voice. Preserve `source_id`, `content_id`, and the link to raw evidence.

## 3. Voice cues

Store concise executable observations under one of the five prose layers. Every cue must include scope, status, and evidence.

```yaml
cue_id:
layer: lexicon | syntax | rhythm | structure | voice-marker
scope: core | site-blog | telegram | instagram | threads | x | sales
rule:
status: approved | candidate | rejected
evidence:
  source_id:
  evidence_type:
  excerpt:
```

## Provenance rules

- One `source_id` identifies one artifact or explicit feedback event.
- One `content_id` groups a canonical idea and all its channel variants.
- Derived variants do not count as independent confirmation of a cue.
- An explicit user rejection overrides model inference immediately.
- Never erase conflicting evidence; narrow the cue's scope or record the conflict.
- Never silently promote a candidate cue to approved.
