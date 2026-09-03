# DECISIONS.md

Hey there! Thanks for taking the time to review my assignment. I wanted to use this document to walk you through my thought process, the decisions I made, and why I built the dashboard this way.

## What I Built and Why

When I read the Document, the main goal stood out to me: build something a CEO or branch manager could actually use to understand their business and take immediate action. I didn't want to just dump a bunch of charts on a page. I wanted to build a true "intelligence engine."

Here's what I focused on:

1. **Global Filtering & Drill-down:** I built it so the CEO can start high-level (all branches, all months) and immediately drill down into a specific branch or month. The whole dashboard—KPIs, charts, and rep tables—reacts instantly to these filters.
2. **Actionable Insights Feed:** You mentioned you wanted "at least one actionable insight." Instead of hardcoding a static insight, I wrote a deterministic rules engine that scans the data and generates a live feed of alerts. It automatically flags things like "Cold Leads" (no activity for 7+ days), missed revenue targets, and struggling sales reps. I figured this is what a manager actually wants to see when they log in every morning.
3. **Floating AI Intelligence Widget:** I had some fun with this one! I integrated the Vercel AI SDK to add a conversational interface. Originally I embedded it directly in the page, but I realized it took up too much valuable data real estate. I extracted it into a sleek, floating "Intercom-style" widget in the bottom right corner. To ensure executives actually use it, I added an attention-grabbing bouncing callout ("Ask AI for Analysis ✨") and a pinging animation. If you plug in an OpenAI key, you can ask questions like "Why is Chennai facing delays?" and get a structured root-cause analysis. If there's no key, it falls back to a deterministic rules engine so the app always works right out-of-the-box.
4. **Fulfillment Bottlenecks Visualization:** I noticed there were a lot of delays in the data. I built a dynamic pie chart to visualize `delay_reasons` so leadership can instantly see if logistics or RTO backlogs are the main culprits holding up revenue.
5. **Rep Scorecard Table:** I added a table at the bottom to drill all the way down to individual contributor performance, highlighting their conversion rates and total booked revenue.

## Key Technical Decisions & Tradeoffs

**1. Using Zod for Runtime Validation**
*The Decision:* I passed the raw `dealership_data.json` through strict Zod schemas before doing any analytics.
*The Tradeoff:* While TypeScript is great for compile-time safety, it disappears at runtime. I noticed the dataset had some edge cases (like null delay reasons or missing deal values). Zod gave me zero-latency runtime protection to ensure the dashboard wouldn't crash from unexpected data shapes, while also automatically generating my TypeScript types (`z.infer`). It takes a bit more boilerplate upfront, but it makes the app bulletproof.

**2. Server-Side vs. Client-Side Analytics**
*The Decision:* I chose to compute all the analytics in a Next.js API route (`/api/metrics`) rather than processing the JSON directly in the React client.
*The Tradeoff:* Pushing large, raw datasets to the client can hurt performance. By aggregating the data on the server, the frontend only receives the lightweight, pre-computed metrics. It makes the UI render incredibly fast and keeps the client bundle small.

**3. Deterministic Alerts vs. Pure LLM Analysis**
*The Decision:* The "Actionable Insights" feed is calculated deterministically via math, while the ad-hoc chat terminal uses the LLM (if configured).
*The Tradeoff:* LLMs are awesome, but they can be slow and sometimes hallucinate. When a CEO needs to know exactly how many leads are cold today, they need hard math. I reserved the AI for complex conversational querying where it acts as a multiplier on top of the deterministic data.

## What I'd Build Next With More Time

If I had another week to keep pushing this, here's what I'd tackle next:
- **Predictive Forecasting:** I'd love to build a pipeline to estimate end-of-month revenue based on current lead velocity and historical branch conversion rates.
- **Lead Pipeline Kanban:** A drag-and-drop kanban board showing exactly where individual leads are stuck in the funnel.
- **Authentication & RBAC:** Implement a role-based login system so Branch Managers only see their specific branch's data, while the CEO gets the global view.
- **Live Data Webhooks:** Move away from the static JSON file and build an ingestion API to accept real-time payloads from CRM systems like Salesforce.

## Interesting Patterns in the Data

While digging through the JSON, a few things caught my eye:
- **The Logistics Bottleneck:** Delivery delays aren't random—they are highly concentrated around specific logistical and RTO bottlenecks. 
- **Rep Performance Variance:** The standard deviation in conversion rates among the 30 sales reps is massive. A few top performers are carrying the bulk of the revenue, while others have sub-10% conversion rates. It screams out for targeted 1-on-1 coaching, which is why I made sure the Actionable Insights feed flags struggling reps automatically.

Thanks again for the opportunity! I really enjoyed working on this dataset and treating it like a real product.
