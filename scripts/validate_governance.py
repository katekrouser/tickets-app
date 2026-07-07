#!/usr/bin/env python3
"""Governance self-validation harness (audit item Md5, owner A2).

Doc-level subset that runs before the app exists. Strengthened per audit HR-1:
  V1  ownership uniqueness   — exact-duplicate AND prefix-overlap detection (honours documented `except` carve-outs)
  V3  MO scope               — MO owns only process/orchestration runtime state; never a permanent doc
  V11 doc consistency        — FEATURE-COMPLETE count identical across MASTER/README/DEVELOPMENT_PLAN + local links resolve
  V13 role distinctness      — every GOVERNANCE_MATRIX row: 6 pairwise inequalities; Approver==MO; A/R/V != MO
Deferred until backend/frontend exist (need code): V2,V5-V10,V12,V14 (printed as a notice).
Per-change (runtime) role distinctness beyond the matrix is enforced by the MO at each gate (V13 runtime duty).
Exit 1 on any failure so CI blocks the gate.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
errors = []
OWNER_RE = re.compile(r"\b(A\d+|R\d+|G1|MO)\b")

def table_rows(text):
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("|") and "---" not in s:
            yield [c.strip() for c in s.strip("|").split("|")]

# ---------- parse OWNERSHIP registry ----------
own_path = DOCS / "governance" / "OWNERSHIP.md"
entries = []  # (path, owner, raw_lower)
if own_path.exists():
    for cells in table_rows(own_path.read_text(encoding="utf-8")):
        if len(cells) != 2:
            continue
        m_path = re.search(r"`([^`]+)`", cells[0])
        if not m_path or "/" not in m_path.group(1):
            continue
        path = m_path.group(1).strip()
        if "immutable" in cells[1].lower():
            owner = "IMMUTABLE"
        else:
            m_own = OWNER_RE.search(cells[1])
            owner = m_own.group(1) if m_own else cells[1].split()[0]
        entries.append((path, owner, cells[0].lower()))
else:
    errors.append("V1/V3 skipped: OWNERSHIP.md missing")

# ---------- V1: exact duplicate + prefix overlap ----------
def covers(a):
    return a[:-2] if a.endswith("/**") else None

for i, (pa, oa, ra) in enumerate(entries):
    for j, (pb, ob, rb) in enumerate(entries):
        if i == j or oa == ob:
            continue
        if pa == pb:
            errors.append(f"V1 duplicate ownership: {pa} -> {oa} and {ob}")
            continue
        base = covers(pa)
        if base and pb.startswith(base):
            leaf = pb[len(base):].split("/")[0]  # e.g. 'decisions'
            excepted = "except" in ra and leaf and leaf in ra
            if not excepted:
                errors.append(f"V1 prefix overlap: '{pa}' ({oa}) covers '{pb}' ({ob}) with no carve-out")

# ---------- V3: MO scope ----------
for path, owner, raw in entries:
    if owner == "MO":
        if not path.startswith("docs/process/orchestration/") or path.endswith("README.md"):
            errors.append(f"V3 MO owns a non-state / documentation path: {path}")

# ---------- V13: role distinctness in GOVERNANCE_MATRIX ----------
mx = DOCS / "GOVERNANCE_MATRIX.md"
if mx.exists():
    for cells in table_rows(mx.read_text(encoding="utf-8")):
        if len(cells) >= 5 and cells[1] != "Author" and re.search(r"\.md$|[A-Z]", cells[0]):
            art, a, r, v, ap = cells[0], cells[1], cells[2], cells[3], cells[4]
            if a == "Author":
                continue
            for name, (x, y) in {"Author!=Reviewer": (a, r), "Reviewer!=Verifier": (r, v),
                                 "Verifier!=Approver": (v, ap), "Author!=Approver": (a, ap),
                                 "Author!=Verifier": (a, v), "Reviewer!=Approver": (r, ap)}.items():
                if x and y and x == y:
                    errors.append(f"V13 role collision in {art}: {name} ({x})")
            if ap != "MO":
                errors.append(f"V13 {art}: Approver must be MO (got {ap})")
            if "MO" in (a, r, v):
                errors.append(f"V13 {art}: MO must not be Author/Reviewer/Verifier")
else:
    errors.append("V13 skipped: GOVERNANCE_MATRIX.md missing")

# ---------- V11a: FEATURE-COMPLETE count consistency ----------
def read(p):
    q = DOCS / p
    return q.read_text(encoding="utf-8") if q.exists() else ""

readme, devplan, master = read("agents/README.md"), read("planning/DEVELOPMENT_PLAN.md"), read("agents/MASTER-ORCHESTRATOR.md")
r_n = re.search(r"FEATURE-COMPLETE \(all (\d+)", readme)
d_n = re.search(r"Feature-complete \(all (\d+)", devplan)
mblock = ""
mm = re.search(r"# FEATURE-COMPLETE DEFINITION.*?(?=\n# )", master, re.S)
if mm:
    nums = [int(x) for x in re.findall(r"^\s*(\d+)\.\s", mm.group(0), re.M)]
    m_n = max(nums) if nums else None
else:
    m_n = None
counts = {"README": int(r_n.group(1)) if r_n else None,
          "DEVELOPMENT_PLAN": int(d_n.group(1)) if d_n else None,
          "MASTER": m_n}
if len(set(v for v in counts.values() if v is not None)) > 1:
    errors.append(f"V11 FEATURE-COMPLETE count divergence: {counts}")

# ---------- V11b: local markdown links resolve ----------
for md in DOCS.rglob("*.md"):
    for m in re.finditer(r"\]\(([^)]+)\)", md.read_text(encoding="utf-8")):
        t = m.group(1).split("#")[0].strip()
        if not t or t.startswith(("http://", "https://", "mailto:")):
            continue
        if not (md.parent / t).resolve().exists():
            errors.append(f"V11 broken link in {md.relative_to(ROOT)}: {t}")

# ---------- V13b: role defaults never self-assign (audit C-1) ----------
def default_verifier(author):
    # doc-authors (A1 architecture/orchestration docs, G1 records) → A2; A2's own docs → A14;
    # A14 code → R3; other code-authors (A3–A15) → A14 (all distinct from the author).
    return {"A1": "A2", "A2": "A14", "A14": "R3", "G1": "A2"}.get(author, "A14")
for a in ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15", "G1"]:
    if default_verifier(a) == a:
        errors.append(f"V13b default self-verify: {a} is its own default Verifier")

# ---------- V-own-sync: ownership excerpts must match OWNERSHIP (audit H-1) ----------
def module_owners(text):
    m = {}
    for line in text.splitlines():
        mod = re.search(r"backend/src/modules/(\w+)/", line)
        own = re.search(r"\b(A\d+)\b", line)
        if mod and own:
            m[mod.group(1)] = own.group(1)
    return m
canon = module_owners(own_path.read_text(encoding="utf-8")) if own_path.exists() else {}
for name, rel in [("README", "agents/README.md"), ("DEVELOPMENT_PLAN", "planning/DEVELOPMENT_PLAN.md"),
                  ("MASTER", "agents/MASTER-ORCHESTRATOR.md")]:
    for mod, owner in module_owners(read(rel)).items():
        if mod in canon and canon[mod] != owner:
            errors.append(f"V-own-sync {name}: module '{mod}' owner {owner} != OWNERSHIP {canon[mod]}")

# ---------- V-gate2: GATE 2 wired (audit H-2) ----------
if read("governance/SELF_VALIDATION.md") and "GATE 2" not in read("governance/SELF_VALIDATION.md"):
    errors.append("V-gate2: SELF_VALIDATION gate wiring omits GATE 2")

print("[deferred until backend/frontend exist: V2,V5-V10,V12,V14]")
if errors:
    print(f"GOVERNANCE VALIDATION: FAIL ({len(errors)})")
    for e in errors:
        print("  -", e)
    sys.exit(1)
print("GOVERNANCE VALIDATION: PASS")
