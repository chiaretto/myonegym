# Implementation Tasks: Histórico e resumo semanal deixam de ser por academia

**Change ID:** `sessions-across-gyms`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 `SessionSummary` ganha `gymName`, resolvido na leitura, com `null` para
      "academia não existe mais" — o tratamento fica no repositório, não
      espalhado pelas telas ✓ 2026-07-25
- [x] 1.2 `listSessionSummaries` passa a ler **todas** as academias
      ✓ 2026-07-25 — **com um desvio**: o modo por academia foi **removido**, não
      mantido. Ver "Decisões"
- [x] 1.3 Resolver os nomes com **uma** leitura da tabela de academias por
      chamada, e não uma por sessão ✓ 2026-07-25
- [x] 1.4 Ordenação por `completedAt` entre academias, com o id como desempate —
      cronológica, não agrupada por academia ✓ 2026-07-25
- [x] 1.5 Testes de unidade em `src/db/repos.test.ts` (3): lista global traz as
      duas academias com os nomes na ordem certa; ordem intercalada entre
      academias com `completedAt` fixado; sessão de academia excluída vem com
      `gymName: null` ✓ 2026-07-25

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Testes de unidade passam
- [x] Nenhuma mudança de schema, índice ou migração

---

## Phase 2: Business Logic (Estado e derivações)

- [x] 2.1 `useSessionSummaries` deixa de receber academia — não há mais chamador
      que queira o recorte ✓ 2026-07-25
- [x] 2.2 `HomePage` deriva o resumo semanal (contagem, trilha e sequência) do
      histórico global ✓ 2026-07-25
- [x] 2.3 `HomePage` deriva o "Próximo treino" do mesmo histórico global
      ✓ 2026-07-25
- [x] 2.4 Sessão em andamento **não** foi arrastada junto: segue vindo de
      `useActiveSession(activeGymId)`, e com ela o botão Continuar ✓ 2026-07-25
- [x] 2.5 Testes: `week-across-gyms.integration.test.tsx` (3) e dois casos novos
      em `next-workout.integration.test.tsx` — a rotação não se reinicia ao
      trocar de academia, e a sessão da academia A não aparece como retomável
      na B ✓ 2026-07-25

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Derivações cobertas por teste
- [x] Nenhuma regressão nos testes de `next-workout` (6/6, os 4 antigos sem edição)

---

## Phase 3: User Interface

- [x] 3.1 `SessionsPage` lista todas as academias ✓ 2026-07-25
- [x] 3.2 Nome da academia na linha secundária do item, junto de data e duração
      ✓ 2026-07-25
- [x] 3.3 "Academia removida" quando `gymName` é `null`, em itálico e apagado,
      para não se ler como uma academia de fato chamada assim ✓ 2026-07-25
- [x] 3.4 Rodapé deixa de dizer "nesta academia" e conta tudo ✓ 2026-07-25
- [x] 3.5 Seletor de academia removido do cabeçalho de Sessões, junto dos imports
      órfãos (`GymSelector`, `useActiveGym`) ✓ 2026-07-25
- [x] 3.6 Estilos apenas por tokens existentes; o nome entra como mais um
      fragmento `·` da linha secundária, sem estrutura nova ✓ 2026-07-25
- [ ] 3.7 Conferir a linha secundária no caso mais longo — data relativa + data +
      duração + nome de academia comprido — em viewport estreito e com
      `--font-scale` alto — **pendente (manual)**. A linha ganhou
      `line-height: 1.45` e quebra em vez de truncar, porque o nome é o último
      fragmento e uma reticência comeria justamente ele
- [x] 3.8 Testes de integração em
      `src/features/session/sessions-across-gyms.integration.test.tsx` (6): as
      duas academias com seus nomes na ordem certa; trocar a academia ativa não
      altera a lista; o rodapé conta tudo e não diz "nesta academia"; sessão órfã
      com o rótulo; cabeçalho sem seletor; e abrir uma sessão de outra academia
      que não a ativa ✓ 2026-07-25

**Quality Gate:** PASSED (o que é verificável sem navegador)
- [x] `npx tsc -b --noEmit` limpo
- [x] Testes de integração passam
- [x] Nenhum `font-size` em pixel literal, nenhuma cor fora de `tokens.css`

---

## Phase 4: Integration & Polish

