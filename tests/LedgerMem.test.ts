import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LedgerMem } from '../nodes/LedgerMem/LedgerMem.node';

const makeContext = (op: string, params: Record<string, unknown>) => {
  const requestMock = vi.fn();
  const ctx = {
    getInputData: () => [{ json: {} }],
    getCredentials: vi.fn().mockResolvedValue({
      apiKey: 'k',
      workspaceId: 'w',
      baseUrl: 'https://api.proofly.dev',
    }),
    getNodeParameter: (name: string, _i: number, fallback?: unknown) =>
      name === 'operation' ? op : params[name] ?? fallback,
    helpers: { httpRequestWithAuthentication: requestMock },
  };
  return { ctx, requestMock };
};

describe('LedgerMem node', () => {
  let node: LedgerMem;
  beforeEach(() => {
    node = new LedgerMem();
  });

  it('add → POST /v1/memories', async () => {
    const { ctx, requestMock } = makeContext('add', {
      content: 'hi',
      metadata: { x: 1 },
      actorId: '',
    });
    requestMock.mockResolvedValue({ id: 'mem_1', content: 'hi' });
    const result = await node.execute.call(ctx as any);
    expect(requestMock).toHaveBeenCalledWith(
      'ledgerMemApi',
      expect.objectContaining({ method: 'POST', url: expect.stringContaining('/v1/memories') }),
    );
    expect(result[0][0].json).toEqual({ id: 'mem_1', content: 'hi' });
  });

  it('search → POST /v1/search', async () => {
    const { ctx, requestMock } = makeContext('search', { query: 'q', limit: 3, actorId: '' });
    requestMock.mockResolvedValue({ hits: [{ id: 'mem_2', score: 0.9 }] });
    const result = await node.execute.call(ctx as any);
    expect(requestMock).toHaveBeenCalledWith(
      'ledgerMemApi',
      expect.objectContaining({ url: expect.stringContaining('/v1/search') }),
    );
    expect((result[0][0].json as any).hits[0].id).toBe('mem_2');
  });

  it('delete → DELETE /v1/memories/:id', async () => {
    const { ctx, requestMock } = makeContext('delete', { id: 'mem_x' });
    requestMock.mockResolvedValue({});
    const result = await node.execute.call(ctx as any);
    expect(requestMock).toHaveBeenCalledWith(
      'ledgerMemApi',
      expect.objectContaining({ method: 'DELETE', url: expect.stringContaining('/v1/memories/mem_x') }),
    );
    expect(result[0][0].json).toEqual({ id: 'mem_x', deleted: true });
  });
});
