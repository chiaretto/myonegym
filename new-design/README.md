# MyOneGym — Redesign visual (proposta)

Identidade nova aplicada às telas reais do app, em HTML estático.
**Nada em `src/` foi alterado.** Isto é para você olhar, aprovar (ou pedir ajuste)
antes de qualquer mudança no código.

Fonte da verdade: as três imagens que você mandou, guardadas em `reference/`.

---

## Como abrir

Abra `new-design/index.html` no navegador — não precisa build nem servidor.
`index.html` é a galeria e linka todas as outras páginas.

> As páginas puxam **Poppins** do Google Fonts e a webfont do Tabler por CDN, só
> para o mockup carregar sem instalar nada. No app, as fontes ficam **locais**
> (`@fontsource/poppins`), porque o PWA é offline-first.

---

## O que está aqui

```
new-design/
├── index.html              galeria — comece por aqui
├── style-guide.html        paleta, tipografia, ícones, botões, chips, superfícies
├── brand.html              assinaturas, splash, variantes de ícone do app
├── home.html               /                        (HomePage)
├── exercise-detail.html    /exercise/:id            (ExerciseDetailPage)
├── session-runner.html     /session/:id             (SessionPage)
├── session-history.html    /sessions                (SessionsPage)
├── settings.html           /settings                (SettingsPage)
├── settings-forms.html     lista com filtros · formulário · Aparência · vazio · sheet
├── css/
│   ├── tokens.css          ← substitui src/styles/tokens.css
│   ├── global.css          ← substitui src/styles/global.css
│   ├── icons.css           ← NOVO: sistema de ícones PNG
│   ├── home.css            ← substitui src/features/home/home.css
│   ├── session.css         ← substitui src/features/session/session.css
│   ├── exercise.css        ← substitui src/features/exercise/exercise.css
│   ├── appearance.css      ← substitui src/features/settings/appearance.css
│   └── mockup.css          só para o mockup (moldura de celular, galeria) — não vai pro app
├── assets/                 18 PNGs recortados da referência
└── reference/              as imagens originais + recorte da splash
```

As folhas em `css/` usam **exatamente os mesmos nomes de classe** do código que
está no ar. Isso é de propósito: aplicar o redesign é, na maior parte,
**copiar arquivo por cima**. Cada mudança em relação ao que existe hoje está
marcada com `CHANGED:` ou `NEW:` nos comentários.

---

## Escopo

**Muda:** cor, tipografia, peso de fonte, raio de canto, sombra, gradiente,
ícones, o símbolo da marca, e alguns elementos visuais novos da identidade
(faixa vermelha, avatar de grupo muscular, watermark, textura).

**Não muda:** nenhuma funcionalidade, nenhuma rota, nenhum dado, nenhum texto de
interface, nenhum tamanho de fonte (`--fs-*` e a escala de 150% ficam idênticos),
nenhum comportamento de navegação, de sessão ou de backup.

---

## A identidade

### Paleta

| Token | Hoje (laranja) | Novo | Origem |
|---|---|---|---|
| `--surface-0` | `#0b0b0e` | `#050607` | **ajuste** |
| `--surface-1` | `#151519` | `#0C0F14` | **ajuste** |
| `--surface-2` | `#1d1d23` | `#14171D` | derivado |
| `--surface-3` | `#26262e` | `#1E2329` | derivado |
| `--text-primary` | `#f4f4f6` | `#FFFFFF` | folha de identidade |
| `--text-secondary` | `#8b8b95` | `#8A8F98` | folha de identidade |
| `--text-muted` | `#5f5f68` | `#5C6069` | derivado |
| `--accent` / `--fill-accent` | `#ff5a36` | `#EC2C2E` | **ajuste** |
| `--accent-2` | `#ff7a52` | `#BA2324` | derivado (razão 0,79 do novo accent) |
| `--text-accent` | `#ff7a52` | `#EC2C2E` | mesmo que --accent |
| `--on-accent` | `#160a06` | `#FFFFFF` | **a referência usa texto branco no vermelho** |
| `--danger` | `#ff6f5e` | `#FFA94D` | âmbar — tirado do vermelho de propósito |
| `--bg-danger` | — | `rgba(255,169,77,0.15)` | novo |
| `--border-danger` | — | `rgba(255,169,77,0.42)` | novo |

