import { Controller, Get, Inject, NotFoundException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { APP_ENV } from '../config/config.module';
import type { ApiEnv } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';

export interface DevIdentityOption {
  tenantId: string;
  tenantName: string;
  userId: string;
  displayName: string;
  email: string;
  persona: string;
}

/**
 * Lets the web app's "Choose who you are" screen list seeded users without
 * a chicken-and-egg auth problem (dev-stub mode has no login flow to call
 * first). Only ever functional in dev-stub mode — AuthGuard already
 * refuses AUTH_MODE=dev-stub when NODE_ENV=production at boot, so gating
 * this endpoint the same way means it can never leak tenant/user data in a
 * real deployment. Bypasses RLS deliberately (withoutTenantScope) since
 * its whole job is listing identities *across* tenants for the picker.
 */
@ApiExcludeController()
@Controller('dev/identities')
export class DevToolsController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_ENV) private readonly env: ApiEnv,
  ) {}

  @Public()
  @Get()
  async list(): Promise<DevIdentityOption[]> {
    if (this.env.AUTH_MODE !== 'dev-stub') {
      throw new NotFoundException();
    }
    const users = await this.prisma.withoutTenantScope((tx) =>
      tx.user.findMany({
        where: { active: true, isServiceAccount: false },
        include: { tenant: true },
        orderBy: [{ tenant: { name: 'asc' } }, { displayName: 'asc' }],
      }),
    );
    return users.map((u) => ({
      tenantId: u.tenantId,
      tenantName: u.tenant.name,
      userId: u.id,
      displayName: u.displayName,
      email: u.email,
      persona: u.primaryPersona,
    }));
  }
}
