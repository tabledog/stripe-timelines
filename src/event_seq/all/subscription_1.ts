import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";
import {log} from "../../lib/util";
import {pageIter} from "../../lib-app/util";


/**
 * Types to create:
 *
 *  - subscription
 *  - subcription_schedule
 *  - price
 *  - product
 *
 *
 * Not a parent object in event stream (is a child):
 *  - subcription_item
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
                'product.created',
                'product.created',
                'product.created',
                'plan.created',
                'price.created',
                'product.created',
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

                // Customer must have a payment method to create a subscription.
                const {id: pm_1} = await stripe.paymentMethods.create({
                    type: 'card',
                    card,
                    metadata: {tid: "pm_1"}
                });

                await stripe.paymentMethods.attach(pm_1, {customer: c_1});


                // @ts-ignore
                const {id: p_1} = await stripe.products.create(p1);
                // @ts-ignore
                const {id: p_2} = await stripe.products.create(p2);

                // @ts-ignore
                const {id: p_3} = await stripe.products.create(p3);


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
                        tid: "pr_2"
                    }
                });


                // Note: Prices replaces plans.
                // - Price writes are mirrored to plans (on price create, a plan is created *with the same id*).
                // - Do plan writes mirror to prices?
                const {id: pl_1} = await stripe.plans.create({
                    amount: 9000,
                    currency: 'gbp',
                    interval: 'month',
                    product: p_2,
                    metadata: {
                        tid: "pl_1"
                    }
                });


                return {
                    ids: {
                        c_1,
                        pm_1,
                        p_1,
                        p_2,
                        p_3,
                        pr_1,
                        pr_2
                    }
                };
            }
        },
        {
            tag: "sub_c"
        },
        {
            events: [
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
            fn: async (ids) => {
                const {
                    c_1,
                    pr_1,
                    pm_1,
                    p_1
                } = ids;

                const {id: s_1} = await stripe.subscriptions.create({
                    customer: c_1,
                    items: [
                        {price: pr_1},

                        // Inline price creation
                        // @todo/next Does this get written to price/product table?
                        {
                            price_data: {
                                unit_amount: 7000,
                                currency: "gbp",
                                product: p_1,
                                recurring: {interval: 'month'},

                                // Error: Currency and interval fields must match across all plans on this subscription. Found mismatch in interval field.
                                // recurring: {interval: 'day'},
                            }
                        }
                    ],
                    default_payment_method: pm_1,
                    metadata: {
                        tid: "s_1"
                    }
                });

                return {
                    ids: {
                        s_1
                    }
                }
            }
        },
        {
            tag: "sub_u"
        },
        {
            events: [
                'product.updated',
                'plan.updated',
                'price.updated',
                'customer.subscription.updated'
            ],
            fn: async (ids) => {
                const {
                    s_1,
                    p_1,
                    pr_1
                } = ids;

                await stripe.products.update(p_1, {description: "u1", metadata: {update: "u1"}});


                // Note: cannot update `unit_amount: 3000` (so price updates do no trigger sub updates).
                await stripe.prices.update(pr_1, {nickname: "u1", metadata: {update: "u1"}});

                await stripe.subscriptions.update(s_1, {proration_behavior: "none", metadata: {update: "u1"}});
            }
        },
        {
            tag: "sub_d"
        },
        {
            events: [
                'customer.subscription.deleted',
                'product.deleted'
            ],
            fn: async (ids) => {
                const {
                    s_1,
                    p_3
                } = ids;

                await stripe.subscriptions.del(s_1);
                await stripe.products.del(p_3);
            }
        },


        {
            tag: "sub_sched_c"
        },
        {
            events: [
                'customer.subscription.created',
                'invoice.created',
                'subscription_schedule.created',
                'customer.subscription.created',
                'invoiceitem.created',
                'invoice.created',
                'subscription_schedule.created'
            ],
            fn: async (ids) => {
                const {
                    c_1, pr_1
                } = ids;

                const {id: ss_1} = await stripe.subscriptionSchedules.create({
                    customer: c_1,
                    start_date: 'now',
                    end_behavior: 'release',
                    phases: [
                        {
                            items: [{price: pr_1, quantity: 1}],
                            iterations: 12,
                        },
                    ],
                });
                const {id: ss_2} = await stripe.subscriptionSchedules.create({
                    customer: c_1,
                    start_date: Math.floor(Date.now() / 1000) - (60 * 60 * 24 * 5), // Started 5 days *AGO*
                    end_behavior: 'cancel',
                    phases: [
                        {
                            items: [{price: pr_1, quantity: 8}],
                            iterations: 8,
                        },
                    ],
                });

                return {
                    ids: {ss_1, ss_2}
                }

            }
        },
        {
            tag: "sub_sched_u"
        },
        {
            events: [
                'subscription_schedule.updated',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created'
            ],
            fn: async (ids) => {
                const {ss_1, pr_1, pr_2} = ids;

                const ss_1_obj = await stripe.subscriptionSchedules.retrieve(ss_1);

                await stripe.subscriptionSchedules.update(ss_1, {
                    // @ts-ignore
                    phases: [
                        {
                            // This has to be the same.
                            start_date: ss_1_obj.phases[0].start_date,
                            items: [{price: pr_1, quantity: 2}],
                            iterations: 4,
                        },
                        {
                            items: [{price: pr_2, quantity: 4}],
                            iterations: 4,
                        },
                    ],
                    metadata: {update: "u1"}
                });

            }
        },
        {
            tag: "sub_sched_release"
        },
        {
            events: [
                'subscription_schedule.updated',
                'customer.subscription.updated',
                'subscription_schedule.released'
            ],
            fn: async (ids) => {
                const {ss_1} = ids;

                await stripe.subscriptionSchedules.release(ss_1);

                await assert.rejects(async () => {
                    // Error: You cannot cancel a subscription schedule that is currently in the `released` status. It must be in `not_started, active` status to be canceled.
                    await stripe.subscriptionSchedules.cancel(ss_1);
                });
            }
        },
        {
            tag: "sub_sched_d"
        },
        {
            events: [
                'invoiceitem.created',
                'invoiceitem.updated',
                'invoice.created',
                'customer.subscription.deleted',
                'subscription_schedule.canceled',
                'invoice.updated'
            ],
            fn: async (ids) => {
                const {ss_2} = ids;

                await stripe.subscriptionSchedules.cancel(ss_2);
            }
        },


        {
            tag: "sub_item_c"
        },
        {
            events: [
                'payment_intent.created',
                'charge.succeeded',
                'payment_intent.succeeded',
                'invoice.created',
                'invoice.finalized',
                'invoice.paid',
                'invoice.payment_succeeded',
                'customer.subscription.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated'
            ],
            fn: async (ids) => {
                const {c_1, p_1, pr_1, pr_2, pm_1} = ids;

                const {id: s_2} = await stripe.subscriptions.create({
                    customer: c_1,
                    items: [
                        // Must be set, else `Error: Missing required param: items.`
                        {price: pr_1}
                    ],
                    default_payment_method: pm_1,
                    metadata: {
                        tid: "s_2"
                    }
                });

                // Existing price.
                await stripe.subscriptionItems.create({
                    subscription: s_2,
                    price: pr_2,
                    quantity: 1,
                });


                const sub_items = [];

                // Add >10 items to test logic (sub_item = !has_direct_dl && !has_direct_event).
                // - Direct downloads need sub id. Update events are for the sub.
                while (sub_items.length < 18) {
                    const i = sub_items.length;

                    const {id} = await stripe.subscriptionItems.create({
                        subscription: s_2,

                        // Assert: These are added to price table.
                        price_data: {
                            unit_amount: i * 1000,
                            currency: "gbp",
                            product: p_1,
                            recurring: {interval: 'month'},
                        },
                        quantity: i,
                    });
                    sub_items.push(id);
                }

                // Assert: limit of 20 items per sub; list contains always all items (no need to dl the extra ones).
                // Assumption: sub updated events will also contain all sub items.
                const x = await stripe.subscriptions.retrieve(s_2);
                assert(!x.items.has_more);
                // @ts-ignore
                assert(x.items.total_count == 20);
                await assert.rejects(async () => {
                    // Error: Customer X already has the maximum 20 items per subscription
                    await stripe.subscriptionItems.create({
                        subscription: s_2,
                        price: pr_2,
                        quantity: 1,
                    });
                });

                return {
                    ids: {
                        s_2,
                        sub_items
                    }
                }
            }
        },
        {
            tag: "sub_item_u"
        },
        {
            events: [
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'invoiceitem.created',
                'customer.subscription.updated'
            ],
            fn: async (ids) => {
                const {s_2, sub_items} = ids;


                // @todo/next why does this trigger a `invoiceitem.created` when it is just an update?
                for (const [i, id] of sub_items.entries()) {
                    await stripe.subscriptionItems.update(id, {
                        quantity: i + 10,
                    });
                }


                // @todo/next Do sub_item rows still exist after being deleted?
                // - Should users query/join from the subscription row?
                //      - Issue: Make this obvious, otherwise subscription items queries may include deleted items.
                //          - Remove sub FK?
                //      - Can unattached items be re-attached to subscriptions? (is there a case for keeping item sub id FK?

                // Assert: Does this update only the IDs mentioned?
                await stripe.subscriptions.update(s_2, {
                    items: [
                        {
                            id: sub_items[0],
                            deleted: true,
                            metadata: {was_deleted: "1"}
                        },
                        {
                            id: sub_items[1],
                            quantity: 40,
                            metadata: {was_updated_via_sub: "1"}
                        }
                    ]
                });


                // Assert: Cannot re-attach sub items (less reason to keep deleted ones in table with deleted=1).
                await assert.rejects(async () => {
                    //  Error: No subscription item with this ID (si_JMVjcUh5bR60kY) on the subscription.
                    await stripe.subscriptions.update(s_2, {
                        items: [
                            {
                                id: sub_items[0],
                                quantity: 99,
                                deleted: false,
                                metadata: {was_reattached: "1"}
                            },
                        ]
                    });
                });
            }
        },
        {
            tag: "sub_item_d"
        },
        {
            events: [
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated',
                'invoiceitem.created',
                'customer.subscription.updated'
            ],
            fn: async (ids) => {
                const {s_2, sub_items} = ids;


                const log_invoiceitems = async () => {

                    const f = (starting_after) => stripe.invoiceItems.list({limit: 100, starting_after});
                    let x = [];
                    for await(const page of pageIter(f)) {
                        x = [...x, ...page];
                    }

                    // const x = await stripe.invoiceItems.list({limit: 100});

                    const all = x.filter(x2 => x2.subscription === s_2).map(({id, subscription_item}) => ({
                        id,
                        subscription_item
                    }));
                    log(all);
                };


                for (const [i, id] of sub_items.entries()) {
                    if (i === 0) {
                        await assert.rejects(async () => {
                            // `Error: Invalid subscription_item id: x`
                            // - Deleted in prev step.
                            await stripe.subscriptionItems.del(id);
                        });
                        continue;
                    }

                    await stripe.subscriptionItems.del(id);
                }


            }
        }
    ];

}

export {
    get_timeline
}