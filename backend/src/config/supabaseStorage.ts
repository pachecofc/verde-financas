import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuração do Supabase Storage (API S3).
 * Variáveis esperadas no .env (endpoint, região, id da chave, chave):
 * - SUPABASE_ENDPOINT, SUPABASE_REGION, SUPABASE_ACCESS_KEY_ID, SUPABASE_SECRET_ACCESS_KEY
 * Opcional para buckets públicos: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLIC_URL_BASE
 */
const endpoint = process.env.SUPABASE_ENDPOINT;
const region = process.env.SUPABASE_REGION;
const accessKeyId = process.env.SUPABASE_ACCESS_KEY_ID;
const secretAccessKey = process.env.SUPABASE_SECRET_ACCESS_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getProjectUrl(): string {
  const override = process.env.SUPABASE_URL;
  if (override) return override.replace(/\/$/, '');
  if (!endpoint) return '';
  try {
    const u = new URL(endpoint);
    const host = u.hostname.replace(/\.storage\.supabase\.co$/, '.supabase.co');
    return `https://${host}`;
  } catch {
    return '';
  }
}

/**
 * Base URL para objetos públicos.
 * Derivada do endpoint: xxx.storage.supabase.co -> https://xxx.supabase.co/storage/v1/object/public
 * Ou use SUPABASE_PUBLIC_URL_BASE no .env para sobrescrever.
 */
function getPublicUrlBase(): string {
  const override = process.env.SUPABASE_PUBLIC_URL_BASE;
  if (override) return override.replace(/\/$/, '');
  const base = getProjectUrl();
  return base ? `${base}/storage/v1/object/public` : '';
}

export const supabaseStorageConfig = {
  endpoint: endpoint || '',
  region: region || 'us-east-1',
  credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
  forcePathStyle: true,
  publicUrlBase: getPublicUrlBase(),
  projectUrl: getProjectUrl(),
  serviceRoleKey: serviceRoleKey || undefined,
};

export function isSupabaseStorageConfigured(): boolean {
  return !!(endpoint && accessKeyId && secretAccessKey);
}

export function canCreatePublicBuckets(): boolean {
  return !!(supabaseStorageConfig.projectUrl && supabaseStorageConfig.serviceRoleKey);
}
