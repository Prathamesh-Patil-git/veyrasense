import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { api, type ApiResearchSummary } from '../../services/api';
import { useEnvironment } from '../../context/EnvironmentContext';

export const AnalyticsPage: React.FC = () => {
  const { environment } = useEnvironment();
  const [summary, setSummary] = useState<ApiResearchSummary | null>(null);
  useEffect(() => { api.getResearchSummary(environment).then(setSummary).catch(() => setSummary(null)); }, [environment]);
  const metric = (key: string) => {
    const value = summary?.evaluation?.[key];
    return value == null ? 'Not enough labelled outcomes' : `${(Number(value) * 100).toFixed(1)}%`;
  };
  const recoveryError = summary?.evaluation?.recovery_prediction_error;
  return <div className="space-y-6">
    <section className="clay-surface p-6"><div className="flex items-center gap-3"><BarChart3 className="h-6 w-6 text-blue-600"/><div><p className="text-xs font-bold uppercase text-slate-500">Evidence-derived metrics</p><h1 className="text-2xl font-black">Research evaluation</h1></div></div><p className="mt-3 text-sm text-slate-600">Experimental metrics are computed from stored records. Demo scores use completed scenarios with known ground truth; real sensor data has no labelled performance score unless labels are supplied.</p></section>
    {summary && <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Measurements', summary.measurements], ['Anomalies', summary.anomalies], ['Active investigations', summary.active_investigations], ['Trusted coverage', summary.trusted_measurement_coverage == null ? '—' : `${(summary.trusted_measurement_coverage * 100).toFixed(1)}%`]].map(([label, value]) => <div className="clay-surface p-5" key={String(label)}><div className="text-xs font-bold uppercase text-slate-500">{label}</div><b className="mt-2 block text-2xl">{value}</b></div>)}</section>
      <section className="clay-surface space-y-3 p-6"><h2 className="font-black">{environment === 'demo' ? 'Scenario ground-truth evaluation' : 'Field performance evaluation'}</h2>{environment === 'demo' && summary.evaluation ? <><p className="text-xs text-slate-500">{summary.evaluation.labelled_completed_scenarios} completed labelled scenarios</p><div className="grid gap-3 sm:grid-cols-2">{[['Anomaly precision', 'anomaly_precision'], ['Anomaly recall', 'anomaly_recall'], ['False-positive rate', 'false_positive_rate'], ['Hypothesis accuracy', 'hypothesis_accuracy'], ['Mean diagnostic confidence', 'diagnostic_confidence'], ['Recovery validation accuracy', 'recovery_validation_accuracy'], ['False recovery admission rate', 'false_recovery_rate'], ['Data availability', 'data_availability']].map(([label, key]) => <div key={key} className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"><span>{label}</span><b>{metric(key)}</b></div>)}<div className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"><span>Recovery prediction error</span><b>{recoveryError == null ? 'Not enough labelled outcomes' : `${Number(recoveryError).toFixed(2)}°C MAE`}</b></div></div></> : <p className="text-sm text-slate-500">No completed labelled evaluations are available. No scores are fabricated.</p>}</section>
    </>}
  </div>;
};
