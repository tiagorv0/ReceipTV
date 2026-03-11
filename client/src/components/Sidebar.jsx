import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, History, LogOut, ReceiptIcon } from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();

    const links = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Upload', path: '/upload', icon: <Upload size={20} /> },
        { name: 'Histórico', path: '/history', icon: <History size={20} /> },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <ReceiptIcon size={30} color="var(--primary-strong)" />
                <h1 className="text-xl font-bold tracking-tight">ReceipTV</h1>
            </div>
            <nav className="sidebar-nav">
                {links.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                    >
                        {link.icon}
                        <span>{link.name}</span>
                    </Link>
                ))}
            </nav>
            <button className="logout-btn" onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}>
                <LogOut size={20} />
                <span>Sair</span>
            </button>
        </aside>
    );
};

export default Sidebar;
