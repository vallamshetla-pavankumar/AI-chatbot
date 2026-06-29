/**
 * Decodes HTML entities and strips weight suffixes from product names.
 * Example: "Mirchi Powder &#8211; 1Kg" -> "Mirchi Powder"
 */
export function cleanProductName(name) {
  if (!name) return '';

  // 1. Decode HTML entities and strip Mojibake
  let decoded = name
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/ï¿½/g, '')  // Remove corrupted character
    .replace(/â‚¹/g, '₹') // Correctly display Rupee symbol
    .replace(/Â/g, '');   // Remove Â

  try {
    const doc = new DOMParser().parseFromString(decoded, 'text/html');
    decoded = doc.documentElement.textContent || decoded;
  } catch (e) {
    // fallback if DOMParser fails
  }

  // 2. Remove weight suffixes
  const cleaned = decoded.replace(/\s*[\u2013\u2014\u2212-]\s*\d+(?:\.\d+)?\s*(?:kg|g|gm|ml|l|Kg|KG|ML|L|GM)\b.*/i, '').trim();
  
  return cleaned
    .replace(/ï¿½/g, '')
    .replace(/â‚¹/g, '₹')
    .replace(/Â/g, '');
}
