import { NextResponse } from 'next/server';
import { getIntegrationStatuses } from '@/lib/server/integrationStatus';

export async function GET() {
  return NextResponse.json({
    providers: getIntegrationStatuses(),
    generatedAt: new Date().toISOString(),
  });
}
