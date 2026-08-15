# Proposal: Peso global do exercício, com exceção por academia

**Change ID:** `global-weights-with-gym-exception`
**Created:** 2026-08-14
**Status:** Implementation Complete
**Completed:** 2026-08-14

---

## Problem Statement

Hoje o peso alvo é **sempre** por academia: o registro é keyed por
`(gymId, exerciseId)` e o histórico também. Quem treina em mais de uma academia
paga um custo alto por isso:

- **O peso não acompanha a pessoa.** A carga da rosca direta é a mesma no corpo
  de quem levanta, mas o app trata cada academia como um universo separado —
  ao trocar de academia o exercício aparece vazio (`—`) até ser redefinido.
- **O histórico nasce fragmentado.** A evolução real (20 → 22,5 → 25 KG) fica
  partida em N linhas do tempo, uma por academia, e nenhuma conta a história
  toda. O `Sparkline` de cada academia mostra um trecho do progresso.
- **A duplicação é o caminho padrão, não a exceção.** "Copiar pesos de" na
  criação de academia existe justamente para contornar o problema, mas produz
  cópias que divergem em silêncio a partir do primeiro salvamento.
- **O rótulo da academia é ruído.** O chip com o nome da academia aparece em
  100% dos pesos, então não informa nada — ele deveria significar "aqui é
  diferente".

Na prática, a diferença por academia é o caso **raro** (uma máquina calibrada
diferente, um halter que só existe numa unidade), e o app modelou o caso raro
como se fosse a regra.

## Proposed Solution

Inverter o padrão: **o peso é global** (um por exercício, válido em todas as
academias) e a diferença por academia vira uma **exceção explícita**.

**Modelo de dados** — manter as tabelas `weights` e `weightHistory` como estão e
reservar `gymId = 0` (`GLOBAL_GYM_ID`) para as linhas globais. Ids de academia
são `++id` do Dexie e começam em 1, então `0` nunca colide. Isso preserva o
índice único `&[gymId+exerciseId]`, o índice `[gymId+exerciseId]` do histórico e
toda a mecânica de leitura/escrita já testada — sem tabela nova, sem campo
opcional que quebraria índices compostos.

**Resolução em duas camadas** — a leitura de um peso para `(gym, exercício)`
retorna a exceção da academia quando ela existe e, caso contrário, a linha
global. A mesma regra vale para o histórico exibido e para os badges da Home e
da sessão. Um par `(gym, exercício)` está sempre em um de dois **escopos**:
`gym` (tem exceção) ou `global`.

**Interface** — o editor de peso (o mesmo componente usado em
`/exercise/:id?day=N` e em `/session/:id/entry/:entryId`) ganha uma flag
**"Só nessa academia"** no modo de edição:

- vem **desmarcada** quando o peso vigente é global — salvar grava o peso global;
- vem **marcada, sempre**, quando já existe exceção para a academia ativa —
  salvar atualiza a exceção;
- **marcar e salvar** cria a exceção: a partir daí a academia tem peso e
  histórico próprios;
- **desmarcar e salvar** apaga a linha de exceção e grava o valor no peso
  global — o par volta ao escopo global.

O **chip com o nome da academia** passa a aparecer **apenas** no escopo `gym`.
No escopo global não há rótulo — o peso é simplesmente o peso do exercício.

**Migração (v9)** — para cada exercício, o peso e o histórico da **academia mais
antiga que tem registro para ele** são re-chaveados para `gymId = 0` (viram
globais); os registros das demais academias permanecem como estão e passam a ser
exceções. Nada é apagado e nada é mesclado, então todo exercício que tinha
qualquer peso passa a ter um peso global, e quem só tem uma academia termina com
tudo global e nenhuma exceção — exatamente o estado que a mudança quer produzir.

**"Copiar pesos de" sai do formulário de academia.** Uma academia nova já herda
todos os pesos globais no instante em que é criada; copiar virou redundante.

## Scope

### In Scope

- `GLOBAL_GYM_ID = 0` e a resolução exceção → global nos repositórios
  (`getWeight`, `weightsForGym`, `saveWeight`, `listHistory`,
  `deleteHistoryEntry`).
- Migração Dexie **v9** promovendo a academia mais antiga de cada exercício a
  global.
- Flag "Só nessa academia" no `WeightEditor`, com o comportamento de marcar,
  desmarcar e salvar descrito acima — valendo nas duas telas que usam o editor.
- Chip da academia e sufixo "· nesta academia" no histórico exibidos **só** no
  escopo `gym`.
- Badges de peso da Home e da sessão (e do card de compartilhamento) resolvendo
  global + exceções.
