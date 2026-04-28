import {
  IPollFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
} from 'n8n-workflow';

export class LedgerMemTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'LedgerMem Trigger',
    name: 'ledgerMemTrigger',
    icon: 'file:../LedgerMem/ledgermem.svg',
    group: ['trigger'],
    version: 1,
    description: 'Triggers when new memories are added to the workspace',
    defaults: { name: 'LedgerMem Trigger' },
    polling: true,
    inputs: [],
    outputs: [NodeConnectionType.Main],
    credentials: [{ name: 'ledgerMemApi', required: true }],
    properties: [
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 25,
        description: 'Max memories fetched per poll',
      },
    ],
  };

  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const credentials = await this.getCredentials('ledgerMemApi');
    const baseUrl = (credentials.baseUrl as string) || 'https://api.proofly.dev';
    const staticData = this.getWorkflowStaticData('node');
    const lastSeen = (staticData.lastSeen as string) || '';
    // Track the ids emitted at exactly the watermark so collisions on
    // millisecond-precision createdAt don't drop items: a strict `>`
    // filter skipped every memory that shared a timestamp with the last
    // emitted one, an `>=` filter re-emitted them. Combine `>=` with an
    // id allowlist for the boundary timestamp.
    const seenAtWatermark = new Set<string>(
      Array.isArray(staticData.seenAtWatermark)
        ? (staticData.seenAtWatermark as string[])
        : [],
    );

    const response = (await this.helpers.httpRequestWithAuthentication.call(
      this,
      'ledgerMemApi',
      {
        method: 'GET',
        url: `${baseUrl}/v1/memories`,
        qs: { limit: this.getNodeParameter('limit', 25) },
        json: true,
      },
    )) as { items?: Array<{ id: string; createdAt: string }> };

    const items = response.items ?? [];
    const fresh = items.filter((m) => {
      if (!lastSeen) return true;
      if (m.createdAt > lastSeen) return true;
      if (m.createdAt === lastSeen && !seenAtWatermark.has(m.id)) return true;
      return false;
    });
    if (fresh.length === 0) return null;

    // The API doesn't guarantee items[0] is the newest, so compute the high
    // watermark explicitly. Trusting fresh[0] caused the watermark to rewind
    // when items came back in any order other than newest-first.
    let nextWatermark = lastSeen;
    for (const m of fresh) {
      if (!nextWatermark || m.createdAt > nextWatermark) {
        nextWatermark = m.createdAt;
      }
    }
    const idsAtWatermark = new Set<string>(
      nextWatermark === lastSeen ? seenAtWatermark : [],
    );
    for (const m of fresh) {
      if (m.createdAt === nextWatermark) idsAtWatermark.add(m.id);
    }
    staticData.lastSeen = nextWatermark;
    staticData.seenAtWatermark = Array.from(idsAtWatermark);
    return [fresh.map((json) => ({ json }))];
  }
}
