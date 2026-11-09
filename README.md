# Amazon – Desafio de Automação de Testes com Cypress


Testes automatizados para o [Amazon.com](https://www.amazon.com/) desenvolvidos com [Cypress](https://www.cypress.io/), utilizando o padrão **Page Object Model (POM)**.

---

## Índice

- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Execução dos testes](#execução-dos-testes)
- [Task 1 – Planejamento dos testes](#task-1--planejamento-e-documentação-dos-casos-de-teste)
- [Dados de teste](#dados-de-teste)
- [Decisões de design](#decisões-de-design)
- [Desvios em relação ao enunciado](#desvios-em-relação-ao-enunciado-e-por-quê)
- [Limitações conhecidas](#limitações-conhecidas)

---

## Estrutura do projeto

```text
.
├── cypress.config.js
├── package.json
├── docs/
│   ├── task1-test-cases.pdf
│   ├── task1-test-cases.md
│   └── task1-test-cases.pt-BR.md
└── cypress/
    ├── e2e/
    │   ├── task2-customer-service.cy.js
    │   └── task3-cart.cy.js
    ├── fixtures/
    │   └── testData.json
    └── support/
        ├── commands.js
        ├── e2e.js
        └── pages/
```

| Arquivo / diretório | Descrição |
|---|---|
| `cypress.config.js` | Configurações do Cypress, como `baseUrl`, timeouts e retries. |
| `docs/` | Documentação da Task 1 em PDF, inglês e português. |
| `cypress/e2e/` | Testes automatizados das Tasks 2 e 3. |
| `cypress/fixtures/testData.json` | Dados utilizados pelos testes, como produtos, país e itens do menu. |
| `cypress/support/commands.js` | Comandos customizados para navegação e tratamento de intersticiais e bloqueios. |
| `cypress/support/pages/` | Page Objects utilizados para encapsular os elementos e as ações das páginas. |

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior;
- npm (incluído na instalação do Node.js);
- Google Chrome (recomendado). O Electron também pode ser utilizado.

## Instalação

Clone o repositório e instale as dependências:

```bash
git clone <url-do-repositorio>
cd amazon-cypress-challenge
npm install
```

## Execução dos testes

### Abrir o Cypress em modo interativo

```bash
npm run cy:open
```

### Executar todos os testes em modo headless

```bash
npm run cy:run
```

### Executar uma task específica

```bash
npm run test:task2
npm run test:task3
```

### Executar utilizando o Google Chrome

```bash
npx cypress run --browser chrome
```

---

## Task 1 – Planejamento e documentação dos casos de teste

A primeira etapa do desafio consistiu na análise dos principais fluxos funcionais da Amazon e na definição de **cinco cenários de teste prioritários**.

A documentação completa está disponível em:

- [`docs/task1-test-cases.pdf`](docs/task1-test-cases.pdf) – versão bilíngue;
- [`docs/task1-test-cases.md`](docs/task1-test-cases.md) – versão em inglês;
- [`docs/task1-test-cases.pt-BR.md`](docs/task1-test-cases.pt-BR.md) – versão em português.

### Cenários de teste definidos

| # | Cenário | Objetivo |
|---:|---|---|
| 1 | Pesquisa de produtos | Verificar a relevância dos resultados apresentados. |
| 2 | Adição ao carrinho | Validar a inclusão de produtos e suas respectivas informações. |
| 3 | Gerenciamento do carrinho | Verificar alteração de quantidades, remoção de produtos e atualização do subtotal. |
| 4 | Frete grátis | Validar a aplicação da regra de frete conforme o subtotal e o país de entrega. |
| 5 | Checkout | Verificar o redirecionamento para autenticação, preservando os itens adicionados ao carrinho. |

### Caso de teste detalhado

Além dos cinco cenários, foi elaborado um caso de teste completo:

| Campo | Descrição |
|---|---|
| **Identificação** | `TC-CART-002` |
| **Objetivo** | Validar a adição de um produto ao carrinho. |
| **Prioridade** | P1 |
| **Documentação** | `docs/task1-test-cases.md` |

O caso de teste apresenta:

- Pré-condições e dados necessários para execução;
- Passos detalhados de execução;
- Resultados esperados para cada etapa;
- Pós-condições e procedimentos de limpeza;
- Observações sobre possíveis riscos e particularidades do ambiente.

**Objetivo da etapa:** demonstrar a capacidade de analisar os requisitos, identificar fluxos críticos e planejar a cobertura funcional antes da implementação da automação, reduzindo ambiguidades e prevenindo falsos positivos nos testes.

---

## Dados de teste

Todos os dados utilizados pelos testes estão centralizados em `cypress/fixtures/testData.json`.

O arquivo contém, entre outras informações:

- País de entrega (Hong Kong);
- Itens esperados do menu principal;
- Termos e textos de busca;
- Palavras-chave e URL do produto;
- Opções de cor;
- Quantidade de apontadores adicionais.

## Decisões de design

- **Testes independentes:** a Task 3 utiliza `beforeEach` para adicionar os dois produtos e `afterEach` para esvaziar o carrinho. O Cypress limpa os cookies entre os testes (`testIsolation`), permitindo que cada teste comece com um carrinho de visitante vazio e que a suíte seja executada de forma independente.
- **Asserções para evitar falsos positivos:** as verificações utilizam textos e elementos reais, como linhas do carrinho identificadas por título e cor, mensagem de frete grátis comparada com subtotal e limite, rótulo da cor selecionada e variante. Nenhum preço é fixado no código.
- **Limpeza estrita:** o `afterEach` falha se houver qualquer linha ativa no carrinho. A mensagem de carrinho vazio não substitui a verificação das linhas. Se uma linha ativa não possuir o botão `Delete`, a limpeza falha com uma mensagem de diagnóstico.
- **Verificação do painel lateral:** após cada ação `Add to Cart`, o teste verifica o painel de confirmação (`Cart Subtotal` e `Proceed to checkout (N items)`): um item após adicionar o apontador; dois itens e subtotal maior após adicionar a tesoura.
- **Proteção contra bots:** a Amazon pode exibir a tela `Click the button below to continue shopping`. O comando `cy.continueIfInterstitial()` clica em `Continue shopping`, simulando a ação de um usuário. Se um CAPTCHA real for exibido, `cy.failOnBotCheck()` interrompe o teste com uma mensagem clara, incluindo o que foi detectado e a URL.
- **Retries:** no modo `run`, testes com falha podem ser repetidos até duas vezes para absorver instabilidades de rede.

## Desvios em relação ao enunciado (e por quê)

A Amazon é um site em produção: layout, catálogo, preços e regras de frete podem mudar conforme o país e o período. As telas do enunciado foram capturadas com outro país de entrega (Israel) e um layout anterior. Por isso, alguns passos não podem ser reproduzidos literalmente.

Os ajustes descritos abaixo preservam a intenção dos cenários e mantêm as verificações capazes de identificar comportamentos incorretos.

### Task 3 – Passo 10: mensagem de frete grátis

- **Enunciado:** com os dois produtos iniciais, o carrinho mostra *“Add $26.50 of eligible items to your order for FREE Shipping”* (limite de **US$ 49**, para Israel). O passo 12 espera que o pedido passe a ser elegível após adicionar mais três apontadores.
- **Comportamento observado:** com entrega em Hong Kong, o limite exibido é **US$ 35** (*“FREE Shipping to Hong Kong when you spend over $35”*). Dependendo dos preços das variantes, o carrinho com os dois produtos iniciais já pode apresentar *“Your order qualifies for FREE Shipping”*. Fixar a expectativa de que o pedido não é elegível poderia gerar uma falha que não representa um defeito.
- **Abordagem implementada:** `CartPage.assertFreeShippingMatchesSubtotal` lê o subtotal e o limite exibidos na página e valida os dois estados da regra:
  - Quando `subtotal >= limite`, a mensagem de elegibilidade deve aparecer e a mensagem `add $X` deve ficar oculta.
  - Quando `subtotal < limite`, a mensagem `add $X` deve aparecer e a mensagem de elegibilidade deve ficar oculta.
  - Se nenhuma das mensagens aparecer, o teste falha.
- **Passo 12:** `assertQualifiedForFreeShipping` mantém uma validação estrita. Após aumentar a quantidade do apontador para quatro, o subtotal deve ser maior que o subtotal inicial, atingir o limite e apresentar a mensagem de elegibilidade.
- **Contrapartida:** o passo 10 não força mais um estado inicial de “não elegível”. Caso essa condição seja obrigatória, a execução deve utilizar um país cujo limite de frete seja superior ao subtotal inicial, como no cenário de Israel (US$ 49), e a expectativa do passo 10 deve ser ajustada para a mensagem `add $X`.

### Task 2 – Menu principal e Customer Service

- A barra superior varia conforme o país e o período. Em um layout observado (EUA, fim de ano), aparecem opções como *Holiday Gifts, Prime, Today's Deals, Registry* e *Gift Cards*, enquanto `Sell` e `Customer Service` não aparecem na barra nem no menu `All`. Em outro layout (entrega em Hong Kong), essas opções aparecem.
- Por esse motivo, `Sell` não é validado. O teste acessa `Customer Service` pela barra quando disponível; caso contrário, utiliza o link equivalente `Help`, no rodapé, que direciona para `/gp/help/customer/display.html`.
- O idioma da página é definido como inglês (`?language=en_US` e o header `Accept-Language`) para evitar que as asserções de texto dependam do idioma configurado pelo usuário.

### Task 3 – Produtos

- O título do apontador pode mudar com frequência. Por isso, os resultados de busca e a página do produto são identificados por palavras-chave mais estáveis (`bostitch`, `electric pencil sharpener`, `stall-free motor` e modelo `EPS4-KTGRAY`). A opção **Gray** é selecionada explicitamente, conforme o enunciado.
- A Amazon renderiza o elemento `<input>` real de `Add to Cart` com `opacity: 0.01`, sobre um botão estilizado. O teste verifica se o elemento existe e está habilitado, realiza o clique e, em seguida, valida a mensagem `Added to cart`.
- O carrinho mantém um modelo oculto de “removido do carrinho” dentro de cada linha e pode manter a linha no DOM após a ação `Delete`. Por isso, os helpers do carrinho contam apenas as linhas **sem mensagem de remoção visível**.

## Limitações conhecidas

- A Amazon altera frequentemente sua marcação HTML, variantes de testes A/B e preços, além de poder exibir CAPTCHA para tráfego automatizado. Se um seletor deixar de funcionar, ele deve ser atualizado no Page Object correspondente, em `cypress/support/pages/`.
- Os seletores de localização de entrega em `HomePage.setDeliveryCountry` contemplam as duas variantes conhecidas do popover `Deliver to`.
