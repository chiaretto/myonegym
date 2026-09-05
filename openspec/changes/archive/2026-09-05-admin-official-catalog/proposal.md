# Proposal: Editar o catálogo oficial pelo navegador, em desenvolvimento

**Change ID:** `admin-official-catalog`
**Created:** 2026-09-05
**Status:** Implementation Complete
**Completed:** 2026-09-05

---

## Problem Statement

O catálogo oficial — 12 categorias e 52 exercícios — só se edita **à mão**, num
JSON de 20 KB, e a edição não termina no arquivo:

- acrescentar um exercício é escolher um id que respeite a regra de nunca
  renumerar e nunca reaproveitar (o id 10 está vago e precisa continuar);
- as `alternativeIds` são simétricas entre oficiais, então declarar uma exige
  editar **dois** registros e não esquecer o outro lado;
- as `categoryIds` são números que só o próprio arquivo explica;
- e a imagem é um segundo passo separado: baixar de algum site, salvar em
  `data/assets/exercises/<slug>.<ext>` com o slug certo, rodar
  `npm run exercise-media`.

Nada disso é difícil; tudo isso é fácil de errar em silêncio. Um `categoryIds`
com um número que não existe não quebra nada — o exercício simplesmente aparece
sem aquela categoria. Um slug com um acento a mais deixa o exercício sem imagem
e o script apenas o lista entre os "sem master".

**Afetado:** quem mantém o catálogo, que é uma pessoa só, no computador onde
desenvolve o app.

## Proposed Solution

Uma tela `/admin`, **de desenvolvimento**, com a listagem das categorias e dos
exercícios oficiais, CRUD em ambos, e um **Salvar por exercício** que grava no
`officialCatalog.json` e, quando há uma URL de imagem nova, baixa e converte —
o mesmo resultado que `npm run exercise-media` produz.

### 1. Isso exige um servidor, e o único que existe é o de desenvolvimento

O app é um PWA estático: o navegador não escreve `src/data/officialCatalog.json`
nem roda `sharp`. Então a tela conversa com um **plugin do Vite** que expõe
`/api/admin/*` durante `npm run dev` — e só durante ele (`apply: 'serve'`).

Isso não é um contorno: é o que a funcionalidade é. Ela edita o **repositório**,
não os dados de um usuário, e por isso vive onde o repositório está. O desfazer
dela é o `git checkout`.

Escrever o JSON dispara o HMR do Vite — o arquivo é importado por
`officialCatalog.ts` —, então o app recarrega já com o catálogo novo. Conferir o
que se acabou de editar não custa nada.

### 2. A API só atende o próprio computador

O dev server roda com `host: true`, exposto na rede para abrir o PWA no celular.
Um endpoint que **grava arquivos no repositório** e **baixa URLs arbitrárias**
alcançável por qualquer aparelho da rede seria uma porta aberta com duas
fechaduras a menos do que precisa.

A API MUST recusar toda requisição que não venha de `localhost`. É o que o uso
descrito pede — a edição é feita no computador de desenvolvimento — e custa uma
verificação.

### 3. `/admin` não existe no build de produção

A rota e a tela saem na compilação, atrás de `import.meta.env.DEV`. Publicada,
ela só poderia ser uma tela que falha em tudo que tenta — e uma URL "oculta" no
ar convida quem a descobrir. Também não pesa no bundle nem no precache.

### 4. O que a tela sabe que um editor de texto não sabe

É aqui que ela se paga:

- **o id é atribuído por ela**, respeitando o contrato: o próximo livre, nunca
  um reaproveitado, nunca acima da faixa oficial;
- **categorias são escolhidas por nome**, e viram ids na gravação;
- **alternativas são declaradas de um lado** e a simetria entre oficiais é
  mantida na gravação, como `setAlternatives` já faz no app;
- **a imagem é um campo só**: cola-se a URL, e salvar baixa, converte, nomeia
  pelo slug do exercício e varre o arquivo antigo se o nome mudou.

### 5. Excluir é o caso que precisa de aviso

Excluir um exercício oficial **não devolve o id**: ele fica vago para sempre,
como o 10 está. E aparelhos que já registraram peso, histórico, observação ou
foto naquele exercício ficam com registros que deixam de resolver — o app já
sabe exibir isso (é o caso do "oficial aposentado"), mas o dado não some e nem
volta a fazer sentido se o id for reusado depois.

A tela MUST dizer isso antes de excluir, com todas as letras.

## Scope

### In Scope

- Rota `/admin`, só em desenvolvimento, com layout para tela grande.
- Listagem de **categorias** e **exercícios** oficiais.
- Criar, editar e excluir categoria.
- Criar, editar e excluir exercício, com **Salvar por exercício**.
- Campos do exercício: nome, tipo, categorias, alternativas, vídeos, URL da
  imagem.
- Plugin do Vite com `/api/admin/*`: ler e gravar o catálogo, baixar e converter
  a imagem.
- Restrição a localhost.
- Conversão compartilhada com `scripts/gen-exercise-media.mjs`, não duplicada.

### Out of Scope

- **Editar o catálogo em produção.** Não é um recurso do app; é uma ferramenta
  de quem o mantém.
- **Reordenar** exercícios ou categorias. A ordem exibida é por nome, e a do
  arquivo não é lida por ninguém.
- **Editar exercícios do usuário.** Eles têm formulário próprio no app, e o
  admin não os enxerga: o arquivo não os contém.
- **Enviar imagem do computador** em vez de URL. O pedido é URL; um upload é
  outro caminho, com outras validações.
- **Desfazer dentro da tela.** O desfazer é o `git`, que já guarda cada versão
  do arquivo e é onde a pessoa que usa isso já vive.
