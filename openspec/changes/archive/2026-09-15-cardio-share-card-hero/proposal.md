# Proposal: A imagem compartilhada de um cardio vira uma foto, não uma lista de um item

**Change ID:** `cardio-share-card-hero`
**Created:** 2026-09-15
**Status:** Implementation Complete
**Completed:** 2026-09-15

---

## Problem Statement

A imagem compartilhada de uma sessão foi desenhada para um **dia de treino**: um
cabeçalho e uma lista de exercícios, cada um numa linha de 64px com uma
miniatura de 48px. Uma sessão de **cardio** tem exatamente **uma** entrada, e
passa por esse mesmo molde — com dois resultados ruins:

- **o nome aparece duas vezes.** Numa sessão de cardio, `session.dayName` **é o
  nome do exercício** (ver `startCardioSession`). Então o cartão escreve
  "Corrida Externa" no título e "Corrida Externa" de novo na única linha, uma
  logo abaixo da outra. Não é uma sessão de cardio mal formatada; é o cartão
  dizendo a mesma coisa duas vezes;
- **a foto, que é a única coisa que há para mostrar, tem 48 pixels.** Num dia de
  treino a miniatura é um marcador — o que interessa é a lista. Num cardio não
  existe lista: existe uma atividade, e a imagem dela. Reduzi-la a um quadrado do
  tamanho de uma unha e gastar o resto do cartão com uma linha quase vazia
  inverte o que importa.

O cartão de um cardio hoje é, literalmente:

```
Corrida Externa                    ← título (= nome do exercício)
[Academia A]  16 jul 2026
Duração 32 min

[✓] [▪] Corrida Externa            ← a mesma coisa, de novo, em 48px
        Cardio

1 de 1 concluídos        MyOneGym
```

**Afetado:** quem faz cardio e compartilha — e a imagem é exatamente o artefato
que sai do app para outras pessoas, então é a pior tela para ficar repetitiva.

## Proposed Solution

Para uma sessão de cardio, trocar a lista de um item por um **retrato**:

- **a foto ocupa a largura inteira do cartão**, sangrando além das margens, com
  proporção fixa e recorte por preenchimento (o `drawCover` que já existe);
- **abaixo dela, o nome do exercício** em corpo grande, e **as categorias**
  embaixo dele;
- **o título repetido sai.** O nome do dia continua na imagem, como manda o
  requisito — só que **uma vez**, como legenda da foto, em vez de duas;
- o cabeçalho (academia, data, duração) e o rodapé (contagem, marca) ficam como
  estão.

```
[Academia A]  16 jul 2026
Duração 32 min

┌───────────────────────────────┐
│                               │
│         a foto, inteira       │
│                               │
└───────────────────────────────┘
✓ Corrida Externa
  Cardio · Pernas

1 de 1 concluídos        MyOneGym
```

### Por que `kind === 'cardio'`, e não "uma entrada só"

Um dia de treino com um exercício só continua sendo **uma lista** — curta, mas
uma lista, e a próxima sessão daquele dia pode ter três. Um cardio é outra
coisa: uma atividade única, que o app já trata à parte em todo lugar (sem peso,
sem stepper, com aba própria). A regra segue a natureza da sessão, não a
contagem de linhas.

### Sem foto, o cartão de hoje

Um exercício de cardio **sem imagem** MUST continuar usando o formato atual. Um
retângulo vazio ocupando metade do cartão seria pior do que a linha compacta que
já existe — o desenho novo existe por causa da foto, então sem foto ele não tem
razão de ser.

## Scope

### In Scope
- O desenho da imagem compartilhada **quando a sessão é de cardio**: foto de
  largura inteira, nome e categorias abaixo dela.
- A altura do cartão, que passa a depender do formato escolhido.

### Out of Scope
- **O cartão de um dia de treino.** Nada muda para sessões com lista.
- **O rodapé e o cabeçalho** — contagem, marca, academia, data, duração ficam
  como estão, inclusive a contagem "1 de 1 concluídos", que soa redundante ao
  lado do ✓ mas é o mesmo par que o cartão de lista já usa.
- **As duas ações de compartilhar.** Num cardio elas diferem só pela duração
  (cardio não tem peso alvo), e a duração é justamente o número que alguém pode
  não querer publicar — então as duas continuam fazendo sentido.
- **A tela** da sessão de cardio. Isto é sobre a imagem que sai do app.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Não | — |
| API | Não | — |
| State | Não | — |
| UI | **Sim** | `shareModel.ts` passa a dizer *que tipo de cartão é*; `renderCard.ts` ganha o desenho do retrato e o cálculo de altura correspondente |

