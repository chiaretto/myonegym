# Proposal: Atualizar o app pelas Configurações

**Change ID:** `add-app-update-check`
**Created:** 2026-09-01
**Status:** Implementation Complete
**Completed:** 2026-09-01

---

## Problem Statement

Uma versão nova entra no ar a cada push para `main` (GitHub Pages, ver
`.github/workflows/deploy.yml`), mas **o aparelho não descobre isso sozinho** —
e nada no app permite perguntar.

O motivo é como o service worker é atualizado. O navegador só busca um `sw.js`
novo quando há uma **navegação** dentro do escopo (ou a cada 24 h, no máximo).
Uma aba de navegador atende a esse gatilho ao recarregar; o app **instalado** —
que é justamente o modo que o projeto empurra desde a tela "Instalar app" — vive
em `display: standalone` e pode passar dias sendo aberto e fechado **sem uma
única navegação**: o sistema apenas retoma a página que já estava lá. iOS é o
caso pior, porque suspende e restaura o processo em vez de relançá-lo.

O resultado é o que o usuário observa: o site atualizado no desktop e o ícone da
tela inicial servindo uma versão de semanas atrás, sem nenhum caminho no app
para forçar a checagem. Hoje a única saída é desinstalar e instalar de novo.

Some-se a isso que **não há como saber qual versão está rodando**. Nem a tela de
Configurações, nem a de instalação, nem lugar nenhum exibe um número de versão —
então mesmo depois de tentar atualizar (fechando o app, limpando o cache) não há
como confirmar se funcionou.

**Afetados:** todo usuário com o app instalado — ou seja, o modo de uso
principal. O sintoma é silencioso: o app parece funcionar, só está velho.

## Proposed Solution

Uma página **Configurações → App → "Atualizar app"**, irmã de "Instalar app", que
faz três coisas.

### 1. Diz qual versão está rodando

Número da versão (`package.json`) e data/hora do build, injetados no bundle em
tempo de compilação por `define` no `vite.config.ts`. É um dado **do build**,
nunca digitado à mão numa tela — um número mantido manualmente mente na primeira
vez que alguém esquece de atualizá-lo, e é exatamente numa tela de "qual versão
eu tenho?" que a mentira custa caro.

### 2. Procura, baixa e aplica a atualização a pedido

O botão chama `registration.update()` — a mesma busca que o navegador faria
numa navegação, agora sob o dedo do usuário. Daí em diante o caminho que já
existe assume: o projeto usa `registerType: 'autoUpdate'`, então o service
worker novo instala, ativa (`skipWaiting`/`clientsClaim`) e o registrador do
`vite-plugin-pwa` recarrega a página no evento `activated`. Nada disso muda; só
ganha um gatilho manual.

O que a tela precisa acrescentar é **dizer o que aconteceu**, porque "não mudou
nada na tela" hoje cobre três casos diferentes: já está na versão mais recente,
está baixando uma nova, ou a verificação falhou (offline). Um botão que não
distingue os três é indistinguível de um botão quebrado.

### 3. Verifica sozinha ao voltar ao primeiro plano

O botão resolve o caso agudo; ele não resolve a causa. O app passa a chamar
`registration.update()` também **ao iniciar** e **ao voltar ao primeiro plano**
(`visibilitychange`), com um intervalo mínimo entre verificações — é o gatilho de
navegação que o modo standalone não oferece, reposto onde o usuário
naturalmente volta ao app. Silenciosa: sem faixa, sem toast, sem nada na tela.
Se achar versão nova, o caminho do `autoUpdate` recarrega a página como já faz
hoje.

**Com uma trava:** aplicar uma atualização recarrega a página, e recarregar no
meio de um treino zera o cronômetro de descanso e a posição da tela. A
verificação **automática** não roda enquanto uma tela de sessão está em primeiro
plano. O botão manual continua disponível ali — quem o aperta está pedindo.

### Como isso muda o registro do service worker

Hoje o `vite-plugin-pwa` injeta o `registerSW.js` no `index.html`
(`injectRegister: 'auto'`) e nenhum código do app toca no assunto — o que
significa que **não existe uma referência ao `ServiceWorkerRegistration`** para
chamar `update()`. A mudança passa o registro para o app:
`injectRegister: null` e uma chamada a `registerSW({ immediate: true,
onRegisteredSW })` a partir de `src/lib/appUpdate.ts`, no mesmo ponto de
`main.tsx` onde `initInstall()` já roda antes da primeira renderização.

O módulo novo é gêmeo de `src/lib/install.ts` de propósito: mesma forma (store
zustand + `init*()` chamado de `main.tsx`), mesma regra de **não persistir
nada** (o estado é da sessão do navegador), mesma disciplina de só mostrar botão
onde ele faz alguma coisa.

## Scope

