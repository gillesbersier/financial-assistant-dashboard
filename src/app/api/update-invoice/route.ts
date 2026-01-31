import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, category, label, status } = body;

        // ---------------------------------------------------------------------------
        // TODO: Replace this URL with your actual N8N Webhook URL for updating data
        // ---------------------------------------------------------------------------
        const N8N_WEBHOOK_URL = 'https://gibsgibs.app.n8n.cloud/webhook/update-invoice';

        console.log('API: Received update request for:', { id, category, label, status });

        // Send the update to N8N
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                invoice_nr: id,
                category: category,
                label: label,
                status: status // Forward status to N8N
            }),
        });

        console.log('API: N8N Response Status:', response.status);

        if (!response.ok) {
            const text = await response.text();
            console.error(`API: N8N update failed: ${response.statusText}`, text);
            // We don't block the UI, but we log the error
            return NextResponse.json({ error: 'Failed to sync with N8N' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
