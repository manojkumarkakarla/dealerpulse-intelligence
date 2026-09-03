import { DealerPulseData } from "../types/dealerpulse";

export interface AnalyticsFilters {
  month?: string; // YYYY-MM
  branch_id?: string;
}

export function computeAnalytics(data: DealerPulseData, filters?: AnalyticsFilters) {
  // 1. Target vs. Actual revenue & units per branch and month
  const targetVsActual = data.targets
    .filter(target => !filters?.month || target.month === filters.month)
    .filter(target => !filters?.branch_id || target.branch_id === filters.branch_id)
    .map(target => {
      const wonLeads = data.leads.filter(l => 
        l.branch_id === target.branch_id && 
        (l.status === "delivered" || l.status === "order_placed") &&
        l.last_activity_at.startsWith(target.month)
      );

      const actual_units = wonLeads.length;
      const actual_revenue = wonLeads.reduce((sum, l) => sum + (l.deal_value || 0), 0);

      return {
        branch_id: target.branch_id,
        month: target.month,
        target_units: target.target_units,
        actual_units,
        target_revenue: target.target_revenue,
        actual_revenue,
      };
    });

  // Base scope of leads for funnel & reps based on filters
  const scopedLeads = data.leads
    .filter(l => !filters?.branch_id || l.branch_id === filters.branch_id)
    .filter(l => !filters?.month || l.created_at.startsWith(filters.month));

  // 2. Lead funnel metrics
  const total_leads = scopedLeads.length;
  const delivered_leads = scopedLeads.filter(l => l.status === "delivered").length;
  const conversion_rate = total_leads > 0 ? delivered_leads / total_leads : 0;
  const total_lost_deals = scopedLeads.filter(l => l.status === "lost").length;
  
  const lost_reasons_by_model: Record<string, Record<string, number>> = {};
  scopedLeads.forEach(lead => {
    if (lead.status === "lost") {
      const model = lead.model_interested || "Unknown";
      const reason = lead.lost_reason || "Not specified";
      if (!lost_reasons_by_model[model]) lost_reasons_by_model[model] = {};
      lost_reasons_by_model[model][reason] = (lost_reasons_by_model[model][reason] || 0) + 1;
    }
  });

  const leadFunnel = {
    total_leads, delivered_leads, conversion_rate, total_lost_deals, lost_reasons_by_model
  };

  // 3. Delivery SLA Bottleneck analysis
  const leadIds = new Set(scopedLeads.map(l => l.id));
  const scopedDeliveries = data.deliveries.filter(d => leadIds.has(d.lead_id));
  
  let totalDays = 0;
  let total_delayed_orders = 0;
  const delay_reasons_distribution: Record<string, number> = {};

  scopedDeliveries.forEach(del => {
    totalDays += del.days_to_deliver;
    if (del.delay_reason) {
      total_delayed_orders++;
      delay_reasons_distribution[del.delay_reason] = (delay_reasons_distribution[del.delay_reason] || 0) + 1;
    }
  });

  const average_days_to_deliver = scopedDeliveries.length > 0 ? totalDays / scopedDeliveries.length : 0;
  const deliverySLA = { average_days_to_deliver, total_delayed_orders, delay_reasons_distribution };

  // 4. Sales Rep scorecard
  const activeReps = data.sales_reps.filter(r => !filters?.branch_id || r.branch_id === filters.branch_id);
  const salesRepScorecard = activeReps.map(rep => {
    const repLeads = scopedLeads.filter(l => l.assigned_to === rep.id);
    const total_leads_handled = repLeads.length;
    const rep_delivered = repLeads.filter(l => l.status === "delivered").length;
    const rep_conversion_rate = total_leads_handled > 0 ? rep_delivered / total_leads_handled : 0;
    const booked_revenue = repLeads
      .filter(l => l.status === "delivered" || l.status === "order_placed")
      .reduce((sum, l) => sum + (l.deal_value || 0), 0);

    return {
      rep_id: rep.id, rep_name: rep.name, branch_id: rep.branch_id,
      total_leads_handled, conversion_rate: rep_conversion_rate, total_revenue_booked: booked_revenue
    };
  });

  // 5. Actionable Insights Engine
  const alerts: { type: string, message: string, severity: 'high' | 'medium' | 'low' }[] = [];
  
  // Cold Leads Alert
  const MOCK_TODAY = new Date('2025-12-31T00:00:00Z').getTime();
  const coldLeads = scopedLeads.filter(l => {
    if (l.status === 'delivered' || l.status === 'lost') return false;
    const activeTime = new Date(l.last_activity_at).getTime();
    const daysStuck = (MOCK_TODAY - activeTime) / (1000 * 60 * 60 * 24);
    return daysStuck > 7; 
  });
  
  if (coldLeads.length > 0) {
    alerts.push({
      type: 'Cold Leads',
      message: `${coldLeads.length} active lead(s) haven't had any activity in over 7 days.`,
      severity: coldLeads.length > 5 ? 'high' : 'medium'
    });
  }

  // Missed Target Alert
  const missedTargets = targetVsActual.filter(t => t.actual_revenue < t.target_revenue * 0.8 && t.month !== '2025-12');
  missedTargets.forEach(mt => {
    alerts.push({
      type: 'Missed Target',
      message: `Branch ${mt.branch_id} was ${(100 - (mt.actual_revenue / mt.target_revenue) * 100).toFixed(0)}% behind revenue target in ${mt.month}.`,
      severity: 'high'
    });
  });

  // Struggling Reps Alert
  const strugglingReps = salesRepScorecard.filter(r => r.total_leads_handled >= 10 && r.conversion_rate < 0.1);
  strugglingReps.forEach(r => {
    alerts.push({
      type: 'Performance',
      message: `${r.rep_name} (Branch ${r.branch_id}) has a very low conversion rate of ${(r.conversion_rate * 100).toFixed(1)}% across ${r.total_leads_handled} leads.`,
      severity: 'medium'
    });
  });

  return {
    targetVsActual,
    leadFunnel,
    deliverySLA,
    salesRepScorecard,
    alerts,
    availableBranches: data.branches
  };
}