As cores base foram ajustadas: `#050607` (fundo), `#0C0F14` (cards),
`#EC2C2E` (accent). Os demais tokens são derivados, porque o app precisa de
degraus que a folha não desenha: chip, input, trilha de progresso e o fim do
gradiente.

O gradiente do botão corre **180°** (escurece para baixo) com razão ≈ 0,79 medida
na arte. Aplicada a `#EC2C2E` resulta em `#BA2324`. Hoje o app usa `135deg`.

#### O novo accent #EC2C2E

O novo vermelho é **mais claro e saturado** que o anterior. Isso muda dois tokens:

- **`--text-accent` = `#EC2C2E` (o próprio accent).** Diferentemente do `#BE2125`
  (que como texto só alcançava 3,1:1), o novo vermelho é legível diretamente como
  texto sobre `#050607` — **4,5:1**, passa AA.
- **Tints mais leves.** `--bg-accent` é 16% e `--border-accent` é 42% — valores
  mais baixos que antes, porque um vermelho mais claro precisa de menos opacidade
  para manter presença visual. O resultado composto fica harmonioso.

#### Danger saiu do vermelho

`--danger` foi de `#FF6B6B` para **`#FFA94D`** (âmbar), e ganhou dois tokens
próprios: `--bg-danger` e `--border-danger`.

O motivo não é estética, é confusão real. Com a marca em vermelho, o
`--danger` vermelho ficava indistinguível de `--text-accent` (`#E8484C`). As duas
cores **co-ocorrem em Configurações → Backup**: um `.row-sub.warn` (destaque de
marca) fica algumas linhas acima da linha destrutiva “Apaga todos os dados…
Não pode ser desfeito”. E em `.btn.danger`, “Excluir” lia como uma ação comum ao
lado de “Salvar”.

O par a otimizar é, portanto, **danger vs `--text-accent`** — não danger vs
`--accent`. Eles estão separados em **dois eixos**:

| | `--text-accent` | `--danger` | distância |
|---|---|---|---|
| matiz | 358,5° | 31° | ~32° |
| luminância | 0,223 | 0,502 | **2,0:1** |

O eixo de luminância é o que sustenta a distinção em protanopia e deuteranopia —
lá o matiz colapsa, o claro/escuro não. Vale registrar que **uma primeira versão
usava `#F59042`**, com os mesmos ~32° de matiz mas só **1,6:1** de luminância —
ou seja, separação praticamente só por matiz, que é exatamente o que não
funciona. Daí o âmbar mais claro.

Cor também não é o único sinal: toda ação destrutiva no app carrega o glifo de
lixeira e uma confirmação.

Contraste: **9,9:1** como texto sobre `--surface-0`, e 9,9:1 para o texto escuro
sobre o preenchimento âmbar de `.row-ic.danger` — passa AA nas duas direções.

**Dois bugs de token vieram à tona e foram corrigidos** — os dois já existem no
app hoje:

- `.btn.danger` tinha `border-color: var(--border-accent)`, ou seja, **contorno
  vermelho da marca num botão destrutivo**. Agora usa `--border-danger`.
- `.tl-delete:active` (excluir um registro de peso) pintava o botão com
  `--bg-accent` e `--border-accent` — o **tint da marca ao apertar excluir**.
  Agora usa o tint de danger.

**O que continua na marca, e deve continuar:** `.row-sub.warn`. Apesar do nome,
ele marca a **academia ativa** (`GymsPage`) — é destaque, não aviso. Segue em
`--text-accent`.

**O que isso custa:** abre mão da convenção “vermelho = destrutivo”. Se você
preferir manter vermelho e separar só por profundidade, é trocar os três tokens
`--danger` / `--bg-danger` / `--border-danger` em `tokens.css` — nada mais no CSS
precisa mudar. Dá para ver os dois lado a lado na seção **“Erro e destrutivo”**
do `style-guide.html`.

### Tipografia

