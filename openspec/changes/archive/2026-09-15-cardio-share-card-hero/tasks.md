# Implementation Tasks: A imagem compartilhada de um cardio vira uma foto

**Change ID:** `cardio-share-card-hero`

---

## Phase 1: O modelo decide o formato

- [x] 1.1 `ShareCard` passa a dizer **qual formato o cartão tem**. A escolha mora
      em `buildShareCard`, que é onde vivem as decisões de "o que vai na
      imagem" — e é o que mantém isto sob teste, já que jsdom não tem canvas e
      `renderCard` não é testável em unidade.
- [x] 1.2 O retrato vale quando a sessão é **de cardio** e a entrada **tem
      imagem**. Sem imagem, o formato de hoje: um retângulo vazio ocupando meio
      cartão seria pior que a linha compacta.
- [x] 1.3 No retrato, o **título deixa de ser repetido**. Em cardio
      `session.dayName` é o nome do exercício, e ele passa a aparecer uma vez
      só, como legenda da foto.
- [x] 1.4 Testes em `shareModel`: cardio com foto, cardio sem foto, dia de treino
      com um exercício só (que **não** é retrato), e o nome não repetido.

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes do modelo verdes

---

## Phase 2: O desenho

- [x] 2.1 A foto ocupa a **largura inteira** do cartão, sangrando além do `PAD`,
      em **3:2**, recortada por `drawCover` — a mesma função que já preenche a
      miniatura sem distorcer.
- [x] 2.2 Abaixo dela: o **nome** em corpo grande e as **categorias**, com o ✓
      do estado ao lado do nome.
- [x] 2.3 `cardHeight` aprende o formato novo. Ela soma os blocos **antes** de o
      canvas existir, então cálculo e desenho têm de concordar — divergir produz
      faixa preta embaixo ou foto cortada.
- [x] 2.4 Cabeçalho e rodapé inalterados.

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo

---

## Phase 3: Fechamento

- [x] 3.1 `shareCard.test.ts` passou sem edição, e os testes de dia de treino em
      `share.test.ts` também — o que confirma que a mudança não vazou. Os testes
      novos foram acrescentados ao lado, não no lugar deles.
- [x] 3.2 `cardHeight.test.ts` novo: a altura é calculada **antes** de o canvas
      existir, e divergir do desenho deixa faixa preta ou foto cortada. O acordo
      em pixels é coisa para o olho — jsdom não tem canvas —, mas o
      **ramo** é testável, e esquecê-lo é o erro realista. Verificado que morde:
      sem a ramificação, "expected 196 to be greater than 242".
- [~] 3.2b A proporção 3:2 e o corte da foto **não foram conferidos numa tela**
      — nenhum teste aqui vê pintura, e eu não gerei o cartão. Arquivado assim
      por decisão de quem pediu. Se a foto ficar alta ou o corte cair mal, é um
      número (`HERO_H`) num lugar só.
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
