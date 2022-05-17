import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";
import _ from "lodash";
import {log} from "../../lib/util";


/**
 * This timeline:
 * - Adds/removes discounts from *inherited* objects to see which events fire.
 *      - Determines:
 *          - If the inherited FK `discount(s)` can be kept up to date with just events.
 *          - What data is inside the discount `customer.discount.deleted` event.
 *              - Can parent/inherited object be determined?
 *
 *
 * Results: See Excel file.
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
            events: [
                'invoiceitem.created',
                'invoiceitem.updated',
                'invoice.created',
                'customer.discount.created',
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
                'customer.discount.created',
                'customer.subscription.updated',
                'customer.discount.deleted',
                'customer.subscription.updated',
                'invoice.updated',
                'customer.discount.created',
                'invoice.updated',
                'customer.discount.deleted',
                'invoice.updated',
                'invoice.updated',
                'customer.discount.created',
                'invoiceitem.updated'
            ],
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


                // Create a draft invoice before discount is added to customer.
                let ii_1 = await stripe.invoiceItems.create({
                    customer: c_1,
                    amount: 1000,
                    currency: "GBP",
                    metadata: {tid: "ii_1"}
                });
                let i_1 = await stripe.invoices.create({
                    customer: c_1,
                    metadata: {tid: "i_1"}
                });

                // Discount owned by customer; will be inherted by sub, invoice and invoice item.
                const {discount: dc_customer_1} = await stripe.customers.update(c_1, {coupon: cp_1});


                // Create a draft invoice after discount is added.
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


                const sub_1_o = await stripe.subscriptions.retrieve(sub_1);
                // sub.discount is only for discounts owned by subscriptions.
                assert(sub_1_o.discount === null);

                let sub_2_o = await stripe.subscriptions.create({
                    customer: c_1,
                    items: [
                        {price: pr_1},
                    ],
                    default_payment_method: pm_1,
                    metadata: {
                        tid: "s_2"
                    }
                });

                // This is only for owned discounts (customer discount not inheirted here).
                assert(sub_2_o.discount === null);


                sub_2_o = await stripe.subscriptions.update(sub_2_o.id, {coupon: cp_3});
                // `discount` set only when owned.
                assert(sub_2_o.discount !== null);
                sub_2_o = await stripe.subscriptions.update(sub_2_o.id, {coupon: null});
                assert(sub_2_o.discount === null);


                // @ts-ignore
                const inv_s1 = await stripe.invoices.retrieve(sub_1_o.latest_invoice);
                // @ts-ignore
                const inv_s2 = await stripe.invoices.retrieve(sub_2_o.latest_invoice);

                // No discount inherited
                assert(inv_s1.discounts.length === 0);

                // Discount inherited from customer->sub->invoice
                // Note: `sub.discount` is for an owned discount, but `inv.discounts` is for both owned/inherited?
                assert(inv_s2.discounts.length === 1);
                const line_1 = inv_s2.lines.data[0];

                // No "owned" discounts for line item.
                assert(line_1.discounts.length === 0);

                // But inherited discount is shown in this list with the total amount applied to that line item.
                assert(line_1.discount_amounts.length === 1);


                // Discount inherited customer->invoice.
                // Note: It is not possible from just the non-expanded-discounts invoice object to determine if the discount is owned by the invoice (or inherited).
                assert(i_2.status === 'draft');
                assert(i_2.discounts.length === 1);

                // Note: `customer.discount.deleted` NOT triggered when removing inherited discount.
                // Q: What happens if one is owned, and one is inherited? Assumption: same logic, only triggered for owned.
                // Note: invoice line item is updated here (`discount_amounts`, but `invoiceitem.updated` is NOT triggered because  they are different types, `discount_amounts` is only for invoice-connected line items)
                i_2 = await stripe.invoices.update(i_2.id, {discounts: ""});


                // Note: `customer.discount.created|deleted` triggered when it is owned by invoice.
                // @ts-ignore
                i_2 = await stripe.invoices.update(i_2.id, {discounts: [{coupon: cp_3}]});
                i_2 = await stripe.invoices.update(i_2.id, {discounts: ""});


                ii_2 = await stripe.invoiceItems.update(ii_2.id, {discounts: [{coupon: cp_3}]});


                i_2 = await stripe.invoices.retrieve(i_2.id);
            }
        },


    ];
}

export {
    get_timeline
}