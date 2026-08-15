# Delta: app-foundation

**Change ID:** `customizable-accent-color`
**Affects:** `src/styles/tokens.css`, `src/state/settings.ts`,
`src/state/accents.ts` (novo), `src/main.tsx`,
`src/features/settings/AppearancePage.tsx`,
`src/features/settings/appearance.css`,
`src/features/consistency/consistency.css`,
`src/features/session/share/renderCard.ts`

---

## ADDED

### Requirement: User-Selectable Accent Colour

As Configurações MUST oferecer, em **Aparência**, a escolha da **cor de
destaque** do app dentro de uma **lista curada** de pelo menos 15 opções, tendo
o vermelho de marca como **padrão**. A escolha MUST valer **imediatamente e em
todo o app**, MUST **persistir localmente** entre sessões e reinícios
(local do dispositivo; **não** faz parte do backup) e MUST ser aplicada
**antes da primeira pintura**, para o app não piscar a cor anterior.

O controle MUST identificar a opção vigente e MUST oferecer o **retorno ao
padrão**. Um valor persistido que não corresponda a nenhuma opção da lista MUST
ser tratado como o padrão.

O app MUST ter **uma única** cor de destaque: o degradê dos elementos de
destaque MUST continuar derivando dessa cor pelo fator histórico da marca, e não
de uma segunda cor escolhida à parte.

Toda cor da lista MUST satisfazer, por construção:

- a **mesma luminância relativa** da cor padrão, dentro de uma tolerância
  estreita — de onde decorrem o mesmo contraste como texto sobre o fundo do app
  (≥ 4,5:1) e a mesma relação do branco sobre o preenchimento sólido;
- **croma não maior** que a da cor padrão, para nenhuma opção ficar mais vívida
  que a identidade;
- distância de **matiz** até a cor de perigo **não menor** que a da cor padrão,
  para que "excluir" nunca se aproxime de uma ação de marca;
- **separação perceptual mínima** em relação a todas as outras da lista — com a
  luminância fixa, matiz e croma carregam toda a diferença, e uma lista densa
  demais ofereceria amostras que o usuário não distingue.

Essas quatro propriedades MUST ser verificadas **por cálculo sobre a lista**,
não por inspeção visual: acrescentar uma cor que viole qualquer uma delas MUST
reprovar a verificação do projeto.

A lista MUST NOT oferecer uma cor arbitrária escolhida pelo usuário. Normalizar
uma matiz quente para essa luminância produz um oliva que não se parece com a
cor pedida, e a lista curada é o que torna as garantias acima possíveis.

#### Scenario: Choose an accent colour
- GIVEN o usuário abre Configurações → Aparência
- WHEN toca a amostra "Azul"
- THEN o app inteiro passa a usar azul no destaque, imediatamente
- AND a amostra "Azul" fica marcada como a escolhida

#### Scenario: The gradient follows the chosen colour
- GIVEN o usuário escolheu "Azul"
- WHEN um elemento de destaque com degradê é pintado
- THEN o degradê vai do azul ao mesmo azul escurecido pelo fator da marca
- AND nenhuma segunda cor participa dele

#### Scenario: The choice survives a restart without a flash
- GIVEN o usuário escolheu "Roxo"
- WHEN fecha e reabre o app
- THEN a primeira pintura já sai em roxo
- AND o vermelho padrão não aparece em momento algum

#### Scenario: Reset returns to the brand red
- GIVEN o usuário escolheu uma cor diferente do padrão
- WHEN toca "Restaurar padrão"
- THEN o destaque volta ao vermelho de marca

#### Scenario: Every offered colour keeps the current contrast
- GIVEN a lista de cores oferecida
- WHEN cada uma é medida contra o fundo do app e contra o branco do
  preenchimento
- THEN todas apresentam o mesmo contraste da cor padrão, dentro da tolerância
- AND nenhuma é mais vívida que ela

#### Scenario: A colour too close to the danger colour is rejected
- GIVEN alguém acrescenta à lista uma cor na faixa do âmbar de perigo
- WHEN a verificação do projeto roda
- THEN ela reprova, apontando a distância de matiz insuficiente

#### Scenario: A colour too close to another is rejected
- GIVEN alguém acrescenta à lista uma cor quase igual a uma existente
- WHEN a verificação do projeto roda
- THEN ela reprova, apontando a separação perceptual insuficiente

