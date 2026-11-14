/**
 * Kapse - G Tailors
 * Clean & Professional WhatsApp Receipt Slip Generator
 */

export function buildWhatsAppSlipText(customer) {
  if (!customer) return '';

  const total = Number(customer.totalBill || 0).toLocaleString('en-IN');
  const paid = Number(customer.advancePaid || 0).toLocaleString('en-IN');
  const due = Number(customer.balanceDue || 0).toLocaleString('en-IN');
  const hasDue = Number(customer.balanceDue || 0) > 0;
  const isPaid = Number(customer.balanceDue || 0) <= 0 && Number(customer.totalBill || 0) > 0;

  let paymentLines = `• Total Bill: *₹${total}*\n• Advance Paid: *₹${paid}*`;
  if (hasDue) {
    paymentLines += `\n• *Balance Due: ₹${due}*`;
  } else if (isPaid) {
    paymentLines += `\n• Status: *✅ Paid (पूर्ण जमा)*`;
  }

  const deliverySection = customer.deliveryDate 
    ? `🚚 *Delivery Date:* *${customer.deliveryDate}*\n` 
    : '';

  const notesSection = customer.notes && customer.notes.trim()
    ? `📝 *Note:* ${customer.notes.trim()}\n─────────────────\n`
    : '';

  return `*✂️ KAPSE - G TAILORS*
*Bill Receipt / पावती*
─────────────────
👤 *Customer:* ${customer.name || '-'}
📅 *Date:* ${customer.date || '-'}
${deliverySection}─────────────────
💵 *Payment Details:*
${paymentLines}
─────────────────
${notesSection}📍 *Kapse Tailors, Vairag*
🙏 _Thank you for your visit!_`;
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
    url = `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  window.open(url, '_blank');
}
