import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
} from 'n8n-workflow';

export class LedgerMem implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'LedgerMem',
    name: 'ledgerMem',
    icon: 'file:ledgermem.svg',
    group: ['transform'],
    version: 1,
    description: 'Read and write memories in LedgerMem',
    defaults: { name: 'LedgerMem' },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    credentials: [{ name: 'ledgerMemApi', required: true }],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Add', value: 'add', action: 'Store a new memory' },
          { name: 'Search', value: 'search', action: 'Semantic search' },
          { name: 'Update', value: 'update', action: 'Update a memory' },
          { name: 'Delete', value: 'delete', action: 'Delete a memory' },
          { name: 'List', value: 'list', action: 'List memories' },
        ],
        default: 'search',
      },
      { displayName: 'Memory ID', name: 'id', type: 'string', default: '', required: true,
        displayOptions: { show: { operation: ['update', 'delete'] } } },
      { displayName: 'Content', name: 'content', type: 'string', default: '',
        displayOptions: { show: { operation: ['add', 'update'] } } },
      { displayName: 'Query', name: 'query', type: 'string', default: '', required: true,
        displayOptions: { show: { operation: ['search'] } } },
      { displayName: 'Limit', name: 'limit', type: 'number', default: 10,
        displayOptions: { show: { operation: ['search', 'list'] } } },
      { displayName: 'Metadata (JSON)', name: 'metadata', type: 'json', default: '{}',
        displayOptions: { show: { operation: ['add', 'update'] } } },
      { displayName: 'Actor ID', name: 'actorId', type: 'string', default: '',
        displayOptions: { show: { operation: ['add', 'search'] } } },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const results: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('ledgerMemApi');
    const baseUrl = (credentials.baseUrl as string) || 'https://api.proofly.dev';

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i) as string;
      let response: unknown;

      if (operation === 'add') {
        response = await this.helpers.httpRequestWithAuthentication.call(this, 'ledgerMemApi', {
          method: 'POST',
          url: `${baseUrl}/v1/memories`,
          json: true,
          body: {
            content: this.getNodeParameter('content', i),
            metadata: this.getNodeParameter('metadata', i),
            actorId: this.getNodeParameter('actorId', i, '') || undefined,
          },
        });
      } else if (operation === 'search') {
        response = await this.helpers.httpRequestWithAuthentication.call(this, 'ledgerMemApi', {
          method: 'POST',
          url: `${baseUrl}/v1/search`,
          json: true,
          body: {
            query: this.getNodeParameter('query', i),
            limit: this.getNodeParameter('limit', i),
            actorId: this.getNodeParameter('actorId', i, '') || undefined,
          },
        });
      } else if (operation === 'update') {
        // URL-encode user-supplied ids — without this a slash or `..` in an id
        // could rewrite the request path or hit unintended endpoints.
        const id = encodeURIComponent(String(this.getNodeParameter('id', i)));
        response = await this.helpers.httpRequestWithAuthentication.call(this, 'ledgerMemApi', {
          method: 'PATCH',
          url: `${baseUrl}/v1/memories/${id}`,
          json: true,
          body: {
            content: this.getNodeParameter('content', i),
            metadata: this.getNodeParameter('metadata', i),
          },
        });
      } else if (operation === 'delete') {
        const rawId = String(this.getNodeParameter('id', i));
        const id = encodeURIComponent(rawId);
        await this.helpers.httpRequestWithAuthentication.call(this, 'ledgerMemApi', {
          method: 'DELETE',
          url: `${baseUrl}/v1/memories/${id}`,
        });
        response = { id: rawId, deleted: true };
      } else {
        response = await this.helpers.httpRequestWithAuthentication.call(this, 'ledgerMemApi', {
          method: 'GET',
          url: `${baseUrl}/v1/memories`,
          qs: { limit: this.getNodeParameter('limit', i) },
        });
      }

      results.push({ json: response as Record<string, unknown> });
    }

    return [results];
  }
}
