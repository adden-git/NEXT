import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from "./chunk-DI55MBZ5-CjpCGXu4.js";
import { _ as __name } from "./vendor-heavy-BkHv3LKv.js";
import "./chunk-55IACEB6-DG3syZf3.js";
import "./chunk-QN33PNHL-DWdjE-xQ.js";
import "./vendor-chat-Du60ez_-.js";
import "./vendor-ui-BxtH5Rrc.js";
var diagram = {
  parser: stateDiagram_default,
  get db() {
    return new StateDB(2);
  },
  renderer: stateRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.state) {
      cnf.state = {};
    }
    cnf.state.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
