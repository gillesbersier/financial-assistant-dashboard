import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    // This assumes you will create a NEW workflow with this webhook path
    const N8N_WEBHOOK_URL = 'https://gibsgibs.app.n8n.cloud/webhook/save_invoice';

    try {
        const body = await request.json();

        // Send JSON payload to N8N (Workflow B)
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (response.ok) {
            return NextResponse.json({ success: true });
        } else {
            const text = await response.text();
            console.error('N8N Save Error:', response.status, text);
            return NextResponse.json(
                { error: `N8N responded with ${response.status}`, details: text },
                { status: response.status }
            );
        }
    } catch (error) {
        console.error('Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to connect to N8N save workflow' },
            { status: 500 }
        );
    }
}
