import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Check,
  Coins,
  Copy,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { PIRATE_AVATARS, COIN_ASSET_URL } from '../game/cards';
import {
  ActiveIdentity,
  PlayerAccountProfile,
  validatePassword,
  validateRegistrationInput,
  validateUsername,
} from '../game/auth';
import { Language } from '../game/types';

export type AccountModalTab = 'login' | 'register' | 'recovery' | 'profile';

interface AccountModalProps {
  isOpen: boolean;
  fullScreenGate?: boolean;
  initialTab?: AccountModalTab;
  language: Language;
  onToggleLanguage: () => void;
  identity: ActiveIdentity;
  authToken: string | null;
  onAuthSuccess: (profile: PlayerAccountProfile, token: string, rememberMe: boolean) => void;
  onContinueAsGuest: () => void;
  onLogout: () => void;
  onProfileUpdated: (profile: PlayerAccountProfile) => void;
  onClose?: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  fullScreenGate = false,
  initialTab = 'login',
  language,
  onToggleLanguage,
  identity,
  authToken,
  onAuthSuccess,
  onContinueAsGuest,
  onLogout,
  onProfileUpdated,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<AccountModalTab>(initialTab);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regAvatar, setRegAvatar] = useState(PIRATE_AVATARS[0].emoji);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRecoveryPhrase, setRegRecoveryPhrase] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot Password / Recovery state
  const [recUsername, setRecUsername] = useState('');
  const [recStep, setRecStep] = useState<'check' | 'reset'>('check');
  const [recPhrase, setRecPhrase] = useState('');
  const [recNewPassword, setRecNewPassword] = useState('');
  const [recConfirmPassword, setRecConfirmPassword] = useState('');

  // Profile update state
  const [newRecoveryPhrase, setNewRecoveryPhrase] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const lang = language;

  const switchTab = (tab: AccountModalTab) => {
    setActiveTab(tab);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (tab === 'recovery') {
      setRecStep('check');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const uVal = validateUsername(loginUsername);
    if (!uVal.valid) {
      setErrorMsg(lang === 'bn' ? uVal.errorBn! : uVal.errorEn!);
      return;
    }
    const pVal = validatePassword(loginPassword);
    if (!pVal.valid) {
      setErrorMsg(lang === 'bn' ? pVal.errorBn! : pVal.errorEn!);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
          rememberMe,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(
          lang === 'bn'
            ? data.errorBn || 'লগইন ব্যর্থ হয়েছে।'
            : data.errorEn || 'Login failed.'
        );
        return;
      }
      setLoginPassword('');
      onAuthSuccess(data.profile, data.token, rememberMe);
    } catch {
      setErrorMsg(
        lang === 'bn'
          ? 'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।'
          : 'Could not connect to authentication server.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const val = validateRegistrationInput(
      regUsername,
      regPassword,
      regConfirmPassword,
      regRecoveryPhrase
    );
    if (!val.valid) {
      setErrorMsg(lang === 'bn' ? val.errorBn! : val.errorEn!);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(),
          password: regPassword,
          confirmPassword: regConfirmPassword,
          avatar: regAvatar,
          recoveryPhrase: regRecoveryPhrase.trim() || undefined,
          rememberMe,
          migrateGuestStats: identity.isGuest
            ? {
                wins: identity.wins,
                losses: identity.losses,
                coins: identity.coins,
                xp: identity.xp,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(
          lang === 'bn'
            ? data.errorBn || 'নিবন্ধন ব্যর্থ হয়েছে।'
            : data.errorEn || 'Registration failed.'
        );
        return;
      }
      setRegPassword('');
      setRegConfirmPassword('');
      setRegRecoveryPhrase('');
      onAuthSuccess(data.profile, data.token, rememberMe);
    } catch {
      setErrorMsg(
        lang === 'bn'
          ? 'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।'
          : 'Could not connect to authentication server.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const uVal = validateUsername(recUsername);
    if (!uVal.valid) {
      setErrorMsg(lang === 'bn' ? uVal.errorBn! : uVal.errorEn!);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/recovery-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: recUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(
          lang === 'bn'
            ? data.errorBn || 'অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।'
            : data.errorEn || 'Account not found.'
        );
        return;
      }
      if (!data.hasRecovery) {
        setErrorMsg(
          lang === 'bn'
            ? 'এই অ্যাকাউন্টে কোনো যাচাইকৃত পুনরুদ্ধার কোড (Recovery Passphrase) কনফিগার করা নেই।'
            : 'No verified recovery passphrase is configured for this account.'
        );
        return;
      }
      setRecStep('reset');
      setSuccessMsg(
        lang === 'bn'
          ? 'পুনরুদ্ধার পদ্ধতি পাওয়া গেছে! আপনার গোপন পুনরুদ্ধার কোড ও নতুন পাসওয়ার্ড দিন।'
          : 'Verified recovery method found! Enter your recovery passphrase and new password.'
      );
    } catch {
      setErrorMsg(
        lang === 'bn'
          ? 'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।'
          : 'Could not connect to server.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const pVal = validatePassword(recNewPassword);
    if (!pVal.valid) {
      setErrorMsg(lang === 'bn' ? pVal.errorBn! : pVal.errorEn!);
      return;
    }
    if (recNewPassword !== recConfirmPassword) {
      setErrorMsg(
        lang === 'bn'
          ? 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না!'
          : 'New password and confirmation do not match!'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/recovery-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: recUsername.trim(),
          recoveryPhrase: recPhrase.trim(),
          newPassword: recNewPassword,
          confirmPassword: recConfirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(
          lang === 'bn'
            ? data.errorBn || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।'
            : data.errorEn || 'Password reset failed.'
        );
        return;
      }
      setLoginUsername(recUsername.trim());
      setRecPhrase('');
      setRecNewPassword('');
      setRecConfirmPassword('');
      setActiveTab('login');
      setSuccessMsg(
        lang === 'bn'
          ? 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
          : 'Password reset successfully! Please log in with your new password.'
      );
    } catch {
      setErrorMsg(
        lang === 'bn'
          ? 'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।'
          : 'Could not connect to server.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfileAvatar = async (nextAvatar: string) => {
    if (identity.isGuest || !authToken) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/account/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ avatar: nextAvatar }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.profile) {
        onProfileUpdated(data.profile);
        setSuccessMsg(
          lang === 'bn' ? 'অ্যাভাটার আপডেট হয়েছে!' : 'Pirate avatar updated!'
        );
      }
    } catch {
      // ignore transient error
    }
  };

  const handleSaveRecoveryPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (identity.isGuest || !authToken) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    if (newRecoveryPhrase.trim().length < 4) {
      setErrorMsg(
        lang === 'bn'
          ? 'পুনরুদ্ধার কোড কমপক্ষে ৪ অক্ষরের হতে হবে।'
          : 'Recovery passphrase must be at least 4 characters.'
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/account/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ recoveryPhrase: newRecoveryPhrase.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.profile) {
        onProfileUpdated(data.profile);
        setNewRecoveryPhrase('');
        setSuccessMsg(
          lang === 'bn'
            ? 'পুনরুদ্ধার কোড সফলভাবে সংরক্ষিত হয়েছে!'
            : 'Recovery passphrase configured successfully!'
        );
      } else {
        setErrorMsg(
          lang === 'bn'
            ? data.errorBn || 'আপডেট ব্যর্থ হয়েছে।'
            : data.errorEn || 'Update failed.'
        );
      }
    } catch {
      setErrorMsg(
        lang === 'bn' ? 'সার্ভার সংযোগ ব্যর্থ।' : 'Server connection failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const copyPlayerId = () => {
    navigator.clipboard?.writeText(identity.playerId).catch(() => {});
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const winRate =
    identity.totalMatches > 0
      ? Math.round((identity.wins / identity.totalMatches) * 100)
      : 0;

  return (
    <div
      data-testid="pirate-account-screen"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto select-none ${
        fullScreenGate ? 'wood-deck-bg safe-area-shell' : 'bg-black/85 p-2 sm:p-5 items-center justify-center'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={
        lang === 'bn'
          ? 'জলদস্যু অ্যাকাউন্ট ও প্রোফাইল'
          : 'Jolodoshshu Pirate Account & Profile'
      }
    >
      {fullScreenGate && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(14,32,48,0.84)_0%,rgba(14,9,6,0.95)_70%)]"
        />
      )}

      {/* Top Bar when in FullScreen Gate */}
      {fullScreenGate && (
        <div className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between px-3 sm:px-6 pt-2.5 sm:pt-4 shrink-0">
          <div className="flex items-center gap-2 text-xs sm:text-base font-extrabold text-amber-300">
            <img
              src={COIN_ASSET_URL}
              alt="Coin"
              referrerPolicy="no-referrer"
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
            />
            <span>
              {lang === 'bn'
                ? 'জলদস্যু: ক্যাপ্টেন লগইন ও প্রোফাইল সিস্টেম'
                : 'Jolodoshshu: Captain Account & Progression'}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleLanguage}
            className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-amber-900/50 border border-amber-500/40 text-xs sm:text-sm font-bold text-amber-200 cursor-pointer"
          >
            {lang === 'bn' ? 'বাংলা / EN' : 'EN / বাংলা'}
          </button>
        </div>
      )}

      {/* Main Cabin Wood Card */}
      <div className="relative z-10 cabin-wood-panel w-full max-w-2xl mx-auto my-auto rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.9)] border-2 border-[#d4af37]/55">
        {/* Card Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-[#140c08] border-b border-amber-500/25 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl sm:text-3xl shrink-0">🏴‍☠️</span>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-extrabold text-amber-300 truncate">
                {activeTab === 'profile'
                  ? lang === 'bn'
                    ? 'ক্যাপ্টেন প্রোফাইল ও পরিসংখ্যান'
                    : 'Captain Profile & Career Record'
                  : activeTab === 'register'
                  ? lang === 'bn'
                    ? 'নতুন জলদস্যু অ্যাকাউন্ট নিবন্ধন'
                    : 'Create New Pirate Account'
                  : activeTab === 'recovery'
                  ? lang === 'bn'
                    ? 'পাসওয়ার্ড পুনরুদ্ধার (Forgot Password)'
                    : 'Account Password Recovery'
                  : lang === 'bn'
                  ? 'জলদস্যু অ্যাকাউন্ট লগইন'
                  : 'Pirate Captain Login'}
              </h1>
              <p className="text-[11px] sm:text-xs text-amber-100/75 truncate">
                {lang === 'bn'
                  ? 'সরাসরি গেমের ভেতর নিরাপদ অ্যাকাউন্ট ও ক্লাউড প্রোফাইল সংরক্ষণ'
                  : 'Secure in-game authentication & persistent cloud captain profile'}
              </p>
            </div>
          </div>

          {onClose && !fullScreenGate && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Account Modal"
              className="p-2 rounded-xl bg-amber-950/60 hover:bg-amber-800/60 text-amber-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-2 sm:px-6 bg-[#1b110b] border-b border-amber-500/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {identity.isGuest ? (
            <>
              <button
                type="button"
                data-testid="tab-auth-login"
                onClick={() => switchTab('login')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-amber-200/80 hover:text-amber-100 bg-black/35'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'লগইন (Login)' : 'Login'}</span>
              </button>
              <button
                type="button"
                data-testid="tab-auth-register"
                onClick={() => switchTab('register')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-amber-200/80 hover:text-amber-100 bg-black/35'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'অ্যাকাউন্ট খুলুন (Register)' : 'Create Account'}</span>
              </button>
              <button
                type="button"
                data-testid="tab-auth-recovery"
                onClick={() => switchTab('recovery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'recovery'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-amber-200/80 hover:text-amber-100 bg-black/35'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'পাসওয়ার্ড পুনরুদ্ধার' : 'Forgot Password'}</span>
              </button>
              {!fullScreenGate && (
                <button
                  type="button"
                  data-testid="tab-auth-profile"
                  onClick={() => switchTab('profile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-amber-200/80 hover:text-amber-100 bg-black/35'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'গেস্ট স্ট্যাটাস' : 'Guest Status'}</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              data-testid="tab-auth-profile"
              onClick={() => switchTab('profile')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold bg-amber-500 text-slate-950 shadow whitespace-nowrap cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              <span>
                {lang === 'bn'
                  ? `ক্যাপ্টেন প্রোফাইল (${identity.username})`
                  : `Captain Profile (${identity.username})`}
              </span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[78dvh] overflow-y-auto">
          {errorMsg && (
            <div
              data-testid="auth-error-banner"
              className="p-3 rounded-xl bg-red-950/90 border border-red-500/60 text-xs sm:text-sm text-red-200 font-bold flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              data-testid="auth-success-banner"
              className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-xs sm:text-sm text-emerald-200 font-bold flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ===============================================================
              TAB 1: LOGIN SCREEN
             =============================================================== */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="login-username-input"
                    className="block text-xs sm:text-sm font-bold text-amber-200 mb-1"
                  >
                    {lang === 'bn' ? 'ইউজারনেম (Username)' : 'Username'}
                  </label>
                  <input
                    id="login-username-input"
                    data-testid="input-login-username"
                    type="text"
                    autoComplete="username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder={
                      lang === 'bn'
                        ? 'আপনার জলদস্যু ইউজারনেম লিখুন...'
                        : 'Enter your pirate username...'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/65 border border-amber-500/40 text-sm sm:text-base font-bold text-amber-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="login-password-input"
                      className="block text-xs sm:text-sm font-bold text-amber-200"
                    >
                      {lang === 'bn' ? 'পাসওয়ার্ড (Password)' : 'Password'}
                    </label>
                    <button
                      type="button"
                      data-testid="btn-switch-recovery"
                      onClick={() => switchTab('recovery')}
                      className="text-xs font-bold text-amber-400 hover:text-amber-200 underline cursor-pointer"
                    >
                      {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password-input"
                      data-testid="input-login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={
                        lang === 'bn' ? 'আপনার গোপন পাসওয়ার্ড...' : 'Enter your password...'
                      }
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-black/65 border border-amber-500/40 text-sm sm:text-base font-bold text-amber-100 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((s) => !s)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-300/70 hover:text-amber-200 cursor-pointer"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me Option */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-100/90 cursor-pointer">
                    <input
                      type="checkbox"
                      data-testid="checkbox-remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                    />
                    <span>
                      {lang === 'bn'
                        ? 'আমাকে মনে রাখুন (Remember Me)'
                        : 'Remember Me (Stay logged in)'}
                    </span>
                  </label>
                </div>

                {/* Primary Login & Create Account Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="submit"
                    data-testid="btn-login-submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {loading
                        ? lang === 'bn'
                          ? 'যাচাই হচ্ছে...'
                          : 'Signing In...'
                        : lang === 'bn'
                        ? 'লগইন করুন (Login)'
                        : 'Login to Account'}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="btn-switch-register"
                    onClick={() => switchTab('register')}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#12332b] hover:bg-[#19473c] border border-amber-400/60 text-amber-200 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-amber-300" />
                    <span>
                      {lang === 'bn'
                        ? 'নতুন অ্যাকাউন্ট খুলুন'
                        : 'Create Account'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Guest Play Option with Clear Explanation */}
              <div className="pt-3 border-t border-amber-500/20 space-y-2.5">
                <div className="p-3 rounded-xl bg-black/45 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs sm:text-sm font-extrabold text-amber-300">
                      {lang === 'bn'
                        ? '⚓ গেস্ট মোডে খেলুন (Guest Play)'
                        : '⚓ Play in Guest Mode'}
                    </div>
                    <p className="text-[11px] sm:text-xs text-amber-100/80 leading-snug">
                      {lang === 'bn'
                        ? 'অ্যাকাউন্ট ছাড়াই সব ৫টি ক্যাজুয়াল মোড খেলতে পারবেন। তবে গেস্ট অগ্রগতি অন্য ডিভাইসে সংরক্ষিত থাকবে না এবং র‍্যাঙ্কড মাল্টিপ্লেয়ারের জন্য অ্যাকাউন্ট প্রয়োজন। পরে যেকোনো সময় অ্যাকাউন্ট খোলা যাবে।'
                        : 'Try all 5 casual modes without an account. Guest progress is not preserved across devices, and Ranked Multiplayer requires an authenticated account. You can create an account later.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-guest-play"
                    onClick={onContinueAsGuest}
                    className="px-4 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-400/50 text-amber-200 font-extrabold text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
                  >
                    {lang === 'bn' ? 'গেস্ট হিসেবে খেলুন →' : 'Play as Guest →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              TAB 2: REGISTRATION SCREEN
             =============================================================== */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {identity.isGuest && identity.totalMatches > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-xs text-amber-200 font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    {lang === 'bn'
                      ? `গেস্ট সেশনের অগ্রগতি (${identity.wins} জয়, ${identity.coins} কয়েন) আপনার নতুন অ্যাকাউন্টে যুক্ত হবে!`
                      : `Your guest progress (${identity.wins} wins, ${identity.coins} coins) will be carried over to your new account!`}
                  </span>
                </div>
              )}

              {/* Avatar Selection */}
              <div>
                <span className="block text-xs sm:text-sm font-bold text-amber-200 mb-1.5">
                  {lang === 'bn'
                    ? 'আপনার জলদস্যু প্রতীক (Avatar) বেছে নিন'
                    : 'Choose Your Pirate Avatar'}
                </span>
                <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                  {PIRATE_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setRegAvatar(av.emoji)}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xl sm:text-2xl border transition-all shrink-0 cursor-pointer ${
                        regAvatar === av.emoji
                          ? 'bg-amber-500/30 border-amber-300 scale-105 shadow'
                          : 'bg-black/55 border-amber-500/25 hover:border-amber-400/60'
                      }`}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-username-input"
                  className="block text-xs sm:text-sm font-bold text-amber-200 mb-1"
                >
                  {lang === 'bn'
                    ? 'অনন্য ইউজারনেম (Unique Username · ৩–২০ অক্ষর)'
                    : 'Unique Username (3–20 characters, letters/numbers/_)'}
                </label>
                <input
                  id="reg-username-input"
                  data-testid="input-register-username"
                  type="text"
                  autoComplete="username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder={
                    lang === 'bn' ? 'যেমন: Captain_Rafiq' : 'e.g. Captain_Rafiq'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/65 border border-amber-500/40 text-sm sm:text-base font-bold text-amber-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-password-input"
                    className="block text-xs sm:text-sm font-bold text-amber-200 mb-1"
                  >
                    {lang === 'bn'
                      ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)'
                      : 'Password (min 6 chars)'}
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password-input"
                      data-testid="input-register-password"
                      type={showRegPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-black/65 border border-amber-500/40 text-sm sm:text-base font-bold text-amber-100 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((s) => !s)}
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-300/70 hover:text-amber-200 cursor-pointer"
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-confirm-input"
                    className="block text-xs sm:text-sm font-bold text-amber-200 mb-1"
                  >
                    {lang === 'bn'
                      ? 'পাসওয়ার্ড নিশ্চিত করুন (Confirm)'
                      : 'Confirm Password'}
                  </label>
                  <input
                    id="reg-confirm-input"
                    data-testid="input-register-confirm"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/65 border border-amber-500/40 text-sm sm:text-base font-bold text-amber-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-recovery-input"
                  className="block text-xs sm:text-sm font-bold text-amber-200 mb-1"
                >
                  {lang === 'bn'
                    ? 'গোপন পুনরুদ্ধার কোড / Recovery Passphrase (ঐচ্ছিক — পাসওয়ার্ড ভুলে গেলে প্রয়োজন)'
                    : 'Secret Recovery Passphrase (Optional — enables Forgot Password recovery)'}
                </label>
                <input
                  id="reg-recovery-input"
                  data-testid="input-register-recovery"
                  type="text"
                  value={regRecoveryPhrase}
                  onChange={(e) => setRegRecoveryPhrase(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'যেমন: BlackPearl1720 (কমপক্ষে ৪ অক্ষর)'
                      : 'e.g. BlackPearl1720 (min 4 chars)'
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/65 border border-amber-500/35 text-xs sm:text-sm font-semibold text-amber-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-100/90 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="checkbox-register-remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                  />
                  <span>
                    {lang === 'bn'
                      ? 'আমাকে মনে রাখুন (Remember Me)'
                      : 'Remember Me (Keep session active)'}
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  data-testid="btn-register-submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {loading
                      ? lang === 'bn'
                        ? 'অ্যাকাউন্ট তৈরি হচ্ছে...'
                        : 'Creating Account...'
                      : lang === 'bn'
                      ? 'অ্যাকাউন্ট তৈরি করুন (+৫০ বোনাস কয়েন)'
                      : 'Create Pirate Account (+50 Bonus Coins)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="px-4 py-2.5 rounded-xl bg-black/55 hover:bg-amber-950/60 border border-amber-500/35 text-xs sm:text-sm font-bold text-amber-200 cursor-pointer"
                >
                  {lang === 'bn' ? 'লগইনে ফিরুন' : 'Back to Login'}
                </button>
              </div>
            </form>
          )}

          {/* ===============================================================
              TAB 3: FORGOT PASSWORD / VERIFIED RECOVERY
             =============================================================== */}
          {activeTab === 'recovery' && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-amber-100/85 leading-relaxed">
                {lang === 'bn'
                  ? 'আপনার অ্যাকাউন্টে যদি যাচাইকৃত গোপন পুনরুদ্ধার কোড (Recovery Passphrase) কনফিগার করা থাকে, তবে সেটি দিয়ে পাসওয়ার্ড রিসেট করতে পারবেন।'
                  : 'If your account has a verified Recovery Passphrase configured, enter your username below to verify and reset your password.'}
              </p>

              {recStep === 'check' ? (
                <form onSubmit={handleRecoveryCheck} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="rec-username-input"
                      className="block text-xs sm:text-sm font-bold text-amber-200 mb-1"
                    >
                      {lang === 'bn' ? 'আপনার ইউজারনেম (Username)' : 'Your Username'}
                    </label>
                    <input
                      id="rec-username-input"
                      data-testid="input-recovery-username"
                      type="text"
                      value={recUsername}
                      onChange={(e) => setRecUsername(e.target.value)}
                      placeholder={lang === 'bn' ? 'ইউজারনেম লিখুন...' : 'Enter username...'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/65 border border-amber-500/40 text-sm sm:text-base font-bold text-amber-100"
                    />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="submit"
                      data-testid="btn-recovery-check"
                      disabled={loading}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm cursor-pointer"
                    >
                      {lang === 'bn'
                        ? 'পুনরুদ্ধার পদ্ধতি যাচাই করুন'
                        : 'Verify Recovery Method'}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchTab('login')}
                      className="px-4 py-2.5 rounded-xl bg-black/55 border border-amber-500/35 text-xs sm:text-sm font-bold text-amber-200 cursor-pointer"
                    >
                      {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRecoveryReset} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="rec-phrase-input"
                      className="block text-xs sm:text-sm font-bold text-amber-200 mb-1"
                    >
                      {lang === 'bn'
                        ? 'গোপন পুনরুদ্ধার কোড (Recovery Passphrase)'
                        : 'Verified Recovery Passphrase'}
                    </label>
                    <input
                      id="rec-phrase-input"
                      data-testid="input-recovery-phrase"
                      type="password"
                      value={recPhrase}
                      onChange={(e) => setRecPhrase(e.target.value)}
                      placeholder={
                        lang === 'bn'
                          ? 'আপনার গোপন পুনরুদ্ধার কোড দিন...'
                          : 'Enter your secret recovery passphrase...'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/65 border border-amber-500/40 text-sm sm:text-base font-bold text-amber-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="rec-new-pwd"
                        className="block text-xs sm:text-sm font-bold text-amber-200 mb-1"
                      >
                        {lang === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                      </label>
                      <input
                        id="rec-new-pwd"
                        data-testid="input-recovery-new-password"
                        type="password"
                        value={recNewPassword}
                        onChange={(e) => setRecNewPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/65 border border-amber-500/40 text-sm sm:text-base font-bold text-amber-100"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="rec-confirm-pwd"
                        className="block text-xs sm:text-sm font-bold text-amber-200 mb-1"
                      >
                        {lang === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}
                      </label>
                      <input
                        id="rec-confirm-pwd"
                        data-testid="input-recovery-confirm-password"
                        type="password"
                        value={recConfirmPassword}
                        onChange={(e) => setRecConfirmPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/65 border border-amber-500/40 text-sm sm:text-base font-bold text-amber-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="submit"
                      data-testid="btn-recovery-submit"
                      disabled={loading}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm cursor-pointer"
                    >
                      {lang === 'bn'
                        ? 'পাসওয়ার্ড রিসেট করুন'
                        : 'Reset Password Now'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecStep('check')}
                      className="px-4 py-2.5 rounded-xl bg-black/55 border border-amber-500/35 text-xs sm:text-sm font-bold text-amber-200 cursor-pointer"
                    >
                      {lang === 'bn' ? 'পেছনে যান' : 'Back'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ===============================================================
              TAB 4: PLAYER PROFILE & PROGRESSION
             =============================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Identity Banner */}
              <div className="p-4 rounded-2xl bg-black/55 border border-amber-500/35 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-950/70 border-2 border-amber-400 flex items-center justify-center text-3xl sm:text-4xl shadow-inner shrink-0">
                    {identity.avatar}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2
                        data-testid="profile-username"
                        className="text-lg sm:text-2xl font-extrabold text-amber-200 truncate"
                      >
                        {identity.username}
                      </h2>
                      <span
                        className={`text-xs font-bold ${
                          identity.isGuest ? 'text-amber-400/90' : 'text-emerald-400'
                        }`}
                      >
                        ·{' '}
                        {identity.isGuest
                          ? lang === 'bn'
                            ? 'গেস্ট অ্যাকাউন্ট'
                            : 'Guest Mode'
                          : lang === 'bn'
                          ? 'যাচাইকৃত ক্যাপ্টেন'
                          : 'Verified Account'}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm text-amber-300/90 font-bold">
                      {lang === 'bn' ? identity.rankTitleBn : identity.rankTitleEn} ·{' '}
                      <span className="font-mono-num">
                        {lang === 'bn' ? 'রেটিং' : 'Rating'} {identity.rankedRating}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] sm:text-xs text-amber-100/70 font-mono-num">
                      <span data-testid="profile-player-id">ID: {identity.playerId}</span>
                      <button
                        type="button"
                        onClick={copyPlayerId}
                        className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-100 cursor-pointer"
                        title="Copy Player ID"
                      >
                        {copiedId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span>·</span>
                      <span data-testid="profile-created-at">
                        {lang === 'bn' ? 'যোগদান:' : 'Joined:'}{' '}
                        {new Date(identity.createdAt).toLocaleDateString(
                          lang === 'bn' ? 'bn-BD' : 'en-US',
                          { year: 'numeric', month: 'short', day: 'numeric' }
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {!identity.isGuest ? (
                  <button
                    type="button"
                    data-testid="btn-logout"
                    onClick={onLogout}
                    className="px-3.5 py-2 rounded-xl bg-red-950/75 hover:bg-red-900 border border-red-500/45 text-red-200 text-xs sm:text-sm font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'লগআউট (Logout)' : 'Logout'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="btn-guest-upgrade"
                    onClick={() => switchTab('register')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>
                      {lang === 'bn' ? 'স্থায়ী অ্যাকাউন্ট খুলুন' : 'Create Permanent Account'}
                    </span>
                  </button>
                )}
              </div>

              {/* Level & XP Bar */}
              <div
                data-testid="profile-level-xp"
                className="p-3.5 rounded-xl bg-[#122621]/90 border border-[#d4af37]/40 space-y-2"
              >
                <div className="flex items-center justify-between text-xs sm:text-sm font-extrabold">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>
                      {lang === 'bn'
                        ? `লেভেল ${identity.level} (মোট XP: ${identity.xp})`
                        : `Level ${identity.level} (Total XP: ${identity.xp})`}
                    </span>
                  </span>
                  <span className="font-mono-num text-amber-100">
                    {identity.xpIntoLevel} / {identity.xpForNextLevel} XP
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden border border-amber-500/30">
                  <div
                    className="h-full bg-amber-400 transition-transform duration-300 origin-left"
                    style={{
                      transform: `scaleX(${Math.min(
                        1,
                        Math.max(0.04, identity.xpIntoLevel / identity.xpForNextLevel)
                      )})`,
                    }}
                  />
                </div>
              </div>

              {/* Career Statistics Grid */}
              <div
                data-testid="profile-stats-grid"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono-num"
              >
                <div
                  data-testid="profile-coins-progression"
                  className="p-3 rounded-xl bg-black/50 border border-amber-500/25 space-y-0.5"
                >
                  <div className="text-[11px] text-amber-200/75 flex items-center gap-1 font-sans font-bold">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'bn' ? 'মোট কয়েন ভাণ্ডার' : 'Career Coins'}</span>
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-amber-300">
                    {identity.coins}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/50 border border-amber-500/25 space-y-0.5">
                  <div className="text-[11px] text-amber-200/75 flex items-center gap-1 font-sans font-bold">
                    <Swords className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'bn' ? 'মোট ম্যাচ' : 'Total Matches'}</span>
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-amber-100">
                    {identity.totalMatches}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/50 border border-amber-500/25 space-y-0.5">
                  <div className="text-[11px] text-amber-200/75 flex items-center gap-1 font-sans font-bold">
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === 'bn' ? 'জয় / পরাজয়' : 'Wins / Losses'}</span>
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-emerald-300">
                    {identity.wins}W · <span className="text-red-300">{identity.losses}L</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/50 border border-amber-500/25 space-y-0.5">
                  <div className="text-[11px] text-amber-200/75 flex items-center gap-1 font-sans font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'bn' ? 'জয়ের হার' : 'Win Rate'}</span>
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-amber-200">
                    {winRate}%
                  </div>
                </div>
              </div>

              {/* Authenticated Account Customization (Avatar & Recovery Passphrase) */}
              {!identity.isGuest && (
                <div className="p-3.5 rounded-xl bg-black/45 border border-amber-500/25 space-y-3">
                  <div>
                    <span className="block text-xs font-bold text-amber-300 mb-1.5">
                      {lang === 'bn'
                        ? 'অ্যাভাটার পরিবর্তন করুন (ক্লিক করলেই সেভ হবে):'
                        : 'Switch Pirate Avatar (Saves automatically):'}
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                      {PIRATE_AVATARS.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => handleUpdateProfileAvatar(av.emoji)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition-all shrink-0 cursor-pointer ${
                            identity.avatar === av.emoji
                              ? 'bg-amber-500/30 border-amber-300 scale-105'
                              : 'bg-black/50 border-amber-500/25 hover:border-amber-400'
                          }`}
                        >
                          {av.emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form
                    onSubmit={handleSaveRecoveryPhrase}
                    className="pt-2 border-t border-amber-500/15 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                  >
                    <input
                      type="password"
                      value={newRecoveryPhrase}
                      onChange={(e) => setNewRecoveryPhrase(e.target.value)}
                      placeholder={
                        identity.hasRecovery
                          ? lang === 'bn'
                            ? 'পুনরুদ্ধার কোড সক্রিয় আছে (পরিবর্তন করতে নতুন কোড দিন)'
                            : 'Recovery active (enter new phrase to update)'
                          : lang === 'bn'
                          ? 'পাসওয়ার্ড পুনরুদ্ধার কোড সেট করুন (কমপক্ষে ৪ অক্ষর)'
                          : 'Set a Recovery Passphrase (min 4 chars)'
                      }
                      className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-amber-500/35 text-xs sm:text-sm text-amber-100"
                    />
                    <button
                      type="submit"
                      disabled={loading || newRecoveryPhrase.trim().length < 4}
                      className="px-4 py-2 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 disabled:opacity-40 border border-amber-400/50 text-xs font-extrabold text-amber-200 whitespace-nowrap cursor-pointer"
                    >
                      {lang === 'bn' ? 'পুনরুদ্ধার কোড সেভ করুন' : 'Save Recovery Code'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer note when in FullScreen Gate */}
      {fullScreenGate && (
        <div className="relative z-10 px-4 py-2 text-center text-[11px] sm:text-xs text-amber-200/70 font-mono-num shrink-0">
          {lang === 'bn'
            ? 'জলদস্যু ইন-গেম অ্যাকাউন্ট সিস্টেম · কোনো বাহ্যিক সোশ্যাল লগইন ছাড়াই সম্পূর্ণ নিরাপদ ক্লাউড সংরক্ষণ'
            : 'Jolodoshshu Custom In-Game Account System · Encrypted Cloud Persistence · Zero Social Login'}
        </div>
      )}
    </div>
  );
};
