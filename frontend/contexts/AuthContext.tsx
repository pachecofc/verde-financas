import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, AuthUser, LoginPayload, SignupPayload, ForgotPasswordPayload, ResetPasswordPayload, UpdatedUserResponse, ChangePasswordPayload } from '../services/api';

// Estender AuthUser para incluir avatarUrl e plan
export interface ExtendedAuthUser extends AuthUser {
  avatarUrl?: string;
  plan?: 'BASIC' | 'PREMIUM';
}

interface AuthContextType {
  user: ExtendedAuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginPayload) => Promise<boolean>;
  signup: (data: SignupPayload) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  requestPasswordReset: (data: ForgotPasswordPayload) => Promise<boolean>;
  resetPassword: (data: ResetPasswordPayload) => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<boolean>;
  updateUserProfile: (data: Partial<UpdatedUserResponse>) => Promise<boolean>;
  changePassword: (data: ChangePasswordPayload) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedAuthUser | null>(() => {
    // Recupera usuário do localStorage ao inicializar (será validado via refresh)
    return authApi.getStoredUser() as ExtendedAuthUser | null; // Cast para ExtendedAuthUser
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verifica se está autenticado
  const isAuthenticated = !!user && authApi.isAuthenticated();

  // Login
  const login = useCallback(async (data: LoginPayload): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(data);
      // O response.user do authApi.login pode não ter 'plan' ou 'avatarUrl' se o backend não retornar
      // Mas o AuthUser do api.ts já foi atualizado para incluir esses campos como opcionais
      // O setAuth e setUser devem lidar com isso
      authApi.setAuth(response.token, response.user);
      setUser(response.user as ExtendedAuthUser); // Cast para ExtendedAuthUser 
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Signup (registro)
  const signup = useCallback(async (data: SignupPayload): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.signup(data);
      authApi.setAuth(response.token, response.user);
      setUser(response.user as ExtendedAuthUser); // Cast para ExtendedAuthUser
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Mesmo em caso de erro no backend, limpar estado local
    } finally {
      authApi.clearAuth();
      setUser(null);
      setError(null);
    }
  }, []);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Solicitar redefinição de senha
  const requestPasswordReset = useCallback(async (data: ForgotPasswordPayload): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.requestPasswordReset(data);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao solicitar redefinição de senha';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Redefinir senha
  const resetPassword = useCallback(async (data: ResetPasswordPayload): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(data);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao redefinir senha';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadAvatar = useCallback(async (file: File): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.uploadAvatar(file);
      if (user) {
        const updatedUser = { ...user, avatarUrl: response.avatarUrl };
        authApi.setAuth(authApi.getToken()!, updatedUser); // Atualiza localStorage
        setUser(updatedUser); // Atualiza estado local
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer upload do avatar';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateUserProfile = useCallback(async (data: Partial<UpdatedUserResponse>): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.updateProfile(data);
      if (user) {
        // O response.user já virá com o 'plan' em maiúsculas do backend
        const updatedUser = { ...user, ...response.user };
        authApi.setAuth(authApi.getToken()!, updatedUser); // Atualiza localStorage
        setUser(updatedUser); // Atualiza estado local
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar perfil';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Alterar senha
  const changePassword = useCallback(async (data: ChangePasswordPayload): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.changePassword(data);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao alterar senha';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verifica sessão ao carregar tentando renovar via refresh token (cookie HttpOnly)
  useEffect(() => {
    const bootstrap = async () => {
      const storedUser = authApi.getStoredUser();
      try {
        // Tentativa de renovar access token se houver refresh token válido
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
          .then(async res => {
            if (!res.ok) throw new Error('Falha ao renovar sessão');
            const data = await res.json();
            authApi.setAuth(data.token, data.user || storedUser || null as any);
            setUser((data.user || storedUser) as ExtendedAuthUser | null);
          })
          .catch(() => {
            authApi.clearAuth();
            setUser(null);
          });
      } catch {
        authApi.clearAuth();
        setUser(null);
      }
    };
    bootstrap();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      error,
      login,
      signup,
      logout,
      clearError,
      requestPasswordReset,
      resetPassword,
      uploadAvatar,
      updateUserProfile,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
