import React, { useEffect, useState } from 'react';
import { Building2, ArrowRight } from 'lucide-react';
import { useDepartment } from '../../context/DepartmentContext';
import { DEPARTMENTS } from '../../mock/dashboardData';
import { api, type ApiNode } from '../../services/api';
import { Button } from '../../components/ui/Button';

export const DepartmentsPage: React.FC = () => {
  const { setSelectedDepartmentId } = useDepartment();
  const [nodes, setNodes] = useState<ApiNode[]>([]);

  useEffect(() => {
    api.getNodes()
      .then((data) => setNodes(data))
      .catch(() => setNodes([]));
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <Building2 className="w-4 h-4 text-[#FFD21C]" />
              <span>Fleet Organization</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Industrial Department Fleets
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            Fleet Partitions Configured
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Contextual department isolation allows local operators to focus surveillance and challenge protocols on specialized processes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DEPARTMENTS.filter((d) => d.id !== 'all').map((dept, idx) => {
          // Department IDs in backend are numeric (1..7)
          const deptNumericId = idx + 1;
          const deptNodes = nodes.filter((n) => n.department_id === deptNumericId);
          const healthyNodes = deptNodes.filter((n) => n.status === 'connected' || n.status === 'healthy').length;

          return (
            <div
              key={dept.id}
              className="clay-surface-interactive p-6 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFF6C9] flex items-center justify-center text-[#172238] font-black text-xs shadow-2xs">
                    {dept.code}
                  </div>
                  <span className="text-xs font-bold text-[#0C5A37] bg-[#E8FAF1] px-2.5 py-1 rounded-full shadow-2xs">
                    {healthyNodes}/{deptNodes.length} Online
                  </span>
                </div>

                <h3 className="text-lg font-black text-[#172238] mb-1">
                  {dept.name}
                </h3>
                <p className="text-xs text-[#5A687C] leading-relaxed mb-4">
                  {dept.description}
                </p>

                <div className="space-y-1.5 text-xs clay-recessed p-3.5 mb-4">
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Lead Engineer:</span>
                    <span className="font-semibold text-[#172238]">{dept.leadEngineer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Assigned Nodes:</span>
                    <span className="font-mono font-bold text-[#172238]">{deptNodes.length} devices</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                fullWidth
                rightIcon={<ArrowRight className="w-4 h-4 text-[#FFD21C]" />}
                onClick={() => setSelectedDepartmentId(dept.id)}
              >
                Focus Department
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
