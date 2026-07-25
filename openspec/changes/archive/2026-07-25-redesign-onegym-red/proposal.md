# Proposal: Redesign "OneGym Red" — identidade vermelha

**Change ID:** `redesign-onegym-red`
**Created:** 2026-07-25
**Status:** Proposal — aguardando aprovação
**Supersedes:** `redesign-momentum-dark` (implementado em 2026-07-10)

---

## Problem Statement

O app hoje roda a identidade **Momentum** (`redesign-momentum-dark`): fundo
`#0b0b0e`, acento laranja `#ff5a36`, três famílias de fonte (Sora + Manrope +
JetBrains Mono) e um anel de progresso no card da semana.

Existe uma folha de identidade nova (`new-design/reference/identity-sheet.png`)
que define uma linguagem diferente e mais fechada: preto quase absoluto, um
**vermelho de marca**, uma única família tipográfica, cantos em pílula e um
conjunto de ícones próprio. O app não a implementa.

Além do desalinhamento visual, há dois problemas concretos herdados:

1. **O card da semana responde "quanto", nunca "quando".** O anel mostra 43% e a
   contagem mostra "3 / N treinos". Nenhum dos dois diz que faltou quarta, nem
   que já são três dias sem treinar — que é a informação que muda comportamento.
2. **O denominador não significa o que parece.** `HomePage.tsx:132` passa
   `days.length` como total, ou seja: "3 / 4 treinos" quer dizer "3 sessões
   contra 4 dias cadastrados". Quem cadastra 9 dias num rodízio longo nunca fecha
   "9 / 9" numa semana de 7 dias.

Há ainda uma dívida de governança de cor que este redesign expõe: **a cor de
marca existe em cinco cópias independentes** (`tokens.css`, o `theme-color` de
`index.html`, `theme_color`/`background_color` do `vite.config.ts`,
`public/icon.svg` + `public/favicon.svg`, e o bloco `C` de `renderCard.ts`). Os
ícones do PWA já estão fora de sincronia hoje: usam `#B8524E`, que não é nem o
acento atual nem o fundo.

## Proposed Solution

Re-skin do PWA para a identidade **OneGym Red**, mantendo dados, rotas e
comportamento — com **duas exceções deliberadas** no card da semana, declaradas
abaixo e refletidas nos delta specs.

- **Tokens (dark-only, segue sem tema claro).** `--surface-0: #050607`,
  `--surface-1: #0c0f14`, acento `#ec2c2e` com gradiente vertical (180°) para
  `#ba2324`. Raios em pílula: `--r-btn: 999px`, `--r-card: 20px`.
- **Tipografia: três famílias → uma.** Poppins em dois pesos (400/700) via
  `@fontsource/poppins`, self-hosted como hoje. `--font-mono` **mantém o nome**
  mas passa a ser o papel "micro-label" em Poppins, para nenhum consumidor
  precisar mudar.
- **Escala de fonte padrão 150% → 125%.** Decisão de produto tomada junto: a 150%
  o card de dia fica apertado. Requer mudar `tokens.css` **e**
  `FONT_SCALE_DEFAULT` em `src/state/settings.ts` — se divergirem há flash na
  primeira pintura (`tokens.css:49` documenta isso).
- **Ícones: Tabler continua a base.** O app usa **34 glifos Tabler em 77 pontos**
  via `src/ui/Icon.tsx`. O conjunto PNG da referência cobre ~16 conceitos, então
  ele **complementa** e não substitui: entram como máscara CSS
  (`mask-image` + `currentColor`) só onde são assinatura de marca — tab bar,
  play, chevron, prédio e os avatares de grupo muscular.
- **Card da semana: anel → trilha de sete dias.** Sete células seg→dom, cada uma
  `feita` / `hoje` / `futuro` / `vazia`, com a contagem como título. **Meta fixa
  em 7.**
- **Card de dia reestruturado:** nome do dia na primeira linha (largura inteira),
  e avatar + categorias + `Iniciar` + seta na segunda.
- **PWA e favicon** passam para a paleta nova, incluindo ícones PNG 192/512 e
  maskable, que hoje não existem.

## Scope

### In Scope
- `src/styles/tokens.css`, `global.css`, `fonts.css` e as 4 folhas de feature.
- Novo `src/styles/icons.css` (sistema de máscara PNG) e os 16 PNGs de marca.
- Troca de `@fontsource/{sora,manrope,jetbrains-mono}` por `@fontsource/poppins`.
- `--font-scale` padrão 1.5 → 1.25 (CSS + `settings.ts`).
- Card da semana: trilha de 7 dias, meta fixa em 7, badge de ofensiva.
- Card de dia: nome em linha própria + avatar de grupo muscular.
- Sincronizar as 5 cópias da cor de marca, incluindo `renderCard.ts`.
- Ícones do PWA (192/512/maskable) e `theme-color`.

