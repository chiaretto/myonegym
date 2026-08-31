# Proposal: Cronômetro flutuante no exercício em sessão

**Change ID:** `add-exercise-timer`
**Created:** 2026-08-31
**Status:** Implementation Complete
**Completed:** 2026-08-31

---

## Problem Statement

O descanso entre séries é parte do treino, e hoje o app não o mede. Quem quer
respeitar 90 segundos entre as séries do supino precisa sair do MyOneGym, abrir
o cronômetro do sistema, voltar, e repetir isso a cada série — com o celular na
mão, entre um peso e outro.

A tela onde isso acontece é `/session/:id/entry/:entryId`, aba "Execução": é
onde o usuário passa o treino inteiro, uma entrada por vez, e é a única tela do
app que ele fica olhando entre uma série e a próxima. Ela mostra a mídia, o
aquecimento, o peso alvo e as alternativas — tudo sobre *como* executar — e nada
sobre *quando* voltar a executar.

**Afetados:** todo usuário que descansa entre séries, ou seja, todo mundo que
faz musculação.

**O que não é o problema:** o relógio da sessão. Ele já existe (`Duração`,
visível numa sessão de cardio ativa) e mede outra coisa — o treino inteiro,
desde o "Iniciar". Ninguém descansa desde o início do treino.

## Proposed Solution

Um **botão-cronômetro flutuante**, sobreposto ao canto superior direito da
**imagem do exercício**, na aba "Execução".

**Duas caras, um toque para alternar:**

- **Parado** — um círculo com o ícone de relógio acima de `00s`. É o convite:
  o ícone diz o que a bolinha faz antes de ela ter feito qualquer coisa.
- **Correndo** — o ícone some e o círculo passa a ser só o número, subindo a
  cada segundo: `01s`, `02s`… `59s`, e então `01:00`. **Só os segundos enquanto
  não há minutos**: um campo que só sabe dizer `00` é um campo sem informação, e
  os dígitos que importam ganham o espaço dele. A unidade fica enquanto eles
  estão sozinhos — um `45` ao lado de um relógio poderia ser minutos — e sai
  quando os dois-pontos passam a dizer quais são os campos. Um segundo toque
  volta ao ícone e a `00s`.

**Sobre a imagem, não abaixo dela:** o cronômetro não é conteúdo do exercício,
é uma ferramenta usada enquanto se olha para ele. Colocado abaixo, empurraria o
peso alvo para fora da dobra numa tela que já é a mais rolada do app; colocado
sobre a imagem, ele não custa nenhuma altura e cai onde o polegar direito já
está.

**Ele sobrevive à troca de aba.** Conferir a nota do aparelho ou a foto no meio
do descanso não pode matar a contagem — sair da "Execução" apenas esconde o
botão (não há imagem nas outras abas), e voltar mostra a contagem onde ela
chegou. **Trocar de exercício zera:** o descanso é daquela série, e carregá-lo
para o próximo exercício mediria um intervalo que ninguém pediu.

**Aproveita o que já existe.** `useElapsed` (em `lib/elapsed.ts`) já resolve a
parte difícil: relê `Date.now()` a cada tique em vez de acumular, então um
intervalo estrangulado custa um repintar tardio e nunca um número errado, e
reage a `visibilitychange` — que é exatamente o caso do celular no bolso durante
o descanso. O cronômetro passa a ser o segundo cliente dela.

## Scope

### In Scope
- Botão-cronômetro sobre a imagem, na aba "Execução" do exercício em sessão
- Alternar parado/correndo por toque, com as duas aparências descritas
- Contagem crescente em mm:ss, com os minutos crescendo além de dois dígitos
- Sobreviver à troca de aba; zerar ao trocar de exercício
- Formatador mm:ss em `lib/format.ts`, irmão do `fmtClock` existente

### Out of Scope
- **Contagem regressiva** e alarme ao fim — é outra funcionalidade (escolher a
  duração, avisar, e o que "avisar" significa num PWA sem notificações)
- **Persistir** a contagem entre recarregamentos, ou continuar rodando fora da
  tela do exercício
- Registrar o descanso no histórico da sessão, ou qualquer gravação em banco
- O cronômetro no detalhe do **catálogo** (`/exercise/:id`): fora de um treino
  não há descanso para medir
- Som, vibração ou notificação
- Configurar a posição do botão

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nada é gravado; a contagem vive na tela e morre com ela |
| API | No | Nenhuma função de `db/repos` é chamada |
| State | No | Um `useState` na página, alimentando o `useElapsed` que já existe |
| UI | Yes | `SessionEntryPage`, um componente de botão novo, `session.css`, `global.css` (`.hero` ganha `position: relative`), `lib/format.ts` |

## Architecture Considerations

- **`useElapsed` é reaproveitado, não copiado.** Ele recebe `startedAt | null` e
  devolve os milissegundos decorridos; passar `null` é literalmente "parado".
  A alternância vira `setStartedAt(running ? null : Date.now())`.
- **`fmtClock` não serve**: devolve `hh:mm:ss`, e `00:00:45` numa bolinha é
  ruído. Um `fmtLapse(ms)` novo devolve `mm:ss`, e — seguindo a mesma regra que
  `fmtClock` já aplica às horas — deixa os **minutos crescerem** além de dois
  dígitos em vez de dar a volta, para que um cronômetro esquecido leia como
  absurdo e não como recém-iniciado.