- Remoção do campo "Copiar pesos de (opcional)" e do parâmetro
  `copyFromGymId` de `createGym`.
- `deleteGym` deixa de tocar nas linhas globais ao cascatear.
- Backup/restore e "Gerar exemplo" cientes do escopo global.

### Out of Scope

- Notas (`exerciseNotes`) e fotos (`exercisePhotos`) — continuam **por
  academia**; o argumento que torna o peso global (é uma propriedade do corpo)
  não vale para a foto daquela máquina nem para a observação sobre aquele
  aparelho.
- Unidade global separada do valor: unidade e valor viajam juntos no mesmo
  registro, como hoje.
- Mesclar históricos de academias diferentes numa linha do tempo única.
- Uma tela para listar/gerenciar todas as exceções de uma academia.
- Migrar sessões concluídas (elas já não guardam peso próprio).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Sim | Versão **v9**: nenhum índice muda; o upgrade re-chaveia linhas de `weights` e `weightHistory` para `gymId = 0`. `GLOBAL_GYM_ID` documentado em `db/types.ts`. |
| API (repos) | Sim | `getWeight`/`weightsForGym`/`listHistory` resolvem exceção → global; `saveWeight` ganha o escopo alvo; nova `clearGymOverride`; `createGym` perde `copyFromGymId`; `deleteGym` preserva o global. |
| State (hooks) | Sim | `useGymWeights` passa a mesclar global + exceções; `useHistory` segue o escopo resolvido; novo `useWeightScope` (ou equivalente) para alimentar a flag. |
| UI | Sim | `WeightEditor` (flag, chip condicional, cabeçalho do histórico); `GymsPage` (campo de cópia removido). Home, `SessionPage` e `SessionEntryPage` não mudam de forma — só passam a receber pesos resolvidos. |
| Portabilidade | Sim | Export/import continuam gravando ids literais (linhas `gymId: 0` sobrevivem ao round-trip); a validação precisa aceitar um peso cujo `gymId` não corresponde a nenhuma academia. `generateExample` semeia pesos **globais**. |

## Architecture Considerations

- **Sentinela em vez de campo opcional.** `gymId?: number` obrigaria a trocar
  `&[gymId+exerciseId]` por algo que o IndexedDB não indexa bem (chaves
  compostas não aceitam `undefined`), e espalharia `?? 'global'` por toda
  consulta. A sentinela `0` mantém uma única forma de linha e uma única
  consulta.
- **A resolução mora no repositório, não na tela.** Nenhum componente deve
  saber que existe uma linha `gymId = 0`: as telas pedem "o peso deste
  exercício nesta academia" e recebem o valor já resolvido, mais o escopo.
  É o mesmo contorno que `photoStore` estabeleceu para as fotos — a regra vive
  em um lugar só.
- **Consistente com o que já é global.** Exercícios, categorias e dias já são
  do usuário, não da academia; o peso passa a acompanhá-los, e a academia fica
  responsável apenas pelo que é genuinamente local (exceções, notas, fotos,
  sessões).
- **Histórico de exceção não é destruído ao desmarcar.** Desmarcar remove o
  peso de exceção, mas os registros de histórico daquela academia permanecem
  gravados (apenas deixam de ser exibidos enquanto o escopo for global). Apagar
  um histórico como efeito colateral de desmarcar uma caixa seria uma perda de
  dado silenciosa; e se a exceção voltar, a linha do tempo daquela academia
  volta com ela.

## Success Criteria

- [ ] Um exercício sem exceção mostra o mesmo peso e o mesmo histórico em
      todas as academias.
- [ ] O editor abre com "Só nessa academia" desmarcada no escopo global e
      marcada quando existe exceção.
- [ ] Salvar com a flag desmarcada altera o peso global; salvar com ela marcada
      cria/atualiza só a exceção da academia ativa.
- [ ] Desmarcar a flag e salvar remove a exceção e devolve o par ao peso global.
- [ ] O chip com o nome da academia aparece **apenas** quando há exceção.
- [ ] A migração v9 deixa todo exercício que tinha peso com um peso global, sem
      apagar registro nenhum.
