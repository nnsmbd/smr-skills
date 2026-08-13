# Repurpose

Repurpose one canonical source into channel-native variants without creating a chain of lossy rewrites.

## Build the content packet

Extract once from the canonical source:

```yaml
content_id:
canonical_source:
thesis:
facts:
personal_context:
examples:
author_position:
must_preserve:
cannot_invent:
desired_action:
available_link:
```

Do not manufacture missing fields. Treat a supplied article, transcript, or approved post as the source of truth unless the user names another source.

## Select reuse mode

- `verbatim`: preserve wording; change only platform formatting and unsupported markup.
- `adapted`: preserve the content packet but rebuild hook, sequence, density, and ending for the channel.
- `teaser`: publish one self-contained insight and point to the source only when a real link is available.

Ask which mode is wanted only when it cannot be inferred from the request.

## Generate variants independently

Generate every target from the content packet:

```text
canonical source → content packet → Telegram
                                  → Instagram
                                  → Threads
                                  → X
```

Never use `site → Telegram → Instagram → X`. A derived variant may emphasize a different part, but it may not strengthen claims, invent scenes, or change Samir's position.

## Track lineage

Assign each output its own `source_id` and keep the shared `content_id`:

```yaml
source_id: task-tracker-telegram-001
content_id: task-tracker-personal-os
channel: telegram
reuse_mode: adapted
derived_from: task-tracker-site-001
approval: pending
```

Only an explicitly approved or user-edited variant may become a channel anchor. Several variants with one `content_id` count as one underlying topic when assessing recurring style evidence.
