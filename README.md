# FRAUD.AI — AI Fraud Investigation Agent with TigerGraph

> An AI-powered fraud investigation agent built for the **Hacker House Goa 2026 × TigerGraph Partner Trial**.

FRAUD.AI combines **TigerGraph graph evidence, historical confirmed cases, deterministic policy rules, customer verification, and LLM-based reasoning** to investigate fraud cases and recommend evidence-grounded next actions.

---

## 🚀 Live Demo

- **Live UI:** https://fraud-agent.vercel.app
- **Demo Video:** https://youtu.be/ziXhW57QGmA
- **Technical Blog:** https://fraud-ai.hashnode.dev/building-an-ai-fraud-investigation-agent-with-tigergraph
- **GitHub:** https://github.com/AswinAmalaJones/fraud-agent

---

## 🎯 Problem

Traditional fraud detection systems often operate on individual transactions and risk scores.

However, fraud investigations require connecting multiple pieces of evidence:

- Transactions
- Customers
- Cards
- Devices
- Historical confirmed fraud
- Transaction bursts
- Shared infrastructure
- Customer verification
- Financial exposure

A high risk score alone should not automatically result in blocking a customer.

FRAUD.AI uses **TigerGraph as the investigation evidence layer** and combines graph relationships with policy-grounded reasoning to determine the next best action.

> **Important:** `risk_score` is treated as an input signal, not as the final verdict.

---

## 💡 What FRAUD.AI Does

For every investigation case, the agent:

1. Loads the case and transaction context.
2. Queries TigerGraph for connected entities.
3. Searches historical confirmed fraud cases.
4. Detects transaction bursts and related activity.
5. Investigates shared devices and connected cards.
6. Combines independent evidence sources.
7. Requests customer verification when required.
8. Updates the fraud probability based on evidence.
9. Applies deterministic policy rules.
10. Calculates financial exposure.
11. Determines the next-best action.
12. Creates/report cases when policy conditions are satisfied.
13. Writes the investigation result back to TigerGraph.
14. Produces a structured JSON investigation record.

---

# 🏗️ Architecture

