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
    leadEngineer: 'Dr. M. Vance',
  },
  {
    id: 'quality-control',
    name: 'Quality Control',
    code: 'QC',
    description: 'Precision dimension, purity, acoustic ringdown, and tolerance verification',
    leadEngineer: 'Sarah Jenkins',
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    code: 'MNT',
    description: 'Predictive machinery vibration, pump wear, and bearing degradation analysis',
    leadEngineer: 'Carlos Ramos',
  },
  {
    id: 'utilities',
    name: 'Utilities',
    code: 'UTL',
    description: 'Hydraulic drainage networks, cooling towers, power distribution, and manholes',
    leadEngineer: 'T. Thorne',
  },
  {
    id: 'storage-warehouse',
    name: 'Storage & Warehouse',
    code: 'STG',
    description: 'Ambient environmental climate, cold chain storage, and sealed vessel integrity',
    leadEngineer: 'Elena Rostova',
  },
  {
    id: 'environmental-monitoring',
    name: 'Environmental Monitoring',
    code: 'ENV',
    description: 'Toxic gas emission detection, stormwater runoff, and ambient atmospheric quality',
    leadEngineer: 'Dr. K. Patel',
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
}

export const MOCK_SENSOR_NODES: SensorTelemetryItem[] = [
  // Production
  {
    id: 'NODE-PRD-01',
    sensorType: 'Ultrasonic Flow Transducer',
    departmentId: 'production',
    departmentName: 'Production',
    latestMeasurement: 42.8,
    unit: 'L/min',
    healthStatus: 'healthy',
    lastReceived: '3s ago',
    varianceScore: '0.04σ (Nominal)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP32-S3 v2.4.1',
    sparkline: [40, 41, 43, 42, 42.5, 43.1, 42.8],
    hardwareModel: 'YF-S201 Hall Transducer',
  },
  {
    id: 'NODE-PRD-02',
    sensorType: 'Reactor Thermocouple',
    departmentId: 'production',
    departmentName: 'Production',
    latestMeasurement: 184.2,
    unit: '°C',
    healthStatus: 'healthy',
    lastReceived: '5s ago',
    varianceScore: '0.08σ (Nominal)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP32 v2.3.0',
    sparkline: [180, 182, 183.5, 184, 184.5, 184.2],
    hardwareModel: 'MAX6675 Type-K Probe',
  },
  {
    id: 'NODE-PRD-03',
    sensorType: 'Hydraulic Line Pressure',
    departmentId: 'production',
    departmentName: 'Production',
    latestMeasurement: 6.4,
    unit: 'bar',
    healthStatus: 'warning',
    lastReceived: '12s ago',
    varianceScore: '2.14σ (Drift Detected)',
    protocol: 'Modbus RTU / RS485',
    firmware: 'ESP32 v2.4.1',
    sparkline: [6.1, 6.2, 6.5, 6.8, 6.4, 6.9, 6.4],
    hardwareModel: 'Keller 21Y Pressure Cell',
  },

  // Quality Control
  {
    id: 'NODE-QC-01',
    sensorType: 'Optical Distance Profiler',
    departmentId: 'quality-control',
    departmentName: 'Quality Control',
    latestMeasurement: 12.04,
    unit: 'mm',
    healthStatus: 'healthy',
    lastReceived: '1s ago',
    varianceScore: '0.01σ (Nominal)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP32-S3 v2.4.1',
    sparkline: [12.02, 12.03, 12.04, 12.05, 12.04],
    hardwareModel: 'VL53L1X ToF Sensor',
  },
  {
    id: 'NODE-QC-02',
    sensorType: 'Chamber Humidity & Temp',
    departmentId: 'quality-control',
    departmentName: 'Quality Control',
    latestMeasurement: 45.2,
    unit: '%RH',
    healthStatus: 'healthy',
    lastReceived: '6s ago',
    varianceScore: '0.05σ (Nominal)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP8266 v1.9.4',
    sparkline: [44.8, 45.0, 45.1, 45.3, 45.2],
    hardwareModel: 'Bosch BME280',
  },

  // Maintenance
  {
    id: 'NODE-MNT-01',
    sensorType: 'Pump Bearing Accelerometer',
    departmentId: 'maintenance',
    departmentName: 'Maintenance',
    latestMeasurement: 0.18,
    unit: 'g (RMS)',
    healthStatus: 'healthy',
    lastReceived: '2s ago',
    varianceScore: '0.12σ (Nominal)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP32 v2.4.0',
    sparkline: [0.15, 0.16, 0.17, 0.19, 0.18],
    hardwareModel: 'ADXL345 3-Axis',
  },
  {
    id: 'NODE-MNT-02',
    sensorType: 'Drive Motor Current',
    departmentId: 'maintenance',
    departmentName: 'Maintenance',
    latestMeasurement: 14.8,
    unit: 'A',
    healthStatus: 'alert',
    lastReceived: '28s ago',
    varianceScore: '3.88σ (Phase Surge)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP32 v2.4.1',
    sparkline: [12.1, 12.4, 13.0, 15.2, 16.4, 14.8],
    hardwareModel: 'ACS712 Current Transducer',
  },

  // Utilities
  {
    id: 'NODE-UTL-01',
    sensorType: 'Drainage Water Level',
    departmentId: 'utilities',
    departmentName: 'Utilities',
    latestMeasurement: 18.4,
    unit: 'cm',
    healthStatus: 'calibrating',
    lastReceived: '4s ago',
    varianceScore: '1.42σ (Echo Ringdown)',
    protocol: 'LoRaWAN / SX1278',
    firmware: 'ESP32 LoRa v2.1',
    sparkline: [17.5, 17.8, 18.0, 18.6, 18.4],
    hardwareModel: 'JSN-SR04T Waterproof Echo',
  },
  {
    id: 'NODE-UTL-02',
    sensorType: 'Manhole Cover Security',
    departmentId: 'utilities',
    departmentName: 'Utilities',
    latestMeasurement: 'SECURE',
    unit: 'Status',
    healthStatus: 'healthy',
    lastReceived: '1m ago',
    varianceScore: '0.00σ (Discrete Reed)',
    protocol: 'LoRaWAN / SX1278',
    firmware: 'ESP32 LoRa v2.1',
    sparkline: [1, 1, 1, 1, 1],
    hardwareModel: 'Magnetic Dry Contact Reed',
  },
  {
    id: 'NODE-UTL-03',
    sensorType: 'Culvert Water Flow Rate',
    departmentId: 'utilities',
    departmentName: 'Utilities',
    latestMeasurement: 88.5,
    unit: 'L/min',
    healthStatus: 'healthy',
    lastReceived: '8s ago',
    varianceScore: '0.09σ (Nominal)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP32-S3 v2.4.1',
    sparkline: [82, 85, 87, 88, 89, 88.5],
    hardwareModel: 'YF-B7 Brass Hall Sensor',
  },

  // Storage & Warehouse
  {
    id: 'NODE-STG-01',
    sensorType: 'Cold Vault Cryo-Probe',
    departmentId: 'storage-warehouse',
    departmentName: 'Storage & Warehouse',
    latestMeasurement: -18.6,
    unit: '°C',
    healthStatus: 'healthy',
    lastReceived: '10s ago',
    varianceScore: '0.03σ (Nominal)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP8266 v1.9.4',
    sparkline: [-18.8, -18.7, -18.6, -18.5, -18.6],
    hardwareModel: 'DS18B20 1-Wire Digital',
  },
  {
    id: 'NODE-STG-02',
    sensorType: 'Refrigerant Leak Gas Detector',
    departmentId: 'storage-warehouse',
    departmentName: 'Storage & Warehouse',
    latestMeasurement: 28,
    unit: 'ppm',
    healthStatus: 'healthy',
    lastReceived: '14s ago',
    varianceScore: '0.07σ (Nominal)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP32 v2.4.1',
    sparkline: [26, 27, 28, 27, 28],
    hardwareModel: 'MQ-135 Multi-Gas Element',
  },

  // Environmental Monitoring
  {
    id: 'NODE-ENV-01',
    sensorType: 'Atmospheric Gas & Air Quality',
    departmentId: 'environmental-monitoring',
    departmentName: 'Environmental Monitoring',
    latestMeasurement: 142,
    unit: 'ppm',
    healthStatus: 'healthy',
    lastReceived: '7s ago',
    varianceScore: '0.11σ (Nominal)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP32 v2.4.1',
    sparkline: [138, 140, 145, 143, 142],
    hardwareModel: 'MQ-135 Semiconductor',
  },
  {
    id: 'NODE-ENV-02',
    sensorType: 'Methane Trace Analyzer',
    departmentId: 'environmental-monitoring',
    departmentName: 'Environmental Monitoring',
    latestMeasurement: 12,
    unit: 'ppm',
    healthStatus: 'healthy',
    lastReceived: '15s ago',
    varianceScore: '0.04σ (Nominal)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP32 v2.4.1',
    sparkline: [11, 12, 12, 13, 12],
    hardwareModel: 'MQ-4 Combustible Gas',
  },

  // R&D
  {
    id: 'NODE-RND-01',
    sensorType: 'Multi-Modal Testbed Manhole Hub',
    departmentId: 'research-development',
    departmentName: 'Research & Development',
    latestMeasurement: 99.4,
    unit: '% Fidelity',
    healthStatus: 'healthy',
    lastReceived: '1s ago',
    varianceScore: '0.02σ (Bench Validated)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP32 Dual-Core v3.0-dev',
    sparkline: [98.8, 99.0, 99.2, 99.5, 99.4],
    hardwareModel: '3D-Printed Smart Manhole Prototype',
  },
  {
    id: 'NODE-RND-02',
    sensorType: 'Acoustic Impedance Probe',
    departmentId: 'research-development',
    departmentName: 'Research & Development',
    latestMeasurement: 4.22,
    unit: 'kΩ',
    healthStatus: 'calibrating',
    lastReceived: '3s ago',
    varianceScore: '0.18σ (Challenge Pulse Active)',
    protocol: 'MQTT / Port 1883',
    firmware: 'ESP32 Dual-Core v3.0-dev',
    sparkline: [4.18, 4.20, 4.25, 4.21, 4.22],
    hardwareModel: 'Active PZT Ringdown Exciter',
  },
];

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