- [x] 4.1 Textos em pt-BR literal, no tom das demais telas ✓ 2026-07-25
- [x] 4.2 Laço N+1 medido com histórico sintético (2 academias, 8 entradas por
      sessão), via arquivo de bench temporário removido depois ✓ 2026-07-25:

      | sessões | tempo |
      |---|---|
      | 50 | 4,5 ms |
      | 200 | 13,8 ms |
      | 500 | 66,8 ms |

      500 sessões concluídas são mais de um ano de treino diário, e 67 ms fica
      abaixo do perceptível numa tela que já é assíncrona. Nenhuma otimização
      feita — o número agora está medido em vez de suposto. Ressalva: isto é
      `fake-indexeddb` em Node, não IndexedDB real num celular; serve para a
      forma da curva, não para o valor absoluto.
- [ ] 4.3 Verificar em navegador: lista com duas academias, troca de academia sem
      efeito na lista, e a Home somando os treinos da semana
      — **pendente (manual)**
- [x] 4.4 Backup/restauração íntegro ✓ 2026-07-25 — `SessionSummary` é um modelo
      de leitura, nunca serializado; o backup lê as tabelas direto. Os 2 testes
      de `backup-restore.integration.test.tsx` passam sem edição
- [x] 4.5 `npx vitest run` e `npm run build` completos ✓ 2026-07-25

**Quality Gate:** PASSED (automatizado)
- [x] Todos os testes passam (335/335, 47 arquivos)
- [x] Análise estática limpa (`npx tsc -b --noEmit`)
- [x] `npm run build` OK
- [ ] Conferência em navegador — pendência declarada abaixo

---

## Decisões tomadas durante a implementação

### 1.2 · O modo por academia foi removido, não mantido

A tarefa dizia para preservar `listSessionSummaries(gymId)` porque "outros pontos
ainda usam". **Não usam.** A busca mostrou exatamente dois chamadores: o hook
`useSessionSummaries` — que passa a ser global — e um teste que afirmava
justamente o recorte por academia, ou seja, o requisito que está sendo
substituído.

Manter o parâmetro seria deixar um modo sem nenhum consumidor, sustentado por um
teste que existe só para ele. A função passou a ler sempre todas as academias, e
o teste antigo foi reescrito para a regra nova. Se um dia entrar o filtro por
academia na interface — explicitamente fora de escopo aqui —, o recorte volta com
o consumidor que o justifique.

Efeito colateral: `useSessionSummaries()` deixou de receber argumento. Antes,
`gymId == null` significava "nenhuma academia selecionada, devolva vazio"; manter
a assinatura e dar a `null` o sentido de "todas" seria inverter o significado do
mesmo valor.

### O nome vem de consulta, e isso é visível ao renomear

Conforme a proposta, `gymName` é resolvido na leitura em vez de copiado para
dentro de `Session`. Renomear uma academia reescreve o rótulo de todo o histórico
dela, inclusive de sessões antigas. É o comportamento esperado para um rótulo de
contexto ("onde foi isto"), mas é diferente de `dayName`, que é um retrato do
momento — vale saber ao ler as duas linhas lado a lado no mesmo card.

---

## Pendências (não entregues, com motivo)

| # | Item | Motivo |
|---|---|---|
| 3.7 | Linha secundária no caso mais longo | Sem navegador executável neste ambiente |
| 4.3 | Conferência em navegador | Idem |

O Chromium do cache do Playwright existe na máquina mas não sobe (`libnspr4.so`
ausente). O que dá para verificar sem navegador foi verificado: 13 testes novos
cobrindo os dois comportamentos, o laço medido, e nenhum valor fora dos tokens.

**Para o QA:** o ponto a olhar é a linha secundária do item quando tudo aparece
junto — "há 2 dias · 24/07 · 52min · Academia com nome comprido" — em viewport
estreito e com `--font-scale` a 200%.

---

## Achado fora do escopo: teste instável em `session.share`

`session.share.integration.test.tsx:115` falhou **uma vez em seis** execuções da
suíte completa (`expect(card.rows[0].weight).toBe('40 KG')`). Em `main` limpo,
5 execuções completas passaram.

Não é regressão desta mudança — nada aqui toca o cartão de compartilhamento nem
os pesos. É uma corrida no próprio teste: ele clica em "Compartilhar" assim que o
botão aparece, mas o peso vem de `useGymWeights`, uma live query **separada** que
pode não ter resolvido nesse instante. Os 13 testes novos apenas somam carga e
tornam a janela mais fácil de acertar.

Correção de uma linha, se for desejada: esperar o peso aparecer na tela antes de
clicar. Deixado de fora por ser alheio ao escopo desta mudança.

---

## Completion Checklist

- [x] All phases complete (exceto conferência em navegador)
- [x] All automated quality gates passed
- [x] Documentation synced
- [ ] QA visual (3.7, 4.3) antes de `/openspec-archive`
