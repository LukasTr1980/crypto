"use strict";
async function load() {
    const res = await fetch('/api/funding');
    const data = await res.json();
    const el = document.getElementById('content');
    if (!el) {
        throw new Error('#content element not found');
    }
    el.innerHTML = `
        <h2>Deposits</h2>
        <pre>${JSON.stringify(data.deposits, null, 2)}</pre>
        <h2>Withdrawals</h2>
        <pre>${JSON.stringify(data.withdrawals, null, 2)}</pre>
    `;
}
load();
