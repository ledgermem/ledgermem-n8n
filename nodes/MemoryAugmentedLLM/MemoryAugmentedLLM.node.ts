import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
} from 'n8n-workflow';

export class MemoryAugmentedLLM implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'LedgerMem Augmented LLM',
    name: 'memoryAugmentedLLM',
    icon: 'file:../LedgerMem/ledgermem.svg',
    group: ['transform'],
    version: 1,
    description: 'Searches LedgerMem then sends prompt + retrieved memories to an LLM',
    defaults: { name: 'Memory-Augmented LLM' },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    credentials: [
      { name: 'ledgerMemApi', required: true },
      { name: 'openAiApi', required: true },
    ],
    properties: [
      { displayName: 'Prompt', name: 'prompt', type: 'string', default: '', required: true },
      { displayName: 'Top K Memories', name: 'topK', type: 'number', default: 5 },
      { displayName: 'Model', name: 'model', type: 'string', default: 'gpt-4o-mini' },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const out: INodeExecutionData[] = [];
    const lmCreds = await this.getCredentials('ledgerMemApi');
    const baseUrl = (lmCreds.baseUrl as string) || 'https://api.proofly.dev';

    for (let i = 0; i < items.length; i++) {
      const prompt = this.getNodeParameter('prompt', i) as string;
      const topK = this.getNodeParameter('topK', i) as number;
      const model = this.getNodeParameter('model', i) as string;

      const search = (await this.helpers.httpRequestWithAuthentication.call(
        this,
        'ledgerMemApi',
        {
          method: 'POST',
          url: `${baseUrl}/v1/search`,
          json: true,
          body: { query: prompt, limit: topK },
        },
      )) as { hits: Array<{ content: string }> };

      const context = search.hits.map((h, idx) => `[${idx + 1}] ${h.content}`).join('\n');
      const completion = (await this.helpers.httpRequestWithAuthentication.call(
        this,
        'openAiApi',
        {
          method: 'POST',
          url: 'https://api.openai.com/v1/chat/completions',
          json: true,
          body: {
            model,
            messages: [
              { role: 'system', content: `Use these memories:\n${context}` },
              { role: 'user', content: prompt },
            ],
          },
        },
      )) as { choices: Array<{ message: { content: string } }> };

      out.push({
        json: {
          prompt,
          memories: search.hits,
          answer: completion.choices[0].message.content,
        },
      });
    }

    return [out];
  }
}