Sai **Sora + Manrope + JetBrains Mono**, entra **Poppins** (Bold 700 e
Regular 400), como a folha define. São **três fontes menos** no bundle.

`--font-mono` **continua com esse nome** (nenhum consumidor precisa mudar), mas
aponta para Poppins: o papel dele no app é “micro-label em caixa alta com
tracking largo” (`.eyebrow`, `.group-label`, `.wc-label`, `.month-label`), não
“monoespaçada”. O tracking subiu de `0.12em` para `0.18em` para acompanhar a
referência.

### Forma

| Token | Hoje | Novo |
|---|---|---|
| `--r-card` | 22px | 20px |
| `--r-btn` | 14px | **999px** (a identidade é pill-first) |
| `--r-ctl` | 12px | 14px (inputs e steppers seguem retangulares) |
| `--r-row` | 16px | 16px |

Por consequência: botões, chips, badges de peso, `.tabs`, `.unit-seg`, `.icon-btn`
e os ícones circulares de linha (`.row-ic`) ficam totalmente arredondados.

---

## Ícones

Você pediu **PNG recortado da referência, não SVG novo**. Foi isso que foi feito
— e vale explicar o método e onde ele encosta no limite.

### Como foram extraídos

Cada PNG é um recorte real das imagens em `reference/`. O fundo quase-preto que
vinha embutido na arte foi convertido em **transparência**: para cada pixel,
o alfa vem do canal máximo e a cor é normalizada de volta ao brilho cheio (para
o `▷` branco sobre o vermelho, o inverso — alfa pelo canal mínimo). Isso devolve
line art limpa, com as bordas suavizadas preservadas, sem halo escuro. Os cinco
avatares de grupo muscular foram localizados automaticamente (varredura de
pixels vermelhos na coluna dos avatares) em vez de coordenadas no olho.

### Os 18 PNGs

| Arquivo | Origem | Tamanho |
|---|---|---|
| `logo-mark.png` | app-icon.png | 916×512 |
| `ic-dumbbell` `ic-muscle` `ic-flame` `ic-timer` `ic-target` | identity-sheet, painel ELEMENTOS VISUAIS | 21–35 px |
| `ic-tab-home` `ic-tab-history` `ic-tab-settings` | home-screen, tab bar | ~57 px |
| `ic-chevron-down` `ic-building` `ic-play` | home-screen | 17–27 px |
| `muscle-chest` `muscle-core` `muscle-back` `muscle-legs` `muscle-shoulders` | home-screen, avatares dos dias | 49–90 px |
| `pattern-dots.png` | identity-sheet, painel PATTERN / TEXTURAS | 145×91 |

### Como são usados

Como são line art de uma cor só, entram como **`mask-image`**: o PNG dá a
**forma**, o CSS dá a **cor** via `currentColor`. Um arquivo só cobre todos os
estados — o mesmo `ic-tab-home.png` fica vermelho na aba ativa e cinza na
inativa, sem precisar de um segundo arquivo. Um chevron serve para as quatro
direções por rotação.

Duas exceções ficam como `<img>` porque são bicromáticas de propósito:
`logo-mark.png` (M branco + 1 vermelho) e `pattern-dots.png`.

### O que **não** virou PNG, e por quê

O app usa uns 14 glifos utilitários — `check`, `plus`, `minus`, `pencil`,
`trash`, `share`, `tag`, `tags`, `calendar-event`, `database`, `text-size`,
`device-floppy`, `arrow-left`, `x` — que **não aparecem em nenhuma das três
imagens de referência**. Não existe PNG para recortar. Eles continuam no
`@tabler/icons-webfont` que o app já empacota e herdam a paleta nova via
`currentColor`, no mesmo estilo de traço da referência.

Se você quiser 100% PNG, o caminho é gerar essas 14 marcas na mesma linguagem
(traço fino, cantos arredondados) e cair em `assets/` — o `icons.css` só precisa
de mais 14 linhas. Diga se quer que eu faça.

---

## Elementos visuais novos

Todos vêm da referência, nenhum é invenção:

1. **Faixa vermelha vertical** na borda esquerda de cada card de dia
   (`.day::before`, 4px) — a assinatura mais forte da home de referência.
   Repetida nos cards do histórico, para “um dia de treino” ler igual nas duas telas.
