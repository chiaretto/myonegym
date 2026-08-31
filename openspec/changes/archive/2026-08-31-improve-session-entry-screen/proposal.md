# Proposal: Tela do exercício em sessão — progresso, stepper unificado e edição de peso

**Change ID:** `improve-session-entry-screen`
**Created:** 2026-08-31
**Status:** Implementation Complete
**Completed:** 2026-08-31

---

## Problem Statement

`/session/:id/entry/:entryId` é a tela onde o usuário passa o treino inteiro —
uma entrada de cada vez, com o celular na mão, entre séries. Quatro coisas
atrapalham ali:

1. **Não dá para saber onde se está no dia.** O runner (`/session/:id`) tem a
   barra de progresso e a lista; a tela da entrada não tem nada. Quem entra pelo
   primeiro exercício e vai avançando perde a noção de quantos faltam, e a única
   forma de recuperá-la é voltar ao runner.

2. **A barra fixa gasta duas linhas para três controles.** Hoje são
   `Concluído` numa linha e `Voltar` / `Avançar` na outra, empilhadas porque os
   três rótulos não cabiam lado a lado. Duas linhas de chrome fixo comem altura
   justamente na tela mais rolada do app, e os rótulos "Voltar"/"Avançar" não
   dizem nada que um chevron já não diga.

3. **Concluir é irreversível de dentro da tela.** O botão marca a entrada como
   feita e avança. Se o toque foi sem querer — o polegar encosta ao pegar o
   celular do banco — o usuário chega no próximo exercício com o anterior
   marcado e nenhum controle ali que desfaça. É preciso voltar ao runner e
   desmarcar na lista.

4. **Editar o peso joga os botões para fora da tela.** O cartão "Peso alvo" fica
   embaixo da mídia e do aquecimento; ao entrar em edição ele cresce (stepper,
   unidades, "Só nessa academia", Cancelar/Salvar) e as ações caem abaixo da
   dobra, atrás da barra fixa. O usuário digita o peso e não vê onde salvar.

Some-se a isso o `border-bottom` e o `padding-bottom` da appbar, que desenham uma
segunda linha divisória logo acima de um conteúdo que já começa com respiro
próprio.

**Afetados:** todo usuário durante um treino — é a tela de maior tempo de uso do
app.

## Proposed Solution

### 1. Barra de progresso segmentada no topo

Um segmento por exercício do dia, na ordem da sessão, dentro da **barra
flutuante inferior, abaixo das setas e do Concluir**. Aquele bloco já é fixo e já
é para onde o polegar volta entre as séries, então o progresso viaja junto dos
controles que andam por ele em vez de abrir uma segunda faixa de chrome no topo.
Os controles ficam com a borda mais próxima do polegar; o progresso lê como a
legenda do que acabaram de fazer. Três estados: **concluído** (preenchido no destaque), **atual** (a entrada
sendo vista) e **pendente**. Indicador puro — não é tocável: durante o treino o
polegar já mora nessa faixa da tela e um alvo de toque a mais ali só produz
navegação acidental. Quem quer pular para outro exercício tem as setas e o
runner a um toque.

Some com uma entrada só (cardio): um único segmento de largura total não informa
nada — mesma regra que já esconde Voltar/Avançar nesse caso.

### 2. Uma linha só: `[ < ] [ ✓ Concluir ] [ > ]`

