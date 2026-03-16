import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, register } from '../api/services';
import { ReceiptIcon } from 'lucide-react';

const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                const { data } = await login({ username, password });
                localStorage.setItem('token', data.token);
                navigate('/');
            } else {
                await register({ username, password });
                setIsLogin(true);
                setError('Conta criada! Faça login agora.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Algo deu errado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container bg-zinc-900">
            <div className="bg-zinc-800 border border-green-500/30 rounded-xl p-8 sm:p-16 w-full max-w-md justify-between gap-4 hover:border-zinc-700 transition-colors group">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, justifyContent: 'center' }}>
                    <ReceiptIcon className="w-10 h-10 sm:w-12 sm:h-12" color="var(--primary-strong)" />
                    <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">ReceipTV</h1>
                </div>
                <h2 className="auth-title">{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
                <p className="auth-subtitle">{isLogin ? 'Entre para gerenciar seus comprovantes' : 'Comece a organizar suas finanças'}</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>Usuário</label>
                        <input
                            type="text"
                            className="auth-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: 10, color: 'white' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>Senha</label>
                        <input
                            type="password"
                            className="auth-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: 10, color: 'white' }}
                        />
                    </div>

                    {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className='p-3 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-lg transition-colors border border-[#25D366]/30'
                        style={{ width: '100%', fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}
                    >
                        {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Cadastrar'}
                    </button>
                </form>

                <button
                    onClick={() => setIsLogin(!isLogin)}
                    dangerouslySetInnerHTML={{ __html: isLogin ? 'Não tem conta? <u>Cadastre-se</u>' : 'Já tem conta? <u>Entre aqui</u>' }}
                    style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14 }}
                >
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
