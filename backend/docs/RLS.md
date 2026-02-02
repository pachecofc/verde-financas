# RLS (Row Level Security) e app_role

O backend define `app.current_user_id` na sessão PostgreSQL em todas as requisições autenticadas (via `authMiddleware`), para que as políticas RLS restrinjam os dados ao usuário logado.

## Conexão com o banco

- Use a **conexão direta** (porta 5432) com `app_user` na `DATABASE_URL`, não o pooler em modo transação (PgBouncer), para que `set_config` seja mantido na sessão.
- Use **`connection_limit=1`** na URL para que a mesma conexão seja usada em todo o request e o RLS funcione corretamente.  
  Ex.: `postgresql://app_user:SENHA@db.xxx.supabase.co:5432/postgres?connection_limit=1`

## Política na tabela `users` (login/signup)

As rotas de **login**, **signup**, **refresh token**, **forgot password** e **reset password** não passam pelo `authMiddleware`, então `app.current_user_id` **não** é definido nesses requests.  
Se a política em `users` permitir apenas `id::text = current_setting('app.current_user_id', true)`, nenhuma linha será visível quando o setting for NULL e o login/signup quebram.

É necessário permitir **SELECT** quando o setting for NULL (para o app encontrar o usuário por e-mail no login/signup). Exemplo de política em `users`:

```sql
-- Remover a política antiga se existir
DROP POLICY IF EXISTS users_policy ON users;

-- Política que permite:
-- 1) SELECT quando app.current_user_id não está setado (login, signup, refresh)
-- 2) Todas as operações apenas no próprio registro quando app.current_user_id está setado
CREATE POLICY users_policy ON users
    FOR ALL
    TO app_role
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR id::text = current_setting('app.current_user_id', true)
    )
    WITH CHECK (
        current_setting('app.current_user_id', true) IS NULL
        OR id::text = current_setting('app.current_user_id', true)
    );
```

- **USING:** controla quais linhas podem ser lidas/alteradas/deletadas.
- **WITH CHECK:** controla quais linhas podem ser inseridas ou para quais valores as atualizações são permitidas.

Com isso, requisições **não autenticadas** (login, signup, etc.) conseguem fazer SELECT em `users` para buscar por e-mail; requisições **autenticadas** só acessam a linha do próprio usuário.
