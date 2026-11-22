import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Info, CheckCircle2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    // Frontend demonstration state & login transition
    setTimeout(() => {
      setIsLoading(false);
      login(email);
      setLoginSuccess(true);
    }, 600);
  };

  const handleFillDemoAdmin = () => {
    setEmail('admin@veyrasense.local');
    setPassword('VeyraSense2026!');
    setErrors({});
  };

  return (
    <AuthSplitLayout
      title="Administrator Sign In"
      subtitle="Access the local edge gateway sensor reliability console."
    >
      {/* Demonstration Banner */}
      <div className="p-3.5 rounded-2xl bg-[#FFF6C9] border border-[#F2E7A7] text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-[#172238]">
            <Info className="w-4 h-4 text-[#875B00]" />
            <span>Frontend Demonstration State</span>
          </div>
          <button
            type="button"
            onClick={handleFillDemoAdmin}
            className="text-[11px] font-bold text-[#172238] bg-[#FFD21C] hover:bg-[#EFC000] px-2 py-0.5 rounded-md transition-colors shadow-2xs"
          >
            Auto-Fill Demo Admin
          </button>
        </div>
        <p className="text-[11px] text-[#718096] leading-relaxed">
          Initial deployment uses a single administrator account. Backend authentication service will be connected in Phase 2.
        </p>
      </div>

      {loginSuccess ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#E8FAF1] text-[#0C5A37] flex items-center justify-center mx-auto border border-[#78E9AD]">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[#172238]">
            Authentication Verified (Demo)
          </h3>
          <p className="text-xs text-[#718096] max-w-sm mx-auto leading-relaxed">
            Signed in as <strong>{email}</strong>. In the next phase, this transitions into the authenticated operator dashboard.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              className="font-bold"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/app/overview')}
            >
              Launch Operations Console
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setLoginSuccess(false);
                setEmail('');
                setPassword('');
              }}
            >
              Sign Out & Try Again
            </Button>
          </div>
        </div>
      ) : (
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
              }}
              error={errors.password}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[#718096] hover:text-[#172238]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#ECEDE8] text-[#FFD21C] focus:ring-[#FFD21C]"
              />
              <span>Remember session on this edge gateway</span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="font-semibold text-[#172238] hover:text-[#EFC000] transition-colors"
            >
              Forgot password?
            </button>
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
              Sign In
            </Button>
          </div>

          <div className="pt-4 text-center text-xs text-[#718096]">
            Need edge terminal deployment access?{' '}
            <Link
              to="/register"
              className="font-bold text-[#172238] hover:underline"
            >
              Create Account
            </Link>
          </div>
        </form>
      )}

      {/* Forgot Password Demonstration Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="clay-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 font-bold text-[#172238]">
              <ShieldCheck className="w-5 h-5 text-[#FFD21C]" />
              <span>Edge Password Recovery Protocol</span>
            </div>
            <p className="text-xs text-[#718096] leading-relaxed">
              In the planned single-administrator deployment architecture, password recovery will require local physical console access to the Raspberry Pi 5:
            </p>
            <div className="p-3 rounded-xl bg-[#172238] text-white text-[11px] font-mono">
              sudo python3 -m app.cli.reset_admin  # Planned CLI Specification
            </div>
            <p className="text-[11px] text-[#718096]">
              This safeguards local equipment from remote password overrides. Note: CLI tooling is currently a planned backend utility and is not operational in this frontend demonstration prototype.
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
