#!/usr/bin/env ts-node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { showDeposits, showWithdrawals } from "./funding";

yargs(hideBin(process.argv))
    .command('funding', 'Deposits & Withdrawals', () => {}, async () => {
        const depositNet = await showDeposits();
        const withdrawNet = await showWithdrawals();
        
        console.log(`\n=== CASH FLOW TOTAL ===`);
        console.log(`Nettogeldzufluss: ${(depositNet -withdrawNet).toFixed(2)} EUR`);
    })
    .demandCommand(1, 'Bitte einen Befehl angeben (funding, trades, ledger)')
    .help()
    .argv;