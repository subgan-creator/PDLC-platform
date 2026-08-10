import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * `/health` = liveness (process is up; no external dependencies checked —
 * a slow DB should never make the orchestrator kill and restart a healthy
 * process). `/ready` = readiness (can this instance actually serve
 * traffic — DB reachable). Both are `@Public()`: load balancers and k8s
 * probes don't carry auth tokens.
 */
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('health')
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.prismaIndicator.pingCheck('database', this.prisma)]);
  }
}
