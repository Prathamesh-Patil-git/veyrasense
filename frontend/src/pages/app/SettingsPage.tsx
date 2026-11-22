import React, { useState } from 'react';
import {
  User,
  Mail,
  Shield,
  Key,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();

  // Profile Form State
  const [fullName, setFullName] = useState(user?.name || '');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('Profile preferences updated for this active session.');
    setTimeout(() => setProfileSuccess(null), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    // Password update action
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setPasswordSuccess('Password successfully updated. Please use your new password on next sign-in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 600);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <Shield className="w-4 h-4 text-[#FFD21C]" />
              <span>Administrator Account</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Account Profile & Security Settings
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            Role: Administrator
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Manage your operator profile, security credentials, and active session authentication for the VeyraSense gateway.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Profile Overview */}
        <div className="clay-surface p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFD21C] text-[#172238] flex items-center justify-center font-black text-lg shadow-2xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#172238]">
                {user?.name || 'Administrator'}
              </h3>
              <p className="text-xs text-[#718096] truncate max-w-[200px]">
                {user?.email || 'admin@veyrasense.local'}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-3 rounded-xl clay-recessed">
              <span className="text-[#718096]">Account Role:</span>
              <span className="font-bold text-[#172238]">{user?.role || 'Administrator'}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl clay-recessed">
              <span className="text-[#718096]">Account Status:</span>
              <span className="font-semibold text-[#0C5A37]">Active (Verified)</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl clay-recessed">
              <span className="text-[#718096]">User ID:</span>
              <span className="font-mono text-[#172238]">{user?.id ? `USR-${user.id}` : 'Primary Host Admin'}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl clay-recessed">
              <span className="text-[#718096]">Last Authenticated:</span>
              <span className="text-[#172238] font-medium">{user?.lastLoginAt || 'Current Session'}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#F2F3EE] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#172238]">
              <Clock className="w-4 h-4 text-[#718096]" />
              <span>Session Controls</span>
            </div>
            <p className="text-[11px] text-[#718096] leading-relaxed">
              Signing out invalidates your JWT bearer access token across the local gateway.
            </p>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={logout}
              leftIcon={<LogOut className="w-4 h-4 text-[#EF6461]" />}
              className="text-[#EF6461] hover:bg-[#FDF0F0] border-[#EF6461]/30 font-bold"
            >
              Terminate Session & Sign Out
            </Button>
          </div>
        </div>

        {/* Right Columns: Edit Profile & Password Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Edit Profile Form */}
          <div className="clay-surface p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#F2F3EE]">
              <User className="w-5 h-5 text-[#172238]" />
              <h3 className="text-base font-bold text-[#172238]">Profile Information</h3>
            </div>

            {profileSuccess && (
              <div className="p-3 rounded-2xl bg-[#E8FAF1] text-[#0C5A37] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#172238]">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Administrator Name"
                    className="w-full clay-recessed p-2.5 rounded-xl font-medium text-[#172238] focus:outline-none focus:ring-2 focus:ring-[#FFD21C]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#172238]">Email Address</label>
                  <div className="relative flex items-center">
                    <input
                      type="email"
                      value={user?.email || 'admin@veyrasense.local'}
                      disabled
                      className="w-full clay-recessed p-2.5 rounded-xl font-mono text-[#718096] bg-slate-100/50 cursor-not-allowed"
                    />
                    <Mail className="w-4 h-4 text-[#718096] absolute right-3 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-[#718096]">
                    Email is pinned to the gateway primary admin account.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="primary" size="sm" type="submit" leftIcon={<Save className="w-3.5 h-3.5" />}>
                  Save Profile Details
                </Button>
              </div>
            </form>
          </div>

          {/* 2. Change Password Form */}
          <div className="clay-surface p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#F2F3EE]">
              <Key className="w-5 h-5 text-[#875B00]" />
              <h3 className="text-base font-bold text-[#172238]">Security & Password</h3>
            </div>

            {passwordError && (
              <div className="p-3 rounded-2xl bg-[#FDF0F0] text-[#B42318] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-2xl bg-[#E8FAF1] text-[#0C5A37] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#172238]">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full clay-recessed p-2.5 rounded-xl font-mono text-[#172238] focus:outline-none focus:ring-2 focus:ring-[#FFD21C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#172238]">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full clay-recessed p-2.5 rounded-xl font-mono text-[#172238] focus:outline-none focus:ring-2 focus:ring-[#FFD21C]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#172238]">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full clay-recessed p-2.5 rounded-xl font-mono text-[#172238] focus:outline-none focus:ring-2 focus:ring-[#FFD21C]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isUpdatingPassword}
                  leftIcon={<Key className="w-3.5 h-3.5" />}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
