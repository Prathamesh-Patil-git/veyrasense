import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, User, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AuthSplitLayout } from '../components/auth/AuthSplitLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Real-time password criteria
  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const isMatch = password.length > 0 && password === confirmPassword;

  const validate = (): boolean => {
    const newErrors: { [key: string]: string | undefined } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 3) {
      newErrors.fullName = 'Full name must be at least 3 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!hasLength) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!hasNumber || !hasLetter) {
      newErrors.password = 'Password must include both letters and numbers';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirmation password is required';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptTerms) {
      newErrors.terms = 'You must accept the deployment policies';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    // Demonstration state
    setTimeout(() => {
      setIsLoading(false);
      setRegisteredSuccess(true);
    }, 850);
  };

  return (
    <AuthSplitLayout
      title="Create Edge Account"
      subtitle="Provision access for edge gateway monitoring and telemetry review."
    >
      {/* Explicit Production Architecture Notice */}
      <div className="p-3.5 rounded-2xl bg-[#FFF6C9] border border-[#F2E7A7] text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-[#172238]">
            <ShieldAlert className="w-4 h-4 text-[#875B00]" />
            <span>Operational Security Notice</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white/80 text-[#875B00] border border-[#F2E7A7]">
            UI Prototype (Demo)
          </span>
        </div>
        <p className="text-[11px] text-[#718096] leading-relaxed">
          Initial deployment targets a <strong>single administrator account</strong> on the Raspberry Pi 5. Unrestricted public administrator registration is disabled in production environments. This form operates strictly in client-side demonstration mode; no operational backend accounts are created.
        </p>
      </div>

      {registeredSuccess ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#E8FAF1] text-[#0C5A37] flex items-center justify-center mx-auto border border-[#78E9AD]">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[#172238]">
            Demonstration Account Provisioned
          </h3>
          <p className="text-xs text-[#718096] max-w-sm mx-auto leading-relaxed">
            Edge access profile created for <strong>{fullName}</strong> ({email}). In production, administrator accounts require local token authorization.
          </p>
          <div className="pt-2">
            <Link to="/login">
              <Button variant="primary" size="md" className="font-bold">
                Proceed to Sign In
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Full Name"
            name="fullName"
            placeholder="Dr. Jordan Hayes"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            error={errors.fullName}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Work / Organization Email"
            name="email"
            type="email"
            placeholder="j.hayes@facility.org"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Create Password"
            name="password"
            isPassword
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            isPassword
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            error={errors.confirmPassword}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          {/* Password Validation Checklist */}
          <div className="p-3 rounded-2xl bg-[#F7F7F0] border border-[#ECEDE8] space-y-1.5 text-[11px]">
            <div className="font-bold text-[#172238] uppercase tracking-wider text-[10px]">
              Password Requirements
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className={`flex items-center gap-1.5 ${hasLength ? 'text-[#0C5A37] font-semibold' : 'text-[#718096]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasLength ? 'bg-[#78E9AD]' : 'bg-[#CBD5E1]'}`} />
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-[#0C5A37] font-semibold' : 'text-[#718096]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-[#78E9AD]' : 'bg-[#CBD5E1]'}`} />
                <span>Includes a number</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-[#0C5A37] font-semibold' : 'text-[#718096]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasLetter ? 'bg-[#78E9AD]' : 'bg-[#CBD5E1]'}`} />
                <span>Includes a letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isMatch ? 'text-[#0C5A37] font-semibold' : 'text-[#718096]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isMatch ? 'bg-[#78E9AD]' : 'bg-[#CBD5E1]'}`} />
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-[#718096]">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                }}
                className="mt-0.5 rounded border-[#ECEDE8] text-[#FFD21C] focus:ring-[#FFD21C]"
              />
              <span>
                I understand this edge gateway operates under a course project single-admin model and agree to the local physical device safety guidelines.
              </span>
            </label>
            {errors.terms && (
              <p className="mt-1 text-xs text-[#EF6461] font-medium">• {errors.terms}</p>
            )}
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
              Create Account
            </Button>
          </div>

          <div className="pt-4 text-center text-xs text-[#718096]">
            Already have an administrator profile?{' '}
            <Link
              to="/login"
              className="font-bold text-[#172238] hover:underline"
            >
              Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthSplitLayout>
  );
};
