import { useEffect } from "react";
export function WebDocument() {
  useEffect(() => {
    document.title = "حاتم — لكل لَمّة، حكاية";
    document.documentElement.lang = "ar";
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#F8F8F2";
    document.head.appendChild(meta);
    const style = document.createElement("style");
    style.textContent =
      "body{background:#F8F8F2}*{box-sizing:border-box}input:focus-visible,[role=button]:focus-visible,[role=tab]:focus-visible{outline:2px solid #D77A57;outline-offset:3px}::selection{background:#D9E5D2}";
    document.head.appendChild(style);
    return () => {
      meta.remove();
      style.remove();
    };
  }, []);
  return null;
}