- **Autenticação.** Localhost é a fronteira; um login para uma ferramenta local
  seria cerimônia sem ganho.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Não | O admin não toca IndexedDB. Ele edita um arquivo do repositório. |
| App em produção | Não | Rota e tela eliminadas na compilação; nada muda no que é publicado. |
| Build | Sim | Um plugin do Vite, ativo só em `serve`. |
| `scripts/gen-exercise-media.mjs` | Sim | A conversão vira um módulo compartilhado; o script passa a chamá-lo. |
| `src/data/officialCatalog.json` | Sim | Passa a ter um segundo escritor além do gerador de imagens. |
| Testes | Sim | O plugin é lógica de Node testável sem navegador; a tela, como as outras. |

## Architecture Considerations

**O precedente do `buildInfo`.** O projeto já tem um módulo compartilhado entre
o `vite.config.ts` e o resto (`scripts/buildInfo.ts`), justamente para que o
build e o app não digam coisas diferentes. A conversão de imagem tem o mesmo
formato de problema: o gerador e o admin precisam produzir **o mesmo arquivo**,
com o mesmo slug, o mesmo limite de largura e a mesma qualidade. Duas cópias
divergiriam na primeira vez que uma delas fosse ajustada.

**Ferramenta, não recurso.** Vale dizer explicitamente porque governa cada
decisão desta proposta: o `/admin` não é uma tela do MyOneGym. É uma ferramenta
de manutenção que por acaso usa o mesmo React. É por isso que ela pode ser de
tela grande num app mobile-first, que não precisa de estado offline, que não
entra em backup, e que sai do bundle.

**As invariantes do catálogo já estão escritas.** Ids permanentes e nunca
reaproveitados, alternativas simétricas, `mediaFile` nomeado pelo exercício,
nada de URL remota no arquivo — tudo isso está na spec de `exercises` e é
verificado por `officialCatalog.test.ts`. O admin MUST produzir um arquivo que
esses testes aceitam; eles são a rede que impede a ferramenta de estragar
justamente o que ela existe para cuidar.

**O que grava é um só.** O plugin lê, aplica a mudança e regrava o arquivo
inteiro — não um patch. É a mesma forma que o gerador de imagens usa, e evita
a classe de bug em que dois escritores com ideias diferentes sobre formatação
brigam pelo mesmo arquivo a cada commit.

## Success Criteria

- [ ] `/admin` abre em `npm run dev` e não existe no `dist`.
- [ ] A API recusa requisição que não venha de localhost.
- [ ] Criar, editar e excluir categoria funciona e o arquivo reflete.
- [ ] Criar, editar e excluir exercício funciona, com aviso na exclusão.
- [ ] Salvar com uma URL de imagem produz o `.webp` em `public/exercises/`, com
      o nome do exercício, e o `mediaFile` no arquivo.
- [ ] Renomear um exercício renomeia a imagem e remove a antiga.
- [ ] Um exercício novo recebe um id livre, nunca um já usado.
- [ ] Declarar uma alternativa deixa os dois lados coerentes.
- [ ] `officialCatalog.test.ts` continua passando depois de uma edição pelo admin.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| A ferramenta corrompe o catálogo que existe para cuidar | Média | **Alto** | `officialCatalog.test.ts` já trava ids, nomes de arquivo e ausência de URL remota; a gravação é validada antes de escrever, e o `git` é o desfazer. |
| O endpoint de escrita fica alcançável na rede | Média | **Alto** | Recusa fora de localhost, verificada por teste. |
| A conversão do admin diverge da do `npm run exercise-media` | Alta | Médio | Uma implementação só, importada pelos dois. |
| Um id reaproveitado dá a um exercício novo o histórico de um antigo | Baixa | **Alto** | O próximo id vem do maior já usado, e a exclusão não o devolve; teste do contrato. |
| A tela entra no bundle sem ninguém notar | Baixa | Médio | Teste que falha se o `dist` mencionar a rota. |
| O download trava a gravação (site lento, fora do ar) | Média | Baixo | Tempo limite; a falha é relatada e o resto da gravação acontece — o exercício fica sem `mediaFile`, que é um estado que o app já exibe. |

---

## Archive Information

**Archived:** 2026-09-05
**Duration:** mesmo dia
**Outcome:** Successfully implemented

### Files Modified
- `scripts/exerciseMedia.mjs`, `scripts/exerciseMedia.d.mts` — slug, largura,
  conversão, download, renomeação, cópia e procedência num módulo só,
  compartilhado pelo gerador e pelo admin
- `scripts/adminApi.ts` — o plugin do Vite: recusa fora de localhost, as rotas,
  os invariantes do catálogo, e o silenciamento do HMR nas gravações próprias
- `src/features/admin/` — a tela, atrás de `import.meta.env.DEV`
- `src/data/officialCatalog.json` — `retiredCategoryIds`/`retiredExerciseIds`
- `vite.config.ts`, `src/App.tsx`, `openspec/project.md`

### Specs Updated
- `openspec/specs/admin/spec.md` (capability nova)

### Learned in Implementation
Duas exigências que a proposta não previa, e que a implementação obrigou a
descobrir — ambas agora no spec:

- **a imagem precisa ser versionada pelo arquivo.** Trocar a imagem mantém o
  nome, e o service worker guarda `/exercises/` como CacheFirst por um ano, na
  premissa de que essas imagens nunca mudam sem o nome mudar junto. Um contador
  na tela não resolve: zera no reload;
- **gravar não pode recarregar o app.** O catálogo está no grafo de módulos do
  dev server, e um import de JSON não aceita hot update — o Vite cai para um
  reload da página, por baixo da própria tela que está gravando.

