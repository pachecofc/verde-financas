-- ============================================
-- REMOVER POLÍTICAS CRIADAS
-- ============================================
DROP policy IF EXISTS audit_logs_select_policy ON audit_logs;
DROP policy IF EXISTS audit_logs_insert_policy ON audit_logs;
DROP policy IF EXISTS users_policy ON users;
DROP policy IF EXISTS accounts_policy ON accounts;
DROP policy IF EXISTS transactions_policy ON transactions;
DROP policy IF EXISTS categories_policy ON categories;
DROP policy IF EXISTS budgets_policy ON budgets;
DROP policy IF EXISTS schedules_policy ON schedules;
DROP policy IF EXISTS assets_policy ON assets;
DROP policy IF EXISTS asset_holdings_policy ON asset_holdings;
DROP policy IF EXISTS goals_policy ON goals;
DROP policy IF EXISTS user_scores_policy ON user_scores;
DROP policy IF EXISTS user_achievements_policy ON user_achievements;
DROP policy IF EXISTS user_score_events_policy ON user_score_events;
DROP policy IF EXISTS refresh_tokens_policy ON refresh_tokens;

-- ============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CRIAR POLÍTICAS DE SEGURANÇA
-- ============================================

-- 2. Tabela: users
-- Política que permite:
-- 1) SELECT quando app.current_user_id não está setado (login, signup, refresh)
-- 2) Todas as operações apenas no próprio registro quando app.current_user_id está setado
CREATE POLICY users_policy ON users
    FOR ALL
    TO app_role
    USING (
        (SELECT current_setting('app.current_user_id', true)) IS NULL OR "id"::text = (SELECT current_setting('app.current_user_id', true))
    )
    WITH CHECK (
        (SELECT current_setting('app.current_user_id', true)) IS NULL OR "id"::text = (SELECT current_setting('app.current_user_id', true))
    );

-- 3. Tabela: accounts
CREATE POLICY accounts_policy ON accounts
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- 4. Tabela: transactions
CREATE POLICY transactions_policy ON transactions
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- 5. Tabela: categories
CREATE POLICY categories_policy ON categories
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- 6. Tabela: budgets
CREATE POLICY budgets_policy ON budgets
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- 7. Tabela: schedules
CREATE POLICY schedules_policy ON schedules
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- 8. Tabela: assets
CREATE POLICY assets_policy ON assets
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- 9. Tabela: asset_holdings
CREATE POLICY asset_holdings_policy ON asset_holdings
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- 10. Tabela: goals
CREATE POLICY goals_policy ON goals
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- 11. Tabela: user_scores
CREATE POLICY user_scores_policy ON user_scores
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- 12. Tabela: user_achievements
CREATE POLICY user_achievements_policy ON user_achievements
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- 13. Tabela: user_score_events
CREATE POLICY user_score_events_policy ON user_score_events
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- 14. Tabela: refresh_tokens
CREATE POLICY refresh_tokens_policy ON refresh_tokens
    FOR ALL
    TO app_role
    USING ("userId"::text = current_setting('app.current_user_id', true));

-- ============================================
-- POLÍTICA ESPECIAL: audit_logs
-- ============================================
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
  FOR INSERT
  TO app_role
  WITH CHECK (
    (SELECT current_setting('app.current_user_id', true)) IS NULL
    OR "actorId"::text = (SELECT current_setting('app.current_user_id', true))
  );

CREATE POLICY audit_logs_select_policy ON audit_logs
    FOR SELECT
    TO app_role
    USING ("actorId"::text = (SELECT current_setting('app.current_user_id', true)));

-- ============================================
-- VERIFICAR POLÍTICAS CRIADAS
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;