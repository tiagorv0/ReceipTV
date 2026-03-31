function ChartCard2({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-zinc-800 rounded-2xl p-6 flex flex-col ${className}`}>
      <div className="flex items-center gap-2 mb-6 border-b border-zinc-700 pb-4">
        <span className="text-green-400">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

export default ChartCard2;