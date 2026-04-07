export interface Receipt {
  id: number;
  user_id: number;
  nome: string;
  valor: number;
  data_pagamento: string;
  banco: string | null;
  tipo_pagamento: string;
  descricao: string | null;
  arquivo_mimetype: string | null;
  arquivo_nome: string | null;
  created_at: string;
}

export interface ReceiptFilters {
  startDate?: string;
  endDate?: string;
  nome?: string;
  banco?: string;
  tipoPagamento?: string;
  valorMin?: string;
  valorMax?: string;
  sortBy?: string;
}

export interface AnalysisResult {
  nome: string;
  valor: number;
  data: string;
  banco: string;
  tipo_pagamento: string;
  descricao: string;
}
