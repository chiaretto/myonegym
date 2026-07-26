# Proposal: Tela de Consistência de Treinos (proposta C)

**Change ID:** `add-consistency-screen`
**Created:** 2026-07-26
**Status:** Implementation Complete
**Completed:** 2026-07-26
**Design reference:** `new-design/consistency-calendar.html` (proposta C) +
`new-design/css/consistency.css` — incluídos neste change.

---

## Problem Statement

O app coleta um histórico rico de sessões concluídas, mas só o mostra de duas
formas: a trilha da semana corrente na Home e uma lista plana em `/sessions`.
Nenhuma delas responde a pergunta que sustenta o hábito: **"eu tenho sido
constante?"** — não há visão mensal, nem sequências (dias/semanas), nem
tendência de longo prazo. O usuário que quer se motivar olhando o próprio
histórico não tem onde olhar.

A tela de Sessões atual, depois do change `sessions-across-gyms`, já é uma
lista global — mas é *só* uma lista: rolagem infinita por mês, sem nenhum
número agregado.

## Proposed Solution

Substituir o conteúdo da tela `/sessions` pela **tela de Consistência**
(proposta C do design), mantendo a rota e o ícone e renomeando a aba do meio
para **"Consistência"**. A tela compõe, de cima para baixo:

1. **Cards de estatística** (3, mesma linha): **Dias em sequência** (com a
   chama, em destaque), **Semanas em sequência** e **Treinos no mês exibido**.
2. **Calendário mensal** navegável (‹ mês ›): disco vermelho = treinou, badge
   de canto = 2+ sessões no dia, anel = hoje, número apagado = dia passado sem
   treino. Sem estados punitivos (sem X).
3. **Lista dos treinos do mês exibido** — os mesmos cards de sessão de hoje
   (academia em cada card), mostrando os **3 mais recentes** com um link
   discreto **"Ver mais N treinos"** que expande o restante.
4. **Últimas 12 semanas** — 12 blocos, um por semana, com a contagem dentro e
   intensidade de vermelho proporcional.
5. **Últimos 12 meses** — gráfico de barras com a contagem sobre cada barra;
   o mês corrente em tom médio ("em andamento").

Tudo é **derivado** de `Session.completedAt` (já indexado — `src/db/db.ts:41`)
e dos helpers de semana existentes (`src/lib/week.ts`). Nenhum schema novo,
nenhuma migração.

## Scope

### In Scope
- Novo helper de agregação (`src/lib/consistency.ts`): mapa dia→contagem do
  mês, totais por semana (12) e por mês (12), sequência de dias e de semanas.
- `ConsistencyPage` substituindo o conteúdo de `SessionsPage` na rota
  `/sessions`; aba renomeada para "Consistência" (mesmo ícone `pi-history`).
- Lista mensal com "Ver mais" (estado de tela; recolhe ao trocar de mês).
- CSS portado de `new-design/css/consistency.css` para
  `src/features/consistency/consistency.css`.
- Estados de carregamento/vazio obedecendo "Estados Vazios Só Depois da
  Resposta" (app-foundation).

### Out of Scope
- Qualquer mudança na Home — o card da semana fica **intocado** (visual, dado
  e comportamento).
- Tocar um dia do calendário para rolar/filtrar a lista (iteração futura).
- Metas configuráveis por semana.
- Estados punitivos (X, aviso de falta) — decisão de design registrada.
- Mudanças no detalhe de sessão (`/session/:id`), compartilhar e excluir —
  continuam como estão.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Leitura agregada de `sessions` via índice `completedAt` existente |
| State | No | Sem estado persistido novo; mês exibido e "Ver mais" são estado de tela |
| Lib | Yes | Novo `src/lib/consistency.ts` (+ possível generalização do streak diário de `week.ts`) |
| UI | Yes | `ConsistencyPage` substitui o conteúdo de `SessionsPage`; rótulo da aba em `src/ui/Chrome.tsx`; novo `consistency.css` |
| Routing | No | Rota `/sessions` mantida; nenhum redirect necessário |
| Specs | Yes | Nova capability `consistency`; delta em `workout-sessions` (a listagem do histórico passa a ser mensal, dentro desta tela) |

