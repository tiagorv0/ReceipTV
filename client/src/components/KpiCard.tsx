import type { ReactNode } from 'react';

interface KpiCardProps {
    icon: ReactNode;
    title: string;
    value: ReactNode;
    subValue?: string;
    glow?: boolean;
}

function KpiCard({ icon, title, value, subValue, glow }: KpiCardProps) {
  return (
    <div className={`bg-zinc-800 border ${glow ? 'border-green-500/30' : 'border-zinc-700'} rounded-2xl p-6 relative overflow-hidden group`}>
      {glow && <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/10 blur-3xl rounded-full group-hover:bg-green-500/20 transition-all" />}

      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className={`p-3 rounded-xl ${glow ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
          {icon}
        </div>
        <h3 className="text-zinc-400 font-medium">{title}</h3>
      </div>
      <div className="relative z-20">
        <p className="text-3xl font-bold text-white">{value}</p>
        {subValue && <p className="text-sm text-green-400 mt-1">{subValue}</p>}
      </div>
    </div>
  );
}

export default KpiCard;
