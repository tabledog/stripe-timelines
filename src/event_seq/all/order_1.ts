import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";


/**
 * This timeline tests:
 * - order
 * - order_return
 * - sku
 *
 * Note:
 * - "delete all" from Stripe web UI does not delete order_returns.
 */


const p1 = {
    type: "good",
    name: "P1 Milk chocolate",
    caption: "Chocolate",
    description: "Chocolate is an essential part of being human.",
    shippable: true,
    attributes: ["size", "gender", "x"]
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
                'customer.updated',
                'payment_method.attached',
                'customer.source.created',
                'product.created',
                'sku.created',
                'sku.created',
                'sku.created',
                'coupon.created',
                'customer.updated',
                'order.created',
                'order.created',
                'sku.updated',
                'charge.succeeded',
                'order.updated',
                'order.payment_succeeded',
                'order_return.created',
                'charge.refunded',
                'order.updated',
                'order_return.created',
                'charge.refunded',
                'order.updated'
            ],
            fn: async () => {

                // @ts-ignore
                const {id: c_1} = await stripe.customers.create({
                    name: "C1.customer_1 Test",
                    email: "zeke_from_bobs_burgers@example.com",
                    shipping: {
                        name: 'Zeke',
                        address: {
                            line1: 'Wagstaff main',
                            city: 'San Francisco',
                            state: 'CA',
                            country: 'US',
                            postal_code: '94111',
                        },
                    },
                    metadata: {tid: "c_1"}
                });

                // Avoid: Error: Cannot charge a customer that has no active card
                // - Set up intent/default invoice does not seem to work.
                await stripe.customers.createSource(c_1, {source: 'tok_amex'});


                // @ts-ignore
                const {id: p_1} = await stripe.products.create(p1);


                const {id: sku_1} = await stripe.skus.create({
                    attributes: {size: 'Medium', gender: 'Unisex', x: `<script>alert()</script>`},
                    price: 1000,
                    currency: 'gbp',
                    inventory: {type: 'finite', quantity: 100},
                    product: p_1,
                    metadata: {tid: "sku_1"}
                });
                const {id: sku_2} = await stripe.skus.create({
                    attributes: {size: 'Small', gender: 'Female', x: `<script>alert()</script>`},
                    price: 2000,
                    currency: 'gbp',
                    inventory: {type: 'bucket', value: "in_stock"},
                    product: p_1,
                    metadata: {tid: "sku_2"}
                });
                const {id: sku_3} = await stripe.skus.create({
                    attributes: {size: 'Medium', gender: 'Female', x: `<script>alert()</script>`},
                    price: 3000,
                    currency: 'gbp',
                    inventory: {type: 'bucket', value: "in_stock"},
                    product: p_1,
                    metadata: {tid: "sku_3"}
                });
                const {id: cp_1} = await stripe.coupons.create({
                    name: "cp_1",
                    percent_off: 10,
                    duration: 'once',
                    metadata: {tid: "cp_1"}
                });


                const {id: or_1} = await stripe.orders.create({
                    customer: c_1,
                    currency: 'gbp',
                    items: [
                        {type: 'sku', parent: sku_1},
                        {type: 'sku', parent: sku_2},
                        {
                            type: 'discount',
                            parent: cp_1,
                            amount: -1,
                            currency: 'gbp',
                            description: "test discount"
                        },
                    ],
                    metadata: {tid: "or_1"}
                });



                // Note:
                // {
                //     "parent" : null, // Parent coupon ignored when created via `order.items`.
                //     "amount" : -1,
                //     "description" : "test discount",
                //     "object" : "order_item",
                //     "quantity" : null,
                //     "type" : "discount",
                //     "currency" : "gbp"
                // },
                //
                //
                // {
                //     "parent" : "n94ustMC", // Item created via update `order.coupon`. Parent is a *coupon*, not a discount (E.g. with subs, you pass a coupon and it generates a discount. here there is no discount created even though type is "discount")
                //     "amount" : -300,
                //     "description" : "n94ustMC: 10.0% off",
                //     "object" : "order_item",
                //     "quantity" : null,
                //     "type" : "discount",
                //     "currency" : "gbp"
                // }



                const {id: or_2} = await stripe.orders.create({
                    currency: 'gbp',
                    email: 'jenny.rosen@example.com',
                    items: [
                        {type: 'sku', parent: sku_1},
                        {type: 'sku', parent: sku_2},
                    ],
                    shipping: {
                        name: 'Jenny Rosen',
                        address: {
                            line1: '1234 Main Street',
                            city: 'San Francisco',
                            state: 'CA',
                            country: 'US',
                            postal_code: '94111',
                        },
                    },
                    metadata: {tid: "or_2"}
                });

                // Avoid: Error: Cannot return an order with status `created`. The order must be either `paid` or `fulfilled`.
                await stripe.orders.pay(or_2, {source: 'tok_mastercard'});

                const {id: or_ret_1} = await stripe.orders.returnOrder(or_2, {
                        items: [
                            {type: 'sku', parent: sku_1},
                        ],
                    }
                );

                const {id: or_ret_2} = await stripe.orders.returnOrder(or_2, {
                        items: [
                            {type: 'sku', parent: sku_2},
                        ],
                    }
                );


                return {
                    ids: {
                        sku_1,
                        sku_2,
                        sku_3,
                        cp_1,
                        or_1,
                        or_2,
                        or_ret_1,
                        or_ret_2
                    }
                }
            }
        },
        {
            tag: "u"
        },
        {
            events: [
                'customer.discount.created',
                'order.updated',
                'sku.updated',
                'charge.succeeded',
                'order.updated',
                'order.payment_succeeded'
            ],
            fn: async (ids) => {
                const {
                    c_1,
                    sku_1,
                    sku_2,
                    sku_3,
                    cp_1,
                    or_1,
                    or_2,
                    or_ret_1,
                    or_ret_2,
                } = ids;


                // Note: `items` do not have their own unique ID's (so are either indexed by array index, or parent is a unique key per list).
                await stripe.orders.update(or_1, {
                    // `items` - cannot update
                    coupon: cp_1
                });


                await stripe.orders.pay(or_1, {customer: c_1});


                return {
                    ids: {}
                }
            }
        },
        {
            tag: "d"
        },
        {
            events: [
                'sku.deleted'
            ],
            fn: async ({sku_1, sku_2, sku_3}) => {

                //  Error: The SKU you attempted to delete cannot be deleted because it is part of an order.
                // await stripe.skus.del(sku_1);
                // await stripe.skus.del(sku_2);
                await stripe.skus.del(sku_3);
            }
        },


    ];

}

export {
    get_timeline
}