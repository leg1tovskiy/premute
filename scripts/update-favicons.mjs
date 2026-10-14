import { readFileSync, copyFileSync, writeFileSync } from "node:fs";

const b64 = readFileSync("public/logo.png").toString("base64");
copyFileSync("public/logo.png", "public/favicon.png");
copyFileSync("public/logo.png", "public/__grok/icon-180.png");
copyFileSync("public/logo.png", "public/favicon.ico");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" width="512" height="512">
  <image width="512" height="512" href="data:image/png;base64,${b64}"/>
</svg>
`;

writeFileSync("public/favicon.svg", svg, "utf8");
console.log("All favicons updated from logo.png successfully!");
