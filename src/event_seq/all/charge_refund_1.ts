import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";

const card = {
    number: '4242424242424242',
    exp_month: 2,
    exp_year: 2025,
    cvc: '314',
};


/**
 * Refunds are children of Charges, and have no create event.
 * - Assert: [ch.u, re.u ch.u], the re.u event is skipped as the last ch.u is a parent write.
 * - Assert: Many refunds updates for the same refund only writes the last one.
 */
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
                'charge.succeeded',
                'payment_intent.succeeded'
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

                const {id: pi_1} = await stripe.paymentIntents.create({
                    amount: 2000,
                    currency: "gbp",
                    customer: c_1,
                    payment_method_types: ['card'],
                    payment_method: pm_1,
                    metadata: {tid: "pi_2"}
                });

                await stripe.paymentIntents.confirm(pi_1);

                return {ids: {c_1, pi_1}};
            }
        },
        {
            tag: "u"
        },
        {
            events: [
                'charge.refunded',
                'charge.refunded',
                'charge.refund.updated',
                'charge.refund.updated',
                'charge.refund.updated',

            ],
            fn: async ({pi_1}) => {
                await stripe.paymentIntents.update(pi_1, {metadata: {update: 1}});


                const {id: r_1} = await stripe.refunds.create({
                    payment_intent: pi_1,
                    amount: 100,
                    metadata: {
                        tid: "r_1"
                    }
                });

                await stripe.paymentIntents.update(pi_1, {metadata: {update: 2}});

                const {id: r_2} = await stripe.refunds.create({
                    payment_intent: pi_1,
                    amount: 200,
                    metadata: {
                        tid: "r_2"
                    }
                });

                await stripe.refunds.update(r_2, {metadata: {update: 1}});
                await stripe.refunds.update(r_2, {metadata: {update: 2}});
                await stripe.refunds.update(r_2, {metadata: {update: 3}});

                // Refund updates are now included in the Charge attached to this PI.
                // - The charge is a parent of the refund, and the write comes after the refund updates, so ignore the TD updates and just write the final up-to-date charge.

                // No update events for paymentIntents.
                await stripe.paymentIntents.update(pi_1, {metadata: {update: 1}});

                return {ids: {r_1, r_2}};
            }
        },
        {
            tag: "d"
        },
        {
            events: [
                'charge.updated',
                `customer.deleted`
            ],
            fn: async ({c_1, pi_1, r_2}) => {

                const {charges} = await stripe.paymentIntents.retrieve(pi_1);

                // Assert: latest child refund update is in parent charge.
                assert(charges.data.length === 1);
                const [c1] = charges.data;
                const r_2_2 = c1.refunds.data[0];
                assert.equal(r_2, r_2_2.id);
                assert.equal(r_2_2.metadata.update, '3');

                await stripe.charges.update(c1.id, {metadata: {update: 1}});


                await stripe.customers.del(c_1);
                // Cannot delete payment_intent, charges or refunds.
            }
        }
    ];

}

export {
    get_timeline
}