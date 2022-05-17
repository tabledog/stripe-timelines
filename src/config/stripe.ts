import HttpsProxyAgent from 'https-proxy-agent';
// import HttpProxyAgent from "http-proxy-agent";
import Stripe from "stripe";
import {config} from "./config";


// @todo/maybe allow many different Stripe test accounts for a single process.
// - Having a single import/export for `stripe` allows splitting functions into their own files instead of using anonymous closures.
const stripe = new Stripe(config.stripe.defaultAccount.secret_key, {
    apiVersion: '2020-08-27',
});

// When using one Stripe account per test fixture.
// const getClient = (accountId) => {
//     return new Stripe(config.stripe.testAccounts[accountId].secret_key, {
//         apiVersion: '2020-08-27',
//     });
// };


/**
 * Issues with HTTP proxy:
 *
 * Issue: `SELF_SIGNED_CERT_IN_CHAIN`
 * - `https-proxy-agent`
 *      - Uses `CONNECT` to try and get a persistent connection (instead of HTTP client->proxy, and then HTTPS proxy->server).
 *      - Does not allow trusting the proxies cert (https://github.com/TooTallNate/node-https-proxy-agent/issues/54)/
 *      - Even though the passed proxy URL is `http`, for https targets, CONNECT is used which forces HTTPS from client->proxy.
 *
 * - `http-proxy-agent` (not http*s*).
 *      - Just issues a plain HTTP request to port :443 (instead of setting up a TLS connection and sending the HTTP through that).
 *          - Issue: The Stripe node lib is not aware that it is going over a proxy.
 *
 */
const getClientFromKeys = (sec) => {
    let proxy = null;

    if ("http_proxy" in process.env) {
        // @ts-ignore
        // Note: must use `NODE_TLS_REJECT_UNAUTHORIZED=0` (even with a plain HTTP proxy, the Stripe client will use the CONNECT which forces HTTPS from client->proxy).
        proxy = new HttpsProxyAgent(process.env.http_proxy);
        console.log(`Stripe using http_proxy=${process.env.http_proxy}`);
    }

    const stripe = new Stripe(sec, {
        apiVersion: '2020-08-27',
        httpAgent: proxy,
    });

    return stripe;
};


export {
    stripe,
    // getClient,
    getClientFromKeys
}