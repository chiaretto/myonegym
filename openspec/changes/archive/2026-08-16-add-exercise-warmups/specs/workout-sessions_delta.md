# Delta: workout-sessions

**Change ID:** `add-exercise-warmups`
**Affects:** `src/features/session/SessionEntryPage.tsx` (texto do requisito;
o comportamento vem do controle e do visualizador compartilhados)

---

## MODIFIED

### Requirement: Session Exercise Detail

*(única mudança: a aba "Execução" passa a oferecer o controle de
**aquecimento**; todo o resto do requisito permanece)*

O detalhe da entrada de sessão MUST continuar como está — abas "Execução",
"Observações" e "Foto" como primeiro controle abaixo da barra de título, a mídia
dentro de "Execução", as categorias e a nota em "Observações", as fotos em
"Foto", os rótulos de status acima das abas e a barra fixa embaixo. O peso alvo
segue ausente para exercícios de **Cardio**.

A aba **"Execução"** MUST oferecer, quando o exercício tem aquecimentos
vinculados, o mesmo controle de **aquecimento** do detalhe do catálogo (ver a
capability `warmups` e *Warmup Button on the Exercise Detail*, em `exercises`).
É durante o treino que se aquece: obrigar a sair da sessão para consultar
derrotaria o propósito.

Fechar o visualizador MUST devolver o usuário **à mesma entrada e à mesma aba**,
com a sessão inalterada — abrir um aquecimento MUST NOT marcar nada como feito,
nem avançar o stepper.

Enquanto uma **alternativa** está sendo vista, o controle MUST refletir o
exercício **exibido**, como as três abas já fazem: é o aquecimento daquele
movimento que interessa a quem está decidindo fazê-lo.

#### Scenario: Aquecimento a partir da sessão
- GIVEN uma sessão em andamento e "Supino", que tem dois aquecimentos
- WHEN o usuário abre o detalhe da entrada e toca o controle de aquecimento
- THEN o visualizador abre com os aquecimentos do "Supino"

#### Scenario: Fechar não mexe na sessão
- GIVEN o visualizador aberto a partir de uma entrada de sessão
- WHEN o usuário fecha
- THEN volta à mesma entrada, na aba "Execução"
- AND nada foi marcado como concluído e o stepper não avançou

#### Scenario: A alternativa traz o próprio aquecimento
- GIVEN o usuário está vendo uma alternativa dentro da sessão
- WHEN observa a aba "Execução"
- THEN o controle de aquecimento reflete o exercício **exibido**, não o da
  entrada

#### Scenario: Sem aquecimento, sem controle
- GIVEN a entrada é de um exercício sem aquecimentos
- WHEN o usuário abre o detalhe
- THEN nenhum controle de aquecimento é exibido

---

## ADDED

(Nenhum.)

## REMOVED

(Nenhum.)
