import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

type Tab = 'signin' | 'signup';

interface SignInForm {
  email: string;
  password: string;
}

interface SignUpForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function AuthPage() {
  const { user, loading, signIn, signUp } = useAuthContext();
  const [tab, setTab] = useState<Tab>('signin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const signInForm = useForm<SignInForm>();
  const signUpForm = useForm<SignUpForm>();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSignIn = async (data: SignInForm) => {
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await signIn(data.email, data.password);
    setAuthLoading(false);
    if (error) setAuthError(error);
  };

  const handleSignUp = async (data: SignUpForm) => {
    if (data.password !== data.confirmPassword) {
      signUpForm.setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setAuthLoading(false);
    if (error) {
      setAuthError(error);
    } else {
      setSignUpSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🪙</div>
          <h1 className="text-2xl font-bold text-slate-100">CashMosaic</h1>
          <p className="text-slate-400 mt-1 text-sm">Personal finance dashboard</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-slate-700/40 p-1 rounded-lg">
            {(['signin', 'signup'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setAuthError(null); setSignUpSuccess(false); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  tab === t
                    ? 'bg-slate-600 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Error */}
          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {authError}
            </div>
          )}

          {/* Sign up success */}
          {signUpSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
              Account created! Check your email to confirm, then sign in.
            </div>
          )}

          {/* Sign In Form */}
          {tab === 'signin' && (
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  {...signInForm.register('email', { required: 'Email is required' })}
                  type="email"
                  placeholder="you@example.com"
                  className="input"
                  autoComplete="email"
                />
                {signInForm.formState.errors.email && (
                  <p className="text-xs text-red-400 mt-1">{signInForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  {...signInForm.register('password', { required: 'Password is required' })}
                  type="password"
                  placeholder="••••••••"
                  className="input"
                  autoComplete="current-password"
                />
                {signInForm.formState.errors.password && (
                  <p className="text-xs text-red-400 mt-1">{signInForm.formState.errors.password.message}</p>
                )}
              </div>
              <button type="submit" disabled={authLoading} className="btn-primary w-full mt-2">
                {authLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" /> Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          )}

          {/* Sign Up Form */}
          {tab === 'signup' && (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  {...signUpForm.register('fullName', { required: 'Full name is required' })}
                  type="text"
                  placeholder="Jane Smith"
                  className="input"
                  autoComplete="name"
                />
                {signUpForm.formState.errors.fullName && (
                  <p className="text-xs text-red-400 mt-1">{signUpForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  {...signUpForm.register('email', { required: 'Email is required' })}
                  type="email"
                  placeholder="you@example.com"
                  className="input"
                  autoComplete="email"
                />
                {signUpForm.formState.errors.email && (
                  <p className="text-xs text-red-400 mt-1">{signUpForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  {...signUpForm.register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                  type="password"
                  placeholder="••••••••"
                  className="input"
                  autoComplete="new-password"
                />
                {signUpForm.formState.errors.password && (
                  <p className="text-xs text-red-400 mt-1">{signUpForm.formState.errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  {...signUpForm.register('confirmPassword', { required: 'Please confirm your password' })}
                  type="password"
                  placeholder="••••••••"
                  className="input"
                  autoComplete="new-password"
                />
                {signUpForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">{signUpForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <button type="submit" disabled={authLoading} className="btn-primary w-full mt-2">
                {authLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" /> Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