export function getDepartmentMetrics(deptId: string): DepartmentMetrics {
  const nodes =
    deptId === 'all'
      ? MOCK_SENSOR_NODES
      : MOCK_SENSOR_NODES.filter((n) => n.departmentId === deptId);

  const registeredNodes = nodes.length;
  const onlineNodes = nodes.filter(
    (n) => n.healthStatus === 'healthy' || n.healthStatus === 'calibrating' || n.healthStatus === 'warning'
  ).length;
  const activeInvestigations = nodes.filter(
    (n) => n.healthStatus === 'warning' || n.healthStatus === 'alert'
  ).length;
  const sensorFaultCount = nodes.filter((n) => n.healthStatus === 'alert').length;
  const validatedRecoveries = Math.max(1, Math.round(registeredNodes * 1.8));

  const healthPercent =
    registeredNodes > 0
      ? Math.round((onlineNodes / registeredNodes) * 1000) / 10
      : 99.2;

  return {
    registeredNodes,
    onlineNodes,
    activeInvestigations,
    sensorFaultCount,
    validatedRecoveries,
    networkHealthPercent: healthPercent,
    communicationHealthPercent: 99.8,
    measurementQualityPercent: 98.6,
    lastReceiptTime: '1.2s ago',
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

export const MOCK_ACTIVITY_LOGS: ActivityEvent[] = [
  {
    id: 'ACT-901',
    type: 'recovery',
    title: 'Recovery Candidate Validated',
    description: 'Synthesized 18.2 cm water level via neighbour correlation & temporal ARIMA model after acoustic blockage.',
    timestamp: '2 mins ago',
    departmentId: 'utilities',
    departmentName: 'Utilities',
    nodeId: 'NODE-UTL-01',
    severity: 'healthy',
  },
  {
    id: 'ACT-902',
    type: 'investigation',
    title: 'Investigation Initiated',
    description: 'Phase current spike residual > 3.8σ tripped automatic hardware challenge protocol on drive motor.',
    timestamp: '8 mins ago',
    departmentId: 'maintenance',
    departmentName: 'Maintenance',
    nodeId: 'NODE-MNT-02',
    severity: 'alert',
  },
  {
    id: 'ACT-903',
    type: 'telemetry',
    title: 'Measurement Ingested',
    description: 'Nominal telemetry burst received via Mosquitto MQTT: 42.8 L/min flow rate verified.',
    timestamp: '14 mins ago',
    departmentId: 'production',
    departmentName: 'Production',
    nodeId: 'NODE-PRD-01',
    severity: 'communicating',
  },
  {
    id: 'ACT-904',
    type: 'registration',
    title: 'Node Registered to Local Gateway',
    description: 'New physical manhole prototype cluster authenticated using local edge token.',
    timestamp: '28 mins ago',
    departmentId: 'research-development',
    departmentName: 'Research & Development',
    nodeId: 'NODE-RND-01',
    severity: 'healthy',
  },
  {
    id: 'ACT-905',
    type: 'investigation',
    title: 'Investigation Initiated',
    description: 'Hydraulic line pressure variance threshold tripped (2.14σ). Residual tracking active.',
    timestamp: '42 mins ago',
    departmentId: 'production',
    departmentName: 'Production',
    nodeId: 'NODE-PRD-03',
    severity: 'warning',
  },
];
