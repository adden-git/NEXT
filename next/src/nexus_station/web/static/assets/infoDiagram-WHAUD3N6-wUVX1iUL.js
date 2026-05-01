import { _ as __name, l as log, N as selectSvgElement, i as configureSvgSize, O as package_default } from "./vendor-heavy-BkHv3LKv.js";
import { p as parse } from "./treemap-KMMF4GRG-Bm0jd3A-.js";
import "./vendor-chat-Du60ez_-.js";
import "./vendor-ui-BxtH5Rrc.js";
import "./min-DZeChYCX.js";
import "./_baseUniq-CIMSjakH.js";
var parser = {
  parse: /* @__PURE__ */ __name(async (input) => {
    const ast = await parse("info", input);
    log.debug(ast);
  }, "parse")
};
var DEFAULT_INFO_DB = {
  version: package_default.version + ""
};
var getVersion = /* @__PURE__ */ __name(() => DEFAULT_INFO_DB.version, "getVersion");
var db = {
  getVersion
};
var draw = /* @__PURE__ */ __name((text, id, version) => {
  log.debug("rendering info diagram\n" + text);
  const svg = selectSvgElement(id);
  configureSvgSize(svg, 100, 400, true);
  const group = svg.append("g");
  group.append("text").attr("x", 100).attr("y", 40).attr("class", "version").attr("font-size", 32).style("text-anchor", "middle").text(`v${version}`);
}, "draw");
var renderer = { draw };
var diagram = {
  parser,
  db,
  renderer
};
export {
  diagram
};
