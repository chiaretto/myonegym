# Proposal: Histórico de peso num modal, a partir do topo do card

**Change ID:** `collapse-weight-history`
**Created:** 2026-08-31
**Status:** Implementation Complete
**Completed:** 2026-08-31

---

## Problem Statement

O histórico de peso existe e funciona, mas ocupa a tela inteira sem ser pedido.

Hoje ele é uma **seção separada, abaixo** do card "Peso alvo", e está **sempre
aberta**: um cabeçalho "Histórico", um gráfico de linha, e uma linha do tempo com
um item por alteração — valor, variação, data relativa e um botão de excluir. Com
oito ou dez registros, isso é mais alto que todo o resto da aba "Execução"
somada.

O custo cai justamente onde dói mais. Na tela do exercício em sessão, a aba
"Execução" é lida entre séries e já carrega mídia, aquecimento, o card de peso e
as alternativas. O histórico empurra as alternativas para muito abaixo da dobra,
e quem está no meio do treino quer saber **quanto levantar agora** — não a
trajetória dos últimos três meses. Essa trajetória importa, mas é uma pergunta
que se faz de vez em quando, não a cada série.

E ele está no lugar errado: é um fato **sobre o peso alvo**, mas mora fora do
card que mostra o peso alvo, como se fosse outro assunto da tela.

**Afetados:** todo usuário com histórico — ou seja, todo mundo que já salvou um
peso duas vezes. Nas duas telas que usam o editor: o exercício em sessão e o
detalhe do catálogo.

## Proposed Solution

O histórico sai da tela e passa a ser alcançado por um **botão discreto na linha
de topo do card do peso alvo**, alinhado com o rótulo "Peso alvo", que abre um
**modal**.

Discreto de propósito: ele divide a linha com um rótulo sobrescrito e fica acima
da figura do peso, que é onde o olho deve pousar. É uma **saída para o passado**,
não uma segunda coisa a fazer com o peso — não pode competir nem com o número
nem com o botão de editar. O que ele carrega é a **contagem** de registros: é ela
que responde "tem alguma coisa aí?" antes de o modal custar um toque, e é o que
separa um controle mudo de um informativo.

O modal mostra **o que já se mostrava hoje**, sem nada a menos: o gráfico e a
linha do tempo completa, com valor, unidade, variação, data relativa e a ação de
excluir por registro. Rola sozinho quando a lista é mais alta que a tela, e
fecha pelos gestos que já fecham qualquer modal do app. Quando o peso em vigor é
uma **exceção da academia**, o título diz isso — o histórico é daquele escopo.

Um modal em vez de um painel no card porque a linha do tempo é tão longa quanto
o tempo de treino da pessoa, e o card existe para responder "quanto levantar"
num relance. Numa tela só para ela, ela pode ser tão longa quanto quiser.

**Fechado a cada visita**, nunca persistido. **Sem botão quando não há
registro** — e, se o último for excluído de dentro do modal, ele se fecha em vez
de ficar em pé mostrando nada.

O botão **continua disponível durante a edição**. Ele foi escondido ali enquanto
o histórico expandia o card — isso empurrava Cancelar e Salvar de volta para
baixo da dobra, exatamente o que a rolagem ao topo da mudança anterior
(`improve-session-entry-screen`) existe para evitar. Da linha de topo, abrindo um
modal, ele não custa altura nenhuma ao formulário; e conferir quanto se levantou
da última vez é justamente o que se quer ao decidir o novo número.

**Nada muda nos dados.** Registros, escopos, exclusão e a regra de que o
histórico segue o escopo salvo continuam exatamente como estão.

## Scope

### In Scope
- Botão "Histórico" discreto na linha de topo do card, alinhado com "Peso alvo", com a contagem
- O histórico exibido num modal, com o conteúdo de hoje intacto
- Qualificador de escopo no título do modal quando o peso é exceção
- Fechado a cada visita; sem botão quando não há registro
- Modal se fecha ao excluir o último registro
- Disponível também durante a edição do peso — da linha de topo, não custa altura ao formulário

