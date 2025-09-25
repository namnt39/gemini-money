const DIGITS = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];

const UNIT_NAMES = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ", "tỷ tỷ"];

const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();

function readTwoDigits(number: number, full: boolean) {
  const tens = Math.floor(number / 10);
  const ones = number % 10;
  const parts: string[] = [];

  if (tens > 1) {
    parts.push(`${DIGITS[tens]} mươi`);
    if (ones === 1) {
      parts.push("mốt");
    } else if (ones === 4) {
      parts.push("tư");
    } else if (ones === 5) {
      parts.push("lăm");
    } else if (ones !== 0) {
      parts.push(DIGITS[ones]);
    }
  } else if (tens === 1) {
    parts.push("mười");
    if (ones === 5) {
      parts.push("lăm");
    } else if (ones !== 0) {
      parts.push(DIGITS[ones]);
    }
  } else if (full && ones > 0) {
    parts.push("lẻ");
    if (ones === 5) {
      parts.push("năm");
    } else {
      parts.push(DIGITS[ones]);
    }
  } else if (ones > 0) {
    parts.push(DIGITS[ones]);
  }

  return parts.join(" ");
}

function readThreeDigits(number: number, full: boolean) {
  const hundreds = Math.floor(number / 100);
  const remainder = number % 100;
  const parts: string[] = [];

  if (hundreds > 0 || full) {
    if (hundreds > 0) {
      parts.push(`${DIGITS[hundreds]} trăm`);
    } else if (full) {
      parts.push("không trăm");
    }
  }

  if (remainder > 0) {
    parts.push(readTwoDigits(remainder, hundreds > 0 || full));
  }

  return normalizeSpaces(parts.join(" "));
}

export function numberToVietnameseWords(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "";
  }

  if (!Number.isFinite(value)) {
    return "";
  }

  const negative = value < 0;
  let remaining = Math.floor(Math.abs(value));

  if (remaining === 0) {
    return "Không";
  }

  const parts: string[] = [];
  let unitIndex = 0;
  let full = false;

  while (remaining > 0 && unitIndex < UNIT_NAMES.length) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const chunkWords = readThreeDigits(chunk, full);
      const unit = UNIT_NAMES[unitIndex];
      parts.unshift(unit ? `${chunkWords} ${unit}` : chunkWords);
      full = true;
    } else {
      full = full || unitIndex === 3; // ensure the next chunk reads zeros correctly around billions
    }
    remaining = Math.floor(remaining / 1000);
    unitIndex += 1;
  }

  let result = normalizeSpaces(parts.join(" "));
  if (negative) {
    result = `Âm ${result}`;
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}
