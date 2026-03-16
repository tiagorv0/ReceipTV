import React from 'react';

function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 whitespace-nowrap ${
        isActive 
          ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]' 
          : 'text-gray-400 hover:bg-gray-800/80 hover:text-gray-200 border border-transparent'
      }`}
    >
      <span className={isActive ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : ''}>
        {React.cloneElement(icon, { size: 20 })}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default NavItem;
