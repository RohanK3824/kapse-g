/**
 * Kapse - G 🔰 Tailors
 * WhatsApp Digital Receipt / Bill Slip Generator & Sender
 */

export function buildWhatsAppSlipText(customer) {
  if (!customer) return '';

  const total = Number(customer.totalBill || 0).toLocaleString('en-IN');
  const paid = Number(customer.advancePaid || 0).toLocaleString('en-IN');
  const due = Number(customer.balanceDue || 0).toLocaleString('en-IN');
  const isPaid = Number(customer.balanceDue || 0) <= 0 && Number(customer.totalBill || 0) > 0;
  
  let paymentBadge = '₹0';
  if (isPaid) {
    paymentBadge = '✅ पूर्ण जमा (Fully Paid)';
  } else if (Number(customer.balanceDue || 0) > 0) {
    paymentBadge = `⚠️ बाकी रक्कम: ₹${due} (Pending Due)`;
  }

  const deliveryStr = customer.deliveryDate ? `*${customer.deliveryDate}*` : 'लवकरच कळवण्यात येईल';

  return `*✂️ KAPSE - G 🔰 TAILORS*
*डिजिटल बिल पावती / Digital Bill Slip*
━━━━━━━━━━━━━━━━━━
🆔 *Customer ID:* ${customer.id || '-'}
👤 *ग्राहक नाव:* ${customer.name || '-'}
📞 *मोबाईल:* ${customer.mobile || '-'}
📍 *पत्ता:* ${customer.place || '-'}
━━━━━━━━━━━━━━━━━━
📖 *बिल बुक क्र.:* ${customer.billBook || '-'} | *पान क्र.:* ${customer.pageNo || '-'}
📅 *नोंदणी तारीख:* ${customer.date || '-'}
🚚 *डिलिव्हरी दिनांक:* ${deliveryStr}
━━━━━━━━━━━━━━━━━━
💰 *बिल व हिशोब तपशील:*
• एकूण बिल (Total Bill): *₹${total}*
• जमा रक्कम (Advance Paid): *₹${paid}*
• बाकी रक्कम (Balance Due): *₹${due}*
• स्टेटस: ${paymentBadge}
${customer.notes ? `━━━━━━━━━━━━━━━━━━\n📝 *टीप / मापे (Notes):*\n${customer.notes}\n` : ''}━━━━━━━━━━━━━━━━━━
🙏 *कापसे - जी टेलर्सला भेट दिल्याबद्दल धन्यवाद!*
_आपले कपडे उत्कृष्ट फिनिशिंगसह वेळेत मिळतील._`;
}

export function cleanIndianMobile(rawMobile) {
  if (!rawMobile) return '';
  const digits = String(rawMobile).replace(/\D/g, '');
  if (digits.length === 10) {
    return '91' + digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return '91' + digits.substring(1);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

export function openWhatsAppSlip(customer) {
  if (!customer) return;
  const phone = cleanIndianMobile(customer.mobile);
  const text = buildWhatsAppSlipText(customer);
  const encodedText = encodeURIComponent(text);

  let url = '';
  if (phone && phone.length >= 10) {
    url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
  } else {
    // If mobile number is not provided, open WhatsApp with text ready to choose contact
    url = `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  window.open(url, '_blank');
}
