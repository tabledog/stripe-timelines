import Stripe from "stripe";
import {batch, split} from "../../../lib/util";
import _ from "lodash";
import {stripe} from "../../../config/stripe";


/**
 * The unstable supermarket.
 */

const getProductGoods = (): Stripe.ProductCreateParams[] => {
    return [
        {
            type: "good",
            name: "P1 Milk chocolate",
            caption: "Chocolate",
            description: "Chocolate is an essential part of being human.",
            shippable: true
        },
        {
            type: "good",
            name: "P2 Orange pack of 5",
            caption: "Oranges for your tummy.",
            description: "Oranges are an essential part of being human..",
            shippable: true
        },
        {
            type: "good",
            name: "P3 Wild Alaskan Salmon",
            caption: "Salmon for your tummy.",
            description: "Salmon is an essential part of being human.",
            shippable: true
        }
    ];
};

const getProductServices = (): Stripe.ProductCreateParams[] => {
    return [
        {
            type: "service",
            name: "S1 Trolly return service.",
            description: "Leave your trolly where it may land, and our highly trained stuff will return it back to the bay.",
            statement_descriptor: "Trolley return.",
        },
        {
            type: "service",
            name: "S2 Fresh fruit delivery.",
            description: "You need nutrients on a regular basis, forget about shopping and get it delivered.",
            statement_descriptor: "Fruit delivery.",
        },
        {
            type: "service",
            name: "S3 Fresh veg delivery",
            description: "Veg is the new fruit. Get it delivered and think about more important things.",
            statement_descriptor: "Veg delivery.",
        }
    ];
};


const singlePurchaseGood = (): Stripe.ProductCreateParams => {
    return {
        type: "good",
        name: "A box of finest chocs.",
        caption: "Chocs for your tummy..",
        description: "Chocolate is an essential part of being human.",
        shippable: true
    }
};

const subscriptionService = (): Stripe.ProductCreateParams => {
    return {
        type: "service",
        name: "A compliments that matches your character once per week.",
        description: "As a chef, you receive compliments.",
        statement_descriptor: "Essential compliments.",
    }
};
const getRandomProduct = (): Stripe.ProductCreateParams => {
    return split(0.01, singlePurchaseGood(), subscriptionService());
};


const getPrice = (product): Stripe.PriceCreateParams => {
    const interval = _.sample([
        {
            interval: "day",
            interval_count: _.random(1, 365)
        },
        {
            interval: "week",
            interval_count: _.random(1, 52)
        },
        {
            interval: "month",
            interval_count: _.random(1, 12)
        },
        {
            interval: "year",
            interval_count: 1
        }
    ]);
    const usage_type = _.sample(["licensed", "metered"]);

    const recurring = _.sample([
        undefined,
        {
            ...interval,
            usage_type,
            aggregate_usage: usage_type === "metered" ? _.sample(["sum", "last_during_period", "last_ever", "max"]) : undefined
        }
    ]);


    return {
        product,
        unit_amount: _.random(1 * 100, 100 * 100),
        currency: 'usd',
        recurring
    };
};


const createProducts = async () => {
    const a = getProductGoods();
    const b = getProductServices();

    const goods = await batch(async (i) => {
        const {id} = await stripe.products.create(i);
        console.log(`Created Product ${id}`);
        return id;
    }, a);

    const services = await batch(async (i) => {
        const {id} = await stripe.products.create(i);
        console.log(`Created Product ${id}`);
        return id;
    }, b);

    const prices = [];
    for (let i = 0; i < 3; i++) {

        // Note: A "product.type=good" can have a Price object that is price.type=recurring.
        const pricesGoods = await batch(async (i) => {
            const price = await stripe.prices.create(getPrice(i));
            console.log(`Created Price ${price.id}`);

            return price;
        }, goods);


        const pricesServices = await batch(async (i) => {
            const price = await stripe.prices.create(getPrice(i));
            console.log(`Created Price ${price.id}`);
            return price;
        }, services);


        prices.push(
            ...pricesGoods,
            ...pricesServices
        );
    }


    return {
        goods,
        services,
        prices
    }
}


export {
    getRandomProduct,
    getProductGoods,
    getProductServices,
    getPrice,
    createProducts
}