import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsRepository } from './permissions.repository';
import { RbacGuard } from './rbac.guard';

@Module({
  providers: [PermissionsRepository, { provide: APP_GUARD, useClass: RbacGuard }],
  exports: [PermissionsRepository],
})
export class RbacModule {}
