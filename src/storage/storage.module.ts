import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Not @Global(): only feature modules that actually handle files (the
 * future resources/PDF module) should import this. Registered in
 * AppModule for Phase 0A so the provider selection logic is constructed
 * and validated once at boot, catching a bad STORAGE_* config immediately
 * rather than the first time a future endpoint tries to use it.
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
