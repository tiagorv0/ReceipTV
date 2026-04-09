export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ChartItem {
  label: string;
  total: number;
}

export interface SummaryResponse {
  total: number;
  count: number;
  byBank: ChartItem[];
  byType: ChartItem[];
  monthly: ChartItem[];
}

export interface ExportParams {
  formato: 'pdf' | 'zip';
  delivery: 'download' | 'whatsapp' | 'email';
  email?: string;
  filtros?: import('./receipt').ReceiptFilters;
}

export interface CalendarDayData {
  day: string; // "YYYY-MM-DD"
  count: number;
  total: number;
}

export interface CalendarResponse {
  days: CalendarDayData[];
}