- **A página NÃO remonta ao trocar de exercício.** A rota é a mesma
  (`/session/:id/entry/:entryId`, só o parâmetro muda), então o React reconcilia
  o mesmo componente e todo `useState` sobrevive — é por isso que zerar ao
  trocar de entrada precisa ser **explícito**, e não sai de graça da montagem.
  Essa é a principal armadilha desta mudança.
- **`.hero` tem `overflow: hidden`** e não é posicionado. Sobrepor exige
  `position: relative` nele e `position: absolute` no botão, inteiramente dentro
  das bordas — qualquer transbordo é cortado, não exibido.
- **A imagem pode não existir.** O `.hero` cai para um `.media-fallback` quando
  o exercício não tem mídia; o botão MUST funcionar igual ali, porque o
  cronômetro não depende da foto.
- **Escala de fonte 100–200%** vale aqui: a bolinha e o número escalam com o
  texto, e o alvo de toque não pode encolher abaixo do confortável em 100%.

## Success Criteria

- [ ] Parado, o botão mostra o ícone de relógio acima de `00s`, no canto superior direito da imagem
- [ ] Um toque inicia a contagem e faz o ícone sumir; o número sobe a cada segundo
- [ ] Aos 60 segundos o botão mostra `01:00`
- [ ] Aos 59 s o botão mostra `59s`, sem campo de minutos
- [ ] Um segundo toque volta ao ícone e a `00s`
- [ ] Trocar para "Notas"/"Vídeos"/"Foto" e voltar mostra a contagem onde ela chegou
- [ ] Avançar para outro exercício mostra o cronômetro zerado e parado
- [ ] Funciona em exercício sem imagem
- [ ] A tecnologia assistiva sabe que é um cronômetro, quanto marca, e se está correndo
- [ ] `npm test` e `npm run typecheck` limpos

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| A contagem não zera ao avançar, porque a página não remonta | **Alta** | Médio | Reset explícito atrelado ao id da entrada, com teste que avança e confere `00:00` |
| Dois contadores na mesma tela numa sessão de cardio (Duração + cronômetro) | Média | Baixo | A Duração é rotulada e fica acima das abas; o cronômetro é uma bolinha sobre a imagem — leituras diferentes em lugares diferentes |
| O botão cobre parte útil da imagem | Média | Baixo | Círculo pequeno, no canto, sobre uma mídia que é `contain` e quase sempre tem margem ali |
| Contraste do número sobre uma imagem clara | Média | Médio | Fundo próprio opaco no círculo, não translúcido sobre a foto |
| Alvo de toque pequeno demais em 100% de escala | Média | Médio | Dimensionar em `em` a partir do número, com piso confortável, e conferir em 390px |
| O usuário espera alarme ao fim do descanso | Média | Baixo | Fora de escopo e declarado; este é um cronômetro crescente, não regressivo |

---

## Archive Information

**Archived:** 2026-08-31
**Duration:** mesmo dia (proposta, implementação e arquivamento)
**Outcome:** Successfully implemented

### Revisões durante a implementação

O formato do número foi revisado três vezes a pedido do autor, e o destino final
não é o da proposta original:

1. Nasceu `mm:ss` sempre (`00:00` parado). Vira **só os segundos** abaixo de um
   minuto e `mm:ss` a partir dele — um campo de minutos que só sabe dizer `00` é
   um campo sem informação, e o círculo é pequeno.
2. Os segundos sozinhos ganharam **unidade** (`01s`, `02s`): sozinhos são
   ambíguos, um `45` ao lado de um relógio poderia ser minutos. A unidade sai
   quando os dois-pontos passam a dizer quais são os campos.
3. A aparência começou com **duas cores** (tinta parado, sólido correndo) e
   passou a ter **uma só**: o ícone é a única diferença visual entre os estados.
   O botão também cresceu (~30%), ganhou fonte e padding maiores e encostou mais
   no canto.

### Descobertas de verificação

- **Uma corrida real num teste, corrigida.** `weight-edit-scroll` (da mudança
  anterior) esperava o rótulo virar "Definir" → "Editar" com o timeout padrão de
  1 s, mas isso depende de uma cadeia Dexie → `resolveWeight` → re-render.
  Passava isolado e falhava na suíte; a espera passou a ter 3 s.
- **A armadilha da proposta se confirmou.** Ao avançar de exercício a rota só
  troca um parâmetro, então o React reconcilia e o estado sobreviveria. O reset
  explícito foi verificado por mutação: removendo-o, falha exatamente um teste.
- **O flake pré-existente da suíte é proporcional à carga da máquina** e não tem
  relação com esta mudança (ver a ressalva em `tasks.md`).

### Files Modified
- `src/features/session/RestTimer.tsx` — o botão (novo)
- `src/features/session/rest-timer.integration.test.tsx` — 11 testes (novo)
- `src/features/session/SessionEntryPage.tsx` — estado do cronômetro e reset por entrada
- `src/lib/format.ts` + `format.test.ts` — `fmtLapse`, com 5 testes
- `src/features/session/session.css` — `.rest-timer`
- `src/styles/global.css` — `.hero` ganha `position: relative`
- `src/features/exercise/weight-edit-scroll.integration.test.tsx` — espera corrigida

### Specs Updated
- `openspec/specs/workout-sessions/spec.md` — +1 requisito (*Rest Timer on the
  Session Exercise Detail*), ~1 modificado (*Session Exercise Detail*)

### Verificação
- `npm test` — 79 arquivos, 988 testes passando, 2 pulados
- `npm run typecheck` — limpo
- `npx openspec validate --specs --strict` — 16/16
- Conferência visual (4.9, 4.10) — feita pelo autor no navegador
