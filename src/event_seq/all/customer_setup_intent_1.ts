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
 * Assertions:
 * - A1.
 *      - When a SetupIntent has a customer, and that customer is deleted, what happens to:
 *          - A. The Intent.
 *          - B. The payment method.
 * - A2.
 *      - When a SetupIntent is deleted, what happens to the PaymentMethod?
 *      - Is the customer updated?
 *
 * - A3.
 *      - Does adding a PM to an Intent also add it to the customer?
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
                'setup_intent.created'
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


                const {id: si_1} = await stripe.setupIntents.create({
                    // customer: c1,
                    payment_method_types: ['card'],
                    // payment_method: pm
                    metadata: {tid: "si_1"}
                });


                // Assert: (Customer, PaymentMethod, SetupIntent) are not connected.
                return {ids: {c_1, pm_1, si_1}};
            }
        },
        {
            tag: "u"
        },
        {
            events: [
                'payment_method.attached',
                'setup_intent.succeeded'
            ],
            fn: async ({c_1, pm_1, si_1}) => {

                // @todo/next.
                // - Change the order of the connections.
                // - confirm + add payment_method at the same time.
                // - confirm failure, cancel.


                await assert_setup_intent_with_customer_requires_payment_method(stripe, si_1, c_1);

                // Assert:
                // - SetupIntent points to (Customer, PaymentMethod).
                //      - Customer points to PaymentMethod.
                //      - PaymentMethod points to Customer.


                // @todo/low `setup_intent.created` always before 'setup_intent.succeeded`?
                //      - What if it succeeds on creation?
                await stripe.setupIntents.update(si_1, {
                    customer: c_1,
                    payment_method: pm_1,
                });


                await stripe.setupIntents.confirm(
                    si_1,
                    // {payment_method: 'pm_card_visa'}
                );


                // @todo/low
                // Trigger non-null values for (single_use_mandate, madate, last_setup_error, latest_attempt)

            }
        },
        {
            tag: "d"
        },
        {
            events: [
                `customer.deleted`
            ],
            fn: async ({c_1, pm_1, si_1}) => {
                // Assert: edges no longer exist:
                // - Intent -> Customer.
                // - PaymentMethod -> Customer
                // Assert: Intent is unusable.

                await stripe.customers.del(c_1);


                // After the customer is deleted, the SI still points to the Customer, and it still exists.
                const si_after_c_del = await stripe.setupIntents.retrieve(si_1)
                assert.strictEqual(si_after_c_del.customer, c_1);

                await assert_setup_intent_cannot_be_deleted_or_cancelled_after_succeed(stripe, si_1);
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