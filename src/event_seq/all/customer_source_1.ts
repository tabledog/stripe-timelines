import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";


import {getRandomCustomer} from "../../lib-app/data/level-0/customer";
import {getRandomSource} from "../../lib-app/data/level-0/source";
import _ from "lodash";

import {strict as assert} from "assert";

/**
 * This experiment is to see if the `customer.source` object can be kept in sync with just events.
 * - Sources cannot be listed.
 * - They are only included on customer if expand=source is set; so not for any customer objects on event data.
 *
 * @see https://stripe.com/docs/payments/payment-intents/migration#saved-cards (diff old source with new payment API).
 */


const s1_create = {
    type: "card",
    currency: "USD",
    card: {
        number: `4242424242424242`,
        cvc: `123`,
        exp_month: `03`,
        exp_year: `2030`,
    },
    owner: {
        email: "example@example.com"
    }
};

// Beta, only for USD accounts, will be part of the Intents API in the future.
// const s2_create = {
//     type: "ach_credit_transfer",
//     currency: "USD",
//     owner: {
//         email: "example@example.com"
//     }
// };


const reject_1 = async (stripe, s1) => {
    // Note: Cannot create a charge unless it is attached to a customer?
    // @todo/low Test sources/charges that are not attached to a customer.
    return await assert.rejects(async () => {
        await stripe.charges.create({
            amount: 1100,
            currency: 'usd',
            // customer: 'cus_AFGbOSiITuJVDs',
            source: s1,
        })
    });
}


const reject_2 = async (stripe) => {
    // Note: cannot create a source attached to a customer in a single request? (`customer` is a param but API errors).
    return await assert.rejects(async () => {
        // `Error: The source you provided cannot be attached to the customer. It must be chargeable or pending.`
        await stripe.sources.create({
            ...s1_create,
            owner: null,
            // `Error: Received unknown parameters: type, currency, card, owner` - It is not possible to create a source already attached?
            // customer: c1
        });
    });
}

const req = {event: "before-one-req"};

/**
 *
 * Issues with Sources:
 * - The do not have their own create, update and delete events (only `customer.source.created` etc).
 *      - A source can be created and charged without ever outputting a `create source` event (as its not attached to a customer).
 * - Updates trigger no events, even for attached sources.
 *      - E.g. updating a cards expiry date triggers no events, which means it is impossible to sync that state to a db.
 *
 * @todo/low Should a source be deleted?
 * - E.g. a `cud` would mean that the source is never created then deleted, but the charge will reference the source id (and exclude its data from the row?)
 *      - Fix, A: Just store payment_method_details instead?
 * - Question: which data should be immutable for historical reference (charges are never deleted, but should their descendant types also never be deleted?)
 */