2. **Avatar circular de grupo muscular** no card do dia (`.day-ic`, ~45px, cresce
   com a escala de fonte) com o line art vermelho dentro.
3. **Watermark do símbolo** sangrando na direita do card da semana e do hero da
   sessão (opacidade 0,07).
4. **Trilha de sete dias** no card da semana (`.week-track`), no lugar do anel de
   progresso — ver a seção “Resumo da semana” abaixo.
5. **Indicador vermelho no topo da aba ativa** da tab bar.
6. **Textura halftone** na splash.
7. **Símbolo PNG + logotipo em texto** na appbar, no lugar do quadradinho com
   gradiente e glifo de barra que existe hoje.

---

## Resumo da semana — a única mudança de comportamento

Todo o resto deste redesign é cosmético. **Este item não é**, e por isso está
separado: o card da semana trocou o anel de progresso por uma **trilha de sete
dias** (proposta A, escolhida em `week-proposals.html`), e a meta passou a ser
**fixa em 7**.

O anel respondia *quanto* e nunca *quando* — e é o “quando” que faz alguém notar
que está há três dias parado.

### O que muda no TSX (não dá para fazer só com CSS)

| | hoje | depois |
|---|---|---|
| denominador | `days.length` (`HomePage.tsx:132`) | `7` |
| gráfico | `<div class="week-ring">` + SVG | `<ol class="week-track">` com 7 `<li>` |
| dado extra | — | sessões da semana agrupadas por dia |

**Enquanto a linha 132 não mudar, o mockup e o app discordam:** hoje quem tem 4
dias cadastrados vê “3 / **4** treinos”.

As regras `.week-ring` / `.ring-track` / `.ring-fill` / `.week-pct` **saíram do
`home.css`** e foram para `css/week.css`, que só a página de propostas carrega.
Ou seja: se o TSX continuar renderizando o SVG do anel depois desta troca, ele
aparece sem estilo. As duas mudanças têm que ir juntas.

### O que é derivável do dado existente

- **Em quais dias houve treino:** sim. `Session.completedAt` é epoch ms e está
  indexado (`db.ts:41`), e a semana já começa na segunda (`lib/week.ts`), então a
  ordem seg→dom da trilha bate com o que o app já calcula.
- **Falta um helper** para agrupar as sessões da semana por dia e os rótulos em
  pt-BR. E de preferência uma query por intervalo — hoje
  `listSessionSummaries` (`repos.ts:528`) carrega *todo* o histórico da academia
  e filtra em memória.
- **Sem migração de banco.**

### Estados da trilha

`done` (preenchido, com check) · `today` (anel vermelho aberto) · `future`
(tracejado) · `blank` (disco escuro — dia passado sem sessão).

O `blank` é um **disco preenchido, não um contorno**: uma borda de 1px em
`--border` é 7% de branco e desaparece na tela, e esse estado precisa ler como
“dia vazio”, não como “nada”.

### O X ficou viável — e eu deixei de fora de propósito

Eu tinha descartado o X porque `Day` (`types.ts:27`) não tem dia da semana, então
o app não sabia que um dia “era esperado”. **Com meta = 7, todo dia é esperado**,
e aí um dia passado sem sessão é genuinamente uma falta — sem precisar de campo
novo.

Mantive `blank` porque é o que a proposta A mostrava e é o que foi aprovado. Para
trocar, é `.wd.blank` → `.wd.missed` (a regra já existe em `week.css`). Antes de
fazer isso, considere o custo humano: **com meta 7, quem treina 4× por semana
passa a ver três X toda semana.** O X usa `--text-muted`, nunca `--danger` —
pintar de âmbar de alerta transformaria um dia de descanso em erro de sistema.

### Duas perguntas em aberto

1. **A meta conta sessões ou dias treinados?** Hoje o contador soma *sessões*
   (`repos.ts:528` não desduplica por dia), então dois treinos na terça contam 2:
   o número diz 4 e a trilha mostra 3 células cheias. O estado `.wd.multi` (ponto
   duplo na borda) avisa que ali houve mais de um, mas a divergência de contagem
   continua sendo uma decisão de produto.
