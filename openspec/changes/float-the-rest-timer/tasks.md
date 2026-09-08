# Implementation Tasks: O cronômetro de descanso solta da mídia

**Change ID:** `float-the-rest-timer`

---

## Phase 1: A contagem vira do app, não da tela

- [ ] 1.1 Store `src/state/restTimer.ts` (zustand + `persist`, como
      `activeGym`): guarda **só o instante de início**, `null` quando parado.
      `start`/`stop`/`toggle`.
- [ ] 1.2 O limite de 99 minutos mora no store, medido **sobre o relógio**: uma
      contagem que venceu enquanto o app estava fechado chega parada, e não
      corre mais 99 minutos a partir da volta.
- [ ] 1.3 `SessionEntryPage` deixa de ter o `useState` do início e o `useEffect`
      que zera na troca de exercício — as duas coisas que esta mudança reverte.
- [ ] 1.4 Testes do store: sobrevive à recriação (o que um reinício do app é),
      vence pelo relógio, e `toggle` é ida e volta.

**Quality Gate:**
- [ ] `npm run typecheck` limpo
- [ ] Testes do store verdes

---

## Phase 2: O botão diz o que está fazendo

- [ ] 2.1 `RestTimer` ganha estado visual: cinza com fonte preta parado,
      vermelho com fonte branca correndo. Fundo **opaco** nos dois — ele ainda
      pousa sobre fotografia.
- [ ] 2.2 Tamanho e posição **não** mudam com o estado: o botão não pode saltar
      sob o dedo que acabou de tocá-lo. Só cor e ícone mudam.
- [ ] 2.3 `fmtLapse` continua como está; some a regra dos minutos além de dois
      dígitos, que o limite de 99 tornou inalcançável.
- [ ] 2.4 Testes: as duas aparências, e o contraste do texto sobre cada fundo.

**Quality Gate:**
- [ ] `npm run typecheck` limpo
- [ ] Testes do componente verdes

---

## Phase 3: Flutuar sobre o app

- [ ] 3.1 Montar o cronômetro na casca (`App.tsx`), onde já vivem o toast e as
      sheets — e **não** em cada rota.
- [ ] 3.2 **Um elemento só**, nunca dois: correndo, ele é o flutuante em
      qualquer tela; parado, é o botão na mídia e só existe na aba "Execução".
- [ ] 3.3 Posição inicial fora das faixas ocupadas: acima da barra de ação
      fixa, longe do toast, e `z-index` abaixo de uma sheet aberta.
- [ ] 3.4 Ao parar fora da tela do exercício, ele some; na tela do exercício,
      volta ao canto da mídia.
- [ ] 3.5 Testes de integração: começa no exercício, navega para a Home e para
      Configurações, e a contagem continua visível e correndo.

**Quality Gate:**
- [ ] `npm run typecheck` limpo
- [ ] Testes de integração verdes

---

## Phase 4: Arrastar sem desligar

- [ ] 4.1 Arraste por pointer events (dedo e mouse num caminho só), **só
      enquanto corre**.
- [ ] 4.2 Limiar de movimento separando toque de arraste: abaixo dele liga ou
      desliga, acima dele move e o toque final **não** conta.
- [ ] 4.3 Preso à tela: não é possível arrastar para fora nem para debaixo das
      barras.
- [ ] 4.4 Ao parar, a posição volta à origem — não há posição lembrada entre
      descansos.
- [ ] 4.5 Testes das duas beiras do limiar: um toque com tremor ainda liga; um
      arraste curto não liga.

**Quality Gate:**
- [ ] `npm run typecheck` limpo
- [ ] Testes de arraste verdes

---

## Phase 5: Fechamento

- [ ] 5.1 Conferir o que a persistência afrouxa: a verificação de atualização
      adiada durante o treino (ver `app-foundation`) existia em parte porque o
      recarregamento matava a contagem — agora não mata mais.
- [ ] 5.2 Rever `rest-timer.integration.test.tsx` inteiro: os testes que
      afirmam "trocar de exercício zera" e "não sobrevive a recarregar" agora
      afirmam o contrário do que deve valer.
- [ ] 5.3 `openspec/project.md`: onde vive o cronômetro e por que ele é da
      casca.
- [ ] 5.4 Suíte inteira e build.

**Quality Gate:**
- [ ] `npm test` inteiro verde
- [ ] `npm run build` sem erro

---

## Completion Checklist

- [ ] All phases complete
- [ ] All quality gates passed
- [ ] Documentation synced
- [ ] Ready for `/openspec-archive`
