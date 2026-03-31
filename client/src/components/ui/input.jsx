import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const Input = forwardRef(({ label, required, error, leftIcon, rightIcon, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
        {label && (
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                {label}{required && <span className="text-red-400 ml-1">*</span>}
            </label>
        )}
        <div className="relative">
            {leftIcon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                    {leftIcon}
                </div>
            )}
            <input
                ref={ref}
                className={cn(
                    'w-full rounded-xl bg-zinc-700/60 text-white placeholder:text-zinc-500',
                    'px-4 py-3 text-sm outline-none',
                    'focus:border-green-600 focus:ring-1 focus:ring-green-500/30 transition-all',
                    leftIcon && 'pl-9',
                    rightIcon && 'pr-10',
                    error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                    className
                )}
                {...props}
            />
            {rightIcon && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    {rightIcon}
                </div>
            )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
));
Input.displayName = 'Input';

export const PasswordInput = forwardRef(({ ...props }, ref) => {
    const [show, setShow] = useState(false);
    return (
        <Input
            ref={ref}
            type={show ? 'text' : 'password'}
            rightIcon={
                <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="hover:text-white transition-colors"
                >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            }
            {...props}
        />
    );
});
PasswordInput.displayName = 'PasswordInput';

export default Input;
