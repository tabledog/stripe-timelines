import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";


import {getRandomCustomer} from "../../lib-app/data/level-0/customer";
import {getRandomSource} from "../../lib-app/data/level-0/source";
import _ from "lodash";

import {strict as assert} from "assert";


const assert_no_update_unattached_pm = async (stripe, pm) => {
    await assert.rejects(async () => {
        //  Error: You must save this PaymentMethod to a customer before you can update it.
        await stripe.paymentMethods.update(
            pm,
            {metadata: {update: 'pm_1 update 1'}}
        );
    });
};


const assert_pm_cannot_be_used_again = async (stripe, pm) => {
    await assert.rejects(async () => {
        // Error: `The provided PaymentMethod was previously used with a PaymentIntent without Customer attachment, shared with a connected account without Customer attachment, or was detached from a Customer. It may not be used again. To use a PaymentMethod multiple times, you must attach it to a Customer first.`
        const {id: si_1} = await stripe.setupIntents.create({
            // customer: c1,
            // payment_method_types: ['card'],
            payment_method: pm
        });
    });
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
                'customer.created'
            ],
            fn: async () => {

                const {id: c_1} = await stripe.customers.create({
                    name: "C1 Test",
                    metadata: {tid: "c_1"}
                });

                const {id: c_2} = await stripe.customers.create({
                    name: "C2 Test",
                    metadata: {tid: "c_2"}
                });

                const {id: pm_1} = await stripe.paymentMethods.create({
                    type: 'card',
                    card: {
                        number: '4242424242424242',
                        exp_month: 2,
                        exp_year: 2025,
                        cvc: '314',
                    },
                    metadata: {tid: "pm_1"}
                });

                await assert_no_update_unattached_pm(stripe, pm_1);

                const {id: pm_2} = await stripe.paymentMethods.create({
                    type: 'card',
                    card: {
                        number: '4242424242424242',
                        exp_month: 2,
                        exp_year: 2025,
                        cvc: '314',
                    },
                    metadata: {tid: "pm_2"}
                });

                console.log({pm_1, pm_2});


                return {ids: {c_1, c_2, pm_1, pm_2}};
            }
        },
        {
            tag: "u"
        },
        {
            events: [
                'payment_method.attached',
                'payment_method.updated',
                'payment_method.attached'
            ],
            fn: async ({c_1, c_2, pm_1, pm_2}) => {
                await stripe.paymentMethods.attach(
                    pm_1,
                    {customer: c_1}
                );


                await stripe.paymentMethods.update(
                    pm_1,
                    {metadata: {update: 'pm_1 update 2'}}
                );


                await stripe.paymentMethods.attach(
                    pm_2,
                    {customer: c_2}
                );
            }
        },
        {
            tag: "d"
        },
        {
            events: [
                'payment_method.detached',
                'customer.deleted',
                'customer.deleted',
                'payment_method.updated'
            ],
            fn: async ({c_1, c_2, pm_1, pm_2}) => {

                await stripe.paymentMethods.detach(pm_1);
                await stripe.customers.del(c_1);


                const pm_2_before = await stripe.paymentMethods.retrieve(pm_2);

                // Assert: PM is *not detached*, leaving the PM permanently in the DB.
                await stripe.customers.del(c_2);


                // Assert: Even though the customer is deleted:
                // - The `payment_method.customer` key is still set (it still looks "attached") (which differs from Source's with a deleted customer).
                // - There is no status=chargeable/consumed transition like a Source that has its customer deleted.
                //      - @todo/low test this transition occurs in Intents (when a customer is deleted is the intent unusable?)
                const pm_2_after = await stripe.paymentMethods.retrieve(pm_2);
                assert.deepStrictEqual(pm_2_before, pm_2_after);

                // Assert: PM can be updated with no active customer (but a payment method not attached to a customer cannot be updated).
                await stripe.paymentMethods.update(pm_2,
                    {
                        billing_details: {email: "assert-fails@example.com"},
                        metadata: {update_1: 'pm_2 update_1'}
                    }
                );


                await assert_pm_cannot_be_used_again(stripe, pm_2);
            }
        }
    ];

}

export {
    get_timeline
}