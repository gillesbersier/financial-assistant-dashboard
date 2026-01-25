import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const N8N_FORM_URL = 'https://gibsgibs.app.n8n.cloud/form/8a468b02-abbb-42b5-a42f-3e9facc8babb';

    try {
        // 1. Get the docType from the URL (we added this in the frontend as a fallback)
        const { searchParams } = new URL(request.url);
        let docType = searchParams.get('type');

        // 2. Parse the multipart body to get the file
        const formData = await request.formData();
        const file = formData.get('data') as File;

        // Fallback: Check body for type if not in URL
        if (!docType) {
            docType = formData.get('type') as string;
        }

        // Default to 'receipt' if still missing
        if (!docType) docType = 'receipt';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        console.log(`Proxying Upload. File: ${file.name} (${file.size}), Type: ${docType}`);

        // 3. Construct a CLEAN FormData object for N8N
        // This ensures the body is perfectly formatted, with 'type' as a field.
        const outgoingFormData = new FormData();
        outgoingFormData.append('type', docType); // Append metadata first
        outgoingFormData.append('data', file);    // Append file second

        // 4. Send to N8N (Body only, let N8N parse the type from the body)
        const response = await fetch(N8N_FORM_URL, {
            method: 'POST',
            body: outgoingFormData,
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
        console.error('Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to connect to N8N form' },
            { status: 500 }
        );
    }
}
