import { z } from "zod";

export const BranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
});

export const SalesRepSchema = z.object({
  id: z.string(),
  name: z.string(),
  branch_id: z.string(),
  role: z.string(),
  joined: z.string(),
});

export const StatusHistorySchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  note: z.string(),
});

export const LeadSchema = z.object({
  id: z.string(),
  customer_name: z.string(),
  phone: z.string(),
  source: z.string(),
  model_interested: z.string(),
  status: z.string(),
  assigned_to: z.string(),
  branch_id: z.string(),
  created_at: z.string(),
  last_activity_at: z.string(),
  status_history: z.array(StatusHistorySchema),
  expected_close_date: z.string().optional().nullable(),
  deal_value: z.number().optional().nullable(),
  lost_reason: z.string().optional().nullable(),
});

export const TargetSchema = z.object({
  branch_id: z.string(),
  month: z.string(),
  target_units: z.number(),
  target_revenue: z.number(),
});

export const DeliverySchema = z.object({
  lead_id: z.string(),
  order_date: z.string(),
  delivery_date: z.string(),
  days_to_deliver: z.number(),
  delay_reason: z.string().optional().nullable(),
});

export const DealerPulseDataSchema = z.object({
  metadata: z.record(z.string(), z.any()).optional(),
  branches: z.array(BranchSchema),
  sales_reps: z.array(SalesRepSchema),
  leads: z.array(LeadSchema),
  targets: z.array(TargetSchema).optional().default([]),
  deliveries: z.array(DeliverySchema).optional().default([]),
});

export type Branch = z.infer<typeof BranchSchema>;
export type SalesRep = z.infer<typeof SalesRepSchema>;
export type StatusHistory = z.infer<typeof StatusHistorySchema>;
export type Lead = z.infer<typeof LeadSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type Delivery = z.infer<typeof DeliverySchema>;
export type DealerPulseData = z.infer<typeof DealerPulseDataSchema>;
