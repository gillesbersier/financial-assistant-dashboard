"use client";

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from './SpendingChart.module.css';
import { useInvoices } from '../hooks/useInvoices';
import { format, subMonths, startOfYear, parseISO, isAfter, isBefore, startOfMonth, endOfMonth, eachMonthOfInterval, endOfYear } from 'date-fns';

export default function SpendingChart() {
    const { invoices, loading } = useInvoices();
    const [range, setRange] = useState<'YTD' | 'L12M'>('YTD');

    const chartData = useMemo(() => {
        if (!invoices.length) return [];

        const now = new Date();
        let startDate: Date;
        let endDate: Date = endOfMonth(now);

        if (range === 'YTD') {
            startDate = startOfYear(now);
            endDate = endOfYear(now); // Force full year X-axis
        } else {
            // Last 12 months (e.g. from 12 months ago to now)
            startDate = startOfMonth(subMonths(now, 11));
        }

        // Initialize all months in range with 0
        const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });
        const aggregated = monthsInterval.reduce((acc, month) => {
            const key = format(month, 'MMM');
            acc[key] = { month: key, amount: 0, fullDate: month };
            return acc;
        }, {} as Record<string, { month: string, amount: number, fullDate: Date }>);

        // Aggregate actual data
        invoices.forEach(inv => {
            if (!inv.date || inv.date === 'N/A') return;
            const invDate = parseISO(inv.date);

            // Check range 
            if (invDate >= startDate && invDate <= endDate) {
                const key = format(invDate, 'MMM');
                if (aggregated[key]) {
                    aggregated[key].amount += inv.rawAmount;
                }
            }
        });

        // Convert to array
        return Object.values(aggregated).map(item => ({
            month: item.month,
            amount: Math.round(item.amount)
        }));
    }, [invoices, range]);

    return (
        <div className={`card ${styles.chartContainer}`}>
            <div className={styles.header}>
                <h3 className={styles.title}>Monthly Spending</h3>
                <select
                    className={styles.filter}
                    value={range}
                    onChange={(e) => setRange(e.target.value as 'YTD' | 'L12M')}
                >
                    <option value="YTD">Year to Date</option>
                    <option value="L12M">Last 12 months</option>
                </select>
            </div>

            <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--neutral-200)" />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
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
                                backgroundColor: '#1e293b', // Force a solid dark color (slate-800) for contrast
                                color: '#f8fafc', // Force white text
                                fontSize: '14px',
                                padding: '8px 12px'
                            }}
                            formatter={(value: number | undefined) => [(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), 'Spending']}
                            itemStyle={{ color: '#f8fafc' }}
                            labelStyle={{ color: '#cbd5e1' }}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} animationDuration={1000}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.month === format(new Date(), 'MMM') ? 'var(--primary)' : 'var(--neutral-300)'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
