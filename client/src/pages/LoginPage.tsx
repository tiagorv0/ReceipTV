import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login, register } from '../api/services';
import { ReceiptIcon } from 'lucide-react';
import Error from '../components/Error';
import Success from '../components/Success';
import Input, { PasswordInput } from '../components/ui/input';

const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [identifier, setIdentifier] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const isExpired = searchParams.get('expired') === 'true';
    const [success, setSuccess] = useState('');
    const [error, setError] = useState(
        isExpired ? 'Sua sessão expirou. Faça login novamente.' : ''
    );

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                const { data } = await login({ identifier, password, rememberMe });
                if (data.accessTokenExp) {
                    localStorage.setItem('sessionExpiry', String(data.accessTokenExp));
                }
                localStorage.setItem('was_authenticated', 'true');
                localStorage.setItem('rememberMe', String(rememberMe));
                const redirectTo = sessionStorage.getItem('redirect_after_login');
                if (redirectTo) {
                    sessionStorage.removeItem('redirect_after_login');
                    navigate(redirectTo);
                } else {
                    navigate('/');
                }
            } else {
                await register({ username: identifier, email, password });
                setIsLogin(true);
                setSuccess('Conta criada! Faça login agora.');
            }
        } catch (err: unknown) {
            const axErr = err as { response?: { data?: { message?: string } } };
            setError(axErr.response?.data?.message || 'Algo deu errado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container bg-zinc-900">
            <div className="bg-zinc-800 rounded-xl p-8 sm:p-16 w-full max-w-md gap-4 transition-colors">
                <div className="flex items-center gap-2.5 mb-10 justify-center">
                    <ReceiptIcon className="w-10 h-10 sm:w-12 sm:h-12" color="var(--primary-strong)" />
                    <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">ReceipTV</h1>
                </div>
                <h2 className="auth-title">{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
                <p className="auth-subtitle">{isLogin ? 'Entre para gerenciar seus comprovantes' : 'Comece a organizar suas finanças'}</p>

                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                    <div>
                        <label className="block text-[13px] text-zinc-400 mb-2">
                            {isLogin ? 'Usuário ou Email' : 'Usuário'}
                        </label>
                        <Input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-[13px] text-zinc-400 mb-2">Email</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className={isLogin ? 'mb-3' : 'mb-6'}>
                        <label className="block text-[13px] text-zinc-400 mb-2">Senha</label>
                        <PasswordInput
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {isLogin && (
                        <div className="flex items-center gap-2 mb-6">
                            <input
                                id="rememberMe"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 accent-[#25D366] cursor-pointer"
                            />
                            <label htmlFor="rememberMe" className="text-[13px] text-zinc-400 cursor-pointer select-none">
                                Continuar logado
                            </label>
                        </div>
                    )}

                    {error && <Error message={error} />}
                    {success && <Success message={success} />}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500/30 hover:bg-green-600 disabled:opacity-60 text-white font-bold py-3 text-sm transition-colors mb-4"
                    >
                        {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Cadastrar'}
                    </button>
                </form>

                <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="w-full bg-transparent border-none text-zinc-400 cursor-pointer text-sm hover:text-zinc-300 transition-colors mt-2"
                >
                    {isLogin ? <>Não tem conta? <u>Cadastre-se</u></> : <>Já tem conta? <u>Entre aqui</u></>}
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
