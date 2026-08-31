# Implementation Tasks: Histórico de peso num modal, a partir do topo do card

**Change ID:** `collapse-weight-history`

---

## Phase 1: Foundation (Data Layer)

Nada a fazer. Esta mudança é sobre **quando** o histórico aparece, não sobre o
que ele é: registros, escopos, consulta viva e exclusão ficam idênticos.

- [x] 1.1 Confirmar que nenhum arquivo em `src/db/` muda, e que `useHistory` e `deleteHistoryEntry` são usados como já são
- [x] 1.2 **Correção ao levantamento da proposta:** havia sim um teste de UI dependente da estrutura do histórico — `weight-scope.integration.test.tsx` afirmava `.history .section-head` conter "nesta academia". O levantamento da proposta olhou a *linha do tempo* (`.tl-*`), não o *cabeçalho*. Atualizado para procurar o qualificador na linha recolhida, que é onde o escopo passa a ser lido

**Quality Gate:** PASSED
- [x] Nenhum arquivo em `src/db/` alterado

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 Um `historyOpen` booleano no `WeightEditor`, ao lado do `editing` que já existe
- [x] 2.2 Começar **sempre fechado**: nada é persistido, e revisitar a tela recomeça fechado
- [x] 2.3 Não reagir à troca de escopo — a consulta é viva e o conteúdo se atualiza sozinho; o aberto/fechado é do usuário
- [x] 2.4 Amarrar a abertura do modal a `history.length > 0`, para que excluir o último registro o feche sem precisar de efeito

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo

---

## Phase 3: User Interface

> **Revisado duas vezes durante a implementação, a pedido do autor.** Nasceu
> como uma revelação colapsada dentro do card; virou um botão acima do "Editar"
> abrindo um **modal**; e o botão terminou **discreto, na linha de topo do
> card**, alinhado com o rótulo "Peso alvo". A última revisão desfez a regra de
> esconder durante a edição, que só existia porque o conteúdo expandia o card.

- [x] 3.1 Mover o gráfico e a linha do tempo para dentro de um `ui/Sheet` — reusado, não reinventado: ele já traz o X, o fechar por fundo e por Escape, e `max-height: 88vh` com rolagem, que é o que uma linha do tempo longa precisa
- [x] 3.2 Botão de abrir na **linha de topo do card**, ao lado do rótulo "Peso alvo", agrupado à direita com o chip da academia (que só aparece em exceção)
- [x] 3.3 Registro visual **discreto**: tamanho e cor do rótulo sobrescrito, não do botão — é uma saída para o passado, não uma segunda ação sobre o peso, e não pode competir com a figura nem com o "Editar"
- [x] 3.4 Alvo de toque confortável apesar do texto pequeno: padding ampliado com margem negativa, para não engordar a linha
- [x] 3.5 **Contagem** de registros no botão, em destaque e com figuras tabulares — é ela que responde "tem alguma coisa aí?" antes de o modal custar um toque
- [x] 3.6 Qualificador de escopo no **título do modal** quando o peso é exceção; no escopo global não há o que qualificar
- [x] 3.7 Manter a ausência total do botão quando não há nenhum registro
- [x] 3.8 Fechar o modal sozinho ao excluir o **último** registro — a condição de render cobre isso, em vez de um efeito
- [x] 3.9 **Disponível também durante a edição** (revisão final): da linha de topo, abrindo um modal, não custa altura ao formulário, então Cancelar/Salvar seguem à vista
- [x] 3.10 Corrigir o comentário de `AlternativesSection.tsx`, que justifica seu `<h3>` pela vizinhança com a seção "Histórico" — vizinhança que deixa de existir
- [x] 3.11 Conferir o modo somente-leitura (sessão concluída): o modal abre e a ação de excluir segue ausente como hoje

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes de componente passam

---

## Phase 4: Integration & Polish

- [x] 4.1 Rótulos em pt-BR junto do resto — não há arquivo de i18n a sincronizar
- [x] 4.2 Teste: o card mostra o botão com a contagem na linha de topo e **nada** do histórico (10 testes novos em `weight-history-modal.integration.test.tsx`)
- [x] 4.3 Teste: tocar abre o modal com gráfico e registros; fechar não deixa resíduo
- [x] 4.4 Teste: o modal se fecha sozinho ao excluir o último registro, e o botão some com ele
- [x] 4.5 Teste: sem nenhum registro, não há botão
- [x] 4.6 Teste: em edição o botão continua ali; abrir e fechar o modal devolve o formulário como estava
- [x] 4.7 Teste: excluir um registro de dentro do modal continua funcionando — a confirmação é um `Sheet` empilhado sobre o outro, e funciona
- [x] 4.8 Teste: numa exceção o **título do modal** diz que o histórico é daquela academia; no global, não nomeia academia
- [x] 4.9 Teste: sair da tela e voltar recomeça fechado
- [x] 4.10 Conferir que abrir o histórico **não** dispara a rolagem do card ao topo — teste em `weight-edit-scroll.integration.test.tsx`, com espião no `scrollIntoView`. Com o conteúdo num modal o card nem muda de altura, mas o teste fica: a garantia é sobre o gatilho, não sobre a altura
- [x] 4.11 Verificação visual em 390px, escalas 100% e 200%, incluindo a convivência do botão com o chip da academia numa exceção ✓ conferido pelo autor no navegador
- [x] 4.12 Verificar no app rodando, nas duas telas que usam o editor: exercício em sessão e detalhe do catálogo ✓ conferido pelo autor no navegador

**Quality Gate:** PASSED
- [x] `npm test` verde
- [x] `npm run typecheck` limpo
- [x] `npx openspec validate --specs --strict` limpo
- [x] Documentação sincronizada

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
