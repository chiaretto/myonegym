# Delta: app-foundation

**Change ID:** `float-the-rest-timer`
**Affects:** o que um recarregamento custa durante um treino

---

## MODIFIED Requirements

### Requirement: An Update Never Interrupts a Workout

Aplicar uma versão nova **recarrega a página**, e recarregar durante um treino
custa **a posição da rolagem** e o baque de a tela sumir no meio de uma série. O
treino em si sobrevive (está no IndexedDB).

**CHANGED — o cronômetro saiu desta lista.** Ele era o primeiro item do que se
perdia num recarregamento; agora o instante de início dele é guardado junto das
preferências e a contagem volta certa (ver *A Running Rest Timer Outlives the
Screen That Started It*, em `workout-sessions`). O que restou é razão suficiente:
uma tela que se recarrega sozinha no meio de uma série continua sendo uma
interrupção, e a rolagem continua se perdendo.

Por isso a verificação **automática** MUST NOT acontecer enquanto uma tela de
sessão de treino está em primeiro plano. A verificação é adiada, não cancelada:
ela volta a acontecer no próximo retorno ao primeiro plano fora da sessão.

O **botão** das Configurações MUST continuar funcionando em qualquer momento,
inclusive com um treino aberto. Quem toca nele está pedindo a atualização de
olhos abertos, e a tela avisa que o app vai recarregar.

#### Scenario: Nada recarrega durante o treino
- GIVEN o usuário está numa tela de sessão de treino, com o cronômetro correndo
- WHEN o app volta ao primeiro plano
- THEN nenhuma verificação automática é disparada
- AND o cronômetro continua de onde estava

#### Scenario: A verificação adiada acontece depois
- GIVEN uma verificação automática foi pulada por causa de um treino aberto
- WHEN o usuário encerra o treino e volta ao app mais tarde
- THEN a verificação acontece normalmente

#### Scenario: Uma atualização pedida de propósito não custa o descanso
- GIVEN o cronômetro de descanso correndo
- WHEN o usuário aplica uma atualização pelas Configurações e o app recarrega
- THEN o cronômetro volta contando, de onde estava

---

## ADDED

(None)

---

## REMOVED

(None)
