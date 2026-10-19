const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// Create square SVG with Light Gray background and Blue border list
function createSquareSvg(width, height, isMaskable = false) {
  const borderWidth = Math.max(6, Math.round(width * 0.035));
  const cornerRadius = width * 0.22;
  const padding = isMaskable ? width * 0.22 : width * 0.14;
  const logoWidth = width - padding * 2;
  const logoHeight = logoWidth * (90 / 140);
  const logoX = padding;
  const logoY = (height - logoHeight) / 2;

  // Light gray background (#F1F5F9 / #E2E8F0) with vivid blue list border (#2563EB / #1D4ED8)
  const bgRect = isMaskable 
    ? `<rect width="${width}" height="${height}" fill="#E2E8F0" />
       <rect x="${borderWidth}" y="${borderWidth}" width="${width - borderWidth * 2}" height="${height - borderWidth * 2}" fill="#F8FAFC" stroke="#2563EB" stroke-width="${borderWidth * 2}" />` 
    : `<rect width="${width}" height="${height}" rx="${cornerRadius}" fill="#E2E8F0" />
       <rect x="${borderWidth}" y="${borderWidth}" width="${width - borderWidth * 2}" height="${height - borderWidth * 2}" rx="${cornerRadius - borderWidth}" fill="#F8FAFC" stroke="#2563EB" stroke-width="${borderWidth * 2}" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${bgRect}
  <defs>
    <radialGradient id="dot-grad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FF8F9C" />
      <stop offset="40%" stop-color="#E51C24" />
      <stop offset="100%" stop-color="#8A0810" />
    </radialGradient>
    <linearGradient id="red-gradient-jpu" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E51C24" />
      <stop offset="100%" stop-color="#A80A12" />
    </linearGradient>
  </defs>
  
  <g transform="translate(${logoX}, ${logoY}) scale(${logoWidth / 140})">
    <!-- Red Globe/Sphere -->
    <circle cx="28" cy="22" r="10" fill="url(#dot-grad)" />

    <!-- 'jakarta' text -->
    <text 
      x="12" 
      y="52" 
      fill="#E51C24" 
      font-size="33" 
      font-weight="bold" 
      font-family="'Plus Jakarta Sans', sans-serif"
    >
      jakarta
    </text>

    <!-- Elegant swoosh underline -->
    <path 
      d="M 12 59 C 45 54, 90 53, 128 58 C 105 65, 55 64, 12 59 Z" 
      fill="url(#red-gradient-jpu)" 
    />

    <!-- JPU rectangular blocks -->
    <g transform="translate(68, 62)">
      <rect x="0" y="0" width="16" height="16" rx="2.5" fill="url(#red-gradient-jpu)" />
      <text x="8" y="12" fill="white" font-size="11" font-weight="bold" font-family="'Plus Jakarta Sans', sans-serif" text-anchor="middle">J</text>

      <rect x="19" y="0" width="16" height="16" rx="2.5" fill="url(#red-gradient-jpu)" />
      <text x="27" y="12" fill="white" font-size="11" font-weight="bold" font-family="'Plus Jakarta Sans', sans-serif" text-anchor="middle">P</text>

      <rect x="38" y="0" width="16" height="16" rx="2.5" fill="url(#red-gradient-jpu)" />
      <text x="46" y="12" fill="white" font-size="11" font-weight="bold" font-family="'Plus Jakarta Sans', sans-serif" text-anchor="middle">U</text>
    </g>
  </g>
</svg>`;
}

function renderPng(svgContent, outputPath, targetWidth) {
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: 'width',
      value: targetWidth,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Generated: ${outputPath} (${targetWidth}x${targetWidth})`);
}

const publicDir = path.join(__dirname, '..', 'public');

// 1. pwa-192x192.png
renderPng(createSquareSvg(192, 192), path.join(publicDir, 'pwa-192x192.png'), 192);

// 2. pwa-512x512.png
renderPng(createSquareSvg(512, 512), path.join(publicDir, 'pwa-512x512.png'), 512);

// 3. pwa-maskable-512x512.png
renderPng(createSquareSvg(512, 512, true), path.join(publicDir, 'pwa-maskable-512x512.png'), 512);

// 4. apple-touch-icon.png
renderPng(createSquareSvg(180, 180), path.join(publicDir, 'apple-touch-icon.png'), 180);

// 5. icon.svg
fs.writeFileSync(path.join(publicDir, 'icon.svg'), createSquareSvg(512, 512));
console.log('Generated: public/icon.svg');
