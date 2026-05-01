import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-B4BG7PRW-CnPgaLXo.js";
import { _ as __name } from "./vendor-heavy-DEw9PDV1.js";
import "./chunk-FMBD7UC4-CGsrYJmZ.js";
import "./chunk-55IACEB6-CxpPCIv6.js";
import "./chunk-QN33PNHL-BEec-MJj.js";
import "./vendor-chat-DwxWVGki.js";
import "./vendor-ui-BxtH5Rrc.js";
var diagram = {
  parser: classDiagram_default,
  get db() {
    return new ClassDB();
  },
  renderer: classRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.class) {
      cnf.class = {};
    }
    cnf.class.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
