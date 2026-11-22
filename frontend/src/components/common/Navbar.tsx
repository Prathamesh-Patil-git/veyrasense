import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { VeyraLogo } from './VeyraLogo';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Services' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-[#F7F7F0]/90 backdrop-blur-md border-b border-[#ECEDE8] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <VeyraLogo size="md" showTagline={false} />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-full border border-[#ECEDE8] shadow-2xs">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 text-xs font-semibold rounded-full transition-all duration-150 ${
                    isActive
                      ? 'bg-[#FFD21C] text-[#172238] shadow-2xs'
                      : 'text-[#718096] hover:text-[#172238] hover:bg-[#F7F7F0]'
                  }`}
                >
                  {link.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-semibold text-xs">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button
                variant="primary"
                size="sm"
                className="text-xs font-bold shadow-xs"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs">
                Sign In
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-xl bg-white border border-[#ECEDE8] text-[#172238] hover:bg-[#F7F7F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD21C]"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFFFFF] border-b border-[#ECEDE8] px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={closeMobileMenu}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#FFF6C9] text-[#172238] border-l-4 border-[#FFD21C]'
                      : 'text-[#718096] hover:bg-[#F7F7F0] hover:text-[#172238]'
                  }`}
                >
                  {link.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[#ECEDE8] flex flex-col gap-2.5">
            <Link to="/register" onClick={closeMobileMenu} className="w-full">
              <Button variant="primary" size="md" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                Get Started
              </Button>
            </Link>
            <Link to="/login" onClick={closeMobileMenu} className="w-full">
              <Button variant="outline" size="md" fullWidth>
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