### Out of Scope
- Qualquer mudança em **dados**: gravação, escopo, exclusão, migração
- Mudar o conteúdo do histórico aberto — gráfico e linha do tempo seguem iguais
- **Lembrar** o estado aberto/fechado entre visitas ou entre exercícios
- Abrir sozinho depois de salvar um peso novo
- Paginar ou limitar o número de registros exibidos quando aberto
- Colapsar qualquer outra seção do app

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nenhum registro, índice ou migração é tocado |
| API | No | `useHistory` e `deleteHistoryEntry` inalterados |
| State | No | Um booleano local no `WeightEditor`, ao lado do `editing` que já existe |
| UI | Yes | `WeightEditor` (reusa o `ui/Sheet`) e `exercise.css` |

## Architecture Considerations

- **O editor é compartilhado** pelo detalhe do catálogo e pelo exercício em
  sessão. A mudança vale nas duas de uma vez, o que é o certo: o problema é do
  editor, não de uma tela.
- **`ui/Sheet` é reusado**, não reinventado: ele já traz o X, o fechar por fundo
  e por Escape, e `max-height: 88vh` com rolagem — que é exatamente o que uma
  linha do tempo longa precisa.
- **Confirmar uma exclusão abre um modal sobre outro.** O `useConfirm` renderiza
  seu próprio `Sheet`, e ele é irmão posterior no DOM, então pinta por cima no
  mesmo `z-index`. Coberto por teste.
- **Somente-leitura não muda nada.** Numa sessão concluída o editor já é
  read-only e o histórico já é exibido; ele passa a ser exibido colapsado, e a
  ação de excluir continua ausente ali como hoje.
- **O card não muda de altura ao abrir o histórico**, já que o conteúdo vai para
  um modal. Some com a preocupação de que a revelação disparasse a rolagem ao
  topo que a mudança anterior introduziu — ainda assim coberto por teste.
- **Um comentário vizinho fica desatualizado.** `AlternativesSection.tsx`
  justifica seu `<h3>` dizendo que ele combina com "a seção 'Histórico' ao lado,
  que o `.section-head` estiliza". Movendo o histórico para dentro do card, essa
  vizinhança deixa de existir e o comentário passa a apontar para nada.
- **O escopo pode mudar com o histórico aberto**: trocar de academia, ou salvar
  uma exceção, troca o conjunto de registros exibido. O conteúdo se atualiza
  sozinho (é uma consulta viva); o estado aberto/fechado não precisa reagir.

## Success Criteria

- [ ] O card mostra um botão "Histórico" discreto na linha de topo, alinhado com "Peso alvo", com a contagem
- [ ] Tocar nele abre um modal com o gráfico e a linha do tempo completa
- [ ] Fechar devolve a tela, sem resíduo do histórico
- [ ] Sai da tela e volta: fechado outra vez
- [ ] Sem nenhum registro, não há botão
- [ ] Em edição o botão continua ali, e fechar o modal devolve o formulário como estava
- [ ] Excluir um registro de dentro do modal continua funcionando como hoje
- [ ] Excluir o último fecha o modal e some com o botão
- [ ] Numa exceção, o título do modal diz que o histórico é daquela academia
- [ ] `npm test` e `npm run typecheck` limpos

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Histórico "some" para quem já o usava aberto | Média | Baixo | A contagem no botão diz que ele está ali e quanto tem; um toque o traz de volta |
| Excluir um registro fica um toque mais longe | Alta | Baixo | É uma ação destrutiva e rara; ficar atrás de um modal é a direção certa |
| A confirmação de exclusão fica presa atrás do modal do histórico | Média | Médio | O `Sheet` do `useConfirm` é irmão posterior no DOM e pinta por cima; coberto por teste |
| Testes existentes assumem a linha do tempo visível de saída | Baixa | Baixo | Verificado antes de propor, e **o levantamento estava incompleto**: nenhum teste toca a linha do tempo (`.tl-*`), mas `weight-scope` afirmava sobre o *cabeçalho* (`.history .section-head`). Um teste atualizado na implementação |
| Na linha de topo o botão disputa espaço com o chip da academia numa exceção | Média | Médio | Os dois convivem num grupo à direita; conferir em 390px e em 200% de escala com um nome de academia longo |
| Discreto demais para ser percebido como controle | Média | Baixo | Ícone + rótulo + contagem em destaque, e alvo de toque ampliado por padding que não engorda a linha |

