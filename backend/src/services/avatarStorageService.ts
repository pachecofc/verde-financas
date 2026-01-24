import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  supabaseStorageConfig,
  isSupabaseStorageConfigured,
  canCreatePublicBuckets,
} from '../config/supabaseStorage';

const AVATAR_KEY = 'avatar';
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: supabaseStorageConfig.endpoint,
    region: supabaseStorageConfig.region,
    credentials: supabaseStorageConfig.credentials,
    forcePathStyle: supabaseStorageConfig.forcePathStyle,
  });
}

function getSupabaseAdmin(): SupabaseClient | null {
  if (!canCreatePublicBuckets()) return null;
  return createClient(
    supabaseStorageConfig.projectUrl,
    supabaseStorageConfig.serviceRoleKey!,
    { auth: { persistSession: false } }
  );
}

/**
 * Garante que o bucket do usuário existe e é público.
 * O bucket tem o mesmo id do usuário.
 */
async function ensureBucket(client: S3Client, bucketName: string): Promise<void> {
  const admin = getSupabaseAdmin();
  let exists = false;

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    exists = true;
  } catch (err: unknown) {
    const code = (err as { name?: string })?.name;
    if (code !== 'NotFound' && code !== 'NoSuchBucket') throw err;

    if (admin) {
      const { error } = await admin.storage.createBucket(bucketName, { public: true });
      if (error) {
        if (error.message?.toLowerCase().includes('already exists')) return;
        throw new Error(`Falha ao criar bucket público: ${error.message}`);
      }
      return;
    }

    try {
      await client.send(new CreateBucketCommand({ Bucket: bucketName }));
    } catch (createErr: unknown) {
      const createCode = (createErr as { name?: string })?.name;
      if (createCode === 'BucketAlreadyExists' || createCode === 'BucketAlreadyOwnedByYou') return;
      throw createErr;
    }
  }

  if (exists && admin) {
    const { error } = await admin.storage.updateBucket(bucketName, { public: true });
    if (error) {
      console.warn(`[avatar] Não foi possível tornar o bucket ${bucketName} público:`, error.message);
    }
  }
}

/**
 * Remove objetos antigos com prefixo "avatar" no bucket (ex.: avatar.png, avatar.jpg)
 * para manter apenas um avatar por usuário.
 */
async function removeOldAvatars(client: S3Client, bucketName: string): Promise<void> {
  const list = await client.send(
    new ListObjectsV2Command({ Bucket: bucketName, Prefix: AVATAR_KEY })
  );
  const keys = (list.Contents ?? [])
    .map((o) => o.Key)
    .filter((k): k is string => !!k);
  if (keys.length === 0) return;
  await client.send(
    new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    })
  );
}

/**
 * Faz upload do avatar para o Supabase Storage.
 * - Bucket = userId (um bucket por usuário).
 * - Apenas imagens (jpeg, png, gif, webp), máx 300 KB (validado no middleware).
 * - Retorna a URL pública do objeto.
 *
 * Requer buckets públicos no Supabase para que a URL pública funcione.
 * Se os buckets forem criados via S3 como privados, configure-os como
 * públicos no Dashboard do Supabase ou via API REST.
 */
export async function uploadAvatarToSupabase(
  userId: string,
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  if (!isSupabaseStorageConfigured()) {
    throw new Error('Supabase Storage não está configurado. Verifique as variáveis de ambiente.');
  }
  const normalized = mimetype.toLowerCase().split(';')[0].trim();
  if (!ALLOWED_MIMETYPES.includes(normalized)) {
    throw new Error('Tipo de arquivo não permitido. Use apenas imagens (JPEG, PNG, GIF ou WebP).');
  }
  const ext = EXT_BY_MIME[normalized] ?? '.jpg';
  const key = `${AVATAR_KEY}${ext}`;
  const bucketName = userId;
  const client = getS3Client();

  await ensureBucket(client, bucketName);
  await removeOldAvatars(client, bucketName);

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  const base = supabaseStorageConfig.publicUrlBase;
  if (!base) {
    throw new Error('Não foi possível determinar a URL pública do Supabase Storage.');
  }
  return `${base}/${bucketName}/${key}`;
}
