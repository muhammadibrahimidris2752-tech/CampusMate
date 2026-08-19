import { IStorageProvider, UploadUrlResult } from '../storage-provider.interface';

/**
 * Used when STORAGE_PROVIDER=none (the Phase 0A default — see .env.example).
 *
 * Fails loudly rather than silently. Nothing in Phase 0A calls this, since
 * no upload/download endpoints exist yet; it exists so that if a future
 * change accidentally calls StorageService before real credentials are
 * configured, the failure is an immediate, clear error instead of a silent
 * no-op or — worse — an insecure fallback.
 *
 * None of the four methods below use `await` — there's no asynchronous
 * work to do, only a synchronous decision to reject. They still return
 * `Promise.reject(...)` rather than throwing directly, so a caller that
 * uses `.catch()`-style promise chaining (not just `await` inside
 * try/catch) still gets a rejected promise, matching every other
 * IStorageProvider implementation and the interface's Promise-returning
 * contract. Marking them `async` with nothing to await would have been
 * the wrong fix for that — this gets the same behavior without it.
 */
export class NullStorageProvider implements IStorageProvider {
  private buildError(): Error {
    return new Error(
      'Object storage is not configured (STORAGE_PROVIDER=none). ' +
        'Set STORAGE_PROVIDER=s3 and the STORAGE_* credentials in your environment to enable it.',
    );
  }

  generateUploadUrl(): Promise<UploadUrlResult> {
    return Promise.reject(this.buildError());
  }

  generateDownloadUrl(): Promise<string> {
    return Promise.reject(this.buildError());
  }

  deleteObject(): Promise<void> {
    return Promise.reject(this.buildError());
  }

  objectExists(): Promise<boolean> {
    return Promise.reject(this.buildError());
  }
}
