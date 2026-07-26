# Proposal: Histórico e resumo semanal deixam de ser por academia

**Change ID:** `sessions-across-gyms`
**Created:** 2026-07-25
**Status:** Implementation Complete (código) — conferência em navegador pendente
**Completed:** 2026-07-25

---

## Problem Statement

O app trata a academia ativa como um filtro sobre o **histórico de treinos**, e
não é isso que ela é. Quem treina em duas academias — a do bairro na semana, a do
trabalho de vez em quando — tem um histórico só, mas o app o parte em dois e
mostra apenas o pedaço da academia selecionada no momento.

Duas telas sofrem disso:

**A lista de sessões** (`SessionsPage.tsx:31`) chama
`useSessionSummaries(activeGymId)`, que consulta
`sessions.where('gymId').equals(gymId)` (`repos.ts:528-546`). Trocar de academia
troca a lista inteira. Pior: o rodapé anuncia "N sessões **nesta academia**", ou
seja, o app sabe que está escondendo coisa e diz isso ao usuário sem lhe oferecer
como ver o resto. Não existe nenhuma tela no app que mostre o histórico completo.

**A contagem da semana** na Home (`HomePage.tsx:100,121-125`) sai da mesma lista.
Um usuário que treinou segunda na academia A e terça na B vê "1 / 7 treinos" em
vez de "2 / 7" — e a trilha de sete dias marca só um dia. O número que deveria
responder "eu treinei essa semana?" responde "eu treinei essa semana **aqui**?",
que é uma pergunta que ninguém faz.

O que **é** legitimamente por academia continua sendo: os pesos-alvo, a sessão em
andamento (um treino só acontece num lugar) e as observações e fotos por
exercício. O erro está em ter estendido esse escopo ao histórico consolidado.

Há ainda um efeito colateral silencioso. `deleteGym` (`repos.ts:81-97`) apaga
pesos, histórico de pesos, observações e fotos — mas **não** apaga as sessões.
Elas ficam órfãs, apontando para uma academia que não existe mais, e hoje somem
da interface porque uma academia excluída nunca é a ativa. São treinos que a
pessoa realmente fez, invisíveis por acidente de implementação.

## Proposed Solution

### A. O histórico passa a ser um só

`listSessionSummaries` ganha a capacidade de listar **todas** as academias, e a
lista de sessões passa a usá-la assim. A ordenação por mais recente e o
agrupamento por mês não mudam — só deixa de haver filtro.

Como a lista passa a misturar academias, **cada item mostra de onde veio**. O
nome entra na linha secundária do card, junto da data e da duração, que já é onde
mora o contexto do item:

```
┌────────────────────────────────────┐
│ Dia 1 — Peito e Tríceps      8/8  │
│ há 2 dias · 24/07 · 52min · Smart Fit
└────────────────────────────────────┘
```

O rodapé deixa de dizer "nesta academia" — passa a contar tudo.

### B. O nome da academia vem de consulta, não de cópia

`Session` guarda `gymId`, mas **não** guarda `gymName` — diferente de `dayName`,
que é copiado na criação justamente para a sessão sobreviver ao dia ser renomeado
ou excluído (`types.ts:112-114`).

Copiar `gymName` também seria coerente com esse padrão, mas exigiria migração de
schema **e** deixaria sem nome toda sessão já gravada, que é a maior parte do
histórico de quem já usa o app. Então o nome é resolvido por **consulta à tabela
de academias no momento da leitura**. A lista de academias é pequena e já está
carregada na tela.

O custo declarado: se a academia for renomeada, o histórico inteiro passa a
mostrar o nome novo — inclusive em sessões antigas. Para um rótulo de contexto
("onde foi isto") esse comportamento é aceitável, e discutivelmente melhor que
mostrar um nome que não existe mais.

### C. As sessões órfãs voltam a aparecer, identificadas

Com o filtro fora, as sessões de academias excluídas reaparecem. Elas **devem**
aparecer: são treinos reais. Mas precisam ser legíveis — sem nome resolvível, o
item mostra um rótulo de academia removida em vez de um espaço vazio, que se
leria como defeito.

Elas passam a contar no resumo da semana também. É a consequência correta: o
treino aconteceu.

### D. O resumo da semana e o "Próximo treino" seguem o mesmo histórico

A contagem, a trilha de sete dias e a sequência (*streak*) passam a considerar
todas as academias.

