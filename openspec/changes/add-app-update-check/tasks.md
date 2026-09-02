# Implementation Tasks: Atualizar o app pelas Configurações

**Change ID:** `add-app-update-check`

---

## Phase 1: Foundation (build e registro do service worker)

Não há camada de dados: nada aqui persiste. O "fundamento" desta mudança é o
build — de onde vem a versão exibida e quem registra o service worker.

- [x] 1.1 `vite.config.ts`: ler a `version` do `package.json` e injetar por `define` as constantes `__APP_VERSION__` e `__BUILD_TIME__` (ISO, `new Date()` no momento da configuração)
- [x] 1.2 `vite.config.ts`: `injectRegister: null` no `VitePWA` — o registro passa a ser do app, e sem isso haveria dois registros do mesmo worker. Comentado ao lado
- [x] 1.3 `src/vite-env.d.ts`: `/// <reference types="vite-plugin-pwa/client" />` e a declaração das duas constantes globais
- [x] 1.4 `vitest.config.ts`: os mesmos `define`. **Revisado:** em vez de duplicar o literal nos dois arquivos, os dois importam `buildDefine()` de `scripts/buildInfo.ts` — dois valores copiados à mão sairiam de sincronia exatamente como o número de versão que este change existe para não deixar mentir. O helper aceita `MYONEGYM_BUILD_TIME`, que a suíte fixa num instante conhecido para poder afirmar a data renderizada
- [x] 1.5 `vitest.config.ts`: `resolve.alias` de `virtual:pwa-register` para `src/test/pwaRegister.ts` — o dublê devolve `registerSW` e, por padrão, **nenhum** service worker, que é o que o jsdom de fato tem
- [x] 1.6 `npm run build` verificado: `dist/index.html` não tem nenhuma referência a service worker (zero ocorrências), e o `workbox-window` entra pelo bundle do app — um registro só

**Quality Gate:** PASSED
- [x] `npx tsc --noEmit` limpo
- [x] `npm run build` gera `sw.js` e um único registro
- [x] Versão e stamp presentes no bundle (`"0.1.0"` e o instante ISO do build)

---

## Phase 2: Business Logic (estado)

- [x] 2.1 `src/lib/appUpdate.ts`, gêmeo de `src/lib/install.ts`: store zustand **sem `persist`** com `status` (`unsupported` | `idle` | `checking` | `uptodate` | `updating` | `error`) e `lastCheckedAt`; a versão instalada sai de `buildInfo`, uma constante do módulo (não é estado)
- [x] 2.2 `initAppUpdate()`: `registerSW({ immediate: true, onRegisteredSW })`, guarda o `ServiceWorkerRegistration` fora do store (objeto vivo do navegador, como o `deferred` de `install.ts`) e sai de `unsupported`
- [x] 2.3 `checkForUpdate()`: `registration.update()` ouvindo `updatefound` — é esse evento que separa "achou versão nova" de "já é a mais recente", porque com `skipWaiting` o worker novo pode já ter saído de `installing` quando `update()` resolve
- [x] 2.4 Verificação automática no início e em `visibilitychange` → visível, com intervalo mínimo de 15 min; silenciosa (não toca em `status`, e uma falha offline não vira notícia de quem não perguntou)
- [x] 2.5 Guarda de sessão: `isWorkoutScreen(pathname)` — casa `/session/:id` sob qualquer base, e **não** casa `/sessions` (Consistência é histórico, não treino). A verificação manual roda em qualquer tela
- [x] 2.6 `initAppUpdate()` chamado em `main.tsx`, ao lado de `initInstall()`, antes da primeira renderização
- [x] 2.7 `src/lib/appUpdate.test.ts` — 14 testes: os três desfechos, o piso de intervalo, a guarda de sessão (pulada durante o treino, feita depois), o silêncio da automática, a ausência de service worker, o erro de registro e o teardown. Tempo lido por `Date.now()` estufado, sem timers falsos

