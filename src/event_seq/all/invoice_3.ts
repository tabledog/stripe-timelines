import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";
import {log} from "../../lib/util";


/**
 * This timeline tests moving invoice(s) between different states.
 */


const p1 = {
    type: "good",
    name: "P1 Milk chocolate",
    caption: "Chocolate",
    description: "Chocolate is an essential part of being human.",
    shippable: true
};


const p2 = {
    type: "service",
    name: "S1 Trolly return service.",
    description: "Leave your trolly where it may land, and our highly trained stuff will return it back to the bay.",
    statement_descriptor: "Trolley return.",
};


const p3 = {
    type: "good",
    name: "P3 Big'ol Bag'a Rice",
    caption: "Rice",
    description: "You need rice, we got rice.",
    shippable: true
};


const card = {
    number: '4242424242424242',
    exp_month: 2,
    exp_year: 2025,
    cvc: '314',
};

// Note:
// - The difference between "line items" and "invoice line items":
//      - "line items" are promises for "invoice line items".
//          - On the next invoice, add these line items, converting them to "invoice line items".

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
                'coupon.created',
                'coupon.created',
                'product.created',
                'product.created',
                'product.created',
                'price.created',
                'product.created',
                'price.created'
            ],
            fn: async () => {
                const {id: c_1} = await stripe.customers.create({
                    name: "C1.customer_1 Test",


                    // Avoid: Error: Missing email. In order to create invoices that are sent to the customer, the customer must have a valid email.
                    email: "cust_c_1@example.com",

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


                const {id: cp_1} = await stripe.coupons.create({
                    name: "cp_1",
                    percent_off: 10,
                    duration: "once",
                    metadata: {tid: "cp_1"}
                });
                const {id: cp_2} = await stripe.coupons.create({
                    name: "cp_2",
                    percent_off: 20,
                    duration: "once",
                    metadata: {tid: "cp_2"}
                });


                // No invoices with 0 line items.
                await assert.rejects(async () => {
                    // Error: Nothing to invoice for customer
                    await stripe.invoices.create({
                        customer: c_1,
                        metadata: {tid: "i_1"}
                    });
                });


                // @ts-ignore
                const {id: p_1} = await stripe.products.create(p1);
                // @ts-ignore
                const {id: p_2} = await stripe.products.create(p2);

                // @ts-ignore
                const {id: p_3} = await stripe.products.create(p3);


                const {id: pr_1} = await stripe.prices.create({
                    unit_amount: 2000,
                    currency: 'gbp',
                    // recurring: {interval: 'month'},  Error: The price specified is set to `type=recurring` but this field only accepts prices with `type=one_time`
                    product: p_1,
                    metadata: {
                        tid: "pr_1"
                    }
                });

                const {id: pr_2} = await stripe.prices.create({
                    unit_amount: 2000,
                    currency: 'gbp',
                    // recurring: {interval: 'month'},

                    // @todo/next Can this be listed in the download?
                    product_data: {
                        // active: true,
                        // id: "",
                        name: "Inline Product",
                        statement_descriptor: "Inline Product",
                        unit_label: "u_lbl",
                        metadata: {tid: "p_3"},
                    },
                    metadata: {tid: "pr_2"}
                });


                return {
                    ids: {
                        pr_1,
                        c_1,
                        cp_1,
                        cp_2
                    }
                };
            }
        },

        {
            tag: "u"
        },
        {
            events: [
                "customer.updated",
                "invoiceitem.created",
                "invoiceitem.updated",
                "customer.discount.created",
                "customer.discount.created",
                "invoice.created",
                "customer.discount.deleted",
                "customer.discount.deleted",
                "payment_intent.created",
                "invoice.updated",
                "invoice.finalized",
                "invoice.updated",
                "invoice.voided",
                "payment_intent.canceled",
                "invoiceitem.created",
                "invoiceitem.updated",
                "customer.discount.created",
                "customer.discount.created",
                "invoice.created",
                "customer.discount.deleted",
                "customer.discount.deleted",
                "payment_intent.created",
                "invoice.updated",
                "invoice.finalized",
                "invoice.updated",
                "invoice.marked_uncollectible",
                "invoiceitem.created",
                "invoiceitem.updated",
                "customer.discount.created",
                "customer.discount.created",
                "invoice.created",
                "invoiceitem.created",
                "invoice.updated",
                "customer.discount.deleted",
                "customer.discount.deleted",
                "payment_intent.created",
                "charge.succeeded",
                "payment_intent.succeeded",
                "invoice.updated",
                "invoice.paid",
                "invoice.payment_succeeded",
                "invoice.finalized",
                "invoice.sent"
            ],
            fn: async (ids) => {
                const {
                    c_1,
                    cp_1,
                    cp_2,
                    pr_1
                } = ids;

                await stripe.invoiceItems.create({
                    customer: c_1,
                    price: pr_1,
                    metadata: {tid: `ii_1`}
                });
                const {id: i_1} = await stripe.invoices.create({
                    customer: c_1,
                    discounts: [
                        {coupon: cp_1},
                        {coupon: cp_2},
                    ]
                });

                await stripe.invoices.finalizeInvoice(i_1);
                // Can only be applied to finalized invoices, like delete but keeps a paper trail.
                await stripe.invoices.voidInvoice(i_1);


                await stripe.invoiceItems.create({
                    customer: c_1,
                    price: pr_1,
                    metadata: {tid: `ii_2`}
                });
                const {id: i_2} = await stripe.invoices.create({
                    customer: c_1,
                    discounts: [
                        {coupon: cp_1},
                        {coupon: cp_2},
                    ]
                });

                await stripe.invoices.finalizeInvoice(i_2);

                // Write off an invoice (debt was not collected).
                await stripe.invoices.markUncollectible(i_2);


                await stripe.invoiceItems.create({
                    customer: c_1,
                    price: pr_1,
                    metadata: {tid: `ii_3`}
                });
                const {id: i_3} = await stripe.invoices.create({
                    customer: c_1,
                    discounts: [
                        {coupon: cp_1},
                        {coupon: cp_2},
                    ],
                    collection_method: "send_invoice",
                    days_until_due: 99
                });
                await stripe.invoiceItems.create({
                    customer: c_1,
                    price: pr_1,
                    invoice: i_3,
                    metadata: {tid: `ii_4`}
                });


                // await stripe.invoices.finalizeInvoice(i_3);
                await stripe.invoices.pay(i_3); // Will finalize first.
                await stripe.invoices.sendInvoice(i_3);


                return {
                    ids: {
                        i_1,
                        i_2,
                        i_3
                    }
                };
            }
        },
        {
            tag: "d"
        },
        {
            events: [],
            fn: async ({i_1, i_2, i_3}) => {

                await assert.rejects(async () => {
                    // Error: You can only delete draft invoices.
                    await stripe.invoices.del(i_1);
                });
                await assert.rejects(async () => {
                    // Error: You can only delete draft invoices.
                    await stripe.invoices.del(i_2);
                });
                await assert.rejects(async () => {
                    // Error: You can only delete draft invoices.
                    await stripe.invoices.del(i_3);
                });


                return {
                    ids: {}
                };
            }
        },
    ];

}

export {
    get_timeline
}