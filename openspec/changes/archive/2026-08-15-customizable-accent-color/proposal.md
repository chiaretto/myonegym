# Proposal: Cor de destaque escolhida pelo usuário

**Change ID:** `customizable-accent-color`
**Created:** 2026-08-15
**Status:** Implementation Complete
**Completed:** 2026-08-15

---

## Problem Statement

A cor de destaque do app é o vermelho de marca `#ec2c2e`, fixo em
`src/styles/tokens.css`. Ele pinta praticamente toda a affordância do produto —
botões primários, o gradiente do "Iniciar", chips ativos, checkboxes, o
sparkline, o mapa de consistência, os badges de peso — e o usuário não tem
como trocá-lo.

- **É a única escolha estética que o app nega.** Aparência já deixa o usuário
  ajustar o tamanho da fonte de 100% a 200%, com prévia, reset e persistência.
  A cor é a preferência visual mais evidente que existe e é a que está travada.
- **Vermelho não é neutro.** É uma cor de alta carga — alerta, esforço,
  urgência. Para um app que a pessoa abre todo dia, e várias vezes por treino,
  é razoável querer algo mais calmo sem perder o mesmo desenho.
- **Trocar à mão não é opção.** Não há tema, não há login, e editar
  `tokens.css` exige rebuild. Um app local-only que já persiste preferências no
  dispositivo tem tudo o que essa escolha precisa.

O risco óbvio — e o motivo de isso não ser "só deixar escolher uma cor" — é que
**a paleta inteira foi calibrada em cima daquele vermelho**. `--text-accent`
alcança 4,5:1 como texto sobre o fundo; o branco sobre o preenchimento sólido é
o que os botões assumem; e o âmbar de perigo (`#ffa94d`) foi escolhido a ~38° de
distância do vermelho em matiz **e** a 2:1 de luminância, justamente para que
"Excluir" nunca leia como uma ação de marca. Uma cor livre quebra as três
coisas de uma vez.

## Proposed Solution

Oferecer uma **lista curada de 16 cores**, todas construídas para ocupar
**exatamente o mesmo lugar tonal** do vermelho atual, e trocar a cor em tempo de
execução escrevendo três variáveis CSS na raiz do documento — o mesmo mecanismo
que o tamanho da fonte já usa.

**A regra que garante o contraste.** Cada cor da lista é obtida girando a
**matiz** do vermelho atual mantendo constante a **luminância relativa**
(0,1983) e limitando a **croma** à do vermelho (0,225 em OKLCH). Consequências,
todas verificáveis por cálculo:

- contraste como texto sobre `--surface-0`: **4,78–4,82:1** (o vermelho de hoje
  mede 4,80:1) — a variação é apenas o arredondamento para 8 bits por canal;
- branco sobre o preenchimento sólido: **4,21–4,24:1** (hoje 4,23:1);
- nenhuma cor fica mais vívida que o vermelho, então nada "grita" mais que a
  identidade atual.

A regra não é uma invenção nova: aplicada à matiz do próprio vermelho ela
**reproduz `#ec2c2e` e o seu parceiro de gradiente `#ba2324`**, o que é a
melhor evidência de que a derivação está certa.

| Nome | `--accent` | `--accent-2` | | Nome | `--accent` | `--accent-2` |
|---|---|---|---|---|---|---|
| Vermelho (padrão) | `#ec2c2e` | `#ba2324` | | Violeta | `#576bff` | `#4555c9` |
| Framboesa | `#e9286a` | `#b82054` | | Azul-royal | `#0076fc` | `#005dc7` |
| Rosa | `#de3097` | `#af2677` | | Azul | `#007ed8` | `#0064ab` |
| Fúcsia | `#d239b2` | `#a62d8d` | | Azul-petróleo | `#0084b6` | `#006890` |
| Magenta | `#c342cc` | `#9a34a1` | | Ciano | `#008894` | `#006b75` |
| Ametista | `#ac4ee5` | `#883eb5` | | Verde-água | `#008c70` | `#006f58` |
| Roxo | `#9159f8` | `#7346c4` | | Esmeralda | `#008e55` | `#007043` |
| Índigo | `#7861ff` | `#5f4dc9` | | Verde | `#008f37` | `#00712b` |

