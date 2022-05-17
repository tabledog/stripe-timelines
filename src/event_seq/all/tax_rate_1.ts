import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";


/**
 * Note: tax *rates* are different from tax *ids*.
 * - ids are a customers unique tax id for a region.
 * - rates are generally applicable rates (applied to invoices, subscriptions, sessions).
 *
 * This timeline tests both.
 */


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
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'tax_rate.created',
                'customer.created',
                'customer.tax_id.created',
                'customer.tax_id.created',
                'customer.tax_id.created',
                'customer.tax_id.created',
                'payment_method.attached',
                'product.created',
                'plan.created',
                'price.created',
                'price.created',
                'customer.updated',
                'invoiceitem.created',
                'invoiceitem.updated',
                'invoice.created',
                'payment_intent.created',
                'charge.succeeded',
                'payment_intent.succeeded',
                'invoice.created',
                'invoice.finalized',
                'invoice.paid',
                'invoice.payment_succeeded',
                'customer.subscription.created',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'payment_intent.created'
            ],
            fn: async () => {

                // Create rates.
                const {id: tr_1} = await stripe.taxRates.create({
                    display_name: 'TAX 1',
                    description: 'TAX 1 DESC',
                    jurisdiction: 'DE',
                    // @ts-ignore
                    country: 'DE',
                    percentage: 10,
                    inclusive: false,
                    metadata: {tid: "tr_1"}
                });
                const {id: tr_2} = await stripe.taxRates.create({
                    display_name: 'TAX 2',
                    description: 'TAX 2 DESC',
                    jurisdiction: 'FI',
                    // @ts-ignore
                    country: 'FI',
                    percentage: 20,
                    inclusive: false,
                    metadata: {tid: "tr_2"}
                });
                const {id: tr_3} = await stripe.taxRates.create({
                    display_name: 'TAX 3',
                    description: 'TAX 3 DESC',
                    jurisdiction: 'GD',
                    // @ts-ignore
                    country: 'GD',
                    percentage: 30,
                    inclusive: true,
                    metadata: {tid: "tr_3"}
                });

                const {id: tr_4} = await stripe.taxRates.create({
                    display_name: 'TAX 4',
                    description: 'TAX 4 DESC',
                    jurisdiction: 'US',
                    // @ts-ignore
                    country: 'US',
                    // @ts-ignore
                    state: "AL",
                    percentage: 40,
                    inclusive: true,
                    metadata: {tid: "tr_4"}
                });
                const {id: tr_5} = await stripe.taxRates.create({
                    display_name: 'TAX 5',
                    description: 'TAX 5 DESC',
                    jurisdiction: 'ZA',
                    // @ts-ignore
                    country: 'ZA',
                    percentage: 50,
                    inclusive: true,
                    metadata: {tid: "tr_5"}
                });


                const tax_rates_15 = [];
                for (let i = 6; i < 20; i++) {
                    const {id} = await stripe.taxRates.create({
                        display_name: `TAX ${i}`,
                        description: `TAX ${i} DESC`,
                        jurisdiction: 'US',
                        // @ts-ignore
                        country: 'US',
                        // @ts-ignore
                        state: "AL",
                        percentage: i,
                        inclusive: true,
                        metadata: {tid: `tr_${i}`}
                    });
                    tax_rates_15.push(id);
                }


                // @ts-ignore
                const {id: c_1} = await stripe.customers.create({
                    name: "C1.customer_1 Test",
                    // Error: Array tax_id_data exceeded maximum 5 allowed elements.
                    tax_id_data: Array(4).fill(null).map((value, i) => ({
                        type: 'eu_vat',
                        value: `DE12345678${i}`
                    })),
                    metadata: {tid: "c_1"}
                });


                // Customer must have a payment method to create a subscription.
                const {id: pm_1} = await stripe.paymentMethods.create({
                    type: 'card',
                    card,
                    metadata: {tid: "pm_1"}
                });

                await stripe.paymentMethods.attach(pm_1, {customer: c_1});

                // @ts-ignore
                const {id: p_1} = await stripe.products.create(p1);


                const {id: pr_1} = await stripe.prices.create({
                    unit_amount: 2000,
                    currency: 'gbp',
                    recurring: {interval: 'month'},
                    product: p_1,
                    metadata: {
                        tid: "pr_1"
                    }
                });

                const {id: pr_2} = await stripe.prices.create({
                    unit_amount: 2000,
                    currency: 'gbp',
                    // recurring: {interval: 'month'},
                    product: p_1,
                    metadata: {
                        tid: "pr_1"
                    }
                });


                const {id: ii_1} = await stripe.invoiceItems.create({
                    customer: c_1,
                    price: pr_2,
                    // Avoid: Error: You cannot apply more than 10 tax rates here.
                    tax_rates: tax_rates_15.slice(0, 10),
                    metadata: {tid: "ii_1"}
                });


                const {id: i_1} = await stripe.invoices.create({
                    customer: c_1,
                    // Avoid: Error: You cannot apply more than 10 tax rates here.
                    default_tax_rates: [tr_1, tr_2],
                    metadata: {tid: "i_1"}
                    // @todo/low account_tax_ids, added in 2020-08-27
                });


                const s_1_o = await stripe.subscriptions.create({
                    customer: c_1,
                    items: [
                        {price: pr_1},
                    ],
                    default_payment_method: pm_1,
                    default_tax_rates: [tr_1, tr_2],
                    metadata: {tid: "s_1"}
                });


                // @ts-ignore
                await stripe.subscriptionItems.update(s_1_o.items.data[0].id, {tax_rates: [tr_3, tr_4]});


                const success_url = `https://example.com/success`;
                const cancel_url = `https://example.com/cancel`;

                // @todo/low When support for dl/event processing of sessions is added, ensure tax_rates are visible.
                const se_1_o = await stripe.checkout.sessions.create({
                    customer: c_1,
                    success_url,
                    cancel_url,
                    line_items: [
                        {
                            price: pr_2,
                            quantity: 1,
                            tax_rates: [tr_1, tr_2]
                        }
                    ],
                    payment_method_types: ['card'],
                    mode: 'payment',
                    metadata: {tid: "se_1"}
                });


                // @todo/low subscription schedule phases.default_tax_rates.
                // @todo/low credit note

                return {
                    ids: {
                        c_1,
                        i_1,
                        s_1: s_1_o.id,
                        tr_1,
                        tr_2,
                        tax_rates_15
                    }
                }
            }
        },
        {
            tag: "u"
        },
        {
            events: [
                'tax_rate.updated',
                'tax_rate.updated',
                'tax_rate.updated',
                'customer.tax_id.created',
                'customer.subscription.updated',
                'invoice.updated'
            ],
            fn: async ({c_1, s_1, i_1, tr_1, tr_2, tax_rates_15}) => {

                await stripe.taxRates.update(tr_1, {active: false});
                await stripe.taxRates.update(tr_1, {active: true});


                // Assert: Does not re-compute totals as `active` means "do not allow attachment to new items".
                // - Inactive tax rates cannot be used with new applications or Checkout Sessions, but will still work for subscriptions and invoices that already have it set.
                await stripe.taxRates.update(tax_rates_15[0], {active: false});


                // Note: Cannot update a tax_id.
                const {id: tax_id_1} = await stripe.customers.createTaxId(c_1, {type: 'eu_vat', value: 'DE123456789'});


                // @ts-ignore
                await stripe.subscriptions.update(s_1, {default_tax_rates: ""});
                // @ts-ignore
                await stripe.invoices.update(i_1, {default_tax_rates: ""});


                return {
                    ids: {
                        tax_id_1
                    }
                }
            }
        },
        {
            tag: "d"
        },
        {
            events: [
                'customer.tax_id.deleted',
                'customer.subscription.deleted',
                'invoiceitem.deleted',
                'invoiceitem.deleted'
            ],
            fn: async ({c_1, s_1, i_1, tax_id_1}) => {
                // Assert: editing a customers tax ids keeps tax_ids.customer FK up to date.
                await stripe.customers.deleteTaxId(c_1, tax_id_1);


                // Assert: a tax id cannot be moved to another customer (so does not need an upsert in customer.insert_tree at dl time).
                await stripe.subscriptions.del(s_1);
            }
        },

        {
            events: [
                'invoice.deleted',
                'invoiceitem.deleted',
            ],
            fn: async ({c_1, s_1, i_1, tax_id_1}) => {

                await stripe.invoices.del(i_1);
            }
        },


        {
            events: [
                "customer.tax_id.updated",
                "customer.deleted",
                "customer.tax_id.updated",
                "customer.tax_id.updated",
                "customer.tax_id.updated"
            ],
            fn: async ({c_1, s_1, i_1, tax_id_1}) => {

                // Assert: tax_ids.customer FK updated?
                await stripe.customers.del(c_1);
            }
        },


    ];

}

export {
    get_timeline
}