- [ ] Um usuário com uma única academia termina a migração sem nenhuma exceção.
- [ ] Excluir uma academia não afeta pesos globais.
- [ ] Backup exportado antes e depois da mudança continua importável.
- [ ] `npx tsc --noEmit`, `npm run lint` e `npm test` limpos.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Escolha "errada" de academia promovida a global (o usuário queria a outra) | Média | Baixo | Nada é apagado: as demais viram exceção, e trocar é desmarcar a flag na academia preferida e salvar. |
| `gymId = 0` vazar para uma tela e renderizar como academia inexistente | Média | Médio | A sentinela nunca sai do repositório; as funções devolvem valor + escopo, e um teste cobre "nenhuma consulta de UI recebe gymId 0". |
| Backup antigo (pré-v9) restaurado sobre um banco v9 reintroduz pesos só por academia | Média | Médio | O restore repovoa as tabelas e o upgrade da v9 já rodou — o `import` aplica a mesma promoção da migração após repovoar. |
| Validação do backup rejeitar peso com `gymId` sem academia correspondente | Baixa | Alto | Ajustar a validação explicitamente e cobrir com teste de round-trip contendo linhas globais. |
| Flag confusa numa sessão concluída (editor read-only) | Baixa | Baixo | Em read-only a flag não é exibida — mostra-se apenas o valor e, se houver exceção, o chip da academia. |

---

## Archive Information

**Archived:** 2026-08-15
**Duration:** 2 dias (proposta em 2026-08-14, implementação no mesmo dia,
arquivo em 2026-08-15)
**Outcome:** Implementado com sucesso

### Files Modified

- `src/db/types.ts` — `GLOBAL_GYM_ID = 0`, `WeightScope`, e a documentação de
  por que a sentinela mantém `&[gymId+exerciseId]` um índice único válido
- `src/db/db.ts` — migração **v9** e `promoteWeightsToGlobal`, exportada para
  que o restore reaproveite exatamente a mesma promoção
- `src/db/repos.ts` — `resolveWeight` (valor + escopo), `getWeight`,
  `weightsForGym` (global + exceções), `saveWeight` com `scope` posicional
  obrigatório, `listHistory` seguindo o escopo, `createGym` sem `copyFromGymId`
- `src/features/exercise/WeightEditor.tsx` — flag "Só nessa academia", chip e
  sufixo "· nesta academia" só no escopo de exceção, toasts por escopo
- `src/features/exercise/exercise.css` — `.wc-scope` e seus textos de apoio
- `src/features/settings/GymsPage.tsx` — campo "Copiar pesos de" removido
- `src/data/portability.ts` — `SCHEMA_VERSION` 6, promoção no restore de
  documento pré-global, `generateExample` semeando pesos globais
- `src/db/weights.test.ts` (reescrito), `src/db/migration.test.ts` (v9),
  `src/db/repos.test.ts` (herança e cascatas), `src/data/portability.test.ts`
  (escopos no round-trip), `src/features/exercise/weight-scope.integration.test.tsx`
  (novo, 5 casos nas duas telas), `src/features/home/home.integration.test.tsx`,
  `src/features/settings/forms-as-pages.integration.test.tsx`
- ~25 outros arquivos de teste tocados apenas pela mudança de assinatura de
  `createGym`/`saveWeight`
- `openspec/project.md` — entidades e Key Design Decisions 1–3

### Specs Updated

- `openspec/specs/weights/spec.md` — *Track Target Weight Per Gym* virou
  *Track a Global Target Weight*; *Weight Change History Per Gym* virou
  *Weight Change History Follows the Scope*; *Edit and Save Weight* e *Delete a
  History Entry* atualizados; adicionados *Global Weight Sentinel*, *Per-Gym
  Exception Flag*, *Create, Update and Remove a Gym Exception*, *Gym Label Only
  Marks an Exception*, *Weight Badges Resolve Global Plus Exceptions* e
  *Migrate Existing Per-Gym Weights to Global*
- `openspec/specs/gyms/spec.md` — *Select the Active Gym* e *Edit and Delete
  Gyms* atualizados; adicionados *A New Gym Inherits the Global Weights* e
  *Deleting a Gym Preserves the Global Weights*; *Copy Weights When Creating a
  Gym* movido para `## Deprecated`
- `openspec/specs/data-portability/spec.md` — *Generate Example Data* e *Export
  Full Backup JSON* atualizados; adicionados *Backups Carry Global Weights* e
  *Restoring a Pre-Global Backup Promotes Weights*
- `openspec/specs/workout-sessions/spec.md` — *Session Exercise Detail*
  resolvendo global/exceção, com a flag e três cenários novos

### Nota de limpeza

Quatro specs fora dos deltas ainda descreviam o peso como "per-gym" e passariam
a contradizer a fonte da verdade: ajustada a redação (sem mudança de
comportamento) em `workout-sessions` (8 ocorrências, incluindo o Purpose),
`home-navigation` (*Open Exercise Detail*), `exercises` (*Reuse Exercises Across
Days and Categories*) e `ai-assistant` (a lista do que continua apontando para
um exercício atualizado).