As 16 foram escolhidas maximizando a **distância perceptual mínima** entre elas
(0,0368 no plano a/b do OKLab). Como a luminância é a mesma para todas, matiz e
croma carregam **toda** a diferença — uma lista mais densa começaria a oferecer
dois botões que o usuário não distingue.

**A faixa quente fica de fora, de propósito.** Entre o laranja e o oliva o sRGB
não consegue ser vívido naquela luminância — a cor sai mostarda — e é
exatamente onde mora o âmbar de perigo. Todas as 15 alternativas ficam **mais
longe** do âmbar do que o vermelho de hoje, então a distinção "excluir não é uma
ação de marca" **melhora** com qualquer escolha diferente do padrão.

**O degradê continua sendo o da marca.** `--accent-2` segue derivado da cor
escolhida pelo fator 0,79 de sempre, como o app sempre fez — a cor troca, o
desenho não.

**Mecanismo.** `tokens.css` passa a derivar os tons translúcidos de um triplete
`--accent-rgb`, e `--text-accent`/`--fill-accent` passam a apontar para
`--accent`. Trocar a cor então é escrever **três** propriedades na raiz
(`--accent`, `--accent-2`, `--accent-rgb`); todo o resto — gradiente, tinta,
borda, texto, preenchimento — já deriva. A escolha vive no store de
`settings.ts` (zustand + `persist`), é aplicada em `main.tsx` **antes da
primeira pintura**, e é **local do dispositivo** — como o tamanho da fonte,
fica **fora do backup**.

**O card de compartilhamento acompanha.** `renderCard.ts` pinta em `<canvas>`,
que não lê variáveis CSS, e por isso mantém uma cópia manual da paleta. Essa
cópia deixa de ser constante nos valores de destaque e passa a receber a cor
escolhida, para que o PNG compartilhado não continue vermelho num app que o
usuário deixou azul.

## Scope

### In Scope

- Tabela de 16 cores em um módulo único, com nome em pt-BR, `--accent`,
  `--accent-2` e `--accent-rgb`.
- `tokens.css`: `--accent-rgb`, tintas derivadas dele, `--text-accent` e
  `--fill-accent` apontando para `--accent`.
- `settings.ts`: `accent`, `setAccent`, `applyAccent`, saneamento do valor
  persistido, e `reset` voltando ao vermelho.
- `main.tsx`: aplicar a cor antes da primeira pintura.
- Seletor em **Configurações → Aparência**, com as 16 amostras em grade 4x4, o
  nome da cor escolhida e a marca de seleção; a prévia mostra a cor no badge e
  no CTA.
- Fim dos dois literais `rgba(236, 44, 46, 0.45)` em `consistency.css` — eles
  hoje já contrariam "toda cor deriva de token".
- `renderCard.ts` recebendo os valores de destaque em vez de fixá-los.
- Teste que **prova as invariantes** da paleta por cálculo (luminância,
  contraste, croma, distância de matiz do âmbar e separação perceptual mínima
  entre as 16), além dos testes de UI e persistência.

### Out of Scope

- **Tema claro.** O app é dark-only e continua sendo; isto troca o destaque,
  não o fundo.
- **Cor livre / seletor de espectro.** Descartado: hues quentes normalizados
  para essa luminância viram oliva, e o usuário receberia uma cor
  visivelmente diferente da que tocou.
- **A marca: logo, ícone instalado e tela de abertura.** São artes em PNG
  (`src/assets/logo-mark.png` e os gerados das artes-mestre), não cor de CSS —
  continuam vermelhas. O logo no topo da Home é o caso mais visível, e é
  deliberado: uma marca é uma marca, e recolorir um PNG por filtro estragaria a
  arte. A tela de Aparência diz isso em uma linha.
- **`theme-color` e `background_color`** do manifesto: já são `#050607` (a
  superfície), não o destaque — nada a fazer.
