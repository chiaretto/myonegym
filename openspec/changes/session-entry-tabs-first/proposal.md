# Proposal: Abas no topo no detalhe do exercício (sessão e catálogo)

**Change ID:** `session-entry-tabs-first`
**Created:** 2026-08-04
**Status:** Implementation Complete
**Completed:** 2026-08-04

---

## Problem Statement

O detalhe do exercício dentro da sessão (`/session/:id/entry/:entryId`) empilha
quatro blocos antes do conteúdo que o usuário foi buscar:

```
BackBar (nome do exercício)
┌─ hero: foto/GIF do exercício   ← alto, ocupa boa parte da dobra
├─ chips: Concluído · Alternativa de X · #Peito #Tríceps
├─ abas: Execução | Observações | Foto
└─ painel: Peso alvo + histórico  ← o que ele veio ver
```

O problema é de **ordem**, não de conteúdo:

1. **As abas ficam soterradas.** Elas são o controle de navegação da tela, mas
   aparecem depois da mídia e dos chips. Em um celular, com o teclado fechado,
   "Observações" e "Foto" muitas vezes só aparecem depois de rolar — no meio de
   um treino, com o aparelho na mão.
2. **A foto ocupa a dobra em todas as abas.** Ela pertence à execução do
   exercício, mas hoje está acima das abas, então continua lá enquanto o usuário
   digita uma observação ou olha as fotos do aparelho — empurrando o que
   importa para baixo em três contextos diferentes.
3. **Categorias competem com status.** A linha de chips mistura *status da
   entrada* ("Concluído", "Alternativa de X") com *classificação do exercício*
   ("Peito", "Tríceps"). A segunda é referência, quase nunca é o motivo de abrir
   a tela, e paga preço de dobra igual à primeira.

O detalhe do catálogo (`/exercise/:id`) tem exatamente a mesma estrutura e o
mesmo problema, e as duas telas são visitadas em sequência pelo mesmo usuário.

## Proposed Solution

Inverter a ordem: **as abas sobem para logo abaixo da barra de título**, e cada
aba passa a carregar o que é dela.

```
BackBar (nome do exercício)
┌─ chips de STATUS: Concluído · Alternativa de X   ← só na sessão, some se não houver
├─ abas: Execução | Observações | Foto
└─ painel da aba ativa:
   Execução     → foto/GIF · Peso alvo · histórico · Alternativas
   Observações  → categorias (#Peito #Tríceps) · nota do aparelho
   Foto         → fotos do aparelho nesta academia
```

### 1. Abas primeiro

O `<Tabs>` passa a ser o primeiro elemento do `<main>` (depois dos chips de
status, quando houver). Nada muda no componente em si — é reordenação de
markup, mais o ajuste de espaçamento que a mudança de vizinhança exige.

### 2. A mídia entra na aba de execução

O bloco `.hero` vai para dentro do painel "Execução" (sessão) / "Detalhe"
(catálogo), acima do Peso alvo. Em "Observações" e "Foto" ele simplesmente não
existe — a nota começa na primeira linha da tela, e a grade de fotos também.

O histórico não muda de lugar: ele já é parte do editor de Peso alvo
(`WeightEditor`), que continua inteiro dentro da primeira aba.

### 3. Categorias descem para "Observações"

Os chips de categoria saem do cabeçalho e aparecem no topo do painel
"Observações", acima do editor de nota. É onde a informação combina: as duas
coisas descrevem o exercício, nenhuma delas é usada no meio de uma série.

Os chips de **status** ficam acima das abas, visíveis em qualquer aba — são
sobre a entrada da sessão, não sobre uma seção dela, exatamente como a barra
inferior do stepper.

### 4. As duas telas, o mesmo idioma

O mesmo redesenho vale para o detalhe do catálogo, cujas abas passam a ser
"Detalhe" (mídia + peso + histórico + alternativas), "Observações" (categorias
+ nota) e "Foto". Divergir aqui seria pior que o problema original: são a mesma
tela em dois contextos, e o usuário troca de uma para a outra o tempo todo.

