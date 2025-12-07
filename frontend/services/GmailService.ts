export const GmailService = {
    sendEmail: async (accessToken: string, to: string, subject: string, body: string) => {
        // 1. Construct the raw email
        // Headers + Body
        const emailContent =
            `To: ${to}\r\n` +
            `Subject: ${subject}\r\n` +
            `Content-Type: text/plain; charset="UTF-8"\r\n` +
            `\r\n` +
            `${body}`;

        // 2. Base64URL encode the email
        // Hacky way to do base64url encode in JS without extra libs if possible, 
        // or use btoa if available in RN environment (Expo Polyfills it usually).
        // Better: Helper function.
        const encodedEmail = Buffer.from(emailContent)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // 3. Send via Gmail API
        try {
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    raw: encodedEmail
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to send email');
            }

            console.log('Email sent successfully:', data);
            return data;

        } catch (error) {
            console.error('Gmail API Error:', error);
            throw error;
        }
    }
};

// Simple Buffer Polyfill for Base64 if Buffer is not available globally in RN (it usually isn't without setup)
// Actually, Expo has 'base64-js' or we can simpler use a custom helper.
// Let's use a simpler helper to avoid Buffer dependency issues if not polyfilled.

function encodeBase64(str: string) {
    // Basic ASCII to Base64 (not verifying unicode safety fully here, but good for MVP)
    // In React Native, we can use `btoa` if it didn't throw on non-ascii. 
    // Best to just use a small implementation or rely on what's definitely there.
    // Wait, modern RN has Global.btoa? Yes.
    // But btoa handles latin1. We need utf8.

    // safe approach:
    // 1. Encode URI component
    // 2. Unescape
    // 3. btoa
    return btoa(unescape(encodeURIComponent(str)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Redefining export in simpler terms using the helper
export const GmailAPI = {
    sendEmail: async (accessToken: string, to: string, subject: string, body: string) => {
        const email =
            `To: ${to}\r\n` +
            `Subject: ${subject}\r\n` +
            `Content-Type: text/plain; charset="UTF-8"\r\n` +
            `\r\n` +
            `${body}`;

        const raw = encodeBase64(email);

        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to send email');
        }

        return await response.json();
    }
};
