import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { DealerPulseDataSchema } from '@/types/dealerpulse';
import { computeAnalytics } from '@/lib/analytics';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Load and parse data to get metrics context
    const dataPath = path.join(process.cwd(), 'src/data/dealerpulse_data.json');
    const fileContents = await fs.readFile(dataPath, 'utf8');
    const rawData = JSON.parse(fileContents);
    const parsedData = DealerPulseDataSchema.parse(rawData);
    const metrics = computeAnalytics(parsedData);

    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    if (hasOpenAIKey) {
      // Configure OpenAI provider to use OpenRouter since the key is sk-or-v1-...
      const openrouter = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
      });

      // System prompt with context
      const systemPrompt = `
You are an executive intelligence assistant for a car dealership network. 
You are provided with precomputed operational metrics for the dealership branches, sales reps, and delivery SLA.
Analyze the user's question and provide a structured, actionable diagnosis based on these metrics.

Operational Metrics Data:
${JSON.stringify(metrics, null, 2)}

Please generate a concise root-cause breakdown with the following bullet points ONLY (do not add conversational filler):
- **Operational Finding:** [State what the data shows]
- **Identified Root Cause / Bottleneck:** [Determine the likely cause from the data]
- **Recommended Actionable Next Step:** [What the executive should do next]
`;

      const { text } = await generateText({
        model: openrouter('openai/gpt-4o-mini'),
        system: systemPrompt,
        prompt: message,
      });

      return NextResponse.json({ reply: text }, { status: 200 });
    } else {
      // Deterministic fallback rule-based analyzer
      const lowerMessage = message.toLowerCase();
      let reply = "";

      if (lowerMessage.includes("delay")) {
        const topDelayReason = Object.entries(metrics.deliverySLA.delay_reasons_distribution)
          .sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
        
        reply = `- **Operational Finding:** The dealership is averaging ${metrics.deliverySLA.average_days_to_deliver.toFixed(1)} days to deliver, with ${metrics.deliverySLA.total_delayed_orders} total delayed orders.\n- **Identified Root Cause / Bottleneck:** The top delay reason is "${topDelayReason[0]}" which occurred ${topDelayReason[1]} times.\n- **Recommended Actionable Next Step:** Investigate the bottleneck for "${topDelayReason[0]}" and establish faster SLA agreements or alternative processes.`;
      
      } else if (lowerMessage.includes("rep")) {
        // Find worst performing rep by conversion rate
        const worstRep = [...metrics.salesRepScorecard]
          .sort((a, b) => a.conversion_rate - b.conversion_rate)[0];

        reply = `- **Operational Finding:** Across all reps, some have exceptionally low conversion rates compared to the total leads handled.\n- **Identified Root Cause / Bottleneck:** Sales Rep ${worstRep?.rep_name || 'Unknown'} (Branch: ${worstRep?.branch_id || 'Unknown'}) has a conversion rate of ${((worstRep?.conversion_rate || 0) * 100).toFixed(1)}% on ${worstRep?.total_leads_handled || 0} leads handled, bottlenecking revenue.\n- **Recommended Actionable Next Step:** Schedule a 1-on-1 coaching session with ${worstRep?.rep_name || 'Unknown'} to review their sales process and lead follow-up.`;
      
      } else if (lowerMessage.includes("target") || lowerMessage.includes("branch")) {
        // Find branch missing target the most
        const worstBranch = [...metrics.targetVsActual]
          .sort((a, b) => {
            const aAchieve = a.target_revenue > 0 ? a.actual_revenue / a.target_revenue : 0;
            const bAchieve = b.target_revenue > 0 ? b.actual_revenue / b.target_revenue : 0;
            return aAchieve - bAchieve;
          })[0];

        if (worstBranch && worstBranch.target_revenue > 0) {
          const achievement = ((worstBranch.actual_revenue / worstBranch.target_revenue) * 100).toFixed(1);
          reply = `- **Operational Finding:** Not all branches are meeting their monthly revenue targets.\n- **Identified Root Cause / Bottleneck:** Branch ${worstBranch.branch_id} for month ${worstBranch.month} only achieved ${achievement}% of their revenue target (${worstBranch.actual_revenue} actual vs ${worstBranch.target_revenue} target).\n- **Recommended Actionable Next Step:** Review branch ${worstBranch.branch_id}'s lead volume and sales team capacity to identify localized performance gaps.`;
        } else {
          reply = `- **Operational Finding:** Target data is insufficient to identify missing targets.\n- **Identified Root Cause / Bottleneck:** Lack of populated target metrics in the dataset.\n- **Recommended Actionable Next Step:** Update target data for all branches to enable this analysis.`;
        }
      
      } else if (lowerMessage.includes("lost")) {
        // Find top lost reason overall models
        const reasons: Record<string, number> = {};
        for (const model of Object.values(metrics.leadFunnel.lost_reasons_by_model)) {
          for (const [reason, count] of Object.entries(model)) {
            reasons[reason] = (reasons[reason] || 0) + count;
          }
        }
        const topLostReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];

        reply = `- **Operational Finding:** The overall conversion rate is ${(metrics.leadFunnel.conversion_rate * 100).toFixed(1)}% with ${metrics.leadFunnel.total_lost_deals} total lost deals.\n- **Identified Root Cause / Bottleneck:** The primary reason for lost deals across all models is "${topLostReason[0]}", accounting for ${topLostReason[1]} lost opportunities.\n- **Recommended Actionable Next Step:** Develop counter-strategies or incentives targeting the "${topLostReason[0]}" objection.`;
      
      } else {
        reply = `- **Operational Finding:** Out of ${metrics.leadFunnel.total_leads} total leads, the overall conversion rate is ${(metrics.leadFunnel.conversion_rate * 100).toFixed(1)}%.\n- **Identified Root Cause / Bottleneck:** General overview does not highlight a specific bottleneck based on the keywords used.\n- **Recommended Actionable Next Step:** Ask specific questions mentioning "delay", "target", "branch", "lost", or "rep".`;
      }

      return NextResponse.json({ reply }, { status: 200 });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
