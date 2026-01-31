"use client";

import { useState } from 'react';
import styles from './InvoicesTable.module.css';
import { ChevronRight, Search, Filter, Loader2, AlertCircle, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown, Home, Monitor, Car, Utensils, GraduationCap, Palmtree, MoreHorizontal, HelpCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useInvoices, Invoice } from '../hooks/useInvoices';
import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';

interface InvoicesTableProps {
    filterMonth?: Date | null;
    dateRange?: [number, number] | null;
    invoices: Invoice[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
    updateCategory: (id: string, category: Invoice['category']) => Promise<void>;
    syncStatus: Record<string, 'syncing' | 'success' | 'error'>;
}

export default function InvoicesTable({ filterMonth, dateRange, invoices, loading, error, refresh, updateCategory, syncStatus }: InvoicesTableProps) {
    // Removed internal hook call
    const [activeTab, setActiveTab] = useState<'invoice' | 'receipt'>('invoice');
    const [selectedInvoice, setSelectedInvoice] = useState<typeof invoices[0] | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredInvoices = invoices.filter(inv => {
        if (inv.type !== activeTab) return false;

        // Date Range Filter
        if (dateRange) {
            if (!inv.date || inv.date === 'N/A') return false;
            const invTime = parseISO(inv.date).getTime();
            // Check if within range (inclusive)
            if (invTime < dateRange[0] || invTime > dateRange[1]) {
                return false;
            }
        }

        // Month Filter
        if (filterMonth) {
            // Strictly exclude items with no valid date when filtering by month
            if (!inv.date || inv.date === 'N/A') {
                return false;
            }

            const invDate = parseISO(inv.date);
            if (!isSameMonth(invDate, filterMonth) || !isSameYear(invDate, filterMonth)) {
                return false;
            }
        }

        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            inv.provider.toLowerCase().includes(query) ||
            String(inv.id).toLowerCase().includes(query)
        );
    });

    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let aValue: any = (a as any)[key];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let bValue: any = (b as any)[key];

