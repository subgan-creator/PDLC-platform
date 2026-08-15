import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RequestContextMiddleware } from './common/request-context/request-context.middleware';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { OutboxModule } from './outbox/outbox.module';
import { VersionsModule } from './versioning/versions.module';
import { ProductAreasModule } from './product-areas/product-areas.module';
import { InitiativesModule } from './initiatives/initiatives.module';
import { RaidModule } from './raid/raid.module';
import { MilestonesModule } from './milestones/milestones.module';
import { StatusUpdatesModule } from './status-updates/status-updates.module';
import { LinksModule } from './links/links.module';
import { CommentsModule } from './comments/comments.module';
import { WatchersModule } from './watchers/watchers.module';
import { StakeholdersModule } from './stakeholders/stakeholders.module';
import { ActivityModule } from './activity/activity.module';
import { RoadmapModule } from './roadmap/roadmap.module';

@Module({
  imports: [
    // Structured JSON logs with a correlation id on every line (A5:
    // "structured logs with correlation IDs"). genReqId trusts an inbound
    // x-request-id (service-to-service tracing) and otherwise mints one;
    // RequestContextMiddleware reuses this same id via req.id so
    // application logs and access logs always correlate.
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        autoLogging: { ignore: (req) => req.url === '/health' },
      },
    }),
    ConfigModule,
    PrismaModule,
    OutboxModule,
    VersionsModule,
    // Order matters: AuthGuard (identifies the caller) must run before
    // RbacGuard (authorizes the caller), and AuditModule's interceptor
    // must see the response after both.
    AuthModule,
    RbacModule,
    AuditModule,
    HealthModule,
    UsersModule,
    // Phase 1 — Initiative Workspace + Roadmap (the spine, A8/Prompt 1).
    ProductAreasModule,
    InitiativesModule,
    RaidModule,
    MilestonesModule,
    StatusUpdatesModule,
    LinksModule,
    CommentsModule,
    WatchersModule,
    StakeholdersModule,
    ActivityModule,
    RoadmapModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: ProblemDetailsFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
