import React, { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  Cpu,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/dashboard-kit/StatusBadge';

interface ContactFormData {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}

interface ValidationErrors {
  fullName?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success'>('idle');

  // Email format validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. name@domain.com)';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    } else if (formData.subject.trim().length < 4) {
      newErrors.subject = 'Subject must be at least 4 characters';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message content is required';
    } else if (formData.message.trim().length < 15) {
      newErrors.message = 'Please provide a message of at least 15 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
    }, 600);
  };

  const handleReset = () => {
    setFormData({ fullName: '', email: '', subject: '', message: '' });
    setErrors({});
    setSubmitStatus('idle');
  };

  return (
    <div className="space-y-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF6C9] text-[#172238] border border-[#F2E7A7] text-xs font-bold uppercase tracking-wider">
          Inquiries & Collaboration
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#172238] tracking-tight">
          Connect with the VeyraSense Team
        </h1>
        <p className="text-sm sm:text-base text-[#718096] leading-relaxed">
          Questions regarding edge sensor telemetry, physical challenge protocols, or platform architecture? Send our engineering team an inquiry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info Side Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="clay-surface p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#172238] mb-2 tracking-tight">
                Project & Research Office
              </h2>
              <p className="text-xs sm:text-sm text-[#718096] leading-relaxed">
                VeyraSense is developed under the AIoT Course Project framework focusing on resilient Cyber-Physical Sensing Systems.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F7F7F0]">
                <div className="p-2 rounded-xl bg-white text-[#172238] border border-[#ECEDE8] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#172238]">Course Project Repository</div>
                  <div className="text-[#718096] mt-0.5 font-mono">cares-iot/frontend & backend</div>
                  <div className="text-[#0C5A37] font-semibold mt-1">Autonomous edge research</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F7F7F0]">
                <div className="p-2 rounded-xl bg-white text-[#172238] border border-[#ECEDE8] shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#172238]">Physical Testbed Laboratory</div>
                  <div className="text-[#718096] mt-0.5">Edge Transducer Array Integration</div>
                  <div className="text-[#718096]">ESP32, JSN-SR04T, MQ-135, YF-S201</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F7F7F0]">
                <div className="p-2 rounded-xl bg-white text-[#172238] border border-[#ECEDE8] shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#172238]">Gateway Target</div>
                  <div className="text-[#718096] mt-0.5">
                    Raspberry Pi 5 ARM64 running Mosquitto MQTT & FastAPI
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#ECEDE8]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#718096]">Platform State:</span>
                <StatusBadge status="online" label="Production Ready" size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form Card */}
        <div className="lg:col-span-7">
          <div className="clay-surface p-8 sm:p-10">
            {submitStatus === 'success' ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#E8FAF1] text-[#0C5A37] flex items-center justify-center mx-auto border border-[#78E9AD]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-[#172238]">
                  Inquiry Received
                </h3>
                <p className="text-xs sm:text-sm text-[#718096] max-w-md mx-auto leading-relaxed">
                  Thank you, <strong>{formData.fullName}</strong>. Your inquiry has been documented for the engineering team.
                </p>
                <div className="p-4 rounded-2xl bg-[#F7F7F0] border border-[#ECEDE8] max-w-md mx-auto text-left text-xs font-mono text-[#172238] space-y-1">
                  <div><strong>Email:</strong> {formData.email}</div>
                  <div><strong>Subject:</strong> {formData.subject}</div>
                  <div className="truncate"><strong>Message:</strong> {formData.message}</div>
                </div>
                <div className="pt-4">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleReset}
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                  >
                    Send Another Inquiry
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <Input
                  label="Full Name"
                  name="fullName"
                  placeholder="e.g. Dr. Alex Mercer"
                  value={formData.fullName}
                  onChange={handleChange}
                  error={errors.fullName}
                  required
                />

                <Input
                  label="Work / Academic Email"
                  name="email"
                  type="email"
                  placeholder="alex.mercer@institution.org"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                />

                <Input
                  label="Subject"
                  name="subject"
                  placeholder="e.g. Edge Hardware Inquiry / LoRa Integration"
                  value={formData.subject}
                  onChange={handleChange}
                  error={errors.subject}
                  required
                />

                <div>
                  <label
                    htmlFor="message"
                    className="block text-xs font-semibold text-[#172238] uppercase tracking-wider mb-1.5"
                  >
                    Message <span className="text-[#EF6461]">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Describe your sensor hardware topology, deployment environment, or question..."
                    className={`w-full bg-[#FFFFFF] text-[#172238] placeholder-[#718096]/60 text-sm rounded-xl border ${
                      errors.message
                        ? 'border-[#EF6461] focus:ring-[#EF6461]'
                        : 'border-[#ECEDE8] hover:border-[#CBD5E1] focus:border-[#FFD21C]'
                    } px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD21C]/50`}
                  />
                  {errors.message ? (
                    <p className="mt-1 text-xs text-[#EF6461] font-medium flex items-center gap-1">
                      <span>•</span> {errors.message}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[#718096]">
                      Minimum 15 characters required.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isSubmitting}
                    rightIcon={<Send className="w-4 h-4" />}
                  >
                    Submit Inquiry
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
