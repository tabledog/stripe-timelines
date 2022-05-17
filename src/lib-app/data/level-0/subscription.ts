import Stripe from "stripe";
import {batch, split} from "../../../lib/util";
import _ from "lodash";
import {createCustomers} from "./customer";
import {createSetupIntentForAllCustomers} from "./payment-intent";
import {stripe} from "../../../config/stripe";
import {createProducts} from "./product";


const getSubscription = (customer, prices): Stripe.SubscriptionCreateParams => {

    let first_recur = null;
    const items = _.shuffle(prices).slice(0, _.random(1, prices.length)).map(price => {


        // Avoid error: `Currency and interval fields must match across all plans on this subscription.`
        if (first_recur === null) {
            first_recur = {
                interval: price.recurring.interval,
                interval_count: price.recurring.interval_count,
            };
        }

        return {
            price_data: {
                unit_amount: price.unit_amount,
                // Avoid error: "You cannot combine currencies on a single customer. This customer has had a subscription, coupon, or invoice item with currency gbp".
                currency: "gbp",
                product: price.product,
                recurring: first_recur
            },
            quantity: price.recurring.usage_type === "licensed" ? _.random(1, 10) : undefined,
            billing_thresholds: split(0.25, {usage_gte: _.random(1, 10)}, undefined)

            // @todo/low
            // tax_rates: []
        }
    });


    return {
        customer,
        items,

        // add_invoice_items: undefined,
        // application_fee_percent: 0,
        // backdate_start_date: 0,
        // billing_cycle_anchor: 0,
        // billing_thresholds: undefined,
        // cancel_at: 0,
        // cancel_at_period_end: false,
        // collection_method: undefined,
        // coupon: "",
        // days_until_due: 0,
        // default_payment_method: "",
        // default_source: "",
        // default_tax_rates: undefined,
        // expand: undefined,
        // metadata: undefined,
        // off_session: false,
        // payment_behavior: undefined,
        // pending_invoice_item_interval: undefined,
        // promotion_code: "",
        // proration_behavior: undefined,
        // transfer_data: undefined,
        // trial_end: undefined,
        // trial_from_plan: false,
        // trial_period_days: 0
    }
};


const createSubscriptions = async () => {
    const {prices} = await createProducts();
    const customers = await createCustomers(10);

    // Add a set-up intent for all customers so that the subscription create passes. (needs a valid customer.source).
    await createSetupIntentForAllCustomers(customers);

    // await timeout(60 * 1.5 * 1000);

    // Create many subscriptions per customer.
    const x = [
        ...customers,
        ...customers,
        ...customers,
        ...customers
    ];

    const pricesRecurring = prices.filter(p => p.type === "recurring");

    return batch(async (c) => {
        const sub = getSubscription(c, pricesRecurring);
        const {id} = await stripe.subscriptions.create(sub);
        console.log(`Created Subscription ${id}`);


        if (Math.random() > 0.7) {
            // Note: `from_subscription` takes schedule data stored from on the subscription.
            // - The Prices API replaces schedules.
            const subSchedule = await stripe.subscriptionSchedules.create({from_subscription: id});
            console.log(`Created SubscriptionSchedule ${subSchedule.id}`);
        }


        return id;
    }, x);


};


export {
    getSubscription,
    createSubscriptions
}