import { NextResponse } from 'next/server';

export async function GET() {
    const N8N_WEBHOOK_URL = 'https://gibsgibs.app.n8n.cloud/webhook/invoice-retrieval';

    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // Cache control is important to not serve stale finance data
            cache: 'no-store',
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `N8N responded with ${response.status}: ${response.statusText}` },
                { status: response.status }
            );
        }

        const textData = await response.text();
        console.log('N8N Raw Response:', textData);

        if (!textData.trim()) {
            console.warn('N8N returned empty response. defaulting to empty list.');
            return NextResponse.json([]);
        }

        try {
            const data = JSON.parse(textData);
            return NextResponse.json(data);
        } catch (e) {
            console.warn('N8N response was not JSON:', textData);
            // If N8N returns "Workflow started" but no data, we should inform the UI
            return NextResponse.json(
                { error: 'N8N returned successfully but sent no JSON data', raw: textData },
                { status: 502 }
            );
        }
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to connect to N8N workflow' },
            { status: 500 }
        );
    }
}
