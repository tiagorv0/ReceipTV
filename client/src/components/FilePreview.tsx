import { useMemo } from 'react';
import { FileText } from 'lucide-react';

interface FilePreviewProps {
    file: File | null;
}

const FilePreview = ({ file }: FilePreviewProps) => {
    const url = useMemo(() => {
        if (!file) return null;
        return URL.createObjectURL(file);
    }, [file]);

    if (!file) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3 p-8">
                <div className="bg-zinc-700 p-4 rounded-full mb-4 shadow-lg">
                    <FileText className="w-12 h-12 text-green-600" />
                </div>
                <p className="text-sm text-center">O arquivo selecionado aparecerá aqui</p>
            </div>
        );
    }

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    return (
        <div className="flex flex-col h-full w-full overflow-hidden rounded-2xl">
            {isImage && (
                <img
                    src={url ?? undefined}
                    alt={file.name}
                    className="w-full h-full object-contain bg-zinc-900 rounded-2xl"
                />
            )}
            {isPdf && (
                <iframe
                    src={url ?? undefined}
                    title={file.name}
                    className="w-full h-full rounded-2xl border-0 bg-zinc-900"
                />
            )}
            {!isImage && !isPdf && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-3 p-8">
                    <FileText className="w-14 h-14 text-zinc-500" />
                    <p className="text-sm font-medium text-center">{file.name}</p>
                    <p className="text-xs text-zinc-600">Pré-visualização não disponível para este formato</p>
                </div>
            )}
        </div>
    );
};

export default FilePreview;
