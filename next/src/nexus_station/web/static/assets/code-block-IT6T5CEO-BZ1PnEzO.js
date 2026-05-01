import { C, D as Dt, u } from "./vendor-chat-DwxWVGki.js";
import { r as reactExports, j as jsxRuntimeExports } from "./vendor-ui-BxtH5Rrc.js";
import { c as createHighlighter, a as createJavaScriptRegexEngine, b as bundledLanguages } from "./vendor-heavy-DEw9PDV1.js";
var v = u("block", "before:content-[counter(line)]", "before:inline-block", "before:[counter-increment:line]", "before:w-4", "before:mr-4", "before:text-[13px]", "before:text-right", "before:text-muted-foreground/50", "before:font-mono", "before:select-none"), b = reactExports.memo(({ children: e, result: t, language: o, className: r, ...s }) => {
  let n = reactExports.useMemo(() => ({ backgroundColor: t.bg, color: t.fg }), [t.bg, t.fg]);
  return jsxRuntimeExports.jsx("pre", { className: u(r, "p-4 text-sm dark:bg-(--shiki-dark-bg)!"), "data-language": o, "data-streamdown": "code-block-body", style: n, ...s, children: jsxRuntimeExports.jsx("code", { className: "[counter-increment:line_0] [counter-reset:line]", children: t.tokens.map((l, d) => jsxRuntimeExports.jsx("span", { className: v, children: l.map((a, i) => jsxRuntimeExports.jsx("span", { className: "dark:bg-(--shiki-dark-bg)! dark:text-(--shiki-dark)!", style: { color: a.color, backgroundColor: a.bgColor, ...a.htmlStyle }, ...a.htmlAttrs, children: a.content }, i)) }, d)) }) });
}, (e, t) => e.result === t.result && e.language === t.language && e.className === t.className);
var y = ({ className: e, language: t, style: o, ...r }) => jsxRuntimeExports.jsx("div", { className: u("my-4 w-full overflow-hidden rounded-xl border border-border", e), "data-language": t, "data-streamdown": "code-block", style: { contentVisibility: "auto", containIntrinsicSize: "auto 200px", ...o }, ...r });
var L = ({ language: e, children: t }) => jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between bg-muted/80 p-3 text-muted-foreground text-xs", "data-language": e, "data-streamdown": "code-block-header", children: [jsxRuntimeExports.jsx("span", { className: "ml-1 font-mono lowercase", children: e }), jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: t })] });
var $ = createJavaScriptRegexEngine({ forgiving: true }), m = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map(), E = (e, t) => `${e}-${t[0]}-${t[1]}`, A = (e, t, o) => {
  let r = e.slice(0, 100), s = e.length > 100 ? e.slice(-100) : "";
  return `${t}:${o[0]}:${o[1]}:${e.length}:${r}:${s}`;
}, T = (e) => Object.hasOwn(bundledLanguages, e), K = (e, t) => {
  let o = T(e) ? e : "text", r = E(o, t);
  if (m.has(r)) return m.get(r);
  let s = createHighlighter({ themes: t, langs: [o], engine: $ });
  return m.set(r, s), s;
}, h = (e, t, o, r) => {
  let s = T(t) ? t : "text", n = A(e, s, o);
  return p.has(n) ? p.get(n) : (r && (g.has(n) || g.set(n, /* @__PURE__ */ new Set()), g.get(n).add(r)), K(s, o).then((l) => {
    let d = l.codeToTokens(e, { lang: s, themes: { light: o[0], dark: o[1] } });
    p.set(n, d);
    let a = g.get(n);
    if (a) {
      for (let i of a) i(d);
      g.delete(n);
    }
  }).catch((l) => {
    console.error("Failed to highlight code:", l), g.delete(n);
  }), null);
};
var le = ({ code: e, language: t, className: o, children: r, ...s }) => {
  let { shikiTheme: n } = reactExports.useContext(C), l = reactExports.useMemo(() => ({ bg: "transparent", fg: "inherit", tokens: e.split(`
`).map((i) => [{ content: i, color: "inherit", bgColor: "transparent", htmlStyle: {}, offset: 0 }]) }), [e]), [d, a] = reactExports.useState(l);
  return reactExports.useEffect(() => {
    let i = h(e, t, n);
    if (i) {
      a(i);
      return;
    }
    h(e, t, n, (x) => {
      a(x);
    });
  }, [e, t, n]), jsxRuntimeExports.jsx(Dt.Provider, { value: { code: e }, children: jsxRuntimeExports.jsxs(y, { language: t, children: [jsxRuntimeExports.jsx(L, { language: t, children: r }), jsxRuntimeExports.jsx(b, { className: o, language: t, result: d, ...s })] }) });
};
export {
  le as CodeBlock
};
