# Release Notes

Human-readable, user-facing summary per release (derived from the CHANGELOG). Maintained by the **Project Historian (G1)**.

## vX.Y.Z — YYYY-MM-DD
**Highlights:** <1–3 sentences on what this release delivers.>

### New
- <feature, user-facing phrasing> <!-- links: ADR / CHANGELOG -->
### Improvements
-
### Fixes
- <BUG-xxx summary>
### Known issues
- <KI-xxx summary + workaround>  <!-- must mirror Known Issues -->
### Upgrade / setup notes
- Startup: `docker compose up --build`. Config: see `.env.example` and README.
- Migrations: applied automatically on boot. Fresh DB contains no application data.

### Verification summary
- QA gate: PASS (coverage + RTM). Security (R2): PASS. Architecture (R0): PASS. Red Team (R4): PASS. DoD (R3): PASS.
- Evidence: `docs/quality/evidence/INDEX.md`.
