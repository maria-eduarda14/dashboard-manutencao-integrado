# Notas de Manutenção de Embalagem

Dashboard web para acompanhamento das notas de manutenção de embalagem, com visualização gráfica, análise por linha e área administrativa integrada ao Supabase.

## Interface

A interface utiliza um menu lateral retrátil para separar as informações do painel em áreas independentes:

- **Visão geral** — totais de notas Amarelas, Vermelhas, ND e Total Geral;
- **Distribuição** — gráfico de distribuição das notas por linha;
- **Situação por linha** — indicadores e informações adicionais da linha selecionada;
- **Detalhamento** — tabela completa dos valores de cada linha.

No desktop, o menu se expande ao passar o mouse e também pode ser fixado aberto pelo botão de menu. Em telas menores, ele funciona como uma navegação lateral expansível.

Na área administrativa, o menu também apresenta o usuário autenticado e a opção de logout.

## Estrutura

```text
manutencao/
├── css/
│   ├── style.css
│   └── admin.css
├── img/
│   ├── logo.png
│   └── README.md
├── js/
│   ├── index.js
│   ├── admin.js
│   └── navigation.js
├── supabase/
│   └── config.js
├── admin.html
├── index.html
├── login.html
├── original.html
├── LICENSE
└── README.md
```

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Chart.js
- Supabase
- Git / GitHub
- GitHub Pages

## Banco de dados

A alteração de interface não modifica o schema ou os registros do Supabase. A aplicação continua usando a mesma configuração, tabelas, autenticação e políticas RLS já existentes.

## Logo

Adicione a logo em:

```text
img/logo.png
```

Enquanto o arquivo não existir, a aplicação oculta automaticamente o espaço da imagem para evitar o ícone de imagem quebrada.


## Centralização do gráfico de tendências e plano de ação

O menu lateral agora inclui:

- **Gráfico de tendências**: histórico de medições, cards de evolução e gerenciamento pelo admin.
- **Plano de ação**: publicação de uma imagem pelo admin e visualização pública em destaque.

Antes de usar essas duas seções, execute `supabase/migracao_centralizacao_dashboard.sql` no SQL Editor do Supabase principal.

Depois, no admin, acesse **Gráfico de tendências** e clique em **Importar dados do gráfico antigo**. A operação copia os registros do Supabase antigo para o Supabase do dashboard sem apagar o projeto de origem.
