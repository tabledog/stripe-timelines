import faker from "faker";
import Stripe from "stripe";
import {stripe} from "./../../../config/stripe";
import {batch, fillWith, split} from "../../../lib/util";
import {getRandomLocale} from "../level-x/locale";
import {getRandomTaxId} from "../level-x/taxi-id";
import _ from "lodash";
import {getRandomSource} from "./source";

const shipping = () => {
    return {
        name: faker.address.secondaryAddress(),
        address: address(),
        phone: phone(),
    }
}

// Faker.js's phone is sometimes invalid (over 20 chars).
const phone = () => _.random(Math.pow(10, 10), Math.pow(10, 11))


const address = () => {
    return {
        city: faker.address.city(),
        country: faker.address.country(),
        line1: faker.address.streetName(),
        line2: faker.address.streetAddress(),
        postal_code: faker.address.zipCode(),
        state: faker.address.state()
    }
};


const getRandomCustomer = async (): Promise<Stripe.CustomerCreateParams> => {
    // @todo/next Payment intent instead of source?

    return {
        address: address(),
        balance: split(0.7, () => _.random(-500 * 100, 500 * 100), undefined),
        description: `This is a description.`,
        email: faker.internet.email(),
        expand: undefined,
        invoice_prefix: undefined,
        invoice_settings: undefined,
        metadata: undefined,
        name: `${faker.name.firstName()} ${faker.name.lastName()}`,
        next_invoice_sequence: undefined,
        payment_method: undefined,
        phone: phone(),
        preferred_locales: fillWith(_.random(0, 2), getRandomLocale),

        // @todo set one of these.
        promotion_code: undefined,
        coupon: undefined,

        shipping: split(0.5, shipping, undefined),

        source: await split(0.7, async () => (await stripe.sources.create(getRandomSource())).id, undefined),
        // source: undefined,

        tax_exempt: _.sample(["none", "exempt", "reverse", null]),
        // tax_id_data: tax_id_data_random()
        tax_id_data: fillWith(_.random(0, 2), getRandomTaxId)
    };
};

const createCustomers = async (n) => {
    return batch(async () => {
        const c = await getRandomCustomer();
        const {id} = await stripe.customers.create(c);
        console.log(`Created Customer  ${id}`);
        return id;
    }, Array(n));
};


export {
    getRandomCustomer,
    createCustomers
}