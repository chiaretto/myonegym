# Delta: data-portability

**Change ID:** `add-cardio-exercise-type`
**Affects:** `src/data/portability.ts` (`BackupDoc`, `parseBackup`,
`importBackupReplaceAll`, `generateExample`)

---

## ADDED

### Requirement: Backups Carry the Exercise Kind

O documento de backup MUST carregar o **tipo** de cada exercício e o **tipo** de
cada sessão, junto do resto do registro.

A importação MUST aceitar um documento **anterior** a esta mudança, em que o
campo não existe, assumindo **Força** para todo exercício e toda sessão — que é
exatamente o que eles eram. Rejeitar por campo ausente inutilizaria todo backup
gerado antes desta versão.

#### Scenario: Round-trip preserva os tipos
- GIVEN o app tem exercícios de Força e de Cardio e sessões dos dois tipos
- WHEN o usuário exporta o backup e o restaura num dispositivo limpo
- THEN cada exercício e cada sessão voltam com o mesmo tipo

#### Scenario: Backup antigo importa como Força
- GIVEN um backup gerado antes desta mudança, sem o campo de tipo
- WHEN o usuário o restaura
- THEN todos os exercícios e sessões ficam como Força
- AND nada é rejeitado nem perdido

#### Scenario: A aba Cardio reflete o que foi restaurado
- GIVEN um backup com dois exercícios de Cardio é restaurado
- WHEN o usuário abre a aba Cardio
- THEN os dois aparecem na lista

---

## MODIFIED

### Requirement: Generate Example Data

*(única mudança: a amostra passa a incluir ao menos um exercício de **Cardio**,
para a aba não abrir vazia em quem gera o exemplo; todo o resto do requisito
permanece)*

A rotina de exemplo MUST semear os pesos da amostra como **pesos globais** dos
exercícios, e não como pesos da academia de exemplo. A geração MUST ser
**aditiva e segura** — inserida com **ids remapeados**, sem sobrescrever dados
existentes e com as referências íntegras. As categorias de cada dia são
**derivadas dos exercícios do dia**. A **academia** de exemplo MUST ser criada
**apenas quando nenhuma academia existe**.

A amostra MUST conter ao menos um exercício de **Cardio**, que MUST NOT entrar
em nenhum dia de treino e MUST NOT receber peso.

#### Scenario: A amostra traz um cardio
- GIVEN o app tem pouco ou nenhum dado
- WHEN o usuário toca "Gerar exemplo"
- THEN pelo menos um exercício de Cardio é criado
- AND ele aparece na aba Cardio, sem peso e fora dos dias

#### Scenario: Generate the sample routine
- GIVEN o app tem pouco ou nenhum dado
- WHEN o usuário toca "Gerar exemplo"
- THEN as categorias, exercícios (com mídia) e dias de treino da amostra são
  criados e visíveis

#### Scenario: Additive and safe with existing data
- GIVEN o usuário já tem algumas categorias e uma academia
- WHEN o usuário toca "Gerar exemplo"
- THEN o conteúdo da amostra é adicionado sem sobrescrever dados existentes
- AND as referências permanecem válidas (sem colisão de ids)

---

## REMOVED

(Nenhum.)
