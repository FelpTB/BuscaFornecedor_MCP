# Plano de implementação — MCP Search Hub (BuscaFornecedor)

Documento complementar à apresentação comercial (`apresentacao-comercial.html`).  
Público: produto, operação e liderança (com notas técnicas objetivas para o time de entrega).

---

## 1. Objetivo

Disponibilizar as capacidades atuais do BuscaFornecedor como um **hub MCP** orquestrado via **n8n**, para que agentes de IA — principalmente **Microsoft Copilot** e **Claude** — consigam:

1. Entender uma necessidade comercial em linguagem natural  
2. Buscar fornecedores com relevância (intenção + localização)  
3. Consultar/registrar dados no CRM  
4. Preparar e, após aprovação humana, executar comunicações (e-mail/SMS)

Resultado: **uma fonte de verdade**, múltiplas interfaces, barreira de entrada baixa para usuários não técnicos.

---

## 2. Escopo da solução (quando completa)

### 2.1 Ferramentas do hub (arsenal)

| Capacidade (negócio) | Função | Origem típica |
|---|---|---|
| Localização por raio | Cidade BR + raio (km) → cidades válidas | API de cidades |
| Busca inteligente | Ranking híbrido (sentido + termos exatos) + filtros | API Qdrant / busca |
| Contexto LLM | Classifica intenção (produto / serviço / misto) e ajusta pesos | OpenAI / camada de processamento |
| CRM / auditoria | Consulta empresas, usuários, cotas e registra interações | Supabase |
| Mensageria | E-mail corporativo e/ou SMS | API de envio / Resend / Zenvia etc. |

### 2.2 Interfaces-alvo

| Interface | Persona | Comportamento esperado |
|---|---|---|
| **Microsoft Copilot** (Teams / M365) | Diretoria, analistas, sales ops | Conversa em português; o agente chama as ferramentas; pede aprovação antes de envios |
| **Claude / Claude Code** | Engenharia, power users, QA | Mesmas ferramentas com mais controle, automação e validação de fluxos |
| Portal / WhatsApp (já existentes) | Compradores finais | Continuam; o Hub **não substitui**, **reaproveita** a inteligência |

### 2.3 Fora de escopo (nesta wave)

- Reconstruir o motor de scrape / profile builder  
- Substituir o portal web  
- Autonomia total de envio sem aprovação humana  

---

## 3. Princípios de implementação

1. **Reusar antes de refazer** — encapsular APIs e fluxos já existentes.  
2. **Contrato único** — Copilot e Claude consomem o mesmo catálogo MCP.  
3. **Human-in-the-loop** — toda ação externa (e-mail/SMS) exige confirmação.  
4. **Sanitização na borda** — textos vindos de bases passam por limpeza antes do LLM.  
5. **Mensurável** — cada fase fecha com critérios de aceite claros.

---

## 4. Arquitetura lógica (visão de negócio)

```
Usuário (Copilot ou Claude)
        │  intenção em linguagem natural
        ▼
┌───────────────────────────┐
│   MCP Search Hub (n8n)    │  ← maestro: escolhe e encadeia ferramentas
└───────────┬───────────────┘
            │
   ┌────────┼────────┬────────────┬──────────┐
   ▼        ▼        ▼            ▼          ▼
 Local   Busca    Contexto     CRM       Mensageria
 (raio)  (Qdrant) (intenção)  (Supabase) (e-mail/SMS)
```

Fluxo típico de uma query:

1. Recebe intenção  
2. Valida limites/cotas (CRM)  
3. Em paralelo: classifica intenção + resolve geografia  
4. Executa busca híbrida com filtros  
5. Deduplica, normaliza e pontua  
6. Devolve lista ao agente  
7. Se houver envio: solicita aprovação → dispara → registra no CRM  

---

## 5. Roadmap em 4 fases

### Fase 1 — Auditoria e encapsulamento  
**Meta:** cada capacidade vira uma ferramenta estável e documentada.

