import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";
import _ from "lodash";
import {log} from "../../lib/util";


/**
 * This timeline:
 * - Adds/removes discounts from parent/owner objects to see which events fire.
 *      - This allows determining if the parent FK `discount(s)` can be kept up to date with just events.
 *
 */

/**
 * Timelines to write:
 * - Add/remove from parent/owner.
 * - Add/remove from inherited.
 * - Delete parent with discount attached
 *
 *
 *
 * Q: Is `customer.discount.deleted` triggered for a discount that is inherited then deleted?
 * - See Excel file.
 * - Only invoice will have a `discounts` field that will contain non-owned discounts, when the non-owned are removed no `customer.discount.x` events are trigged.
 *
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

                    // Note: this can be listed in the download/event stream, but creating an `invoiceitem` creates an invisible product (not downloadable, not in the event stream aside from the ID)..
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
                        pm_1,
                        pr_1
                    }
                }
            }
        },
        {
            tag: "cust_attach"
        },
        {
            events: [
                'customer.discount.created',
            ],
            fn: async (ids) => {
                const {
                    c_1, cp_1
                } = ids;

                // Customer
                const {discount: dc_customer_1} = await stripe.customers.update(c_1, {coupon: cp_1});
            }
        },
        {
            tag: "cust_dettach"
        },
        {
            events: [
                'customer.discount.deleted'
            ],
            fn: async (ids) => {
                const {
                    c_1, cp_1
                } = ids;

                const {discount: dc_customer_2} = await stripe.customers.update(c_1, {coupon: null});

                // Note: The customer has been updated, but no `customer.updated` event is fired.
                assert(dc_customer_2 === null);

                // Fix: When: (`customer.discount.deleted` && _.isString(customer) && other_ids_null)
                //      - Custom update SQL: set customer.discount=null.
                //      - Wait for Stripe fix of triggering `customer.updated`
                //      - `customer.discount.deleted` does nothing - query from parent object as others will have discount object.
            }
        },


        {
            tag: "sub_attach"
        },
        {
            events: [
                'customer.discount.created',
                'customer.subscription.updated',
            ],
            fn: async (ids) => {
                const {
                    c_1, cp_1, sub_1
                } = ids;

                // Subscription
                const {discount: dc_sub_1} = await stripe.subscriptions.update(sub_1, {coupon: cp_1});
            }
        },

        {
            tag: "sub_dettach"
        },
        {
            events: [
                'customer.discount.deleted',
                'customer.subscription.updated'
            ],
            fn: async (ids) => {
                const {
                    c_1, cp_1, sub_1
                } = ids;

                // Subscription
                const {discount: dc_sub_2} = await stripe.subscriptions.update(sub_1, {coupon: null});
            }
        },

        {
            tag: "inv_attach"
        },
        {
            events: [
                'invoiceitem.created',
                'invoiceitem.updated',
                'invoice.created',
                'customer.discount.created',
                'customer.discount.created',
                'invoice.updated'
            ],
            fn: async (ids) => {
                const {
                    c_1, cp_3, cp_4, sub_1
                } = ids;

                // Invoice

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


                i_1 = await stripe.invoices.update(i_1.id, {
                    discounts: [
                        {coupon: cp_3},
                        {coupon: cp_4}
                    ]
                });

                const [d_1, d_2] = i_1.discounts;

                return {
                    ids: {
                        i_1: i_1.id,
                        d_1,
                        d_2
                    }
                }
            }
        },
        {
            tag: "inv_dettach"
        },
        {
            events: [
                'customer.discount.deleted',
                'customer.discount.deleted',
                'invoice.updated'
            ],
            fn: async (ids) => {
                const {
                    i_1, d_1, d_2
                } = ids;

                // Invoice
                let i_1_o = await stripe.invoices.update(i_1, {
                    // Remove all
                    discounts: ""
                });

                await assert.rejects(async () => {
                    // Error: No such discount
                    await stripe.invoices.update(i_1, {
                        // Re-add based on discount_id (not coupon_id).
                        discounts: [
                            // @ts-ignore
                            {discount: d_1},
                            // @ts-ignore
                            {discount: d_2},
                        ]
                    });
                });

            }
        },


        {
            tag: "invitem_attach"
        },
        {
            events: [
                'invoiceitem.created',
                'customer.discount.created',
                'customer.discount.created',
                'invoiceitem.updated',
            ],
            fn: async (ids) => {
                const {
                    c_1, cp_3, cp_4, sub_1
                } = ids;

                // Invoiceitem - Not attached to invoice.

                let ii_2 = await stripe.invoiceItems.create({
                    customer: c_1,
                    amount: 1000,
                    currency: "GBP",
                    metadata: {tid: "ii_2"}
                });

                ii_2 = await stripe.invoiceItems.update(ii_2.id, {
                    discounts: [
                        {coupon: cp_3},
                        {coupon: cp_4}
                    ]
                });

                const [d_1, d_2] = ii_2.discounts;

                return {
                    ids: {
                        d_1, d_2, ii_2: ii_2.id
                    }
                }

            }
        },


        {
            tag: "invitem_dettach"
        },
        {
            events: [
                'customer.discount.deleted',
                'customer.discount.deleted',
                'invoiceitem.updated',
                // 'invoiceitem.deleted'
            ],
            fn: async (ids) => {
                const {
                    c_1, cp_3, cp_4, sub_1, d_1, d_2,
                    ii_2
                } = ids;

                // Invoiceitem - Not attached to invoice.


                let ii_1_o = await stripe.invoiceItems.update(ii_2, {
                    // Remove all
                    discounts: ""
                });


                await assert.rejects(async () => {
                    // Error: No such discount
                    await stripe.invoiceItems.update(ii_2, {
                        // Re-add based on discount_id (not coupon_id).
                        discounts: [
                            // @ts-ignore
                            {discount: d_1},
                            // @ts-ignore
                            {discount: d_2},
                        ]
                    });
                });


                // await stripe.invoiceItems.del(ii_2);
            }
        },

        {
            tag: "promo_c"
        },
        {
            events: [
                'promotion_code.created',
                'promotion_code.created',
                'payment_intent.created',
                'charge.succeeded',
                'payment_intent.succeeded',
                'invoiceitem.updated',
                'invoice.created',
                'invoice.finalized',
                'invoice.paid',
                'invoice.payment_succeeded',
                'customer.subscription.created'
            ],
            fn: async (ids) => {
                const {
                    cp_1,
                    c_1,
                    pr_1,
                    pm_1
                } = ids;


                // Docs: Coupons are merchant facing, promos are customer facing.

                const {id: pro_1} = await stripe.promotionCodes.create({
                    coupon: cp_1,
                    metadata: {tid: "pro_1"}
                });
                const {id: pro_2} = await stripe.promotionCodes.create({
                    coupon: cp_1,
                    metadata: {tid: "pro_2"}
                });

                // Create a new subscription to avoid mutating the one created previously in the timeline (Rust tests assert against this state).
                const sub_2 = await stripe.subscriptions.create({
                    customer: c_1,
                    items: [
                        {price: pr_1},
                    ],
                    default_payment_method: pm_1,
                    metadata: {
                        tid: "s_2"
                    }
                });


                return {
                    ids: {
                        pro_1,
                        pro_2,
                        sub_2: sub_2.id
                    }
                }
            }
        },

        {
            tag: "promo_u"
        },
        {
            events: [
                'promotion_code.updated',
                'promotion_code.updated',
                'customer.discount.created',
                'customer.subscription.updated',
                'promotion_code.updated'
            ],
            fn: async (ids) => {
                const {
                    pro_1,
                    pro_2,
                    sub_2
                } = ids;

                await stripe.promotionCodes.update(pro_1, {metadata: {update: 'u_1'}});


                await stripe.subscriptions.update(sub_2, {promotion_code: pro_2});

                // Does this get listed in the dl list?
                await stripe.promotionCodes.update(pro_2, {active: false, metadata: {update: 'u_1'}});
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