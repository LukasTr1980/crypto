"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/main.ts
  var require_main = __commonJS({
    "src/main.ts"() {
      async function load() {
        var _a;
        const el = document.getElementById("content");
        if (!el) {
          throw new Error("#content element not found");
        }
        try {
          const res = await fetch("/api/funding");
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error((_a = body.error) != null ? _a : `HTTP ${res.status}`);
          }
          const data = await res.json();
          el.innerHTML = `
        <h2>Deposits</h2>
        <pre>${JSON.stringify(data.deposits, null, 2)}</pre>
        <h2>Withdrawals</h2>
        <pre>${JSON.stringify(data.withdrawals, null, 2)}</pre>
    `;
        } catch (err) {
          el.innerHTML = `<p style="color:red">Fehler: ${err.message}</p>`;
          console.error(err);
        }
      }
      load();
      load();
    }
  });
  require_main();
})();
