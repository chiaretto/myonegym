# Implementation Tasks: Pré-visualização grande da mídia no formulário de exercício

**Change ID:** `exercise-form-hero-media`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 (N/A) Nenhuma mudança de modelo — `Exercise.mediaUrl` já existe
- [x] 1.2 (N/A) Nenhuma mudança de repositório
- [x] 1.3 (N/A) Nenhum teste de data layer

**Quality Gate:** PASSED
- [x] Confirmado que a mudança é apenas de apresentação

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 (N/A) `mediaUrl` continua um `useState` local do formulário
- [x] 2.2 (N/A) Sem nova lógica de negócio
- [x] 2.3 (N/A) Sem novos testes de provider

**Quality Gate:** PASSED
- [x] Nenhuma regressão em `createExercise` / `updateExercise`

---

## Phase 3: User Interface

- [x] 3.1 Mover o bloco `.hero`, `img.hero-media` e `.media-fallback.hero-media`
      de `src/features/exercise/exercise.css` para `src/styles/global.css`,
      preservando valores e o comentário explicativo ✓ 2026-07-23
- [x] 3.2 Verificar que `ExerciseDetailPage` continua renderizando o hero igual
      (o `import './exercise.css'` permanece para os demais estilos) ✓ 2026-07-23
- [x] 3.3 Em `ExerciseForm` (`src/features/settings/ExercisesPage.tsx`), trocar a
      pré-visualização `<Media className="thumb">` por
      `<div className="hero"><Media className="hero-media" …/></div>` ✓ 2026-07-23
- [x] 3.4 Mover a pré-visualização para logo abaixo do campo "URL da imagem ou
      GIF" e renderizá-la sempre (placeholder quando `mediaUrl` está vazio) ✓ 2026-07-23
- [x] 3.5 Rotular a pré-visualização de forma acessível — `alt`
      "Pré-visualização da mídia", que o `media-fallback` reaproveita como
      `aria-label` ✓ 2026-07-23
- [x] 3.6 Testes de integração em
      `src/features/settings/exercise-form-media.integration.test.tsx`:
      placeholder sem URL, `hero-media` (não `thumb`) ao digitar uma URL, e
      pré-visualização da mídia salva ao editar ✓ 2026-07-23

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Testes de integração de exercícios passam (3 novos + suíte existente)

---

## Phase 4: Integration & Polish

- [x] 4.1 (N/A) Nenhuma string i18n nova — o app é pt-BR literal
- [x] 4.2 `npx vitest run` completo: 240/240 ✓ 2026-07-23
- [ ] 4.3 QA visual em viewport móvel: mídia retrato, paisagem, quadrada, GIF,
      URL quebrada e campo vazio; confirmar que a ActionBar não cobre o hero
      — **pendente (manual)**
- [ ] 4.4 Atualizar delta spec / anotações se o QA exigir ajuste de altura
      — **pendente, depende de 4.3**

**Quality Gate:** PASSED (automatizado)
- [x] `npx vitest run` 240/240 e `npm run build` OK
- [x] Análise estática limpa
- [x] Documentação sincronizada
- [ ] QA visual manual pendente

---

## Notes

### Flake pré-existente (não introduzido por esta mudança)

Sob carga de CPU (build rodando em paralelo), `day-nav.integration.test.tsx:57`
falha de forma intermitente: um `getByRole('button', …)` síncrono logo após um
`findByRole` assíncrono. O teste passa isolado e a suíte passa completa em
execução normal. Ele exercita apenas `/exercise/:id?day=` (stepper) — não
renderiza o formulário de exercício nem carrega CSS no jsdom, então não tem
relação com esta mudança. Fica registrado como fragilidade de teste a tratar
separadamente.

---

## Completion Checklist

- [x] All phases complete (exceto QA visual manual)
- [x] All automated quality gates passed
- [x] Documentation synced
- [ ] QA visual manual (4.3) antes de `/openspec-archive`
