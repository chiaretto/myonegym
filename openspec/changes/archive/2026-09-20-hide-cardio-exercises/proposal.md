# Proposal: Ocultar exercícios de cardio da aba Cardio

**Change ID:** `hide-cardio-exercises`
**Created:** 2026-09-20
**Status:** Implementation Complete
**Completed:** 2026-09-20

---

## Problem Statement

A aba Cardio lista **todo** exercício de cardio do catálogo, e o catálogo oficial
acabou de ganhar sete esportes. Quem só faz esteira e bicicleta passou a rolar por
natação, remo, corda e o resto toda vez que abre a aba — e não há o que fazer a
respeito: um exercício **oficial** não é uma linha do banco, então não pode ser
editado nem excluído. A lista só cresce, e cresce por decisão de quem publica o
catálogo, não de quem treina.

A aba é a única tela do app em que a lista **é** a ação (cada linha tem o seu
Iniciar). Linhas que o usuário nunca vai tocar custam ali mais do que em qualquer
outro lugar.

## Proposed Solution

Uma tela nova em Configurações — **Cardio** (`/settings/cardio`) — lista todos os
exercícios de cardio, das duas fontes, cada um com um interruptor **"Mostrar na
aba Cardio"**. Desligar oculta o exercício da aba; ligar devolve. A mudança vale
na hora, sem botão de salvar.

- **Onde mora o "oculto".** Em uma tabela própria do Dexie, `hiddenCardio`,
  chaveada pelo id do exercício (`&exerciseId`). Não em `Exercise.hidden`: os
  oficiais não têm linha onde gravar o campo, e são justamente eles o motivo da
  mudança. Não no store de Aparência (`localStorage`): ocultar é uma decisão sobre
  o catálogo do usuário, e deve ir e voltar com o backup como o resto dele.
- **Ocultar é só sobre a listagem da aba.** O exercício continua em
  Configurações → Exercícios, no histórico, na Consistência, como alternativa e no
  detalhe. Nada é apagado e nada muda no passado.
- **A sessão em andamento vence o oculto.** Um cardio em andamento só é
  alcançável pela sua própria linha ("Continuar"). Se o exercício dele for
  ocultado no meio do caminho, a linha MUST continuar na aba até a sessão
  terminar — senão a sessão fica sem porta.
- **A aba diz que há ocultos.** Com algum oculto, um rodapé discreto sob a lista
  ("3 ocultos · Gerenciar") leva à tela nova. Com **todos** ocultos, o estado
  vazio diz isso — e não "Nenhum cardio ainda", que seria mentira — e oferece o
  mesmo caminho.
- **Global, não por academia.** O que a pessoa pratica é dela, não do prédio — o
  mesmo argumento do peso global.

## Scope

### In Scope
- Tabela `hiddenCardio` (Dexie v14) e funções de repositório para ler e alternar
- Tela `/settings/cardio` com um interruptor por exercício de cardio, e a linha
  "Cardio" no grupo Cadastros de Configurações (com a contagem "visíveis / total")
- Aba Cardio filtra os ocultos, mantém a linha da sessão em andamento, mostra o
  rodapé "N ocultos" e o estado vazio de "todos ocultos"
- Backup: exportar/importar `hiddenCardio` (chave opcional, sem subir a versão do documento — ver tasks 1.4), backups antigos restauram
  com nada oculto; "Apagar tudo" limpa a tabela; excluir um exercício limpa o seu
  registro

### Out of Scope
- Ocultar exercícios de **força** (eles já só aparecem nos dias em que o usuário os pôs)
- Ocultar por academia
- Reordenar ou fixar exercícios na aba Cardio
- Ocultar o exercício em outros lugares (lista de Exercícios, alternativas, Assistente)
- Ocultar direto da aba (gesto na linha) — a aba é para iniciar; a curadoria fica
  em Configurações, como pedido

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Yes | Dexie v14: tabela `hiddenCardio` (`&exerciseId`). Sem `upgrade` — nasce vazia |
| API | No | Sem backend |
| State | Yes | `repos.ts`: `listHiddenCardioIds`, `setCardioHidden`; `deleteExercise` e `resetAll` limpam; hook `useHiddenCardioIds` |
| UI | Yes | `CardioSettingsPage` nova + rota; linha em `SettingsPage`; `CardioPage` filtra, rodapé e estado vazio novo |
| Backup | Yes | `portability.ts`: campo opcional `hiddenCardio: number[]`; `SCHEMA_VERSION` permanece 6 |

## Architecture Considerations

- `listCardioExercises` **continua devolvendo todos** — é a lista da tela de
  Configurações. O filtro é aplicado na `CardioPage`, que já precisa das duas
  informações (todos + ocultos) para o rodapé, o estado vazio e a exceção da
  sessão em andamento. Uma segunda query "só visíveis" esconderia essas três
  decisões dentro do repositório.
- A tabela guarda **ids das duas fontes** (oficiais `< 10000`, do usuário acima),
  como `weights` e `exerciseNotes` já fazem. Não é escrita no catálogo oficial,
  então a recusa de escrita em ids oficiais não se aplica.
