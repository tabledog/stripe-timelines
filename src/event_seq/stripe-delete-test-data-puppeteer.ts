import puppeteer from "puppeteer-core";
import fetch from "node-fetch";
import util from "util";

import _ from "lodash";
import {wait} from "./util";

const exec = util.promisify(require('child_process').exec);
const spawn = require('child_process').spawn;


const debugPort = `9222`;
const stripeDevUrl = `https://dashboard.stripe.com/test/developers#delete-test-data-target`;


const startChromeWithRemoteDebug = async () => {
    // const cmd = `"/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary" --remote-debugging-port=${debugPort} ${stripeDevUrl}`;
    // exec(cmd);

    const options = {
        // slient: true,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
    };
    const child = spawn("/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary", [`--remote-debugging-port=${debugPort}`, stripeDevUrl], options); // Do not wait; Chrome does not return, tails logs.

    // This is needed to detach the process from node.
    // - This prevents node blocking at the end of the script waiting for all its child processes to exit.
    child.unref();

    // Wait for Browser to start up.
    await wait(2000);
}


const getWSUrl = async () => {
    try {
        const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        const json = (await res.json());
        return json.webSocketDebuggerUrl;
    } catch (e) {

    }
    return null;
};

const getWSMaybeStartBrowser = async () => {
    let ws = await getWSUrl();
    if (_.isString(ws)) {
        // Existing browser instance.
        return ws;
    }

    await startChromeWithRemoteDebug();
    ws = await getWSUrl();
    if (_.isString(ws)) {
        // New browser instance.
        return ws;
    }

    console.error("Could not get dev WS URL to Chrome browser.");
    process.exit();
};


const getPage = async (browser) => {
    let i = 0;
    while (i < 100) {
        i++;

        const pages = await browser.pages();
        for (const p of pages) {
            const url = p.url();

            if (url === stripeDevUrl) {
                return p;
            }
        }

        await wait(100);
    }
    console.error("Could not find Stripe dev tab. Make sure a tab is open with /test/developers#delete-test-data-target.");
    process.exit();
};

const pressDeleteAndConfirmBtns = async (page) => {
    await page.waitForSelector('[data-db-analytics-name="delete_test_data_button"]', {
        // visible: true,
        timeout: 10000
    });

    await page.evaluate(async () => {
        function wait(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // @ts-ignore
        if ($('[data-db-analytics-name="delete_test_data_button"]').length > 0) {
            // Click delete.
            // @ts-ignore
            $('[data-db-analytics-name="delete_test_data_button"]')[0].click();

            // Wait for confirm to render.
            await wait(5000);

            // Click confirm.
            // @ts-ignore
            $("button:contains('Start deletion')")[0].click();


        } else {
            console.error("Could not find delete btn.");
        }
    });
};


/**
 * Presses the "delete all test data" button in the Stripe web UI for the current active test account.
 * - Uses Chrome Canary on Mac OS.
 * - Faster than the Tampermonkey script.
 *      - Needs to load a new tab on every run (around 5 seconds to load).
 *
 * Returns when `delete` has completed (and the Stripe API can be used again).
 */
const deleteStripeTestData = async () => {

    // Connects to previously started Chrome instance.
    const browser = await puppeteer.connect({
        // E.g: browserWSEndpoint: `ws://127.0.0.1:9222/devtools/browser/6a99c1c9-43fb-4d77-b9ae-7c9bb2d6c29a`
        browserWSEndpoint: await getWSMaybeStartBrowser()
    });

    await pressDeleteAndConfirmBtns(await getPage(browser));
    browser.disconnect();

    // Wait for delete operation to complete on Stripes server.

    // Note: The wait used to be 5s, but recently increased to around 20s (even for just a few objects).
    console.log("Waiting for Stripe account delete to complete on their server.");
    await wait(20000);
    console.log("Wait done.");
    console.info("Deleted Stripe test data (assumed based on time).");
};


/**
 * Issues:
 * - Chrome must NOT be already running (results in `Failed to launch the browser process`).
 *      - Closing the browser clears all state.
 * - `browser.disconnect` still keeps the node process alive.
 *      - This is because the browser process is a child of the node process.
 *          - Puppeteer cannot launch in detach=true mode?
 */
const origRun = async () => {


    // Note: Chrome must not be running already.
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        headless: false,

        // To get data dir: `chrome://version/`, profile path = parent of given path.
        userDataDir: `/Users/Enzo/Library/Application Support/Google/Chrome Canary`,
        // args: [
        //     `--user-data-dir=/Users/Enzo/Library/Application Support/Google/Chrome Canary`
        // ]
    });
    const page = await browser.newPage();
    await page.goto('https://dashboard.stripe.com/test/developers');


    // Does not seem to disconnect the node process from the Chrome process.
    browser.disconnect();
}


export {
    deleteStripeTestData
}
