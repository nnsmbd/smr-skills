# Three live design directions

## Contents

1. Inputs
2. Direction requirements
3. Handoff package
4. Selection record

## Inputs

Begin only after the brief and production copy are approved. Use real copy volume, known assets, evidence availability, accessibility requirements, and reference cards grouped by property.

## Direction requirements

Create three standalone HTML directions that are meaningfully different in:

- composition and grid;
- typography and density;
- surface and color logic;
- image treatment;
- rhythm and section transitions;
- motion concept.

Each direction must include enough representative sections to judge the system, not merely three hero variations. Include desktop and mobile behavior through responsive CSS. Keep the prototype semantically structured and easy to transfer.

For each direction document:

- concept in one sentence;
- audience and offer fit;
- transferable reference principles;
- responsive behavior;
- motion role and reduced-motion fallback;
- asset requirements;
- accessibility, performance, and implementation risks;
- why it differs from the other two.

Do not copy a reference layout, brand system, or proprietary asset. Do not use stock photography as a substitute for missing proof without approval.

## Handoff package

Use `assets/design-handoff/` as the neutral structure. Include:

- project context and constraints;
- locked copy;
- selected references with property notes;
- available assets and publication permissions;
- current screenshots/code for redesigns;
- each live direction;
- a decision file explaining the selected system.

Framework-independent HTML/CSS is preferred for early exploration because it exposes the design system without binding it to production architecture.

## Selection record

The design gate is complete when the user selects a direction or an explicit combination. Record:

- selected direction;
- approved changes requested during selection;
- typography, color, grid, image, and motion principles;
- rejected ideas that must not reappear;
- unresolved asset dependencies;
- approval date and evidence.

Do not transfer all experimental effects into production. Implement the smallest set that carries the selected concept.
