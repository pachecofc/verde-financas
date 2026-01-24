# Supabase Storage – Avatares

Os avatares dos usuários são armazenados no **Supabase Storage** (API S3).  
Cada usuário possui um **bucket com o mesmo id**; apenas o próprio usuário pode alterar o avatar nesse bucket.

## Variáveis de ambiente (`backend/.env`)

```env
# Supabase Storage (S3) — endpoint, região, id da chave, chave
SUPABASE_ENDPOINT=https://<project_ref>.storage.supabase.co/storage/v1/s3
SUPABASE_REGION=<região_do_projeto>
SUPABASE_ACCESS_KEY_ID=<id_da_chave_de_acesso>
SUPABASE_SECRET_ACCESS_KEY=<chave_de_acesso>

# Opcional: para buckets públicos (evita ícone quebrado na UI)
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
# SUPABASE_URL=https://<project_ref>.supabase.co   # só se a derivação do endpoint falhar
```

- **Endpoint / região / Access Key / Secret:** Configuração S3 do Supabase (Storage → S3 Access Keys).
- **SUPABASE_SERVICE_ROLE_KEY:** Chave **Service Role** do projeto (Settings → API).  
  Se definida, o backend:
  - cria novos buckets como **públicos**;
  - torna **públicos** buckets já existentes (ex.: criados antes só via S3), para a URL pública da imagem funcionar e o avatar deixar de aparecer quebrado.

Opcionalmente, para sobrescrever a URL base dos objetos públicos:

```env
SUPABASE_PUBLIC_URL_BASE=https://<project_ref>.supabase.co/storage/v1/object/public
```

## Regras

- **Formato:** apenas imagens (JPEG, PNG, GIF, WebP).
- **Tamanho:** máximo **300 KB** por arquivo.
- **Bucket:** um bucket por usuário, com nome = `userId`.
- **Acesso:** o usuário só edita o avatar no próprio bucket (controlando via `authMiddleware`).

## Imagem quebrada após o upload

Se o upload retorna sucesso mas o avatar aparece como ícone quebrado:

1. **Configure `SUPABASE_SERVICE_ROLE_KEY`** no `.env` (e, se necessário, `SUPABASE_URL`).
2. **Reinicie o backend** e **envie o avatar de novo**. O backend tornará o bucket **público** e a URL pública passará a carregar.
3. Se ainda falhar, no **Supabase Dashboard → Storage** confira se o bucket do usuário está **público** e se a URL pública do arquivo abre no navegador.

## Avatares antigos (`/uploads/avatars`)

A pasta `backend/uploads/avatars` e a rota estática `/uploads` continuam ativas para **avatares antigos** (URLs como `/uploads/avatars/...` no banco). Novos uploads vão apenas para o Supabase Storage.
