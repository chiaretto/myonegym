# Implementation Tasks: Tela do exercício em sessão

**Change ID:** `improve-session-entry-screen`

---

## Phase 1: Foundation (Data Layer)

Nada a fazer. A mudança é inteiramente de apresentação: `done` já é alternável
por `setEntryDone(id, boolean, db)`, e a lista de entradas já chega em
`SessionEntryPage` por `useSessionEntries` (é ela que move o stepper hoje).

- [x] 1.1 Confirmar que `setEntryDone(eId, false, db)` desmarca e que o runner reflete — sem migração nem campo novo

**Quality Gate:** PASSED
- [x] Nenhum arquivo em `src/db/` alterado

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 Em `SessionEntryPage`, separar a ação em duas: marcar (marca **e** avança, mantendo o convite "Concluir treino?" na última pendente) e desmarcar (`setEntryDone(eId, false)`, **sem** navegar)
- [x] 2.2 Derivar o progresso a partir de `entries`: índice da entrada atual, quais estão `done`, total. Nada de estado novo
- [x] 2.3 Não exibir a barra segmentada com `entries.length <= 1` — mesma condição que já governa as setas

**Quality Gate:** PASSED
- [x] Código de análise limpo (`npx tsc --noEmit`)
- [x] Marcar → avança; desmarcar → permanece; ambos persistem

---

## Phase 3: User Interface

### 3a. Barra de progresso segmentada

- [x] 3.1 Renderizar a barra na **barra flutuante inferior, abaixo dos controles** (prop `progress` do `StepperBar`) — revisado duas vezes a pedido do usuário: era primeiro elemento de `<main>`, depois grudada acima da barra de título, e agora desce para o bloco que já é fixo
- [x] 3.1b Remover o distintivo "Concluído" acima das abas — a barra flutuante já diz o mesmo três vezes (pedido do usuário)
- [x] 3.2 Um segmento por entrada, na ordem de `entries`, com classes para **concluído**, **atual** e **pendente**; segmentos `aria-hidden`, rótulo acessível no contêiner ("Exercício 2 de 5, 1 concluído")
- [x] 3.3 Sem `<button>`, sem `onClick`, sem `<Link>`: é indicador
- [x] 3.4 CSS em `session.css`: faixa de segmentos com gaps, altura em `px`, cantos `--r-pill` nas pontas; concluído em `--accent-grad`, atual destacado (borda/tinta de destaque), pendente em `--surface-3`
- [x] 3.5 Verificar em 12+ exercícios que os segmentos encolhem sem sumir nem quebrar linha

### 3b. StepperBar em linha única

- [x] 3.6 Reescrever o layout de `ui/StepperBar.tsx` para uma linha: chevron anterior, `action` ao centro, chevron seguinte
- [x] 3.7 Chevrons sem rótulo visível, preservando `aria-label` "Exercício anterior" / "Próximo exercício"
- [x] 3.8 CSS: `.entry-nav-row` vira linha única; chevrons de largura fixa, ação com `flex: 1`
- [x] 3.9 Conferir `ExerciseDetailPage` (usa `StepperBar` **sem** `action`): os dois chevrons dividem a linha e continuam legíveis
- [x] 3.10 Conferir os dois casos sem setas: prévia de alternativa e cardio (uma entrada) — a ação ocupa a linha inteira

### 3c. Concluir como alternador

- [x] 3.11 Botão central com `aria-pressed={entry.done}`, aparência de checkbox (quadro vazio / preenchido com o check), nomes "Concluir" e "Concluído"
- [x] 3.12 Estado somente-leitura (sessão concluída) segue como texto estático `.entry-done-state` no slot central, agora entre os dois chevrons
- [x] 3.13 Manter `.btn.done` (tinta calma) para o estado marcado

### 3d. Peso: subir o cartão ao editar