## Scope

### In Scope
- Reordenar `SessionEntryPage`: chips de status → abas → painel
- Reordenar `ExerciseDetailPage` da mesma forma
- Mover o `.hero` para dentro do painel da primeira aba nas duas telas
- Mover os chips de categoria para o topo do painel "Observações" nas duas telas
- Ajustar o CSS de espaçamento (`.ex-head`, `.hero`, `.tabs`) para a nova ordem
- Atualizar os testes que dependem da ordem/posição desses blocos

### Out of Scope
- Mudar o conteúdo de qualquer aba além do que está descrito (o editor de peso,
  o histórico, a nota e a grade de fotos continuam como estão)
- Mexer nos rótulos das abas ("Execução"/"Detalhe", "Observações", "Foto")
- Tornar as abas fixas/*sticky* ao rolar
- Mexer na barra inferior do stepper, no fluxo de concluir/avançar ou na troca
  por alternativa
- Lembrar a última aba aberta entre visitas
- A pré-visualização de exercício no formulário de dia (não tem abas)

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Não | Nenhum dado muda de forma |
| API | Não | Nada de rede |
| State | Não | O `useState` da aba ativa continua igual |
| UI | Sim | Ordem do markup em `SessionEntryPage` e `ExerciseDetailPage`; `.hero` e chips de categoria mudam de painel |
| CSS | Sim | Espaçamentos de `.ex-head`, `.hero` e `.tabs` na nova vizinhança |
| Tests | Sim | `stepper-bar.integration.test.tsx`, `notes.integration.test.tsx`, `photo.integration.test.tsx` e o que asserta a ordem do cabeçalho |

## Architecture Considerations

- **É reordenação, não reescrita.** `Tabs`, `Media`, `WeightEditor`,
  `NoteEditor`, `PhotoTab` e `AlternativesSection` continuam os mesmos
  componentes, com as mesmas props. O que muda é onde cada um é renderizado.
- **A regra do título continua valendo.** O nome do exercício segue só na
  `BackBar`; nada no corpo o repete (spec `exercises`, *Single Exercise Title on
  Detail Views*). Esta mudança mexe na frase daquele requisito que hoje autoriza
  **categorias** no cabeçalho — elas passam a viver numa aba.
- **A barra do stepper não se move.** Ela já é chrome fixo fora do `<main>`,
  visível em todas as abas; nada aqui a toca.
- **Uma aba, um assunto.** O critério que decide onde cada bloco fica: o que
  descreve *a execução agora* fica em Execução; o que descreve *o exercício*
  (categorias, nota) fica em Observações; imagens do aparelho ficam em Foto.

## Success Criteria

- [x] Nas duas telas, as abas são o primeiro controle abaixo da barra de título
      (só os chips de status podem precedê-las)
- [x] A mídia do exercício aparece **apenas** na primeira aba
- [x] Abrir "Observações" mostra as categorias e o editor de nota sem rolagem em
      um viewport de celular típico
- [x] Os chips "Concluído" e "Alternativa de X" continuam visíveis em qualquer aba
- [x] Alternar de aba não muda a barra inferior nem o estado da entrada
- [x] `npx tsc -b --noEmit`, `npx vitest run` e `npm run build` limpos

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Espaçamento estranho com as abas no topo (margens pensadas para vir depois do hero) | Alta | Baixo | Ajustar `.ex-head`/`.tabs`/`.hero` e conferir nas três abas |
| Testes que assumem a mídia sempre visível quebram | Média | Baixo | Já mapeados: os três arquivos de integração acima |
| Usuário estranhar a foto "sumindo" nas outras abas | Média | Baixo | É o objetivo — a foto volta em um toque, e a aba ativa fica evidente |
| Divergência entre as duas telas se só uma for ajustada | Baixa | Médio | As duas entram na mesma mudança, com cenários espelhados no spec |
| Categorias ficarem "escondidas" para quem as usava como referência rápida | Média | Baixo | Ficam no topo de Observações, a um toque, e nunca foram acionáveis ali |