## Architecture Considerations

**A decisão é do modelo; o desenho é do renderer.** `buildShareCard` já é o
lugar onde moram as escolhas de "o que vai na imagem", justamente porque jsdom
não tem canvas e `renderCard` não é testável em unidade. Então o modelo passa a
carregar qual formato o cartão tem, e o renderer só obedece — que é o que
mantém esta mudança coberta por teste apesar de ser visual.

**O recorte já existe.** `drawCover` é o que hoje preenche a miniatura de 48px
sem distorcer; a foto grande usa a mesma função com outras medidas. Não há
carregamento novo: `renderCard` já baixa a mídia de cada linha em paralelo antes
de pintar.

**A altura do cartão é calculada, não medida.** `cardHeight` soma os blocos
antes de o canvas existir, então o formato novo precisa entrar lá **e** no
desenho — dois lugares que têm de concordar, exatamente como a barra de progresso
listrada precisou concordar consigo mesma. É a forma de errar que produz um
cartão com uma faixa preta embaixo, ou uma foto cortada.

**A proporção é uma escolha, não uma consequência.** As imagens do catálogo vão
de GIFs quase quadrados a fotos em paisagem; com recorte por preenchimento, a
proporção do cartão é que manda. **3:2** deixa a foto dominante sem transformar o
cartão numa torre — é o número a olhar na tela antes de arquivar.

## Success Criteria

- [x] Numa sessão de cardio, a foto ocupa a largura inteira do cartão
- [x] O nome do exercício e as categorias aparecem abaixo da foto
- [x] O nome não aparece duas vezes
- [x] Um cardio sem imagem continua com o formato de hoje
- [x] O cartão de um dia de treino não muda em nada
- [~] A altura calculada bate com o que é desenhado

**Em que base.** Os quatro primeiros e o quinto por teste: `share.test.ts` cobre
a escolha de formato, a ausência do título repetido, o caso sem foto e o dia de
treino — inclusive o de um exercício só. O último **só em parte**: `cardHeight`
e o desenho leem as mesmas constantes e `cardHeight.test.ts` cobre o *ramo*, mas
o acordo em pixels não foi visto numa tela. jsdom não tem canvas, e eu não gerei
o cartão.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| A altura calculada divergir do desenho, deixando faixa vazia ou corte | Média | Médio | As duas leem as mesmas constantes; teste do modelo cobre a escolha de formato e a revisão confere a soma |
| A foto ficar muito alta e o cartão virar uma torre | Média | Baixo | 3:2, e é um número — ajustável ao olho antes de arquivar |
| Categorias longas (o catálogo tem cardio com quatro) estourarem a linha | Média | Baixo | `ellipsize` já existe e a largura agora é a do cartão inteiro, bem maior que a da linha |
| Um cardio sem foto cair num buraco de layout | Baixa | Médio | Sem foto, o formato de hoje; dito no spec com cenário próprio |

---

## Archive Information

**Archived:** 2026-09-15
**Duration:** mesmo dia
**Outcome:** Successfully implemented

### Files Modified
- `src/features/session/share/shareModel.ts` — o modelo passa a dizer qual
  formato o cartão tem
- `src/features/session/share/renderCard.ts` — `drawPortrait`, o `drawCover`
  retangular, e `cardHeight` ciente do formato
- `src/features/session/share/share.test.ts` — o cardio e o dia de treino
- `src/features/session/share/cardHeight.test.ts` (novo) — o ramo da altura

### Specs Updated
- `openspec/specs/workout-sessions/spec.md` — 1 requisito MODIFIED

### Learned in Implementation

**`drawCover` era só-quadrado, e generalizá-la foi o que tornou a proporção uma
decisão.** Ela recebia um `size`; passou a receber largura e altura. Com recorte
por preenchimento é a **caixa** que decide a forma, e é isso que permite escolher
uma proporção única para fotos que vão de GIF quase quadrado a paisagem sem
distorcer nenhuma.

**Um MODIFIED que reescreve o corpo inteiro perde o que não foi copiado.** Ao
mesclar, quatro cenários do requisito original desapareceram — ênfase em
concluídos, data absoluta, independência do font-scale e sobrevivência à exclusão
do exercício — porque o delta não os trazia. Vistos no diff (que deveria ser
puramente aditivo e não era) e restaurados no spec **e** no delta, para que o
próximo merge não os perca de novo. É o risco estrutural de reescrever um
requisito inteiro em vez de emendá-lo, e o diff é o único lugar onde ele aparece.

