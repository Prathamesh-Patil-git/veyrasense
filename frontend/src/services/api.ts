/**
 * VeyraSense API Client Service
 * Connects React Frontend to FastAPI Edge Backend with JWT Bearer Authentication
 */

export interface ApiHealth {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

export interface ApiDepartment {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  node_count: number;
  online_count: number;
  health_percentage: number;
}

export interface ApiNode {
  environment: 'real' | 'demo';
  sensor_types?: string[];
  id: number;
  node_id: string;
  name: string;
  department_id: number;
  department_name?: string;
  hardware_type: string;
  firmware_version: string;
  location?: string;
  status: string;
  provisioning_status?: 'pending' | 'connected' | 'offline' | 'revoked';
  is_active: boolean;
  registered_at: string;
  last_seen_at?: string;
  has_api_key?: boolean;
  mqtt_username?: string;
  credentials_rotated_at?: string;
  revoked_at?: string;
}

export interface ApiNodeProvisionRequest {
  node_id?: string;
  name: string;
  department_id: number;
  location?: string;
  hardware_type?: string;
  sensor_types?: string[];
  protocol?: string;
}

export interface ApiNodeUpdate {
  name?: string;
  department_id?: number;
  hardware_type?: string;
  firmware_version?: string;
  location?: string | null;
}

export interface ApiNodeProvisionResponse {
  node_id: string;
  name: string;
  department_id: number;
  department_name?: string;
  hardware_type: string;
  location?: string;
  provisioning_status: string;
  protocol: string;
  api_key: string;
  mqtt_username: string;
  mqtt_password: string;
  mqtt_broker_host: string;
  mqtt_broker_port: number;
  mqtt_topic_telemetry: string;
  mqtt_topic_status: string;
  mqtt_topic_commands: string;
  sensors_attached: string[];
  firmware_config_snippet: string;
  warning: string;
}

export interface ApiNodeRotateCredentialsResponse {
  node_id: string;
  api_key: string;
  mqtt_username: string;
  mqtt_password: string;
  credentials_rotated_at: string;
  firmware_config_snippet: string;
  warning: string;
}

export interface ApiNodeMqttCredentialsResponse {
  node_id: string;
  mqtt_username: string;
  mqtt_password: string;
  mqtt_broker_host: string;
  mqtt_broker_port: number;
  mqtt_topic_telemetry: string;
  mqtt_topic_status: string;
  mqtt_topic_commands: string;
  credentials_rotated_at: string;
  provisioning_status: string;
  warning: string;
}

export interface ApiNodeRevokeResponse {
  node_id: string;
  status: string;
  provisioning_status: string;
  is_active: boolean;
  revoked_at: string;
  message: string;
}

export interface ApiNodeAuditResponse {
  id: number;
  timestamp: string;
  action: string;
  entity_id: string;
  actor: string;
  details?: string;
  ip_address?: string;
}

export interface ApiAdminProfile {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface ApiMetricSummary {
  label: string;
  value: number | string;
  unit: string;
  change: string;
  change_type: 'positive' | 'neutral' | 'negative';
  timeframe: string;
  accent: string;
  is_demo: boolean;
  sparkline: number[];
}

export interface ApiRecentTelemetry {
  id: string;
  sensor_type: string;
  department_id: number | string;
  department_name: string;
  latest_measurement: number | string;
  unit: string;
  health_status: 'healthy' | 'warning' | 'alert' | 'calibrating' | 'offline';
  last_received: string;
  variance_score?: number | null;
  confidence_level?: number | null;
}

export interface ApiActivityEvent {
  id: string;
  timestamp: string;
  node_id: string;
  event_type: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'alert';
  department_id: number | string;
}

export interface ApiDashboardOverview {
  environment: 'real' | 'demo';
  registered_nodes: number;
  online_nodes: number;
  active_investigations: number;
  validated_recoveries: number;
  network_health_percent: number;
  communication_health_percent: number;
  measurement_quality_percent: number;
  sensor_fault_count: number;
  active_department_name: string;
  active_department_id: number | string;
  metrics: ApiMetricSummary[];
  recent_telemetry: ApiRecentTelemetry[];
  recent_activity: ApiActivityEvent[];
  server_time: string;
  is_live_backend: boolean;
}

export interface ApiScenario {
  id: string;
  name: string;
  fault?: string | null;
  expected: string;
  duration_steps: number;
  hypotheses: Record<string, number>;
}
export interface ApiScenarioRun {
  id: number;
  scenario_id: string;
  node_id: string;
  environment: 'demo';
  status: string;
  step_index: number;
  duration_steps: number;
  speed: number;
  expected: { name: string; expected: string; hypotheses: Record<string, number> };
  actual?: { detected_anomalies: string[]; hypotheses: string[]; recovery_decisions: string[]; trusted_measurements: number; evidence_records: number };
}
export interface ApiResearchRecord {
  id: number;
  environment: 'real' | 'demo';
  record_type: string;
  node_id: string;
  measurement_id?: number | null;
  related_record_id?: number | null;
  payload: Record<string, any>;
  created_at: string;
}
export interface ApiResearchSummary {
  environment: 'real' | 'demo'; measurements: number; anomalies: number; hypothesis_analyses: number;
  evidence_records: number; active_investigations: number; response_fingerprints: number;
  recovery_candidates: number; recovery_validation: Record<string, number>;
  trusted_measurements: number; trusted_measurement_coverage: number | null;
  evaluation: Record<string, number | string | null> | null;
}
export interface ApiMeasurement {
  id: number; node_id: number; node_identifier?: string; measurement_type: string; value: number;
  unit: string; measured_at: string; environment: 'real' | 'demo'; quality: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in_seconds: number;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Load persisted token if present
    try {
      this.token = localStorage.getItem('veyrasense_token');
    } catch {
      this.token = null;
    }
  }

