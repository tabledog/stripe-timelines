import {createCustomers, timelineA, timelineB} from "./lib-app/timelines/intents";
import {
    getPrice,
    getProductGoods,
    getProductServices,
    getRandomProduct
} from "./lib-app/data/level-0/product";
import {stripe} from "./config/stripe";
import {deleteAll} from "./lib-app/util";
import _ from "lodash";
import {batch, timeout} from "./lib/util";
import {Stripe} from "stripe";
import {createSubscriptions, getSubscription} from "./lib-app/data/level-0/subscription";
import {createSetupIntentForAllCustomers} from "./lib-app/data/level-0/payment-intent";


const timelineC = async () => {
    console.log(`Running timeline C`);
    while (true) {
        await createSubscriptions();
        await timeout(100);
    }
};

/**
 * @todo/next
 * - Test general data and relation mutation,
 *      - E.g: deletions, cancel subscriptions, adding new cards etc, moving sub/card to new customer.
 */
const run = async () => {
    console.log("Note: To reset your test account (including deleting resources that cannot be deleted via the API):");
    console.log("https://dashboard.stripe.com/test/developers");
    console.log("Note: Request logs:");
    console.log("https://dashboard.stripe.com/test/logs");


    // await deleteAll();


    await Promise.all([
        timelineA(),
        timelineB(),
        timelineC()
    ]);


    console.log("Complete");
};


run();
