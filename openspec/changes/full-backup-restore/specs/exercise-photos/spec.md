# Delta: exercise-photos

**Change ID:** `full-backup-restore`
**Affects:** photos are now **included** in the full backup — the "device-local,
never exported" claim in the capability's Purpose is no longer true

> **Note for the archive merge:** this capability's change is in its **Purpose
> paragraph**, not in a Requirement. When archiving, replace the final sentence of
> `openspec/specs/exercise-photos/spec.md`'s Purpose —
> *"They are **device-local** — never exported in a backup."* — with the sentence
> given below. No Requirement in this spec is added, modified, or removed.

## Purpose (updated final sentence)

Replace:

> They are **device-local** — never exported in a backup.

With:

> Photos are part of the full **backup** (base64-encoded into the backup JSON) and
> are restored by an import (see the `data-portability` spec).

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

(None — the change is to the Purpose paragraph; see the note above.)

---

## REMOVED Requirements

(None)
