# Criptografia "Zero Knowledge" (Etapa 3)

A aplicação criptografa **apenas campos de texto** sensíveis na camada de aplicação. Valores numéricos e IDs permanecem em texto claro para permitir consultas, agregações e relatórios no banco.

## Configuração da chave mestra

- **Desenvolvimento / staging:** defina `ENCRYPTION_MASTER_KEY` no `.env` (base64 ou hex, mínimo 32 bytes).
- **Produção:** use o **Supabase Vault** (ou outro secrets manager) para armazenar a chave e injetar em `ENCRYPTION_MASTER_KEY` no ambiente da aplicação. Nunca commite a chave no repositório.

Exemplo para gerar uma chave:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Modelo de criptografia

- **Chave por usuário:** a chave mestra é derivada por usuário com HKDF (`userId` como salt). Vazamento de uma chave derivada não expõe dados de outros usuários.
- **Algoritmo:** AES-256-GCM. Valores armazenados no formato `enc:` + base64(iv + ciphertext + authTag).
- **Opção A:** ciphertext é gravado nas **mesmas colunas** existentes; valores sem prefixo `enc:` são tratados como texto claro (compatibilidade com dados já existentes).

## Campos criptografados

| Entidade      | Campos (texto)                    |
|---------------|-----------------------------------|
| User          | `name`                            |
| User (2FA)    | `twoFactorSecret`                 |
| Account       | `name`, `bankName`                |
| Category      | `name`                            |
| Transaction   | `description`                     |
| Goal          | `name`                            |
| Schedule      | `description`                     |
| Asset         | `name`                            |

Valores monetários, datas, IDs e enums **não** são criptografados.

## Serviço

O `encryptionService` (`src/services/encryptionService.ts`) exporta:

- `encrypt(userId, plaintext)` — retorna `enc:` + base64 ou o valor original se null/undefined/vazio.
- `decrypt(userId, ciphertext)` — se não começar com `enc:`, retorna o valor como está (texto claro legado).

Todos os serviços de domínio e o `ReportService` usam essas funções ao persistir e ao devolver dados à API.
