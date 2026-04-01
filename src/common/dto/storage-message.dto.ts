export class StorageMessage {
  entityType: string;
  entityId: string;
  accountId: string;
  path: string;
  attachmentId: string;
  fileName: string;
  mimeType?: string;
  size?: number;
  publicUrl?: string;
}
