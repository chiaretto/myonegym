# Proposal: Iniciar desabilitado enquanto há um treino em andamento

**Change ID:** `disable-start-during-session`
**Created:** 2026-08-02
**Status:** Implementation Complete
**Completed:** 2026-08-02

---

## Problem Statement

Só pode existir **uma sessão em andamento por academia** (`workout-sessions` →
*Single Active Session Per Gym*). A Home já reflete isso **num** dia: o dia da
sessão aberta troca "Iniciar" por **"Continuar"**, com o pill vermelho rotulado.

Os **outros dias**, porém, continuam exibindo o mesmo botão vermelho de iniciar
que exibiriam se nada estivesse aberto. Eles mentem duas vezes:

- **Visualmente**, prometem uma ação que a regra de negócio não permite. Nada na
  tela diz que aquele "Iniciar" não vai iniciar nada.
- **No toque**, `HomePage.tsx:154-159` não inicia a sessão pedida: mostra o toast
  "Você já tem um treino em andamento." e **navega para a sessão de outro dia**.
  O usuário tocou em "Iniciar" no Dia 3 e caiu dentro do treino do Dia 1.

Quem é afetado: qualquer pessoa que deixe um treino aberto e volte para a Home —
o caso normal, já que a Home é a tela de entrada do app. O custo é uma navegação
inesperada e a descoberta por tentativa e erro de uma regra que a interface tinha
como mostrar de graça.

## Proposed Solution

Enquanto a **academia ativa** tiver uma sessão em andamento, os botões de iniciar
dos **demais** dias passam a se apresentar como **desabilitados**: cinza, sem o
gradiente vermelho e sem a sombra do accent. O dia da sessão mantém o
"Continuar" exatamente como hoje — ele é o único caminho aberto, e o contraste
entre um pill vermelho e vários círculos cinza é justamente o que aponta para
ele.

Decisões de implementação:

- **`aria-disabled="true"`, e não o atributo `disabled`.** Um botão `disabled`
  não recebe evento nenhum: num aparelho de toque, tocá-lo não produz resposta
  alguma, e a spec desta Home já registra que "a ausência de resposta se lê como
  travamento" (*Training Day Card*). Com `aria-disabled` o botão continua
  focável, continua anunciado como desabilitado pela tecnologia assistiva, e o
  toque continua podendo **explicar o porquê**.
- **O toque explica, mas não navega.** O toast permanece; a navegação para a
  sessão de outro dia sai. "Iniciar" no Dia 3 nunca deve abrir o treino do
  Dia 1 — se o usuário quer retomar, o "Continuar" está a um toque de distância,
  agora sendo o único botão colorido da tela.
- **Nada de cinza enquanto a resposta não chega.** `useActiveSession` devolve
  `undefined` enquanto lê. Pintar cinza nesse intervalo faria os botões piscarem
  a cada volta para a Home — o mesmo defeito que a spec `app-foundation` já
  proíbe para estados vazios, e que `isFeatured` já evita com `=== null`.

## Scope

### In Scope

- Estado visual desabilitado (cinza) do `.day-start` nos dias sem a sessão ativa.
- `aria-disabled` no mesmo botão, para a tecnologia assistiva.
- Remover a navegação para a sessão de outro dia no toque do botão cinza,
  mantendo o toast explicativo.
- Delta na capability `home-navigation`.

### Out of Scope

- Qualquer mudança no "Continuar" do dia da sessão — permanece como está.
- Bloquear o **início** de sessões em outra camada; a regra já existe e é
  aplicada no repositório (`startSession`). Esta mudança é sobre **mostrar** a
  regra, não sobre reforçá-la.
- Desabilitar a expansão do dia, a lista de exercícios ou a navegação para o
  detalhe: só o botão de iniciar fica indisponível.
- Sessões de **outras** academias — a sessão em andamento é por academia, e trocar
  a academia ativa já devolve todos os botões ao normal.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nenhum dado novo; o estado já vem de `useActiveSession(activeGymId)` |
| API | No | — |
| State | No | Deriva de `activeSession` + `day.id`, já disponíveis em `HomePage` |
| UI | Yes | `HomePage.tsx` (classe + `aria-disabled` + `onStart`) e `session.css` (variante cinza do `.day-start`) |

## Architecture Considerations

Encaixa no padrão que a Home já usa: `isResume` e `isFeatured` são derivados em
tempo de render a partir de `activeSession`, e o novo `isBlocked` é o terceiro
derivado da mesma fonte — nenhum estado novo, nenhuma migração.

O CSS entra em `session.css`, onde `.day-start` já mora, junto da variante
`icon-only`. A variante cinza precisa conviver com a regra
`.day:not(.featured) .day-start:not(.resume)`, que reduz o botão ao glifo: um
botão bloqueado é sempre não-featured e não-resume, então ele **já** é o círculo
de 2em — a variante nova só troca o preenchimento e a sombra, não a forma.

