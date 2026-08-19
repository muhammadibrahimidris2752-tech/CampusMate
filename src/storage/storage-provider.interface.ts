export interface UploadUrlResult {
  uploadUrl: string;
  key: string;
  expiresAt: Date;
}

/**
 * The boundary future resource/PDF features build on (Step 13).
 *
 * Deliberately presigned-URL-only, in both directions:
 *  - The backend never proxies file bytes through itself, and never
 *    stores binaries in Postgres.
 *  - The backend never mints a permanent public URL either — every link
 *    is temporary and generated on demand, after the caller's permission
 *    to read/write that specific object has already been checked. That
 *    permission check is a later phase's job (it needs auth/RBAC); this
 *    interface only defines how a URL gets minted once that check passes.
 */
export interface IStorageProvider {
  generateUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<UploadUrlResult>;

  generateDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;

  deleteObject(key: string): Promise<void>;

  objectExists(key: string): Promise<boolean>;
}
