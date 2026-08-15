# Implementation Tasks: Cor de destaque escolhida pelo usuário

**Change ID:** `customizable-accent-color`

---

## Phase 1: Foundation (Tokens & Palette)

- [x] 1.1 Criar `src/state/accents.ts` com a tabela das 9 cores — `id`, `name`
      (pt-BR), `accent`, `accent2`, `rgb` — mais `DEFAULT_ACCENT_ID = 'red'` e
      um `isAccentId`/`resolveAccent` que devolve o vermelho para qualquer
      valor desconhecido. Documentar no topo a regra de derivação (matiz girada
      a luminância 0,1986 e croma ≤ 0,225; `accent2 = 0,79 × accent`).
- [x] 1.2 `src/styles/tokens.css` — introduzir `--accent-rgb: 236, 44, 46`;
      passar `--bg-accent` e `--border-accent` a derivarem dele
      (`rgba(var(--accent-rgb), 0.16 / 0.42)`); apontar `--text-accent` e
      `--fill-accent` para `var(--accent)`. Acrescentar `--bg-accent-mid`
      (`rgba(var(--accent-rgb), 0.45)`), o tom que hoje está literal na
      consistência. Atualizar o comentário do bloco de accent: ele deixa de
      descrever "o vermelho de marca" e passa a descrever o **contrato** que
      qualquer cor da lista cumpre.
- [x] 1.3 `src/features/consistency/consistency.css` — trocar os dois
      `rgba(236, 44, 46, 0.45)` (`.hm-c.l1` e `.mo-bar.partial`) por
      `var(--bg-accent-mid)`.
- [x] 1.4 `src/state/settings.ts` — `accent: AccentId` no estado, `setAccent`,
      `applyAccent(id)` escrevendo `--accent`, `--accent-2` e `--accent-rgb` na
      raiz, saneamento em `onRehydrateStorage` e `reset()` restaurando fonte
      **e** cor.
- [x] 1.5 `src/main.tsx` — `applyAccent(useSettings.getState().accent)` junto do
      `applyFontScale`, antes de `createRoot`.
- [x] 1.6 Teste da invariante em `src/state/accents.test.ts`, com o **vermelho
      padrão como referência** (não com números mágicos): para cada uma das 9
      cores, recalcular a luminância relativa (dentro de ±0,002 da do vermelho),
      o contraste contra `--surface-0` (≥ 4,5:1), o branco sobre o
      preenchimento, a croma OKLCH (≤ a do vermelho + 0,002, folga de
      arredondamento) e a distância de matiz OKLCH até o âmbar `#ffa94d`
      (≥ a do vermelho, 37,9°); conferir também que
      `accent2 = 0,79 × accent` por canal (±1) e que a entrada `red` é
      exatamente `#ec2c2e` / `#ba2324`.
- [x] 1.7 Teste em `src/state/settings.test.ts`: `applyAccent` escreve as três
      propriedades; um id desconhecido cai no vermelho; `reset` volta ao padrão.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] `npx vitest run src/state` verde (106 testes, dos quais 68 são a
      invariante da paleta)
- [x] Guarda verificada de verdade: inserir um âmbar `#cf5500` na lista reprova
      exatamente o teste de distância do perigo e passa nos demais.

---

## Phase 2: Business Logic (Card compartilhado & governança)

- [x] 2.1 `src/features/session/share/renderCard.ts` — tirar `accent`,
      `accent2` e `accentTint` da constante `C` e recebê-los por parâmetro
      (a partir da cor escolhida), mantendo em `C` só o que não depende da
      escolha. Atualizar o comentário do bloco: ele continua sendo uma cópia
      documentada, mas dos valores **neutros**.
- [x] 2.2 Ajustar quem chama o pintor (`shareModel`/`SessionSharePage` ou
      equivalente) para passar a cor vigente.
- [x] 2.3 Teste em `src/features/session/share/cardAccent.test.ts`.
      *Correção do plano:* jsdom não tem contexto 2D, então **não há pixel para
      inspecionar** — o próprio arquivo de teste da tela já registra isso. O que
      é testável, e o que de fato quebrava, é a **cor entregue ao pintor**:
      `cardAccent` expande cada cor (incluindo a tinta 0,16), cai no vermelho
      para id desconhecido e nunca devolve o vermelho para uma cor não-padrão;
      e um caso novo em `session.share.integration.test.tsx` prova que a página
      passa a cor escolhida.
- [x] 2.4 Varredura feita. Sobram apenas as declarações **padrão** em
      `tokens.css` (`--accent`, `--accent-2`, `--accent-rgb`) — e elas têm de
      ficar: são o que pinta antes de o JS aplicar a preferência. Nenhum outro
      arquivo carrega o vermelho.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] `npx vitest run src/features/session` verde (8 arquivos, 53 testes)
- [x] Varredura de literais limpa fora do padrão em `tokens.css`

---

## Phase 3: User Interface

- [x] 3.1 `src/features/settings/AppearancePage.tsx` — seção "Cor de destaque"
      com uma grade das 9 amostras: cada uma é um botão redondo pintado com a
      cor, com `aria-label` = nome, `aria-pressed` para a escolhida e um
      check visível na selecionada. Mostrar o nome da cor escolhida.
