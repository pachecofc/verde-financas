# RLS (Row Level Security) e app_role

O backend define `app.current_user_id` na sessão PostgreSQL em todas as requisições autenticadas (via `authMiddleware`), para que as políticas RLS restrinjam os dados ao usuário logado.

## Conexão com o banco

- Use a **conexão direta** (porta 5432) com `app_user` na `DATABASE_URL`, não o pooler em modo transação (PgBouncer), para que `set_config` seja mantido na sessão.
- Use **`connection_limit=1`** na URL para que a mesma conexão seja usada em todo o request e o RLS funcione corretamente.  
  Ex.: `postgresql://app_user:SENHA@db.xxx.supabase.co:5432/postgres?connection_limit=1`

[
  {
    "schemaname": "public",
    "tablename": "accounts",
    "policyname": "accounts_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "asset_holdings",
    "policyname": "asset_holdings_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "assets",
    "policyname": "assets_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "policyname": "audit_logs_insert_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((( SELECT current_setting('app.current_user_id'::text, true) AS current_setting) IS NULL) OR (\"actorId\" = ( SELECT current_setting('app.current_user_id'::text, true) AS current_setting)))"
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "policyname": "audit_logs_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "SELECT",
    "qual": "(\"actorId\" = ( SELECT current_setting('app.current_user_id'::text, true) AS current_setting))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "budgets",
    "policyname": "budgets_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "categories",
    "policyname": "categories_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "goals",
    "policyname": "goals_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "refresh_tokens",
    "policyname": "refresh_tokens_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "schedules",
    "policyname": "schedules_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "transactions",
    "policyname": "transactions_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_achievements",
    "policyname": "user_achievements_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_score_events",
    "policyname": "user_score_events_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_scores",
    "policyname": "user_scores_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "(\"userId\" = current_setting('app.current_user_id'::text, true))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "users_policy",
    "permissive": "PERMISSIVE",
    "roles": "{app_role}",
    "cmd": "ALL",
    "qual": "((( SELECT current_setting('app.current_user_id'::text, true) AS current_setting) IS NULL) OR (id = ( SELECT current_setting('app.current_user_id'::text, true) AS current_setting)))",
    "with_check": "((( SELECT current_setting('app.current_user_id'::text, true) AS current_setting) IS NULL) OR (id = ( SELECT current_setting('app.current_user_id'::text, true) AS current_setting)))"
  }
]