  setToken(token: string | null) {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem('veyrasense_token', token);
      } else {
        localStorage.removeItem('veyrasense_token');
      }
    } catch {
      // Storage unavailable
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorText = await response.text();
        let message = `API request failed with status ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.detail) message = parsed.detail;
        } catch {
          if (errorText) message = errorText;
        }
        throw new Error(message);
      }
      return await response.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Connection refused: Backend server is offline or unreachable at ' + this.baseUrl);
      }
      throw err;
    }
  }

  async login(email: string, password: string): Promise<TokenResponse> {
    const data = await this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async logout(): Promise<void> {
    try {
      if (this.token) {
        await this.request('/auth/logout', { method: 'POST' });
      }
    } finally {
      this.setToken(null);
    }
  }

  async getMe(): Promise<ApiAdminProfile> {
    return this.request<ApiAdminProfile>('/auth/me');
  }

  async getHealth(): Promise<ApiHealth> {
    return this.request<ApiHealth>('/health');
  }

  async getDepartments(environment: 'real' | 'demo' = 'real'): Promise<ApiDepartment[]> {
    return this.request<ApiDepartment[]>(`/departments?environment=${environment}`);
  }

  async getNodes(departmentId?: number | string, environment: 'real' | 'demo' = 'real'): Promise<ApiNode[]> {
    const params = new URLSearchParams({ environment });
    if (departmentId && departmentId !== 'all') params.set('department_id', String(departmentId));
    const query = `?${params.toString()}`;
    return this.request<ApiNode[]>(`/nodes${query}`);
  }

  async updateNode(nodeId: string, data: ApiNodeUpdate): Promise<ApiNode> {
    return this.request<ApiNode>(`/nodes/${encodeURIComponent(nodeId)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getDashboardOverview(departmentId?: number | string, environment: 'real' | 'demo' = 'real'): Promise<ApiDashboardOverview> {
    const params = new URLSearchParams({ environment });
    if (departmentId && departmentId !== 'all') params.set('department_id', String(departmentId));
    const query = `?${params.toString()}`;
    return this.request<ApiDashboardOverview>(`/dashboard/overview${query}`);
  }

  async getScenarios(): Promise<ApiScenario[]> {
    return this.request<ApiScenario[]>('/scenarios');
  }
  async startScenario(scenarioId: string, speed = 1): Promise<ApiScenarioRun> {
    return this.request<ApiScenarioRun>('/scenarios/runs', { method: 'POST', body: JSON.stringify({ scenario_id: scenarioId, speed }) });
  }
  async getScenarioRuns(): Promise<ApiScenarioRun[]> {
    return this.request<ApiScenarioRun[]>('/scenarios/runs?limit=50');
  }
  async controlScenario(runId: number, command: 'pause' | 'resume' | 'stop' | 'reset' | 'replay', speed?: number): Promise<ApiScenarioRun> {
    return this.request<ApiScenarioRun>(`/scenarios/runs/${runId}/control`, { method: 'POST', body: JSON.stringify({ command, speed }) });
  }
  async stepScenario(runId: number): Promise<ApiScenarioRun> {
    return this.request<ApiScenarioRun>(`/scenarios/runs/${runId}/step`, { method: 'POST' });
  }
  async getResearchRecords(environment: 'real' | 'demo', recordType?: string): Promise<ApiResearchRecord[]> {
    const params = new URLSearchParams({ environment });
    if (recordType) params.set('record_type', recordType);
    return this.request<ApiResearchRecord[]>(`/research/records?${params.toString()}`);
  }
  async getResearchSummary(environment: 'real' | 'demo'): Promise<ApiResearchSummary> {
    return this.request<ApiResearchSummary>(`/research/summary?environment=${environment}`);
  }
  async getMeasurements(environment: 'real' | 'demo', nodeId?: number): Promise<{ total: number; items: ApiMeasurement[] }> {
    const params = new URLSearchParams({ environment, limit: '100' });
    if (nodeId != null) params.set('node_id', String(nodeId));
    return this.request<{ total: number; items: ApiMeasurement[] }>(`/measurements?${params.toString()}`);
  }

  async provisionNode(data: ApiNodeProvisionRequest): Promise<ApiNodeProvisionResponse> {
    return this.request<ApiNodeProvisionResponse>('/nodes/provision', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async rotateNodeCredentials(nodeId: string): Promise<ApiNodeRotateCredentialsResponse> {
    return this.request<ApiNodeRotateCredentialsResponse>(`/nodes/${nodeId}/rotate-credentials`, {
      method: 'POST',
    });
  }

  async renewNodeMqttCredentials(nodeId: string): Promise<ApiNodeMqttCredentialsResponse> {
    return this.request<ApiNodeMqttCredentialsResponse>(`/nodes/${nodeId}/mqtt-credentials`, {
      method: 'POST',
    });
  }

  async revokeNode(nodeId: string): Promise<ApiNodeRevokeResponse> {
    return this.request<ApiNodeRevokeResponse>(`/nodes/${nodeId}/revoke`, {
      method: 'POST',
    });
  }

  async activateNode(nodeId: string): Promise<ApiNode> {
    return this.request<ApiNode>(`/nodes/${nodeId}/activate`, {
      method: 'POST',
    });
  }

  async getNodeAudit(nodeId: string): Promise<ApiNodeAuditResponse[]> {
    return this.request<ApiNodeAuditResponse[]>(`/nodes/${nodeId}/audit`);
  }
}

export const api = new ApiService();
