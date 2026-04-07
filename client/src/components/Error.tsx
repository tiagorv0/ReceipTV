import { AlertCircle } from 'lucide-react';

interface ErrorProps {
    message: string;
}

function Error({ message }: ErrorProps) {
    return (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-6">
            <AlertCircle size={15} /> {message}
        </div>
    );
}

export default Error;
