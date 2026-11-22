const Stripe = require('stripe');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return res.status(500).json({ error: 'Chybí STRIPE_SECRET_KEY na serveru.' });
    }

    const stripe = new Stripe(secretKey);

    try {
        const { amount, nickname, message, email } = req.body || {};
        const czkAmount = parseInt(amount, 10);

        if (!czkAmount || czkAmount < 15 || czkAmount > 50000) {
            return res.status(400).json({ error: 'Neplatná částka (minimum je 15 Kč).' });
        }

        const origin = req.headers.origin || 'https://gjwprostejov.com';
        const cleanEmail = (email || '').trim();

        const sessionPayload = {
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'czk',
                        product: 'prod_VfzlJrdLoRpg27',
                        unit_amount: czkAmount * 100,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                nickname: (nickname || 'Anonym z GJW').slice(0, 50),
                message: (message || '').slice(0, 150),
                admin_email: cleanEmail.slice(0, 100),
                admin_eligible: czkAmount >= 100 && cleanEmail ? 'ANO' : 'NE',
            },
            success_url: `${origin}/podpora/?status=success`,
            cancel_url: `${origin}/podpora/?status=cancel`,
        };

        if (cleanEmail && cleanEmail.includes('@')) {
            sessionPayload.customer_email = cleanEmail;
        }

        const session = await stripe.checkout.sessions.create(sessionPayload);
        return res.status(200).json({ id: session.id });
    } catch (err) {
        console.error('Stripe error:', err);
        return res.status(500).json({ error: err.message });
    }
};