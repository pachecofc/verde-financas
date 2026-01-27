import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi, UpdatedUserResponse, ChangePasswordPayload } from '../services/api';
import {
  User, Mail, Lock, Trash2, Crown, X, Eye, EyeOff, Camera, Save, AlertCircle, CheckCircle, Loader2, ArrowLeft, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TwoFactorSetup } from '../components/TwoFactorSetup';
import { TwoFactorModal } from '../components/TwoFactorModal';

const MAX_AVATAR_BYTES = 300 * 1024; // 300 KB

/** URL para exibir avatar: absoluta (Supabase) ou relativa (legado /uploads/...). */
function getAvatarSrc(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
}

type UserPlan = 'BASIC' | 'PREMIUM';

type TabType = 'account' | 'subscription' | 'security';

export const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, updateUserProfile, changePassword, uploadAvatar, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('account');
  
  // Estados do formulário de conta
  const [accountForm, setAccountForm] = useState({
    name: authUser?.name || '',
    email: authUser?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Estados do formulário de assinatura
  const [subscriptionForm, setSubscriptionForm] = useState({
    plan: (authUser?.plan || 'BASIC') as UserPlan,
  });
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<string | null>(null);

  // Estado para exclusão de conta
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Estados para 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState<{
    qrCodeUrl: string;
    secret: string;
    backupCodes: string[];
  } | null>(null);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');

  // Sincronizar formulário com dados do usuário
  useEffect(() => {
    if (authUser) {
      setAccountForm(prev => ({
        ...prev,
        name: authUser.name,
        email: authUser.email,
      }));
      setSubscriptionForm({
        plan: (authUser.plan || 'BASIC') as UserPlan,
      });
    }
  }, [authUser]);

  // Limpar mensagens após 5 segundos
  useEffect(() => {
    if (accountSuccess || accountError) {
      const timer = setTimeout(() => {
        setAccountSuccess(null);
        setAccountError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [accountSuccess, accountError]);

  useEffect(() => {
    if (subscriptionSuccess || subscriptionError) {
      const timer = setTimeout(() => {
        setSubscriptionSuccess(null);
        setSubscriptionError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [subscriptionSuccess, subscriptionError]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountLoading(true);
    setAccountError(null);
    setAccountSuccess(null);

    try {
      // Atualizar nome e email
      const profileDataToUpdate: Partial<UpdatedUserResponse> = {
        name: accountForm.name,
        email: accountForm.email,
      };

      const profileUpdateSuccess = await updateUserProfile(profileDataToUpdate);
      if (!profileUpdateSuccess) {
        throw new Error('Falha ao atualizar informações do perfil.');
      }

      // Se a seção de senha estiver aberta, tentar alterar a senha
      if (showPasswordFields) {
        if (!accountForm.currentPassword || !accountForm.newPassword || !accountForm.confirmPassword) {
          throw new Error('Por favor, preencha todos os campos de senha.');
        }
        if (accountForm.newPassword !== accountForm.confirmPassword) {
          throw new Error('A nova senha e a confirmação não coincidem.');
        }
        if (accountForm.newPassword.length < 6) {
          throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
        }

        const passwordChangeSuccess = await changePassword({
          currentPassword: accountForm.currentPassword,
          newPassword: accountForm.newPassword,
          confirmPassword: accountForm.confirmPassword,
        });

        if (!passwordChangeSuccess) {
          throw new Error('Falha ao alterar senha.');
        }

        // Limpar campos de senha após sucesso
        setAccountForm(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
        setShowPasswordFields(false);
      }

      setAccountSuccess('Perfil atualizado com sucesso!');
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
    } finally {
      setAccountLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setAccountError('Use apenas imagens (JPEG, PNG, GIF ou WebP).');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAccountError('Arquivo muito grande. O limite é 300 KB.');
      return;
    }
    setAccountLoading(true);
    setAccountError(null);
    setAccountSuccess(null);
    try {
      const success = await uploadAvatar(file);
      if (success) {
        setAccountSuccess('Avatar atualizado com sucesso!');
      } else {
        setAccountError('Falha ao fazer upload do avatar.');
      }
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Erro ao fazer upload do avatar.');
    } finally {
      setAccountLoading(false);
    }
    e.target.value = '';
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    setSubscriptionSuccess(null);

    try {
      const profileDataToUpdate: Partial<UpdatedUserResponse> = {
        plan: subscriptionForm.plan,
      };

      const success = await updateUserProfile(profileDataToUpdate);
      if (!success) {
        throw new Error('Falha ao atualizar assinatura.');
      }

      setSubscriptionSuccess('Assinatura atualizada com sucesso!');
    } catch (err) {
      setSubscriptionError(err instanceof Error ? err.message : 'Erro ao atualizar assinatura.');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await authApi.deleteAccount();
      // Logout e redirecionar para login
      await logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir conta.');
      setDeleteLoading(false);
    }
  };

  const displayAvatar = authUser?.avatarUrl || '';

  // Carregar status do 2FA
  useEffect(() => {
    const load2FAStatus = async () => {
      try {
        const status = await authApi.getTwoFactorStatus();
        setTwoFactorEnabled(status.enabled);
      } catch (err) {
        console.error('Erro ao carregar status do 2FA:', err);
      }
    };
    if (authUser) {
      load2FAStatus();
    }
  }, [authUser]);

  // Iniciar setup de 2FA
  const handleSetup2FA = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const setupData = await authApi.setupTwoFactor();
      setTwoFactorSetupData({
        qrCodeUrl: setupData.qrCodeUrl,
        secret: setupData.secret,
        backupCodes: [], // Será preenchido após habilitar
      });
      setShowTwoFactorSetup(true);
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : 'Erro ao configurar 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Verificar código durante setup
  const handleVerify2FASetup = async (code: string): Promise<boolean> => {
    if (!twoFactorSetupData) return false;
    try {
      const result = await authApi.enableTwoFactor(twoFactorSetupData.secret, code);
      setTwoFactorSetupData({
        ...twoFactorSetupData,
        backupCodes: result.backupCodes,
      });
      setTwoFactorEnabled(true);
      return true;
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : 'Erro ao habilitar 2FA');
      return false;
    }
  };

  // Completar setup
  const handleComplete2FASetup = () => {
    setShowTwoFactorSetup(false);
    setTwoFactorSetupData(null);
    setTwoFactorError(null);
  };

  // Desabilitar 2FA
  const handleDisable2FA = async () => {
    if (!disable2FAPassword) {
      setTwoFactorError('Por favor, digite sua senha');
      return;
    }
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      await authApi.disableTwoFactor(disable2FAPassword);
      setTwoFactorEnabled(false);
      setShowDisable2FAModal(false);
      setDisable2FAPassword('');
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : 'Erro ao desabilitar 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Configurações</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('account')}
          className={`px-6 py-3 font-bold transition-colors border-b-2 ${
            activeTab === 'account'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Gerenciar Conta
          </div>
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-6 py-3 font-bold transition-colors border-b-2 ${
            activeTab === 'subscription'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Gerenciar Assinatura
          </div>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-6 py-3 font-bold transition-colors border-b-2 ${
            activeTab === 'security'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Segurança
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8">
        {activeTab === 'account' && (
          <form onSubmit={handleSaveAccount} className="space-y-6">
            {/* Mensagens de feedback */}
            {accountError && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{accountError}</p>
              </div>
            )}
            {accountSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{accountSuccess}</p>
              </div>
            )}

            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-28 h-28 rounded-[2rem] overflow-hidden border-4 border-emerald-50 dark:border-emerald-900/30 shadow-xl relative bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center transition-transform group-hover:scale-105">
                  {displayAvatar ? (
                    <img src={getAvatarSrc(displayAvatar)} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-emerald-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
                    <Camera className="w-6 h-6" />
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome de Exibição
              </label>
              <input
                type="text"
                required
                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold"
                value={accountForm.name}
                onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-mail
              </label>
              <input
                type="email"
                required
                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold"
                value={accountForm.email}
                onChange={e => setAccountForm({ ...accountForm, email: e.target.value })}
              />
            </div>

            {/* Alterar Senha */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
              <button
                type="button"
                onClick={() => setShowPasswordFields(!showPasswordFields)}
                className="w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Alterar Senha
                </div>
                {showPasswordFields ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {showPasswordFields && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Senha Atual</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPasswordFields ? "text" : "password"}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold"
                        value={accountForm.currentPassword}
                        onChange={e => setAccountForm({ ...accountForm, currentPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPasswordFields ? "text" : "password"}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold"
                        value={accountForm.newPassword}
                        onChange={e => setAccountForm({ ...accountForm, newPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Confirmar Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPasswordFields ? "text" : "password"}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold"
                        value={accountForm.confirmPassword}
                        onChange={e => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botão Salvar */}
            <button
              type="submit"
              disabled={accountLoading}
              className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accountLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar Alterações
                </>
              )}
            </button>

            {/* Excluir Conta */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">Zona de Perigo</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Ao excluir sua conta, ela será marcada para exclusão e você perderá o acesso imediatamente. 
                    Seus dados serão mantidos por 30 dias. Se mudar de ideia, faça login para reativar.
                  </p>
                </div>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-3 bg-rose-600 dark:bg-rose-500 hover:bg-rose-700 dark:hover:bg-rose-400 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Excluir Conta
                  </button>
                ) : (
                  <div className="space-y-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                      Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita facilmente.
                    </p>
                    {deleteError && (
                      <div className="bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700 rounded-lg p-3">
                        <p className="text-sm text-rose-700 dark:text-rose-300">{deleteError}</p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading}
                        className="flex-1 px-6 py-3 bg-rose-600 dark:bg-rose-500 hover:bg-rose-700 dark:hover:bg-rose-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {deleteLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-5 h-5" />
                            Sim, Excluir
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteError(null);
                        }}
                        className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        )}

        {activeTab === 'subscription' && (
          <form onSubmit={handleSaveSubscription} className="space-y-6">
            {/* Mensagens de feedback */}
            {subscriptionError && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{subscriptionError}</p>
              </div>
            )}
            {subscriptionSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{subscriptionSuccess}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">Plano Atual</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Escolha o plano que melhor se adequa às suas necessidades.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Plano
                </label>
                <select
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold"
                  value={subscriptionForm.plan}
                  onChange={e => setSubscriptionForm({ plan: e.target.value as UserPlan })}
                >
                  <option value="BASIC">Plano Básico (Gratuito)</option>
                  <option value="PREMIUM">Plano PRO (Premium)</option>
                </select>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Nota:</strong> Para cancelar sua assinatura, altere para o Plano Básico (Gratuito).
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={subscriptionLoading}
              className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {subscriptionLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar Alterações
                </>
              )}
            </button>
          </form>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Mensagens de feedback */}
            {twoFactorError && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{twoFactorError}</p>
              </div>
            )}

            {/* Status do 2FA */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">
                  Autenticação de Dois Fatores (2FA)
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador.
                </p>
              </div>

              {showTwoFactorSetup && twoFactorSetupData ? (
                <TwoFactorSetup
                  qrCodeUrl={twoFactorSetupData.qrCodeUrl}
                  secret={twoFactorSetupData.secret}
                  backupCodes={twoFactorSetupData.backupCodes}
                  onVerify={handleVerify2FASetup}
                  onComplete={handleComplete2FASetup}
                  onCancel={() => {
                    setShowTwoFactorSetup(false);
                    setTwoFactorSetupData(null);
                    setTwoFactorError(null);
                  }}
                />
              ) : twoFactorEnabled ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-100">
                        2FA Habilitado
                      </h4>
                    </div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      Sua conta está protegida com autenticação de dois fatores. Você precisará usar um código do seu aplicativo autenticador sempre que fizer login ou realizar ações sensíveis.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDisable2FAModal(true)}
                    disabled={twoFactorLoading}
                    className="w-full px-6 py-3 bg-rose-600 dark:bg-rose-500 hover:bg-rose-700 dark:hover:bg-rose-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {twoFactorLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Desabilitar 2FA
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSetup2FA}
                  disabled={twoFactorLoading}
                  className="w-full px-6 py-3 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {twoFactorLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Habilitar 2FA
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal para desabilitar 2FA */}
      {showDisable2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Desabilitar 2FA
              </h3>
              <button
                onClick={() => {
                  setShowDisable2FAModal(false);
                  setDisable2FAPassword('');
                  setTwoFactorError(null);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Para desabilitar a autenticação de dois fatores, digite sua senha atual.
            </p>
            {twoFactorError && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
                <p className="text-rose-700 dark:text-rose-300 text-sm">{twoFactorError}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Senha Atual
              </label>
              <input
                type="password"
                value={disable2FAPassword}
                onChange={(e) => {
                  setDisable2FAPassword(e.target.value);
                  setTwoFactorError(null);
                }}
                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDisable2FAModal(false);
                  setDisable2FAPassword('');
                  setTwoFactorError(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={twoFactorLoading || !disable2FAPassword}
                className="flex-1 px-6 py-3 bg-rose-600 dark:bg-rose-500 hover:bg-rose-700 dark:hover:bg-rose-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {twoFactorLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Desabilitando...
                  </>
                ) : (
                  'Desabilitar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
