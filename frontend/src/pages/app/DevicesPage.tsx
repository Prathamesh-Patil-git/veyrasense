import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Plus,
  RefreshCw,
  Key,
  ShieldAlert,
  CheckCircle2,
  Copy,
  AlertTriangle,
  FileCode,
  History,
  Pencil,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  ApiNode,
  ApiDepartment,
  ApiNodeProvisionResponse,
  ApiNodeRotateCredentialsResponse,
  ApiNodeAuditResponse,
} from '../../services/api';
import { Button } from '../../components/ui/Button';
import { useEnvironment } from '../../context/EnvironmentContext';

// Utility to generate candidate node ID for the form
function generateCandidateNodeId(prefix: string = 'ESP32'): string {
  const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
  const clean = prefix.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase() || 'ESP32';
  return `NODE-${clean}-${hex}`;
}

const nowIso = new Date().toISOString();

const DEFAULT_CORE_DEPARTMENTS: ApiDepartment[] = [
  { id: 1, name: 'Production', description: 'Continuous chemical synthesis and assembly', is_active: true, node_count: 0, online_count: 0, health_percentage: 100, created_at: nowIso, updated_at: nowIso },
  { id: 2, name: 'Quality Control', description: 'Precision dimension and test benches', is_active: true, node_count: 0, online_count: 0, health_percentage: 100, created_at: nowIso, updated_at: nowIso },
  { id: 3, name: 'Maintenance', description: 'Machinery vibration and bearings', is_active: true, node_count: 0, online_count: 0, health_percentage: 100, created_at: nowIso, updated_at: nowIso },
  { id: 4, name: 'Utilities', description: 'Hydraulic drainage and chillers', is_active: true, node_count: 0, online_count: 0, health_percentage: 100, created_at: nowIso, updated_at: nowIso },
  { id: 5, name: 'Storage & Warehouse', description: 'Climate storage and bay humidity', is_active: true, node_count: 0, online_count: 0, health_percentage: 100, created_at: nowIso, updated_at: nowIso },
  { id: 6, name: 'Environmental Monitoring', description: 'Emissions and toxic gas detection', is_active: true, node_count: 0, online_count: 0, health_percentage: 100, created_at: nowIso, updated_at: nowIso },
  { id: 7, name: 'Research & Development', description: 'Experimental AIoT sensor testbed', is_active: true, node_count: 0, online_count: 0, health_percentage: 100, created_at: nowIso, updated_at: nowIso },
];

