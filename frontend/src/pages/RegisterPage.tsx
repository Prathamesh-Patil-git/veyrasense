import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowRight, Terminal } from 'lucide-react';
import { AuthSplitLayout } from '../components/auth/AuthSplitLayout';
import { Button } from '../components/ui/Button';

export const RegisterPage: React.FC = () => {
  return (
    <AuthSplitLayout
      title="Gateway Provisioning"
      subtitle="Administrative security and access control for VeyraSense edge nodes."
    >
      <div className="space-y-6">
        <div className="p-4 rounded-2xl bg-[#FFF6C9] border border-[#F2E7A7] text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#172238]">
            <ShieldAlert className="w-4 h-4 text-[#875B00]" />
            <span>Single-Administrator Security Policy</span>
          </div>
          <p className="text-[12px] text-[#718096] leading-relaxed">
            VeyraSense production deployments enforce strict physical boundary controls. Unrestricted public web registration is disabled to prevent unauthorized fleet takeover.
          </p>
        </div>

        <div className="clay-surface p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
            <Terminal className="w-4 h-4 text-[#172238]" />
            <span>Gateway Initial Setup</span>
          </div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Administrator accounts are provisioned during gateway initial configuration on the Raspberry Pi 5 console:
          </p>
          <div className="p-3 rounded-xl bg-[#172238] text-white text-[11px] font-mono leading-relaxed">
            # Run on Raspberry Pi host terminal<br />
            sudo /opt/veyrasense/scripts/setup-admin.sh
          </div>
          <p className="text-xs text-[#718096] leading-relaxed">
            If your gateway administrator account is already provisioned, sign in to launch the operations console.
          </p>
        </div>

        <div className="pt-2">
          <Link to="/login">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="font-bold shadow-xs"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Proceed to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
};
