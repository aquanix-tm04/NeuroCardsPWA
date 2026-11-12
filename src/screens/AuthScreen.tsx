import { useState } from 'react';
import { Brain, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, CloudOff, Cloud } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

type Mode = 'signin' | 'signup' | 'reset';

export function AuthScreen() {
  const { t } = useApp();
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!email.trim() || !password.trim()) {
      setError(t('email') + ' & ' + t('password'));
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) setError(error);
      } else if (mode === 'signup') {
        const { error } = await signUp(email.trim(), password);
        if (error) setError(error);
        else setSuccess(t('signUpSuccess'));
      } else {
        const { error } = await resetPassword(email.trim());
        if (error) setError(error);
        else setSuccess(t('resetPasswordInstructions'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
            <Brain size={32} />
          </div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{t('appName')}</h1>
          <p className="text-sm text-ink-400 dark:text-ink-500">
            {mode === 'signin' ? t('signIn') : mode === 'signup' ? t('signUp') : t('resetPassword')}
          </p>
        </div>

        {mode !== 'reset' && (
          <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
            <Cloud size={18} className="shrink-0" />
            <span>{t('privacyNotice')}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Mail size={18} className="pointer-events-none absolute top-1/2 start-3.5 -translate-y-1/2 text-ink-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email')}
              className="field-input ps-11"
              autoComplete="email"
              dir="ltr"
            />
          </div>

          {mode !== 'reset' && (
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute top-1/2 start-3.5 -translate-y-1/2 text-ink-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password')}
                className="field-input ps-11 pe-11"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                dir="ltr"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={() => setShowPassword((s) => !s)}
                className="absolute top-1/2 end-3.5 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                aria-label={showPassword ? 'Hide' : 'Show'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="primary-btn w-full text-base"
          >
            {loading ? '…' : mode === 'signin' ? t('signIn') : mode === 'signup' ? t('signUp') : t('resetPassword')}
          </button>
        </div>

        <div className="space-y-2 text-center text-sm">
          {mode === 'signin' && (
            <>
              <button onClick={() => { setMode('reset'); setError(''); setSuccess(''); }} className="text-brand-600 hover:underline dark:text-brand-400">
                {t('forgotPassword')}
              </button>
              <p className="text-ink-400 dark:text-ink-500">
                {t('noAccount')}{' '}
                <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                  {t('signUp')}
                </button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p className="text-ink-400 dark:text-ink-500">
              {t('haveAccount')}{' '}
              <button onClick={() => { setMode('signin'); setError(''); setSuccess(''); }} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                {t('signIn')}
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <button onClick={() => { setMode('signin'); setError(''); setSuccess(''); }} className="text-brand-600 hover:underline dark:text-brand-400">
              {t('signIn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
