# Handoff: MyOneGym — Redesign (Dark Premium)

## Overview
Redesign do app mobile **MyOneGym**, um tracker de treinos com dados salvos localmente no dispositivo (IndexedDB, sem login/servidor). O redesign cobre 6 telas: lista de treinos, treino expandido com exercícios, treino em andamento, detalhe do exercício durante o treino, editar peso e configurações.

A proposta traz **duas direções visuais** (ambas dark premium, acento laranja). O time deve **escolher uma** antes de implementar (ou combinar elementos). Recomendação: decidir a direção e seguir os tokens/medidas dela abaixo.

## About the Design Files
O arquivo `MyOneGym Redesign.dc.html` neste bundle é uma **referência de design feita em HTML** — um protótipo que mostra o visual e o comportamento pretendidos, **não** código de produção para copiar direto. A tarefa é **recriar esses designs no ambiente do app real** (o MyOneGym é um app mobile — usar o stack existente: React Native, Flutter, Swift/Kotlin ou PWA, conforme o projeto) seguindo os padrões e a biblioteca de componentes já estabelecidos. Se ainda não houver ambiente, escolher o framework mais adequado e implementar lá.

O HTML usa ícones da biblioteca **Lucide** e as fontes **Sora / Manrope** (direção A) e **Archivo / Archivo Expanded** (direção B), além de **JetBrains Mono** para micro-labels. Use os equivalentes da plataforma.

## Fidelity
**High-fidelity (hifi).** Cores, tipografia, espaçamento e estados finais estão definidos. Recreie pixel-perfeito usando as libs do codebase. As imagens dos exercícios são **placeholders listrados** ("GIF DO EXERCÍCIO") — no app real entram os GIFs/imagens já cadastrados por exercício.

---

## Direções

### Direção A — "Momentum" (recomendada para legibilidade)
Refinada e calma. Fontes **Sora** (títulos) + **Manrope** (corpo). Cantos arredondados (raio ~22px), anel de progresso semanal, card de "próximo treino" em destaque, hierarquia suave.

### Direção B — "Blaze" (recomendada para atitude/energia)
Ousada, alto contraste. Fontes **Archivo / Archivo Expanded** em CAIXA-ALTA. Cantos menores (raio ~16px), números gigantes, hero em gradiente laranja, barras de acento na lateral esquerda dos cards.

---

## Design Tokens

### Cores — Direção A (Momentum)
- `bg` (fundo app): `#0b0b0e`
- `surface-1` (cards): `#151519`
- `surface-2` (chips/inputs): `#1d1d23`
- `surface-3` (trilhas/vazio): `#26262e`
- `border/line`: `rgba(255,255,255,0.07)`
- `text`: `#f4f4f6`
- `muted` (texto secundário): `#8b8b95`
- `dim` (texto terciário/ícone off): `#5f5f68`
- `accent`: `#ff5a36`
- `accent-2` (gradiente): `#ff7a52`
- `accent-soft` (fundo tint): `rgba(255,90,54,0.15)`
- `accent-border`: `rgba(255,90,54,0.28)`
- `on-accent` (texto sobre laranja): `#160a06`

### Cores — Direção B (Blaze)
- `bg`: `#0a0807`
- `surface-1`: `#161110`
- `surface-2`: `#1f1815`
- `surface-3`: `#2b211c`
- `border/line`: `rgba(255,255,255,0.06)`
- `text`: `#fbfaf9`
- `muted`: `#94897f`
- `dim`: `#63594f`
- `accent`: `#ff5a36` · `accent-2`: `#ffab3d` (gradiente 135°)
- `accent-soft`: `rgba(255,90,54,0.16)` · `accent-border`: `rgba(255,90,54,0.32)`
- `on-accent`: `#160a06`

### Tipografia
- **A**: títulos Sora 700/800; corpo Manrope 400–800. Micro-labels JetBrains Mono 600–700, `letter-spacing:.1–.14em`, uppercase.
- **B**: títulos Archivo Expanded 800/900 UPPERCASE; corpo/UI Archivo 600–900. Números grandes em Archivo Expanded 900. Micro-labels JetBrains Mono uppercase.
- Escala usada: título de tela 22–24px, título de card 15–19px, corpo 13–15px, secundário 12–13px, micro-label 11–12px. Números de peso: 16–19px (linhas), 40–46px (destaque).

### Raio de borda
- A: cards 22px, sub-cards/rows 16px, chips/botões 11–15px, pills 999px.
- B: cards 16–18px, rows 12–13px, chips/botões 9–14px.

### Espaçamento
- Padding lateral do conteúdo: 20–22px. Gap entre cards: 9–14px. Padding interno de card: 14–18px.

