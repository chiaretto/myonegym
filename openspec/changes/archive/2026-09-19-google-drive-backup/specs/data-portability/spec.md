# Delta: data-portability

**Change ID:** `google-drive-backup`
**Affects:** o documento de backup, a tela de Backup

---

## ADDED Requirements

### Requirement: The Cloud Copy Is the Export Document

The backup sent to Google Drive (see `cloud-backup`) MUST be **the same
document** the JSON export produces, built by the same export and validated
on the way back by the same parser. Neither transport MUST gain a shape,
version, validation or repair the other lacks: a document exported to a file
MUST be restorable from the cloud and vice versa, and every rule this
capability states about the document — what it carries, what it leaves out,
how older versions are read — applies to the cloud copy unchanged.

The Backup screen MUST present the cloud actions **next to** the file actions,
in their own group, so the user sees them as two ways of doing the same
thing; the notes about what a restore can no longer bring back apply to both.

#### Scenario: One document, two transports
- GIVEN the user makes a Drive backup and a file export from the same state
- WHEN the two documents are compared
- THEN they have the same shape, version and content, differing only in `exportedAt`

#### Scenario: The device preferences stay out of the cloud copy too
- GIVEN the user chose an accent colour, a font size and saved an assistant key
- WHEN they back up to Drive
- THEN the cloud document carries none of them

#### Scenario: Validation is shared
- GIVEN a document that the file import would reject
- WHEN the same document is found in the cloud and restored
- THEN it is rejected with the same message, before any confirmation
