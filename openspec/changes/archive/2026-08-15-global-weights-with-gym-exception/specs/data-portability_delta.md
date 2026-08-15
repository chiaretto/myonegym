# Delta: data-portability

**Change ID:** `global-weights-with-gym-exception`
**Affects:** `src/data/portability.ts` (`BackupDoc`, `parseBackup`,
`importBackupReplaceAll`, `generateExample`), `src/data/example-data.json`

---

## ADDED

### Requirement: Backups Carry Global Weights

O documento de backup MUST carregar as linhas de peso e de histórico
**globais** junto das linhas por academia, na mesma lista — elas se distinguem
apenas pelo id de academia reservado. A validação de importação MUST aceitar um
peso (ou registro de histórico) cujo id de academia **não corresponde a
nenhuma academia do documento**: essa é exatamente a forma de uma linha global,
e rejeitá-la inutilizaria todo backup gerado a partir desta versão.

#### Scenario: Round-trip preserves scopes
- GIVEN o app tem 10 pesos globais e 3 exceções em duas academias
- WHEN o usuário exporta o backup e o restaura em um dispositivo limpo
- THEN os 10 pesos continuam globais e as 3 exceções continuam ligadas às mesmas academias
- AND os históricos global e de cada exceção são restaurados separados, como estavam

#### Scenario: A global row is not treated as a dangling reference
- GIVEN um backup contendo pesos globais
- WHEN o documento é validado na importação
- THEN nenhuma linha global é rejeitada por não apontar para uma academia existente

---

### Requirement: Restoring a Pre-Global Backup Promotes Weights

Restaurar um backup **anterior** a esta mudança — em que todo peso é de uma
academia e nenhuma linha global existe — MUST aplicar, ao final da restauração,
a mesma promoção da migração do banco: para cada exercício, o peso e o
histórico da academia mais antiga que o tenha viram **globais**, e os demais
permanecem como exceções.

Assim um arquivo antigo não reintroduz o modelo só-por-academia num app já
migrado.

#### Scenario: Old backup restores into the new model
- GIVEN um backup gerado antes desta mudança, com pesos em duas academias
- WHEN o usuário o restaura
- THEN cada exercício fica com um peso global (o da academia mais antiga que o tinha)
- AND os pesos da outra academia permanecem como exceções
- AND nenhum registro é perdido

#### Scenario: A current backup is restored as-is
- GIVEN um backup gerado por esta versão, que já contém linhas globais
- WHEN o usuário o restaura
- THEN nenhuma promoção adicional acontece — os escopos são restaurados exatamente como no arquivo

---

## MODIFIED

### Requirement: Generate Example Data

A rotina de exemplo MUST semear os pesos da amostra como **pesos globais** dos
exercícios, e não como pesos da academia de exemplo. Todo o resto do requisito
permanece: inserção **aditiva e segura**, com ids remapeados, categorias de dia
derivadas dos exercícios, e a **academia** de exemplo criada **apenas quando
nenhuma academia existe** — os pesos globais, por não pertencerem a academia
alguma, são semeados junto dela.

#### Scenario: Generate the sample routine
- GIVEN o app tem pouco ou nenhum dado
- WHEN o usuário toca em "Gerar exemplo"
- THEN as categorias, exercícios (com mídia) e dias de treino da amostra são criados e visíveis

#### Scenario: Fresh app also gets a gym and global weights
- GIVEN nenhuma academia existe ainda
- WHEN o usuário toca em "Gerar exemplo"
- THEN a academia de exemplo é criada
- AND os pesos da amostra são registrados como **globais**, com um registro de histórico cada
- AND eles aparecem na Home, sem rótulo de academia

#### Scenario: Sample weights apply to a second gym too
- GIVEN a amostra foi gerada
- WHEN o usuário cria uma segunda academia e a torna ativa
- THEN os exercícios da amostra mostram os mesmos pesos, sem nenhuma cópia de registros

#### Scenario: Additive and safe with existing data
- GIVEN o usuário já tem algumas categorias e uma academia
- WHEN o usuário toca em "Gerar exemplo"
- THEN o conteúdo da amostra é adicionado sem sobrescrever dados existentes
- AND as referências permanecem válidas (sem colisão de ids)

---

### Requirement: Export Full Backup JSON

O export MUST continuar carregando **todo o banco**, com um ajuste na descrição
do que são os pesos: em vez de "o peso por academia de cada exercício", o
documento carrega **o peso global de cada exercício e as exceções por
academia**, mais o histórico de cada um desses escopos. Nada mais muda —
formato versionado, fotos em base64, arquivo autocontido.

#### Scenario: Export includes both scopes
- GIVEN o app tem pesos globais e exceções
- WHEN o usuário exporta o backup
- THEN o arquivo contém as linhas de peso e de histórico dos dois escopos
- AND a versão do documento indica que ele já usa o modelo global

---

## REMOVED

(Nenhum.)
