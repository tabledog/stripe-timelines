import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";
import {log} from "../../lib/util";


/**
 * This timeline tests the simplest invoice writes.
 * - Focuses on invoiceitem -> invoice line item interaction.
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
                'coupon.created',
                'product.created',
                'product.created',
                'product.created',
                'price.created',
                'product.created',
                'price.created',
                'customer.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'invoiceitem.created'
            ],
            fn: async () => {
                const {id: c_1} = await stripe.customers.create({
                    name: "C1.customer_1 Test",
                    metadata: {tid: "c_1"}
                });


                const {id: cp_1} = await stripe.coupons.create({
                    name: "cp_1",
                    percent_off: 10,
                    duration: "once",
                    metadata: {tid: "cp_1"}
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


                const {id: ii_1} = await stripe.invoiceItems.create({
                    customer: c_1,
                    price: pr_1,
                    metadata: {tid: "ii_1"}
                });
                const {id: ii_2} = await stripe.invoiceItems.create({
                    customer: c_1,
                    price: pr_2,
                    metadata: {tid: "ii_2"}
                });
                const {id: ii_3} = await stripe.invoiceItems.create({
                    customer: c_1,
                    price: pr_2,
                    metadata: {tid: "ii_3"}
                });


                return {
                    ids: {
                        c_1,
                        cp_1,
                        ii_1,
                        ii_2,
                        ii_3
                    }
                };
            }
        },

        {
            tag: "u"
        },
        {
            events: [
                'invoiceitem.updated',
                'invoiceitem.deleted',
                'invoiceitem.updated',
                'invoiceitem.updated',
                'invoice.created',
                'invoiceitem.deleted',
                'invoice.updated',
                'invoice.updated',
                'customer.discount.created',
                'invoiceitem.updated'
            ],
            fn: async (ids) => {
                const {
                    c_1,
                    cp_1,
                    ii_1,
                    ii_2,
                    ii_3
                } = ids;


                await stripe.invoiceItems.update(
                    ii_3,
                    {description: "Update 1", metadata: {update: 'u1'}}
                );

                await stripe.invoiceItems.del(ii_3);


                const {id: i_1} = await stripe.invoices.create({
                    customer: c_1,
                });

                await stripe.invoiceItems.del(ii_2);


                const {discounts} = await stripe.invoiceItems.update(ii_1, {
                    discounts: [
                        {coupon: cp_1},
                    ]
                });


                // Assert: discount id is the same as the invoiceitem. (discounts will be upserted via invoiceitem which (has_direct_dl && has_direct_event), unlike line_items); there is never a discount on line_item that does has not been upserted via invoiceitem.
                const i_1_o = await stripe.invoices.retrieve(i_1);
                assert(discounts[0] === i_1_o.lines.data[0].discounts[0]);


                return {
                    ids: {
                        i_1
                    }
                };
            }
        },
        {
            tag: "d"
        },
        {
            events: [
                'invoice.deleted',
                'invoiceitem.deleted',
                'customer.discount.deleted'
            ],
            fn: async ({i_1}) => {
                await stripe.invoices.del(i_1);

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