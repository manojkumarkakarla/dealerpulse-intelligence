# DealerPulse Intelligence Engine

An enterprise operational intelligence and diagnostic dashboard for dealership networks, built with Next.js, Recharts, and the Vercel AI SDK.

**Built by [Manoj Kumar Kakarla](https://manojtalks.in)**

---

Welcome to the DealerPulse Intelligence repository! If you're reviewing this project, I want to give you a quick lay of the land so you know exactly how everything is wired up. 

## 🏗️ Project Structure & Architecture

I organized this project to cleanly separate the frontend UI from the heavy data processing. Here's a quick look at the core folders and what they do:

- **`src/app/page.tsx` (The Frontend)**
  This is the main dashboard UI. It's built as a React Client Component using Tailwind CSS and Lucide icons. It features a sticky global filter header and a spacious grid layout. The AI chat terminal is built as a highly-interactive, floating "Intercom-style" widget in the bottom right corner, ensuring the data visualization takes center stage while keeping the AI instantly accessible.

- **`src/lib/analytics.ts` (The Brains)**
  This is where the heavy lifting happens. Instead of crunching the raw dataset on the client, this file handles all the math server-side. It computes the target vs. actual revenue, SLA delays, lead funnels, and powers the deterministic Actionable Insights engine (which flags cold leads and struggling reps).

- **`src/app/api/...` (The API Layer)**
  - `/api/metrics/route.ts`: Serves the pre-computed metrics to the frontend and handles URL query parameters for filtering.
  - `/api/chat/route.ts`: The AI diagnostic terminal endpoint. It takes the pre-computed metrics and injects them into a system prompt for the Vercel AI SDK to analyze. If you don't provide an OpenAI key, it seamlessly falls back to a deterministic rules engine!

- **`src/types/dealerpulse.ts` (The Guards)**
  This file contains strict **Zod schemas**. Before any analytics are run, the raw JSON dataset is parsed through these schemas to ensure data integrity. It handles edge cases like missing deal values or null delay reasons gracefully.

- **`src/data/dealerpulse_data.json` (The Dataset)**
  The raw, synthetic operational dataset representing 7 months of dealership data.

### How Data Flows

```mermaid
graph TD
    A[Client Dashboard (React/Tailwind)] -->|Fetches Metrics| B(/api/metrics)
    A -->|Natural Language Query| C(/api/chat)
    
    B --> D[src/lib/analytics.ts]
    C --> D
    C -->|Optional LLM API Call| E[OpenAI gpt-4o-mini]
    C -->|Fallback Keyword Match| F[Rule-based Analyzer]
    
    D --> G[src/types/dealerpulse.ts (Zod Schemas)]
    G -->|Strict Runtime Parse| H[src/data/dealerpulse_data.json]
```

---

## 🚀 Getting Started

I've made sure this project is incredibly easy to spin up locally. You can either run it natively via Node, or containerized via Docker.

### Option 1: Native Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **(Optional) Enable the AI Assistant**:
   To use the actual LLM-based intelligence rather than the fallback analyzer, create a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Open Application**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Option 2: Production Docker Deployment

This application is fully configured for standalone production execution out-of-the-box.

1. **Build and Run via Docker Compose**:
   ```bash
   # (Optional) Export OPENAI_API_KEY to your environment before building/running
   docker-compose up --build -d
   ```

2. **Access Application**:
   The production-optimized Next.js app will be running at [http://localhost:3000](http://localhost:3000).

3. **Stop the containers**:
   ```bash
   docker-compose down
   ```

---

*For more details on why I built certain features and the technical tradeoffs I made, please check out the [`DECISIONS.md`](./DECISIONS.md) file in this repository!*
