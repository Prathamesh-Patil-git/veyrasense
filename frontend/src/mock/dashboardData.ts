export interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
  description: string;
  leadEngineer: string;
}

export const DEPARTMENTS: DepartmentInfo[] = [
  {
    id: 'all',
    name: 'All Departments',
    code: 'ALL',
    description: 'Fleet-wide sensor surveillance across all operational facilities',
    leadEngineer: 'System Administrator',
  },
  {
    id: 'production',
    name: 'Production',
    code: 'PRD',
    description: 'Continuous chemical synthesis, assembly lines, and reactor vessel monitoring',
    leadEngineer: 'Production Operator',
  },
  {
    id: 'quality-control',
    name: 'Quality Control',
    code: 'QC',
    description: 'Precision dimension, purity, acoustic ringdown, and tolerance verification',
    leadEngineer: 'QC Lead',
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    code: 'MNT',
    description: 'Predictive machinery vibration, pump wear, and bearing degradation analysis',
    leadEngineer: 'Plant Maintenance',
  },
  {
    id: 'utilities',
    name: 'Utilities',
    code: 'UTL',
    description: 'Hydraulic drainage networks, cooling towers, power distribution, and manholes',
    leadEngineer: 'Utilities Lead',
  },
  {
    id: 'storage-warehouse',
    name: 'Storage & Warehouse',
    code: 'STG',
    description: 'Ambient environmental climate, cold chain storage, and sealed vessel integrity',
    leadEngineer: 'Facility Lead',
  },
  {
    id: 'environmental-monitoring',
    name: 'Environmental Monitoring',
    code: 'ENV',
    description: 'Toxic gas emission detection, stormwater runoff, and ambient atmospheric quality',
    leadEngineer: 'Safety & Compliance Lead',
  },
  {
    id: 'research-development',
    name: 'Research & Development',
    code: 'RND',
    description: 'Experimental AIoT sensor challenge-response validation testbed',
    leadEngineer: 'AIoT Research Lab',
  },
];

export interface SensorTelemetryItem {
  id: string;
  sensorType: string;
  departmentId: string;
  departmentName: string;
  latestMeasurement: number | string;
  unit: string;
  healthStatus: 'healthy' | 'warning' | 'alert' | 'calibrating' | 'offline';
  lastReceived: string;
  varianceScore: string;
  protocol: string;
  firmware: string;
  sparkline: number[];
  hardwareModel: string;
  sensorChannels?: string[];
}

// Global empty state: All operational data must come from real backend responses
export const MOCK_SENSOR_NODES: SensorTelemetryItem[] = [];

export interface DepartmentMetrics {
  registeredNodes: number;
  onlineNodes: number;
  activeInvestigations: number;
  validatedRecoveries: number;
  networkHealthPercent: number;
  communicationHealthPercent: number;
  measurementQualityPercent: number;
  sensorFaultCount: number;
  lastReceiptTime: string;
}

export function getDepartmentMetrics(_deptId: string): DepartmentMetrics {
  return {
    registeredNodes: 0,
    onlineNodes: 0,
    activeInvestigations: 0,
    sensorFaultCount: 0,
    validatedRecoveries: 0,
    networkHealthPercent: 100,
    communicationHealthPercent: 100,
    measurementQualityPercent: 100,
    lastReceiptTime: 'No transmissions yet',
  };
}

export interface ActivityEvent {
  id: string;
  type: 'registration' | 'telemetry' | 'investigation' | 'recovery';
  title: string;
  description: string;
  timestamp: string;
  departmentId: string;
  departmentName: string;
  nodeId: string;
  severity: 'healthy' | 'warning' | 'alert' | 'communicating';
}

export const MOCK_ACTIVITY_LOGS: ActivityEvent[] = [];
