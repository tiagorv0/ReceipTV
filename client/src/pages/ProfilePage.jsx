import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, ShieldAlert, Loader2, Trash2, LockIcon, Eye, EyeOff } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getProfile, updatePassword, deleteAccount } from '../api/services';
import Error from '../components/Error';
import Success from '../components/Success';
import ConfirmModal from '../components/ConfirmModal';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);

    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordStatus, setPasswordStatus] = useState({ state: 'idle', message: '' });

    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

    const [deleteModal, setDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteStatus, setDeleteStatus] = useState({ state: 'idle', message: '' });

    useEffect(() => {
        getProfile()
            .then(({ data }) => setProfile(data))
            .catch(() => { });
    }, []);

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        const { currentPassword, newPassword, confirmPassword } = passwordForm;

        if (newPassword !== confirmPassword) {
            setPasswordStatus({ state: 'error', message: 'A nova senha e a confirmação não coincidem' });
            return;
        }
        if (newPassword.length < 8) {
            setPasswordStatus({ state: 'error', message: 'Nova senha deve ter no mínimo 8 caracteres' });
            return;
        }

        setPasswordStatus({ state: 'loading', message: '' });
        try {
            await updatePassword({ currentPassword, newPassword });
            setPasswordStatus({ state: 'success', message: 'Senha atualizada com sucesso' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            const msg = err.response?.data?.error || 'Erro ao atualizar senha';
            setPasswordStatus({ state: 'error', message: msg });
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            setDeleteStatus({ state: 'error', message: 'Digite sua senha para confirmar' });
            return;
        }
        setDeleteStatus({ state: 'loading', message: '' });
        try {
            await deleteAccount({ password: deletePassword });
            localStorage.removeItem('sessionExpiry');
            localStorage.removeItem('was_authenticated');
            navigate('/login');
        } catch (err) {
            const msg = err.response?.data?.error || 'Erro ao excluir conta';
            setDeleteStatus({ state: 'error', message: msg });
        }
    };

    return (

        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-80 duration-300">
            <PageHeader title="Perfil" subtitle="Gerencie as informações da sua conta." />
            <div className="bg-zinc-800 border border-green-500/30 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-green-500/40 to-transparent"></div>
                    <span className="text-[13px] uppercase font-bold tracking-[0.3em] text-zinc-300">Informações da Conta</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase flex items-center gap-1.5">
                            <User size={13} /> Username
                        </label>
                        <div className="bg-zinc-700/60 border border-zinc-700 rounded-lg px-5 py-4 text-zinc-500 text-sm flex justify-between items-center cursor-not-allowed">
                            {profile?.username ?? ''}
                            <LockIcon size={13} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase flex items-center gap-1.5">
                            <Mail size={13} /> E-mail
                        </label>
                        <div className="bg-zinc-700/60 border border-zinc-700 rounded-lg px-5 py-4 text-zinc-500 text-sm flex justify-between items-center cursor-not-allowed">
                            {profile?.email ?? ''}
                            <LockIcon size={13} />
                        </div>
                    </div>
                </div>
                <div className="space-y-6 mt-12">
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] uppercase font-bold tracking-[0.3em] text-zinc-300">Trocar Senha</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-green-500/40"></div>
                    </div>
                    <p className="text-sm text-zinc-400 mb-6">Escolha uma senha forte com pelo menos 8 caracteres.</p>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="grid grid-cols-[11rem_1fr] items-center gap-x-4 gap-y-4">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Senha Atual</label>
                            <div className="relative">
                                <input
                                    type={showPasswords.current ? 'text' : 'password'}
                                    value={passwordForm.currentPassword}
                                    onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                                    required
                                    placeholder='Digite a senha atual'
                                    className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-700/60 px-3 pr-10 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                                />
                                <button type="button" onClick={() => setShowPasswords(s => ({ ...s, current: !s.current }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
                                    {showPasswords.current ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>

                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Nova Senha</label>
                            <div className="relative">
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    value={passwordForm.newPassword}
                                    onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                                    required
                                    minLength={8}
                                    placeholder='Digite a nova senha'
                                    className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-700/60 px-3 pr-10 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                                />
                                <button type="button" onClick={() => setShowPasswords(s => ({ ...s, new: !s.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
                                    {showPasswords.new ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>

                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Confirmar Nova Senha</label>
                            <div className="relative">
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    value={passwordForm.confirmPassword}
                                    onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                    required
                                    placeholder='Digite a senha novamente'
                                    className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-700/60 px-3 pr-10 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                                />
                                <button type="button" onClick={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
                                    {showPasswords.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {passwordStatus.state === 'error' && <Error message={passwordStatus.message} />}
                        {passwordStatus.state === 'success' && <Success message={passwordStatus.message} />}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={passwordStatus.state === 'loading'}
                                className="w-50 flex items-center justify-center gap-2 rounded-xl bg-green-500/30 hover:bg-green-600 disabled:opacity-60 text-white hover:text-white font-medium py-3 text-sm transition-colors"
                            >
                                {passwordStatus.state === 'loading' ? (
                                    <><Loader2 size={15} className="animate-spin" /> Salvando...</>
                                ) : 'Salvar Nova Senha'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>



            {/* Card 3 — Zona de Perigo */}
            <div className="border border-red-500/30 bg-red-950/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert size={18} className="text-red-400" />
                    <h3 className="text-lg font-semibold text-red-400">Zona de Perigo</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-6">
                    Esta ação é irreversível. Todos os seus comprovantes serão excluídos permanentemente.
                </p>
                <button
                    type="button"
                    onClick={() => { setDeleteModal(true); setDeleteStatus({ state: 'idle', message: '' }); setDeletePassword(''); }}
                    className="flex items-center gap-2 h-10 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                >
                    <Trash2 size={15} /> Excluir conta
                </button>
            </div>

            <ConfirmModal
                open={deleteModal}
                onClose={() => setDeleteModal(false)}
                onConfirm={handleDeleteAccount}
                title="Excluir sua conta?"
                description="Todos os comprovantes serão excluídos permanentemente. Esta ação não pode ser desfeita."
                confirmLabel={deleteStatus.state === 'loading' ? 'Excluindo...' : 'Confirmar exclusão'}
                loading={deleteStatus.state === 'loading'}
                icon={
                    <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                        <Trash2 className="text-red-400" size={26} />
                    </div>
                }
            >
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Confirme sua senha</label>
                    <input
                        type="password"
                        value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        placeholder="Digite sua senha"
                        className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
                    />
                </div>
                {deleteStatus.state === 'error' && <Error message={deleteStatus.message} />}
            </ConfirmModal>
        </div>
    );
};

export default ProfilePage;
