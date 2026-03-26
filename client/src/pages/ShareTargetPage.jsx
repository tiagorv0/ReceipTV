import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { analyzeReceipt } from '../api/services'
import { getPendingShare, deletePendingShare } from '../utils/shareIdb'

const SHARE_ERROR_MESSAGES = {
  size: 'O arquivo é muito grande (limite: 10MB).',
  type: 'Tipo de arquivo não suportado. Use JPEG, PNG, WebP ou PDF.',
  storage: 'Erro ao salvar o arquivo temporariamente. Tente novamente.',
  nofile: 'Nenhum arquivo foi recebido.',
  parse: 'Erro ao ler o arquivo compartilhado.',
  expired: 'O arquivo compartilhado expirou. Por favor, tente novamente.',
  idb: 'Erro ao acessar o armazenamento local.',
  empty: 'Nenhum arquivo pendente encontrado.',
}

const ShareTargetPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true
    processShare()
  }, [])

  async function processShare() {
    // Erros vindos da query string (gerados pelo SW para erros de tipo/tamanho)
    const shareError = searchParams.get('share_error')
    if (shareError) {
      navigate('/upload', {
        replace: true,
        state: { shareError: SHARE_ERROR_MESSAGES[shareError] ?? 'Erro ao receber o arquivo.' },
      })
      return
    }

    let pending
    try {
      pending = await getPendingShare()
    } catch {
      navigate('/upload', { replace: true, state: { shareError: SHARE_ERROR_MESSAGES.idb } })
      return
    }

    if (!pending) {
      // Nenhum arquivo — provavelmente acesso direto à rota
      navigate('/', { replace: true })
      return
    }

    if (pending.expired) {
      await deletePendingShare(pending.id).catch(() => {})
      navigate('/upload', { replace: true, state: { shareError: SHARE_ERROR_MESSAGES.expired } })
      return
    }

    const { id, file, filename, mimeType } = pending

    const formData = new FormData()
    formData.append('file', new File([file], filename, { type: mimeType }))

    try {
      await analyzeReceipt(formData)
      await deletePendingShare(id).catch(() => {})
      navigate('/history', { replace: true })
    } catch {
      await deletePendingShare(id).catch(() => {})
      navigate('/upload', {
        replace: true,
        state: { sharedFile: new File([file], filename, { type: mimeType }) },
      })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
      <h2 className="text-xl font-medium text-white">Processando comprovante...</h2>
      <p className="text-zinc-500 text-sm">Aguarde enquanto analisamos o arquivo compartilhado.</p>
    </div>
  )
}

export default ShareTargetPage
