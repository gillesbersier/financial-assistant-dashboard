'use client';

import styles from './StatsCards.module.css';
import { KPI_STATS } from '../data/mock';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { useInvoices } from '../hooks/useInvoices';

export default function StatsCards() {
    const { totalAmount, invoices, loading } = useInvoices();

    // Format total amount with CHF prefix
    const formattedTotal = `CHF ${totalAmount.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
                let isLoadingValue = false;

                if (stat.label === 'Total Spend (YTD)') {
                    isLoadingValue = loading;
                    if (!loading) {
                        displayValue = formattedTotal;
                    }
                } else if (stat.label === 'Processed Invoices') {
                    isLoadingValue = loading;
                    if (!loading) {
                        // Only count actual invoices, exclude receipts
                        displayValue = invoices.filter(inv => inv.type === 'invoice').length.toString();
                    }
                } else if (stat.label === 'Total Receipts') {
                    isLoadingValue = loading;
                    if (!loading) {
                        // Only count receipts
                        displayValue = invoices.filter(inv => inv.type === 'receipt').length.toString();
                    }
                } else if (stat.label === 'Total Invoices & Receipts') {
                    isLoadingValue = loading;
                    if (!loading) {
                        displayValue = invoices.length.toString();
                    }
                }

                return (
                    <div key={index} className="card">
                        <div className={styles.cardContent}>
                            <span className={styles.label}>{stat.label}</span>
                            <div className={styles.valueRow}>
                                {isLoadingValue ? (
                                    <Loader2 className={styles.spin} size={24} />
                                ) : (
                                    <span className={styles.value}>{displayValue}</span>
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
