import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-B4BG7PRW-CaAOeZ2s.js";
import { _ as __name } from "./vendor-heavy-BkHv3LKv.js";
import "./chunk-FMBD7UC4-D-gArXI0.js";
import "./chunk-55IACEB6-DG3syZf3.js";
import "./chunk-QN33PNHL-DWdjE-xQ.js";
import "./vendor-chat-Du60ez_-.js";
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
