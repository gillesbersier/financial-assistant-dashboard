import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        const response = await fetch(targetUrl);

        if (!response.ok) {
            return new NextResponse(`Failed to fetch document: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'application/pdf';
        const cookie = request.headers.get('cookie') || '';

        // We clone headers to modify them
        const headers = new Headers();
        headers.set('Content-Type', contentType);
        // FORCE INLINE to prevent download
        headers.set('Content-Disposition', 'inline');

        // Return the body as a stream
        return new NextResponse(response.body, {
            status: 200,
            headers,
        });

    } catch (error) {
        console.error('Proxy View Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
