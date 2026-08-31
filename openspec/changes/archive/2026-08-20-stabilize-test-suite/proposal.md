# Proposal: Uma Suíte que Só Fica Vermelha Quando Algo Quebrou

**Change ID:** `stabilize-test-suite`
**Created:** 2026-08-20
**Status:** Implementation Complete
**Completed:** 2026-08-20

---

## Why

A suíte falha em cerca de metade das rodadas completas, em arquivos **diferentes**
a cada vez, e **todo arquivo passa isolado**. Nada está quebrado — os testes
estouram prazos que ninguém escolheu, herdados dos padrões do vitest e da
Testing Library.

Um vermelho que aparece e some ensina a ignorar vermelho. É o pior estado
possível para uma suíte: ela continua custando os 50 s de espera e deixou de
valer como sinal.

## What Changes

- `testTimeout` e `hookTimeout` passam a ser **escolhidos** em `vitest.config.ts`,
  com a razão escrita ao lado.
- O prazo das utilidades assíncronas da Testing Library (`waitFor`, `findBy*`)
  passa a ser escolhido em `vitest.setup.ts`.
- `slowTestThreshold` passa a **denunciar** o teste que ficou lento, para que
  subir o teto não vire um lugar onde a lentidão se esconde.
- Um documento curto registrando por que os números são esses e o que fazer
  quando um teste os alcançar.
- **Nada** de `isolate: false` nem de reduzir workers — as duas foram medidas e
  estão descartadas com evidência abaixo.

## Problem Statement

### O que se observa

Ao longo de um dia de trabalho, em ~10 rodadas completas: de 0 a 3 testes falham
por rodada, nunca os mesmos. Já falharam `App.onboarding`, `weight-scope`,
`session.share`, `session`, `assistant`, `notes`, `cardio-back` e
`videos.integration`. Rodados **um a um**, todos passam.

### Duas ceilings distintas, ambas em valor padrão

O modo de falha não é único — são dois, e por isso mexer só em um não resolveria:

| Prazo | Padrão | Quem impõe | Como aparece |
|---|---|---|---|
| `testTimeout` | 5 000 ms | vitest | `Error: Test timed out in 5000ms.` |
| `waitFor` / `findBy*` | 1 000 ms | Testing Library | `Unable to find an element…` |

Ambos foram vistos hoje, em rodadas diferentes.

### Por que esses testes chegam perto do teto

**41 dos 76 arquivos montam o `<App/>` inteiro.** Não é um exagero destes
testes: é o que dá a eles o valor que têm — foram eles que pegaram, só hoje, uma
violação das Rules of Hooks, uma aba não conectada e um Voltar que caía na Home.
Mas cada um deles monta o roteador, o tema, o banco falso e a árvore inteira, e
então aguarda o Dexie responder por `liveQuery`.

O custo aparece somado no relatório do vitest: **environment 199 s**, **collect
90 s**, **setup 60 s** — contra 51 s de relógio de parede. A suíte é um enxame de
ambientes jsdom caros, e um teste que normalmente leva 900 ms passa de 1 000 ms
quando o escalonador olha para outro lado.

### Quem é afetado

Quem for rodar isto em CI. Hoje o vermelho é distinguível do vermelho de verdade
só rodando de novo — o que é exatamente o hábito que uma suíte confiável existe
para não ensinar.

## Proposed Solution

### 1. Escolher os prazos, em vez de herdá-los

Os padrões do vitest e da Testing Library foram calibrados para **teste de
unidade**: uma função, uma asserção, milissegundos. Esta suíte é dominada por
teste de integração que monta um app sobre um IndexedDB falso. O prazo certo para
um não é o prazo certo para o outro.

Os números novos ficam em `vitest.config.ts` e `vitest.setup.ts`, **com a razão
ao lado** — para serem uma decisão revisável, e não um default que ninguém
lembra de ter aceitado.

### 2. Manter a lentidão visível

Subir um teto sem mais nada cria um lugar onde a lentidão se esconde: um teste
que passe de 900 ms para 4 s deixaria de falhar e ninguém saberia. Por isso o
`slowTestThreshold` passa a ser explícito, para que o relatório **nomeie** o teste
que ficou lento mesmo quando ele ainda passa.