- **Uma segunda cor de destaque.** Foi construída e **revertida a pedido** — ver
  a nota no fim das tarefas. O app fica com uma cor de destaque só, e o degradê
  segue derivado dela como sempre foi.
- Mudar o âmbar de perigo, os cinzas ou os raios.
- Sincronizar a escolha entre dispositivos (não há servidor).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Não | A escolha é preferência de UI local, não dado do usuário — nada no IndexedDB, nada no backup. |
| API (repos) | Não | Nenhum repositório envolvido. |
| State | Sim | `src/state/settings.ts` ganha `accent`/`setAccent`/`applyAccent` e sanea o valor reidratado; `reset` passa a restaurar fonte **e** cor. |
| UI | Sim | `AppearancePage` ganha a grade de cores; `appearance.css` os estilos das amostras; `tokens.css` a derivação por `--accent-rgb`; `consistency.css` perde dois literais; `renderCard.ts` passa a receber a cor. |
| Portabilidade | Sim (texto) | A lista de preferências locais fora do backup passa a citar a cor de destaque. |

## Architecture Considerations

- **É o mecanismo do tamanho da fonte, de novo.** Store persistido → função
  `apply*` que escreve na raiz → chamada em `main.tsx` antes da primeira
  pintura → clamp/saneamento na reidratação. Não há padrão novo a aprender, e o
  bug que o padrão evita (o app pintar numa cor e pular para outra) é evitado
  pelo mesmo motivo.
- **Um valor escrito, muitos derivados.** Escrever três propriedades e deixar
  tinta/borda/gradiente/texto derivarem é o que mantém a promessa de "a paleta é
  governada de um lugar só" — o oposto de escrever oito valores e torcer para
  que fiquem coerentes.
- **A lista é dado, não CSS.** As 9 cores vivem num módulo TypeScript porque
  precisam ser lidas por três consumidores: o CSS (via a raiz), a tela de
  Aparência (para desenhar as amostras) e o pintor do card (canvas). Uma classe
  CSS por cor não serviria aos dois últimos.
- **A invariante é testável, e por isso é regra e não intenção.** Luminância,
  contraste e distância de matiz são aritmética sobre a tabela: o teste
  recalcula tudo e falha se alguém acrescentar uma cor bonita e errada. É a
  única forma de a lista continuar honesta depois desta mudança.

## Success Criteria

- [x] Configurações → Aparência oferece 16 cores, com a atual marcada.
- [x] Tocar uma cor repinta o app inteiro imediatamente — Home, sessão,
      consistência e a própria tela de Aparência.
- [x] A escolha sobrevive a fechar e reabrir o app, sem piscar a cor anterior
      na primeira pintura.
- [x] "Restaurar padrão" devolve o vermelho `#ec2c2e` (e o tamanho de fonte
      padrão).
- [x] Todas as 16 cores ficam a ±0,002 da luminância do vermelho, o que as
      mantém em 4,78–4,82:1 sobre `--surface-0` e 4,21–4,24:1 para o branco
      sobre o preenchimento — provado por teste, não por inspeção.
- [x] Nenhum par de cores da lista fica perceptualmente indistinguível.
- [x] Nenhuma cor da lista fica mais perto do âmbar de perigo, em matiz, do que
      o próprio vermelho padrão (37,9°).
- [x] O card compartilhado sai na cor escolhida.
- [x] Nenhum literal de vermelho sobra fora de `tokens.css` e da tabela de
      cores.
