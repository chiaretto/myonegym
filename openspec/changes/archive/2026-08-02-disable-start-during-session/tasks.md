# Implementation Tasks: Iniciar desabilitado enquanto há um treino em andamento

**Change ID:** `disable-start-during-session`

---

## Phase 1: Foundation (Data Layer)

Nenhuma mudança de dados. O estado necessário — a sessão em andamento da academia
ativa — já é lido por `useActiveSession(activeGymId)` em `HomePage.tsx`.

- [x] 1.1 Confirmar que `useActiveSession` distingue "ainda lendo" (`undefined`)
      de "não há sessão" (`null`), já que a distinção é o que evita a piscada
      ✓ 2026-08-02 — `src/lib/hooks.ts:157`, e o comentário de lá já registra que
      o default virou `undefined` exatamente por causa deste tipo de piscada

**Quality Gate:** PASSED
- [x] Nenhum schema, migração ou repositório tocado

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 Derivar `isBlocked` em `HomePage.tsx`: há sessão ativa **conhecida**
      (`activeSession != null`) e ela **não** é deste dia ✓ 2026-08-02
- [x] 2.2 Ajustar `onStart` para, quando o dia tocado não é o da sessão ativa,
      apenas exibir o toast explicativo — sem `nav(/session/...)` ✓ 2026-08-02
- [x] 2.3 Manter o caminho de retomada intacto: tocar no dia **da** sessão segue
      abrindo `/session/{id}` ✓ 2026-08-02

**Quality Gate:** PASSED
- [x] `tsc -b --noEmit` limpo
- [x] O toque num dia bloqueado não produz navegação

---

## Phase 3: User Interface

- [x] 3.1 Aplicar a classe de bloqueado ao `.day-start` e `aria-disabled="true"`
      quando `isBlocked`, preservando `aria-label="Iniciar"` ✓ 2026-08-02
- [x] 3.2 Adicionar a variante cinza em `src/features/session/session.css`:
      trocar `--accent-grad` por uma superfície neutra, remover a
      `box-shadow` do accent e apagar o glifo para `--text-secondary`,
      sem alterar a forma (o círculo de 2em já vem da regra `:not(.featured)`)
      ✓ 2026-08-02 — acrescentado `--border-strong` à volta: `--surface-3` sobre
      o card `--surface-1` dá só 1,2:1, e sem a borda o círculo deixava de
      parecer um controle
- [x] 3.3 Espelhar a variante em `new-design/css/session.css` e exibi-la no
      style guide (`new-design/style-guide.html`) ✓ 2026-08-02
- [x] 3.4 Manter `stopPropagation` no botão: mesmo bloqueado, ele não pode
      expandir o dia ✓ 2026-08-02 — o handler não foi tocado

**Quality Gate:** PASSED
- [x] `tsc -b --noEmit` limpo; `npm run build` gera a regra no bundle
- [x] Contraste conferido: glifo `--text-secondary` sobre `--surface-3` = 4,9:1,
      acima dos 3:1 exigidos para elemento não-textual

---

## Phase 4: Integration & Polish

- [x] 4.1 Testes de integração em `src/features/home/home.integration.test.tsx`
      ✓ 2026-08-02 — cinco casos: o dia bloqueado, o toque que explica sem
      navegar, o "Continuar" que segue retomando, o estado sem sessão, e a
      leitura ainda não respondida
- [x] 4.2 Atualizar `session.integration.test.tsx` — o caso
      "prevents a second active session and resumes instead" afirmava o
      comportamento antigo (tocar noutro dia caía no runner do Dia 1)
      ✓ 2026-08-02 *(tarefa não prevista; ver Notas)*
- [x] 4.3 Conferir na Home real, com uma sessão aberta, que só o "Continuar"
      aparece colorido ✓ 2026-08-02 — conferido pelo usuário no dev server
- [x] 4.4 Conferir que trocar a academia ativa para uma sem sessão devolve todos
      os botões ✓ 2026-08-02 — conferido pelo usuário no dev server
- [x] 4.5 Nenhuma string nova de i18n; o toast reaproveita a mensagem existente
      ✓ 2026-08-02

**Quality Gate:**
- [x] All tests pass — 426/426, 54 arquivos
- [x] `tsc -b --noEmit` limpo
- [x] Documentation synced (style guide + cópia de referência do CSS)

---

## Notas

**A piscada exigiu um teste com o hook fixado.** A primeira versão do teste
seguia o caminho honesto — nenhuma sessão no banco, amostrando o DOM ao longo de
todo o assentamento — e passava mesmo com o guard quebrado de propósito
(`activeSession !== null && …`, correto para `null` e errado para `undefined`).
No ambiente de teste os cards nunca chegam à tela antes de a leitura da sessão
responder, então a janela que interessa não existia para ser observada. O teste
final segura `useActiveSession` em `undefined` via `vi.mock` e afirma sobre o
quadro certo; verificado que ele **falha** com aquele guard e passa com o atual.

**Os itens 4.3 e 4.4 foram conferidos por olho humano.** Não há Playwright nem
Puppeteer neste projeto, então a verificação visual não pôde ser automatizada: o
contraste foi calculado, a regra foi conferida no bundle de produção e o
comportamento está coberto por teste, mas "só o Continuar aparece colorido" é um
julgamento visual. O usuário conferiu no dev server antes do arquivamento.

---

## Completion Checklist

- [x] All phases complete
- [x] All automated quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