const get_timeline = async (stripeSec) => {
    const stripe = getClientFromKeys(stripeSec);

    return [
        {
            tag: "c"
        },
        {
            events: [`customer.created`],
            fn: async () => {
                const {id: c_1} = await stripe.customers.create({
                    name: "C1 Source Test",
                    // source: "",
                    metadata: {tid: "c1"}
                });

                return {
                    ids: {c_1}
                }
            }
        },
        {
            events: [`customer.created`],
            fn: async () => {
                const {id: c_2} = await stripe.customers.create({
                    name: "C2 Source Test",
                    // source: "",
                    metadata: {tid: "c_2"}
                });

                return {
                    ids: {c_2}
                }
            }
        },
        {
            events: [`source.chargeable`],
            fn: async () => {
                const {id: s_1} = await stripe.sources.create(s1_create);
                return {
                    ids: {s_1}
                }
            }
        },
        {
            events: [`source.chargeable`],
            fn: async () => {
                const {id: s_2} = await stripe.sources.create(s1_create);
                return {
                    ids: {s_2}
                }
            }
        },
        {
            events: [`source.chargeable`],
            fn: async () => {
                const {id: s_3} = await stripe.sources.create(s1_create);
                return {
                    ids: {s_3}
                }
            }
        },
        {
            events: [
                `customer.updated`,
                `payment_method.attached`,
                `customer.source.created`
            ],
            fn: async ({c_2, s_3}) => {
                // "Add a source without replacing the existing default"
                // - Attach the source to the customer here so that `payment_method.attached` (create) is triggered.
                // - The next step updates this (Assert download process inserts PaymentMethod so the row exists for the update).
                await stripe.customers.createSource(
                    c_2,
                    {
                        source: s_3,
                    }
                );






            }
        },
        {
            tag: "u"
        },
        {
            assert: async () => {
                await reject_2(stripe);
            }
        },
        {
            // Note: No events are triggered for this - it is impossible to sync.
            events: [],
            fn: async ({s_1}) => {
                await stripe.sources.update(s_1,
                    {
                        // @ts-ignore
                        card: {
                            exp_month: `04`,
                            exp_year: `2040`,
                        },
                        metadata: {
                            update: "S1 U1"
                        }
                    }
                );
            }
        },
        {
            events: [
                `customer.updated`,
                `payment_method.attached`,
                `customer.source.created`
            ],
            fn: async ({c_1, s_1}) => {
                await stripe.customers.update(c_1, {
                    source: s_1,
                });

            }
        },
        {
            // Note: No events are triggered for this - it is impossible to sync.
            events: [],
            fn: async ({s_1}) => {
                await stripe.sources.update(s_1,
                    {
                        // @ts-ignore
                        card: {
                            exp_month: `05`,
                            exp_year: `2050`,
                        },
                        metadata: {
                            update_src: "S1 U2"
                        }
                    }
                );

            }
        },
        {
            events: [`payment_method.updated`],
            fn: async ({s_1}) => {
                // Ok: Can use a Source as a PaymentMethod (Note: the Source ID is used `src_...` even though object_type="payment_method")
                // - Triggers updates (only for payment_method, not for source).
                //      - Users cannot sync source updates.
                await stripe.paymentMethods.update(
                    s_1,
                    {
                        card: {
                            exp_month: 5,
                            exp_year: 2060,
                        },
                        metadata: {update_pm: 'S1 U1 as a PaymentMethod.'}
                    }
                );

            }
        },
        {
            events: [`payment_method.updated`],
            fn: async ({s_3}) => {
                await stripe.paymentMethods.update(
                    s_3,
                    {
                        card: {
                            exp_month: 3,
                            exp_year: 2033,
                        },
                        metadata: {update_pm: 'S3 U1 as a PaymentMethod.'}
                    }
                );

            }
        },
        {
            assert: async ({s_2}) => {
                // Not Ok: Use Source as PaymentMethod when it is not attached to a customer.
                await assert.rejects(async () => {
                    // Error: A source must be attached to a customer to be used as a `payment_method`
                    await stripe.paymentMethods.update(
                        s_2,
                        {metadata: {update: 'S2 U1 as a PaymentMethod.'}}
                    );
                });
            }
        },
        {
            events: [`charge.succeeded`],
            fn: async ({s_2}) => {
                // Invariant: Once a source is used (with/without a customer), it must be used the same way going forward.
                // - E.g.
                //      - Used with a customer first, used with a customer always.
                //      - Use without a customer first, used without a customer always.

                // Ok: [no-customer, no-customer, ...]

                const {id: ch_2} = await stripe.charges.create({
                    amount: 1200,
                    currency: 'usd',
                    // Assert: Can create a charge with no
                    // customer: c1,
                    source: s_2
                });

                return {
                    ids: {ch_2}
                }
            }
        },
        {
            assert: async ({c_1, s_2}) => {
                // Not Ok: [no-customer, customer, ...]
                await assert.rejects(async () => {
                    // Error: `The reusable source you provided is consumed because it was previously charged without being attached to a customer or was detached from a customer. To charge a reusable source multiple time you must attach it to a customer first.`
                    await stripe.charges.create({
                        amount: 1100,
                        currency: 'usd',
                        customer: c_1,
                        source: s_2,
                    });
                });
            }
        },
        {
            events: [`charge.succeeded`],
            fn: async ({c_1, s_1}) => {
                // Ok: [customer, customer, ...]
                // - `charge.succeeded`
                const {id: ch_1} = await stripe.charges.create({
                    amount: 1100,
                    currency: 'usd',
                    customer: c_1,
                    source: s_1,
                });

                return {
                    ids: {ch_1}
                }
            }
        },
        {
            assert: async ({s_1}) => {
                // Error: For security reasons, you cannot directly charge a source that is already attached to a customer. Please specify the customer this source is attached to (cus_IxsYQn4uTfdNHL) when charging it.s
                // Not Ok: [customer, no-customer, ...]
                await reject_1(stripe, s_1);
            }
        },
        {
            events: [`charge.updated`],
            fn: async ({ch_1}) => {
                await stripe.charges.update(ch_1, {
                    description: `CH1 U1`,
                    metadata: {
                        update: `CH1 U1`
                    }
                });
            }
        },
        {tag: "d"},
        {
            events: [
                `customer.updated`,
                `customer.source.deleted`,
                `payment_method.detached`
            ],
            fn: async ({c_1, s_1}) => {
                await stripe.customers.deleteSource(c_1, s_1);
            }
        },
        {
            events: [
                `customer.updated`,
                `customer.source.deleted`,
                `payment_method.detached`
            ],
            fn: async ({c_2, s_3}) => {
                await stripe.customers.deleteSource(c_2, s_3);
            }
        },
        {
            assert: async ({c_1, s_2}) => {
                await assert.rejects(async () => {
                    // error.code = resource_missing
                    await stripe.customers.deleteSource(c_1, s_2);

                    // Note: this source was used "and auto-deleted" when it was used in a charge with no customer.
                    // - It was never attached to customer, and sources can only be deleted with args (customerId, sourceId).
                });
            }
        },
        {
            events: [`customer.deleted`],
            fn: async ({c_1}) => {
                await stripe.customers.del(c_1);
            }
        },
        {
            events: [`customer.deleted`],
            fn: async ({c_2}) => {
                await stripe.customers.del(c_2);
            }
        }
    ];
}


export {
    get_timeline
}


