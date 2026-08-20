# Implementation Tasks: Uma Suíte que Só Fica Vermelha Quando Algo Quebrou

**Change ID:** `stabilize-test-suite`

---

## Phase 1: Foundation (Linha de base)

Antes de mexer em qualquer prazo, medir o que se tem — sem linha de base não há
como afirmar depois que ficou determinística.

- [x] 1.1 Rodar a suíte completa **cinco vezes**, registrando quais testes
      falharam em cada rodada e com qual das duas mensagens
      → **4 de 5 vermelhas**. Rodada 1: limpa. Rodada 2: **10 falhas**, todas
      `Test timed out in 5000ms` (essa rodada dividia a máquina com outra suíte).
      Rodadas 3 e 4: 2 falhas cada, `Unable to find role="button" and name
      "Começar do zero"`. Rodada 5: 1 falha. Os dois modos confirmados.
- [x] 1.2 Rodar isoladamente cada arquivo que falhou, confirmando que passa —
      se algum falhar isolado, a causa é outra e a proposta muda
      → os 6 arquivos passam isolados: `App.onboarding`, `videos.integration`,
      `weight-scope`, `session.integration`, `backup-restore`, `alternatives`.
- [x] 1.3 Registrar a lista dos testes mais lentos com o
      `slowTestThreshold` atual, para servir de linha de base
      → registrada. **Correção importante**: a primeira medição (pior caso
      6 498 ms) foi feita com as rodadas do baseline em paralelo, ou seja **sob
      carga**. Numa máquina ociosa o pior é ~2,1 s. A distinção é o diagnóstico
      inteiro: o defeito era a margem, não a duração.

**Quality Gate:** PASSED
- [x] A linha de base está escrita neste arquivo, não só no terminal
- [x] Nenhum arquivo falha isolado

---

## Phase 2: Business Logic (Os prazos)

- [x] 2.1 `vitest.config.ts`: `testTimeout` e `hookTimeout` explícitos, com o
      comentário dizendo que a suíte é dominada por integração que monta o
      `<App/>` sobre IndexedDB falso — e por que o padrão de unidade não serve
- [x] 2.2 `vitest.setup.ts`: `configure({ asyncUtilTimeout })` da Testing
      Library, com a mesma razão ao lado
- [x] 2.3 Escolher os números a partir da **linha de base**, não por chute: o
      mínimo que cobre a pior duração observada com folga, e não "bem alto"
      → `testTimeout`/`hookTimeout` 20 s (~3× o pior sob contenção, ~10× o
      pior ocioso); `asyncUtilTimeout` 5 s, deliberadamente **abaixo** do
      `testTimeout` para preservar a mensagem "Unable to find …";
      `slowTestThreshold` 2 s, que deixa a lista ociosa com 2 nomes.
- [x] 2.4 `slowTestThreshold` explícito, para que a lentidão continue nomeada
      no relatório mesmo passando

**Quality Gate:** PASSED
- [x] Nenhum teste editado — só configuração
- [x] Nenhum arquivo de `src/` alterado

---

## Phase 3: User Interface

Não se aplica: esta mudança não toca em nada que o usuário veja.

- [x] 3.1 Confirmar, por `git diff --stat`, que nenhum arquivo de produção
      entrou na mudança

**Quality Gate:** PASSED
- [x] O diff é só de configuração de teste e de documentação

---

## Phase 4: Integration & Polish

- [x] 4.1 i18n: não se aplica
- [x] 4.2 Rodar a suíte completa **cinco vezes seguidas**, todas verdes
      → **rodadas 6 a 10: cinco seguidas verdes**, 953/953. Critério atingido.
      Nas 10 rodadas pós-mudança houve **zero** falhas por prazo (contra 4 de 5
      rodadas vermelhas antes).
- [x] 4.3 Registrar a nova lista de testes lentos e compará-la com a linha de
      base da Phase 1 — se algum ficou mais lento, é achado, não ruído
      → 2 testes acima de 2 s numa máquina ociosa (~2 070 ms e ~2 040 ms),
      registrados em `TESTING.md` como linha de base.
- [x] 4.4 Documento curto (`openspec/project.md` ou um `TESTING.md`) com os
      números, a razão e o que fazer quando um teste alcançar o prazo
- [x] 4.5 `npx tsc -b --noEmit` e `openspec validate --all --strict`
- [x] 4.6 Conferir que a suíte ainda **falha** quando deve: quebrar uma
      asserção de propósito, ver o vermelho, desfazer
      → quebrei `parseClock('2:10')` para 999: reprovou com
      `expected 130 to be 999`. Restaurado, 12/12 verde.

**Quality Gate:** PASSED
- [x] Cinco rodadas completas verdes
- [x] A suíte comprovadamente ainda reprova um teste quebrado
- [x] `openspec validate --all --strict` — 0 failed

---

### Resíduo conhecido

Das 10 rodadas completas pós-mudança, **uma** falhou — e **não** por prazo:

    session.share.integration › builds a detailed card with weights and duration
    AssertionError: expected undefined to be '40 KG'

Assinatura diferente das duas que esta mudança ataca. Não reproduziu em 15
rodadas isoladas do arquivo, nem nas 9 rodadas completas seguintes. Registrado em
`TESTING.md`: se reaparecer, é corrida real e merece investigação própria — não
aumento de prazo, que não a consertaria.

O critério de aceite (cinco rodadas seguidas verdes) foi atingido nas rodadas
6–10. Este resíduo é conhecido, não silenciado.

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