- [x] 3.14 Em `WeightEditor`, `ref` no `<section className="weight-card">` e efeito que, ao entrar em edição, rola o cartão para o topo possível
- [x] 3.15 `scroll-margin-top` no `.weight-card` compensando a barra de título grudada, via `--appbar-h` (global.css)
- [x] 3.16 Resolvido por `scrollIntoView`, que sobe a cadeia de ancestrais roláveis sozinho — sem palpite sobre qual elemento rola
- [x] 3.17 Ordenar com o `autoFocus` do input: rolar **depois** do foco, para o foco não desfazer a rolagem
- [x] 3.18 Garantir Cancelar/Salvar visíveis mesmo quando a extensão de rolagem não alcança o topo (cartão no fim da página)

### 3e. Appbar rente

- [x] 3.19 `.appbar` em `styles/global.css`: `padding-bottom: 0`, sem `border-bottom`
- [x] 3.20 Revisar Home, Consistência, Configurações, detalhe do catálogo e páginas de criar/editar — nenhuma pode ficar com o título encostado no conteúdo ✓ conferido pelo autor no navegador

### 3f. Diálogo do treino já em andamento (pedido do usuário)

- [x] 3.21 `useChoice` em `ui/Feedback` — modal de N opções que resolve o id escolhido, ou `null` ao ser dispensado; irmão do `useConfirm`
- [x] 3.22 `.choice-actions` / `.choice-hint` em `global.css` (botões empilhados: os rótulos nomeiam a consequência e não cabem lado a lado)
- [x] 3.23 `HomePage.onStart`: trocar o toast pelo diálogo com concluir / voltar / descartar; ler as entradas no clique (sem hook novo, para não pegar cache de outra sessão)
- [x] 3.24 Desabilitar "Concluir e iniciar" sem nenhum exercício marcado, com a razão à vista — o mesmo piso do runner
- [x] 3.25 `CardioPage.onStart`: o mesmo diálogo, para as duas telas não divergirem
- [x] 3.26 Fechar (X, fundo, Escape) MUST não fazer nada

**Quality Gate:** PASSED
- [x] `npx tsc --noEmit` limpo
- [x] Testes de componente passam

---

## Phase 4: Integration & Polish

- [x] 4.1 Sem i18n a acrescentar além dos rótulos já citados ("Concluir"/"Concluído" seguem)
- [x] 4.2 Estender `stepper-bar.integration.test.tsx`: a barra tem uma linha só; marcar avança; voltar e tocar de novo desmarca sem navegar; setas seguem acessíveis por nome
- [x] 4.3 Teste da barra segmentada: contagem de segmentos = nº de entradas; estados concluído/atual/pendente; posição na barra flutuante; sobrevive à troca de aba; ausente com uma entrada só (cardio)
- [x] 4.3b Atualizar os testes que exigiam o distintivo "Concluído" (`detail-header`, `detail-tabs-layout`, `alternatives`, `session.integration`)
- [x] 4.3c Testes do diálogo: as três saídas, o X que não faz nada, concluir desabilitado sem nada marcado, e o mesmo diálogo na aba Cardio (`home.integration`, `cardio.integration`)
- [x] 4.4 Teste do editor de peso: entrar em edição chama a rolagem no cartão (mockar `scrollIntoView`, que jsdom não implementa) e Cancelar/Salvar estão no documento
- [x] 4.5 Rodar a suíte inteira e conferir que nada dependia do rótulo "Voltar"/"Avançar" visível
- [x] 4.6 Verificação visual em 390px, nas escalas de fonte 100% e 200%: a linha do stepper não quebra e a barra segmentada não colide com o título ✓ conferido pelo autor no navegador
- [x] 4.7 Verificar no app rodando: sessão de força com 5+ exercícios, sessão de cardio, sessão concluída (somente-leitura), prévia de alternativa e o diálogo de treino em andamento ✓ conferido pelo autor no navegador

**Quality Gate:** PASSED
- [x] `npm test` verde
- [x] `npx tsc --noEmit` limpo
- [x] `npx openspec validate --specs --strict` limpo
- [x] Documentação sincronizada

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