| Atividade | Entrega | Aceite |
|---|---|---|
| Inventariar APIs/fluxos n8n atuais | Catálogo de endpoints + owners | 100% das funções do hub mapeadas |
| Padronizar entrada/saída | Contratos JSON por ferramenta | Exemplos request/response versionados |
| Wrappers no n8n | Workflows “tool-ready” | Teste unitário/manual por ferramenta |
| Erros e timeouts | Política de retry e mensagens claras | Agente recebe erros acionáveis |

**Ferramentas mínimas nesta fase**

- `buscar_cidades_no_raio`  
- `buscar_fornecedores`  
- `consultar_empresa` / `registrar_interacao`  
- `preparar_mensagem` (ainda sem envio em produção)  

**Duração sugerida:** 1–2 sprints  

---

### Fase 2 — Motor de relevância  
**Meta:** qualidade da lista que o agente devolve.

| Atividade | Entrega | Aceite |
|---|---|---|
| Classificação de intenção | Regras/produto-serviço-misto | Casos golden set ≥ limiar interno |
| Pesos dinâmicos | Política de alocação (soma = 1.0) | Exemplos auditáveis |
| Filtro geográfico antes da busca | Pipe cidade+raio → IDs/cidades | Latência aceitável; correção do mapa |
| Ranking + anti-duplicação | Score final + lista limpa | Stakeholders validam amostra comercial |
| Cotas / limites | Checagem Supabase | Bloqueio correto quando estourar |

**Golden cases sugeridos (negócio)**

- “Instalação de ar-condicionado — Sumaré, 50 km” (misto)  
- “Cartucho HP 662XL — SP” (produto / termo exato)  
- “Consultoria SAP — nacional” (serviço / sem raio)  

**Duração sugerida:** 1–2 sprints  

---

### Fase 3 — Integração MCP (Copilot + Claude)  
**Meta:** o usuário real usa o Hub no ambiente de trabalho.

| Atividade | Entrega | Aceite |
|---|---|---|
| Trigger MCP no n8n | Servidor/hub MCP publicado | Tools visíveis no cliente MCP |
| Conexão Microsoft Copilot | Agente/configuração M365 | Persona piloto completa 3 jornadas |
| Conexão Claude / Claude Code | Configuração do servidor MCP | Time técnico executa mesmos cenários |
| Prompt de sistema / instruções | Playbook do agente | Agente pede aprovação antes de enviar |
| Observabilidade | Logs de tools invocadas | Dá para auditar “quem pediu o quê” |

**Comportamento esperado — Copilot**

- Usuário descreve necessidade em português  
- Agente chama localização + busca (+ CRM se precisar)  
- Responde com lista curada e próximos passos  
- Se envio: pergunta explícita de aprovação  

**Comportamento esperado — Claude**

- Mesmas tools  
- Uso para validação, automação e exploração avançada  
- Sem “lógica paralela” — mesmo ranking e mesmas regras  

**Duração sugerida:** 1–2 sprints  

---

### Fase 4 — Orquestração, segurança e handover  
**Meta:** produção segura e time capacitado.

| Atividade | Entrega | Aceite |
|---|---|---|
| Human-in-the-loop em envios | Gate de aprovação + canais | Zero envio sem confirmação |
| Sanitização de contexto | Nodes de limpeza pré-LLM | Bloqueia payloads suspeitos em testes |
| RBAC / escopo | Quaes só o que a persona pode | Negação correta em testes negativos |
| Treinamento | Roteiro 60–90 min + FAQ | Piloto opera sem suporte constante |
| Go-live controlado | Ambiente prod + rollback | KPIs da onda piloto acompanhados |

**Duração sugerida:** 1 sprint (+ estabilização)  

---

## 6. Plano de ondas de adoção

