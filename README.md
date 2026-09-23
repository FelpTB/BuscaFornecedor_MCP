# BuscaFornecedor — Apresentações MCP

App Node (Express) que serve as apresentações estáticas no Railway.

## Local

```bash
npm install
npm start
```

- `/` — índice
- `/pipefy` — deck Pipefy (`apresentacao-pipefy.html`)
- `/comercial` — deck comercial
- `/portfolio` — portfólio
- `/saude` — healthcheck

## Railway

1. Conecte o repositório `FelpTB/BuscaFornecedor_MCP`.
2. Build Nixpacks + `npm start` (`railway.toml`).
3. Healthcheck: `GET /saude`.
4. Porta: variável `PORT` injetada pelo Railway.

Deck Pipefy: `apresentacao-pipefy.html` + `theme-pipefy.css` + `Logos/` + `assets/`.
