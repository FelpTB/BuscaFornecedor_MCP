const express = require("express");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

app.disable("x-powered-by");

app.use(
  express.static(ROOT, {
    extensions: ["html"],
    index: ["index.html"],
    setHeaders(res, filePath) {
      if (filePath.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
      }
    },
  })
);

app.get("/comercial", (_req, res) => {
  res.sendFile(path.join(ROOT, "apresentacao-comercial.html"));
});

app.get("/portfolio", (_req, res) => {
  res.sendFile(path.join(ROOT, "portfolio_apresentacao", "index.html"));
});

app.get("/saude", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

app.use((_req, res) => {
  res.status(404).type("text/plain").send("Página não encontrada");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Apresentação disponível em http://0.0.0.0:${PORT}`);
});
