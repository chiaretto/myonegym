# Implementation Tasks: Editar o catálogo oficial pelo navegador

**Change ID:** `admin-official-catalog`

---

## Phase 1: A conversão vira compartilhada

- [x] 1.1 Extrair de `scripts/gen-exercise-media.mjs` um módulo com o **slug**, o
      `MAX_WIDTH` e a conversão para webp. É o mesmo formato de problema que o
      `scripts/buildInfo.ts` resolve: duas cópias divergiriam na primeira vez
      que uma fosse ajustada.
- [x] 1.2 O gerador passa a chamá-lo, sem mudar o que produz.
- [x] 1.3 Um **download** para o módulo (o admin precisa; o gerador não chama).
      Com tempo limite: um site fora do ar não pode travar uma gravação.
- [x] 1.4 Testes do slug (acento, pontuação, colisão entre nomes) e do
      `npm run exercise-media` continuar gerando os mesmos 51 arquivos.

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] `npm run exercise-media` produz um diff vazio

---

## Phase 2: A API, e só de localhost

- [x] 2.1 Plugin do Vite `adminApi()` em `scripts/`, com `apply: 'serve'`.
- [x] 2.2 **Recusa fora de localhost**, antes de qualquer outra coisa — o dev
      server roda com `host: true`, exposto para o celular.
- [x] 2.3 `GET /api/admin/catalog` — o arquivo como está.
- [x] 2.4 `PUT /api/admin/catalog/exercise` — grava um exercício: valida, atribui
      id quando novo, mantém a simetria das alternativas, e baixa/converte a
      imagem quando a URL mudou (renomeando e varrendo a antiga).
- [x] 2.5 `DELETE /api/admin/catalog/exercise/:id` — remove o registro e a
      imagem. O id **não** volta para o pool.
- [x] 2.6 `PUT`/`DELETE` de **categoria**, com as mesmas regras de id.
- [x] 2.6b `retiredCategoryIds`/`retiredExerciseIds` no catálogo: apagar o
      registro apaga o único vestígio de que o id foi usado, e sem isso excluir
      o maior id devolveria esse número ao próximo exercício novo.
- [x] 2.7 Toda gravação **regrava o arquivo inteiro**, no mesmo formato do
      gerador — dois escritores com ideias diferentes de formatação brigariam a
      cada commit.
- [x] 2.8 Testes do plugin: localhost recusado de fora, id novo nunca
      reaproveitado, simetria das alternativas, e o arquivo resultante passando
      por `officialCatalog.test.ts`.

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes do plugin verdes

---

## Phase 3: A tela

- [x] 3.1 Rota `/admin` atrás de `import.meta.env.DEV`, para sair na compilação.
- [x] 3.2 Layout de tela grande: listagem de categorias e de exercícios lado a
      lado ou em abas, sem as restrições do mobile.
- [x] 3.3 CRUD de categoria.
- [x] 3.4 Formulário do exercício: nome, tipo, categorias **por nome**,
      alternativas **por nome**, vídeos, URL da imagem — com **Salvar** por
      exercício.
- [x] 3.5 Excluir com aviso explícito: o id fica vago para sempre, e aparelhos
      com peso/histórico naquele exercício ficam com registros que deixam de
      resolver.
- [x] 3.6 Estado de gravação por exercício: salvando, salvo, e a falha do
      download relatada sem perder o resto.
- [x] 3.7 Testes de integração da tela.

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes de integração verdes

---

## Phase 4: Fechamento

- [x] 4.1 Teste que falha se a rota aparecer no `dist`.
- [x] 4.2 `openspec/project.md`: a ferramenta, onde ela vive e por que é de
      desenvolvimento.
- [x] 4.3 Rodar a suíte inteira e o build; conferir que o `dist` não cresceu.

**Quality Gate:** PASSED
- [x] `npm test` inteiro verde
- [x] `npm run build` sem erro, e sem `/admin` no resultado

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