2. **A ofensiva (`.week-streak`) entra?** É derivável de `completedAt`, mas é uma
   métrica que o app não calcula hoje. Remover o elemento remove a feature; nada
   mais depende dele.

Além disso, entrou **uma correção de robustez** que não é cosmética e vale
apontar: em `global.css`, o logotipo da appbar agora encurta com reticências e o
pill da academia nunca encolhe (`.appbar h1 { min-width: 0 }` + `.appbar .chip
{ flex-shrink: 0 }`). Sem isso, um nome de academia longo empurrava o pill para
fora da tela num celular de 360px — comportamento que já existe hoje. Verificado
em 360, 430 e 1280px: nenhuma página tem rolagem horizontal.

---

## Decisões que precisam do seu aval

**1. A arte de referência está com o nome errado.**
O logotipo desenhado nas imagens diz **“MyOneGyn”** — com **N** no fim, não M.
Está assim no ícone (`app-icon.png`) e no cabeçalho (`home-screen.png`).
Por isso o logotipo aqui é **texto em Poppins Bold** com “One” em vermelho, não
imagem: sai correto (“MyOneGym”), continua nítido em qualquer escala de fonte, e
só o símbolo (M1 + halteres) é PNG. Se preferir logotipo como imagem, precisamos
de uma arte nova, escrita certa.

**2. Resolução dos ícones pequenos.**
A folha de identidade tem 1024px de largura, então os cinco ícones do painel
ELEMENTOS VISUAIS medem **21 a 35 px** no original. Exibidos a ~24 px ficam bons
em tela comum, mas **suavizados em tela retina (2×/3×)**. Os ícones da tab bar e
os avatares vieram do screenshot (mais resolução) e estão OK. Se incomodar,
o melhor caminho é **regerar só esses cinco em 512px** na mesma arte — dá para
pedir ao mesmo gerador que fez a folha. Ampliar o recorte não resolve: não há
detalhe para recuperar.

**3. O avatar do dia precisa de uma regra de associação.**
Existem **5 imagens** de grupo muscular e **14 categorias** no seu banco. Nos
mockups eu mapeei na ordem da referência (Dia 1→peito, 2→core, 3→costas,
4→pernas, 5→ombros). No app, a regra que eu sugiro é: **primeira categoria do
dia → imagem**, com uma tabela `categoria → avatar` e um fallback para o halter.
Isso é a única parte do redesign que precisa de um pouco de lógica em TSX
(nada de dado novo, nada de migração). Quer assim, ou prefere sem avatar?

**4. A splash da referência usa uma fotografia** que não existe no repositório e
não dá para recortar com qualidade. Em `brand.html` a proposta reconstrói a
mesma atmosfera com brilho radial vermelho + a textura de pontos + o lockup
vertical, lado a lado com a referência. Se você produzir/licenciar a foto, ela
entra como `background-image` do `.splash` e o resto fica igual.

**5. Texto no botão vermelho vira branco** (`--on-accent`: `#160a06` → `#FFFFFF`).
É o que a referência mostra em toda parte. Com `#BE2125` o contraste fica
**6,1:1**, o que passa AA para qualquer tamanho de texto — sem ressalva. (Era o
único ponto frágil da paleta quando o vermelho ainda era `#FF2D55`: lá dava
3,9:1, suficiente só para texto grande/negrito.)

---

## Plano de aplicação no app

Quando você aprovar, a ordem é esta. Cada fase é verificável sozinha.

### Fase 1 — fontes
```bash
npm i @fontsource/poppins
npm rm @fontsource/sora @fontsource/manrope @fontsource/jetbrains-mono
```
Reescrever `src/styles/fonts.css` importando `latin-400` / `500` / `600` / `700`
de Poppins.

### Fase 2 — tokens e folhas globais (só copiar)
| De | Para |
|---|---|
| `new-design/css/tokens.css` | `src/styles/tokens.css` |
| `new-design/css/global.css` | `src/styles/global.css` |
| `new-design/css/icons.css` | `src/styles/icons.css` *(novo — importar em `global.css`)* |
| `new-design/css/home.css` | `src/features/home/home.css` |
| `new-design/css/session.css` | `src/features/session/session.css` |
| `new-design/css/exercise.css` | `src/features/exercise/exercise.css` |
| `new-design/css/appearance.css` | `src/features/settings/appearance.css` |

