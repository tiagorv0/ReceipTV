import { format } from 'date-fns';
import { formatCurrency } from '@/utils/currency-utils';
import type { CalendarDayData } from '@/types/api';

interface CalendarDayCellProps {
    date: Date;
    dayData?: CalendarDayData;
    isCurrentMonth: boolean;
    isToday: boolean;
    onClick: () => void;
}

const CalendarDayCell = ({
    date,
    dayData,
    isCurrentMonth,
    isToday,
    onClick,
}: CalendarDayCellProps) => {
    const hasData = isCurrentMonth && !!dayData;
    const dayNumber = format(date, 'd');

    const cellBase =
        'min-h-[56px] md:min-h-[80px] rounded-lg p-1 md:p-2 flex flex-col gap-0.5 select-none transition-colors';

    const cellColors = !isCurrentMonth
        ? 'opacity-40 cursor-default bg-zinc-700/30'
        : hasData
        ? 'bg-green-500/20 hover:bg-zinc-700 cursor-pointer'
        : 'bg-zinc-700/50 cursor-default';

    const todayRing = isToday ? 'ring-1 ring-green-500/50' : '';

    return (
        <div
            role={hasData ? 'button' : undefined}
            tabIndex={hasData ? 0 : undefined}
            onClick={hasData ? onClick : undefined}
            onKeyDown={hasData ? (e) => e.key === 'Enter' && onClick() : undefined}
            className={`${cellBase} ${cellColors} ${todayRing}`}
        >
            {/* Número do dia */}
            <span
                className={`text-xs font-semibold leading-none ${
                    isToday
                        ? 'text-green-400'
                        : isCurrentMonth
                        ? 'text-zinc-300'
                        : 'text-zinc-600'
                }`}
            >
                {dayNumber}
            </span>

            {/* Mobile: apenas badge de count */}
            {hasData && (
                <div className="md:hidden mt-auto flex justify-center">
                    <span className="bg-green-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none font-medium">
                        {dayData.count}
                    </span>
                </div>
            )}

            {/* Desktop: count + valor */}
            {hasData && (
                <div className="hidden md:flex flex-col gap-0.5 mt-auto">
                    <span className="bg-green-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none font-medium self-start">
                        {dayData.count} {dayData.count === 1 ? 'recibo' : 'recibos'}
                    </span>
                    <span className="text-xs text-green-300 font-medium truncate">
                        {formatCurrency(dayData.total)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default CalendarDayCell;