### Out of Scope
- Qualquer mudança de schema, persistência, rotas ou lógica de sessão/peso/dia.
- Substituir os 34 glifos Tabler por PNG (o conjunto da referência não cobre).
- Tema claro (o app segue dark-only).
- Marcar dia perdido com **X** — ver "Decisão em aberto" abaixo.

## Impact Analysis

| Componente | Muda? | Detalhe |
|---|---|---|
| Database | Não | Nenhuma migração. `Session.completedAt` já existe e é indexado (`db.ts:41`). |
| API | Não | Não há backend. |
| State | Não | Trilha e ofensiva são **derivadas** de histórico existente. Nenhum estado novo persistido. |
| UI | Sim | Tokens, fontes, ícones, e reestrutura de dois blocos da Home. |
| Comportamento | **Sim (2)** | Denominador `days.length` → `7`; anel → trilha. Declarado nos delta specs. |

## Architecture Considerations

- **As folhas novas são drop-in:** os nomes de classe conferem com o que o TSX já
  emite, então a maior parte da mudança é substituição de arquivo.
- **Dois tokens são escritos em runtime** e a folha nova precisa preservá-los com
  os mesmos fallbacks: `--kb-inset` (`lib/keyboardInset.ts:39`) e
  `--action-bar-h` (`ui/ActionBar.tsx:24`, fallback **`76px`** em `.toast`, não
  zero).
- **`--fs-xl` tem que continuar ≥16px efetivos** ou o iOS dá zoom no foco de
  input. A 125%: `1rem × 1.25 = 20px` — folgado.
- **`renderCard.ts` não lê CSS variables** (é canvas), por design
  (`renderCard.ts:3-14`). Os *tamanhos* de fonte devem continuar literais — um
  PNG compartilhado é peça de tamanho fixo, e ele nunca deve ler `--font-scale`.
  Já **cor e família precisam de sincronia manual**, incluindo um literal que
  escapou do bloco `C`: `rgba(255,255,255,0.14)` em `renderCard.ts:158`.
- **Avatar de grupo muscular exige um mapa novo.** Não existe conceito de grupo
  muscular no modelo: `Category` é `{ id, name }` livre e `Day` é
  `{ name, exerciseIds, order }`. O avatar sai de um mapa puro
  `nome de categoria → asset`, com fallback no halter. É a única lógica nova de
  UI, e não toca dado.
- **`workbox.globPatterns` inclui `png`** (`vite.config.ts:35`), então qualquer
  PNG que caia no build entra no precache do service worker. `new-design/reference/`
  (4,4 MB) **não pode** ir para `public/`.

## Decisão em aberto (precisa de resposta antes do apply)

**A meta conta sessões ou dias treinados?** Hoje soma **sessões**:
`listSessionSummaries` (`repos.ts:528`) não desduplica por dia, então dois
treinos na terça contam 2. Com a trilha isso fica visível — o número diz 4 e
aparecem 3 células cheias, o que lê como bug. O estado `.wd.multi` sinaliza o dia
com mais de uma sessão, mas a divergência de contagem é decisão de produto.

**Nota sobre o X:** com a meta fixa em 7, *todo* dia passa a ser esperado, e um
dia passado sem sessão é genuinamente uma falta — então marcar **X** ficou
tecnicamente honesto, sem precisar de campo novo. Ficou **fora** de propósito: a
proposta aprovada usa vazio, e com meta 7 quem treina 4× por semana veria três X
toda semana. A regra `.wd.missed` fica disponível para trocar depois.

## Success Criteria

- [ ] Paleta, Poppins e raios em pílula aplicados nas 6 telas.
- [ ] Poppins carrega offline (nenhuma request em runtime); Sora/Manrope/JetBrains
      removidos de `package.json`.
- [ ] Home mostra a trilha de 7 dias com meta 7 e estado zero válido.
- [ ] `--font-scale` segue rescalando 100–200% sem clipping; padrão 125% em CSS
      **e** em `settings.ts`.
- [ ] Cor de marca idêntica nas 5 cópias, `renderCard.ts` incluído.
- [ ] `npm test` passa sem alterar asserção nenhuma.
- [ ] `npm run build` passa e o precache não cresce com asset de referência.

