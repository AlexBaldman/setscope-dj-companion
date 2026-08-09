# Cross-Project Integration Review

Date: 2026-08-08

## Sources reviewed

- the current Jeopardish `jeoparody-day-sweep` worktree and recent foundry commits;
- the current jeoPARODY runtime, design migration notes, and convergence branch;
- the uINVERSE platform thesis, foundry sweep, project brief, and opportunity ledger;
- the JeoPARODY creative bible and episode/editorial playbook;
- SetScope's product manifest, room system, design tokens, runtime tests, architecture, and current visual surfaces.

The related repositories are donors and behavioral references. Their mixed runtime architectures were not merged into SetScope.

## Adopted principles

1. **Truth before projection.** SetDraft, missions, skill evidence, recognition observations, and performance receipts remain the state owners. Styling and scene code may react to those facts but may not redefine them.
2. **Semantic event before spectacle.** A musical action should be named once and then consumed by coaching, animation, audio, persistence, and future native clients.
3. **Places instead of generic feature buckets.** Listening Station, Beat Basement, Vocal Arcade, Record Shop, Signal Bench, Controller Workshop, Field Notebook, and Style Foundry give each capability a memorable role.
4. **One world, distinct projections.** The Music Block is the shared semantic world. Each surface has a place, lens, purpose, route, and station code while preserving its own instrument layout.
5. **Directed sessions.** The best JeoPARODY episode thinking maps to music learning as entrance, turn, payoff, memory return, and creation handoff, rather than an endless pile of disconnected exercises.
6. **Dense atmosphere, calm play.** Pixel scenes, marginal jokes, stamps, and collectible detail live outside the critical reading and control path.
7. **Factories make candidates; people approve taste.** Repeated asset and content work should gain schemas, receipts, validation, and A/B steering without automatically promoting generated output to canon.
8. **Accessibility is part of readiness.** Reduced motion, non-audio equivalents, captions, touch sizing, provenance, and readable calm variants are production requirements.

## Implemented in this pass

- Product Manifest V2 now carries the semantic identity for all eight surfaces.
- `experience-system.js` joins product truth to room presentation without making either layer own the other.
- Every surface receives one responsive station strip with place, lens, route, purpose, and code.
- Style Lab now shows the shared world contract: world truth -> musical event -> experience direction -> projection.
- The connected-room strip collapses to place and station code on small screens so it does not compete with the primary action.
- Contract tests validate unique station identities, three-step routes, and room projections.

## Explicitly deferred

- A general-purpose Stage Engine. SetScope should earn it from a second genuinely different renderer, not from vocabulary alone.
- A navigable 2D or 3D world map. The semantic place model comes first; spectacle waits for a user journey that benefits from it.
- Commerce, public creator packs, and automated canon approval.
- A broad generated-asset factory before provenance, rights, accessibility, and curation receipts exist.
- A rewrite of mature SetScope gameplay around JeoPARODY classes or DOM assumptions.

## Next integrations worth earning

1. Extract a shared directed-session controller once Beat School and Pitch Gates can both prove the same entrance-to-payoff lifecycle.
2. Add a versioned semantic event vocabulary across listening, practice, creation, and reflection.
3. Let one saved musical artifact project into the set timeline, a practice challenge, a loop editor, and the journal without duplicating state.
4. Build a calm/dense atmosphere preference after screenshot baselines can verify that visual discovery never harms playability.
5. Treat the future iOS client as another projection over the same portable contracts, with ShazamKit as an adapter rather than a new product architecture.