---

## Archive Information

**Archived:** 2026-08-31
**Duration:** mesmo dia (proposta, implementação e arquivamento)
**Outcome:** Successfully implemented

### O desenho mudou três vezes

A spec registra só o destino; o caminho importa para quem for mexer aqui depois:

1. **Revelação colapsada dentro do card** — uma linha "Histórico" com contagem,
   abrindo gráfico e linha do tempo no próprio card. Rejeitado pelo autor.
2. **Botão acima do "Editar", abrindo um modal** — os dois lidos como uma coluna
   de ações. O modal ficou; a posição, não.
3. **Botão discreto na linha de topo**, alinhado com o rótulo "Peso alvo" — no
   registro visual do rótulo sobrescrito, não do botão, porque é uma saída para
   o passado e não uma segunda ação sobre o peso.

A terceira volta **desfez** uma regra das duas primeiras: o botão era escondido
durante a edição porque o conteúdo expandia o card e empurrava Cancelar/Salvar
para fora da dobra. Da linha de topo, abrindo um modal, ele não custa altura
nenhuma ao formulário — e conferir quanto se levantou da última vez é justamente
o que se quer ao decidir o novo número. Quem for reintroduzir a regra: ela só
fazia sentido no primeiro desenho.

### Correção a um levantamento da proposta

A proposta afirmava que **nenhum** teste de UI dependia da estrutura do
histórico. Estava incompleto: o levantamento olhou a *linha do tempo* (`.tl-*`),
não o *cabeçalho*, e `weight-scope.integration.test.tsx` afirmava sobre
`.history .section-head`. Ele quebrou exatamente onde a proposta dizia que não
quebraria, e foi atualizado para procurar o escopo no título do modal.

### Duas corridas de teste, corrigidas

Tanto o botão de histórico quanto o rótulo "Editar" só existem depois de uma
cadeia Dexie → `resolveWeight` → `useHistory`. O `findBy` padrão de 1 s perde
essa corrida quando a máquina está carregada; as esperas passaram a ter 3 s, que
é o tempo que a cadeia leva.

### Files Modified
- `src/features/exercise/WeightEditor.tsx` — botão na linha de topo, histórico num `ui/Sheet`
- `src/features/exercise/exercise.css` — `.wc-head-right`, `.wc-history-btn`, `.wc-history-count`
- `src/features/exercise/AlternativesSection.tsx` — comentário corrigido (a vizinhança que citava deixou de existir)
- `src/features/exercise/weight-history-modal.integration.test.tsx` — 10 testes (novo)
- `src/features/exercise/weight-edit-scroll.integration.test.tsx` — +1 teste
- `src/features/exercise/weight-scope.integration.test.tsx` — asserção de escopo atualizada

**Nenhum arquivo em `src/db/`**: a mudança é sobre onde e quando o histórico
aparece, não sobre o que ele é.

### Specs Updated
- `openspec/specs/weights/spec.md` — +1 requisito (*Weight History Opens in a
  Modal*, 13 cenários), ~2 modificados (*Weight Change History Follows the
  Scope*, *Delete a History Entry*)

### Verificação
- `npm test` — 80 arquivos, 999 testes passando, 2 pulados
- `npm run typecheck` — limpo
- `npx openspec validate --specs --strict` — 16/16
- Conferência visual (4.11, 4.12) — feita pelo autor no navegador
