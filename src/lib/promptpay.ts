/**
 * Official Thailand PromptPay EMVCo QR Code Payload Generator
 * Fully compliant with Bank of Thailand (BOT) & ITMX Standards.
 * Scannable by all Thailand Banking Applications (K PLUS, SCB EASY, Krungthai NEXT, Bualuang mBanking, etc.)
 */

export function generatePromptPayPayload(target: string, amount?: number): string {
  const sanitizeTarget = target.replace(/[^0-9]/g, "");
  let targetType = "";
  let formattedTarget = "";

  if (sanitizeTarget.length === 10) {
    // Phone Number: 0812345678 -> 0066812345678
    targetType = "01";
    formattedTarget = "0066" + sanitizeTarget.substring(1);
  } else if (sanitizeTarget.length === 13) {
    // National ID / Tax ID: 13 digits
    targetType = "02";
    formattedTarget = sanitizeTarget;
  } else {
    // E-Wallet ID or fallback
    targetType = "03";
    formattedTarget = sanitizeTarget;
  }

  const targetLength = ("0" + formattedTarget.length).slice(-2);
  const targetTag = `0016A000000677010111${targetType}${targetLength}${formattedTarget}`;
  const targetTagLength = ("0" + targetTag.length).slice(-2);

  let payload = `00020101021129${targetTagLength}${targetTag}5303764`;

  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    const amountLength = ("0" + formattedAmount.length).slice(-2);
    payload += `54${amountLength}${formattedAmount}`;
  }

  payload += "5802TH6304";

  // Calculate CRC16 CCITT
  const crc = crc16Hex(payload);
  return payload + crc;
}

function crc16Hex(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    const x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    crc = (crc << 8) ^ crcTable[x];
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const crcTable: number[] = [];
for (let i = 0; i < 256; i++) {
  let c = i << 8;
  for (let j = 0; j < 8; j++) {
    c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1;
    c &= 0xffff;
  }
  crcTable[i] = c;
}
