import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";
import {sepa} from "../../data/cards";
import {wait} from "../util";


const card = {
    number: '4242424242424242',
    exp_month: 1,
    exp_year: 2025,
    cvc: '314',
};


const get_timeline = async (stripeSec) => {
    const stripe = getClientFromKeys(stripeSec);

    return [
        {
            tag: "c"
        },
        {
            events: [
                'customer.created',
                'payment_method.attached',
                'payment_intent.created',
                'payment_intent.created',
                'payment_intent.created',
                'payment_intent.created'
            ],
            fn: async () => {
                const {id: c_1} = await stripe.customers.create({
                    name: "C1.customer_1 Test",
                    metadata: {tid: "c_1"}
                });

                const {id: pm_1} = await stripe.paymentMethods.create({
                    type: 'card',
                    card,
                    metadata: {tid: "pm_1"}
                });

                await stripe.paymentMethods.attach(pm_1, {customer: c_1});


                // No customer or pm
                const {id: pi_1} = await stripe.paymentIntents.create({
                    amount: 1000,
                    currency: "eur",
                    // customer: c1,
                    payment_method_types: ['card', 'sepa_debit'],
                    // payment_method: pm
                    metadata: {tid: "pi_1"}
                });

                // Customer, no pm
                const {id: pi_2} = await stripe.paymentIntents.create({
                    amount: 2000,
                    currency: "gbp",
                    customer: c_1,
                    payment_method_types: ['card'],
                    // payment_method: pm
                    metadata: {tid: "pi_2"}
                });

                // customer + pm
                const {id: pi_3} = await stripe.paymentIntents.create({
                    amount: 3000,
                    currency: "gbp",
                    customer: c_1,
                    payment_method_types: ['card'],
                    payment_method: pm_1,
                    metadata: {tid: "pi_3"}
                });

                // customer + pm
                const {id: pi_4} = await stripe.paymentIntents.create({
                    amount: 4000,
                    currency: "gbp",
                    customer: c_1,
                    payment_method_types: ['card'],
                    payment_method: pm_1,
                    metadata: {tid: "pi_3"}
                });


                return {
                    ids: {
                        c_1,
                        pm_1,
                        pi_1,
                        pi_2,
                        pi_3,
                        pi_4
                    }
                };
            }
        },
        {
            tag: "u"
        },
        {
            events: [
                'charge.failed',
                'payment_intent.payment_failed',
                'charge.failed',
                'payment_intent.payment_failed',
                'payment_intent.requires_action',
                'charge.succeeded',
                'payment_intent.succeeded',
                'charge.succeeded',
                'payment_intent.succeeded'
            ],
            fn: async (ids) => {
                const {
                    c_1,
                    pm_1,
                    pi_1,
                    pi_2,
                    pi_3
                } = ids;

                await assert_no_confirm_without_pm(stripe, pi_1);

                // Move pi to error states.
                {
                    // 'payment_intent.payment_failed' x 2 for the same PI.
                    await assert.rejects(async () => await stripe.paymentIntents.confirm(pi_1, {payment_method: `pm_card_chargeCustomerFail`}));
                    await assert.rejects(async () => await stripe.paymentIntents.confirm(pi_1, {payment_method: `pm_card_chargeDeclinedFraudulent`}));

                    // 'payment_intent.requires_action'
                    await stripe.paymentIntents.confirm(pi_1, {payment_method: `pm_card_threeDSecure2Required`});
                }

                // After confirm, cannot be cancelled or create any more payments.
                await stripe.paymentIntents.confirm(pi_2, {payment_method: pm_1});
                await stripe.paymentIntents.confirm(pi_3);
            }
        },
        {
            events: [
                'charge.pending',
                'payment_intent.processing',
                'charge.succeeded',
                'payment_intent.succeeded',
                'charge.dispute.created',
                'charge.dispute.funds_withdrawn',
                'charge.dispute.closed',
            ],
            fn: async ({pi_1}) => {


                const {id: pm_2} = await stripe.paymentMethods.create({
                    type: 'sepa_debit',
                    sepa_debit: {
                        iban: sepa.ends_203,
                    },
                    billing_details: {
                        name: 'Jenny Rosen',
                        email: 'jenny@example.com',
                    },
                    metadata: {tid: "pm_4"}
                });

                // Trigger `payment_intent.processing` by using a sepa_debit pm (pi can spend days in status=processing)
                await stripe.paymentIntents.update(
                    pi_1,
                    {payment_method: pm_2}
                );

                // `Error: This PaymentIntent requires a mandate, but no existing mandate was found. Collect mandate acceptance from the customer and try again, providing acceptance data in the mandate_data parameter.`
                const c_opts = {
                    mandate_data: {
                        customer_acceptance: {
                            type: "online",
                            online: {
                                ip_address: "93.184.216.34",
                                user_agent: "Chrome"
                            }
                        }
                    }
                }

                // - Also triggers a `charge.dispute.*` after succeed.
                // @ts-ignore
                await stripe.paymentIntents.confirm(pi_1, c_opts);

            },
        },
        {
            events: [
                'charge.dispute.updated',
                'charge.updated',
                'charge.refunded',
                'charge.refunded',
                'charge.refund.updated',
            ],
            fn: async ({pi_2}) => {
                // Trigger `charge.dispute.updated`
                const {data: [d_1]} = await stripe.disputes.list({limit: 1});
                await stripe.disputes.update(d_1.id, {metadata: {tid: 'd_1'}});

                // @ts-ignore
                await stripe.charges.update(d_1.charge, {metadata: {tid: 'c_1'}});


                const {id: r_1} = await stripe.refunds.create({
                    payment_intent: pi_2,
                    amount: 100,
                    metadata: {
                        tid: "r_1"
                    }
                });
                const {id: r_2} = await stripe.refunds.create({
                    payment_intent: pi_2,
                    amount: 200,
                    metadata: {
                        tid: "r_2"
                    }
                });

                // Put update at the end to see if `update=1` is contained in any other events other than `charge.refund.updated`
                await stripe.refunds.update(r_1, {metadata: {update: "1"}});
            }
        },
        {
            events: [
                'payment_intent.created',
                'charge.succeeded',
                'payment_intent.amount_capturable_updated',
                'charge.captured',
                'payment_intent.succeeded'
            ],
            /**
             * Trigger `payment_intent.amount_capturable_updated`
             *
             * @see https://stripe.com/docs/payments/capture-later
             */
            fn: async () => {

                const {id: pi} = await stripe.paymentIntents.create({
                    amount: 1099,
                    currency: 'usd',
                    payment_method_types: ['card'],
                    capture_method: 'manual',
                    payment_method: "pm_card_visa"
                });

                await stripe.paymentIntents.confirm(pi);

                // `the bank guarantees the amount and holds it on the customer’s card for up to seven days`
                // Note: This generates a charge->refund for the remaining amount (1099-750=349); the refund is included in the `charge.captured` event.
                await stripe.paymentIntents.capture(pi, {
                    amount_to_capture: 750,
                });
            },
        },


        {
            tag: "d"
        },
        {
            events: [
                'payment_intent.canceled'
            ],
            fn: async ({pi_4}) => {
                await stripe.paymentIntents.cancel(pi_4);
            }
        }
    ];

}


const assert_no_confirm_without_pm = async (stripe, pi) => {
    await assert.rejects(async () => {
        // `Error: You cannot confirm this PaymentIntent because it's missing a payment method. You can either update the PaymentIntent with a payment method and then confirm it again, or confirm it again directly with a payment method.`
        await stripe.paymentIntents.confirm(pi);
    });
};


export {
    get_timeline
}