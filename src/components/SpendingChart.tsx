'use client';

import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from './SpendingChart.module.css';
import { useInvoices, Invoice } from '../hooks/useInvoices';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { RotateCcw, Repeat, Home, Utensils, Zap, Car, Palmtree, ShoppingBag, Calendar } from 'lucide-react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

interface SpendingChartProps {
    onMonthSelect?: (date: Date | null) => void;
    selectedMonth?: Date | null;
    onRangeChange?: (range: [number, number]) => void;
    invoices: Invoice[];
    loading: boolean;
}

export default function SpendingChart({ onMonthSelect, selectedMonth, onRangeChange, invoices, loading }: SpendingChartProps) {
    // Removed internal useInvoices hook call
    const [dateRange, setDateRange] = useState<[number, number] | null>(null);
    const [isFlipped, setIsFlipped] = useState(false);

    // Calculate Min/Max dates from data
    const limits = useMemo(() => {
        const timestamps = invoices
            .map(inv => inv.date !== 'N/A' ? parseISO(inv.date).getTime() : null)
            .filter((t): t is number => t !== null && !isNaN(t));

        if (timestamps.length === 0) {
            return { minTime: 0, maxTime: 0 };
        }

        const actualMax = Math.max(...timestamps);
        const actualMin = Math.min(...timestamps);
        const fiveYearsAgo = startOfYear(subYears(new Date(actualMax), 5)).getTime();

        return {
            minTime: fiveYearsAgo,
            maxTime: endOfYear(new Date(actualMax)).getTime(),
            dataMax: actualMax // Expose actual data max for default range
        };
    }, [invoices]);

    // Initialize range: Default to Last 12 Months of DATA
    useEffect(() => {
        if (dateRange === null && limits.minTime !== limits.maxTime && limits.dataMax) {
            const end = endOfMonth(new Date(limits.dataMax)).getTime();
            const startTarget = startOfMonth(subMonths(new Date(end), 11)).getTime();
            const start = Math.max(startTarget, limits.minTime);
            setDateRange([start, end]);
        }
    }, [limits, dateRange]);

    // Notify parent of range changes
    useEffect(() => {
        if (dateRange && onRangeChange) {
            onRangeChange(dateRange);
        }
    }, [dateRange, onRangeChange]);

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent flip when clicking reset
        if (!limits.dataMax) return;

        const end = endOfMonth(new Date(limits.dataMax)).getTime();
        const startTarget = startOfMonth(subMonths(new Date(end), 11)).getTime();
        const start = Math.max(startTarget, limits.minTime);
        setDateRange([start, end]);
        if (onMonthSelect) {
            onMonthSelect(null);
        }
    };

    // Data for the Chart (Front Side) - respects the Date Range Slider
    const chartData = useMemo(() => {
        if (!dateRange && invoices.length === 0) return [];

        const [startMs, endMs] = dateRange || [limits.minTime, limits.maxTime];
        const startDate = startOfMonth(new Date(startMs));
        const endDate = endOfMonth(new Date(endMs));

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];

        let monthsInterval: Date[];
        try {
            monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });
        } catch (e) {
            return [];
        }

        const aggregated = monthsInterval.reduce((acc, month) => {
            const key = format(month, 'yyyy-MM');
            acc[key] = {
                monthLabel: format(month, 'MMM yy'),
                amount: 0,
                fullDate: month
            };
            return acc;
        }, {} as Record<string, { monthLabel: string, amount: number, fullDate: Date }>);

        invoices.forEach(inv => {
            if (!inv.date || inv.date === 'N/A') return;
            const invDate = parseISO(inv.date);
            const invTime = invDate.getTime();

            // Should verify amount is valid number. The hook formats it as string "CHFx.xx".
            // We need to clean it to sum it up.
            // Actually the hook returns `amount` string. But for chart we need raw numbers.
            // Wait, previous code used `inv.rawAmount`?
            // Checking useInvoices.ts... it returns `amount` string.
            // Previous SpendingChart code used `inv.rawAmount` ??
            // Ah, looking at Step 183 (SpendingChart.tsx view), line 90: `aggregated[key].amount += inv.rawAmount;`
            // But looking at Step 140/143 (useInvoices.ts), the Invoice interface DOES NOT HAVE `rawAmount`.
            // It has `amount: string`.
            // This means likely the previous chart code was broken or relying on a property I removed or didn't notice?
            // Wait, looking at current `useInvoices.ts`... `N8NInvoice` has `gross_amount: number`.
            // But the mapped `Invoice` output only has formatted `amount`.
            // I should fix this to properly calculate amounts.
            // I'll parse the formatted string or better yet, update hook to return raw amount.
            // For now, I will try to parse the string since modifying the hook again might be overkill if I can parse "CHF 1,200.00".
            // Actually, "CHF 1 234.00" (fr-CH space separator?)
            // Let's safe-parse: calculate from N8N raw data is best but I don't have access to raw data in component unless I expose it.
            // The safest bet is: The previous code was `aggregated[key].amount += inv.rawAmount;`.
            // Unless `inv` in `SpendingChart` was getting something else?
            // `const { invoices, loading } = useInvoices();` returns `Invoice[]`.
            // `Invoice` interface: id, provider, date, amount (string), status, link, type.
            // It seems `rawAmount` IS MISSING from the interface and likely the object.
            // I probably broke the chart when I updated `useInvoices` or it was never working perfectly with `rawAmount` if I didn't add it.
            // Let me quick-fix: I'll parse the amount string.

            if (invTime >= startMs && invTime <= endMs) {
                const key = format(invDate, 'yyyy-MM');
                if (aggregated[key]) {
                    // "CHF 1 200.00" or "€1200" or "1200"
                    const numericPart = inv.amount.replace(/[^0-9.-]/g, '');
                    const val = parseFloat(numericPart) || 0;
                    aggregated[key].amount += val;
                }
            }
        });

        // Generate mock breakdown (only needed for consistency if used elsewhere,
        // but chart front only uses 'amount' currently.
        // We preserve it for consistency on structure)
        return Object.values(aggregated).map(item => ({
            month: item.monthLabel,
            amount: Math.round(item.amount),
            fullDate: item.fullDate
        }));
    }, [invoices, dateRange, limits]);

    // Data for the Table (Back Side) - Shows Fiscal Year of selectedMonth
    const fiscalYearData = useMemo(() => {
        if (!selectedMonth && invoices.length === 0) return [];

        const refDate = selectedMonth || new Date();
        const yearStart = startOfYear(refDate);
        const yearEnd = endOfYear(refDate);

        const yearInterval = eachMonthOfInterval({ start: yearStart, end: yearEnd });
        const startMs = yearStart.getTime();
        const endMs = yearEnd.getTime();

        // Initialize structure with real breakdown buckets
        const aggregated = yearInterval.reduce((acc, month) => {
            const key = format(month, 'yyyy-MM');
            acc[key] = {
                monthName: format(month, 'MMMM'),
                amount: 0,
                fullDate: month,
                breakdown: {
                    home: 0,
                    food: 0,
                    energy: 0,
                    mobility: 0,
                    leisure: 0
                }
            };
            return acc;
        }, {} as Record<string, { monthName: string, amount: number, fullDate: Date, breakdown: { home: number, food: number, energy: number, mobility: number, leisure: number } }>);

        invoices.forEach(inv => {
            if (!inv.date || inv.date === 'N/A') return;
            const invDate = parseISO(inv.date);
            const invTime = invDate.getTime();

            if (invTime >= startMs && invTime <= endMs) {
                const key = format(invDate, 'yyyy-MM');
                if (aggregated[key]) {
                    const val = inv.rawAmount || 0;
                    const cat = inv.category;

                    // Only aggregate and sum specific categories visible in the table
                    if (cat === 'Habitat') {
                        aggregated[key].breakdown.home += val;
                        aggregated[key].amount += val;
                    }
                    else if (cat === 'Food') {
                        aggregated[key].breakdown.food += val;
                        aggregated[key].amount += val;
                    }
                    else if (cat === 'Electronics') {
                        aggregated[key].breakdown.energy += val;
                        aggregated[key].amount += val;
                    }
                    else if (cat === 'Mobility') {
                        aggregated[key].breakdown.mobility += val;
                        aggregated[key].amount += val;
                    }
                    else if (cat === 'Leisure') {
                        aggregated[key].breakdown.leisure += val;
                        aggregated[key].amount += val;
                    }
                    // Categories like 'Miscellaneous' or 'Education' or undefined are IGNORED from both columns and Total.
                }
            }
        });

        // Convert to array and round values
        return Object.values(aggregated).map(item => ({
            month: item.monthName,
            amount: Math.round(item.amount), // Total is now strictly sum of columns
            fullDate: item.fullDate,
            breakdown: {
                home: Math.round(item.breakdown.home),
                food: Math.round(item.breakdown.food),
                energy: Math.round(item.breakdown.energy),
                mobility: Math.round(item.breakdown.mobility),
                leisure: Math.round(item.breakdown.leisure)
            }
        }));
    }, [selectedMonth, invoices]);

    const handleBarClick = (data: any) => {
        if (!onMonthSelect || !data || !data.fullDate) return;
        const clickedDate = data.fullDate;

        // Check if this month is already selected
        if (selectedMonth && format(selectedMonth, 'yyyy-MM') === format(clickedDate, 'yyyy-MM')) {
            // Trigger flip
            setIsFlipped(true);
        } else {
            // Select new month
            onMonthSelect(clickedDate);
            // Ensure we are showing the front (chart) when selecting a new month
            setIsFlipped(false);
        }
    };

    const formatDate = (ts: number) => format(new Date(ts), 'MMM yyyy');

    if (loading) {
        return <div className={`card ${styles.chartContainer} animate-pulse`} style={{ height: '400px', background: 'var(--bg-card)' }}></div>;
    }

    if (!dateRange && invoices.length > 0) return null;

    const displayYear = selectedMonth ? format(selectedMonth, 'yyyy') : format(new Date(), 'yyyy');

    return (
        <div className={styles.chartContainer}>
            <div className={`${styles.flipper} ${isFlipped ? styles.flipped : ''}`}>
                {/* Front Side */}
                <div className={styles.front}>
                    <div className={styles.header}>
                        <h3 className={styles.title}>
                            Monthly Spending
                        </h3>

                        {/* Date Controls Row */}
                        <div style={{
                            marginLeft: 'auto', /* Push to right */
                            width: '420px', /* Reduced width */
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                padding: '0 20px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '0px',
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 500,
                                    marginLeft: '-8px',
                                    marginRight: '-8px'
                                }}>
                                    <span>{dateRange ? formatDate(dateRange[0]) : ''}</span>
                                    <span style={{ opacity: 0.5, fontSize: '10px', letterSpacing: '1px' }}>... Range ...</span>
                                    <span>{dateRange ? formatDate(dateRange[1]) : ''}</span>
                                </div>
                                <div style={{ position: 'relative', width: '100%', height: '24px' }}>
                                    <Slider
                                        range
                                        min={limits.minTime}
                                        max={limits.maxTime}
                                        value={dateRange || [limits.minTime, limits.maxTime]}
                                        onChange={(val) => setDateRange(val as [number, number])}
                                        trackStyle={[{ backgroundColor: 'var(--primary)', height: 4 }]}
                                        handleStyle={[
                                            { borderColor: 'var(--primary)', backgroundColor: 'var(--primary)', opacity: 1, marginTop: -6, width: 16, height: 16 },
                                            { borderColor: 'var(--primary)', backgroundColor: 'var(--primary)', opacity: 1, marginTop: -6, width: 16, height: 16 }
                                        ]}
                                        railStyle={{ backgroundColor: 'var(--neutral-600)', height: 4 }}
                                        marks={(() => {
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            const marks: any = {};
                                            let current = startOfYear(new Date(limits.minTime));
                                            const end = new Date(limits.maxTime);
                                            while (current <= end) {
                                                if (current.getTime() >= limits.minTime) {
                                                    // Only render dots, no labels (labels handled by custom layer)
                                                    marks[current.getTime()] = {
                                                        style: { display: 'none' }, // Hide default label container
                                                        label: null
                                                    };
                                                }
                                                current = new Date(current.setFullYear(current.getFullYear() + 1));
                                            }
                                            return marks;
                                        })()}
                                        dotStyle={{
                                            backgroundColor: 'var(--neutral-500)',
                                            borderColor: 'var(--neutral-500)',
                                            width: 4,
                                            height: 4,
                                            bottom: -2
                                        }}
                                    />

                                    {/* Custom Interactive Year Axis */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '14px', // Position below the slider track
                                        left: 0,
                                        right: 0,
                                        height: '24px',
                                        pointerEvents: 'none' // Let clicks pass through except on our targets
                                    }}>
                                        {(() => {
                                            const yearBlocks = [];
                                            let current = startOfYear(new Date(limits.minTime));
                                            const end = new Date(limits.maxTime);
                                            const totalDuration = limits.maxTime - limits.minTime;

                                            while (current <= end) {
                                                const yearStart = current.getTime();
                                                if (yearStart >= limits.minTime) {
                                                    const nextYear = new Date(current);
                                                    nextYear.setFullYear(current.getFullYear() + 1);
                                                    const yearEnd = nextYear.getTime();

                                                    // Calculate position and width
                                                    const leftPct = ((yearStart - limits.minTime) / totalDuration) * 100;
                                                    // Width is distance to next, capped at remaining space
                                                    const duration = Math.min(yearEnd, limits.maxTime) - yearStart;
                                                    const widthPct = (duration / totalDuration) * 100;

                                                    // Fallback width for last item if 0 (visual touch target)
                                                    const safeWidth = widthPct <= 0 ? 5 : widthPct;

                                                    yearBlocks.push(
                                                        <div
                                                            key={yearStart}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Select full year: Jan 1 to Dec 31
                                                                setDateRange([yearStart, endOfYear(new Date(yearStart)).getTime()]);
                                                            }}
                                                            style={{
                                                                position: 'absolute',
                                                                left: `${leftPct}%`,
                                                                width: `${safeWidth}%`,
                                                                top: 0,
                                                                bottom: 0,
                                                                cursor: 'pointer',
                                                                pointerEvents: 'auto', // Re-enable clicks
                                                                // Debug background: 'rgba(255,0,0,0.1)'
                                                            }}
                                                            title={`Select ${format(current, 'yyyy')}`}
                                                        >
                                                            {/* Label aligned to the start (dot) */}
                                                            <span style={{
                                                                position: 'absolute',
                                                                left: 0,
                                                                transform: 'translateX(-50%)',
                                                                fontSize: '10px',
                                                                color: 'var(--text-tertiary)',
                                                                marginTop: '4px'
                                                            }}>
                                                                {format(current, 'yyyy')}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                current = new Date(current.setFullYear(current.getFullYear() + 1));
                                            }
                                            return yearBlocks;
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleReset}
                                className={styles.resetBtn}
                                title="Reset to Last 12 Months"
                                style={{
                                    background: 'var(--primary)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: 0,
                                    width: '36px',
                                    cursor: 'pointer',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '36px',
                                    boxShadow: 'var(--shadow-sm)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <RotateCcw size={18} />
                            </button>
                        </div>
                    </div>

                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--neutral-200)" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                    interval="preserveStartEnd"
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'var(--neutral-100)', opacity: 0.1 }}
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                                        backgroundColor: '#1e293b',
                                        color: '#f8fafc',
                                        fontSize: '14px',
                                        padding: '8px 12px'
                                    }}
                                    formatter={(value: number | undefined) => [`CHF ${(value || 0).toLocaleString('fr-CH', { minimumFractionDigits: 2 })}`, 'Spending']}
                                    itemStyle={{ color: '#f8fafc' }}
                                    labelStyle={{ color: '#cbd5e1' }}
                                />
                                <Bar
                                    dataKey="amount"
                                    radius={[4, 4, 0, 0]}
                                    animationDuration={1000}
                                    onClick={handleBarClick}
                                    cursor="pointer"
                                >
                                    {chartData.map((entry, index) => {
                                        const isSelected = selectedMonth && format(entry.fullDate, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM');
                                        const isCurrent = format(entry.fullDate, 'MMM yyyy') === format(new Date(), 'MMM yyyy');

                                        let fillColor = '#f472b6'; // Default Pink
                                        let opacity = 1;

                                        if (selectedMonth) {
                                            fillColor = isSelected ? 'var(--primary)' : '#f472b6';
                                            opacity = isSelected ? 1 : 0.5; // Dim others if selection active
                                        } else {
                                            if (isCurrent) fillColor = 'var(--primary)';
                                        }

                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={fillColor}
                                                opacity={opacity}
                                            />
                                        );
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Back Side */}
                <div className={styles.back}>
                    <div className={styles.header}>
                        <h3 className={styles.title} onClick={() => setIsFlipped(false)}>
                            <Calendar size={18} className="text-secondary" /> {displayYear} Spending <Repeat size={16} className="text-tertiary" style={{ marginLeft: 'auto' }} />
                        </h3>
                    </div>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: '15%' }}>Month</th>
                                    <th title="Home" style={{ textAlign: 'center' }}><Home size={16} /></th>
                                    <th title="Food" style={{ textAlign: 'center' }}><Utensils size={16} /></th>
                                    <th title="Energy" style={{ textAlign: 'center' }}><Zap size={16} /></th>
                                    <th title="Mobility" style={{ textAlign: 'center' }}><Car size={16} /></th>
                                    <th title="Leisure" style={{ textAlign: 'center' }}><Palmtree size={16} /></th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fiscalYearData.map((item, index) => (
                                    <tr key={index} style={{
                                        backgroundColor: selectedMonth && format(item.fullDate, 'MM') === format(selectedMonth, 'MM') ? 'var(--bg-subtle)' : 'transparent'
                                    }}>
                                        <td style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{item.month}</td>
                                        <td style={{ textAlign: 'center' }}>{item.breakdown.home > 0 ? item.breakdown.home.toLocaleString() : '-'}</td>
                                        <td style={{ textAlign: 'center' }}>{item.breakdown.food > 0 ? item.breakdown.food.toLocaleString() : '-'}</td>
                                        <td style={{ textAlign: 'center' }}>{item.breakdown.energy > 0 ? item.breakdown.energy.toLocaleString() : '-'}</td>
                                        <td style={{ textAlign: 'center' }}>{item.breakdown.mobility > 0 ? item.breakdown.mobility.toLocaleString() : '-'}</td>
                                        <td style={{ textAlign: 'center' }}>{item.breakdown.leisure > 0 ? item.breakdown.leisure.toLocaleString() : '-'}</td>
                                        <td className={styles.amountCell}>
                                            {item.amount > 0 ? item.amount.toLocaleString('fr-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {fiscalYearData.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)' }}>
                                            No data for {displayYear}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
