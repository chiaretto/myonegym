# Testes

## O que esta suíte é

76 arquivos, ~950 testes. **41 deles montam o `<App/>` inteiro** sobre um
IndexedDB falso (`fake-indexeddb`) e esperam o Dexie responder por `liveQuery`.

Isso é caro e é de propósito: são esses testes que pegam fiação errada — uma
aba que não foi ligada, um `Voltar` que cai na tela errada, um hook atrás de um
early return. Nenhum teste de unidade encontraria nada disso.

O preço aparece no relatório: cerca de **200 s de `environment`** somados entre
os workers, para ~50 s de relógio de parede.

## Os prazos, e por que são esses

| Prazo | Padrão da ferramenta | Aqui | Onde |
|---|---|---|---|
| `testTimeout` | 5 000 ms | **20 000 ms** | `vitest.config.ts` |
| `hookTimeout` | 10 000 ms | **20 000 ms** | `vitest.config.ts` |
| `asyncUtilTimeout` (`waitFor`, `findBy*`) | 1 000 ms | **5 000 ms** | `vitest.setup.ts` |
| `slowTestThreshold` | 300 ms | **2 000 ms** | `vitest.config.ts` |

Os padrões são calibrados para teste de **unidade**. Numa máquina ociosa o teste
mais lento daqui leva ~2,1 s, o que caberia nos 5 s; mas a suíte não roda numa
máquina ociosa — ela roda enquanto 76 ambientes jsdom sobem e descem. Sob essa
contenção os **mesmos** testes foram medidos entre 4 s e 6,5 s. O defeito era a
margem, não a duração.

Antes desta configuração: **quatro de cinco rodadas completas vermelhas**, nunca
nos mesmos testes, e todo arquivo passando quando rodado sozinho.

### Duas regras que os números seguem

**`asyncUtilTimeout` fica abaixo de `testTimeout`.** Se a espera assíncrona
desistir primeiro, o erro é `Unable to find role="button" and name "X"` — que diz
o que faltou. Se o teste estourar primeiro, o erro é um timeout pelado, que não
diz nada. A ordem preserva a mensagem útil.

**`slowTestThreshold` é o contrapeso.** Subir um teto sem ele cria um lugar onde
a lentidão se esconde: um teste que fosse de 900 ms para 4 s pararia de reprovar
e ninguém saberia. O limiar mantém o relatório **nomeando** o que está lento
mesmo quando passa.

## Quando um teste alcançar o prazo

**Investigue o teste antes de subir o número.** Subir o teto é a resposta certa
quando o prazo é que estava errado, e a errada quando o teste degradou. Não
distinguir os dois casos transforma esta tabela numa catraca que só sobe.

Ordem sugerida:

1. Rode o arquivo **sozinho** (`npx vitest run <arquivo>`). Se falhar sozinho,
   não é prazo — é o teste ou o código.
2. Rode-o em laço isolado (10–15 vezes). Uma falha intermitente isolada é uma
   corrida de verdade, e o consertável é a corrida.
3. Só se ele passar isolado e falhar em conjunto é que a suspeita volta a ser
   contenção.

## Linha de base dos lentos

Máquina ociosa, limiar de 2 s — se esta lista crescer, a suíte ficou mais lenta:

- `notes.integration` › *adds a note during a session…* — ~2 070 ms
- `weight-scope.integration` › *saves globally by default…* — ~2 040 ms

## O que foi medido e descartado

**Reduzir workers.** Testado com 12, 6 e 4: ~50 s de relógio nos três, e falha
nos três. A contenção entre workers não é a causa dominante — o custo está no
ambiente por arquivo, que nenhum número de workers muda.

**`isolate: false`** (reaproveitar o ambiente entre arquivos, para atacar os
200 s). Descartado por evidência: rodar em `singleThread`, que produz o mesmo
compartilhamento, faz falharem **outros** testes — o estado de módulo (as stores
Zustand, o cache de `lib/hooks`) vaza de um arquivo para o seguinte. O
isolamento por arquivo é o que mantém estes testes independentes; abrir mão dele
troca intermitência por dependência de ordem, que é pior.

## Resíduo conhecido

Em 10 rodadas completas depois desta mudança, **uma** falhou — e não por prazo:
`session.share.integration` › *builds a detailed card with weights and duration*,
com `expected undefined to be '40 KG'`. Não reproduziu em 15 rodadas isoladas do
arquivo nem nas 9 rodadas completas seguintes.

Se reaparecer, é uma corrida real e merece investigação própria — **não** um
aumento de prazo, que não a consertaria.