#### Scenario: An unknown stored value falls back to the default
- GIVEN o armazenamento local guarda uma cor que não existe mais na lista
- WHEN o app inicia
- THEN ele aplica o vermelho padrão
- AND a tela de Aparência mostra o padrão como escolhido

#### Scenario: The choice is not part of the backup
- GIVEN o usuário escolheu uma cor diferente do padrão
- WHEN exporta o backup completo
- THEN o documento não carrega a cor escolhida
- AND restaurá-lo em outro dispositivo não altera a cor de lá

---

## MODIFIED

### Requirement: Dark Premium Visual Identity

The application MUST present a single **dark** visual identity based on the
**"OneGym Red"** design direction: a near-black background (`#050607`) with
layered dark surfaces (`#0c0f14` for cards), an **accent** colour — brand red
`#ec2c2e` by default, com um parceiro mais escuro como parada de baixo de um
gradiente **vertical** de 180°, e **escolhido pelo usuário dentro da lista
curada** descrita em *User-Selectable Accent Colour* — e muted/dim greys for
secondary and tertiary text. All colours MUST derive from shared **design
tokens** (CSS custom properties) rather than hardcoded values, so the palette is
governed from one place. The app is **dark-only**: it MUST NOT ship a separate
light theme, and MUST NOT switch palette based on `prefers-color-scheme`.

O destaque MUST ser trocável **em tempo de execução** escrevendo um número
pequeno de propriedades na raiz do documento: tinta, borda, texto,
preenchimento e gradiente MUST **derivar** desses valores, e não ser escritos um
a um. Nenhuma cor de destaque MUST aparecer literal fora da lista curada e do
arquivo de tokens.

Buttons and chips MUST be **fully rounded** (pill radius); cards use a 20px
radius. Numeric inputs and steppers MUST stay rectangular-rounded so a field
still reads as a field.

Accent-coloured **text** MUST meet WCAG AA against the app background, and white
on the solid accent MUST meet AA for normal text — **em qualquer** cor da lista,
que é o que a igualdade de luminância garante.

The colour used for **destructive and error** states MUST be distinguishable from
the brand accent by **both hue and lightness**, so that "delete" never reads as an
ordinary accent action. It MUST NOT be the alert colour applied to a rest day.
Essa distinção MUST valer para **todas** as cores da lista, e é por isso que a
faixa de matiz vizinha ao âmbar não é oferecida.

#### Scenario: Dark palette is the base
- GIVEN the app is opened on any device
- WHEN the first screen renders
- THEN the background is the near-black app background and cards use the dark surface tokens
- AND the accent colour on primary actions is the chosen accent (brand red by default)

#### Scenario: No light-theme switch
- GIVEN the OS/browser is set to a light colour scheme
- WHEN the app renders
- THEN the app still renders in the dark palette (it does not switch to a light theme)

#### Scenario: Destructive action is not mistaken for a brand action
- GIVEN a screen shows both an accent-coloured highlight and a destructive action
- WHEN the user looks at the screen
- THEN the destructive affordance differs from the accent in hue and in lightness
- AND it does not borrow the accent's tint or border

#### Scenario: Switching the accent repaints every derived value
- GIVEN o usuário troca a cor de destaque
- WHEN percorre Home, uma sessão, o detalhe de um exercício e a consistência
- THEN gradientes, tintas, bordas, textos e preenchimentos de destaque saem
  todos na cor nova
- AND nenhuma superfície continua na cor anterior

---

### Requirement: Brand Colour Has a Single Governed Source

The brand colour MUST be governed from the design tokens, and every place that
cannot read a CSS custom property MUST be documented as a deliberate copy kept in
sync. `src/styles/tokens.css` é a fonte governante dos valores padrão, e a lista
curada de cores de destaque é a fonte de **quais** valores o destaque pode
assumir.

As cópias são:

| Cópia | Por que não lê o token |
|---|---|
| a meta `theme-color` no `index.html` | markup, não CSS |
| o fundo da camada de abertura no `index.html` | precisa pintar antes de qualquer folha de estilo carregar |
| `theme_color`/`background_color` no `vite.config.ts` | o manifesto é JSON de build |
| o fundo do tile na configuração do gerador de ícones | roda em Node, fora do navegador |
| o fundo de guarda no gerador de telas de abertura | idem |
| o bloco de cores neutras em `src/features/session/share/renderCard.ts` | `<canvas>` não lê variáveis CSS |