```text
                         ┌─────────────────────────┐
                         │      React + Vite       │
                         │ Investigation Command   │
                         │        Center           │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │     Python Agent         │
                         │      Orchestrator        │
                         └────────────┬────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
      ┌────────────────┐     ┌─────────────────┐     ┌────────────────┐
      │   TigerGraph   │     │  Policy Engine  │     │  LLM Reasoning │
      │ Graph + Tools  │     │  Deterministic  │     │  Investigation │
      └───────┬────────┘     └─────────────────┘     └────────────────┘
              │
              ▼
      ┌──────────────────────────────────────────┐
      │ Transactions / Identity / Closed Cases  │
      │ Customers / Cards / Devices / Evidence  │
      └────────────────────┬─────────────────────┘
                           │
                           ▼
                 ┌──────────────────────┐
                 │ Case JSON + Graph    │
                 │      Write-back      │
                 └──────────────────────┘

🧩 Core Components
1. Agent Orchestrator

orchestrator.py

Coordinates the complete investigation workflow.

Responsibilities include:

Case loading
Graph investigation
Evidence collection
LLM reasoning
Customer verification
Policy evaluation
Case output generation
Graph write-back
2. Graph Investigation Tools

tools.py

Provides the investigation layer used to retrieve graph evidence.

The implementation handles graph evidence such as:

Related transactions
Customer connections
Device sharing
Connected cards
Historical fraud cases
Transaction burst information

Time-sensitive transaction data is normalized before burst analysis so that transaction timestamps, IDs, and amounts remain correctly aligned.

3. Policy Engine

policy.py

The policy engine converts investigation evidence into operational actions.

The LLM is not the sole authority for final operational decisions.

The system separates:

Evidence
   ↓
Reasoning
   ↓
Policy
   ↓
Action

This provides a deterministic policy layer between investigation reasoning and operational actions.

4. Customer Verification

The investigation can request customer verification when evidence is not sufficient for a final action.

Verification can produce outcomes such as:

Confirmed transaction
Denied transaction
No response

The result is then fed back into the policy engine.

5. Graph Write-back

graph_writer.py

Investigation results are written back to TigerGraph.

This allows the investigation itself to become part of the graph and provides a foundation for future investigations.

🕵️ Supported Fraud Patterns

The implementation supports documented patterns including:

card_testing
card_not_present_fraud
card_not_present_new_device
out_of_region_use
account_takeover

The system can also represent evidence-supported patterns that do not fit the documented categories.

⚙️ Policy Actions

The policy engine supports actions including:

ALLOW_TRANSACTION
DECLINE_TRANSACTION
MONITOR_CARD
MONITOR_CONNECTED_CARDS
WARN_CUSTOMER
VERIFY_WITH_CUSTOMER
STEP_UP_AUTH
BLOCK_CARD
BLOCK_ALL_CARDS
GENERATE_REPORT
CREATE_CASE
FILE_REPORT
ESCALATE_TO_ANALYST
CLOSE_NO_FRAUD

Approval levels are represented where required by the investigation policy.

📊 Evidence Convergence

FRAUD.AI does not rely on a single signal.

The investigation can combine:

Transaction behavior
Transaction bursts
Shared device profiles
Connected cards
Historical confirmed fraud
Customer verification
Financial exposure
Graph relationships
Policy rules

The investigation stops when sufficient independent evidence is available or when additional investigation is unlikely to materially change the outcome.

📁 Output

The final 20 investigation results are stored under:

cases/
├── HHG-001.json
├── HHG-002.json
├── HHG-003.json
├── ...
└── HHG-020.json

Each case contains structured information including:

Case metadata
Verdict
Fraud probability
Fraud pattern
Affected transactions
Evidence requests
Next-best actions
SAR/report decision
Stop reason
Tool calls
Investigation metrics
Graph write-back status

The frontend uses synchronized case snapshots under:

frontend/src/data/cases/
🖥️ Investigation Command Center

The React frontend provides a security operations style interface with:

Overview
Cases
Investigation
Investigation Replay
Network Graph
Evidence Explorer
Evidence Convergence
Burst Timeline
Explainability
Policy
Policy Audit
SAR
Investigation Metrics

The UI is designed to expose the evidence chain instead of showing only a final verdict.

🧪 Example Cases
HHG-006

HHG-006 demonstrates a multi-signal fraud investigation.

Evidence includes:

Multiple online transactions
Transaction burst
Shared device profile
Historical confirmed fraud cases
Connected cards
Customer verification
Financial exposure
Policy-rule evaluation

The investigation reaches a fraud conclusion after customer verification and produces policy-grounded actions including card blocking, case creation, reporting, and monitoring of connected cards.

HHG-014

HHG-014 demonstrates an investigation involving an undocumented fraud pattern.

Evidence includes:

Historical confirmed fraud cases
Shared device evidence
Multiple connected cards
Multiple related customers
Exposure analysis
Policy-driven case/report actions

This demonstrates that the investigation is not restricted to only predefined fraud labels.

📈 Validation

The repository contains 20 final case outputs.

Run:

python validate_cases.py

Expected result:

Checked 20 case(s). 0 error(s). 0 warning(s).
🗂️ Project Structure
fraud-agent/
│
├── cases/
│   ├── HHG-001.json
│   ├── HHG-002.json
│   └── ... HHG-020.json
│
├── config/
│   └── decisions.yaml
│
├── graph/
│   ├── 01_create_graph.gsql
│   ├── 02_create_loading_jobs.gsql
│   └── 03_check_stage2.gsql
│
├── frontend/
│   ├── src/
│   │   └── data/
│   │       └── cases/
│   ├── package.json
│   └── vite.config.ts
│
├── orchestrator.py
├── policy.py
├── tools.py
├── simulator.py
├── graph_writer.py
├── validate_cases.py
├── check_cases.py
├── requirements.txt
├── .gitignore
└── README.md
🛠️ Technology Stack
Backend
Python
TigerGraph
TigerGraph graph queries / MCP integration
Google Gemini
Deterministic Policy Engine
Frontend
React
TypeScript
Vite
Cytoscape.js
Recharts
Lucide React
Deployment
Vercel
⚡ Installation
Backend

Python 3.10+ is recommended.

Install dependencies:

pip install -r requirements.txt

Create a .env file:

GOOGLE_API_KEY=your_api_key

Never commit API keys or .env files.

🌐 Frontend Setup

Navigate to the frontend:

cd frontend

Install dependencies:

npm install

Start the development server:

npm run dev

For a production build:

npm run build
🐯 TigerGraph Setup

The TigerGraph GSQL setup files are available under:

graph/

The expected setup flow is:

Create the TigerGraph graph/schema.
Create the loading jobs.
Load the challenge dataset.
Create the investigation graph structures.
Deploy the required queries/tools.
Configure the agent to access TigerGraph.
Run the investigation orchestrator.

The challenge dataset is not committed to this repository.

▶️ Running an Investigation

After configuring TigerGraph and the challenge data:

python orchestrator.py HHG-006

Replace HHG-006 with another case ID.

The generated investigation is written to:

cases/HHG-006.json

The investigation result is also written back to the configured TigerGraph graph.

🔐 Security

Secrets are provided through environment variables.

The repository intentionally excludes:

.env
.venv/
frontend/node_modules/
frontend/dist/

No API keys or credentials should be committed to the repository.

📚 Technical Blog

Detailed architecture, investigation flow, TigerGraph integration, evidence convergence, customer verification, and implementation decisions are documented in the technical blog:

Building an AI Fraud Investigation Agent with TigerGraph

https://fraud-ai.hashnode.dev/building-an-ai-fraud-investigation-agent-with-tigergraph

🎥 Demo

The demo video shows the investigation agent running end-to-end, including graph evidence and investigation results.

https://youtu.be/ziXhW57QGmA

👥 Team
BUILD MIND

Built for:

Hacker House Goa 2026 × TigerGraph Partner Trial

🔗 Links
Resource	Link
Live Demo	https://fraud-agent.vercel.app
GitHub	https://github.com/AswinAmalaJones/fraud-agent
Demo Video	https://youtu.be/ziXhW57QGmA
Technical Blog	https://fraud-ai.hashnode.dev/building-an-ai-fraud-investigation-agent-with-tigergraph
📌 Project Status

Final hackathon submission version.

The repository contains the final 20 investigated case outputs and the production frontend used for the demonstration.