É o que separa esta mudança de simplesmente afrouxar a régua: o teto sobe, e a
visibilidade sobe junto.

### 3. Registrar a decisão

Um documento curto — o que os números são, por que, e o que fazer quando um teste
alcançá-los (investigar o teste antes de subir o teto de novo). Sem isso, a
próxima pessoa a ver um vermelho intermitente sobe o número mais uma vez, e a
suíte vira uma catraca de tetos.

## Medições feitas, e o que elas descartam

Duas soluções óbvias foram testadas **antes** desta proposta e estão fora:

**Reduzir o número de workers.** A hipótese era contenção: 12 workers em 12 CPUs
não deixa folga. Medido em 12, 6 e 4 workers: **50 s de relógio nos três**, e uma
falha nos três. A contenção entre workers não é a causa dominante — o custo está
no ambiente por arquivo, que nenhum número de workers muda.

**`isolate: false`** (reaproveitar o ambiente entre arquivos, atacando os 199 s).
Descartado por evidência direta: rodar em `singleThread` — que produz o mesmo
compartilhamento — fez falharem **outros** testes, porque o estado de módulo
(as stores Zustand, o cache de `lib/hooks`) vaza de um arquivo para o seguinte.
O isolamento por arquivo é o que mantém esses testes independentes; abrir mão
dele trocaria intermitência por dependência de ordem, que é pior.

## Scope

### In Scope

- `testTimeout` e `hookTimeout` explícitos em `vitest.config.ts`
- `asyncUtilTimeout` explícito em `vitest.setup.ts`
- `slowTestThreshold` explícito
- Documento curto com a razão dos números
- Rodar a suíte inteira **várias vezes** para verificar que ficou determinística

### Out of Scope

- **Reescrever os testes de integração.** Os 41 arquivos que montam o `<App/>`
  são a razão de a suíte pegar o que pega. Trocar integração por unidade
  economizaria segundos e custaria os bugs que ela encontra.
- **Trocar o ambiente** (jsdom → happy-dom). Ganharia nos 199 s, mas troca a
  fidelidade do DOM por velocidade num app que depende de detalhes de layout e
  de APIs que o setup já teve de remendar.
- **`isolate: false` e mexer em workers** — medidos e descartados acima.
- **Paralelismo em CI.** Não há CI configurado neste repositório; propor sharding
  para uma esteira que não existe seria resolver um problema hipotético.
- **Acelerar os testes.** Um objetivo legítimo e uma mudança diferente. Esta
  quer que o vermelho signifique alguma coisa; velocidade vem depois, com a
  visibilidade que o `slowTestThreshold` passa a dar.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nada de produção é tocado |
| API | No | — |
| State | No | — |
| UI | No | — |
| Test config | Yes | `vitest.config.ts`, `vitest.setup.ts` e um documento |

**Nenhum arquivo de `src/` que vá para o bundle é alterado.** O risco de produção
desta mudança é zero por construção; o risco real é de teste, e está na tabela
abaixo.

## Architecture Considerations

**Prazo não é asserção.** Um teto de tempo diz quanto o runner espera antes de
desistir, não o que o teste afirma. Nenhuma asserção muda aqui, e nenhum teste
passa a aceitar um resultado que antes recusava — o que muda é a paciência do
runner com um resultado correto que demorou.

**O teto tem que doer em algum lugar.** Se subir o prazo fosse a mudança inteira,
o próximo teste a degradar passaria despercebido. O `slowTestThreshold` é o
contrapeso: o número que passou a ser tolerado no *falhar* continua sendo
reportado no *listar*.

**O isolamento por arquivo é uma feature.** As stores Zustand e o cache de
`lib/hooks` são estado de módulo, e o `vitest.setup.ts` já limpa o que consegue
por teste. O que o isolamento por arquivo garante é o resto. Isso ficou visível
ao medir `singleThread`, e é a razão de `isolate: false` estar fora de escopo em
vez de ser a solução preferida.

## Success Criteria