### Sombras
- Moldura do device (só no mockup): `0 40px 80px -20px rgba(0,0,0,.7)`. No app não é necessário — o telefone é o próprio dispositivo.

### Ícones (Lucide → equivalente da plataforma)
`dumbbell`, `history`, `settings`, `play`, `chevron-down/up/left/right`, `arrow-left`, `trash-2`, `pencil`, `save`, `calendar`, `tag`, `building-2`, `check`, `circle-check`, `flag`, `clock`, `type`, `database`, `signal`, `wifi`, `battery-full`.

---

## Screens / Views

> Medidas são referência para viewport mobile ~390px de largura. O que descrevo abaixo vale para as duas direções; onde diferem, indico (A) / (B).

### 1. Treinos (home / lista)
- **Purpose**: escolher e iniciar o treino do dia; ver progresso da semana.
- **Layout**: header fixo no topo; conteúdo rolável; bottom nav fixo (3 abas).
- **Header**: ícone do app (quadrado 40–44px, gradiente laranja, ícone `dumbbell`) + wordmark "MyOneGym"; à direita seletor de academia (pill com `building-2` + "Fit Park" + `chevron-down`).
- **Resumo semanal (A)**: card com anel SVG de progresso (63/157 ≈ 60%), label "ESTA SEMANA", "3 / 5 treinos", à direita "+2 dias / sequência".
- **Hero próximo treino (B)**: card grande em gradiente laranja, label "PRÓXIMO TREINO", título "DIA 1 / PEITO & TRÍCEPS", subtítulo "6 exercícios · ~48 min", botão preto full-width "INICIAR AGORA".
- **Lista de dias**: cards com título "Dia N · Grupo", subtítulo com grupos musculares. (A) botão/pill "Iniciar" tint laranja + chevron; primeiro card em destaque com CTA laranja preenchido. (B) número "0N" grande à esquerda, barra de acento lateral no card do próximo, botão redondo de play laranja-tint.
- **Bottom nav**: Treinos (`dumbbell`), Sessões (`history`), Config (`settings`). Aba ativa em laranja; demais em `muted`.
- **Copy dos dias**: Dia 1 · Peito e Tríceps (Peito · Tríceps); Dia 2 · Core e HIIT (Core · Cardio); Dia 3 · Costas e Bíceps (Costas · Bíceps); Dia 4 · Full Upper (Peito · Costas · Bíceps · Tríceps); Dia 5 · Ombros e Trapézio (Ombros · Trapézio).

### 2. Treino expandido
- **Purpose**: ver os exercícios de um dia antes de iniciar.
- **Layout**: igual à home, mas o card do dia está expandido e lista os exercícios; botão "Iniciar" no cabeçalho do card + chevron-up.
- **Row de exercício**: thumbnail 46–48px (placeholder listrado no mock), nome + categoria, e o peso à direita — (A) chip "20 kg"; (B) número grande "20" + "KG" laranja. Último item com `opacity:.6` sugerindo scroll.
- **Exercícios (Dia 1)**: Supino Reto com Barra (Peito, 20kg); Supino Inclinado com Barra (Peito, 15kg); Crucifixo Reto (Peito, 80kg); Tríceps Pulley Barra Reta (Tríceps, 35kg); Tríceps Testa com Barra Reta (Tríceps, 8kg); Mergulho em Paralelas (Tríceps, 40kg).

### 3. Treino em andamento
- **Purpose**: marcar exercícios como concluídos e finalizar o treino.
- **Layout**: header com back + título "Treino em andamento" + `trash-2`; card de status; lista de exercícios com checkbox; botão fixo no rodapé "Concluir treino".
- **Card de status**: nome do dia, chips ("Fit Park" com `building-2`, "iniciado hoje" com `clock`), progresso: "2 de 6 concluídos", "33%", barra de progresso. (B) card em gradiente laranja com % gigante.
- **Row de exercício**: círculo de check à esquerda (preenchido laranja com `check` quando concluído; contorno quando não), thumbnail, nome/categoria, peso. Concluídos ficam com texto `muted` e `line-through`. (B) destaca o exercício "atual" com borda laranja e label "· atual".
- **Rodapé**: botão "Concluir treino" laranja full-width. Regra: habilitar só com ≥1 exercício marcado (texto de ajuda "Marque ao menos um exercício para concluir." quando 0).

