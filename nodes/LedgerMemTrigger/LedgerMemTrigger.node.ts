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
    const lastSeen = (this.getWorkflowStaticData('node').lastSeen as string) || '';

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
    const fresh = items.filter((m) => !lastSeen || m.createdAt > lastSeen);
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
    this.getWorkflowStaticData('node').lastSeen = nextWatermark;
    return [fresh.map((json) => ({ json }))];
  }
}