### In Scope
- Página `/settings/update` e a linha que leva a ela, no grupo "App".
- Versão + data do build injetadas pelo `define` do Vite e exibidas na tela.
- Botão "Procurar atualização" com os estados: verificando, atualizado,
  atualizando (a página vai recarregar), falha/offline, sem suporte.
- `src/lib/appUpdate.ts`: registro do service worker, verificação manual e
  verificação automática (início, retorno ao primeiro plano, intervalo mínimo).
- Não verificar automaticamente durante uma sessão de treino.
- Testes: unidade do módulo e integração da tela.

### Out of Scope
- **Faixa ou aviso global** de "nova versão disponível" fora das Configurações —
  decidido com o usuário; a checagem automática já aplica a versão nova sem
  pedir nada, então o aviso não teria o que oferecer.
- **Changelog / "o que mudou nesta versão"** — exigiria uma fonte de notas de
  versão que o projeto não tem.
- Trocar `autoUpdate` por `prompt` (perguntar antes de aplicar). Seria uma
  mudança de comportamento para todo mundo, e o pedido aqui é o oposto: fazer a
  atualização acontecer mais, não menos.
- Verificação em segundo plano com o app fechado (Periodic Background Sync): não
  existe no iOS e não ajuda o caso que doeu.
- Numeração semântica / release process. A versão do `package.json` é exibida
  como está.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nada persiste; o estado é da sessão do navegador |
| API | No | Sem backend |
| State | Yes | `src/lib/appUpdate.ts` — store zustand nova, sem `persist` |
| UI | Yes | `UpdatePage.tsx`, rota `/settings/update`, uma linha em `SettingsPage` |
| Build | Yes | `vite.config.ts`: `injectRegister: null` e `define` com versão/data |
| Tests | Yes | `vitest.config.ts` precisa do mesmo `define` e de um stub para `virtual:pwa-register` |

## Architecture Considerations

- **Espelha `lib/install.ts`.** As duas capacidades têm a mesma forma — um
  recurso do navegador que existe ou não, capturado antes da primeira
  renderização, exposto por store e mostrado numa página dedicada que se adapta
  ao que dá para fazer ali. Um segundo padrão para o mesmo problema só se
  explicaria pela ordem em que foram escritos.
- **O registro do service worker passa a ser código do app.** É a única forma de
  ter o `ServiceWorkerRegistration` em mãos. O `injectRegister: null` é
  obrigatório junto: sem ele haveria dois registros do mesmo worker.
- **A versão vem do build, e o build é a única fonte.** `define` a partir do
  `package.json` no `vite.config.ts`; nenhuma constante de versão no `src/`.
- **O `define` precisa ser repetido no `vitest.config.ts`.** As duas
  configurações são arquivos separados neste projeto, e um global indefinido
  derrubaria a suíte — um vermelho que não corresponde a defeito nenhum, que é
  exatamente o que a capability `testing` proíbe.
- **`virtual:pwa-register` não existe fora do plugin.** Nos testes ele é
  resolvido por um stub via `resolve.alias`, e não por um `vi.mock` repetido em
  cada arquivo: o alias vale para a suíte inteira e não depende de ordem de
  importação.

## Success Criteria

- [ ] Com o app instalado e uma versão nova publicada, tocar em "Procurar
      atualização" traz a versão nova sem desinstalar o app.
- [ ] A tela mostra versão e data do build, e o número muda depois da
      atualização — dá para confirmar que pegou.
- [ ] Sem versão nova, a tela diz "você já está na versão mais recente" em vez de
      não reagir.
- [ ] Offline, a tela diz que não deu para verificar, e o app segue funcionando.
- [ ] Voltar ao app depois de um tempo em segundo plano dispara a verificação
      sozinho, sem nada aparecer na tela.
- [ ] Nenhuma verificação automática (e portanto nenhum recarregamento) acontece
      durante uma sessão de treino.
- [ ] `npm run build` continua registrando **um** service worker, não dois.
- [ ] Suíte verde e `tsc --noEmit` limpo.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Registro duplicado do SW ao mover o `registerSW` para o app | Med | High | `injectRegister: null` no mesmo commit; conferir o `index.html` gerado em `dist/` |
| Recarregamento no meio de um treino (perde cronômetro/rolagem) | Med | Med | Verificação automática desligada nas telas de sessão; o botão manual continua explícito |
| `define` ausente no `vitest.config.ts` derruba a suíte | High | Med | Adicionado no mesmo commit, com teste que renderiza a tela e lê a versão |
| A data do build muda a cada compilação e polui diffs | Low | Low | Valor injetado em tempo de build, não versionado em arquivo algum |
| iOS não aplicar a atualização mesmo com o worker novo ativo | Med | Med | O recarregamento pelo evento `activated` é o mesmo caminho do `autoUpdate`; a tela informa o estado, e resta ao usuário fechar e reabrir. Verificar no aparelho antes de arquivar |
| Verificação automática frequente demais gastando rede | Low | Low | Intervalo mínimo entre verificações; só ao voltar ao primeiro plano, nunca em laço |