### 4. Detalhe do exercício (durante o treino)
- **Purpose**: ver o exercício atual, marcar concluído e navegar entre exercícios.
- **Layout**: header back + nome; imagem grande (~172–180px, cantos arredondados); título + chips (`tag` Peito, `calendar` Dia 1); ações; card de peso usado.
- **Ações**: botão primário laranja "Concluir" (com `circle-check`); abaixo, dois botões "Voltar" (`chevron-left`) e "Avançar" (`chevron-right`). (A) Concluir acima dos nav; (B) card de peso acima e Concluir/nav abaixo — ambos válidos, seguir a direção escolhida.
- **Card peso usado**: label "PESO USADO", pill "Fit Park", número grande "20 KG", botão "Editar" (`pencil`). (A) mostra referência "última vez · 19,5 kg".

### 5. Editar peso
- **Purpose**: ajustar o peso alvo/usado com stepper e unidade.
- **Layout**: header back + nome; imagem menor; título + chips; card de edição.
- **Card de edição**: label "PESO ALVO" + pill "Fit Park"; stepper — botão "−" (surface), campo central com borda laranja mostrando "19,5" (número grande), botão "+" laranja; toggle de unidade segmentado **KG / LB / #** (KG ativo em laranja); rodapé com "Cancelar" (surface) e "Salvar" (laranja, com `save`), Salvar mais largo (~1.4x).
- **Formato de número**: decimal com vírgula (pt-BR), ex.: "19,5".

### 6. Configurações
- **Purpose**: acessar cadastros, aparência e dados.
- **Layout**: header "Configurações" + seletor de academia; grupos com label de seção; bottom nav (aba Config ativa).
- **Grupo CADASTROS**: Academias (`building-2`, sub "Copie pesos ao criar uma nova", contagem 1); Categorias (`tag`, "Grupos musculares (editáveis)", 8); Exercícios (`dumbbell`, "Nome, imagem/GIF e categoria", 27); Dias de treino (`calendar`, "Selecione os exercícios de cada dia", 6). Cada row: ícone em quadrado tint laranja, título, subtítulo, contagem, `chevron-right`.
- **Grupo APARÊNCIA**: Aparência (`type`, "Tamanho da fonte do app").
- **Grupo DADOS**: Backup (`database`, "Gerar exemplo · exportar · importar backup").
- **Rodapé**: nota "Todos os dados ficam apenas neste dispositivo (IndexedDB). Sem login, sem servidor."
- (A) rows agrupados num card com divisores; (B) rows separados com barra de acento lateral.

---

## Interactions & Behavior
- **Iniciar treino**: da home ou do card expandido → cria uma sessão "em andamento" e abre a tela 3.
- **Marcar exercício**: toca no círculo → alterna concluído; atualiza contador e % (barra anima ~200ms ease-out).
- **Concluir treino**: habilitado só com ≥1 marcado; finaliza sessão e volta para a home (atualiza progresso da semana).
- **Editar peso**: stepper ±; incremento sugerido 0,5 (kg). Unidade KG/LB/#. Cancelar descarta, Salvar persiste no exercício **para a academia selecionada**.
- **Voltar/Avançar** (tela 4): navega entre exercícios da sessão mantendo o estado de conclusão.
- **Seletor de academia**: troca o conjunto de pesos exibido (pesos são por academia). "Copie pesos ao criar uma nova" indica que ao criar academia os pesos podem ser clonados.
- **Estados**: vazio (nenhum treino), 0% (nada marcado, CTA de concluir desabilitado + hint), concluído (100%). Hover/press: escurecer/opacizar levemente superfícies; botões laranja escurecem no press.

## State Management
- `academiaSelecionada` (ex.: "Fit Park") → filtra pesos.
- `dias[]` (treinos) com `exercicios[]` (id, nome, categoria, peso, unidade, imagem).
- `sessaoAtual`: `{ diaId, iniciadoEm, concluidos: Set<exercicioId>, indiceAtual }`.
- Progresso semanal derivado do histórico de sessões concluídas.
- Persistência **local** (IndexedDB no web; storage equivalente no nativo). Sem rede.

## Assets
- **Ícones**: Lucide (nomes listados em Design Tokens). No app, usar a lib de ícones do projeto.
- **Fontes**: A → Sora + Manrope; B → Archivo + Archivo Expanded; ambas + JetBrains Mono para micro-labels. (Google Fonts.)
- **Imagens de exercício**: placeholders no mock. No app, usar os GIFs/imagens já cadastrados por exercício (crédito "MUNDO Boa Forma" nas imagens de origem — verificar direitos antes de distribuir).

## Files
- `MyOneGym Redesign.dc.html` — protótipo com as duas direções (1a Momentum, 1b Blaze), 6 telas cada. Abra no navegador para inspecionar medidas, cores e estados. (Opcional: capturas em `screenshots/` do projeto.)
