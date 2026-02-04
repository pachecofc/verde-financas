import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertCircle, Loader2, Copy, Eye, EyeOff, Download } from 'lucide-react';

interface TwoFactorSetupProps {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
  onVerify: (code: string) => Promise<boolean>;
  onComplete: () => void;
  onCancel: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  qrCodeUrl,
  secret,
  backupCodes,
  onVerify,
  onComplete,
  onCancel,
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (verificationCode.length !== 6) {
      setError('O código deve ter 6 dígitos');
      return;
    }

    setIsVerifying(true);
    try {
      const success = await onVerify(verificationCode);
      if (success) {
        setIsVerified(true);
      } else {
        setError('Código inválido. Tente novamente.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar código');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string, codeId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(codeId);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const downloadBackupCodes = () => {
    const content = `Códigos de Backup - Autenticação de Dois Fatores\n\n` +
      `IMPORTANTE: Guarde estes códigos em local seguro. Eles podem ser usados para acessar sua conta se você perder acesso ao seu aplicativo autenticador.\n\n` +
      backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n') +
      `\n\nGerado em: ${new Date().toLocaleString('pt-BR')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isVerified) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-100">
              2FA Habilitado com Sucesso!
            </h3>
          </div>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-4">
            Sua autenticação de dois fatores foi configurada com sucesso. Agora você precisará usar um código do seu aplicativo autenticador sempre que fizer login ou realizar ações sensíveis.
          </p>
        </div>

        {/* Backup Codes */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg font-black text-amber-900 dark:text-amber-100">
                Códigos de Backup
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBackupCodes(!showBackupCodes)}
                className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
              >
                {showBackupCodes ? (
                  <EyeOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
              </button>
              <button
                onClick={downloadBackupCodes}
                className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
                title="Baixar códigos"
              >
                <Download className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </button>
            </div>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
            <strong>IMPORTANTE:</strong> Guarde estes códigos em local seguro. Eles podem ser usados para acessar sua conta se você perder acesso ao seu aplicativo autenticador. Cada código só pode ser usado uma vez.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800"
              >
                <code className="font-mono font-bold text-amber-900 dark:text-amber-100">
                  {showBackupCodes ? code : '••••••••'}
                </code>
                <button
                  onClick={() => copyToClipboard(code, `backup-${index}`)}
                  className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded transition-colors"
                  title="Copiar código"
                >
                  {copiedCode === `backup-${index}` ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onComplete}
          className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98]"
        >
          Concluir Configuração
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <h3 className="text-lg font-black text-blue-900 dark:text-blue-100 mb-3">
          Como Configurar
        </h3>
        <ol className="space-y-2 text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside">
          <li>Abra seu aplicativo autenticador (Google Authenticator, Microsoft Authenticator, etc.)</li>
          <li>Escaneie o QR code abaixo ou digite o código manualmente</li>
          <li>Digite o código de 6 dígitos gerado pelo aplicativo para verificar</li>
        </ol>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center space-y-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
          <img src={qrCodeUrl} alt="QR Code para 2FA" className="w-64 h-64" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Ou digite este código manualmente:
          </p>
          <div className="flex items-center gap-2 justify-center">
            <code className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100">
              {secret}
            </code>
            <button
              onClick={() => copyToClipboard(secret, 'secret')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Copiar código"
            >
              {copiedCode === 'secret' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <Copy className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Verification Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="twofactor-verify-code" className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Código de Verificação
          </label>
          <input
            id="twofactor-verify-code"
            name="verificationCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(value);
              setError(null);
            }}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all dark:text-slate-100 font-bold text-center text-2xl tracking-widest"
            placeholder="000000"
            autoComplete="one-time-code"
            autoFocus
            disabled={isVerifying}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Digite o código de 6 dígitos do seu aplicativo autenticador
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isVerifying}
            className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isVerifying || verificationCode.length !== 6}
            className="flex-1 px-6 py-3 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar e Habilitar'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