- Um exercício que vira **Força** mantém o registro de oculto — mesma política dos
  pesos de um exercício que vira Cardio: não se exibe, não se apaga, volta como
  estava.
- Na restauração, ids que não resolvem para nenhum exercício de nenhuma fonte são
  descartados, como já se faz com alternativas órfãs.
- A aba não afirma nada antes de **as duas** leituras responderem (exercícios e
  ocultos): filtrar com `[]` provisório piscaria a lista inteira e a encolheria um
  frame depois (ver *Estados Vazios Só Depois da Resposta*).

## Success Criteria

- [x] Desligar "Natação" em Configurações → Cardio tira a linha da aba Cardio sem recarregar; ligar devolve
- [x] Um exercício oficial e um do usuário podem ser ocultados do mesmo jeito
- [x] Um cardio em andamento de um exercício oculto continua com a sua linha "Continuar" na aba
- [x] Com todos ocultos, a aba explica isso e leva à tela de Configurações → Cardio
- [x] Exportar e importar preserva os ocultos; um backup v6 restaura com nada oculto
- [x] Histórico, Consistência e a lista de Exercícios não mudam com um exercício oculto

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Usuário oculta tudo e acha que a aba quebrou | Med | Med | Estado vazio próprio, que nomeia a causa e leva à tela de gerenciar |
| Sessão de cardio inalcançável por ocultar o exercício em andamento | Low | High | A linha dona da sessão ignora o oculto; coberto por teste de integração |
| Usuário esquece que ocultou e procura o exercício | Med | Low | Rodapé "N ocultos · Gerenciar" sempre que houver algum |
| Backup novo lido por versão antiga do app | Low | Low | Campo opcional e aditivo: o app antigo ignora a chave e restaura todo o resto, com nada oculto |
| Lista pisca inteira antes de filtrar | Med | Low | Renderizar só depois das duas leituras |

---

## Archive Information

**Archived:** 2026-09-20
**Duration:** 0 dias (proposta, implementação e arquivo no mesmo dia)
**Outcome:** Successfully implemented

### Desvios da proposta
- `SCHEMA_VERSION` ficou em 6: a chave `hiddenCardio` é aditiva e opcional, e a
  regra já registrada em `portability.ts` é não subir a versão quando nenhum dos
  lados lê errado o outro. Nada no app recusa um backup por versão.
- `src/data/catalogProposal.ts` entrou na mudança: a transação do Assistente
  chama `deleteExercise`, cuja cascata passou a tocar `hiddenCardio`.

### Files Modified
- `src/db/types.ts`, `src/db/db.ts` — `HiddenCardio`, Dexie v14
  (`hiddenCardio: '&exerciseId'`), tabela em `allTables`
- `src/db/repos.ts` — `listHiddenCardioIds`, `setCardioHidden`; cascata em
  `deleteExercise`
- `src/data/portability.ts` — `BackupDoc.hiddenCardio`, export, import e
  `normalizeHiddenCardio`
- `src/data/catalogProposal.ts` — `hiddenCardio` na transação de aplicar
- `src/lib/hooks.ts` — `useHiddenCardioIds`
- `src/lib/cardioVisibility.ts` (novo) — `visibleCardio`
- `src/features/settings/CardioSettingsPage.tsx`, `cardio-settings.css` (novos);
  `SettingsPage.tsx` (linha "Cardio"); `src/App.tsx` (rota `/settings/cardio`)
- `src/features/cardio/CardioPage.tsx`, `cardio.css` — filtro, rodapé
  "N ocultos · Gerenciar", estado vazio de todos-ocultos
- `openspec/project.md` — entidade *Hidden cardio*
- Testes: `cardioVisibility.test.ts` (5, novo),
  `cardio-settings.integration.test.tsx` (5, novo),
  `cardio.integration.test.tsx` (+7), `repos.test.ts` (+4),
  `portability.test.ts` (+6), `migration.test.ts` (+1)

### Specs Updated
- `openspec/specs/cardio/spec.md` — *Cardio Screen* modificado (abertura, estado
  vazio, cenário da lista); +4 requisitos (*Hidden Cardio Exercises*, *A Running
  Cardio Outranks Hidden*, *The Tab Says What It Is Hiding*, *Manage Cardio
  Visibility in Settings*)
- `openspec/specs/data-portability/spec.md` — +1 requisito (*Backups Carry
  Hidden Cardio*)

### Verificação
- `npm test` — 99 arquivos, 1341 de 1342 passando. A falha,
  `officialCatalog.test.ts` (67 esperados, 68 achados), vem de uma mudança de
  catálogo **não commitada e alheia** que estava na árvore de trabalho; com o
  `officialCatalog.json` deste commit o arquivo tem 67
- `npm run typecheck` — limpo; `npm run build` — limpo
- `npx openspec validate --specs --strict` — 17/18; a falha é `exercises`,
  anterior a esta mudança
- Conferência visual (ocultar, em andamento, todos ocultos, backup, tela estreita
  com fonte máxima) feita pelo usuário
