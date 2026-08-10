import { describe, expect, it } from 'vitest';
import { RequestContext } from './request-context';

describe('RequestContext', () => {
  it('isolates concurrent requests from each other', async () => {
    const results: string[] = [];

    await Promise.all([
      RequestContext.run({ requestId: 'req-1', tenantId: 'tenant-a', userId: null }, async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(RequestContext.current()!.tenantId!);
      }),
      Promise.resolve(
        RequestContext.run({ requestId: 'req-2', tenantId: 'tenant-b', userId: null }, () => {
          results.push(RequestContext.current()!.tenantId!);
        }),
      ),
    ]);

    expect(results).toContain('tenant-a');
    expect(results).toContain('tenant-b');
  });

  it('set() mutates the current context in place', () => {
    RequestContext.run({ requestId: 'req-3', tenantId: null, userId: null }, () => {
      RequestContext.set({ tenantId: 'tenant-c', userId: 'user-1' });
      expect(RequestContext.current()).toEqual({
        requestId: 'req-3',
        tenantId: 'tenant-c',
        userId: 'user-1',
      });
    });
  });

  it('requireTenantId throws outside a request context', () => {
    expect(() => RequestContext.requireTenantId()).toThrow();
  });

  it('requireTenantId throws when tenantId was never set', () => {
    RequestContext.run({ requestId: 'req-4', tenantId: null, userId: null }, () => {
      expect(() => RequestContext.requireTenantId()).toThrow();
    });
  });
});