        // Specific handling for amount (use rawAmount for sorting)
        if (key === 'amount') {
            aValue = a.rawAmount;
            bValue = b.rawAmount;
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown size={14} style={{ marginLeft: 6, opacity: 0.3 }} />;
        }
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} style={{ marginLeft: 6 }} />
            : <ArrowDown size={14} style={{ marginLeft: 6 }} />;
    };


    const handleRowClick = (invoice: typeof invoices[0]) => {
        if (invoice.link) {
            setSelectedInvoice(invoice);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'in_the_books':
                return <span className={`${styles.badge} ${styles.badgeSuccess}`}>In the Books</span>;
            case 'categorized':
                return <span className={`${styles.badge} ${styles.badgeInfo}`}>Categorized</span>;
            case 'pending':
                return <span className={`${styles.badge} ${styles.badgeWarning}`}>Pending</span>;
            case 'review_required':
                return <span className={`${styles.badge} ${styles.badgeError}`}>Review Required</span>;
            default:
                return <span className={`${styles.badge} ${styles.badgeNeutral}`}>{status}</span>;
        }
    };

    return (
        <div className={`card ${styles.tableCard}`}>
            <div className={styles.header}>
                <h3 className={styles.title}>Invoices and Receipts</h3>
                <div className={styles.controls}>
                    <div className={styles.searchWrapper}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search provider or ID..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className={styles.filterBtn}>
                        <Filter size={16} />
                        <span>Filter</span>
                    </button>
                </div>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'invoice' ? styles.tabActive : ''}`}
                    onClick={() => { setActiveTab('invoice'); setSortConfig(null); }}
                >
                    Invoices
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'receipt' ? styles.tabActive : ''}`}
                    onClick={() => { setActiveTab('receipt'); setSortConfig(null); }}
                >
                    Receipts
                </button>
            </div>

            <div className={styles.tableWrapper}>
                {loading ? (
                    <div className={styles.stateContainer}>
                        <Loader2 size={24} className={styles.spinner} />
                        <p>Syncing with financial data...</p>
                    </div>
                ) : error ? (
                    <div className={styles.stateContainer}>
                        <AlertCircle size={24} className={styles.textError} />
                        <p className={styles.textError}>Failed to load data from N8N</p>
                        <span className={styles.subtext}>{error}</span>
                        <button onClick={refresh} className={styles.retryBtn}>
                            <RefreshCw size={14} /> Retry Connection
                        </button>
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('date')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>Date {getSortIcon('date')}</div>
                                </th>
                                <th onClick={() => requestSort('provider')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>Provider {getSortIcon('provider')}</div>
                                </th>
                                <th onClick={() => requestSort('description')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>Description {getSortIcon('description')}</div>
                                </th>
                                <th onClick={() => requestSort('currency')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Currency {getSortIcon('currency')}</div>
                                </th>
                                <th onClick={() => requestSort('amount')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>Amount {getSortIcon('amount')}</div>
                                </th>
                                <th onClick={() => requestSort('status')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>Status {getSortIcon('status')}</div>
                                </th>
                                <th>Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={styles.emptyState}>
                                        No {activeTab}s found
                                    </td>
                                </tr>
                            ) : sortedInvoices.map((inv) => (
                                <tr key={inv.id} className={styles.row} onClick={() => handleRowClick(inv)} style={{ cursor: inv.link ? 'pointer' : 'default' }}>
                                    <td className={styles.dateCell}>{inv.date}</td>
                                    <td className={styles.providerCell}>{inv.provider}</td>
                                    <td>{inv.description}</td>
                                    <td style={{ textAlign: 'center' }}>{inv.currency}</td>
                                    <td className={styles.amountCell}>{inv.rawAmount.toFixed(2)}</td>
                                    <td>{getStatusBadge(inv.status)}</td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <CategorySelect
                                            current={inv.category}
                                            onSelect={(cat) => updateCategory(inv.id, cat)}
                                            syncStatus={syncStatus[inv.id]}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && !error && (
                <div className={styles.footer}>
                    <span className={styles.paginationInfo}>Showing {sortedInvoices.length} entries</span>
                    <div className={styles.paginationControls}>
                        <button className={styles.pageBtn} disabled>Previous</button>
                        <button className={styles.pageBtn} disabled>Next</button>
                    </div>
                </div>
            )}

            {selectedInvoice && (
                <DocumentModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
            )}
        </div>
    );
}

const CATEGORIES: { label: Invoice['category'], icon: any }[] = [
    { label: 'Habitat', icon: Home },
    { label: 'Electronics', icon: Monitor }, // User asked for Electronics
    { label: 'Mobility', icon: Car },
    { label: 'Food', icon: Utensils },
    { label: 'Education', icon: GraduationCap },
    { label: 'Leisure', icon: Palmtree },
    { label: 'Miscellaneous', icon: MoreHorizontal }
];

function CategorySelect({ current, onSelect, syncStatus }: { current: Invoice['category'], onSelect: (c: Invoice['category']) => void, syncStatus?: 'syncing' | 'success' | 'error' }) {
    const [isOpen, setIsOpen] = useState(false);

    // Find current icon
    const currentCatObj = CATEGORIES.find(c => c.label === current) || CATEGORIES[6];
    const Icon = currentCatObj.icon;

    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={styles.categoryBtn}
                title={current}
            >
                <Icon size={22} />
            </button>

            {/* Status Indicators */}
            {syncStatus === 'syncing' && (
                <Loader2 size={16} className={styles.spinner} />
            )}
            {syncStatus === 'success' && (
                <CheckCircle2 size={18} color="var(--success)" className="animate-in fade-in zoom-in duration-300" />
            )}
            {syncStatus === 'error' && (
                <XCircle size={18} color="var(--error)" />
            )}

            {isOpen && (
                <>
                    <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                        onClick={() => setIsOpen(false)}
                    />
                    <div className={styles.categoryDropdown}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.label}
                                className={styles.categoryOption}
                                onClick={() => {
                                    onSelect(cat.label);
                                    setIsOpen(false);
                                }}
                            >
                                <cat.icon size={20} />
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function DocumentModal({ invoice, onClose }: { invoice: Invoice, onClose: () => void }) {
    if (!invoice) return null;

    const link = invoice.link || '';

    // Helper to detect and convert Google Drive links
    const getGoogleDrivePreview = (url: string) => {
        if (!url || !url.includes('drive.google.com')) return null;

        // Extract ID: matches /d/ID/ or id=ID
        const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
        }
        return null;
    };

    const isImage = (url: string) => {
        if (!url) return false;
        const cleanUrl = url.split('?')[0].toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => cleanUrl.endsWith(ext));
    };

    const isImg = isImage(link);
    const drivePreviewUrl = getGoogleDrivePreview(link);

    // Logic:
    // 1. If Image -> Render <img> (handled by browser)
    // 2. If Drive Link -> Use /preview URL in iframe (handled by Google Drive UI, no proxy needed)
    // 3. If Generic File -> Use Proxy to force inline display (handles "Download" headers)

    const viewerUrl = isImg
        ? link
        : (drivePreviewUrl || `/api/view-document?url=${encodeURIComponent(link)}`);

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h4>{invoice.provider} - {invoice.id}</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <a href={link} target="_blank" rel="noopener noreferrer" className={styles.pageBtn} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            Open Original
                        </a>
                        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                    </div>
                </div>
                <div className={styles.modalBody}>
                    {isImg ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={link} alt="Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                    ) : (
                        <iframe src={viewerUrl} className={styles.pdfViewer} title="Document Viewer" />
                    )}
                </div>
            </div>
        </div>
    );
}
