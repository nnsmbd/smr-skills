# Legal pages structure

Structure only, no ready legal text. Placeholders mark where a page belongs and why; the user or a legal owner supplies actual wording. See `conversion-copy.md` "Legal checklist" for the full rule.

| Page | Needed when | Placeholder content |
|---|---|---|
| Privacy notice | Site collects personal data (forms, waitlist, signup, tracking with identifiers) | What data, why, retention — owner to draft |
| Terms of service | Site grants product access or takes payment (signup, trial, checkout) | Access terms, liability, cancellation — owner to draft |
| Cookie/consent notice | Tracking needs consent in the visitor's region | Categories tracked, consent mechanism — owner to draft |

- Link each required page from the footer and from the CTA that triggers the need (signup, checkout, waitlist form).
- Treat an unfilled placeholder as a blocker, not a launch-ready page: do not ship a page whose legal owner has not confirmed the wording.
- Record which pages this project needs and why in `project.yaml` under `modules.legal_pages`.
