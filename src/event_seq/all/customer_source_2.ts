import _ from "lodash";
import {strict as assert} from "assert";
import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import * as cards from "./../../data/cards";

import {getRandomCustomer} from "../../lib-app/data/level-0/customer";
import {getRandomSource} from "../../lib-app/data/level-0/source";


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

const get_timeline = async (stripeSec) => {
    const stripe = getClientFromKeys(stripeSec);

    return [
        {
            tag: "c"
        },
        {
            events: [
                'customer.created',
            ],
            fn: async () => {
                const {id: c_1} = await stripe.customers.create({
                    name: "C1 Source Test",
                    // source: "",
                    metadata: {
                        tid: "c_1"
                    }
                });

                return {ids: {c_1}};
            }
        },
        {
            events: [
                'source.chargeable',
            ],
            fn: async () => {
                const {id: s_1} = await stripe.sources.create({
                    ...s1_create,
                    metadata: {
                        tid: "s_1"
                    }
                });

                return {ids: {s_1}};
            }
        },
        {
            events: [
                'customer.updated',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'payment_method.attached',
                'customer.source.created',
                'customer.source.created',
                'customer.source.updated',
                'customer.source.updated'
            ],
            fn: async ({c_1, s_1}) => {
                await stripe.customers.createSource(c_1, {source: s_1});


                // Assert: When > 10 sources, ensure the extra ones are downloaded, and are applied as events.
                // Assert: When customer.default_source is a (card, bank, source), each owner row exists in each table.

                const tokens = [
                    ...cards.tokens.basic,
                    ...cards.tokens.americas,
                    ...cards.tokens.asia
                ];

                assert(tokens.length > 10);

                for (const t of tokens) {
                    await stripe.customers.createSource(c_1, {source: t});
                }

                // Bank account.
                // Error: No such token: 'btok_1IsDZv2eZvKYlo2CK2CbXCns' (even though it is listed in docs).
                const {id: ba_1} = await stripe.customers.createSource(c_1, {
                    // @ts-ignore
                    source: {
                        "object": "bank_account",
                        "country": "US",
                        "currency": "usd",
                        "account_number": "000123456789",
                        "account_holder_name": "Jenny Rosen",
                        "account_holder_type": "individual",
                        "routing_number": "110000000",
                        "metadata": {},
                    }
                });

                await stripe.customers.updateSource(c_1, ba_1, {metadata: {update: '1'}});
                await stripe.customers.verifySource(c_1, ba_1, {amounts: [32, 45]});

                return {ids: {ba_1}};
            }
        },


        {
            tag: "u"
        },
        {
            events: [
                `customer.created`,
                'customer.updated'
            ],
            fn: async ({c_1, ba_1}) => {
                // Create an event to avoid tagging the same eventId with both u and d.
                const {id: c_2} = await stripe.customers.create({
                    name: "C2 Source Test",
                    // source: "",
                    metadata: {
                        tid: "c_2"
                    }
                });

                // Assert: Join from `customers.default_source, bank_accounts.id` is valid (this is a polymorphic OR join, could also join cards or sources depending on ID prefix).
                await stripe.customers.update(c_1, {default_source: ba_1});
            }
        },
        {
            tag: "d"
        },
        {
            events: [`customer.deleted`],
            fn: async ({c_1}) => {
                /**
                 * Issue:
                 *
                 * - When a customer is deleted with a source attached:
                 *      - `source.status` changes from `chargeable` -> `consumed`, `customer=null`.
                 *          - But *no events are triggered* (as all the events are customer.source.x).
                 *          - This means it is not possible to keep that source up to date with just the event stream.
                 *      - Fix: Ignore for the moment.
                 *          - I do not think this issue exists with the newer PaymentMethods, as the state is managed via Intents which have 1:1 events (instead of via parent Customer).
                 *
                 *  - @todo/next Does the same thing apply to customer->payment_methods?
                 */


                await stripe.customers.del(c_1);
            }
        }
    ];

}

export {
    get_timeline
}