**Quality Gate:** PASSED
- [x] `npx tsc --noEmit` limpo
- [x] 14/14 testes de unidade passam, sem depender de relógio real

---

## Phase 3: User Interface

- [x] 3.1 `src/features/settings/UpdatePage.tsx` + rota `/settings/update` em `App.tsx`
- [x] 3.2 Linha "Atualizar app" no grupo **App** de `SettingsPage.tsx`, abaixo de "Instalar app", com a versão no subtítulo — mesma disciplina do `installSub`
- [x] 3.3 Bloco "Versão instalada" (número + `Build de dd/mm/aaaa hh:mm`) e a ação conforme o estado; `unsupported` explica e não mostra botão
- [x] 3.4 Resultado em palavras, distinguindo os três casos, mais "Última verificação às hh:mm" quando houve alguma
- [x] 3.5 Reaproveita `install.css` (hero, `group`, `row`, `ActionBar`); `update.css` só carrega o giro do ícone durante a verificação, desligado em `prefers-reduced-motion`
- [x] 3.6 `src/features/settings/update.integration.test.tsx` — 6 testes: a linha nas Configurações, a versão e a data na tela, os três desfechos do botão e o caso sem service worker

**Quality Gate:** PASSED
- [x] `npx tsc --noEmit` limpo
- [x] 6/6 testes de integração passam
- [x] Nenhum botão exibido onde ele não faria nada

---

## Phase 4: Integration & Polish

- [x] 4.1 Textos em pt-BR revisados (strings inline, como no resto do app)
- [ ] 4.2 Verificar em aparelho real: instalar a versão atual, publicar uma nova, e confirmar pelo botão que ela chega — Android e iOS. **Depende de deploy**, fica para o usuário depois do merge
- [ ] 4.3 Verificar o caminho automático: app em segundo plano, versão nova publicada, voltar ao app. Mesma dependência
- [ ] 4.4 Verificar a guarda: com um treino aberto e o cronômetro correndo, sair e voltar não recarrega o app. Mesma dependência
- [x] 4.5 Suíte completa: 1020/1021 passam. A única falha é **anterior a esta mudança** e não tem relação com ela — `cardio.integration.test.tsx > stars the calendar day a cardio was done on` falha igual em `origin/main` (verificado em worktree limpa). É dependente da data: hoje é dia 1º, e o dia anterior do teste cai no mês que a grade do calendário não desenha
- [x] 4.6 `openspec/project.md`: duas convenções novas — o app é quem registra o service worker (e por quê), e a versão vem de `scripts/buildInfo.ts`, nunca de um literal numa tela

**Quality Gate:** PASSED (com a ressalva de 4.2–4.4, que exigem deploy)
- [x] Suíte verde exceto a falha pré-existente de `cardio`
- [x] `npx tsc --noEmit` limpo
- [ ] Verificado em aparelho iOS e Android

---

## Completion Checklist

- [x] Phases 1–3 completas; Phase 4 completa no que não depende de deploy
- [x] Quality gates passados
- [x] Documentação sincronizada (`openspec/project.md`)
- [ ] Verificação em aparelho (4.2–4.4) — antes ou depois do merge, a critério do usuário
- [ ] Ready for `/openspec-archive`

---

## Notas de implementação

**A falha pré-existente da suíte.** `cardio.integration.test.tsx` reprova hoje
por causa da data do sistema, não por causa deste change — e isso contraria a
capability `testing` ("uma suíte só fica vermelha quando algo quebrou"). Fica
**registrado, não corrigido**: consertá-lo aqui misturaria dois assuntos num
diff só. Merece um change próprio.

**O que este change deliberadamente não faz.** Não troca `autoUpdate` por
`prompt`, não exibe faixa de "nova versão" fora das Configurações e não tem
changelog — tudo listado como fora de escopo na proposta.
