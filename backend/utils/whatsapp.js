/**
 * Sends a WhatsApp message using Meta Graph API.
 * 
 * @param {string} to - Customer's WhatsApp number
 * @param {string} messageText - Message body
 */
async function sendWhatsAppMessage(to, messageText) {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.warn('[WhatsApp Stub] Missing credentials in .env (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID). Skipping send.');
    console.log(`[WhatsApp Output] to ${to}: "${messageText}"`);
    return;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: messageText },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to send WhatsApp message via Meta API:', errorData);
    } else {
      console.log(`[WhatsApp] Successfully sent message to ${to}`);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

module.exports = { sendWhatsAppMessage };
