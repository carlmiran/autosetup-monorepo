export interface Env {
  DB: D1Database;
  CONNECTOR_UPLOADS: R2Bucket;
  SYNC_QUEUE: Queue<SyncQueueMessage>;

  RESEND_API_KEY?: string;
  ALERT_EMAIL_TO?: string;
  ALERT_EMAIL_FROM?: string;

  // URL interna opcional para disparar a regeneração do diagnóstico
  // LENS após uma sincronização bem-sucedida. Deixe sem configurar se
  // ainda não existir esse endpoint.
  LENS_REFRESH_URL?: string;
}

export interface SyncQueueMessage {
  connector_id: string;
  property_id: string;
  r2_key: string;
  filename: string;
}
