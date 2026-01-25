export const KPI_STATS = [
    {
        label: 'Total Spend (YTD)',
        value: '€42,500',
        change: '+12%',
        trend: 'positive',
        subtext: 'vs last year'
    },
    {
        label: 'Processed Invoices',
        value: '142',
        change: '+8',
        trend: 'positive',
        subtext: 'this month'
    },
    {
        label: 'Total Receipts',
        value: '3',
        change: '+12%',
        trend: 'positive',
        subtext: 'scanned'
    },
    {
        label: 'Total Invoices & Receipts',
        value: '145',
        change: '+20',
        trend: 'positive',
        subtext: 'combined'
    }
];

export const SPENDING_DATA = [
    { month: 'Jan', amount: 3200 },
    { month: 'Feb', amount: 4100 },
    { month: 'Mar', amount: 3800 },
    { month: 'Apr', amount: 5200 },
    { month: 'May', amount: 4800 },
    { month: 'Jun', amount: 6100 },
    { month: 'Jul', amount: 5900 },
    { month: 'Aug', amount: 4300 },
    { month: 'Sep', amount: 5100 },
    { month: 'Oct', amount: 4200 }, // Current-ish
    { month: 'Nov', amount: 0 },
    { month: 'Dec', amount: 0 },
];

export const AUTOMATION_STEPS = [
    { name: 'Gmail Trigger', status: 'success', time: '2m ago' },
    { name: 'OpenAI Parser', status: 'success', time: '1m ago' },
    { name: 'Drive Sync', status: 'pending', time: 'Processing...' },
    { name: 'Airtable Sync', status: 'waiting', time: '-' },
];

export const RECENT_INVOICES = [
    {
        id: 'INV-001',
        provider: 'AWS EMEA',
        date: '2026-01-15',
        amount: '€452.00',
        status: 'processed',
    },
    {
        id: 'INV-002',
        provider: 'Notion Labs',
        date: '2026-01-14',
        amount: '€28.00',
        status: 'processed',
    },
    {
        id: 'INV-003',
        provider: 'Uber Rides',
        date: '2026-01-12',
        amount: '€14.50',
        status: 'review_required',
    },
    {
        id: 'INV-004',
        provider: 'Apple Services',
        date: '2026-01-10',
        amount: '€9.99',
        status: 'processed',
    },
    {
        id: 'INV-005',
        provider: 'Freelance Design',
        date: '2026-01-08',
        amount: '€1,200.00',
        status: 'pending',
    },
];
