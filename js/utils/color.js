export function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const safe = value.length === 3
    ? value.split("").map((char) => char + char).join("")
    : value;
  const int = Number.parseInt(safe, 16);

  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function colorWithAlpha(color, alpha) {
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }

  return withAlpha(color, alpha);
}

export function mixHex(hex, otherHex, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(otherHex);
  const mix = (value) => Math.round(value);

  return `rgb(${mix(a.r + ((b.r - a.r) * amount))}, ${mix(a.g + ((b.g - a.g) * amount))}, ${mix(a.b + ((b.b - a.b) * amount))})`;
}