Nenhuma dessas cópias carrega a cor de **destaque**: as de build usam a
superfície escura, que não muda, e o pintor do card MUST **receber** a cor
escolhida como parâmetro em vez de fixá-la. Um valor de destaque escrito à mão
em qualquer uma delas MUST ser tratado como defeito — ele congelaria o card na
cor de outro usuário.

Cada cópia MUST vir acompanhada de uma referência ao token de origem, para que a
divergência seja verificável por leitura. `renderCard.ts` MUST NOT ler
`--font-scale` — um PNG compartilhado é uma peça de tamanho fixo.

Ícones e imagens de abertura **não** constituem cópias: eles MUST ser
**derivados por geração** das artes-mestre, por comandos versionados no projeto.
Nenhum valor de cor MUST ser digitado à mão em arquivo gerado, e nenhum arquivo
gerado MUST ser editado manualmente — a forma de mantê-los em sincronia é
**reexecutar a geração**. Eles seguem a **marca**, não a escolha do usuário, e a
tela de Aparência MUST dizer isso.

#### Scenario: Palette change reaches every surface
- GIVEN the accent token changes
- WHEN the app, the installed PWA chrome and a shared session card are inspected
- THEN all three show the same accent colour
- AND no surface still shows a previous palette's colour

#### Scenario: Shared card follows the chosen accent
- GIVEN o usuário escolheu "Verde"
- WHEN compartilha uma sessão concluída
- THEN o PNG sai com o destaque verde
- AND nenhum traço do vermelho padrão aparece nele

#### Scenario: Shared card ignores the user's font scale
- GIVEN the user set the font scale to 200%
- WHEN the user shares a session card
- THEN the generated PNG uses its own fixed type sizes, unchanged by the setting

#### Scenario: The brand artwork keeps the brand colour
- GIVEN o usuário escolheu uma cor diferente do padrão
- WHEN olha o logo no topo da Home, o ícone na tela inicial e a tela de abertura
- THEN os três continuam na cor de marca — são artes, não cor de CSS
- AND a tela de Aparência informa isso

#### Scenario: Ícones e splash acompanham a paleta
- GIVEN as artes-mestre são atualizadas para uma nova paleta
- WHEN os comandos de geração de assets são executados e o app é reinstalado
- THEN o ícone na tela inicial e a tela de abertura mostram a nova paleta
- AND nenhum arquivo gerado precisou ser editado à mão

---

### Requirement: User-Adjustable Font Size

*(sem mudança de comportamento — o **reset** de Aparência passa a devolver ao
padrão a fonte **e** a cor de destaque)*

Settings MUST provide a control to choose the app's **font size** (the scale
multiplier) within a supported range of **at least 100%–200%**. The chosen value
MUST **persist locally** across sessions and app restarts (device-local; it is
NOT part of the data backup). Applying a value MUST take effect **immediately and
app-wide** (live). The control MUST offer a **reset to the default** and SHOULD
show the **current value** (e.g., a percentage) and a **live preview**. Values
outside the supported range MUST be **clamped**. The stored value MUST be applied
**before first paint** so the app does not flash a different size on startup.

O **restaurar padrão** de Aparência MUST devolver ao padrão **todas** as
preferências dessa tela — tamanho da fonte e cor de destaque — e o seu rótulo
MUST NOT prometer apenas uma delas.

#### Scenario: Change the font size from Settings
- GIVEN the appearance setting is open
- WHEN the user increases the font size to 180%
- THEN all text across the app immediately grows to the 180% scale

#### Scenario: Preference persists across restarts
- GIVEN the user set the font size to 120%
- WHEN the user closes and reopens the app
- THEN the app renders at 120% (the stored value), without flashing another size first

#### Scenario: Reset to default
- GIVEN o usuário mudou o tamanho da fonte e a cor de destaque
- WHEN toca "Restaurar padrão"
- THEN a fonte volta a 125% e o destaque volta ao vermelho de marca

#### Scenario: Out-of-range values are clamped
- GIVEN a stored or entered value outside 100%–200% (e.g., 400% or 50%)
- WHEN the app applies it
- THEN the value is clamped into the supported range before use

#### Scenario: Applies on every screen
- GIVEN the user set a non-default font size
- WHEN the user navigates to Home, a session, an exercise detail, or Settings
- THEN each screen renders at the chosen size

---

## REMOVED

(Nenhum requisito removido.)