Ajustar os caminhos de `url()` dentro de `icons.css`, `home.css` e `session.css`
para onde os PNGs forem parar (sugestão: `public/brand/`, referenciado como
`/brand/…`, que o Workbox já inclui no cache — o `globPatterns` atual pega `png`).

### Fase 3 — assets
Copiar `new-design/assets/*.png` para `public/brand/`.

Os 17 ícones somam ~40 KB — irrelevante. Mas **`logo-mark.png` tem 916×512 e
291 KB**, e no app ele aparece a ~48px (appbar), ~150px (splash) e como watermark
a ~40% da largura do card. Antes de publicar, exporte-o reduzido (uns 400px de
largura, ~30 KB): o Workbox coloca tudo no cache offline, então peso de asset
aqui é peso de instalação do PWA. O arquivo em `assets/` está no tamanho cheio de
propósito, para você ter o original.

### Fase 4 — os toques que exigem TSX
Poucos e pequenos:

- **`src/ui/Icon.tsx`** — aceitar um ícone PNG além do glifo Tabler. Sugestão:
  um segundo componente `<PngIcon name="dumbbell" />` que renderiza
  `<i className="png-ic pi-dumbbell" />`, deixando `<Icon>` como está. Zero risco
  para as chamadas existentes.
- **`src/ui/Chrome.tsx`** — `TabBar` passa a usar `PngIcon` (`home`, `history`,
  `settings`).
- **`src/features/home/HomePage.tsx`** — o `<h1>` da appbar troca o
  `.brand-mark` (span com glifo) pela `<img className="brand-mark">` +
  `<span className="wordmark">My<em>One</em>Gym</span>`; e o `.day-head` ganha o
  `<span className="day-ic">` com o avatar (decisão 3).
- **`src/features/gym/GymSelector.tsx`**, **`WeightEditor.tsx`**,
  **`SessionPage.tsx`** — trocar `<Icon name="building" />` por `PngIcon`
  (opcional, cosmético).
- **`src/features/session/share/renderCard.ts`** — **importante.** É o único
  lugar onde a paleta está duplicada fora do CSS (canvas não lê CSS variables).
  Atualizar o objeto `C` com os hexes novos e as constantes de fonte
  (`TITLE`/`NAME`/`META`/`CAT`/`BADGE`/`UNIT`/`MARK`) para Poppins.

### Fase 5 — chrome do PWA
- `index.html`: `theme-color` `#0b0b0e` → `#0F1115`.
- `vite.config.ts`: `theme_color` e `background_color` idem.
- **Ícone do PWA:** hoje é `public/icon.svg`. Para PNG, exportar do
  `logo-mark.png` sobre fundo `#1C1F26`: `icon-192.png`, `icon-512.png` e uma
  versão *maskable* (símbolo a ~70% do quadro, para o recorte circular do
  Android não cortar os halteres). Atualizar `manifest.icons` e `includeAssets`.
  As quatro variantes de fundo estão em `brand.html`.

### Fase 6 — verificar
```bash
npm run typecheck && npm test && npm run build
```

---

## O que pode quebrar

Pouco, e é sabido:

- A suíte de integração testa **texto e papel acessível**, não classe CSS. A
  única exceção é `src/features/exercise/detail-header.integration.test.tsx:102`,
  que consulta `.ex-chips .chip.accent` — esse nome de classe **não muda**,
  então o teste passa.
- `src/features/session/share/shareCard.test.ts` testa o **modelo** do card, não
  as cores desenhadas; a Fase 4 não deve afetá-lo.
- `mask-image` precisa do prefixo `-webkit-` no Safari/iOS — já está no
  `icons.css`. Vale um olhar no iPhone antes de publicar.
- Ficam **três dependências de fonte a menos**; confirme que nada mais importa
  `@fontsource/sora|manrope|jetbrains-mono` antes de removê-las.
