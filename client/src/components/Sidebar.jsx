import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, History, LogOut, ReceiptIcon, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../api/index';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const links = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Upload', path: '/upload', icon: <Upload size={20} /> },
        { name: 'Histórico', path: '/history', icon: <History size={20} /> },
    ];

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Prossegue com o logout mesmo em caso de erro
        }

        localStorage.removeItem('sessionExpiry');
        localStorage.removeItem('was_authenticated');

        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel('auth');
            channel.postMessage({ type: 'logout' });
            channel.close();
        } else {
            localStorage.setItem('auth:logout', Date.now().toString());
            localStorage.removeItem('auth:logout');
        }

        navigate('/login');
    };

    return (
        <aside className="w-full relative md:h-full md:w-64 bg-zinc-900 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col shadow-2xl z-50">
            {/* Header com logo e menu hamburger */}
            <div className="flex p-4 md:p-6 items-center justify-between md:justify-center bg-zinc-900 relative z-50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                        <ReceiptIcon size={24} color="var(--primary-strong)" className="md:w-[30px] md:h-[30px]" />
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                        ReceipTV
                    </h1>
                </div>

                {/* Botão de Menu Mobile */}
                <button
                    className="md:hidden p-2 text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Nav: links (transformado em dropdown no mobile) */}
            <nav className={`
                absolute md:static top-full left-0 right-0 bg-zinc-900 md:bg-transparent
                border-b border-zinc-800 md:border-b-0 shadow-xl md:shadow-none z-40
                flex-col md:flex flex-1 p-4 gap-2 md:gap-3
                transition-all duration-300 origin-top
                ${isMobileMenuOpen ? 'flex' : 'hidden md:flex'}
            `}>
                {links.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`nav-link flex-shrink-0 ${location.pathname === link.path ? 'active' : ''}`}
                    >
                        {link.icon}
                        <span>{link.name}</span>
                    </Link>
                ))}

                {/* Botão de logout no mobile (dentro do menu dropdown) */}
                <button
                    onClick={handleLogout}
                    className="md:hidden flex items-center gap-3 p-3 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all mt-4 border-t border-zinc-800"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Sair</span>
                </button>
            </nav>

            {/* Botão de logout na parte inferior — visível apenas no desktop */}
            <div className="hidden md:block p-4 border-t border-zinc-800 mt-auto">
                <button
                    onClick={handleLogout}
                    className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50 w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/5 transition-all duration-200"
                >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Sair</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
