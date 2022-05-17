import {all} from "./all";
import {get_dirs, getCliData} from "./util";
import {writeSteps} from "./write-steps";
import {deleteStripeTestData} from "./stripe-delete-test-data-puppeteer";
import {getClientFromKeys} from "../config/stripe";
import _ from "lodash";

require('source-map-support').install();


const is_stripe_account_empty = async (sec) => {
    const stripe = getClientFromKeys(sec);
    const all = await stripe.events.list({limit: 1});
    return all.data.length === 0;
}


const cli = async () => {
    const {
        data_dir,
        stripe_sec_key,
        event_seq_key,

        /**
         * AKA `no_del_account_dl_or_event_wait`
         * - When iterating or exploring with the API, remove any time delays:
         *      - Do not delete the Stripe account when starting.
         *      - Do not download the account to a SQLite file after each step.
         *      - Do not wait for a set of event keys before going on to the next step.
         * - This is to enable much faster iteration without having to pay the time delay costs.
         *      - After the steps are complete, fast_mode=false will then write the steps to files, and ensure event types are waited for to ensure event order is deterministic.
         */
        fast_mode = false
    } = getCliData();


    let to_write = [];
    if (event_seq_key === "*") {
        const exist = get_dirs(data_dir);
        to_write = _.keys(all).filter(x => !exist.includes(x));
        if (to_write.length === 0) {
            console.log(`All timelines already exist in ${data_dir}. Delete the directory to re-create them.`);
            process.exit(1);
        }

        console.log(`${to_write.length} timelines to be written:`);
        console.log(to_write);

        if (exist.length > 0) {
            console.log(`${exist.length} timelines already exist, ignoring:`);
            console.log(exist);
        }
    } else {
        if (!(event_seq_key in all)) {
            console.error(`No event seq with key "${event_seq_key}".`);
            process.exit(1);
        }
        to_write = [event_seq_key];
    }


    for (const k of to_write) {
        console.log(`Writing timeline '${k}'`);
        const timeline = all[k];

        if (!fast_mode && !(await is_stripe_account_empty(stripe_sec_key))) {
            await deleteStripeTestData();
        }

        await writeSteps(data_dir, stripe_sec_key, k, timeline, fast_mode);
    }


};


cli();

