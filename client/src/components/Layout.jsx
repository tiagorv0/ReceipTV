import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
    return (
        <div className="min-h-screen bg-zinc-900 text-zinc-300 flex flex-col md:flex-row font-sans selection:bg-green-500/30">
            <div>
                <Sidebar />
            </div>
            <main className="flex-1 p-4 md:p-8 overflow-y-auto relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-green-500/5 blur-[100px] pointer-events-none rounded-full" />
                <div className="max-w-6xl mx-auto relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
