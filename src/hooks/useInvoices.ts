import { useState, useEffect } from 'react';

// Raw data shape from N8N (Google Sheets)
export interface N8NInvoice {
    date_email: string;
    date_invoice: string;
    invoice_nr: string;
    description: string;
    provider: string;
    net_amount: number;
    vat: number;
    gross_amount: number;
    label: string;
    status: string; // Added status field
    currency: string;
    link: string;
    type: string;
    category: string;
}

// UI data shape
export interface Invoice {
    id: string;
    provider: string;
    date: string;
    amount: string;
    status: 'pending' | 'categorized' | 'in_the_books';
    link?: string;
    type: 'invoice' | 'receipt';
    category: 'Habitat' | 'Electronics' | 'Mobility' | 'Food' | 'Education' | 'Leisure' | 'Miscellaneous';
    rawAmount: number;
    description: string;
    currency: string;
}

const API_URL = '/api/invoices';

export function useInvoices() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [totalAmount, setTotalAmount] = useState(0);

    const fetchInvoices = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch invoices: ${response.status} - ${await response.text()}`);
            }

            const data: N8NInvoice[] = await response.json();

            // Calculate Total Spend (YTD)
            const currentYear = new Date().getFullYear();
            const yearStart = new Date(currentYear, 0, 1).getTime();
            const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59).getTime();

            const total = data.reduce((sum, item) => {
                if (!item.date_invoice) return sum;
                const itemDate = new Date(item.date_invoice).getTime();
                if (itemDate >= yearStart && itemDate <= yearEnd) {
                    return sum + (Number(item.gross_amount) || 0);
                }
                return sum;
            }, 0);

            setTotalAmount(total);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mappedInvoices: Invoice[] = data.map((item: any, index: number) => {
                // Status Mapping: Check 'status' column first, fallback to 'label'
                let status: Invoice['status'] = 'pending';

                // Helper to normalize and check status strings
                const checkStatus = (val: string) => {
                    const lower = val.toLowerCase().trim();
                    if (lower.includes('book') || lower.includes('comptabilis')) return 'in_the_books';
                    if (lower.includes('categor') || lower.includes('catégor')) return 'categorized';
                    return null;
                };

                if (item.status) {
                    const mapped = checkStatus(item.status);
                    if (mapped) status = mapped;
                } else if (item.label) {
                    const mapped = checkStatus(item.label);
                    if (mapped) status = mapped;
                }

                // Use the type column from Sheets, fallback to 'invoice'
                let type: 'invoice' | 'receipt' = 'invoice';
                if (item.type) {
                    const lowerType = item.type.toLowerCase();
                    if (lowerType.includes('receipt') || lowerType.includes('ticket')) {
                        type = 'receipt';
                    }
                }

                // Map Category
                let category: Invoice['category'] = 'Miscellaneous';
                if (item.category) {
                    const cat = item.category.trim();
                    if (['Habitat', 'Electronics', 'Mobility', 'Food', 'Education', 'Leisure'].includes(cat)) {
                        category = cat as Invoice['category'];
                    }
                }

                // Robust Link Mapping
                const link = item.link || item.url || item.file || item.document ||
                    item.receipt || item.receipt_url || item.file_url ||
                    item['File/Receipt'] || item['receipt'] || '';

                return {
                    id: String(item.invoice_nr || `INV-UNK-${index}`),
                    provider: item.provider || 'Unknown Provider',
                    date: item.date_invoice ? new Date(item.date_invoice).toISOString().split('T')[0] : 'N/A',
                    amount: `${formatCurrency(item.gross_amount, item.currency)}`,
                    status: status,
                    link: link,
                    type: type,
                    category: category,
                    rawAmount: Number(item.gross_amount) || 0,
                    description: item.description || '',
                    currency: item.currency || 'CHF'
                };
            });

            setInvoices(mappedInvoices);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch invoices:", err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const [syncStatus, setSyncStatus] = useState<Record<string, 'syncing' | 'success' | 'error'>>({});

    const updateCategory = async (id: string, newCategory: Invoice['category']) => {
        let newStatus: Invoice['status'] = 'pending';

        // 1. Optimistic Update
        setInvoices(prev => prev.map(inv => {
            if (inv.id === id) {
                // Logic: If updating category, transition 'pending' -> 'categorized'
                // Preserve 'in_the_books' if already set
                newStatus = inv.status;
                if (inv.status === 'pending') {
                    newStatus = 'categorized';
                }

                return {
                    ...inv,
                    category: newCategory,
                    status: newStatus
                };
            }
            return inv;
        }));

        // 2. Background Sync
        console.log('Client: Sending update...', { id, category: newCategory, status: newStatus });
        setSyncStatus(prev => ({ ...prev, [id]: 'syncing' }));

        try {
            const res = await fetch('/api/update-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    category: newCategory,
                    status: newStatus, // Send status matching the column name
                    label: newStatus   // Keep label for backward compatibility
                })
            });

            if (res.ok) {
                setSyncStatus(prev => ({ ...prev, [id]: 'success' }));
                setTimeout(() => {
                    setSyncStatus(prev => {
                        const next = { ...prev };
                        if (next[id] === 'success') delete next[id];
                        return next;
                    });
                }, 3000);
            } else {
                setSyncStatus(prev => ({ ...prev, [id]: 'error' }));
            }
        } catch (err) {
            console.error("Failed to save to background:", err);
            setSyncStatus(prev => ({ ...prev, [id]: 'error' }));
        }
    };

    return { invoices, totalAmount, loading, error, refresh: fetchInvoices, updateCategory, syncStatus };
}

function formatCurrency(amount: number, currency: string) {
    if (amount === undefined || amount === null) return '-';
    // Simple mapping, can be expanded
    const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
    return `${symbol}${Number(amount).toFixed(2)}`;
}