export const DevicesPage: React.FC = () => {
  const { environment } = useEnvironment();
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [departments, setDepartments] = useState<ApiDepartment[]>(DEFAULT_CORE_DEPARTMENTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showProvisionModal, setShowProvisionModal] = useState<boolean>(false);
  const [provisionSuccessData, setProvisionSuccessData] = useState<ApiNodeProvisionResponse | null>(null);
  const [rotationSuccessData, setRotationSuccessData] = useState<ApiNodeRotateCredentialsResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<ApiNodeAuditResponse[] | null>(null);
  const [selectedAuditNodeId, setSelectedAuditNodeId] = useState<string | null>(null);

  // Provisioning Form State
  const [formName, setFormName] = useState('');
  const [formDeptId, setFormDeptId] = useState<number>(1);
  const [formLocation, setFormLocation] = useState('');
  const [formNodeId, setFormNodeId] = useState(generateCandidateNodeId('PRD'));
  const [formHardware, setFormHardware] = useState('ESP32-WROOM-32');
  const [formProtocol, setFormProtocol] = useState('mqtt');
  const [sensorDHT11, setSensorDHT11] = useState(true);
  const [sensorMQ135, setSensorMQ135] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<ApiNode | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    department_id: 1,
    hardware_type: '',
    firmware_version: '',
    location: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);

  const fetchNodesAndDepts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nodesData, deptsData] = await Promise.all([
        api.getNodes(undefined, environment),
        api.getDepartments(environment),
      ]);
      setNodes(nodesData);
      const effectiveDepts = deptsData.length > 0 ? deptsData : DEFAULT_CORE_DEPARTMENTS;
      setDepartments(effectiveDepts);
      setFormDeptId((current) => {
        const exists = effectiveDepts.some((d) => d.id === current);
        return exists ? current : effectiveDepts[0].id;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with gateway backend.');
    } finally {
      setLoading(false);
    }
  }, [environment]);

  useEffect(() => {
    fetchNodesAndDepts();
  }, [fetchNodesAndDepts]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRegenerateNodeId = () => {
    const selectedDept = departments.find((d) => d.id === Number(formDeptId));
    const prefix = selectedDept ? selectedDept.name.substring(0, 3) : 'ESP32';
    setFormNodeId(generateCandidateNodeId(prefix));
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (environment !== 'real') return;
    if (!formName.trim()) {
      alert('Node name is required.');
      return;
    }
    const sensorList: string[] = [];
    if (sensorDHT11) sensorList.push('DHT11');
    if (sensorMQ135) sensorList.push('MQ-135');

    try {
      setSubmitting(true);
      const resp = await api.provisionNode({
        node_id: formNodeId.trim(),
        name: formName.trim(),
        department_id: Number(formDeptId),
        location: formLocation.trim() || undefined,
        hardware_type: formHardware,
        sensor_types: sensorList,
        protocol: formProtocol,
      });

      setProvisionSuccessData(resp);
      setShowProvisionModal(false);
      // Reset form
      setFormName('');
      setFormLocation('');
      handleRegenerateNodeId();
      fetchNodesAndDepts();
    } catch (err: any) {
      alert(`Provisioning failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRotateCredentials = async (nodeId: string) => {
    if (environment !== 'real') return;
    if (!window.confirm(`Are you sure you want to rotate credentials for node ${nodeId}? Any currently connected ESP32 using existing credentials will be disconnected until re-flashed.`)) {
      return;
    }
    try {
      const resp = await api.rotateNodeCredentials(nodeId);
      setRotationSuccessData(resp);
      fetchNodesAndDepts();
    } catch (err: any) {
      alert(`Rotation failed: ${err.message}`);
    }
  };

  const handleRevokeNode = async (nodeId: string) => {
    if (!window.confirm(`Remove ${nodeId} from the active fleet? Its MQTT access will be revoked. Historical telemetry will be preserved.`)) {
      return;
    }
    try {
      await api.revokeNode(nodeId);
      setNodes((current) => current.map((node) => node.node_id === nodeId
        ? { ...node, is_active: false, status: 'offline', provisioning_status: 'revoked' }
        : node));
    } catch (err: any) {
      alert(`Remove failed: ${err.message}`);
    }
  };

  const handleEditNode = (node: ApiNode) => {
    setEditingNode(node);
    setEditForm({
      name: node.name,
      department_id: node.department_id,
      hardware_type: node.hardware_type,
      firmware_version: node.firmware_version,
      location: node.location || '',
    });
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingNode) return;
    try {
      setSavingEdit(true);
      const updated = await api.updateNode(editingNode.node_id, {
        name: editForm.name.trim(),
        department_id: Number(editForm.department_id),
        hardware_type: editForm.hardware_type.trim(),
        firmware_version: editForm.firmware_version.trim(),
        location: editForm.location.trim() || null,
      });
      setNodes((current) => current.map((node) => node.node_id === updated.node_id ? updated : node));
      setEditingNode(null);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRestoreNode = async (nodeId: string) => {
    try {
      const restored = await api.activateNode(nodeId);
      setNodes((current) => current.map((node) => node.node_id === restored.node_id ? restored : node));
    } catch (err: any) {
      alert(`Could not restore ${nodeId}: ${err.message}`);
    }
  };

  const handleViewAudit = async (nodeId: string) => {
    try {
      setSelectedAuditNodeId(nodeId);
      const logs = await api.getNodeAudit(nodeId);
      setAuditLogs(logs);
    } catch (err: any) {
      alert(`Failed to load audit trail: ${err.message}`);
    }
  };

  // Helper for status badge rendering
  const renderProvisioningBadge = (status?: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] shadow-2xs">
            ● Connected
          </span>
        );
      case 'offline':
        return (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#EDEFEA] text-[#718096] shadow-2xs">
            ○ Offline
          </span>
        );
      case 'revoked':
        return (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#FDF0F0] text-[#A82824] shadow-2xs">
            ✕ Revoked
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] shadow-2xs">
            ⏳ Pending
          </span>
        );
    }
  };

  const removedCount = nodes.filter((node) => node.provisioning_status === 'revoked' || !node.is_active).length;
  const visibleNodes = nodes.filter((node) => showRemoved || (node.is_active && node.provisioning_status !== 'revoked'));

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {environment === 'demo' && <div className="rounded-xl bg-amber-100 p-4 text-sm font-bold text-amber-900">Demonstration device records are read only. Provisioning and credential changes affect real hardware and are disabled here.</div>}
      {/* Page Title & Provisioning Action Header */}
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <Cpu className="w-4 h-4 text-[#FFD21C]" />
              <span>Hardware Fleet Management</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              ESP32 Edge Transducer Provisioning & Fleet
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNodesAndDepts}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Fleet</span>
            </Button>
            {environment === 'real' && <Button
              variant="primary"
              size="sm"
              onClick={() => {
                handleRegenerateNodeId();
                setShowProvisionModal(true);
              }}
              className="clay-btn-primary flex items-center gap-2 font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>Register & Provision Node</span>
            </Button>}
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          {environment === 'demo' ? 'Simulated device records are isolated from the physical MQTT fleet. Real device provisioning and credential changes are only available in the real sensor environment.' : 'Register and manage physical ESP32 nodes connected through the existing Mosquitto MQTT broker.'}
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-[#FDF0F0] text-[#A82824] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Backend Gateway Status: {error} (Displaying local state).</span>
          </div>
        )}
      </div>

      {/* Fleet Summary Statistics Wells */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="clay-surface p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">Total Fleet</div>
          <div className="text-2xl sm:text-3xl font-black text-[#172238] mt-1">{nodes.length}</div>
          <div className="text-[10px] text-[#718096] mt-0.5">Registered Nodes</div>
        </div>
        <div className="clay-surface p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">Active MQTT</div>
          <div className="text-2xl sm:text-3xl font-black text-[#0C5A37] mt-1">
            {nodes.filter((n) => n.provisioning_status === 'connected' || n.status === 'online').length}
          </div>
          <div className="text-[10px] text-[#0C5A37] mt-0.5">Synchronized</div>
        </div>
        <div className="clay-surface p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">Pending Setup</div>
          <div className="text-2xl sm:text-3xl font-black text-[#875B00] mt-1">
            {nodes.filter((n) => n.provisioning_status === 'pending').length}
          </div>
          <div className="text-[10px] text-[#875B00] mt-0.5">Awaiting Firmware</div>
        </div>
        <div className="clay-surface p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">Revoked</div>
          <div className="text-2xl sm:text-3xl font-black text-[#A82824] mt-1">
            {nodes.filter((n) => n.provisioning_status === 'revoked' || !n.is_active).length}
          </div>
          <div className="text-[10px] text-[#A82824] mt-0.5">Access Blocked</div>
        </div>
      </div>

      {/* Node Cards Fleet Grid */}
      {removedCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowRemoved((value) => !value)}
            className="text-xs font-semibold text-[#134685] hover:underline"
          >
            {showRemoved ? 'Hide' : 'Show'} removed devices ({removedCount})
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleNodes.map((node) => {
          const isRevoked = node.provisioning_status === 'revoked' || !node.is_active;
          return (
            <div
              key={node.node_id}
              className={`clay-surface-interactive p-6 space-y-4 flex flex-col justify-between ${
                isRevoked ? 'opacity-75 bg-[#F9F9F6]' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#F2F3EE]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-[#172238]">{node.node_id}</span>
                  </div>
                  {renderProvisioningBadge(node.provisioning_status)}
                </div>

                <div className="mt-3 space-y-1">
                  <div className="font-bold text-sm text-[#172238]">{node.name}</div>
                  <div className="text-xs text-[#5A687C] flex items-center justify-between">
                    <span>{node.department_name || 'General Department'}</span>
                    <span className="font-mono text-[11px] text-[#718096]">{node.hardware_type}</span>
                  </div>
                  {node.location && (
                    <div className="text-[11px] text-[#718096] italic">Location: {node.location}</div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs clay-recessed p-3.5 mt-4">
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Firmware:</span>
                    <span className="font-mono font-semibold text-[#172238]">{node.firmware_version}</span>
                  </div>
                  {node.sensor_types?.length ? <div className="flex justify-between gap-3"><span className="text-[#718096]">Sensors:</span><span className="text-right font-semibold text-[#172238]">{node.sensor_types.join(', ')}</span></div> : null}
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Protocol:</span>
                    <span className="font-semibold text-[#172238]">MQTT (Port 1883)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718096]">MQTT Topic:</span>
                    <span className="font-mono text-[10px] text-[#134685] truncate max-w-[170px]">
                      .../{node.node_id}/telemetry
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Last Heartbeat:</span>
                    <span className="text-[#0C5A37] font-semibold">
                      {node.last_seen_at ? new Date(node.last_seen_at).toLocaleTimeString() : 'Never seen'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Node Card Actions */}
              <div className="pt-3 border-t border-[#F2F3EE] flex flex-wrap items-center justify-between gap-2 mt-4 text-xs">
                {environment === 'real' && <button
                  onClick={() => handleEditNode(node)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#134685] hover:text-[#0B356B]"
                  title="Edit device information"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>}
                <button
                  onClick={() => handleViewAudit(node.node_id)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#718096] hover:text-[#172238]"
                  title="View Audit Trail"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit</span>
                </button>

                {!isRevoked ? (
                  <div className="flex items-center gap-2">
                {environment === 'real' && <button
                      onClick={() => handleRotateCredentials(node.node_id)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-[#875B00] bg-[#FFF9DE] hover:bg-[#FFF3C2] transition-colors"
                      title="Rotate Node Secret"
                    >
                      Rotate
                </button>}
                    {environment === 'real' && <button
                      onClick={() => handleRevokeNode(node.node_id)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-[#A82824] bg-[#FDF0F0] hover:bg-[#FCE2E2] transition-colors"
                      title="Remove from active fleet"
                    >
                      <span className="inline-flex items-center gap-1"><Trash2 className="w-3 h-3" />Remove</span>
                    </button>}
                  </div>
                ) : (
                  environment === 'real' && <button
                    onClick={() => handleRestoreNode(node.node_id)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-[#0C5A37] bg-[#E8FAF1] hover:bg-[#D9F4E5] transition-colors"
                    title="Restore this device"
                  >
                    <span className="inline-flex items-center gap-1"><RotateCcw className="w-3 h-3" />Restore</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172238]/60 backdrop-blur-xs">
          <form onSubmit={handleEditSubmit} className="clay-surface max-w-lg w-full p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="pb-3 border-b border-[#F2F3EE]">
              <h3 className="text-xl font-black text-[#172238]">Edit Device Information</h3>
              <p className="text-xs text-[#718096] mt-1">Node ID and MQTT topics stay unchanged.</p>
              <div className="font-mono text-xs text-[#134685] mt-2">{editingNode.node_id}</div>
            </div>

            <label className="block text-xs font-bold text-[#172238]">Device name
              <input required minLength={2} maxLength={128} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1.5 w-full clay-recessed text-sm px-4 py-2.5 rounded-xl" />
            </label>
            <label className="block text-xs font-bold text-[#172238]">Department
              <select value={editForm.department_id} onChange={(e) => setEditForm({ ...editForm, department_id: Number(e.target.value) })} className="mt-1.5 w-full clay-recessed text-sm px-4 py-2.5 rounded-xl">
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-[#172238]">Hardware type
              <input required minLength={2} maxLength={64} value={editForm.hardware_type} onChange={(e) => setEditForm({ ...editForm, hardware_type: e.target.value })} className="mt-1.5 w-full clay-recessed text-sm px-4 py-2.5 rounded-xl" />
            </label>
            <label className="block text-xs font-bold text-[#172238]">Firmware version
              <input maxLength={32} value={editForm.firmware_version} onChange={(e) => setEditForm({ ...editForm, firmware_version: e.target.value })} className="mt-1.5 w-full clay-recessed text-sm px-4 py-2.5 rounded-xl" />
            </label>
            <label className="block text-xs font-bold text-[#172238]">Location
              <input maxLength={255} value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="mt-1.5 w-full clay-recessed text-sm px-4 py-2.5 rounded-xl" />
            </label>

            <div className="pt-2 border-t border-[#F2F3EE] flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingNode(null)}>Cancel</Button>
              <Button type="submit" variant="primary" size="sm" isLoading={savingEdit} className="clay-btn-primary">Save Changes</Button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          1. PROVISION NODE MODAL
          ===================================================================== */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172238]/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="clay-surface max-w-lg w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F3EE]">
              <div>
                <h3 className="text-xl font-black text-[#172238]">Register & Provision ESP32 Node</h3>
                <p className="text-xs text-[#718096]">Generate unique credentials and configure Mosquitto broker ACL.</p>
              </div>
              <button
                onClick={() => setShowProvisionModal(false)}
                className="text-slate-400 hover:text-[#172238] text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="space-y-4 text-xs">
              {/* Unique Node ID */}
              <div>
                <label className="block font-bold text-[#172238] uppercase tracking-wider text-[10px] mb-1">
                  Unique Node Identifier (ID)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formNodeId}
                    onChange={(e) => setFormNodeId(e.target.value.toUpperCase())}
                    required
                    className="clay-recessed flex-1 px-3.5 py-2.5 font-mono font-bold text-[#172238] text-xs rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateNodeId}
                    title="Generate New Random ID"
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Gen</span>
                  </Button>
                </div>
              </div>

              {/* Node Name */}
              <div>
                <label className="block font-bold text-[#172238] uppercase tracking-wider text-[10px] mb-1">
                  Node Descriptive Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Exhaust Stack VOC & Climate Monitor"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="clay-recessed w-full px-3.5 py-2.5 text-[#172238] text-xs rounded-xl"
                />
              </div>

              {/* Department & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#172238] uppercase tracking-wider text-[10px] mb-1">
                    Department
                  </label>
                  <select
                    value={formDeptId}
                    onChange={(e) => setFormDeptId(Number(e.target.value))}
                    className="clay-recessed w-full px-3 py-2 text-[#172238] text-xs rounded-xl"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#172238] uppercase tracking-wider text-[10px] mb-1">
                    Hardware Platform
                  </label>
                  <select
                    value={formHardware}
                    onChange={(e) => setFormHardware(e.target.value)}
                    className="clay-recessed w-full px-3 py-2 text-[#172238] text-xs rounded-xl"
                  >
                    <option value="ESP32-WROOM-32">ESP32-WROOM-32</option>
                    <option value="ESP32-S3">ESP32-S3 (Dual-Core)</option>
                    <option value="ESP32-C3">ESP32-C3 (RISC-V)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#172238] uppercase tracking-wider text-[10px] mb-1">
                  Physical Deployment Location
                </label>
                <input
                  type="text"
                  placeholder="e.g., Bay 4 - Chiller Drainage Trench"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="clay-recessed w-full px-3.5 py-2.5 text-[#172238] text-xs rounded-xl"
                />
              </div>

              {/* Connected Sensors Selection */}
              <div>
                <label className="block font-bold text-[#172238] uppercase tracking-wider text-[10px] mb-1.5">
                  Connected Transducers
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="clay-recessed p-2.5 rounded-xl flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sensorDHT11}
                      onChange={(e) => setSensorDHT11(e.target.checked)}
                      className="rounded text-[#172238]"
                    />
                    <div>
                      <span className="font-bold text-[#172238] block">DHT11</span>
                      <span className="text-[10px] text-[#718096]">Temp (°C) + Humidity (%RH)</span>
                    </div>
                  </label>

                  <label className="clay-recessed p-2.5 rounded-xl flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sensorMQ135}
                      onChange={(e) => setSensorMQ135(e.target.checked)}
                      className="rounded text-[#172238]"
                    />
                    <div>
                      <span className="font-bold text-[#172238] block">MQ-135</span>
                      <span className="text-[10px] text-[#718096]">Air Quality Gas (12-bit ADC)</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Protocol Selection */}
              <div>
                <label className="block font-bold text-[#172238] uppercase tracking-wider text-[10px] mb-1">
                  Communication Transport
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="protocol"
                      value="mqtt"
                      checked={formProtocol === 'mqtt'}
                      onChange={() => setFormProtocol('mqtt')}
                    />
                    <span className="font-semibold text-[#172238]">MQTT (Mosquitto Port 1883)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="protocol"
                      value="http"
                      checked={formProtocol === 'http'}
                      onChange={() => setFormProtocol('http')}
                    />
                    <span className="font-semibold text-[#172238]">HTTP Direct (X-Device-Key)</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-[#F2F3EE] flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProvisionModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="clay-btn-primary font-bold"
                >
                  {submitting ? 'Generating Secrets...' : 'Generate Credentials & Provision'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. ONE-TIME SECRET DISPLAY MODAL
          ===================================================================== */}
      {provisionSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172238]/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="clay-surface max-w-xl w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 pb-3 border-b border-[#F2F3EE]">
              <div className="p-2.5 rounded-2xl bg-[#E8FAF1] text-[#0C5A37]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#172238]">Node Provisioned Successfully</h3>
                <span className="font-mono text-xs font-bold text-[#134685]">
                  ID: {provisionSuccessData.node_id}
                </span>
              </div>
            </div>

            {/* High-Visibility Warning Callout */}
            <div className="p-4 rounded-2xl bg-[#FFF9DE] border border-[#FFE885] space-y-1.5">
              <div className="flex items-center gap-2 text-[#875B00] font-black text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>One-Time Secret Notice</span>
              </div>
              <p className="text-xs text-[#875B00] leading-relaxed">
                {provisionSuccessData.warning}
              </p>
            </div>

            {/* Credential Copy Channels */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[#718096] font-semibold text-[11px]">
                  <span>Device API Secret Key (HTTP):</span>
                  <button
                    onClick={() => handleCopy(provisionSuccessData.api_key, 'api_key')}
                    className="flex items-center gap-1 text-[#134685] font-bold hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'api_key' ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
                <div className="clay-recessed p-2.5 rounded-xl font-mono text-[11px] text-[#172238] break-all select-all">
                  {provisionSuccessData.api_key}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[#718096] font-semibold text-[11px]">
                  <span>Mosquitto MQTT Password:</span>
                  <button
                    onClick={() => handleCopy(provisionSuccessData.mqtt_password, 'mqtt_password')}
                    className="flex items-center gap-1 text-[#134685] font-bold hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'mqtt_password' ? 'Copied!' : 'Copy Password'}</span>
                  </button>
                </div>
                <div className="clay-recessed p-2.5 rounded-xl font-mono text-[11px] text-[#172238] break-all select-all">
                  {provisionSuccessData.mqtt_password}
                </div>
              </div>

              {/* Pre-formatted ESP32 config.h */}
              <div className="space-y-1 pt-2">
                <div className="flex justify-between items-center text-[#718096] font-semibold text-[11px]">
                  <span className="flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-[#5BA4F5]" />
                    <span>ESP32 config.h Header Snippet:</span>
                  </span>
                  <button
                    onClick={() => handleCopy(provisionSuccessData.firmware_config_snippet, 'config_h')}
                    className="flex items-center gap-1 text-[#134685] font-bold hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'config_h' ? 'Copied Snippet!' : 'Copy Header'}</span>
                  </button>
                </div>
                <pre className="clay-recessed p-3 rounded-xl font-mono text-[10px] text-[#172238] overflow-x-auto max-h-48">
                  {provisionSuccessData.firmware_config_snippet}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F2F3EE] flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setProvisionSuccessData(null)}
                className="clay-btn-primary font-bold"
              >
                I Have Safely Saved These Credentials
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. CREDENTIALS ROTATED DISPLAY MODAL
          ===================================================================== */}
      {rotationSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172238]/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="clay-surface max-w-lg w-full p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#F2F3EE]">
              <div className="p-2.5 rounded-2xl bg-[#FFF9DE] text-[#875B00]">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#172238]">Credentials Rotated</h3>
                <span className="font-mono text-xs font-bold text-[#134685]">
                  Node: {rotationSuccessData.node_id}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF9DE] text-xs text-[#875B00]">
              {rotationSuccessData.warning}
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[#718096]">
                  <span>New MQTT Password:</span>
                  <button
                    onClick={() => handleCopy(rotationSuccessData.mqtt_password, 'rot_pass')}
                    className="text-[#134685] font-bold hover:underline"
                  >
                    {copiedKey === 'rot_pass' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="clay-recessed p-2.5 rounded-xl font-mono text-[11px] text-[#172238] break-all">
                  {rotationSuccessData.mqtt_password}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[#718096]">
                  <span>New Device Key:</span>
                  <button
                    onClick={() => handleCopy(rotationSuccessData.api_key, 'rot_key')}
                    className="text-[#134685] font-bold hover:underline"
                  >
                    {copiedKey === 'rot_key' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="clay-recessed p-2.5 rounded-xl font-mono text-[11px] text-[#172238] break-all">
                  {rotationSuccessData.api_key}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F2F3EE] flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setRotationSuccessData(null)}
                className="clay-btn-primary font-bold"
              >
                Close Dialog
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. AUDIT TRAIL MODAL
          ===================================================================== */}
      {auditLogs && selectedAuditNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172238]/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="clay-surface max-w-lg w-full p-6 sm:p-8 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F3EE]">
              <div>
                <h3 className="text-xl font-black text-[#172238]">Security Audit Trail</h3>
                <span className="font-mono text-xs text-[#718096]">Target Node: {selectedAuditNodeId}</span>
              </div>
              <button
                onClick={() => setAuditLogs(null)}
                className="text-slate-400 hover:text-[#172238] text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {auditLogs.length === 0 ? (
                <div className="text-center py-6 text-[#718096]">No audit records found for this node.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="clay-recessed p-3 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-[#172238] uppercase text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-[#718096]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5A687C]">{log.details || 'Lifecycle action executed.'}</div>
                    <div className="text-[10px] text-[#718096]">
                      Actor: <span className="font-semibold">{log.actor}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#F2F3EE] flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuditLogs(null)}
              >
                Close Audit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
