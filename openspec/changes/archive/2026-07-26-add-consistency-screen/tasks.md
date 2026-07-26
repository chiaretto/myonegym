# Implementation Tasks: Tela de Consistência de Treinos

**Change ID:** `add-consistency-screen`

---

## Phase 1: Foundation (agregação)

- [x] 1.1 Criar `src/lib/consistency.ts`: agregar sessões concluídas (todas as
      academias) em — mapa `dia → contagem` de um mês; totais das últimas 12
      semanas (terminando na semana corrente, seg-first via `startOfWeek`);
      totais dos últimos 12 meses; **dias em sequência** (terminando hoje ou
      ontem); **semanas em sequência** (semana corrente conta se tem sessão e
      não quebra enquanto não termina)
- [x] 1.2 Expor limites de navegação do calendário: primeiro mês com sessão
      (piso do "‹") e mês corrente (teto do "›")
- [x] 1.3 Testes de unidade: bordas de semana/mês, mês sem sessão, 2+ sessões
      no mesmo dia, sessão de academia excluída conta, histórico vazio

**Quality Gate:**
- [x] `npm run typecheck` passa
- [x] `npm test src/lib/consistency.test.ts` passa

---

## Phase 2: Dados na tela (queries e estado de tela)

- [x] 2.1 Query viva das sessões concluídas (Dexie `completedAt`), sem filtro
      de academia, com resolução do nome da academia por card (inclusive
      "academia removida", como a lista atual)
- [x] 2.2 Estado de tela: mês exibido (default: corrente) e expansão da lista
      ("Ver mais"/"Ver menos", recolhe ao trocar de mês)
- [x] 2.3 Testes: navegação de mês muda calendário + card do mês + lista
      juntos; expansão reseta na troca

**Quality Gate:**
- [x] Transições de estado testadas

---

## Phase 3: Interface

- [x] 3.1 Portar `new-design/css/consistency.css` para
      `src/features/consistency/consistency.css`
- [x] 3.2 `ConsistencyPage`: cards de estatística (Dias em sequência com
      chama/destaque, Semanas em sequência, Treinos no mês exibido)
- [x] 3.3 Calendário mensal: grade seg-first, estados done / 2+ (badge) /
      hoje (anel) / passado (número apagado) / futuro (mais apagado) /
      fora-do-mês (oculto); navegação ‹ › com limites da task 1.2
- [x] 3.4 Lista do mês: reutilizar o card de sessão existente (academia no
      subtítulo); 3 mais recentes + link "Ver mais N treinos" / "Ver menos";
      card abre `/session/:id`
- [x] 3.5 Blocos "Últimas 12 semanas" (contagem dentro, níveis 0 / 1–2 / 3+,
      rótulos de mês, legenda menos→mais) e "Últimos 12 meses" (barras em px
      proporcionais ao máximo, contagem sobre cada barra, mês corrente em tom
      médio, rótulos alternados)
- [x] 3.6 Trocar o conteúdo da rota `/sessions` para `ConsistencyPage` e o
      rótulo da aba para "Consistência" (`src/ui/Chrome.tsx`); remover a
      `SessionsPage` antiga e seus estilos exclusivos
- [x] 3.7 Estados de carregamento e vazio: nada de zeros antes da resposta do
      banco (padrão app-foundation); vazio convida ao primeiro treino
- [x] 3.8 Testes de componente/integração: render da tela, estados do
      calendário, expansão da lista, navegação para o detalhe, aba ativa

**Quality Gate:**
- [x] Testes de componente passam
- [x] Sem regressão nos testes existentes de sessão (detalhe/compartilhar
      intactos)

---

## Phase 4: Integração e polimento

- [x] 4.1 Acessibilidade: `aria-label` na grade do calendário, nos blocos de
      semana e no gráfico de meses; botões de navegação nomeados
- [x] 4.2 Verificar a tela a 100% e 150% de `--font-scale` (3 cards, grade
      do calendário, barras)
      - **Nota:** checagem visual feita fora deste ambiente (sem browser aqui);
        fechada no archive, a pedido, com o CSS todo em `em`/tokens portado do
        mockup validado.
- [x] 4.3 Atualizar README (seção "How it works": Sessões → Consistência)
- [x] 4.4 Suíte completa: `npm test`, `npm run typecheck`, `npm run build`

**Quality Gate:**
- [x] Todos os testes passam
- [x] Build limpo

---

## Completion Checklist

- [x] Todas as fases completas
- [x] Quality gates verdes
- [x] README sincronizado
- [x] Pronto para `/openspec-archive`