`StepperBar` passa a dispor os três controles numa linha: chevron anterior,
ação ao centro (ocupando o espaço restante) e chevron seguinte. Os chevrons
perdem o rótulo visível e mantêm os nomes acessíveis atuais ("Exercício
anterior" / "Próximo exercício") — a mudança é de pixels, não de semântica.
Com os rótulos fora, a ação central ganha mais largura do que tinha na linha
dupla, então "Concluído" continua cabendo em 200% de escala.

### 3. Concluir vira um alternador

O botão central ganha a aparência de checkbox e o `aria-pressed` que o checkbox
do runner já usa — os dois passam a ser o mesmo controle em dois lugares.
O comportamento de um toque no treino é preservado: **marcar avança** para o
próximo exercício (e, na última pendente, continua oferecendo encerrar o
treino). **Desmarcar não avança** — ele desfaz e fica onde está, que é o que
"desfazer" quer dizer. Voltar para uma entrada já concluída e tocar de novo
agora a desmarca, sem passar pelo runner.

### 4. Editar o peso sobe o cartão

Ao entrar em edição, o `.weight-card` é rolado para o mais próximo do topo que a
tela permitir, com folga para a appbar grudada, deixando Cancelar/Salvar
visíveis sem rolagem adicional. Vale nas duas telas que usam o editor (catálogo
e sessão), porque o problema é do editor, não da sessão.

### 5. O treino já aberto vira uma pergunta, não um aviso

Tocar "Iniciar" em outro dia com um treino em andamento respondia com um toast:
a razão e nada mais. Um aviso passageiro é o instrumento errado para uma
bifurcação — ele é silencioso, sai sozinho, e deixava o usuário encarando o
botão que acabara de recusá-lo, sem nenhuma saída oferecida.

Passa a abrir um **diálogo modal centrado** que diz qual treino está aberto e
quanto dele já foi feito, e oferece as **três** saídas de uma vez, porque duas
delas alteram dados e isso tem de ser visto antes da escolha: **concluir o atual
e iniciar**, **voltar ao treino atual** e **descartar o atual e iniciar**
(destrutiva, e por isso a mais quieta das três). Concluir respeita o piso que o
runner já tem — sem nenhum exercício marcado ele aparece indisponível, com a
razão à vista, porque uma sessão vazia se abandona em vez de se concluir. O X
fecha sem escolher nada.

A mesma colisão existe na aba **Cardio**, e passa a usar o **mesmo diálogo**:
duas telas que recusam a mesma coisa pela mesma razão não podem responder de
formas diferentes. O mecanismo é um `useChoice` novo em `ui/Feedback`, irmão do
`useConfirm` — este responde sim/não sobre uma ação; aquele escolhe entre
várias.

### 6. Appbar rente ao conteúdo

`padding-bottom: 0` e sem `border-bottom`, em todo o app. Na tela da sessão é a
barra de progresso que passa a marcar o fim do cabeçalho; nas demais, o respiro
próprio do `.screen` já separa.

## Scope

### In Scope
- Barra de progresso segmentada na barra flutuante da tela da entrada (indicador, não navegável)
- Remoção do distintivo "Concluído" acima das abas, que passou a repetir o que a barra flutuante já diz
- Diálogo de colisão ao iniciar um treino com outro em andamento (Home e Cardio), com concluir / voltar / descartar
- `useChoice` em `ui/Feedback`, o mecanismo genérico por trás dele
- `StepperBar` em linha única, com chevrons sem rótulo
- Ação central como alternador (marcar avança; desmarcar fica)
- Rolagem do `.weight-card` ao entrar em edição (catálogo + sessão)
- Appbar sem `padding-bottom` e sem `border-bottom`, globalmente

### Out of Scope
- Segmentos navegáveis (decidido contra: toque acidental durante o treino)
- Qualquer mudança no runner `/session/:id` — sua barra de progresso e sua lista ficam como estão
- Barra de progresso no detalhe do catálogo (`ExerciseDetailPage`): não há sessão nem "dia" ali
- Mudar o destino do Concluir treino, ou a regra de "ao menos um concluído"
- Persistir a aba ativa, e qualquer alteração de dados/esquema

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nenhum campo novo; `done` já é alternável (`setEntryDone`) |
| API | No | `setEntryDone`, `completeSession`, `deleteSession` e `swapEntryExercise` inalterados — o diálogo apenas os chama |
| State | No | Tudo derivado de `useSessionEntries` / `useSessionEntry`; o diálogo lê as entradas no clique, sem hook novo |
| UI | Yes | `SessionEntryPage`, `StepperBar`, `WeightEditor`, `HomePage`, `CardioPage`, `ui/Feedback`, `session.css`, `global.css` |

## Architecture Considerations

- **`StepperBar` é compartilhado** com `ExerciseDetailPage` (catálogo, aberto a
  partir de um dia), que o usa **sem** `action`. A linha única precisa continuar
  correta com o slot central vazio — os dois chevrons dividem a linha.
- **`ActionBar` mede a própria altura** e publica `--action-bar-h`; passar de
  duas linhas para uma reduz a reserva sozinho, sem número mágico para ajustar.
- **`aria-pressed` já é o padrão do app** para "feito/não feito"
  (`SessionPage`); a ação central adota o mesmo em vez de `role="checkbox"`,
  que mentiria: marcar também navega, e um checkbox que troca de tela não é um
  checkbox. A aparência é a do checkbox, a semântica é a de um toggle.
- **A appbar é `position: sticky`**, então rolar o cartão de peso "para o topo"
  precisa de `scroll-margin-top`, senão ele para debaixo da barra.
- **Escala de fonte 100–200%** vale para tudo aqui: os segmentos usam altura em
  `px` (são um gráfico, não texto), a linha do stepper e o `scroll-margin`
  acompanham a escala.

## Success Criteria

- [ ] A tela da entrada mostra, na barra flutuante e abaixo dos controles, um segmento por exercício do dia, com concluídos, atual e pendentes distinguíveis
- [ ] A barra de progresso não rola com o conteúdo e sobrevive à troca de aba
- [ ] O distintivo "Concluído" acima das abas não existe mais
- [ ] A barra some quando a sessão tem uma entrada só (cardio)
- [ ] A barra fixa ocupa **uma** linha: `<`, ação, `>`
- [ ] Marcar concluído avança; tocar de novo numa entrada concluída desmarca e permanece na tela
- [ ] Marcar a última pendente continua oferecendo "Concluir treino"
- [ ] Tocar em Editar/Definir no peso deixa o cartão no topo e Cancelar/Salvar visíveis, sem rolar
- [ ] Nenhuma appbar do app desenha linha inferior nem folga abaixo do título
- [ ] Iniciar com um treino aberto abre o diálogo com as três saídas; o X não faz nada
- [ ] Concluir aparece indisponível quando nada foi marcado
- [ ] A aba Cardio abre o mesmo diálogo
- [ ] `npm test` e `npx tsc --noEmit` limpos

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Testes existentes buscam "Concluir" por `role: button` | Alta | Baixo | Manter `<button>` + nome acessível; `aria-pressed` não muda o role |
| Rótulo "Concluído" espremido entre dois chevrons em 200% | Média | Médio | Chevrons com largura fixa (`icon-btn`); ação central `flex: 1`; conferir em 200% |
| `scrollIntoView` disputa com o foco automático do input (e com o teclado virtual no celular) | Média | Médio | Rolar **depois** do foco, num efeito ligado ao estado de edição; `--kb-inset` já levanta a barra fixa |
| Cartão de peso perto do fim da página não alcança o topo | Média | Baixo | Requisito exige as ações visíveis mesmo quando a extensão de rolagem não permite o topo |
| Appbar rente parece "colada" ao rolar em telas sem barra de progresso | Baixa | Baixo | O fundo `--surface-0` opaco da appbar mantém a separação por contraste; revisar Home e Configurações |
| Segmento único de cardio confunde | Baixa | Baixo | Escondido abaixo de duas entradas |
| "Descartar" apaga um treino em andamento sem volta | Média | Alto | Tom destrutivo, nunca a ação primária, rótulo que nomeia o dia a apagar, e o X sempre disponível |
| Um toque errado em "Concluir e iniciar" encerra o treino cedo demais | Média | Médio | Só é oferecido com algo marcado; o resultado vai para o histórico, não se perde |

---

## Archive Information

**Archived:** 2026-08-31
**Duration:** mesmo dia (proposta, implementação e arquivamento)
**Outcome:** Successfully implemented

### Revisões durante a implementação

A proposta original foi revisada três vezes a pedido do autor, e o histórico
importa mais que o destino:

1. A barra de progresso nasceu como primeiro elemento de `<main>`, subiu para um
   bloco grudado acima da barra de título, e terminou **dentro da barra
   flutuante inferior**, abaixo dos controles. A segunda posição levou a tirar o
   `padding-top` da appbar naquela tela; a terceira desfez isso, porque o
   "suspiro" que justificava a remoção tinha ido embora com ela.
2. O distintivo "Concluído" acima das abas foi **removido**: a barra flutuante
   passou a dizer a mesma coisa três vezes.
3. O aviso de "treino em andamento" deixou de ser um toast e virou um **diálogo
   com três saídas**. Isso reverteu, deliberadamente, uma decisão anterior
   documentada em `HomePage.tsx` ("responde com a razão apenas").

### Files Modified
- `src/features/session/SessionEntryPage.tsx` — barra segmentada; alternador de concluído
- `src/ui/StepperBar.tsx` — linha única `< ação >`, com slot de progresso
- `src/ui/Feedback.tsx` — `useChoice`, modal de N opções
- `src/features/home/HomePage.tsx`, `src/features/cardio/CardioPage.tsx` — diálogo de colisão
- `src/features/exercise/WeightEditor.tsx` — rolagem do cartão ao editar
- `src/features/session/session.css`, `src/features/exercise/exercise.css`, `src/styles/global.css`
- Testes: `entry-progress` e `weight-edit-scroll` (novos); `stepper-bar`, `home`,
  `cardio`, `session`, `alternatives`, `detail-header`, `detail-tabs-layout` (atualizados)

### Specs Updated
- `openspec/specs/workout-sessions/spec.md` — +2 requisitos, ~3 modificados
- `openspec/specs/app-foundation/spec.md` — +1 requisito (appbar rente)
- `openspec/specs/exercises/spec.md` — ~1 (cabeçalho acima das abas)
- `openspec/specs/home-navigation/spec.md` — ~1 (diálogo ao iniciar)
- `openspec/specs/cardio/spec.md` — ~1 (mesmo diálogo)
- `openspec/specs/weights/spec.md` — ~1 (rolagem ao editar)

### Verificação
- `npm test` — 78 arquivos, 971 testes passando, 2 pulados
- `npm run typecheck` — limpo
- `npx openspec validate --specs --strict` — 16/16
- Conferência visual (3.20, 4.6, 4.7) — feita pelo autor no navegador
