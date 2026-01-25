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
    currency: string;
    link: string;
    type: string;
}

// UI data shape
export interface Invoice {
    id: string;
    provider: string;
    date: string;
    amount: string;
    status: string;
    link?: string;
    type: 'invoice' | 'receipt';
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
                const errorData = await response.text();
                console.error("API Error Details:", errorData);
                throw new Error(`Failed to fetch invoices: ${response.status} ${response.statusText} - ${errorData}`);
            }

            const data: N8NInvoice[] = await response.json();

            // Calculate Total Spend
            const total = data.reduce((sum, item) => sum + (Number(item.gross_amount) || 0), 0);
            setTotalAmount(total);



            // Using Loose Type for Item to allow fallback checks
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mappedInvoices: Invoice[] = data.map((item: any, index: number) => {
                let status = 'pending';
                if (item.label) {
                    const lowerLabel = item.label.toLowerCase();
                    if (lowerLabel.includes('ok') || lowerLabel.includes('payé') || lowerLabel.includes('processed')) status = 'processed';
                    else if (lowerLabel.includes('check') || lowerLabel.includes('review') || lowerLabel.includes('vérifier')) status = 'review_required';
                    else status = 'pending';
                }

                // Use the type column from Sheets, fallback to 'invoice'
                let type: 'invoice' | 'receipt' = 'invoice';
                if (item.type) {
                    const lowerType = item.type.toLowerCase();
                    if (lowerType.includes('receipt') || lowerType.includes('ticket')) {
                        type = 'receipt';
                    }
                }

                // Robust Link Mapping: Check multiple potential keys
                const link = item.link || item.url || item.file || item.document || '';

                return {
                    id: String(item.invoice_nr || `INV-UNK-${index}`),
                    provider: item.provider || 'Unknown Provider',
                    date: item.date_invoice ? new Date(item.date_invoice).toISOString().split('T')[0] : 'N/A',
                    amount: `${formatCurrency(item.gross_amount, item.currency)}`,
                    status: status,
                    link: link,
                    type: type,
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

    return { invoices, totalAmount, loading, error, refresh: fetchInvoices };
}

function formatCurrency(amount: number, currency: string) {
    if (amount === undefined || amount === null) return '-';
    // Simple mapping, can be expanded
    const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
    return `${symbol}${Number(amount).toFixed(2)}`;
}
