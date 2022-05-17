import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";
import _ from "lodash";


/**
 * Discount
 * - Create and attach discounts for all possible types:
 *      - Customer (single)
 *      - Subscription (single)
 *      - Invoice (many)
 *      - Invoiceitem (many)
 *
 * @see tdog_core/src/providers/stripe/schema/types/discount.rs
 * - Delete is not possible for discount, as:
 *      - Discount ID's are referenced in other types (customer, subscription, invoice, invoiceitem).
 *      - Discount's wrap immutable coupons (which themselves cannot be deleted).
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
                'coupon.created',
                'coupon.created',
                'payment_intent.created',
                'charge.succeeded',
                'payment_intent.succeeded',
                'customer.updated',
                'customer.discount.created',
                'customer.discount.deleted',
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
                const {id: cp_2} = await stripe.coupons.create({
                    name: "cp_2",
                    percent_off: 20,
                    duration: 'once',
                    metadata: {tid: "cp_2"}
                });
                const {id: cp_3} = await stripe.coupons.create({
                    name: "cp_3",
                    percent_off: 30,
                    duration: 'forever',
                    metadata: {tid: "cp_3"}
                });


                // Fixed amount
                const {id: cp_4} = await stripe.coupons.create({
                    name: "cp_4",
                    amount_off: 400,
                    currency: "GBP",
                    duration: 'once',
                    metadata: {tid: "cp_4"}
                });
                const {id: cp_5} = await stripe.coupons.create({
                    name: "cp_5",
                    amount_off: 500,
                    currency: "GBP",
                    duration: 'once',
                    metadata: {tid: "cp_5"}
                });
                const {id: cp_6} = await stripe.coupons.create({
                    name: "cp_6",
                    amount_off: 600,
                    currency: "GBP",
                    duration: 'forever',
                    metadata: {tid: "cp_6"}
                });


                // Creates invoice and tries to settle it immediately.
                const {id: s_1} = await stripe.subscriptions.create({
                    customer: c_1,
                    coupon: cp_2,
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
                        pr_1,
                        s_1,
                        pm_1,
                        p_1,

                        cp_1,
                        cp_2,
                        cp_3,
                        cp_4,
                        cp_5,
                        cp_6,
                    }
                };
            }
        },
        {
            tag: "u"
        },
        {
            events: [
                'coupon.updated',
                'customer.discount.created',
                'customer.discount.created',
                'customer.subscription.updated',
                'customer.discount.updated',
                'customer.subscription.updated',
                'customer.discount.updated',
                'customer.subscription.updated',
                'customer.discount.updated',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.updated',
                'invoice.created',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.discount.created',
                'customer.discount.created',
                'customer.discount.created',
                'customer.discount.deleted',
                'invoiceitem.updated',
                'invoiceitem.updated',
                'invoiceitem.updated',
                'customer.discount.created',
                'customer.discount.created',
                'invoice.created',
                'payment_intent.created',
                'charge.succeeded',
                'payment_intent.succeeded',
                'invoice.updated',
                'invoice.paid',
                'invoice.payment_succeeded',
                'invoice.finalized',
                'customer.discount.deleted',
                'customer.discount.deleted',
                'payment_intent.created',
                'charge.succeeded',
                'payment_intent.succeeded',
                'invoice.updated',
                'invoice.paid',
                'invoice.payment_succeeded',
                'invoice.finalized',
                'invoiceitem.created',
                'customer.discount.created',
                'invoiceitem.updated',
                'customer.discount.created',
                'invoice.created',
            ],
            fn: async (ids) => {
                const {
                    c_1,
                    s_1,
                    pr_1,
                    p_1,
                    cp_1,
                    cp_2,
                    cp_3,
                    cp_4,
                    cp_5,
                    cp_6,
                } = ids;

                await stripe.coupons.update(cp_1, {metadata: {update: "u1"}});


                /**
                 * Docs: If you provide a coupon code, the customer will have a discount applied on all recurring charges. *Charges you create through the API will not have the discount*.
                 */
                const {discount: dc_customer} = await stripe.customers.update(c_1, {coupon: cp_1});


                // Issue: `customer.discount.created` fires, but not `customer.updated` (if using customer update events only, `customer.discount` remains null when it is actually a discount_id).
                assert(_.isString(dc_customer.id));


                // Docs: The code of the coupon to apply to this subscription. A coupon applied to a subscription will only affect invoices created for that particular subscription.
                // @todo/low Trigger subscription charge when it is supported.
                // Generate a new discount for each update?
                const {discount: {id: d_1}} = await stripe.subscriptions.update(s_1, {coupon: cp_1});
                const {discount: {id: d_2}} = await stripe.subscriptions.update(s_1, {coupon: cp_2});
                const {discount: {id: d_3}} = await stripe.subscriptions.update(s_1, {coupon: cp_1});
                const {discount: {id: d_4}} = await stripe.subscriptions.update(s_1, {coupon: cp_2});

                console.log({d_1, d_2, d_3, d_4});

                const {id: ii_1} = await stripe.invoiceItems.create({
                    customer: c_1,
                    amount: 2000,
                    currency: "GBP",
                    metadata: {tid: "ii_1"}

                    // Docs:  If no invoice is specified, the item will be on the next invoice created for the customer specified.
                    // invoice: i_2,
                });

                // This will inherit the coupon on the customer.
                const {id: i_1} = await stripe.invoices.create({
                    customer: c_1,
                    metadata: {tid: "i_1"}
                });

                const {id: ii_2} = await stripe.invoiceItems.create({
                    customer: c_1,
                    price_data: {
                        currency: "GBP",
                        product: p_1,
                        unit_amount: 5
                    },
                    // invoice: i_2,

                    // Inherit from invoice.
                    // Docs: Controls whether discounts apply to this invoice item. Defaults to false for prorations or negative invoice items, and true for all other invoice items.
                    discountable: true,
                    metadata: {tid: "ii_2"}
                });
                const {id: ii_3, discounts} = await stripe.invoiceItems.create({
                    customer: c_1,
                    amount: 2000,
                    currency: "GBP",
                    // invoice: i_2,
                    discounts: [
                        {coupon: cp_5},
                        {coupon: cp_6},
                    ],
                    metadata: {tid: "ii_3"}
                });

                await stripe.invoiceItems.update(ii_3, {
                    discounts: [


                        // When: Adding a discount created via another item (it seems you can only add discount ids that were originally created for the given item via passing a coupon).
                        // Error: Discount di_1IemrCJo6Ja94JKPFnuQngyG does not already exist on the item. Discounts can only be applied to an item when they already exist on the item.
                        // @ts-ignore
                        // {discount: d_1},
                        // @ts-ignore
                        // {discount: d_2},

                        // @todo/next Ensure SQL state correct.
                        // Remove discount for `cp_5`

                        // Re-attach cp_5 discount (can re-attach when the discount was created on the same item).
                        {discount: discounts[0]},

                        // Create new discount from cp_6.
                        {coupon: cp_6},

                        // Implicit: remove original discount for cp_6.
                    ]
                });


                const {id: i_2} = await stripe.invoices.create({
                    customer: c_1,
                    discounts: [
                        {coupon: cp_3},
                        {coupon: cp_4},
                        // @todo/low `discount` to re-use a previous discount
                    ],
                    metadata: {tid: "i_2"}
                });


                await stripe.invoices.pay(i_1);
                await stripe.invoices.pay(i_2);

                await assert_cannot_delete_discount_used_in_payment(stripe, i_2, ii_3);

                // Create a new invoice item on the upcoming invoice to delete it later and check to see if the discount rows invoiceitem id is updated on delete.
                const {id: ii_4, discounts: [d_5]} = await stripe.invoiceItems.create({
                    customer: c_1,
                    amount: 2000,
                    currency: "GBP",
                    discounts: [
                        {coupon: cp_5},
                    ],
                    metadata: {tid: "ii_4"}
                });


                // Docs: The draft invoice created *pulls in all pending invoice items* on that customer
                const {id: i_3} = await stripe.invoices.create({
                    customer: c_1,
                    discounts: [
                        {coupon: cp_3},
                    ],
                    metadata: {tid: "i_3"}
                });

                return {
                    ids: {
                        i_1,
                        i_2,
                        ii_1,
                        ii_2,
                        ii_3,

                        ii_4,
                        i_3
                    }
                }

            }
        },
        {
            tag: "d"
        },
        {
            events: [
                'coupon.deleted',
                'coupon.deleted',
                'coupon.deleted',
                'coupon.deleted',
                'coupon.deleted',
                'coupon.deleted',
            ],
            fn: async (ids) => {
                const {
                    c_1,
                    s_1,
                    cp_1,
                    cp_2,
                    cp_3,
                    cp_4,
                    cp_5,
                    cp_6,
                    ii_4,
                    i_3
                } = ids;

                await stripe.coupons.del(cp_1);
                await stripe.coupons.del(cp_2);
                await stripe.coupons.del(cp_3);
                await stripe.coupons.del(cp_4);
                await stripe.coupons.del(cp_5);
                await stripe.coupons.del(cp_6);
            }
        },

        {
            events: [
                'customer.discount.deleted',
                'customer.subscription.updated',
                'customer.discount.deleted',
            ],
            fn: async (ids) => {
                const {
                    c_1,
                    s_1,
                } = ids;

                // Delete discounts directly.
                // Assert: discount table is updated, esp the fk for those objects.
                // Assert: discount id cells updated for each obj.
                await stripe.customers.deleteDiscount(c_1);
                await stripe.subscriptions.deleteDiscount(s_1);


                // Q: Does deleting a customer also delete the discount/coupon connection, triggering `customer.discount.deleted`?
            }
        },

        {
            events: [
                'customer.discount.deleted',
                'invoiceitem.deleted',
                'invoice.updated'
            ],
            fn: async (ids) => {
                const {
                    ii_4,
                } = ids;

                // Assert: discounts.invoiceitem id is null
                await stripe.invoiceItems.del(ii_4);
            }
        },


        {
            events: [
                'invoice.deleted',
                'customer.discount.deleted',
            ],
            fn: async (ids) => {
                const {
                    i_3,
                } = ids;

                // This is a draft invoice.
                // Assert: discounts.invoice id is null
                await stripe.invoices.del(i_3);
            }
        },

        {
            events: [
                'coupon.created',
                'customer.discount.created',
                'customer.subscription.updated',
                'customer.subscription.deleted',
            ],
            fn: async (ids) => {
                const {
                    s_1,
                    cp_2,
                } = ids;
                const {id: cp_7} = await stripe.coupons.create({
                    name: "cp_7",
                    amount_off: 700,
                    duration_in_months: 7,
                    currency: "GBP",
                    duration: 'repeating',
                    metadata: {tid: "cp_7"}
                });

                const {discount: {id: d_x}} = await stripe.subscriptions.update(s_1, {coupon: cp_7});

                // Assert: discounts.subscription id is null
                await stripe.subscriptions.del(s_1);
            }
        },

        {
            events: [
                'coupon.created',
                'customer.discount.created',
                'customer.deleted'
            ],
            fn: async (ids) => {
                const {
                    c_1,
                    cp_2
                } = ids;

                const {id: cp_8} = await stripe.coupons.create({
                    name: "cp_8",
                    amount_off: 800,
                    duration_in_months: 8,
                    currency: "GBP",
                    duration: 'repeating',
                    metadata: {tid: "cp_8"}
                });

                const {discount: {id: d_x}} = await stripe.customers.update(c_1, {coupon: cp_8});

                // Assert: discounts.customer id is null
                await stripe.customers.del(c_1);
            }
        },
    ];

}


const assert_cannot_delete_discount_used_in_payment = async (stripe, i_2, ii_3) => {
    await assert.rejects(async () => {
        // Error: This invoice item is already attached to an invoice that is no longer editable
        await stripe.invoiceItems.update(ii_3, {
            // Docs: Pass an empty string to remove previously-defined discounts.
            // @ts-ignore
            discounts: ""
        });
    });

    await assert.rejects(async () => {
        // Error: This invoice item is already attached to an invoice that is no longer editable
        await stripe.invoice.del(i_2);
    });
};


export {
    get_timeline
}