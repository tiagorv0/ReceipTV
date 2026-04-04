import { formatCurrency } from "../utils/currency-utils";

function SimpleBarChart({ data, layout = 'vertical' }) {
  if (!data || data.length === 0) return <div className="text-zinc-500 text-sm py-4">Sem dados suficientes.</div>;
  
  const total = data.reduce((acc, item) => acc + item.total, 0);

   if (layout === 'horizontal') {
    return (
      <div className="flex gap-4 h-48 pt-4">
        {data.map((item, i) => {
          const height = Math.max((item.total / total) * 100, 5); // min 5%
          return (
            <div key={i} className="flex-1 h-full flex flex-col items-center justify-end group relative">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-zinc-800 text-xs px-2 py-1 rounded border border-zinc-700 whitespace-nowrap transition-opacity pointer-events-none z-10">
                {formatCurrency(item.total)}
              </div>
              <div className="w-full max-w-[40px] bg-zinc-700 rounded-t-md relative flex-1 flex items-end overflow-hidden">
                <div 
                  className="w-full bg-gradient-to-t from-green-700 to-green-500 rounded-t-md transition-all duration-1000 ease-out"
                  style={{ height: `${height}%` }}
                >
                  <div className="w-full h-1 bg-green-300/50 absolute shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                </div>
              </div>
              <span className="text-xs text-zinc-400 mt-2 truncate w-full text-center">{item.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical layout
  return (
    <div className="space-y-4">
      {data.map((item, i) => {
        const width = Math.max((item.total / total) * 100, 5); // min 2%
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-24 text-sm text-zinc-300 truncate" title={item.label}>{item.label}</div>
            <div className="flex-1 h-6 bg-zinc-700 rounded-md overflow-hidden relative group">
               <div 
                className="h-full bg-gradient-to-r from-green-700 to-green-500 rounded-md transition-all duration-1000 ease-out relative"
                style={{ width: `${width}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-green-300/50 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              </div>
            </div>
            <div className="w-24 text-right text-sm font-medium text-zinc-300">
              {formatCurrency(item.total)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SimpleBarChart;
