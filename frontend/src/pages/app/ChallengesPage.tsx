import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, type ApiResearchRecord } from '../../services/api';
import { useEnvironment } from '../../context/EnvironmentContext';

export const ChallengesPage: React.FC = () => {
  const { environment } = useEnvironment();
  const [records, setRecords] = useState<ApiResearchRecord[]>([]);
  useEffect(() => { api.getResearchRecords(environment, 'investigation').then(setRecords).catch(() => setRecords([])); }, [environment]);
  return <div className="space-y-6"><section className="clay-surface p-6"><div className="flex items-center gap-3"><Zap className="h-6 w-6 text-amber-600"/><div><p className="text-xs font-bold uppercase text-slate-500">Observation based diagnosis</p><h1 className="text-2xl font-black">Diagnostic investigations</h1></div></div><p className="mt-3 text-sm text-slate-600">VeyraSense uses passive observations: synchronized readings from related channels, packet timing, and subsequent measurements. It does not send physical excitation or actuation commands to ESP32 nodes. Controlled challenges are available only as labelled simulated scenarios.</p><Link className="mt-4 inline-block text-sm font-bold text-blue-700 underline" to="/app/demonstration">Open demonstration scenarios</Link></section>
    {records.length === 0 ? <div className="clay-surface p-8 text-sm text-slate-500">No uncertain diagnoses currently need additional observations in {environment} data.</div> : records.map((record) => <article className="clay-surface space-y-2 p-5" key={record.id}><div className="flex justify-between"><b>{record.node_id}</b><span className="text-xs font-bold uppercase">{record.payload.status}</span></div><p className="text-sm">{record.payload.reason}</p><ul className="list-disc pl-5 text-xs text-slate-600">{(record.payload.diagnostic_observations || []).map((item: string) => <li key={item}>{item}</li>)}</ul></article>)}</div>;
};
