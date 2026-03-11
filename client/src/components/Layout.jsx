import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, History } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = () => {
    const location = useLocation();

    const navLinks = [
        { name: 'Home', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Upload', path: '/upload', icon: <Upload size={20} /> },
        { name: 'History', path: '/history', icon: <History size={20} /> },
    ];

    return (
        <div className="layout-container">
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>
            <nav className="bottom-nav">
                {navLinks.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`bottom-nav-link ${location.pathname === link.path ? 'active' : ''}`}
                    >
                        {link.icon}
                    </Link>
                ))}
            </nav>
        </div>
    );
};

export default Layout;
