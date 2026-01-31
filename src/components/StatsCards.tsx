'use client';

import styles from './StatsCards.module.css';
import { KPI_STATS } from '../data/mock';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Invoice } from '../hooks/useInvoices';

interface StatsCardsProps {
    dateRange?: [number, number] | null;
    invoices: Invoice[];
    loading: boolean;
    totalAmount: number;
}

export default function StatsCards({ dateRange, invoices, loading, totalAmount }: StatsCardsProps) {
    // Removed internal useInvoices hook to rely on parent state for sync

    // Calculate Dynamic Counts & Spend
    let filteredInvoices = invoices;
    let periodLabelSuffix = '';
    let isRangeActive = false;
    let dynamicTotalSpend = totalAmount; // Default to YTD
    let spendLabel = 'Total Spend (YTD)';

    if (dateRange && !loading) {
        const [startMs, endMs] = dateRange;
        isRangeActive = true;

        // Filter invoices for the selected period
        filteredInvoices = invoices.filter(inv => {
            if (!inv.date || inv.date === 'N/A') return false;
            const invTime = parseISO(inv.date).getTime();
            return invTime >= startMs && invTime <= endMs;
        });

        // Generate suffix for labels, e.g., " (2025)" or " (2025-26)"
        const startYear = new Date(startMs).getFullYear();
        const endYear = new Date(endMs).getFullYear();
        if (startYear === endYear) {
            periodLabelSuffix = ` (${startYear})`;
        } else {
            const shortEndYear = endYear.toString().slice(-2);
            periodLabelSuffix = ` (${startYear}-${shortEndYear})`;
        }

        // Recalculate Total Spend strictly on filtered list
        const sum = filteredInvoices.reduce((acc, inv) => acc + (inv.rawAmount || 0), 0);
        dynamicTotalSpend = sum;
    }

    // Spend Label
    if (isRangeActive) {
        spendLabel = `Total Spend${periodLabelSuffix}`;
    }

    return (
        <div className={styles.grid}>
            {KPI_STATS.map((stat, index) => {
                const isPositive = stat.trend === 'positive';
                let TrendIcon = Minus;
                let trendClass = styles.neutral;

                if (stat.change.startsWith('+')) {
                    TrendIcon = TrendingUp;
                } else if (stat.change.startsWith('-')) {
                    TrendIcon = TrendingDown;
                }

                if (stat.trend === 'positive') trendClass = styles.positive;
                if (stat.trend === 'negative') trendClass = styles.negative;
                if (stat.trend === 'neutral') trendClass = styles.neutral;

                // Override value for Total Spend and Processed Invoices
                let displayValue = stat.value;
                let displayLabel = stat.label;
                let isCurrency = false;
                let isLoadingValue = false;

                if (stat.label === 'Total Spend (YTD)') {
                    isLoadingValue = loading;
                    isCurrency = true;
                    if (isRangeActive) displayLabel = spendLabel;

                    if (!loading) {
                        displayValue = dynamicTotalSpend.toString();
                    }
                } else if (stat.label === 'Processed Invoices') {
                    isLoadingValue = loading;
                    if (isRangeActive) displayLabel = `Processed Invoices${periodLabelSuffix}`;

                    if (!loading) {
                        const source = isRangeActive ? filteredInvoices : invoices;
                        displayValue = source.filter(inv => inv.type === 'invoice').length.toString();
                    }
                } else if (stat.label === 'Total Receipts') {
                    isLoadingValue = loading;
                    if (isRangeActive) displayLabel = `Total Receipts${periodLabelSuffix}`;

                    if (!loading) {
                        const source = isRangeActive ? filteredInvoices : invoices;
                        displayValue = source.filter(inv => inv.type === 'receipt').length.toString();
                    }
                } else if (stat.label === 'Total Invoices & Receipts') {
                    isLoadingValue = loading;
                    if (isRangeActive) displayLabel = `Total Invoices & Receipts${periodLabelSuffix}`;

                    if (!loading) {
                        const source = isRangeActive ? filteredInvoices : invoices;
                        displayValue = source.length.toString();
                    }
                }

                // Format Big Numbers Properly
                let formattedValue = displayValue;
                if (!isLoadingValue && !isNaN(Number(displayValue))) {
                    // Standard Swiss format: 1'000 (Rounded) but with wider gap requested
                    // formatting with en-US gives commas, then we swap for single non-breaking space
                    formattedValue = Math.round(Number(displayValue)).toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).replace(/,/g, '\u00A0');
                }

                return (
                    <div key={index} className="card">
                        <div className={styles.cardContent}>
                            <span className={styles.label}>{displayLabel}</span>
                            <div className={styles.valueRow}>
                                {isLoadingValue ? (
                                    <Loader2 className="animate-spin text-tertiary" size={24} />
                                ) : (
                                    <>
                                        {isCurrency && <span className={styles.currency}>CHF</span>}
                                        <span className={styles.value}>{formattedValue}</span>
                                    </>
                                )}
                            </div>
                            <div className={styles.metaRow}>
                                <span className={`${styles.changeBadge} ${trendClass}`}>
                                    <TrendIcon size={14} />
                                    {stat.change}
                                </span>
                                <span className={styles.subtext}>{stat.subtext}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
