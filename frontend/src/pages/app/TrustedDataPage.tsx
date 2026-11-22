import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api, type ApiResearchRecord } from '../../services/api';
import { useEnvironment } from '../../context/EnvironmentContext';

export const TrustedDataPage: React.FC = () => {
  const { environment } = useEnvironment();
  const [records, setRecords] = useState<ApiResearchRecord[]>([]);
  useEffect(() => { api.getResearchRecords(environment, 'trusted_measurement').then(setRecords).catch(() => setRecords([])); }, [environment]);
  return <div className="space-y-6"><section className="clay-surface p-6"><div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-emerald-700"/><div><p className="text-xs font-bold uppercase text-slate-500">Traceable admission ledger</p><h1 className="text-2xl font-black">Trusted measurements</h1></div></div><p className="mt-3 text-sm text-slate-600">A raw sample is admitted after temporal and configured range checks. A recovered value is admitted only after independent physical-range and history checks accept its candidate. Original raw values are never overwritten.</p></section>
  {records.length === 0 ? <div className="clay-surface p-8 text-sm text-slate-500">No trusted measurements recorded for {environment} data.</div> : records.map((record) => <article key={record.id} className="clay-surface space-y-2 p-5"><div className="flex justify-between gap-2"><b>{record.node_id}</b><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase">{record.payload.validation_decision}</span></div><p className="text-sm">Raw: {record.payload.raw_value ?? 'missing'} · Trusted value: {record.payload.recovered_value ?? record.payload.raw_value} · Confidence {Math.round(Number(record.payload.confidence ?? 0) * 100)}%</p><p className="text-xs text-slate-500">{(record.payload.provenance || []).join(' → ')}</p></article>)}</div>;
};
