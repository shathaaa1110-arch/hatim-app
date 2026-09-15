# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Keep architecture and learning material in sync

For every implemented app feature or behavior change, update the relevant architecture, repository structure explanation, database/ERD, API contract, and Arabic beginner documentation in the same change. Include the affected flow and validation evidence. If a diagram or layer is unaffected, do not rewrite it merely to create a diff.

Keep ideas and proposals explicitly separate from implemented behavior. Product brainstorming does not authorize implementation by itself. The persistent-groups discussion is preserved historically in `docs/proposals/persistent-groups.ar.md`. Its implementation is documented in `docs/architecture-python-postgres.ar.md`, `docs/api-social.ar.md`, and `docs/learning-python-postgres/13-social-groups.ar.md`; keep those aligned with subsequent changes.

The annotated Python/PostgreSQL codebook is an immutable snapshot of the source revision stated in its introduction. Preserve that provenance; document newer source versions explicitly rather than silently attaching old line explanations to new code.
