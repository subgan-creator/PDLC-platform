import { Global, Module } from '@nestjs/common';
import { VersionsService } from './versions.service';

@Global()
@Module({
  providers: [VersionsService],
  exports: [VersionsService],
})
export class VersionsModule {}