O **"Próximo treino"** acompanha. Os dias de treino são **globais** no app —
`useDays()` não recebe academia —, então a rotação "treinou o Dia 1, o próximo é
o Dia 2" não tem por que se reiniciar ao trocar de lugar. Hoje reinicia: o
requisito vigente escolhe o dia a partir do histórico *da academia ativa*, com um
cenário explícito ("Follows the active gym") que passa a valer o contrário.

O que **não** muda: a sessão em andamento continua sendo por academia
(`useActiveSession(activeGymId)`), e com ela o botão Continuar e o requisito
"Single Active Session Per Gym".

### E. O seletor de academia sai da tela de Sessões

Com a lista global, o seletor no cabeçalho daquela tela não altera mais nada do
que está à vista. Um controle que não produz efeito visível se lê como quebrado,
então ele sai dali. Continua na Home, onde governa pesos, sessão ativa e o botão
Iniciar.

## Scope

### In Scope
- `listSessionSummaries` passa a aceitar "todas as academias".
- `SessionSummary` passa a carregar o nome da academia resolvido na leitura.
- `SessionsPage` lista tudo, mostra o nome no item e ajusta o rodapé.
- Rótulo próprio para sessões cuja academia foi excluída.
- Resumo semanal (contagem, trilha, sequência) sobre todas as academias.
- "Próximo treino" sobre todas as academias.
- Remoção do seletor de academia do cabeçalho de Sessões.
- Testes de unidade e integração para cada um dos itens acima.

### Out of Scope
- **Filtrar** o histórico por academia. A lista passa a ser uma só; um filtro
  opcional é outra mudança, com sua própria interface.
- Mudar o que é legitimamente por academia: pesos-alvo, sessão em andamento,
  observações e fotos.
- Copiar `gymName` para dentro de `Session` (migração de schema) — ver "B".
- Fazer `deleteGym` apagar ou reatribuir sessões. Esta mudança **revela** as
  órfãs; decidir o destino delas é assunto separado, e apagá-las de vez seria
  destruir histórico real sem o usuário ter pedido.
- Agrupar ou segmentar a lista por academia.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nenhuma tabela, índice ou migração. Só uma consulta nova sobre dados existentes |
| API | No | App local-only, sem servidor |
| State | Yes | `useSessionSummaries` passa a poder ignorar a academia; `SessionSummary` ganha o nome da academia |
| UI | Yes | `SessionsPage` (lista global, nome no item, rodapé, seletor removido) e `HomePage` (resumo e próximo dia a partir do histórico global) |

## Architecture Considerations

- **A academia ativa deixa de ser filtro de leitura e vira contexto de escrita.**
  Ela continua decidindo *onde* um treino acontece e a que pesos ele se refere;
  deixa de decidir *o que o usuário consegue ver do próprio passado*. Vale
  registrar essa distinção nas specs, porque ela é o que separa esta mudança de
  uma regressão.
- **O `SessionSummary` é o lugar certo para o nome.** Resolver a academia dentro
  do repositório, e não em cada tela, mantém o tratamento de academia excluída em
  um ponto só. `SessionsPage` já consome `SessionSummary`, então o campo chega
  sem mudança de forma.
- **Consulta N+1 já existente, agora sobre mais linhas.**
  `listSessionSummaries` faz uma consulta de entradas por sessão
  (`repos.ts:541-544`). Sem o filtro de academia, o N cresce para o histórico
  inteiro. Segue sendo IndexedDB local com dezenas a centenas de sessões, mas o
  laço agora merece uma medição em vez de uma suposição.
- **A Home passa a derivar tudo de uma lista só.** Hoje `summaries` alimenta o
  resumo semanal e o "Próximo treino"; ambos passam a ser globais, então continua
  sendo uma chamada só. A sessão ativa continua vindo por academia, por outro
  hook.
- **Dois requisitos de spec mudam de escopo, não de detalhe.** "Session History
  Per Gym" tem o escopo no próprio título, e "Feature the Next Training Day" tem
  um cenário dedicado a seguir a academia ativa. Nenhum dos dois pode ser
  reinterpretado — os dois precisam ser reescritos.

## Success Criteria

- [ ] A lista de sessões mostra as sessões de todas as academias, mais recentes
      primeiro, e não muda ao trocar a academia ativa.
- [ ] Cada item da lista mostra de qual academia foi o treino.
- [ ] Sessões de academia excluída aparecem com um rótulo próprio, e não com um
      espaço em branco.
- [ ] O rodapé da lista conta todas as sessões, sem dizer "nesta academia".
- [ ] Treinos feitos em academias diferentes na mesma semana somam na contagem da
      Home e marcam dias distintos na trilha.
