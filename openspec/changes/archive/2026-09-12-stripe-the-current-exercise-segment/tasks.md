# Implementation Tasks: O segmento atual vira uma barra de progresso listrada

**Change ID:** `stripe-the-current-exercise-segment`

---

## Phase 1: A pintura

- [x] 1.1 `.entry-seg.current` passa a usar a **cor cheia** do accent, a mesma
      dos concluídos, no lugar do tom diluído.
- [x] 1.2 Listras diagonais num **pseudo-elemento**, por
      `repeating-linear-gradient`. Sem elemento novo no DOM: os segmentos são
      `aria-hidden` e a barra inteira é o desenho de uma frase. Branco ficou
      lavado contra o accent; as listras são `--surface-3`, a cor do segmento
      **pendente**, então leem como o trilho vazio aparecendo através do
      preenchimento e não como padrão impresso por cima.
- [x] 1.3 Animação por **`transform`**, não por `background-position` — a barra
      fica na tela o treino inteiro, e uma que repinta a cada quadro é o pior
      caso possível aqui.
- [x] 1.4 O deslocamento por ciclo é o **passo horizontal** do padrão — o
      período dividido pelo seno do ângulo, porque o período é medido
      perpendicular às faixas. O período cru (o que serviria para faixas
      verticais) as deixaria a um terço do fim, pulando a cada volta, e isso não
      aparece numa captura de tela. Geometria e animação leem a **mesma**
      custom property, então não podem divergir.
- [x] 1.5 **Atual e concluído**: sólido, sem listras, e ainda mais alto. As
      listras dizem "em andamento", que não é o caso de algo já feito.

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] As quatro combinações de estado conferidas **lendo as regras**, não numa
      tela: a suíte roda com `css: false` e eu não abri o app. A escolha de cor
      e a leitura de relance ficam para o olho de quem pediu

---

## Phase 2: Quem pediu menos movimento

- [x] 2.1 Sob `prefers-reduced-motion: reduce`, as listras **param** e ficam.
      A distinção é de textura, então ela sobrevive sem a animação — mesmo
      raciocínio do spinner em `update.css`.

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo

---

## Phase 3: Fechamento

- [x] 3.1 `entry-progress.integration.test.tsx` passou **sem edição**, como
      previsto: ele olha classes, não pintura.
- [x] 3.2 `entry-progress.test.ts` novo: a suíte roda com `css: false`, então
      nada vê pintura — mas a costura do laço é uma **relação entre duas
      declarações**, invisível em captura de tela, e essa dá para conferir lendo
      a folha de estilo. Mesmo negócio que `state/splashes.test.ts` já faz.
      Verificado que falha: com `translateX(10px)`, `expected 10 to be 12`.
- [x] 3.3 Suíte inteira e build.

**Quality Gate:** PASSED
- [x] `npm test` inteiro verde
- [x] `npm run build` sem erro

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
