'use client';

import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from './SpendingChart.module.css';
import { useInvoices } from '../hooks/useInvoices';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { RotateCcw } from 'lucide-react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

interface SpendingChartProps {
    onMonthSelect?: (date: Date | null) => void;
    selectedMonth?: Date | null;
}

export default function SpendingChart({ onMonthSelect, selectedMonth }: SpendingChartProps) {
    const { invoices, loading } = useInvoices();
    const [dateRange, setDateRange] = useState<[number, number] | null>(null);

    // Calculate Min/Max dates from data
    const limits = useMemo(() => {
        const timestamps = invoices
            .map(inv => inv.date !== 'N/A' ? parseISO(inv.date).getTime() : null)
            .filter((t): t is number => t !== null && !isNaN(t));

        if (timestamps.length === 0) {
            return { minTime: 0, maxTime: 0 };
        }
        return {
            minTime: Math.min(...timestamps),
            maxTime: Math.max(...timestamps)
        };
    }, [invoices]);

    // Initialize range: Default to Last 12 Months
    useEffect(() => {
        if (dateRange === null && limits.minTime !== limits.maxTime) {
            const end = limits.maxTime;
            const startTarget = subMonths(new Date(end), 11).getTime();
            const start = Math.max(startTarget, limits.minTime);
            setDateRange([start, end]);
        }
    }, [limits, dateRange]);

    const handleReset = () => {
        const end = limits.maxTime;
        const startTarget = subMonths(new Date(end), 11).getTime();
        const start = Math.max(startTarget, limits.minTime);
        setDateRange([start, end]);
        if (onMonthSelect) {
            onMonthSelect(null);
        }
    };

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

            if (invTime >= startMs && invTime <= endMs) {
                const key = format(invDate, 'yyyy-MM');
                if (aggregated[key]) {
                    aggregated[key].amount += inv.rawAmount;
                }
            }
        });

        return Object.values(aggregated).map(item => ({
            month: item.monthLabel,
            amount: Math.round(item.amount),
            fullDate: item.fullDate
        }));
    }, [invoices, dateRange, limits]);

    const handleBarClick = (data: any) => {
        if (!onMonthSelect || !data || !data.fullDate) return;
        const clickedDate = data.fullDate;

        // Toggle if already selected
        if (selectedMonth && format(selectedMonth, 'yyyy-MM') === format(clickedDate, 'yyyy-MM')) {
            onMonthSelect(null);
        } else {
            onMonthSelect(clickedDate);
        }
    };

    const formatDate = (ts: number) => format(new Date(ts), 'MMM yyyy');

    if (loading) {
        return <div className={`card ${styles.chartContainer} animate-pulse`} style={{ height: '300px' }}></div>;
    }

    if (!dateRange && invoices.length > 0) return null;

    return (
        <div className={`card ${styles.chartContainer}`}>
            <div className={styles.header}>
                <h3 className={styles.title}>Monthly Spending</h3>

                {/* Date Controls Row */}
                <div style={{
                    flex: 1,
                    marginLeft: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, minWidth: '60px', textAlign: 'right' }}>
                        {dateRange ? formatDate(dateRange[0]) : ''}
                    </span>

                    <div style={{
                        flex: 1,
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid var(--neutral-700)',
                        borderRadius: '8px',
                        padding: '0 12px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
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
                        />
                    </div>

                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, minWidth: '60px' }}>
                        {dateRange ? formatDate(dateRange[1]) : ''}
                    </span>

                    <button
                        onClick={handleReset}
                        className={styles.resetBtn}
                        title="Reset to Last 12 Months"
                        style={{
                            background: 'none',
                            border: '1px solid var(--neutral-600)',
                            borderRadius: '4px',
                            padding: '4px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '24px',
                            width: '24px'
                        }}
                    >
                        <RotateCcw size={14} />
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
                            formatter={(value: number | undefined) => [(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), 'Spending']}
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
    );
}