`new-design/css/session.css` é a cópia de referência do style guide e traz o
seletor `.icon-only` para exibir a variante fora de um `.day`; a variante
bloqueada segue a mesma convenção, para as duas cópias continuarem espelhadas.

## Success Criteria

- [ ] Com uma sessão aberta no Dia 1, os botões de iniciar dos demais dias são
      cinza e anunciados como desabilitados
- [ ] O "Continuar" do Dia 1 continua vermelho, rotulado e funcional
- [ ] Tocar num botão cinza explica o motivo e **não** navega para a sessão
- [ ] Sem sessão aberta, todos os botões voltam ao vermelho de hoje
- [ ] Nenhum botão pisca cinza enquanto a leitura da sessão não respondeu
- [ ] Trocar para uma academia sem sessão em andamento devolve todos os botões

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| O cinza cai abaixo do contraste mínimo sobre `--surface-1` | Med | Med | Usar tokens já publicados (`--surface-2/3` + `--text-secondary`) e conferir o contraste do glifo |
| O botão cinza parece inerte e o usuário acha que o app travou | Low | Med | `aria-disabled` em vez de `disabled`: o toque responde com o toast que explica |
| Perda do atalho atual "toquei em qualquer Iniciar e caí na sessão" | Low | Low | Intencional; o "Continuar" fica sendo o único botão colorido, e ele é o atalho |
| Piscada cinza a cada volta para a Home | Med | Med | Só bloquear quando `activeSession` já respondeu (`!== undefined`), como `isFeatured` já faz |

---

## Archive Information

**Archived:** 2026-08-02
**Duration:** mesmo dia (proposta, implementação e arquivamento)
**Outcome:** Successfully implemented

### Files Modified

- `src/features/home/HomePage.tsx` — `isBlocked` (o terceiro derivado de
  `activeSession`, ao lado de `isResume` e `isFeatured`); `aria-disabled` e a
  classe `.blocked` no botão; `onStart` deixa de navegar para a sessão de outro
  dia e passa a apenas explicar
- `src/features/session/session.css` — variante `.day-start.blocked`
- `new-design/css/session.css`, `new-design/style-guide.html` — variante
  espelhada na cópia de referência e demonstrada no style guide
- Testes: `src/features/home/home.integration.test.tsx` (cinco casos novos),
  `src/features/session/session.integration.test.tsx` (um caso que afirmava o
  comportamento antigo)

Nenhuma mudança em `src/db/` — sem schema, sem migração, sem repositório. A
regra "uma sessão por academia" já existia e já era aplicada em `startSession`;
esta mudança só a tornou visível.

### Specs Updated

- `openspec/specs/home-navigation/spec.md` — *Start or Resume a Workout From a
  Day* modificado: quatro parágrafos novos (estado desabilitado visível e
  anunciado, o toque que explica sem navegar, o bloqueio só depois da resposta,
  o escopo por academia) e sete cenários novos

### Notas de implementação

**`aria-disabled`, não o atributo `disabled`.** Um botão `disabled` não recebe
evento nenhum; num aparelho de toque isso é indistinguível de um app travado — o
mesmo argumento que já fez o cabeçalho inteiro do card ser tocável. O botão
continua focável, anuncia-se desabilitado e ainda responde ao toque com o motivo.

**A borda não estava na proposta.** `--surface-3` sobre o card `--surface-1` dá
1,2:1: o círculo deixava de parecer um controle. `--border-strong` devolve a
aresta, e `box-sizing: border-box` (global) mantém os 33px que ele divide com a
pílula rotulada ao lado. Glifo em `--text-secondary` sobre `--surface-3` = 4,9:1,
acima dos 3:1 exigidos para elemento não-textual.

**O teste da piscada precisou fixar o hook.** A primeira versão — sem sessão no
banco, amostrando o DOM durante todo o assentamento — passava com o guard
quebrado de propósito (`activeSession !== null && …`, certo para `null` e errado
para `undefined`), porque no ambiente de teste os cards nunca chegam à tela antes
de a leitura da sessão responder: a janela que interessa não existia para ser
observada. A versão final segura `useActiveSession` em `undefined` via `vi.mock`;
verificado que falha com aquele guard e passa com o atual.

**A verificação visual não é automatizável aqui.** Não há Playwright nem
Puppeteer no projeto. O contraste foi calculado, a regra foi conferida no bundle
de produção e o comportamento está coberto por teste, mas "só o Continuar aparece
colorido" é julgamento visual — conferido pelo usuário no dev server antes do
arquivamento.
