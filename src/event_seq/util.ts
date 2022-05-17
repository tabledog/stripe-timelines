import {readdirSync} from 'fs';
import util from "util";
import {config} from "./config";
import _ from "lodash";

const exec = util.promisify(require('child_process').exec);


function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// const abs_package_json_dir = () => {
//     const x = __dirname.split("/");
//     return x.slice(0, x.length - 2).join("/");
// }


const get_dirs = source =>
    readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

/**
 * Usage:
 * - `node util.js --data='{x: 1}'`
 */
const getCliData = () => {
    let data = null;

    for (const v of process.argv) {
        if (v.startsWith("--data=")) {
            data = JSON.parse(v.replace("--data=", ""));
            break;
        }
    }


    return data;
};

const get_all_events = async (stripe) => {
    let all = [];
    let has_more = true;
    let last = null;
    while (has_more) {
        const opts = {limit: 100};
        if (_.isString(last)) {
            // @ts-ignore
            opts.starting_after = last;
        }

        const res = await stripe.events.list(opts);
        has_more = res.has_more;
        all = all.concat(res.data);

        last = _.last(res.data).id;
    }

    // ORDER BY created ASC
    return all.reverse();
};


/**
 * Clicks the `Delete all test data` button from the currently signed in Stripe account.
 * - Uses Chrome TamperMonkey script.
 *      - Chrome Canary used to limit TamperMonkey access.
 *      - Must remove `stripe.com` from the TamperMonkey blacklist (added by default).
 *      - Must be signed in to Stripe, and have the correct test account as the active account.
 *
 * - No API to do this - XSS tokens used for the web UI API call.
 *
 *
 * - Prevents:
 *      - Having one Stripe account per object life cycle.
 *      - Merging many life cycles into a single account (to prevent creating a new account for each).
 *          - This is complicated to read as there are so many events.
 *          - Makes development faster as each object lifecycle can be isolated to make the code as short as possible.
 *
 */
const clearStripeAccountTamperMonkey = async () => {

    try {
        const cmd = `open -a "Google Chrome Canary" https://dashboard.stripe.com/test/developers#run=delete_test_data`;
        const res = await exec(cmd);

        // Assuming Chrome already running.
        await wait(7000);
    } catch (e) {
        console.error({e});
        process.exit(1);
    }


    const tamperMonkeyScript = `
        // ==UserScript==
        // @name         Delete Stripe test data with URL
        // @namespace    http://tampermonkey.net/
        // @version      0.1
        // @description  try to take over the world!
        // @author       You
        // @match        https://dashboard.stripe.com/*
        // @grant        none
        // ==/UserScript==
        
        function wait(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        (async function() {
            'use strict';
        
            console.log("Tampermonkey script loaded to delete all test data with url.");
        
            // E.g. https://dashboard.stripe.com/test/developers#run=delete_test_data
            const hash = window.location.hash;
            if (hash === "#run=delete_test_data") {
        
                // Page loaded with all React based elements.
                await wait(1000);
        
                // Click delete.
                $('[data-db-analytics-name="delete_test_data_button"]')[0].click();
        
                // Wait for confirm to render.
                await wait(500);
        
                // Click confirm.
                $('[data-db-analytics-name="confirm_cancel_dialog_footer_confirm_button"]')[0].click();
        
                // Prevent entering this loop again (after auto-refresh).
                window.location.replace(window.location.href.replace("#run=delete_test_data", ""));
            }
        
        })();
    `;
}


export {
    getCliData,
    get_all_events,
    wait,
    get_dirs
}