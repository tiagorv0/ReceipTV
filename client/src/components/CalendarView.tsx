import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    format,
    addMonths,
    subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CalendarDayCell from './CalendarDayCell';
import type { CalendarDayData } from '@/types/api';

interface CalendarViewProps {
    data: CalendarDayData[];
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    onDayClick: (day: string) => void;
    loading: boolean;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CalendarView = ({
    data,
    currentMonth,
    onMonthChange,
    onDayClick,
    loading,
}: CalendarViewProps) => {
    // Map para lookup O(1): "YYYY-MM-DD" → CalendarDayData
    const dayMap = new Map<string, CalendarDayData>(
        data.map((d) => [d.day, d])
    );

    // Calcular dias do grid (semana começa no domingo)
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR });

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-4">
                <button
                    type="button"
                    onClick={() => onMonthChange(subMonths(currentMonth, 1))}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    aria-label="Mês anterior"
                >
                    <ChevronLeft size={20} />
                </button>

                <h3 className="text-base md:text-lg font-semibold text-white capitalize">
                    {monthLabel}
                </h3>

                <button
                    type="button"
                    onClick={() => onMonthChange(addMonths(currentMonth, 1))}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    aria-label="Próximo mês"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Linha de dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((wd) => (
                    <div
                        key={wd}
                        className="text-center text-xs font-medium text-zinc-500 py-1"
                    >
                        {wd}
                    </div>
                ))}
            </div>

            {/* Grid de dias */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        return (
                            <CalendarDayCell
                                key={dayKey}
                                date={day}
                                dayData={dayMap.get(dayKey)}
                                isCurrentMonth={isSameMonth(day, currentMonth)}
                                isToday={isToday(day)}
                                onClick={() => onDayClick(dayKey)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CalendarView;
