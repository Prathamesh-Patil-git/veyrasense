import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { AuthSplitLayout } from '../components/auth/AuthSplitLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Administrator email is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid administrator email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setLoginError(null);

    try {
      await login(email, password);
      navigate('/app/overview');
    } catch (err: any) {
      setLoginError(
        err?.message || 'Authentication failed. Please verify your administrator email and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Administrator Sign In"
      subtitle="Access the local edge gateway sensor reliability console."
    >
      {loginError && (
        <div className="p-3.5 rounded-2xl bg-[#FDF0F0] border border-[#EF6461] text-xs flex items-start gap-2 text-[#B42318]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{loginError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Administrator Email"
          name="email"
          type="email"
          placeholder="admin@veyrasense.local"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            if (loginError) setLoginError(null);
          }}
          error={errors.email}
          leftIcon={<Mail className="w-4 h-4" />}
          required
        />

        <div>
          <Input
            label="Password"
            name="password"
            isPassword
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              if (loginError) setLoginError(null);
            }}
            error={errors.password}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#718096]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#ECEDE8] text-[#FFD21C] focus:ring-[#FFD21C]"
              />
              <span>Remember this session</span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-xs font-semibold text-[#172238] hover:text-[#5A687C] transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            className="font-bold shadow-xs"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to Console
          </Button>
        </div>

        <div className="pt-4 text-center text-xs text-[#718096]">
          Need to access an unregistered gateway?{' '}
          <Link
            to="/register"
            className="font-bold text-[#172238] hover:underline"
          >
            Provision Gateway
          </Link>
        </div>
      </form>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="clay-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 font-bold text-[#172238]">
              <ShieldCheck className="w-5 h-5 text-[#FFD21C]" />
              <span>Gateway Password Recovery</span>
            </div>
            <p className="text-xs text-[#718096] leading-relaxed">
              In edge deployments, administrator password resets must be executed directly on the Raspberry Pi 5 console using the local administration CLI:
            </p>
            <div className="p-3 rounded-xl bg-[#172238] text-white text-[11px] font-mono">
              sudo python3 -m app.cli.reset_admin
            </div>
            <p className="text-[11px] text-[#718096]">
              This physical requirement protects local industrial equipment from unauthorized remote credential overrides.
            </p>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setShowForgotModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </AuthSplitLayout>
  );
};
