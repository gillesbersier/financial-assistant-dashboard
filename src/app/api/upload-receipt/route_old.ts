import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const N8N_FORM_URL = 'https://gibsgibs.app.n8n.cloud/form/8a468b02-abbb-42b5-a42f-3e9facc8babb';

    try {
        const contentType = request.headers.get('content-type');
        if (!contentType?.includes('multipart/form-data')) {
            return NextResponse.json(
                { error: 'Invalid Content-Type. Expected multipart/form-data.' },
                { status: 400 }
            );
        }

        // 1. Capture Type from URL (redundancy check)
        const { searchParams } = new URL(request.url);
        const docType = searchParams.get('type');

        const targetUrl = new URL(N8N_FORM_URL);
        if (docType) {
            targetUrl.searchParams.set('type', docType);
        }

        // 2. Read body as ArrayBuffer -> Buffer (Best for Node/Next proxying)
        const arrayBuffer = await request.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentLength = arrayBuffer.byteLength.toString();

        console.log(`Proxying Upload. Type: ${docType}, Size: ${contentLength} bytes, Content-Type: ${contentType}`);

        // 3. Forward to N8N
        const response = await fetch(targetUrl.toString(), {
            method: 'POST',
            body: buffer,
            headers: {
                'Content-Type': contentType,
                'Content-Length': contentLength,
            },
        });

        if (response.ok) {
            return NextResponse.json({ success: true });
        } else {
            const text = await response.text();
            console.error('N8N Upload Error:', response.status, text);
            return NextResponse.json(
                { error: `N8N responded with ${response.status}`, details: text },
                { status: response.status }
            );
        }
    } catch (error) {
        console.error('Proxy Upload Error:', error);
        return NextResponse.json(
            { error: 'Failed to connect to N8N form' },
            { status: 500 }
        );
    }
}
