# Dashboard Integrado

Aplicação web para acompanhamento das notas de manutenção de embalagem, reunindo em um único ambiente a situação atual das linhas, análise histórica, gráfico de tendências e plano de ação.

O projeto foi desenvolvido com **HTML, CSS, JavaScript, Chart.js e Supabase**.

## Funcionalidades

- Visão geral das notas por categoria:
  - Amarelas
  - Vermelhas
  - ND
  - Total geral
- Distribuição das notas por linha.
- Situação individual de cada linha.
- Indicadores e informações adicionais.
- Detalhamento dos dados.
- Gráfico de Tendências integrado.
- Acompanhamento da evolução das notas ao longo do tempo.
- Indicadores de redução por categoria.
- Acompanhamento de meta.
- Plano de Ação com publicação de imagem.
- Títulos e descrições personalizáveis.
- Área administrativa protegida por autenticação.
- Interface pública para consulta dos dados.

## Gráfico de Tendências

O dashboard possui uma área integrada para acompanhamento histórico das notas.

O gráfico permite visualizar as medições registradas ao longo do tempo e acompanhar a evolução das categorias:

- Amarelas
- Vermelhas
- ND

Os indicadores consideram as movimentações ocorridas durante todo o período analisado, permitindo uma visão mais completa da evolução das notas.

## Plano de Ação

A seção de Plano de Ação permite disponibilizar uma imagem em destaque para consulta na página pública.

Na área administrativa é possível selecionar, pré-visualizar, publicar, substituir ou remover a imagem exibida.

## Estrutura do projeto

```text
dashboard-manutencao/
├── css/
├── img/
├── js/
├── supabase/
├── admin.html
├── index.html
├── login.html
├── LICENSE
└── README.md
```

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Chart.js
- Supabase
- Git
- GitHub
- GitHub Pages

## Área administrativa

A aplicação possui uma área administrativa utilizada para atualização e gerenciamento das informações exibidas no dashboard.

Entre as funcionalidades disponíveis estão:

- atualização dos dados;
- edição de indicadores;
- gerenciamento das informações das linhas;
- cadastro de medições;
- edição do gráfico de tendências;
- gerenciamento do plano de ação;
- personalização de títulos e descrições.

## Página pública

A página pública permite consultar as informações do dashboard sem necessidade de autenticação.

Ela apresenta os dados cadastrados através da área administrativa de forma organizada e visual.

## Deploy

O projeto pode ser publicado como aplicação estática através do **GitHub Pages**.

## Objetivo do projeto

Centralizar o acompanhamento das notas de manutenção de embalagem em uma única aplicação, facilitando a visualização da situação atual, da evolução histórica e das ações relacionadas ao processo.

A integração entre os indicadores atuais, o Gráfico de Tendências e o Plano de Ação permite uma visão mais completa e organizada das informações.
