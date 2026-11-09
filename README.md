# Amazon – Desafio de Automação de Testes com Cypress

[English](README.md) | **Português (BR)**

Testes automatizados para amazon.com feitos com [Cypress](https://www.cypress.io/) usando o padrão Page Object.

## Estrutura do projeto

```
.
├── cypress.config.js              # baseUrl, timeouts, retries
├── package.json
├── docs/
│   ├── task1-test-cases.pdf       # Task 1 (inglês + português): 5 títulos de teste + 1 caso de teste completo
│   ├── task1-test-cases.md        # mesmo conteúdo, inglês
│   └── task1-test-cases.pt-BR.md  # mesmo conteúdo, português
└── cypress/
    ├── e2e/
    │   ├── task2-customer-service.cy.js   # Task 2
    │   └── task3-cart.cy.js               # Task 3 (beforeEach / afterEach)
    ├── fixtures/
    │   └── testData.json                  # dados de teste (produtos, país, itens do menu)
    └── support/
        ├── commands.js                    # visitAmazon, continueIfInterstitial, failOnBotCheck
        ├── e2e.js
        └── pages/                         # Page objects
```

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- npm (já vem com o Node.js)
- Google Chrome (recomendado) – o Electron também funciona

## Instalação

```bash
git clone <url-do-repositorio>
cd amazon-cypress-challenge
npm install
```

## Executando os testes

```bash
# Modo interativo (Cypress Test Runner)
npm run cy:open

# Headless – todos os specs
npm run cy:run

# Headless – uma task específica
npm run test:task2
npm run test:task3

# Usando o Chrome
npx cypress run --browser chrome

```

Task 1 – Planejamento e documentação dos casos de teste

A primeira etapa do desafio consistiu na análise dos principais fluxos funcionais da Amazon e na definição de cinco cenários de teste prioritários, documentados em docs/task1-test-cases.md.

Cenários de teste definidos

Foram considerados os seguintes fluxos:

Pesquisa de produtos: verificar a relevância dos resultados apresentados.

Adição ao carrinho: validar a inclusão de produtos e suas respectivas informações.

Gerenciamento do carrinho: verificar alteração de quantidades, remoção de produtos e atualização do subtotal.

Frete grátis: validar a aplicação da regra de frete conforme o subtotal e o país de entrega.

Checkout: verificar o redirecionamento para autenticação, preservando os itens adicionados ao carrinho.

Caso de teste detalhado

Além dos cinco cenários, foi elaborado um caso de teste completo:

Campo

Descrição

Identificação

TC-CART-002

Objetivo

Validar a adição de um produto ao carrinho

Prioridade

P1

Documentação

docs/task1-test-cases.md

O caso de teste apresenta:

Pré-condições e dados necessários para execução;

Passos detalhados de execução;

Resultados esperados para cada etapa;

Pós-condições e procedimentos de limpeza;

Observações sobre possíveis riscos e particularidades do ambiente.

Objetivo da etapa

Demonstrar a capacidade de analisar os requisitos, identificar fluxos críticos e planejar a cobertura funcional antes da implementação da automação, reduzindo ambiguidades e prevenindo falsos positivos nos testes.
## Dados de teste

Todos os dados ficam em `cypress/fixtures/testData.json`: país de entrega (Hong Kong), itens esperados do menu principal, termos de busca, texto de busca e palavras-chave do produto, URL do produto, opções de cor e quantidade de apontadores extras.

## Decisões de design

- **Testes independentes:** a Task 3 usa `beforeEach` para adicionar os dois produtos e `afterEach` para esvaziar o carrinho. O Cypress limpa os cookies entre os testes (`testIsolation`), então cada teste começa com um carrinho de visitante vazio e a suíte pode rodar em paralelo.
- **Sem falsos positivos:** as asserções verificam texto e elementos reais (linhas do carrinho identificadas por título e cor, mensagem de frete grátis comparada com subtotal e limite, rótulo da cor selecionada e variante). Nenhum preço fixo no código.
- **Limpeza estrita:** o `afterEach` falha se sobrar qualquer linha ativa no carrinho; a mensagem de carrinho vazio não substitui a checagem das linhas. Se uma linha ativa não tiver o botão Delete, a limpeza falha com uma mensagem de diagnóstico.
- **Verificação do painel lateral:** depois de cada "Add to Cart", o teste confere o painel de confirmação ("Cart Subtotal" e "Proceed to checkout (N items)"): 1 item após o apontador, 2 itens e subtotal maior após a tesoura.
- **Proteção contra bots:** a Amazon às vezes mostra a tela "Click the button below to continue shopping"; `cy.continueIfInterstitial()` clica em "Continue shopping" como um usuário faria. `cy.failOnBotCheck()` continua falhando com uma mensagem clara (o que foi detectado + URL) se um CAPTCHA real for exibido, de modo que uma página bloqueada nunca é reportada como defeito do produto.
- **Retries:** testes que falham são repetidos até duas vezes no modo `run`, para absorver instabilidade de rede.

## Desvios em relação ao enunciado (e por quê)

A amazon.com é um site ao vivo: layout, catálogo, preços e regras de frete mudam por país e ao longo do tempo. As telas do enunciado foram capturadas com outro país de entrega (Israel) e um layout mais antigo, então alguns passos não podem ser reproduzidos literalmente. Cada desvio abaixo mantém a intenção do passo e continua falhando quando o comportamento está errado.

### Task 3, passo 10 – "you do not qualify for free shipping"

- **Enunciado:** com os dois produtos iniciais, o carrinho mostra *"Add $26.50 of eligible items to your order for FREE Shipping"* (limite de **$49**, Israel). O passo 12 espera então que o pedido qualifique depois de mais 3 apontadores.
- **O que observamos (entrega em Hong Kong, permitida pelo enunciado):** o limite de frete grátis é **$35**, exibido na página como *"FREE Shipping to Hong Kong when you spend over $35"*, e o carrinho com os dois produtos iniciais pode já mostrar *"Your order qualifies for FREE Shipping"*, dependendo dos preços das variantes. Um teste que fixa "não qualifica" falharia por um motivo que não é defeito, ou seja, um falso negativo.
- **O que o teste faz no lugar** (`CartPage.assertFreeShippingMatchesSubtotal`): lê o **subtotal** e o **limite** da página e verifica os dois lados da regra – quando `subtotal >= limite`, a mensagem "qualifies" deve aparecer e a mensagem "add $X" deve estar oculta; quando está abaixo, a mensagem "add $X" deve aparecer e "qualifies" deve estar oculta. Se nenhuma mensagem aparecer, o teste falha. Nada é fixo no código, então o mesmo teste vale para qualquer país, preço ou limite.
- **Passo 12** (`assertQualifiedForFreeShipping`) continua estrito: depois de aumentar a quantidade do apontador para 4, o subtotal deve ser **maior que o subtotal inicial** (uma página desatualizada não passa), atingir o limite e mostrar a mensagem "qualifies".
- **Contrapartida:** o passo 10 não *força* mais um estado inicial "não elegível". Se for exigida essa checagem estrita, execute com um país cujo limite seja maior que o subtotal dos dois produtos (o cenário Israel/$49 do enunciado) e ajuste o passo 10 para esperar a mensagem "add $X".

### Task 2 – menu principal e "Customer Service"

- A barra superior depende do país e da época do ano. Em um layout observado (EUA, fim de ano) ela mostra *Holiday Gifts, Prime, Today's Deals, Registry, Gift Cards…* e **"Sell" / "Customer Service" não aparecem na barra nem no menu "All"**; em outro (entrega em Hong Kong) os dois aparecem. Por isso "Sell" não é validado, e "Customer Service" é clicado na barra quando existe e, caso contrário, pelo link equivalente **"Help"** no rodapé, que abre a mesma página `/gp/help/customer/display.html` (hoje com o título *"Welcome to Amazon Customer Service"*).
- O idioma da página é forçado para inglês (`?language=en_US` e o header `Accept-Language`) para que as asserções de texto não dependam do idioma de quem executa.

### Task 3 – produtos

- O título do apontador muda com frequência, então os resultados de busca e a página do produto são identificados por palavras-chave estáveis (`bostitch`, `electric pencil sharpener`, `stall-free motor`, modelo `EPS4-KTGRAY`) e a opção **Gray** é selecionada explicitamente, como no enunciado.
- A Amazon renderiza o `<input>` real de "Add to Cart" com `opacity: 0.01` sobre um botão estilizado; o teste verifica que ele existe e está habilitado e clica diretamente nele. Depois, "Added to cart" é verificado, então uma falha ao adicionar ainda reprova o teste.
- O carrinho mantém um modelo oculto de "removido do carrinho" dentro de cada linha, e mantém a linha (com essa mensagem visível) depois do "Delete". Por isso os helpers do carrinho contam apenas linhas **sem mensagem de remoção visível**.

## Limitações conhecidas

- A Amazon muda com frequência a marcação, as variantes de A/B test e os preços, e pode exibir CAPTCHA para tráfego automatizado. Se um seletor quebrar, atualize-o no page object correspondente em `cypress/support/pages/`.
- Os seletores de localização de entrega em `HomePage.setDeliveryCountry` cobrem as duas variantes conhecidas do popover "Deliver to".
