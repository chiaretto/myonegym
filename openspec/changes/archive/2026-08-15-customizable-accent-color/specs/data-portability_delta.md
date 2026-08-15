# Delta: data-portability

**Change ID:** `customizable-accent-color`
**Affects:** `src/data/portability.ts` (nenhuma mudança de código esperada —
apenas o texto do requisito, que enumera as preferências locais)

---

## MODIFIED

### Requirement: Export Full Backup JSON

*(única mudança: a lista de preferências locais que ficam **fora** do backup
passa a incluir a cor de destaque; todo o resto do requisito permanece)*

O export MUST continuar carregando **todo o banco** num único JSON versionado —
academias, categorias, exercícios (com categorias e alternativas), dias de
treino, o peso global de cada exercício e as exceções por academia com o
histórico de cada escopo, as notas por academia, as sessões e suas entradas, e
as fotos com os bytes em base64 — autocontido e restaurável sem ferramenta
especial.

Preferências de UI **locais do dispositivo** — o tamanho da fonte, a **cor de
destaque** e a marca de "já perguntei" da primeira abertura — NÃO são dados do
usuário e MUST permanecer **fora** do backup. Elas
descrevem como este aparelho mostra o app, não o que o usuário registrou nele; carregá-las no arquivo faria
uma restauração repintar um aparelho que já estava do jeito que o dono queria.

#### Scenario: The accent colour is not exported
- GIVEN o usuário escolheu uma cor de destaque diferente do padrão
- WHEN exporta o backup completo
- THEN o documento não contém a cor escolhida

#### Scenario: Restoring does not repaint the device
- GIVEN o dispositivo A está em "Verde" e o dispositivo B em "Roxo"
- WHEN um backup de A é restaurado em B
- THEN B continua em "Roxo"
- AND todos os dados do usuário foram substituídos normalmente

---

## ADDED

(Nenhum.)

## REMOVED

(Nenhum.)