- [ ] O "Próximo treino" é calculado a partir do treino mais recente em qualquer
      academia, e não se reinicia ao trocar de academia.
- [ ] O botão Continuar segue por academia: uma sessão em andamento na academia A
      não aparece como retomável estando na B.
- [ ] O cabeçalho da tela de Sessões não tem mais o seletor de academia.
- [ ] `npm run build`, `npm run typecheck` e `npx vitest run` passam.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Sessões órfãs (academia excluída) aparecem quebradas ou derrubam a tela | Med | High | Resolver o nome no repositório com fallback explícito; teste que cria sessão, exclui a academia e verifica que o item renderiza com o rótulo próprio |
| O usuário estranha ver a contagem da semana subir "sozinha" | Med | Low | É a correção pedida, e o nome da academia em cada item explica de onde veio cada treino |
| "Próximo treino" mudar de dia ao migrar, confundindo quem já usava | Low | Med | Comportamento novo declarado no requisito e coberto por cenário; a rotação continua determinística, só deixa de reiniciar por academia |
| O laço N+1 ficar lento com histórico grande | Low | Med | Medir com um histórico sintético grande antes de fechar; se doer, agregar as entradas numa consulta só em vez de uma por sessão |
| Perder o acesso rápido à troca de academia ao tirar o seletor de Sessões | Low | Low | O seletor continua na Home, que é a primeira aba; nada mais na tela de Sessões dependia dele |
| Algum consumidor de `SessionSummary` quebrar com o campo novo | Low | Low | Campo adicional, não substituição; `npx tsc -b --noEmit` cobre os consumidores |

---

## Archive Information

**Archived:** 2026-07-25
**Duration:** mesmo dia (proposta e implementação em 2026-07-25)
**Outcome:** Implemented — arquivado com conferência visual não realizada

### Conferência visual não realizada

As tarefas **3.7** e **4.3** (conferência em navegador) **não foram feitas** — não
há navegador executável no ambiente de implementação, e o arquivamento foi
autorizado sem elas. Ficam registradas aqui como pendência real, não como item
verificado.

O ponto a olhar é a linha secundária do item de sessão quando tudo aparece junto
— "há 2 dias · 24/07 · 52min · Academia com nome comprido" — em viewport estreito
e com `--font-scale` a 200%. Ela quebra em vez de truncar, porque o nome é o
último fragmento e uma reticência comeria justamente ele.

Todo o comportamento está coberto por teste automatizado (13 novos); o que ficou
sem verificação é a aparência.

### Desvio da proposta

Um, registrado em "Decisões" no `tasks.md`: o modo por academia de
`listSessionSummaries` foi **removido** em vez de mantido. A tarefa 1.2 o
preservava alegando que "outros pontos ainda usam", o que a busca desmentiu —
havia dois chamadores, o hook (que passou a ser global) e um teste que afirmava
justamente o recorte sendo substituído.

### Achado fora do escopo

`session.share.integration.test.tsx:115` é instável (1 falha em 6 execuções da
suíte completa; 5 execuções limpas em `main` passaram). Não é regressão desta
mudança: é uma corrida do próprio teste, que clica em "Compartilhar" antes de a
live query de pesos resolver. Correção de uma linha, deixada de fora por ser
alheia ao escopo.

### Files Modified
- `src/db/repos.ts` — `listSessionSummaries` lê todas as academias;
  `SessionSummary` ganha `gymName` resolvido na leitura
- `src/lib/hooks.ts` — `useSessionSummaries()` sem argumento
- `src/features/home/HomePage.tsx` — resumo semanal e "Próximo treino" a partir do
  histórico global; sessão em andamento segue por academia
- `src/features/session/SessionsPage.tsx` — lista global, nome da academia no
  item, rodapé sem recorte, seletor de academia removido
- `src/features/session/session.css` — fragmento da academia e o estado "removida"
- `src/db/repos.test.ts`, `src/features/home/next-workout.integration.test.tsx`,
  `src/features/home/week-across-gyms.integration.test.tsx`,
  `src/features/session/sessions-across-gyms.integration.test.tsx` — 13 testes

### Specs Updated
- `openspec/specs/workout-sessions/spec.md`
  - MODIFIED: "Session History Per Gym" → renomeado para
    "Session History Across Gyms"
- `openspec/specs/home-navigation/spec.md`
  - MODIFIED: "Weekly Training Summary" (escopo global), "Feature the Next
    Training Day" (origem global, sessão em andamento segue por academia)
