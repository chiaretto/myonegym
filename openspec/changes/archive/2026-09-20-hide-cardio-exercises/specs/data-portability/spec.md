# Delta: data-portability

**Change ID:** `hide-cardio-exercises`
**Affects:** o documento de backup (chave nova, opcional); a restauração de backups
anteriores; "Apagar tudo"

---

## ADDED Requirements

### Requirement: Backups Carry Hidden Cardio

O documento de backup MUST carregar a lista de exercícios de cardio que o usuário
**ocultou** da aba Cardio (ver *Hidden Cardio Exercises*, em `cardio`), como ids
de exercício — oficiais e do usuário. Ocultar é uma decisão sobre o catálogo de
quem treina, e um backup que a perdesse devolveria, num aparelho novo, exatamente
a lista comprida de que o usuário se livrou.

A importação MUST aceitar um documento **anterior** a esta mudança, em que o
campo não existe, assumindo **nada oculto** — que é exatamente o que ele era.

A importação MUST descartar, sem rejeitar o documento, os ids que não resolvem
para nenhum exercício de nenhuma das duas fontes (um oficial aposentado, um
exercício ausente do próprio backup), além de duplicados e valores que não são
ids. Uma marca órfã não tem efeito visível e não é motivo para recusar um backup.

A restauração MUST **substituir** os ocultos, como substitui todo o resto: o que
estava oculto no aparelho antes de importar não sobrevive.

**Apagar tudo** MUST limpar os ocultos junto com os demais dados.

#### Scenario: Round-trip preserva os ocultos
- GIVEN "Natação" (oficial) e "Escada do prédio" (do usuário) estão ocultas
- WHEN o usuário exporta o backup e o restaura num dispositivo limpo
- THEN as duas continuam ocultas na aba Cardio
- AND os demais cardios aparecem

#### Scenario: Backup antigo restaura com nada oculto
- GIVEN um backup gerado antes desta mudança, sem o campo de ocultos
- WHEN o usuário o restaura
- THEN nenhum exercício fica oculto
- AND nada é rejeitado nem perdido

#### Scenario: Restaurar substitui os ocultos do aparelho
- GIVEN "Remo" está oculto no aparelho e o backup só oculta "Natação"
- WHEN o usuário restaura o backup
- THEN "Natação" está oculta e "Remo" aparece

#### Scenario: Id órfão é descartado, não fatal
- GIVEN um backup cuja lista de ocultos cita um id que nenhum exercício tem
- WHEN o usuário o restaura
- THEN a restauração conclui normalmente
- AND nenhuma marca é gravada para aquele id

#### Scenario: Apagar tudo limpa os ocultos
- GIVEN há exercícios ocultos
- WHEN o usuário apaga todos os dados
- THEN nenhum exercício oficial de cardio permanece oculto

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
