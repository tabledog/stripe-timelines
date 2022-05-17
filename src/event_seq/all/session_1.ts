import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";


const p1 = {
    type: "good",
    name: "P1 Milk chocolate",
    caption: "Chocolate",
    description: "Chocolate is an essential part of being human.",
    shippable: true
};

const card = {
    number: '4242424242424242',
    exp_month: 2,
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
                'customer.updated',
                'product.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created',
                'plan.created',
                'price.created'
            ],
            fn: async () => {
                const {id: c_1} = await stripe.customers.create({
                    name: "C1.customer_1 Test",
                    metadata: {tid: "c_1"}
                });

                // Avoid: Cannot charge a customer that has no active card
                const {id: pm_1} = await stripe.paymentMethods.create({
                    type: 'card',
                    card,
                    metadata: {tid: "pm_1"}
                });
                await stripe.paymentMethods.attach(pm_1, {customer: c_1});
                await stripe.customers.update(c_1, {invoice_settings: {default_payment_method: pm_1}});

                // @ts-ignore
                const {id: p_1} = await stripe.products.create(p1);

                const {id: pr_1} = await stripe.prices.create({
                    unit_amount: 2000,
                    currency: 'gbp',
                    // recurring: {interval: 'month'},  Error: The price specified is set to `type=recurring` but this field only accepts prices with `type=one_time`
                    product: p_1,
                    metadata: {
                        tid: "pr_1"
                    }
                });


                // Avoid: Error: You must provide at least one recurring price in `subscription` mode when using prices
                const line_items_2 = [];
                while (line_items_2.length <= 19) {
                    const id = line_items_2.length + 1;

                    const {id: pr_id} = await stripe.prices.create({
                        unit_amount: 2000,
                        currency: 'gbp',
                        recurring: {interval: 'month'},
                        product: p_1,
                        metadata: {
                            tid: `pr_2_${id}`
                        }
                    });

                    line_items_2.push({price: pr_id, quantity: id})

                }


                return {
                    ids: {
                        c_1,
                        pr_1,
                        line_items_2,
                        pm_1
                    }
                };
            }
        },
        {
            tag: "u"
        },
        {
            events: [
                'payment_intent.created',
                'payment_intent.created',
                'customer.updated',
                'payment_intent.created',
                'setup_intent.created'
            ],
            fn: async ({c_1, pr_1, p_1, line_items_2, pm_1}) => {
                /**
                 * Note: It is not possible to complete a checkout without a web browser.
                 *      - These tests only create PaymentIntent.status=requires_payment_method.
                 *
                 * - To test the checkout process in dev without hosting anything:
                 *      - https://dashboard.stripe.com/settings/checkout -> Enable client only integration
                 *      - Price list, 3 dots, get checkout HTML.
                 *      - Paste into HTML file, open, complete checkout.
                 *          - This will generate the `checkout.session.completed` event.
                 */

                const success_url = `https://example.com/success`;
                const cancel_url = `https://example.com/cancel`;


                // Docs: For payment mode, there is a maximum of 100 line items.
                // Docs: For subscription mode, there is a maximum of 20 line items.
                let line_items = Array.from(Array(99).keys()).map((x, i) => {
                    return {price: pr_1, quantity: i + 1}
                });


                // Checkout with no customer.
                // Creates a payment_intent in with status==requires_payment_method.
                const se_1_o = await stripe.checkout.sessions.create({
                    // customer: c_1,
                    success_url,
                    cancel_url,
                    payment_method_types: ['card'],
                    line_items,
                    mode: 'payment',
                    metadata: {tid: "se_1"}
                });
                // PaymentIntent.status=requires_payment_method.


                const se_2_o = await stripe.checkout.sessions.create({
                    customer: c_1,
                    mode: 'payment',
                    payment_method_types: ['card'],
                    line_items,
                    success_url,
                    cancel_url,
                    metadata: {tid: "se_2"}
                });
                // PaymentIntent.status=requires_payment_method.


                const address = {
                    city: "London",
                    country: "GB",
                    line1: "1 The Lane"
                };

                // Docs: A valid billing address is required for Checkout to prefill the customer’s card details.
                await stripe.customers.update(c_1, {
                    address,
                    // @ts-ignore
                    shipping: {
                        name: "Batman's backup hideout",
                        address
                    }
                });


                const se_3_o = await stripe.checkout.sessions.create({
                    customer: c_1,
                    mode: 'payment',
                    payment_method_types: ['card'],
                    line_items,
                    success_url,
                    cancel_url,
                    metadata: {tid: "se_3"}
                });
                // PaymentIntent.status=requires_payment_method.


                //  Error: Some of the parameters you provided (payment_method) cannot be used when modifying a PaymentIntent that was created by Checkout
                // @ts-ignore
                // await stripe.paymentIntents.update(se_1_o.payment_intent, {payment_method: pm_1});


                const {id: se_4} = await stripe.checkout.sessions.create({
                    customer: c_1,
                    mode: 'subscription',
                    payment_method_types: ['card'],
                    line_items: line_items_2,
                    success_url,
                    cancel_url,
                    metadata: {tid: "se_4"}
                });
                // PaymentIntent.status=requires_payment_method.



                const {id: se_5} = await stripe.checkout.sessions.create({
                    customer: c_1,
                    mode: 'setup',
                    payment_method_types: ['card'],
                    // line_items: [
                    //     {price: pr_1, quantity: 1}
                    // ],
                    success_url,
                    cancel_url,
                    metadata: {tid: "se_5"}
                });

                // @todo/low Docs: For session.customer: You can set `payment_intent_data.setup_future_usage` to have Checkout automatically attach the payment method to the Customer you pass in for future reuse.

            }
        },
        {
            tag: "d"
        },
        {
            events: [],
            fn: async ({i_1}) => {

            }
        }
    ];

}

export {
    get_timeline
}