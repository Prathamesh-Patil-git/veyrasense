import React, { useEffect, useState } from 'react';
import { Play, Pause, Square, RotateCcw, FastForward, FlaskConical } from 'lucide-react';
import { api, type ApiScenario, type ApiScenarioRun } from '../../services/api';
import { useEnvironment } from '../../context/EnvironmentContext';

export const DemonstrationPage: React.FC = () => {
  const { environment } = useEnvironment();
  const [scenarios, setScenarios] = useState<ApiScenario[]>([]);
  const [selected, setSelected] = useState('normal');
  const [speed, setSpeed] = useState(1);
  const [run, setRun] = useState<ApiScenarioRun | null>(null);
  const [history, setHistory] = useState<ApiScenarioRun[]>([]);
  const [error, setError] = useState('');

  useEffect(() => { api.getScenarios().then(setScenarios).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (environment === 'demo') api.getScenarioRuns().then(setHistory).catch(() => setHistory([])); }, [environment, run?.status]);
  useEffect(() => {
    if (!run || run.status !== 'running') return;
    const timer = window.setInterval(() => {
      api.stepScenario(run.id).then(setRun).catch((e) => setError(e.message));
    }, Math.max(350, 1500 / speed));
    return () => window.clearInterval(timer);
  }, [run?.id, run?.status, speed]);

  const control = async (command: 'pause' | 'resume' | 'stop' | 'reset' | 'replay') => {
    if (!run) return;
    try { setRun(await api.controlScenario(run.id, command, speed)); setError(''); }
    catch (e: any) { setError(e.message); }
  };

  return <div className="space-y-6">
    <section className="clay-surface p-6 sm:p-8">
      <div className="flex items-center gap-3"><FlaskConical className="h-6 w-6 text-amber-600"/><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Deterministic Research Scenarios</p><h1 className="text-2xl font-black">Demonstration Center</h1></div></div>
      <p className="mt-3 text-sm text-slate-600">Scenario samples use the same canonical telemetry processor as MQTT. Results and ground truth are labelled simulated and isolated from real sensor records.</p>
    </section>
    {environment !== 'demo' ? <div className="rounded-xl bg-amber-100 p-5 font-semibold text-amber-900">Switch to Demonstration Environment in the sidebar to run simulated scenarios.</div> : <>
      <section className="clay-surface p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="space-y-2 text-xs font-bold text-slate-600">Scenario<select className="w-full rounded-lg border p-3 text-sm" value={selected} onChange={(e) => setSelected(e.target.value)} disabled={!!run && !['stopped', 'completed'].includes(run.status)}>{scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="space-y-2 text-xs font-bold text-slate-600">Speed<select className="block rounded-lg border p-3 text-sm" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={5}>5×</option><option value={10}>10×</option></select></label>
          <button className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={!!run && !['stopped', 'completed'].includes(run.status)} onClick={async () => { try { setRun(await api.startScenario(selected, speed)); setError(''); } catch (e: any) { setError(e.message); } }}><Play className="mr-2 inline h-4 w-4"/>Start scenario</button>
        </div>
        {run && <div className="space-y-4 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><b>{run.expected.name}</b> <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-900">Simulated</span><p className="text-xs text-slate-500">Node {run.node_id} · run #{run.id} · {run.status}</p></div><b>{run.step_index}/{run.duration_steps} samples</b></div>
          <div className="h-2 overflow-hidden rounded bg-slate-100"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${100 * run.step_index / run.duration_steps}%` }}/></div>
          <div className="flex flex-wrap gap-2">
            {run.status === 'running' && <button className="rounded-lg border px-3 py-2 text-xs font-bold" onClick={() => control('pause')}><Pause className="mr-1 inline h-3 w-3"/>Pause</button>}
            {run.status === 'paused' && <button className="rounded-lg border px-3 py-2 text-xs font-bold" onClick={() => control('resume')}><Play className="mr-1 inline h-3 w-3"/>Resume</button>}
            <button className="rounded-lg border px-3 py-2 text-xs font-bold" onClick={() => control('stop')}><Square className="mr-1 inline h-3 w-3"/>Stop</button>
            <button className="rounded-lg border px-3 py-2 text-xs font-bold" onClick={() => control('reset')}><RotateCcw className="mr-1 inline h-3 w-3"/>Reset</button>
            <button className="rounded-lg border px-3 py-2 text-xs font-bold" onClick={() => control('replay')}><FastForward className="mr-1 inline h-3 w-3"/>Replay</button>
          </div>
          <div className="rounded-xl bg-slate-50 p-4"><h3 className="text-xs font-black uppercase">Scenario ground truth (simulated)</h3><p className="mt-1 text-sm">Expected outcome: {run.expected.expected}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(run.expected.hypotheses).map(([label, confidence]) => <div key={label} className="flex justify-between rounded bg-white p-2 text-xs"><span>{label.replaceAll('_', ' ')}</span><b>{Math.round(confidence * 100)}%</b></div>)}</div></div>
          {run.actual && <div className="rounded-xl border border-slate-200 p-4"><h3 className="text-xs font-black uppercase">Observed result</h3><p className="mt-2 text-sm">Detected: {run.actual.detected_anomalies.join(', ') || 'no anomaly detected yet'}</p><p className="mt-1 text-xs text-slate-600">Selected hypotheses: {run.actual.hypotheses.join(', ') || 'none'} · Recovery decisions: {run.actual.recovery_decisions.join(', ') || 'none'} · Trusted records: {run.actual.trusted_measurements}</p></div>}
        </div>}
      </section>
      <section className="clay-surface space-y-3 p-5"><h2 className="font-black">Saved scenario runs</h2>{history.length === 0 ? <p className="text-sm text-slate-500">No saved demo runs yet.</p> : history.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs"><span><b>#{item.id} {item.expected.name}</b> · {item.status} · {item.step_index}/{item.duration_steps}</span><span>Expected: {item.expected.expected} · Detected: {item.actual?.detected_anomalies.join(', ') || 'none'}</span></div>)}</section>
    </>}
    {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
  </div>;
};
