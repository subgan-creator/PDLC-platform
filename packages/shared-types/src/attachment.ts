import type { AttachmentId, Classified, TenantScoped, Timestamped, UserId } from './common';

export interface Attachment extends Timestamped, TenantScoped, Classified {
  id: AttachmentId;
  /** Polymorphic owner — the entity this file is attached to. */
  ownerType: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Object storage key (S3-compatible); never expose a raw bucket URL to the client. */
  storageKey: string;
  checksumSha256: string;
  uploadedBy: UserId;
  virusScanStatus: 'pending' | 'clean' | 'infected' | 'error';
}