- [x] A cor não aparece no backup exportado.
- [x] `npx tsc -b --noEmit` limpo e `npx vitest run` verde.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Uma cor futura entrar na lista sem respeitar a invariante | Alta | Alto | O teste recalcula luminância, contraste e Δmatiz da tabela inteira; uma cor fora da regra reprova o build. |
| O card compartilhado divergir da paleta de novo | Média | Médio | Os valores de destaque deixam de ser constante em `renderCard.ts` e passam a ser parâmetro; o bloco `C` fica só com o que não muda. |
| Piscar a cor padrão antes da preferência aplicar | Baixa | Médio | Aplicada em `main.tsx` antes de `createRoot`, como o `--font-scale` — e coberta por teste. |
| Valor persistido inválido (storage adulterado, cor removida da lista) | Baixa | Baixo | A reidratação valida contra a tabela e cai no vermelho quando não reconhece. |
| Usuário esperar que o logo e o ícone também mudem | Média | Baixo | O texto da tela diz, em uma linha, que logo, ícone e tela de abertura seguem a marca. |
| Duas cores da lista ficarem parecidas demais | Média | Médio | Teste de separação perceptual mínima sobre todos os pares. |
| Regressão de contraste em algum uso que não seja texto/preenchimento (ex.: a tinta 0,16 sob texto secundário) | Baixa | Médio | A tinta e a borda derivam do mesmo triplete em todas as cores, então a relação entre elas é constante; a verificação manual passa por Home, consistência e sessão. |

---

## Archive Information

**Archived:** 2026-08-15
**Duration:** mesmo dia (proposta → implementação → arquivo)
**Outcome:** Implementado com sucesso, com um escopo revertido a pedido

### Files Modified

- `src/state/accents.ts` (novo) — a tabela das 16 cores, a regra de derivação
  documentada e `resolveAccent`
- `src/state/accents.test.ts` (novo) — as invariantes recalculadas a partir dos
  hex: luminância, contraste, croma, distância do âmbar de perigo e separação
  perceptual entre todos os 120 pares
- `src/state/settings.ts` — `accent`, `setAccent`, `applyAccent`, saneamento na
  reidratação e `reset` cobrindo fonte + cor
- `src/main.tsx` / `src/App.tsx` — aplicação antes da primeira pintura e ao vivo
- `src/styles/tokens.css` — `--accent-rgb`, tintas derivadas dele,
  `--bg-accent-mid`, `--text-accent`/`--fill-accent` apontando para `--accent`
- `src/features/settings/AppearancePage.tsx` / `appearance.css` — a grade 4×4,
  o nome da cor, a prévia e o reset em bloco próprio
- `src/features/consistency/consistency.css` — os dois literais
  `rgba(236, 44, 46, 0.45)` deram lugar a `var(--bg-accent-mid)`
- `src/features/session/share/renderCard.ts` — o pintor do card recebe a cor em
  vez de fixá-la; `cardAccent` + `cardAccent.test.ts` (novo)
- `src/features/session/SessionPage.tsx` — passa a cor vigente ao card
- `src/features/settings/appearance.integration.test.tsx`,
  `src/features/session/session.share.integration.test.tsx`,
  `src/state/settings.test.ts`, `src/data/portability.test.ts` — cobertura da
  escolha, da persistência, da primeira pintura e da ausência no backup
- `openspec/project.md` — decisão 9

### Specs Updated

- `openspec/specs/app-foundation/spec.md` — adicionado *User-Selectable Accent
  Colour*; atualizados *Dark Premium Visual Identity* (o destaque é escolhido,
  e trocá-lo é escrever três propriedades das quais tudo deriva), *Brand Colour
  Has a Single Governed Source* (nenhuma cópia carrega o destaque; o card o
  recebe por parâmetro; logo, ícone e splash seguem a marca) e *User-Adjustable
  Font Size* (o reset da tela cobre as duas preferências)
- `openspec/specs/data-portability/spec.md` — *Export Full Backup JSON* e
  *Reset App*: a cor de destaque entra na lista de preferências locais que
  ficam fora do backup e não são afetadas por um reset

### Escopo revertido

Uma **segunda cor de destaque** foi construída a pedido — escolhível na mesma
lista, com um modo "Automática" como padrão, pintando a parada de baixo dos
degradês e os gráficos da Consistência. Ficou completa e verde (730 testes) e
foi **revertida a pedido** depois da avaliação visual. Ver a nota no fim de
`tasks.md`: ela existiu, funcionou, e foi recusada por resultado — não por
dificuldade. O que sobreviveu dessa rodada foram as 16 cores (eram 9) e o teste
de separação perceptual.
