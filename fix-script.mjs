const fs = require("fs");

let mp = fs.readFileSync("src/components/ui/map-page.tsx", "utf8");
mp = mp.replace(/import type \\{ NegocioMapa \\} from "@\\/types\\/api";\\n/, "");
mp = mp.replace(/new mapboxgl\\.Popup\\(\\)\\.setHTML\\(\\n\\s*<h3>\\$\\{negocio\\.nombre\\}<\\/h3>\\n\\s*\\),/, "new mapboxgl.Popup().setHTML(\\`\\n      <h3>${negocio.nombre}</h3>\\n    `),");
fs.writeFileSync("src/components/ui/map-page.tsx", mp, "utf8");
console.log("map-page.tsx fixed");
