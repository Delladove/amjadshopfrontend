/* Renders an EAN-13 code (generated server-side) as an SVG string.
   Kept identical to the algorithm used server-side for validation, so what you
   see on screen always matches what the backend considers a valid code. */

const EAN_L = { 0:"0001101",1:"0011001",2:"0010011",3:"0111101",4:"0100011",
  5:"0110001",6:"0101111",7:"0111011",8:"0110111",9:"0001011" };
const EAN_G = { 0:"0100111",1:"0110011",2:"0011011",3:"0100001",4:"0011101",
  5:"0111001",6:"0000101",7:"0010001",8:"0001001",9:"0010111" };
const EAN_R = { 0:"1110010",1:"1100110",2:"1101100",3:"1000010",4:"1011100",
  5:"1001110",6:"1010000",7:"1000100",8:"1001000",9:"1110100" };
const EAN_PARITY = { 0:"LLLLLL",1:"LLGLGG",2:"LLGGLG",3:"LLGGGL",4:"LGLLGG",
  5:"LGGLLG",6:"LGGGLL",7:"LGLGLG",8:"LGLGGL",9:"LGGLGL" };

function ean13Bits(code13) {
  const d = String(code13).padStart(13, "0").split("").map(Number);
  const parity = EAN_PARITY[d[0]];
  let bits = "101";
  for (let i = 0; i < 6; i++) bits += parity[i] === "L" ? EAN_L[d[i + 1]] : EAN_G[d[i + 1]];
  bits += "01010";
  for (let i = 0; i < 6; i++) bits += EAN_R[d[i + 7]];
  bits += "101";
  return bits;
}

export function ean13SVG(code13, opts = {}) {
  const moduleW = opts.moduleW || 2.2;
  const height = opts.height || 60;
  const bits = ean13Bits(code13);
  const totalW = bits.length * moduleW;
  const d = String(code13).padStart(13, "0");
  let rects = "";
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "1") rects += `<rect x="${(i * moduleW).toFixed(2)}" y="0" width="${moduleW.toFixed(2)}" height="${height}" fill="#000"/>`;
  }
  const showText = opts.showText !== false;
  const fontSize = opts.fontSize || 12;
  const svgH = height + (showText ? fontSize + 8 : 4);
  const textEl = showText
    ? `<text x="${(totalW / 2).toFixed(2)}" y="${height + fontSize + 2}" font-size="${fontSize}" font-family="'Courier New',monospace" text-anchor="middle" fill="#000" letter-spacing="2">${d}</text>`
    : "";
  return `<svg viewBox="0 0 ${totalW.toFixed(2)} ${svgH}" width="${totalW.toFixed(2)}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${totalW.toFixed(2)}" height="${svgH}" fill="#fff"/>
    ${rects}${textEl}
  </svg>`;
}