| Onda | Usuários | Escopo liberado |
|---|---|---|
| Piloto A | 3–5 pessoas internas (ops/comercial) | Busca + localização + consulta CRM |
| Piloto B | Mesmo grupo + liderança | + preparar mensagem + aprovação + envio limitado |
| Rollout interno | Times comerciais | Copilot como canal principal |
| Extensão | Power users / engenharia | Claude em paralelo |
| Clientes finais | Sob estratégia de produto | Pay-as-you-go / empacotamento |

---

## 7. Governança e segurança

### 7.1 Ações com aprovação obrigatória

- Envio de e-mail  
- Envio de SMS  
- Qualquer comunicação massiva a fornecedores  

### 7.2 Ações de leitura (podem ser mais livres, com cota)

- Busca de fornecedores  
- Consulta de cidades no raio  
- Consulta de ficha / status no CRM  

### 7.3 Blindagem da IA

- Remover blocos de código / instruções embutidas vindas de bases externas  
- Limitar escopo corporativo do agente (só tools do Hub)  
- Registrar inputs/outputs relevantes para auditoria  

---

## 8. Métricas de sucesso

| Indicador | Por que importa | Meta inicial (piloto) |
|---|---|---|
| Tempo até lista útil | Eficiência do sourcing | Redução vs fluxo atual (baseline) |
| % listas aprovadas sem retrabalho | Qualidade do ranking | Acordo com comercial |
| Taxa de aprovação de envios | Confiança na sugestão | Monitorar (sem meta cega de volume) |
| Tools falhas / timeouts | Confiabilidade | Tendência de queda semana a semana |
| Adoção semanal no Copilot | Sucesso de produto | Usuários piloto ativos |

---

## 9. Modelo de custo (visão executiva)

- **Uso interno:** priorizar licenças Microsoft 365 Copilot já existentes; custo incremental focado no Hub e nas APIs.  
- **Uso externo / escala:** modelo pay-as-you-go (ex.: Copilot Studio / Azure), com pacotes de volume quando houver previsibilidade.  
- **Princípio:** não criar front-end paralelo só para o agente — a interface é o chat que o usuário já abre.

*(Valores de mercado do PDF comercial devem ser atualizados na proposta financeira oficial.)*

---

## 10. Dependências e riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Contratos de API inconsistentes | Tools instáveis no agente | Fase 1 com contratos versionados |
| Ranking fraco no piloto | Perda de confiança do comercial | Fase 2 com golden set |
| Envio sem trava | Risco reputacional | Aprovação humana obrigatória |
| Prompt injection via dados | Comprometimento do agente | Sanitização + escopo restrito |
| Excesso de jargão no rollout | Baixa adoção | Playbook em linguagem de negócio |

---

## 11. Checklist de kickoff (semana 0)

- [ ] Sponsors de negócio e owner técnico definidos  
- [ ] Lista do piloto A aprovada  
- [ ] Inventário das 5 ferramentas confirmado  
- [ ] Ambientes (sandbox / prod) claros  
- [ ] Golden cases de busca escritos com o comercial  
- [ ] Critério de “pronto para Copilot” acordado  
- [ ] Datas alvo das 4 fases no calendário  

---

## 12. Entregáveis por fase (resumo)

1. **Fase 1:** catálogo MCP + wrappers n8n  
2. **Fase 2:** qualidade de busca validada pelo comercial  
3. **Fase 3:** Copilot + Claude conectados ao mesmo Hub  
4. **Fase 4:** produção com governança, treinamento e métricas  

---

## 13. Materiais relacionados

| Arquivo | Uso |
|---|---|
| `apresentacao-comercial.html` | Pitch para público pouco técnico |
| `MCP_Search_Hub.pdf` | Base conceitual / aprofundamento visual |
| `index.html` | Deck técnico (pipeline de dados) |
| `resumo_mcp.txt` | Intenção original da iniciativa |
| `repositorios.txt` | APIs/repositórios de apoio |

---

*BuscaFornecedor — conectando compradores e fornecedores através de tecnologia e dados inteligentes.*
