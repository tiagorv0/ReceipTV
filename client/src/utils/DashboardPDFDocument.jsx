import { Document, Page, Text, View, StyleSheet, Svg, Rect, G } from '@react-pdf/renderer';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(value) || 0);
}

function formatCompact(value) {
    const v = parseFloat(value) || 0;
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1)}k`;
    return `R$ ${v.toFixed(0)}`;
}

function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function formatTimestamp(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    page: {
        backgroundColor: '#ffffff',
        paddingBottom: 40,
        fontFamily: 'Helvetica',
    },
    header: {
        backgroundColor: '#16a34a',
        paddingHorizontal: 40,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerLeft: {
        flexDirection: 'column',
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
    },
    headerUser: {
        color: '#dcfce7',
        fontSize: 9,
        marginTop: 3,
    },
    headerTimestamp: {
        color: '#ffffff',
        fontSize: 9,
        textAlign: 'right',
        marginTop: 3,
    },
    body: {
        paddingHorizontal: 40,
        paddingTop: 20,
    },
    sectionLabel: {
        fontSize: 8,
        color: '#a1a1aa',
        fontFamily: 'Helvetica-Bold',
        marginBottom: 8,
    },
    kpiRow: {
        flexDirection: 'row',
        gap: 14,
        marginBottom: 24,
    },
    kpiCard: {
        flex: 1,
        borderRadius: 6,
        border: '1 solid #e4e4e7',
        padding: 12,
    },
    kpiTitle: {
        fontSize: 9,
        color: '#71717a',
        marginBottom: 4,
    },
    kpiValue: {
        fontSize: 20,
        fontFamily: 'Helvetica-Bold',
        color: '#111111',
    },
    chartSection: {
        marginBottom: 22,
    },
    chartTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#222222',
        marginBottom: 8,
    },
    emptyChart: {
        fontSize: 9,
        color: '#a1a1aa',
        marginBottom: 8,
    },
    divider: {
        borderBottom: '1 solid #f4f4f5',
        marginBottom: 22,
    },
    footer: {
        position: 'absolute',
        bottom: 14,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerText: {
        fontSize: 8,
        color: '#a1a1aa',
    },
});

// ─── Vertical Bar Chart (byBank / byType) ────────────────────────────────────

function VerticalBarChart({ data, svgWidth = 515 }) {
    if (!data || data.length === 0) return null;

    const max      = Math.max(...data.map((d) => d.total));
    const topPad   = 18;   // space above bars for value labels
    const maxBarH  = 100;
    const labelH   = 28;   // space below bars for item labels
    const svgH     = topPad + maxBarH + labelH;
    const slotW    = svgWidth / data.length;

    return (
        <Svg width={svgWidth} height={svgH}>
            {data.map((item, i) => {
                const barW  = Math.max(slotW * 0.55, 8);
                const barH  = max > 0 ? Math.max((item.total / max) * maxBarH, 2) : 2;
                const barX  = slotW * i + (slotW - barW) / 2;
                const barY  = topPad + (maxBarH - barH);
                const cx    = slotW * i + slotW / 2;

                return (
                    <G key={i}>
                        <Rect x={barX} y={barY} width={barW} height={barH} fill="#16a34a" rx={2} />
                        {/* value label above bar */}
                        <Text
                            x={cx}
                            y={barY - 4}
                            fontSize={6.5}
                            fill="#555555"
                            textAnchor="middle"
                            fontFamily="Helvetica"
                        >
                            {formatCompact(item.total)}
                        </Text>
                        {/* item label below bars */}
                        <Text
                            x={cx}
                            y={topPad + maxBarH + 11}
                            fontSize={7}
                            fill="#71717a"
                            textAnchor="middle"
                            fontFamily="Helvetica"
                        >
                            {truncate(item.label, 11)}
                        </Text>
                    </G>
                );
            })}
        </Svg>
    );
}

// ─── Horizontal Bar Chart (monthly) ──────────────────────────────────────────

function HorizontalBarChart({ data, svgWidth = 515 }) {
    if (!data || data.length === 0) return null;

    const max       = Math.max(...data.map((d) => d.total));
    const labelW    = 52;
    const valueW    = 58;
    const barAreaW  = svgWidth - labelW - valueW - 8;
    const rowH      = 20;
    const barH      = 10;
    const svgH      = data.length * rowH + 4;

    return (
        <Svg width={svgWidth} height={svgH}>
            {data.map((item, i) => {
                const barW  = max > 0 ? Math.max((item.total / max) * barAreaW, 2) : 2;
                const y     = i * rowH + (rowH - barH) / 2;

                return (
                    <G key={i}>
                        {/* label */}
                        <Text
                            x={0}
                            y={i * rowH + rowH / 2 + 2.5}
                            fontSize={7}
                            fill="#71717a"
                            textAnchor="start"
                            fontFamily="Helvetica"
                        >
                            {truncate(item.label, 7)}
                        </Text>
                        {/* bar background */}
                        <Rect x={labelW} y={y} width={barAreaW} height={barH} fill="#f4f4f5" rx={2} />
                        {/* bar fill */}
                        <Rect x={labelW} y={y} width={barW} height={barH} fill="#16a34a" rx={2} />
                        {/* value */}
                        <Text
                            x={labelW + barAreaW + 5}
                            y={i * rowH + rowH / 2 + 2.5}
                            fontSize={7}
                            fill="#222222"
                            textAnchor="start"
                            fontFamily="Helvetica-Bold"
                        >
                            {formatCompact(item.total)}
                        </Text>
                    </G>
                );
            })}
        </Svg>
    );
}

// ─── Document ────────────────────────────────────────────────────────────────

export default function DashboardPDFDocument({ summary, monthly, userName }) {
    const now      = new Date();
    const nowStr   = formatTimestamp(now);
    const dateSlug = now.toISOString().split('T')[0];

    return (
        <Document title={`receiptv-dashboard-${dateSlug}`} author="ReceipTV">
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerTitle}>ReceipTV — Visão Geral</Text>
                        {userName ? <Text style={styles.headerUser}>{userName}</Text> : null}
                    </View>
                    <Text style={styles.headerTimestamp}>{nowStr}</Text>
                </View>

                {/* Body */}
                <View style={styles.body}>

                    {/* KPIs */}
                    <Text style={styles.sectionLabel}>RESUMO</Text>
                    <View style={styles.kpiRow}>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiTitle}>Volume Total</Text>
                            <Text style={styles.kpiValue}>{formatCurrency(summary?.total || 0)}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiTitle}>Comprovantes Lidos</Text>
                            <Text style={styles.kpiValue}>{summary?.count || 0}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Chart: by bank */}
                    <View style={styles.chartSection}>
                        <Text style={styles.chartTitle}>Gastos por Banco</Text>
                        {summary?.byBank?.length > 0
                            ? <VerticalBarChart data={summary.byBank} />
                            : <Text style={styles.emptyChart}>Sem dados suficientes.</Text>
                        }
                    </View>

                    {/* Chart: by type */}
                    <View style={styles.chartSection}>
                        <Text style={styles.chartTitle}>Gastos por Tipo de Pagamento</Text>
                        {summary?.byType?.length > 0
                            ? <VerticalBarChart data={summary.byType} />
                            : <Text style={styles.emptyChart}>Sem dados suficientes.</Text>
                        }
                    </View>

                    {/* Chart: monthly */}
                    <View style={styles.chartSection}>
                        <Text style={styles.chartTitle}>Volume Mensal</Text>
                        {monthly?.length > 0
                            ? <HorizontalBarChart data={monthly} />
                            : <Text style={styles.emptyChart}>Sem dados suficientes.</Text>
                        }
                    </View>

                </View>

                {/* Footer — fixed on every page */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Gerado em {nowStr}</Text>
                    <Text
                        style={styles.footerText}
                        render={({ pageNumber, totalPages }) => `Pág ${pageNumber} / ${totalPages}`}
                    />
                </View>

            </Page>
        </Document>
    );
}
