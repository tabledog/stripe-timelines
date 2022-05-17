import {strict as assert} from "assert";
import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {all} from "./../../data/cards";
import _ from "lodash";
import {wait} from "../util";


const card = {
    number: '4242424242424242',
    exp_month: 2,
    exp_year: 2025,
    cvc: '314',
};


const card_auth_needed = {
    number: '4000 0027 6000 3184',
    exp_month: 2,
    exp_year: 2025,
    cvc: '314',
}


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
                ...(Array(55).fill(`setup_intent.created`))
            ],
            fn: async () => {
                const {id: c_1} = await stripe.customers.create({
                    name: "C1.customer_1 Test",
                    metadata: {tid: "c_1"}
                });

                const {id: pm_1} = await stripe.paymentMethods.create({
                    // customer: c_1, Error: You cannot attach a PaymentMethod to a Customer during PaymentMethod creation. Please instead create the PaymentMethod and then attach it using the attachment method of the PaymentMethods API.
                    type: 'card',
                    card: card_auth_needed,
                    metadata: {tid: "pm_1"}
                });

                await stripe.paymentMethods.attach(
                    pm_1,
                    {customer: c_1}
                );

                const {id: si_1} = await stripe.setupIntents.create({
                    customer: c_1,
                    // payment_method: pm_1,
                    payment_method_types: ['card'],
                    metadata: {tid: "si_1"}
                });


                const ids = [];
                for (const [category, pm_tags] of _.toPairs(all)) {

                    const g = [];
                    for (const pm_tag of pm_tags) {
                        const one = async () => {
                            const {id} = await stripe.setupIntents.create({
                                customer: c_1,
                                payment_method: pm_tag,
                                payment_method_types: ['card'],
                                metadata: {
                                    tid: `si_${category}_${pm_tag}`,
                                    created_from: `category:${category}, ${pm_tag}`
                                }
                            });

                            ids.push({category, pm_tag, si_id: id});
                        };
                        g.push(one());
                    }

                    await Promise.all(g);
                }


                return {ids: {c_1, pm_1, si_1, ids}};
            }
        },
        {
            tag: "u"
        },


        /**
         * Assert: These all result in updates.
         * - "setup_intent.succeeded"
         * - "setup_intent.canceled"
         * - "setup_intent.requires_action"
         * - "setup_intent.setup_failed"
         */
        {
            opts: {
                ensure_order: false
            },
            events: [
                'setup_intent.requires_action',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'setup_intent.requires_action',
                'setup_intent.requires_action',
                'setup_intent.requires_action',
                'setup_intent.requires_action',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'setup_intent.requires_action',
                'setup_intent.setup_failed',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'setup_intent.setup_failed',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'setup_intent.setup_failed',
                'setup_intent.setup_failed',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'setup_intent.setup_failed',
                'payment_method.attached',
                'setup_intent.succeeded',
                'setup_intent.setup_failed',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'setup_intent.setup_failed',
                'setup_intent.setup_failed',
                'setup_intent.setup_failed',
                'setup_intent.setup_failed',
                'setup_intent.setup_failed',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded',
                'payment_method.attached',
                'setup_intent.succeeded'
            ],
            fn: async ({c_1, pm_1, si_1, ids}) => {

                // Issue: There is no `setup_intent.processing` event, but there is a `payment_intent.processing`.
                // - The docs at https://stripe.com/docs/payments/intents state that "some payment methods can take up to a few days to process".
                // - This is an issue because a status=processing query is not possible for setup_intent.

                await stripe.setupIntents.confirm(
                    si_1,
                    {
                        payment_method: pm_1
                    }
                );


                // Note: can be attached to SetupIntent, but fails on confirm.
                const not_supported = [
                    "pm_card_discover",
                    "pm_card_diners",
                    "pm_card_jcb",
                    "pm_card_unionpay",

                    // Sometimes succeeds, sometimes results in status=requires_payment_method.
                    // - Remove as this causes issues with verifying the correct events were generated as its not deterministic.
                    "pm_card_cvcCheckFail"
                ];

                // These result in failed promises, but represent app state that represent errors (not network errors).
                // - E.g They will transition a Stripe object to an error state.
                // - Assert: all result in setup_intent.setup_failed event, HTTP 403
                const http_error_ok = [
                    "pm_card_threeDSecureRequiredChargeDeclined",
                    "pm_card_visa_chargeDeclinedStolenCard",
                    "pm_card_chargeDeclined",
                    "pm_card_chargeDeclinedInsufficientFunds",
                    "pm_card_avsFail",
                    "pm_card_avsZipFail",
                    "pm_card_visa_chargeDeclinedLostCard",
                    "pm_card_chargeDeclinedProcessingError",
                    "pm_card_chargeDeclinedIncorrectCvc",
                    "pm_card_cvcCheckFail",
                    "pm_card_chargeDeclinedExpiredCard",
                    "pm_card_threeDSecureRequiredChargeDeclined",
                    "pm_card_threeDSecureRequiredProcessingError"
                ];

                for (const {si_id, pm_tag} of ids) {
                    if (not_supported.includes(pm_tag)) {
                        continue;
                    }

                    // // Ensure same order of events.
                    // await wait(12000);

                    try {
                        await stripe.setupIntents.confirm(
                            si_id
                        );
                    } catch (e) {
                        if (http_error_ok.includes(pm_tag)) {
                            continue;
                        }
                        throw e;
                    }

                }


                // @todo/next test all cards to trigger all possible states.


            }
        },
        {
            tag: "d"
        },
        {
            events: [
                'customer.deleted',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled',
                'setup_intent.canceled'
            ],
            fn: async ({c_1, ids}) => {

                await stripe.customers.del(c_1);


                // Cancel all
                for (const {si_id} of ids) {
                    const {status} = await stripe.setupIntents.retrieve(si_id);

                    // Only `^requires` can be cancelled (not success/fail).
                    if (status.startsWith(`requires_`)) {
                        await stripe.setupIntents.cancel(si_id);
                    }

                }
            }
        }
    ];

}


const assert_setup_intent_with_customer_requires_payment_method = async (stripe, si, customer) => {
    await assert.rejects(async () => {
        // `Error: The customer cus_J32Jq8Yfp6QYF2 cannot be updated without also passing the payment method. Please include the payment method in the `payment_method` parameter on the SetupIntent.`
        await stripe.setupIntents.update(si, {
            customer,
            // payment_method: "x", // This is required.
        });
    });
};


const assert_setup_intent_cannot_be_deleted_or_cancelled_after_succeed = async (stripe, si) => {
    await assert.rejects(async () => {
        // Note: No `del` for SI.
        await stripe.setupIntents.cancel(si);
    });
};


export {
    get_timeline
}