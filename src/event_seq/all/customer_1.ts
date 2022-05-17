import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";

const get_timeline = async (stripeSec) => {
    const stripe = getClientFromKeys(stripeSec);

    return [
        {
            tag: "c"
        },
        {
            events: [`customer.created`],
            fn: async () => {
                const {id: c_1} = await stripe.customers.create({
                    name: "C1.customer_1 Test",
                    metadata: {tid: "c_1"}
                });
                return {ids: {c_1}};
            }
        },
        {
            tag: "u"
        },
        {
            events: [
                `customer.updated`,
                `customer.updated`
            ],
            fn: async ({c_1}) => {
                await stripe.customers.update(c_1, {
                    name: "C1.customer_1 Test Update 0",
                });
                await stripe.customers.update(c_1, {
                    email: "update.1@gmail.com"
                });
            }
        },
        {
            tag: "d"
        },
        {
            events: [`customer.deleted`],
            fn: async ({c_1}) => {
                await stripe.customers.del(c_1);
            }
        }
    ];

}

export {
    get_timeline
}