import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";


import {getRandomCustomer} from "../../lib-app/data/level-0/customer";
import {getRandomSource} from "../../lib-app/data/level-0/source";
import _ from "lodash";

import {strict as assert} from "assert";


/**
 * When:
 * - Events deleted because of 30 day window:
 *      - customer created
 *      - payment method attached
 *      - customer deleted
 *
 * - Events remaining:
 *      - payment method updated
 *
 * - First download
 *      - Empty, as no customers (and cannot list payment method as it is a child of customer).
 *
 * - First apply events:
 *      - Cannot `skip.event_before_dl` for payment method, as there is no payment method row.
 *      - Assert: Does payment_method.updated get a write.c or a write.u.
 *          - Possible Issue: A write.u without a row will error.
 *
 */
const get_timeline = async (stripeSec) => {
    const stripe = getClientFromKeys(stripeSec);

    return [
        {
            tag: "a"
        },
        {
            events: [
                'customer.created',
                'payment_method.attached',
                'customer.deleted'
            ],
            fn: async () => {

                const {id: c_1} = await stripe.customers.create({
                    name: "C1 Test",
                    metadata: {tid: "c_1"}
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
                await stripe.paymentMethods.attach(
                    pm_1,
                    {customer: c_1}
                );

                // PM still exists but it cannot be discovered.
                await stripe.customers.del(c_1);

                return {ids: {c_1, pm_1}};
            }
        },
        {
            tag: "b"
        },
        {
            events: [
                'payment_method.updated',
            ],
            fn: async ({pm_1}) => {
                await stripe.paymentMethods.update(
                    pm_1,
                    {metadata: {update: 'pm_1 update 2'}}
                );

            }
        },
    ];

}

export {
    get_timeline
}