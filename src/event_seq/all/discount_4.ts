import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";
import _ from "lodash";
import {log} from "../../lib/util";


/**
 * This timeline:
 * - Deletes parent/owned objects to see which events trigger.
 *      - Is `customer.discount.x` triggered in those cases?
 */


const card = {
    number: '4242424242424242',
    exp_month: 2,
    exp_year: 2025,
    cvc: '314',
};

const p1 = {
    type: "good",
    name: "P1 Milk chocolate",
    caption: "Chocolate",
    description: "Chocolate is an essential part of being human.",
    shippable: true
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
                'product.created',
                'plan.created',
                'price.created',
                'coupon.created',
                'coupon.created',
                'coupon.created',
                'coupon.created',
                'payment_intent.created',
                'charge.succeeded',
                'payment_intent.succeeded',
                'customer.updated',
                'invoice.created',
                'invoice.finalized',
                'invoice.paid',
                'invoice.payment_succeeded',
                'customer.subscription.created'
            ],
            fn: async () => {

                const {id: c_1} = await stripe.customers.create({
                    name: "c_1 Test",
                    metadata: {tid: "c_1"},
                });

                // Customer must have a payment method to create a subscription.
                const {id: pm_1} = await stripe.paymentMethods.create({
                    type: 'card',
                    card,
                    metadata: {tid: "pm_1"}
                });

                await stripe.paymentMethods.attach(pm_1, {customer: c_1});

                // Avoid: Error: Cannot charge a customer that has no active card
                // - When: Updating a invoice item.
                await stripe.customers.update(c_1, {invoice_settings: {default_payment_method: pm_1}});


                // @ts-ignore
                const {id: p_1} = await stripe.products.create(p1);

                const {id: pr_1} = await stripe.prices.create({
                    unit_amount: 20000,
                    currency: 'gbp',
                    recurring: {interval: 'month'},

                    // @todo/next Can this be listed in the download?
                    product_data: {
                        // active: true,
                        // id: "",
                        name: "Inline Product",
                        statement_descriptor: "Inline Product",
                        unit_label: "u_lbl",
                        metadata: {
                            tid: "p_3"
                        },
                    },
                    metadata: {
                        tid: "pr_1"
                    }
                });


                // Percent
                const {id: cp_1} = await stripe.coupons.create({
                    name: "cp_1",
                    percent_off: 10,
                    duration: 'repeating',
                    duration_in_months: 3,
                    metadata: {tid: "cp_1"}
                });
                // Percent
                const {id: cp_2} = await stripe.coupons.create({
                    name: "cp_2",
                    percent_off: 20,
                    duration: 'repeating',
                    duration_in_months: 3,
                    metadata: {tid: "cp_2"}
                });

                // Avoid: Error: Coupon AYkCM3vU has `duration=repeating` and cannot be applied to one-time objects. (invoice item).
                const {id: cp_3} = await stripe.coupons.create({
                    name: "cp_3",
                    percent_off: 30,
                    duration: 'forever',
                    metadata: {tid: "cp_3"}
                });
                const {id: cp_4} = await stripe.coupons.create({
                    name: "cp_4",
                    percent_off: 30,
                    duration: 'forever',
                    metadata: {tid: "cp_4"}
                });

                // Creates invoice and tries to settle it immediately.
                const sub_1 = await stripe.subscriptions.create({
                    customer: c_1,
                    items: [
                        {price: pr_1},
                    ],
                    default_payment_method: pm_1,
                    metadata: {
                        tid: "s_1"
                    }
                });


                return {
                    ids: {
                        c_1,
                        cp_1,
                        cp_2,
                        cp_3,
                        cp_4,
                        sub_1: sub_1.id,
                        pr_1,
                        pm_1
                    }
                }

            }
        },
        {
            events: [],
            fn: async (ids) => {
                const {
                    c_1,
                    cp_1,
                    cp_3,
                    sub_1,
                    pr_1,
                    pm_1
                } = ids;

                // Customer
                const {discount: dc_customer_1} = await stripe.customers.update(c_1, {coupon: cp_1});


                let ii_2 = await stripe.invoiceItems.create({
                    customer: c_1,
                    amount: 1000,
                    currency: "GBP",
                    metadata: {tid: "ii_1"}
                });

                let i_2 = await stripe.invoices.create({
                    customer: c_1,
                    metadata: {tid: "i_1"}
                });

                // `customer.discount.deleted` NOT triggered.
                await stripe.customers.del(c_1);


                i_2 = await stripe.invoices.retrieve(i_2.id);
                // Discount still exists on invoice even though:
                // - It is owned by the customer, which was deleted.
                assert(i_2.discounts.length === 1);
                log({i_2});


                // Remove and re-add the same discount id (owned by deleted customer).
                // Note: Only `invoice.updated` triggered, no `customer.discount.deleted` (it seems ok to SQL update customer.discount on this event if discount owned by the customer).
                i_2 = await stripe.invoices.update(i_2.id, {discounts: ""});
                // @ts-ignore
                i_2 = await stripe.invoices.update(i_2.id, {discounts: [{discount: dc_customer_1.id}]});

            }
        },


    ];
}

export {
    get_timeline
}