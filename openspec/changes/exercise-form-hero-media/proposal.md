# Proposal: Pré-visualização grande da mídia no formulário de exercício

**Change ID:** `exercise-form-hero-media`
**Created:** 2026-07-23
**Status:** Implementation Complete (code) — QA visual manual pendente
**Completed:** 2026-07-23

---

## Problem Statement

Na tela de cadastro/edição de exercício (`/settings/exercises/new` e
`/settings/exercises/:id/edit`) a pré-visualização da imagem/GIF informada em
"URL da imagem ou GIF" é renderizada com a classe `thumb` — um quadrado de
**46×46 px** com `object-fit: cover`
(`src/features/settings/ExercisesPage.tsx:263`, `src/features/home/home.css:43`).

Consequências para quem cadastra um exercício:

- É impossível verificar se a URL colada é realmente o exercício certo — a
  miniatura é pequena demais para reconhecer o movimento.
- Um GIF animado praticamente não se lê nesse tamanho.
- `object-fit: cover` **corta** mídia retrato/paisagem, então o que se vê no
  formulário não corresponde ao que a tela de detalhe vai mostrar.

A tela de detalhe (`/exercise/:id?day=:dayId`) já resolveu esse problema: usa o
bloco `hero` + `hero-media` (`src/features/exercise/exercise.css:4-9`), que ocupa
a largura total, respeita a proporção natural da mídia (`height: auto`,
`object-fit: contain`) e limita a altura a `72vh`. O usuário pediu exatamente
essa paridade: **a pré-visualização no formulário deve ser grande, como no
detalhe.**

## Proposed Solution

Reaproveitar o tratamento *hero* já existente na pré-visualização do formulário,
em vez de criar um segundo estilo de imagem grande.

1. **Promover `.hero` / `.hero-media` a estilo compartilhado.** Hoje essas
   regras vivem em `src/features/exercise/exercise.css`, importado apenas por
   `ExerciseDetailPage`. Mover o bloco para `src/styles/global.css` (junto de
   outros primitivos de UI como `.group`, `.note-card`, `.photo-thumb`), sem
   alterar os valores, para que o formulário possa usá-lo sem importar o CSS de
   outra feature.
2. **Usar `hero` no formulário.** Em `ExerciseForm`, trocar
   `<Media className="thumb" …>` pelo mesmo par
   `<div className="hero"><Media className="hero-media" …/></div>` usado no
   detalhe, incluindo o *fallback* quando a URL está vazia ou quebrada.
3. **Mostrar sempre a pré-visualização**, com o *placeholder* (`media-fallback`)
   quando não há URL — hoje o bloco só aparece se `mediaUrl` for verdadeiro, o
   que faz a página "pular" quando o usuário termina de digitar. Um espaço
   reservado estável evita o salto de layout.
4. **Posicionar a pré-visualização logo abaixo do campo de URL**, para que a
   relação campo → resultado seja imediata (hoje ela fica depois do seletor de
   categorias, longe do campo que a alimenta).

Nada muda no modelo de dados, na validação ou no fluxo de salvamento.

## Scope

### In Scope
- Pré-visualização grande (hero) no formulário de novo/editar exercício.
- Compartilhamento das regras `.hero` / `.hero-media` entre detalhe e formulário.
- Placeholder estável quando não há mídia informada.
- Reposicionamento da pré-visualização logo após o campo de URL.

### Out of Scope
- Miniaturas das listagens (Exercícios, Home, Sessão) — permanecem `thumb` 46×46.
- Upload de arquivo, recorte, ou galeria de mídia — o campo continua sendo URL.
- Validação de formato/tipo da URL (já coberta por `exercises`).
- Qualquer mudança na tela de detalhe além do local de definição do CSS.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nenhuma mudança em `Exercise` nem em repositórios |
| API | No | App local-only; sem camada de API |
| State | No | `mediaUrl` continua um `useState` local do formulário |
| UI | Yes | `ExercisesPage.tsx` (`ExerciseForm`), `exercise.css` → `global.css` |

## Architecture Considerations

- **Sem estilo duplicado.** O projeto já sofre com `.thumb` duplicado em
  `home.css` e `session.css`; repetir `.hero` numa terceira folha repetiria o
  erro. Mover para `global.css` mantém uma definição só.
- **`ExerciseDetailPage` continua importando `exercise.css`** para o restante
  (`.ex-head`, `.weight-card`, `.timeline`); apenas o bloco hero sai de lá.
- **`Media` não muda.** O componente já aceita `className` e já renderiza o
  `media-fallback` com a mesma classe, o que faz `.media-fallback.hero-media`
  (caixa 16/10) funcionar de graça no formulário.
- Segue o padrão de *forms-as-pages* + `ActionBar` já adotado; a página tem
  `screen has-action-bar`, então o hero mais alto apenas rola.

## Success Criteria

- [ ] Ao colar uma URL válida em "URL da imagem ou GIF", a pré-visualização
      aparece em largura total, com a proporção natural da mídia (sem corte).
- [ ] A pré-visualização do formulário e a mídia da tela de detalhe renderizam
      com o mesmo tamanho e enquadramento para o mesmo exercício.
- [ ] Sem URL (ou com URL quebrada) o formulário mostra o placeholder no mesmo
      espaço, sem salto de layout.
- [ ] GIF animado anima na pré-visualização.
- [ ] `npm run build` / lint e a suíte de testes passam; testes de integração
      de exercícios continuam verdes.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Mídia muito alta empurra o formulário para fora da tela | Med | Low | `max-height: 72vh` já existe no `hero-media`; avaliar limite menor no formulário se necessário |
| Mover CSS de feature para global quebra a tela de detalhe | Low | Med | Mover o bloco sem editar valores; teste visual/integração do detalhe |
| Seletor `.hero` global colidir com futuros "hero" de outras telas | Low | Low | Nome já é específico de mídia no projeto; manter comentário explicando o uso |
| Placeholder sempre visível polui o formulário | Low | Low | Usa o mesmo `media-fallback` discreto do detalhe; validar no QA visual |
