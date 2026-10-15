export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, nick, code } = req.body;

  if (!email || !nick || !code) {
    return res.status(400).json({ error: 'Chybí povinná data (email, nick, code).' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'GJW Soutez <onboarding@resend.dev>',
        to: [email],
        subject: 'Ověřovací kód pro GJW Soutěž',
        html: `<p>Ahoj ${nick},</p><p>tvůj ověřovací kód pro přihlášení do školní soutěže je: <strong>${code}</strong></p>`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'Chyba při odesílání přes Resend', details: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}