- [ ] A suíte completa passa **cinco vezes seguidas**, sem falha nenhuma
- [ ] Os dois modos de falha observados (`testTimeout`, `waitFor`) não reaparecem
- [ ] Nenhum teste é editado para passar — só os prazos mudam
- [ ] O relatório **nomeia** os testes lentos, e a lista é conhecida e registrada
- [ ] `vitest.config.ts` e `vitest.setup.ts` dizem por que os números são esses
- [ ] Nenhum arquivo de produção alterado
- [ ] `npx tsc -b --noEmit` limpo e `openspec validate --all --strict` sem falhas

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| O teto novo esconder uma degradação real de performance | Med | Med | É exatamente o que o `slowTestThreshold` explícito existe para evitar; a lista de lentos é registrada na mudança para servir de linha de base |
| Um teto alto demais transformar um deadlock em espera longa | Low | Med | Os números sobem para o mínimo que a evidência pede, não para "bem alto"; um teste que trave passa a levar o novo teto e aparece na lista de lentos |
| A intermitência ter outra causa além do prazo | Med | High | Cinco rodadas limpas é o critério de aceite justamente porque uma só não distinguiria sorte de correção; se reaparecer, a causa é outra e a mudança não deve ser arquivada |
| Alguém subir o teto de novo no próximo vermelho | Med | Med | O documento existe para isso: o primeiro passo diante de um teste que alcança o prazo é investigar o teste |

---

## Archive Information

**Archived:** 2026-08-20
**Duration:** mesmo dia (proposta, implementação e arquivamento em 2026-08-20)
**Outcome:** Successfully implemented, com um resíduo conhecido registrado abaixo

### Files Modified

- `vitest.config.ts` — `testTimeout`, `hookTimeout` e `slowTestThreshold`
  explícitos, com a razão e a medição ao lado
- `vitest.setup.ts` — `configure({ asyncUtilTimeout })` da Testing Library
- `TESTING.md` — **novo**: os números, a razão, a linha de base dos lentos, o
  que foi descartado e o que fazer quando um teste alcançar um prazo

**Nenhum arquivo de `src/` alterado.** O risco de produção é zero por
construção.

### Specs Updated

- `openspec/specs/testing/spec.md` — **capability nova**, 3 requisitos

### Verification

| | antes | depois |
|---|---|---|
| Rodadas completas vermelhas | **4 de 5** | **1 de 10** |
| Falhas por prazo | 15 | **0** |

- Rodadas 6 a 10: **cinco seguidas verdes**, 953/953 — o critério de aceite
- `npx tsc -b --noEmit` — limpo
- `openspec validate --all --strict` — 0 failed
- A suíte comprovadamente ainda reprova: `parseClock('2:10')` quebrado de
  propósito reprovou com `expected 130 to be 999`; restaurado, verde

### Correção feita durante a implementação

A proposta afirmava que o teste mais lento levava 6 498 ms. Ao medir de novo
verificou-se que aquela medição rodara **em paralelo com as rodadas do baseline**
— sob carga. Numa máquina ociosa o pior é ~2,1 s, folgado dentro dos 5 s
originais.

A correção reescreve o diagnóstico para melhor: o defeito nunca foi a **duração**,
foi a **margem**. Os mesmos testes que levam 2 s ociosos chegam a 6,5 s enquanto
76 ambientes jsdom sobem e descem. O comentário em `vitest.config.ts` foi
corrigido.

### Resíduo conhecido

Das 10 rodadas completas pós-mudança, **uma** falhou — e **não** por prazo:

    session.share.integration › builds a detailed card with weights and duration
    AssertionError: expected undefined to be '40 KG'

Assinatura diferente das duas que esta mudança ataca. Não reproduziu em 15
rodadas isoladas do arquivo nem nas 9 rodadas completas seguintes. Uma hipótese
(a chave de cache de `useCachedLiveQuery` ignorando o `gymId`) foi levantada e
**descartada** ao ler o código: a chave inclui as deps. A causa segue
desconhecida.

Registrado em `TESTING.md` com a instrução certa: se reaparecer, é corrida real e
merece investigação própria — **não** aumento de prazo, que não a consertaria.

Ou seja: a causa dominante está resolvida e o critério de aceite foi cumprido,
mas esta mudança **não** afirma que a suíte ficou determinística.
