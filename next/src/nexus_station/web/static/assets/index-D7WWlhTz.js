const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./bootstrap-CvuRc8up.js","./vendor-ui-BxtH5Rrc.js","./vendor-chat-DwxWVGki.js","./vendor-heavy-DEw9PDV1.js","./bootstrap-Dx_8WzsM.css"])))=>i.map(i=>d[i]);
import { _ as __vitePreload, E as Ee } from "./vendor-chat-DwxWVGki.js";
import "./vendor-ui-BxtH5Rrc.js";
import "./vendor-heavy-DEw9PDV1.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const bootstrap = async () => {
  await __vitePreload(() => import("./bootstrap-CvuRc8up.js").then((n) => n.x), true ? __vite__mapDeps([0,1,2,3,4]) : void 0, import.meta.url);
};
bootstrap().catch((error) => {
  console.error("[main] bootstrap failed:", error);
});
const mermaidVLURNSYL = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Mermaid: Ee
}, Symbol.toStringTag, { value: "Module" }));
export {
  mermaidVLURNSYL as m
};
