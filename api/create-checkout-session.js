export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return res.status(500).json({ error: 'Chybí STRIPE_SECRET_KEY ve Vercel Environment Variables.' });
    }

    try {
        const { amount, nickname, message, email } = req.body || {};
        const czkAmount = parseInt(amount, 10);

        if (!czkAmount || czkAmount < 15 || czkAmount > 50000) {
            return res.status(400).json({ error: 'Neplatná částka (minimum je 15 Kč).' });
        }

        const origin = req.headers.origin || 'https://gjwprostejov.com';
        const cleanEmail = (email || '').trim();

        const params = new URLSearchParams();
        params.append('mode', 'payment');
        params.append('payment_method_types[0]', 'card');
        params.append('line_items[0][price_data][currency]', 'czk');
        params.append('line_items[0][price_data][product]', 'prod_VfzlJrdLoRpg27');
        params.append('line_items[0][price_data][unit_amount]', String(czkAmount * 100));
        params.append('line_items[0][quantity]', '1');
        params.append('metadata[nickname]', (nickname || 'Anonym z GJW').slice(0, 50));
        params.append('metadata[message]', (message || '').slice(0, 150));
        params.append('metadata[admin_email]', cleanEmail.slice(0, 100));
        params.append('metadata[admin_eligible]', czkAmount >= 100 && cleanEmail ? 'ANO' : 'NE');
        params.append('success_url', `${origin}/podpora/?status=success`);
        params.append('cancel_url', `${origin}/podpora/?status=cancel`);

        if (cleanEmail && cleanEmail.includes('@')) {
            params.append('customer_email', cleanEmail);
        }

        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        const session = await stripeRes.json();

        if (!stripeRes.ok) {
            return res.status(stripeRes.status).json({
                error: session?.error?.message || 'Chyba Stripe API'
            });
        }

        return res.status(200).json({ id: session.id, url: session.url });
    } catch (err) {
        return res.status(500).json({ error: err.message || 'Interní chyba serveru' });
    }
}