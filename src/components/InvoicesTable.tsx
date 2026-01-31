"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './InvoicesTable.module.css';
import { ChevronRight, Search, Filter, Loader2, AlertCircle, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown, Home, Monitor, Car, Utensils, GraduationCap, Palmtree, MoreHorizontal, HelpCircle, CheckCircle2, XCircle, Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useInvoices, Invoice } from '../hooks/useInvoices';
import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
    const [searchQuery, setSearchQuery] = useState('');

    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Export Modal State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | null>(null);
    const [includeMetadata, setIncludeMetadata] = useState(true);
    const [includeFilename, setIncludeFilename] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState({
        date: true,
        provider: true,
        description: true,
        currency: true,
        amount: true,
        status: true,
        category: true
    });

    const ALL_COLUMNS = [
        { key: 'date', label: 'Date' },
        { key: 'provider', label: 'Provider' },
        { key: 'description', label: 'Description' },
        { key: 'currency', label: 'Currency' },
        { key: 'amount', label: 'Amount' },
        { key: 'status', label: 'Status' },
        { key: 'category', label: 'Category' }
    ];

    // Close export menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

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

        // Split by any whitespace to handle multiple spaces/tabs safely
        const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.trim() !== '');

        // ALL terms must match (AND logic)
        return terms.every(term => {
            // 1. Amount Filter with Operators (>100, <50, >=500, <=20)
            const amountMatch = term.match(/^([<>]=?)(\d+(\.\d+)?)$/);
            if (amountMatch) {
                const operator = amountMatch[1];
                const value = parseFloat(amountMatch[2]);
                const amount = inv.rawAmount;

                switch (operator) {
                    case '>': return amount > value;
                    case '<': return amount < value;
                    case '>=': return amount >= value;
                    case '<=': return amount <= value;
                    default: return false;
                }
            }

            // 2. Universal Text Filter (Matches Provider, Desc, ID, Category, Date, Year, Amount amount)
            // This covers "2025" (Year) -> Matched in Date
            // This covers "2" -> Matched in Date, Amount string, or Provider
            return (
                inv.provider.toLowerCase().includes(term) ||
                String(inv.id).toLowerCase().includes(term) ||
                (inv.description && inv.description.toLowerCase().includes(term)) ||
                (inv.category && inv.category.toLowerCase().includes(term)) ||
                (inv.date && inv.date.toLowerCase().includes(term)) ||
                (inv.amount && inv.amount.toLowerCase().includes(term))
            );
        });
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



    const openExportModal = (format: 'csv' | 'pdf') => {
        setExportFormat(format);
        setShowExportModal(true);
        setIsExportMenuOpen(false);
        setIncludeMetadata(true); // Reset to default
        setIncludeFilename(false); // Reset to default
    };

    const executeExport = () => {
        if (!exportFormat) return;

        // Filter headers and map keys based on selection
        const activeCols = ALL_COLUMNS.filter(col => selectedColumns[col.key as keyof typeof selectedColumns]);
        const headers = activeCols.map(col => col.label);
        const keys = activeCols.map(col => col.key);

        const rows = sortedInvoices.map(inv => {
            return keys.map(key => {
                if (key === 'amount') {
                    // Strip currency symbols, ensure only numbers/decimals remain
                    return String(inv.amount).replace(/[^\d.-]/g, '');
                }
                return (inv as any)[key];
            });
        });

        const fileName = `financial_export_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}`;

        if (exportFormat === 'csv') {
            // Distribute title across columns to prevent "Date" column from being autosized too wide
            const titleCells = [
                'Financial Assistant',
                `- ${activeTab === 'invoice' ? 'Invoices' : 'Receipts'}`,
                `(Generated on: ${format(new Date(), 'yyyy-MM-dd')})`,
                ...Array(Math.max(0, headers.length - 3)).fill('')
            ];
            const titleRow = titleCells.map(cell => `"${cell}"`).join(',');

            let contentParts = [];
            if (includeMetadata) {
                contentParts.push(titleRow);
                contentParts.push(Array(headers.length).fill('').join(',')); // Empty row with commas
            }

            contentParts.push(headers.join(','));
            contentParts.push(...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')));

            const csvContent = contentParts.join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${fileName}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else {
            const doc = new jsPDF();

            let startY = 22;
            doc.setFontSize(18);
            doc.text(`Financial Assistant - ${activeTab === 'invoice' ? 'Invoices' : 'Receipts'}`, 14, startY);

            startY += 8;
            doc.setFontSize(11);
            doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy')}`, 14, startY);

            if (includeFilename) {
                startY += 6;
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(`Filename: ${fileName}.pdf`, 14, startY);
                doc.setTextColor(0); // Reset color
            }

            autoTable(doc, {
                head: [headers],
                body: rows,
                startY: startY + 10,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [66, 66, 66] }
            });

            doc.save(`${fileName}.pdf`);
        }

        setShowExportModal(false);
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


                    <div className={styles.exportWrapper} ref={exportMenuRef}>
                        <button
                            className={styles.filterBtn}
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        >
                            <Download size={16} />
                            <span>Export</span>
                            <ChevronDown size={14} style={{ marginLeft: 4, opacity: 0.7 }} />
                        </button>

                        {isExportMenuOpen && (
                            <div className={styles.exportMenu}>
                                <button onClick={() => openExportModal('csv')} className={styles.exportOption}>
                                    <FileSpreadsheet size={16} className={styles.exportIcon} />
                                    <span>Export as CSV</span>
                                </button>
                                <button onClick={() => openExportModal('pdf')} className={styles.exportOption}>
                                    <FileText size={16} className={styles.exportIcon} />
                                    <span>Export as PDF</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Export Options Modal */}
            {showExportModal && (
                <div className={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
                    <div className={styles.exportModalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h4>Export Options</h4>
                            <button className={styles.closeBtn} onClick={() => setShowExportModal(false)}>
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className={styles.exportBody}>
                            <p className={styles.exportSubtitle}>Select columns to include in your <strong>{exportFormat?.toUpperCase()}</strong> file:</p>

                            <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--neutral-200)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {exportFormat === 'csv' && (
                                    <label className={styles.columnOption}>
                                        <input
                                            type="checkbox"
                                            checked={includeMetadata}
                                            onChange={(e) => setIncludeMetadata(e.target.checked)}
                                        />
                                        <span>Include Title & Date Header</span>
                                    </label>
                                )}
                                {exportFormat === 'pdf' && (
                                    <label className={styles.columnOption}>
                                        <input
                                            type="checkbox"
                                            checked={includeFilename}
                                            onChange={(e) => setIncludeFilename(e.target.checked)}
                                        />
                                        <span>Include Filename in Header</span>
                                    </label>
                                )}
                            </div>

                            <div className={styles.columnGrid}>
                                {ALL_COLUMNS.map(col => (
                                    <label key={col.key} className={styles.columnOption}>
                                        <input
                                            type="checkbox"
                                            checked={selectedColumns[col.key as keyof typeof selectedColumns]}
                                            onChange={(e) => setSelectedColumns(prev => ({ ...prev, [col.key]: e.target.checked }))}
                                        />
                                        <span>{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={() => setShowExportModal(false)}>Cancel</button>
                            <button className={styles.downloadBtn} onClick={executeExport}>
                                <Download size={16} />
                                Download File
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                <th onClick={() => requestSort('category')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>Category {getSortIcon('category')}</div>
                                </th>
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

            {
                !loading && !error && (
                    <div className={styles.footer}>
                        <span className={styles.paginationInfo}>Showing {sortedInvoices.length} entries</span>
                        <div className={styles.paginationControls}>
                            <button className={styles.pageBtn} disabled>Previous</button>
                            <button className={styles.pageBtn} disabled>Next</button>
                        </div>
                    </div>
                )
            }

            {
                selectedInvoice && (
                    <DocumentModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
                )
            }
        </div >
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
