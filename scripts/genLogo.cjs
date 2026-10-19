const fs = require('fs');

const svgBuf = fs.readFileSync('public/picture/logo_jpu.svg');
const svgBase64 = 'data:image/svg+xml;base64,' + svgBuf.toString('base64');
const svgStr = fs.readFileSync('public/picture/logo_jpu.svg', 'utf8');

const content = `// Auto-generated logo data URIs for instant, guaranteed vector SVG rendering in PDF reports, print popups, and UI components
export const JPU_LOGO_SVG_BASE64 = "${svgBase64}";
export const JPU_LOGO_SVG_RAW = ${JSON.stringify(svgStr)};
`;

fs.writeFileSync('src/assets/logoData.ts', content);
console.log('Successfully wrote src/assets/logoData.ts. SVG Base64 length:', svgBase64.length);
