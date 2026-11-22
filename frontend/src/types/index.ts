export interface ServiceItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  accentColor: 'yellow' | 'mint' | 'blue';
  icon: string;
  badge?: string;
  inputs: string;
  outputs: string;
}

export interface MetricItem {
  id: string;
  label: string;
  value: string;
  unit?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  status: 'online' | 'warning' | 'calibrating' | 'offline';
  sparklineData?: number[];
}

export interface ContactFormData {
  fullName: string;
  email: string;
  subject: string;
  message: string;
  facilityType?: string;
}

export interface FormValidationErrors {
  [key: string]: string | undefined;
}
