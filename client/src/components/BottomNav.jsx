import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, Plus, CircleUser, LogOut } from 'lucide-react';
import api from '../api/index';

const navItems = [
    { label: 'Dashboard', path: '/',        icon: LayoutDashboard },
    { label: 'Histórico', path: '/history', icon: History },
    { label: 'Perfil',    path: '/profile', icon: CircleUser },
];

const NavItem = ({ item, active }) => {
    const Icon = item.icon;
    return (
        <Link
            to={item.path}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center transition-colors duration-150"
        >
            <Icon
                size={20}
                className={active ? 'text-green-400' : 'text-zinc-500'}
            />
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${active ? 'text-green-400' : 'text-zinc-500'}`}>
                {item.label}
            </span>
            {active && (
                <span className="w-1 h-1 rounded-full bg-green-400" />
            )}
        </Link>
    );
};

const LogoutItem = ({ onLogout }) => (
    <button
        onClick={onLogout}
        aria-label="Sair da conta"
        className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center text-zinc-500 hover:text-red-400 transition-colors duration-150"
    >
        <LogOut size={20} />
        <span className="text-[10px] font-semibold uppercase tracking-wide">
            Sair
        </span>
    </button>
);

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Prossegue com o logout mesmo em caso de erro
        }

        localStorage.removeItem('sessionExpiry');
        localStorage.removeItem('was_authenticated');
        localStorage.removeItem('rememberMe');

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

    const isUploadActive = location.pathname === '/upload';

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50
                       bg-zinc-900 border-t border-zinc-800
                       shadow-[0_-4px_30px_rgba(0,0,0,0.4)]
                       flex items-end justify-between px-6 py-3"
        >
            {/* Itens esquerdos */}
            {navItems.slice(0, 2).map(item => (
                <NavItem
                    key={item.path}
                    item={item}
                    active={location.pathname === item.path}
                />
            ))}

            {/* FAB central */}
            <Link
                to="/upload"
                aria-label="Fazer upload de comprovante"
                aria-current={isUploadActive ? 'page' : undefined}
                className={`-mt-8 w-14 h-14 flex items-center justify-center
                            bg-green-500 rounded-full
                            shadow-[0_0_20px_rgba(34,197,94,0.45)]
                            hover:bg-green-400 hover:scale-105 active:scale-95
                            transition-all duration-150
                            ${isUploadActive ? 'ring-2 ring-green-400/60' : ''}`}
            >
                <Plus size={24} className="text-zinc-900" strokeWidth={2.5} />
            </Link>

            {/* Itens direitos + Sair */}
            {navItems.slice(2).map(item => (
                <NavItem
                    key={item.path}
                    item={item}
                    active={location.pathname === item.path}
                />
            ))}
            <LogoutItem onLogout={handleLogout} />
        </nav>
    );
};

export default BottomNav;
