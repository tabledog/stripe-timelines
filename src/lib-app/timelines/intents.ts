import {createCustomers} from "./../../lib-app/data/level-0/customer";

import {stripe} from "./../../config/stripe";
import {
    createSetupIntent,
    getRandomPaymenIntent,
    getRandomPaymentMethod,
    getRandomSetupIntent
} from "./../data/level-0/payment-intent";
import {batch, timeout} from "../../lib/util";
import _ from "lodash";




const createPaymentIntent = async (cid) => {

    // Step 1: `requires_payment_method`
    const i = getRandomPaymenIntent();
    i.customer = cid;
    const {id} = await stripe.paymentIntents.create(i);
    console.log(`Created PaymentIntent: ${id}`);

    // Step 2: `requires_confirmation`
    // await timeout(1000);
    const {id: pmId} = await stripe.paymentMethods.create(getRandomPaymentMethod());
    await stripe.paymentIntents.confirm(id, {
        payment_method: pmId
    });


    // Step 3: `requires_action` (E.g. 3D secure).
    // Step 4: `processing` (can take days for non-card methods).
    // Step 5: `succeeded`


    // @todo/next attach method to customer
};


const createPaymentIntentFromSetupIntent = async (customer, payment_method) => {
    const {id} = await stripe.paymentIntents.create({
        amount: _.random(10 * 100, 500 * 100),
        currency: 'usd',
        customer,
        payment_method,
        off_session: true,
        confirm: true
    });
    console.log(`Created PaymentIntent from Setup Intent: ${id}`);
    return id;
};

const timelineA = async () => {
    console.log("Running timeline A.");
    const customers = await createCustomers(10);

    while (true) {
        const cid = _.sample(customers);

        // Create a random payment on a random customer.
        await createPaymentIntent(cid);
        await timeout(100);
    }

};

const timelineB = async () => {
    console.log("Running timeline B.");
    const customers = await createCustomers(10);

    // Create setup intents which should move to `succeeded` state indicating the payment method can be charged in the future.
    const all = await batch(async (cId) => {
        const {payment_method} = await createSetupIntent(cId);
        return {
            customer: cId,
            payment_method
        };
    }, customers);


    while (true) {
        const {customer, payment_method} = _.sample(all);

        // Create a random payment on a random customer.
        await createPaymentIntentFromSetupIntent(customer, payment_method);
        await timeout(100);
    }

};


// @todo/next Basic timeline for subscriptions.
export {
    timelineA,
    timelineB,
    createCustomers
}