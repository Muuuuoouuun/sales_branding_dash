import { NextRequest, NextResponse } from 'next/server';
import {
  getNeoCrmConfig,
  getNeoCrmSetupChecklist,
  pullNeoCrmSnapshot,
} from '@/lib/integrations/neoCrm';
import { saveLeads, saveRegionalMetrics } from '@/lib/server/salesData';

interface SyncRequestBody {
  dryRun?: boolean;
}

export async function GET() {
  const config = getNeoCrmConfig();

  return NextResponse.json({
    provider: 'neo_crm',
    ready: config !== null,
    requiredEnvKeys: getNeoCrmSetupChecklist(),
    hasMetricsSync: Boolean(config?.metricsUrl),
    usesStaticToken: Boolean(config?.accessToken),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as SyncRequestBody;
    const dryRun = body.dryRun ?? false;

    const snapshot = await pullNeoCrmSnapshot();

    if (dryRun) {
      return NextResponse.json({
        success: true,
        mode: 'dry-run',
        provider: 'neo_crm',
        summary: snapshot.metadata,
        preview: {
          leads: snapshot.leads.slice(0, 5),
          metrics: snapshot.metrics.slice(0, 5),
        },
      });
    }

    const leadsResult = await saveLeads(snapshot.leads);
    const metricsResult = snapshot.metrics.length
      ? await saveRegionalMetrics(snapshot.metrics)
      : null;

    return NextResponse.json({
      success: true,
      mode: 'persist',
      provider: 'neo_crm',
      summary: snapshot.metadata,
      backends: {
        leads: leadsResult.backend,
        metrics: metricsResult?.backend ?? null,
      },
      savedAt: {
        leads: leadsResult.savedAt,
        metrics: metricsResult?.savedAt ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        provider: 'neo_crm',
        error: error instanceof Error ? error.message : 'Neo CRM sync failed.',
      },
      { status: 500 },
    );
  }
}
