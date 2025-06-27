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
        const res = await fetch("/api/funding");
        const data = await res.json();
        const el = document.getElementById("content");
        if (!el) {
          throw new Error("#content element not found");
        }
        el.innerHTML = `
        <h2>Deposits</h2>
        <pre>${JSON.stringify(data.deposits, null, 2)}</pre>
        <h2>Withdrawals</h2>
        <pre>${JSON.stringify(data.withdrawals, null, 2)}</pre>
    `;
      }
      load();
    }
  });
  require_main();
})();
