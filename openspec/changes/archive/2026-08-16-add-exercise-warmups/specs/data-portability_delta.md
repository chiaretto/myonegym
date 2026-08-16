# Delta: data-portability

**Change ID:** `add-exercise-warmups`
**Affects:** `src/data/portability.ts` (`BackupDoc`, `parseBackup`,
`exportBackup`, `importBackupReplaceAll`)

---

## ADDED

### Requirement: Backups Carry Warmups and Their Links

O documento de backup MUST carregar os **aquecimentos** cadastrados e os
**vínculos** de cada exercício com eles, para que uma restauração devolva o
catálogo inteiro — não um conjunto de exercícios que perderam o preparo.

A importação MUST aceitar um documento **anterior** a esta mudança, sem a lista
de aquecimentos e sem o campo de vínculo, tratando ambos como **vazios**. Um
backup antigo é exatamente um app sem aquecimentos, e rejeitá-lo por campo
ausente inutilizaria todo arquivo gerado até aqui.

Um vínculo apontando para um aquecimento **ausente** do documento MUST ser
descartado na importação, e não restaurado como referência quebrada.

#### Scenario: Round-trip preserva os vínculos
- GIVEN dois exercícios compartilham o mesmo aquecimento
- WHEN o usuário exporta o backup e o restaura num dispositivo limpo
- THEN o aquecimento volta como **um** registro
- AND os dois exercícios continuam vinculados a ele, na mesma ordem

#### Scenario: Backup antigo importa sem aquecimentos
- GIVEN um backup gerado antes desta mudança
- WHEN o usuário o restaura
- THEN nenhum aquecimento existe e todo exercício fica com a lista vazia
- AND nada é rejeitado nem perdido

#### Scenario: Vínculo órfão não é restaurado
- GIVEN um documento em que um exercício aponta para um aquecimento que a lista
  do documento não contém
- WHEN ele é importado
- THEN o exercício é restaurado sem aquele vínculo

---

## MODIFIED

### Requirement: Export Full Backup JSON

*(única mudança: os aquecimentos e seus vínculos entram na lista do que o
documento carrega; todo o resto do requisito permanece)*

From Settings, the user MUST be able to export **the entire database** as a
single versioned JSON file, so that the export can serve as a true **backup**
against the loss of the PWA's local storage. The export MUST include **all**
persistent user data:

- gyms, categories, exercises (com suas **categorias**, suas **alternativas** e
  seus **aquecimentos**), training days;
- os **aquecimentos** do catálogo, com nome e URL de mídia;
- o **peso global** de cada exercício e as **exceções por academia**, mais o
  **histórico de alterações** de cada um desses escopos;
- the per-gym exercise **notes**;
- every **workout session** and its **entries** (with their done states and the
  exercise each one ended up recording, swap included);
- every per-gym exercise **photo**, with its image bytes.

Preferências de UI **locais do dispositivo** — o tamanho da fonte, a **cor de
destaque** e a marca de "já perguntei" da primeira abertura — NÃO são dados do
usuário e MUST permanecer **fora** do backup.

#### Scenario: Os aquecimentos estão no arquivo
- GIVEN o app tem aquecimentos vinculados a exercícios
- WHEN o usuário exporta o backup
- THEN o arquivo contém os aquecimentos e os vínculos de cada exercício

#### Scenario: Export the whole database
- GIVEN the user has gyms, exercises, days, weights, weight history, notes,
  workout sessions, and photos
- WHEN the user taps "Exportar backup"
- THEN a single versioned JSON document is produced containing all of them

---

## REMOVED

(Nenhum.)
