# Implementation Tasks: O segmento atual vira uma barra de progresso listrada

**Change ID:** `stripe-the-current-exercise-segment`

---

## Phase 1: A pintura

- [ ] 1.1 `.entry-seg.current` passa a usar a **cor cheia** do accent, a mesma
      dos concluídos, no lugar do tom diluído.
- [ ] 1.2 Listras verticais brancas num **pseudo-elemento**, por
      `repeating-linear-gradient`. Sem elemento novo no DOM: os segmentos são
      `aria-hidden` e a barra inteira é o desenho de uma frase.
- [ ] 1.3 Animação por **`transform`**, não por `background-position` — a barra
      fica na tela o treino inteiro, e uma que repinta a cada quadro é o pior
      caso possível aqui.
- [ ] 1.4 O deslocamento por ciclo é **um período exato** do padrão. Qualquer
      outro valor faz as listras pularem a cada volta, e isso não aparece numa
      captura de tela.
- [ ] 1.5 **Atual e concluído**: sólido, sem listras, e ainda mais alto. As
      listras dizem "em andamento", que não é o caso de algo já feito.

**Quality Gate:**
- [ ] `npm run typecheck` limpo
- [ ] Conferido no navegador, nas quatro combinações de estado

---

## Phase 2: Quem pediu menos movimento

- [ ] 2.1 Sob `prefers-reduced-motion: reduce`, as listras **param** e ficam.
      A distinção é de textura, então ela sobrevive sem a animação — mesmo
      raciocínio do spinner em `update.css`.

**Quality Gate:**
- [ ] `npm run typecheck` limpo

---

## Phase 3: Fechamento

- [ ] 3.1 Rever `entry-progress.integration.test.tsx`: os testes olham classes,
      não pintura, então devem seguir passando **sem edição**. Se algum falhar,
      é porque este change mexeu em algo que não devia.
- [ ] 3.2 Suíte inteira e build.

**Quality Gate:**
- [ ] `npm test` inteiro verde
- [ ] `npm run build` sem erro

---

## Completion Checklist

- [ ] All phases complete
- [ ] All quality gates passed
- [ ] Documentation synced
- [ ] Ready for `/openspec-archive`
