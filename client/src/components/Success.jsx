import { CheckCircle } from "lucide-react";

function Success({ message }) {
    return (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-6">
            <CheckCircle size={15} /> {message}
        </div>
    );
}

export default Success;