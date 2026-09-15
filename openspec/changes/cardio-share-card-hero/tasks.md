# Implementation Tasks: A imagem compartilhada de um cardio vira uma foto

**Change ID:** `cardio-share-card-hero`

---

## Phase 1: O modelo decide o formato

- [ ] 1.1 `ShareCard` passa a dizer **qual formato o cartão tem**. A escolha mora
      em `buildShareCard`, que é onde vivem as decisões de "o que vai na
      imagem" — e é o que mantém isto sob teste, já que jsdom não tem canvas e
      `renderCard` não é testável em unidade.
- [ ] 1.2 O retrato vale quando a sessão é **de cardio** e a entrada **tem
      imagem**. Sem imagem, o formato de hoje: um retângulo vazio ocupando meio
      cartão seria pior que a linha compacta.
- [ ] 1.3 No retrato, o **título deixa de ser repetido**. Em cardio
      `session.dayName` é o nome do exercício, e ele passa a aparecer uma vez
      só, como legenda da foto.
- [ ] 1.4 Testes em `shareModel`: cardio com foto, cardio sem foto, dia de treino
      com um exercício só (que **não** é retrato), e o nome não repetido.

**Quality Gate:**
- [ ] `npm run typecheck` limpo
- [ ] Testes do modelo verdes

---

## Phase 2: O desenho

- [ ] 2.1 A foto ocupa a **largura inteira** do cartão, sangrando além do `PAD`,
      em **3:2**, recortada por `drawCover` — a mesma função que já preenche a
      miniatura sem distorcer.
- [ ] 2.2 Abaixo dela: o **nome** em corpo grande e as **categorias**, com o ✓
      do estado ao lado do nome.
- [ ] 2.3 `cardHeight` aprende o formato novo. Ela soma os blocos **antes** de o
      canvas existir, então cálculo e desenho têm de concordar — divergir produz
      faixa preta embaixo ou foto cortada.
- [ ] 2.4 Cabeçalho e rodapé inalterados.

**Quality Gate:**
- [ ] `npm run typecheck` limpo

---

## Phase 3: Fechamento

- [ ] 3.1 Conferir que `shareCard.test.ts` e `share.test.ts` seguem passando
      **sem edição** no que toca a dias de treino — se algum falhar ali, este
      change vazou para onde não devia.
- [ ] 3.2 Olhar o cartão de cardio gerado de verdade: a proporção 3:2 e o corte
      são as duas coisas que nenhum teste vê.
- [ ] 3.3 Suíte inteira e build.

**Quality Gate:**
- [ ] `npm test` inteiro verde
- [ ] `npm run build` sem erro

---

## Completion Checklist

- [ ] All phases complete
- [ ] All quality gates passed
- [ ] Documentation synced
- [ ] Ready for `/openspec-archive`