## Architecture Considerations

- **Escopo global:** herda a decisão de `sessions-across-gyms` — todos os
  agregados somam **todas as academias**, sessões de academia excluída contam,
  e a tela **não** tem seletor de academia.
- **Régua da sequência:** a sequência que a tela "protege" é **semanal**
  (semanas consecutivas com ≥1 sessão; a semana corrente conta se já tem
  sessão e não quebra enquanto não termina). Os **dias em sequência** aparecem
  como termômetro imediato — mesmo número do pill da chama na Home.
- **Semana segunda-first:** reutiliza `startOfWeek` / `WEEKDAY_LABELS` de
  `src/lib/week.ts`, fonte única da definição de semana.
- **Um mês, um estado:** calendário, card "Treinos no mês" e lista mensal
  derivam do mesmo mês exibido e mudam juntos na navegação.
- **CSS:** as classes de `new-design/css/consistency.css` já seguem a
  identidade OneGym Red aplicada; o arquivo entra como folha da feature, como
  as demais (`home.css`, `session.css`).

## Success Criteria

- [x] A aba do meio exibe "Consistência" e abre a tela nova em `/sessions`.
- [x] Cards de dias/semanas/mês corretos para o histórico de exemplo (dados de
      `data-portability`), cobertos por testes de unidade do helper.
- [x] Calendário marca done/2+/hoje/passado/futuro corretamente, navega até o
      primeiro mês com sessão e desabilita "próximo" no mês corrente.
- [x] Lista mensal mostra 3 + "Ver mais N treinos"; expande, vira "Ver menos"
      e recolhe ao trocar de mês; cada card abre `/session/:id`.
- [x] 12 semanas e 12 meses batem com o calendário (mesma fonte de agregação).
- [x] Nenhum flash de zero durante o carregamento (padrão app-foundation).
- [x] `npm test`, `npm run typecheck` e `npm run build` passam.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Fuso/horário de verão distorcem "dia" e "semana" nos agregados | Med | Med | Derivar tudo de `startOfWeek`/datas locais já testadas em `week.ts`; testes com bordas de mês e de semana |
| Perda da visão "histórico completo" (lista era infinita, vira mensal) | Med | Low | O calendário + "‹ mês" cobrem o acesso; "Ver mais" expõe o mês inteiro; detalhe de sessão intacto |
| Tela longa (5 blocos) em aparelhos pequenos | Low | Low | Lista recolhida em 3 itens por padrão; blocos de relance ficam abaixo |
| Usuários procurando "Sessões" não acham a aba | Low | Low | Mesmo ícone e mesma posição na tab bar; o conteúdo antigo (lista) continua dentro da tela |

---

## Archive Information

**Archived:** 2026-07-26
**Duration:** mesmo dia (proposta e implementação em 2026-07-26)
**Outcome:** Successfully implemented

### Files Modified
- `src/lib/consistency.ts` (+ `consistency.test.ts`) — agregações derivadas
- `src/features/consistency/ConsistencyPage.tsx`, `consistency.css`,
  `consistency.integration.test.tsx` — a tela nova
- `src/App.tsx`, `src/ui/Chrome.tsx` — rota `/sessions` e aba "Consistência"
- `src/features/session/SessionsPage.tsx` — removida (substituída)
- `src/features/session/SessionPage.tsx`, `src/features/home/HomePage.tsx`,
  `src/styles/global.css` — chevron de navegação icon-only (`.row-chev`)
- `new-design/consistency-calendar.html`, `new-design/css/consistency.css` —
  proposta de design (proposta C)
- `README.md` — seção "How it works"

### Specs Updated
- `openspec/specs/consistency/spec.md` — nova capability
- `openspec/specs/workout-sessions/spec.md` — Run a Session (chevron) e
  Session History Across Gyms (lista mensal com "Ver mais" na Consistência)
- `openspec/specs/home-navigation/spec.md` — Home Accordion (chevron nas
  linhas de exercício)