## Risks & Mitigations

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| **O wordmark quebra `App.test.tsx:29`** | **Alta** | Médio | O mockup usa `My<em>One</em>Gym`, e `findByText('MyOneGym')` pode casar com `<h1>` e com o `<span>` ao mesmo tempo ("found multiple elements"). Verificar rodando o teste; se quebrar, manter o texto num nó só e colorir via `::first-line`/span único, **sem** mudar a asserção. |
| Renomear classe trava em teste | Média | Alto | `screen`, `has-action-bar`, `action-bar`, `ex-chips`, `chip`, `accent`, `media-fallback`, `hero-media`, `thumb` são assertadas; e `.ex-title` **não pode** existir (`detail-header.integration.test.tsx:62`). Nenhuma delas muda nesta proposta. |
| `Iniciar`/`Continuar` perde o nome acessível | Média | Alto | 8 asserções usam `getByRole('button', { name: 'Iniciar' })`. O `<i class="png-ic pi-play">` não tem texto e vai com `aria-hidden` — nome acessível intacto. |
| Featured day deixa de ser `<li>` | Baixa | Alto | `next-workout.integration.test.tsx:55` faz `getByText('Próximo treino').closest('li')`. A reestrutura do card mantém `ul.accordion > li.day`. |
| Estilo inline vence o CSS novo | **Alta** | Baixo | `GymSelector.tsx:21` (padding + `fontSize: 12`), `Chrome.tsx:30`, `SettingsPage.tsx:32` (`fontSize: 16`) e outros sobrescrevem a folha. Remover os inline nos pontos que o redesign estiliza. |
| `logo-mark.png` infla o precache | Média | Médio | 201 KB — 85% do peso dos assets. Otimizar antes de ir para `public/`. |
| Escala 125% muda o app para quem já usa | Média | Médio | Verificar se `settings.ts` persiste o padrão ou só escolha explícita; se só explícita, é mudança visível no upgrade. |
| 3 changes OpenSpec não arquivadas | **Alta** | Médio | `openspec-approve-apply.yml:83` espera **exatamente uma**. Já existem duas (`redesign-momentum-dark`, implementada, e `exercise-form-hero-media`). **Arquivar `redesign-momentum-dark` antes do apply.** |

---

## Archive Information

**Archived:** 2026-07-25
**Duration:** criada e arquivada em 2026-07-25
**Outcome:** Implementado, com follow-ups declarados

### Specs Updated

- `openspec/specs/app-foundation/spec.md`
  - **Adicionados:** `Dark Premium Visual Identity`, `Brand Colour Has a Single
    Governed Source`, `Typography`, `Icon System`.
  - **Alterados:** `Legible, Scalable Base Typography` e `User-Adjustable Font
    Size` — o padrão de escala passou de 150% para 125% em três pontos que
    contradiziam o delta.
- `openspec/specs/home-navigation/spec.md`
  - **Adicionados:** `Weekly Training Summary` (meta fixa em 7 + trilha de sete
    dias) e `Training Day Card` (nome em linha própria, avatar, e o rótulo do
    botão reservado ao dia em destaque / em resume).

**Nota sobre o merge.** Os delta specs declaram estas requirements como
`MODIFIED` sobre a identidade `redesign-momentum-dark`. Aquela change **nunca foi
arquivada**, então as requirements que ela definia jamais entraram na fonte da
verdade — não havia o que modificar. Foram portanto **adicionadas**, já na versão
OneGym Red. Pelo mesmo motivo, a requirement `Weekly progress ring` listada em
`REMOVED` não existia em `openspec/specs/` e não foi movida para `Deprecated`:
registrar uma remoção de algo que nunca esteve lá inventaria histórico.

### Follow-ups (não entregues, com motivo)

| # | Item | Motivo |
|---|---|---|
| 0.1 / 0.2 | Arquivar `redesign-momentum-dark` e `exercise-form-hero-media` | Ação sobre changes de terceiros. **Segue travando `openspec-approve-apply.yml:83`**, que espera exatamente uma change não arquivada — ainda há duas. |
| 4.1 | Otimizar `logo-mark.png` (205 KB) | Ambiente sem `pngquant`/`oxipng`/`optipng`/ImageMagick/PIL/sharp. É o asset mais pesado do precache do service worker. |
| 4.5 | Ícones PNG 192/512/maskable | Mesmo bloqueio. Os dois SVG foram recolorizados; o manifest segue apontando para `icon.svg` em `any` e `maskable`. |
| 6.6 | Query por intervalo de data em `listSessionSummaries` | Opcional, declarado não-bloqueante. `repos.ts` continua carregando o histórico da academia e filtrando em memória. |
| 8.4 | Varredura dos px inline restantes | Fora do que o redesign estiliza. |
| 9.5–9.8 | Passes manuais (device 360/430/1280, PWA instalado, share card, 100–200%) | Não verificáveis neste ambiente. |
| 10.1 | A meta conta sessões ou dias treinados? | Decisão de produto, em aberto. `.wd.multi` deixa a divergência legível enquanto isso. |
| — | Comentários citando "the shipped 150% scale" | O app envia 125%; o 1.5 sobrevive só no mockup `new-design/css/tokens.css`. Os px citados nos comentários estão ~20% acima do real. |

### Files Modified

- `src/styles/` — `tokens.css`, `global.css`, `fonts.css`, novo `icons.css`
- `src/features/` — `home/` (HomePage.tsx, home.css), `session/` (session.css,
  `share/renderCard.ts`), `exercise/exercise.css`, `settings/appearance.css`
- `src/state/settings.ts` — `FONT_SCALE_DEFAULT` 1.5 → 1.25
- `src/App.test.tsx`, `src/App.onboarding.test.tsx` — asserção do wordmark
- `index.html`, `vite.config.ts`, `public/icon.svg`, `public/favicon.svg`
- `new-design/` — mockups, folhas drop-in e assets de marca (fonte do redesign)
