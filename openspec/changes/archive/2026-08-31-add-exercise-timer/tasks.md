# Implementation Tasks: Cronômetro flutuante no exercício em sessão

**Change ID:** `add-exercise-timer`

---

## Phase 1: Foundation (Data Layer)

Nada a fazer. A contagem não é gravada em lugar nenhum: vive na tela e morre com
ela, e é justamente por isso que não há migração, campo novo nem repositório
envolvido.

- [x] 1.1 Confirmar que nenhum arquivo em `src/db/` precisa mudar

**Quality Gate:** PASSED
- [x] Nenhum arquivo em `src/db/` alterado

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 `fmtLapse(ms)` em `lib/format.ts`: **só os segundos com unidade** abaixo de um minuto (`00s`, `59s`) e `mm:ss` a partir dele (`01:00`), com os **minutos crescendo** além de dois dígitos em vez de dar a volta (mesma regra que `fmtClock` aplica às horas)
- [x] 2.2 Testes unitários de `fmtLapse`: `0 → "00s"`, `999ms → "00s"` (nunca adianta um segundo), `59s → "59s"` (sem campo de minutos), `60s → "01:00"`, `90s → "01:30"`, `3600s → "60:00"`, `6000s → "100:00"`, negativo → `"00s"`
- [x] 2.3 Em `SessionEntryPage`, um `startedAt: number | null` de estado; alternar é `setStartedAt(startedAt ? null : Date.now())`
- [x] 2.4 Ligar ao `useElapsed(startedAt)` que já existe — sem novo `setInterval`, sem acumular, e ganhando o `visibilitychange` de graça
- [x] 2.5 **Zerar ao trocar de entrada, explicitamente** — `useEffect(() => setTimerStartedAt(null), [eId])`. Confirmado por mutação: removendo o efeito, o teste 4.6 falha e só ele

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] `fmtLapse` coberto por teste unitário

---

## Phase 3: User Interface

- [x] 3.1 Componente do botão (`ui/` ou `features/session/`), recebendo o tempo decorrido, o estado e o alternador — a página decide, o botão desenha
- [x] 3.2 Estado **parado**: ícone de relógio acima de `00s`
- [x] 3.3 Estado **correndo**: sem ícone, só o número; o espaço do ícone não pode fazer o círculo mudar de tamanho entre os dois estados
- [x] 3.4 Renderizar dentro do `.hero`, apenas na aba "Execução"
- [x] 3.5 `.hero` ganha `position: relative` (hoje não é posicionado) e o botão `position: absolute` no canto superior direito, **inteiramente dentro** das bordas — `.hero` tem `overflow: hidden` e corta o que passar
- [x] 3.6 Fundo próprio **opaco** no círculo: translúcido sobre uma foto clara perde o número
- [x] 3.7 Dimensionar em `em` a partir do número, com piso de alvo de toque confortável em 100% de escala
- [x] 3.8 Figuras tabulares no número — ele repinta a cada segundo, e dígitos proporcionais fazem a bolinha tremer
- [x] 3.9 Acessibilidade: nome acessível `Cronômetro, mm:ss` (o tempo entra no nome — um rótulo só "Cronômetro" deixaria quem usa leitor de tela com um cronômetro ilegível) e `aria-pressed` para correndo/parado
- [x] 3.10 Conferir no exercício **sem mídia** (`.media-fallback`), onde o botão tem de funcionar igual

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes de componente passam

---

## Phase 4: Integration & Polish

- [x] 4.1 Rótulos em pt-BR junto do resto (`Cronômetro`, `Iniciar`/`Parar`) — não há arquivo de i18n a sincronizar
- [x] 4.2 Teste: parado mostra `00:00` e o ícone; um toque inicia; o ícone some
- [x] 4.3 Teste: com o tempo controlado (`vi.useFakeTimers`), 60 s mostram `01:00`
- [x] 4.4 Teste: segundo toque volta a `00:00` e ao ícone
- [x] 4.5 Teste: trocar para "Notas" e voltar preserva a contagem
- [x] 4.6 Teste: **avançar para o próximo exercício zera** — o caso que a reconciliação do React quebra silenciosamente
- [x] 4.7 Teste: o botão não aparece fora da aba "Execução"
- [x] 4.8 Conferir que a Duração da sessão de cardio e o cronômetro coexistem sem se confundir
- [x] 4.9 Verificação visual em 390px, escalas 100% e 200%: o círculo não cobre o exercício nem transborda o card ✓ conferido pelo autor no navegador
- [x] 4.10 Verificar no app rodando: exercício com foto, sem foto, e o celular bloqueado no meio da contagem ✓ conferido pelo autor no navegador. O comportamento em si também é coberto por `elapsed.test.ts` ("resyncs when the app returns to the foreground" e "re-reads the clock instead of accumulating ticks"), herdado por vir do `useElapsed`

**Quality Gate:** PASSED (com ressalva de ambiente)
- [x] `npm test` — **990 testes, 79 arquivos, verde numa única execução** quando
  a máquina está descarregada (load ~3–5). Duas descobertas na verificação:
  - **Uma corrida real, minha, corrigida:** `weight-edit-scroll` esperava o
    rótulo virar "Definir" → "Editar" com o timeout padrão de 1 s, mas isso
    depende de uma cadeia Dexie → `resolveWeight` → re-render. Passava isolado e
    falhava na suíte. A espera passou a ter 3 s, que é o que a cadeia leva.
  - **O flake pré-existente continua, e é proporcional à carga:** com uma suíte
    Playwright de outro repositório rodando em paralelo (load 15–20 em 12
    núcleos), 1–8 testes estouram o timeout de 5 s por rodada. Ao longo de ~10
    execuções completas hoje, o conjunto que falha **muda toda vez** e nunca
    inclui os arquivos desta mudança; todos passam isolados. Já apareceram
    `App.onboarding`, `forms-as-pages`, `videos`, `weight-scope`, `day-nav`,
    `consistency`, `warmup`, `alternatives`, `detail-header`. É o que a branch
    `stabilize-test-suite` (commit `2c9bb86`, ainda fora da `main`) endereça.
  - Descartei causalidade do `.hero { position: relative }` rodando os arquivos
    suspeitos juntos e isolados da suíte: 65/65 verdes
- [x] `npm run typecheck` limpo
- [x] `npx openspec validate --specs --strict` limpo
- [x] Documentação sincronizada

---

## Completion Checklist

- [x] All phases complete (menos a verificação visual em navegador: 4.9, 4.10)
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
