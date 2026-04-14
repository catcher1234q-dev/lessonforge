# Background Job Abstraction

Phase 2 note:
- long-running AI work should move through queued, processing, completed, and failed states
- retry behavior should be explicit
- failed jobs that produce no usable output should restore credits automatically

Implementation will land in a later phase once the database layer is wired up.