- [x] 3.2 Uma linha de apoio dizendo que o ícone instalado e a tela de abertura
      seguem a marca e não mudam.
- [x] 3.3 `appearance.css` — estilos da grade e das amostras, alvo de toque
      confortável no celular (≥ 44px) e foco visível.
- [x] 3.4 A prévia existente passa a exibir a cor escolhida (o badge de peso na
      tinta de destaque), para a escolha ser avaliada sem sair da tela.
- [x] 3.5 "Restaurar padrão" passa a restaurar tamanho **e** cor. O rótulo já
      era neutro, mas o botão estava **dentro do cartão de fonte**, o que o
      fazia parecer só da fonte — passou para um bloco próprio no fim da tela.
- [x] 3.6 Testes em `src/features/settings/appearance.integration.test.tsx`:
      escolher uma cor escreve as variáveis na raiz e marca a amostra;
      a escolha persiste entre montagens; restaurar padrão volta ao vermelho.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo (o projeto não tem script de lint)
- [x] `npx vitest run src/features/settings` verde (14 arquivos, 74 testes)

---

## Phase 4: Integration & Polish

- [x] 4.1 Textos em pt-BR revisados (título da seção, nomes das 9 cores, linha
      de apoio, rótulo do reset).
- [x] 4.2 Verificado no app rodando (Chromium headless contra o dev server):
      escolhido "Azul", os três tokens escritos e todos os derivados seguindo
      (`--bg-accent` → `rgba(0, 126, 216, 0.16)`, `--bg-accent-mid` → `…0.45`,
      gradiente do CTA → `linear-gradient(rgb(0,126,216), rgb(0,100,171))`).
      Varredura de **todo o DOM** em `/`, `/consistency`, `/exercise/1?day=1` e
      `/settings` procurando o vermelho de marca em `color`, `background`,
      `backgroundImage`, `border`, `fill`, `stroke` e `accentColor`: **nenhuma
      ocorrência**.
      *Achado:* o **logo** no topo da Home continua vermelho — é
      `assets/logo-mark.png`, arte e não cor de CSS. Mantido de propósito (uma
      marca é uma marca) e o texto da tela passou a dizê-lo.
- [x] 4.3 Coberto por teste em `portability.test.ts`: com a cor em "Verde", o
      JSON exportado não contém `accent`, nem o hex, nem o id.
- [x] 4.4 Recarregado com "Azul" salvo: `--accent` já vale `#007ed8` na
      primeira leitura. Também coberto por teste ("applies a stored colour on
      the first paint of a later visit").
- [x] 4.5 `openspec/project.md`: nova decisão 9 — o destaque é do usuário e
      governado por lista, com as duas regras que dela decorrem (luminância
      igual; só três propriedades escritas, o resto deriva).

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo e `npx vitest run` verde (65 arquivos,
      668 testes)
- [x] Documentação sincronizada

---

## Phase 5: Paleta ampliada (16 cores)

*Escopo acrescentado depois das fases 1–4, a pedido.*

- [x] 5.1 Paleta de 9 → **16 cores**. As 9 originais ficaram **intactas** (nada
      de churn em hex já revisado); as 7 novas — Framboesa, Fúcsia, Ametista,
      Índigo, Azul-royal, Azul-petróleo, Esmeralda — foram escolhidas por
      max-min de distância perceptual sobre o arco permitido, sob a mesma
      invariante de luminância/croma/distância do âmbar.
      *Nota:* solto, o otimizador escolheu um mostarda `#8a7c00` — passava na
      regra de matiz mas lê como cor suja. O arco quente-a-oliva passou a ser
      excluído explicitamente.
- [x] 5.2 Teste novo: **separação perceptual mínima** entre todos os 120 pares
      (0,035 no plano a/b do OKLab). Sem ele, a lista mais densa poderia passar
      a oferecer duas amostras indistinguíveis.
- [x] 5.3 Grade de amostras de 5 colunas para **4×4** — 16 encaixa exato.

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo e `npx vitest run` verde (65 arquivos,
      718 testes)
- [x] Verificado no app rodando: 16 amostras, a escolhida marcada, e a troca
      repintando tudo.

---

## Nota: a cor secundária foi construída e revertida

Entre a fase 5 e o fim, foi implementada uma **segunda cor de destaque** —
escolhível na mesma lista, com um modo "Automática" como padrão — que pintava a
parada de baixo dos degradês e os gráficos da Consistência. Estava completa e
verde (730 testes), incluindo `resolvePair`, os tokens `--accent-b` /
`--accent-b-rgb`, a segunda grade em Aparência e o card compartilhado recebendo
o par.

**O usuário avaliou na tela e pediu para reverter**: o resultado visual não
ficou bom. A reversão devolveu tudo ao estado de uma cor só — `applyAccent`
voltou a escrever três propriedades, os gráficos voltaram a `--accent`, e o
degradê voltou a ser a cor escolhida com o parceiro derivado pelo fator 0,79 de
sempre, que é o desenho que o app sempre teve.

O que **ficou** dessa rodada: as 16 cores e o teste de separação perceptual.

Registrado aqui porque a próxima pessoa que pensar "faltou uma cor secundária"
merece saber que ela já existiu, funcionou tecnicamente, e foi recusada por
gosto — não por dificuldade.

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
