import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { DealerPulseDataSchema } from '@/types/dealerpulse';
import { computeAnalytics } from '@/lib/analytics';
import { ZodError } from 'zod';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get('month') || undefined;
    const branch_id = url.searchParams.get('branch_id') || undefined;

    // Read the synthetic data file
    const dataPath = path.join(process.cwd(), 'src/data/dealerpulse_data.json');
    const fileContents = await fs.readFile(dataPath, 'utf8');
    const rawData = JSON.parse(fileContents);

    // Safely parse with Zod
    const parsedData = DealerPulseDataSchema.parse(rawData);

    // Compute operational intelligence metrics with filters
    const metrics = computeAnalytics(parsedData, { month, branch_id });

    // Return the clean JSON with HTTP 200
    return NextResponse.json(metrics, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      // Return HTTP 422 on validation failure
      return NextResponse.json(
        { error: 'Data validation failed', details: error.issues },
        { status: 422 }
      );
    }

    // Handle other potential errors (like file not found or invalid JSON)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
