import Stripe from 'stripe';
import {currencyISO} from "./../level-x/iso-currency";
import _ from "lodash";


// Taken from JSON spec.
const types = [
    // @todo/low Each type requires its own key/data.
    "ach_credit_transfer",
    // "ach_debit",
    // "alipay",
    // "au_becs_debit",
    // "bancontact",
    // "card",
    // "card_present",
    // "eps",
    // "giropay",
    // "ideal",
    // "klarna",
    // "multibanco",
    // "p24",
    // "sepa_debit",
    // "sofort",
    // "three_d_secure",
    // "wechat"
];


const getRandomSource = (): Stripe.SourceCreateParams => {
    return {
        type: _.sample(types),
        currency: _.sample(["USD"]),
        owner: {
            email: "example@example.com"
        }
        // redirect: {
        //     "return_url": "https://example.com/source/return_url"
        // },
        // amount: _.random(50 * 100, 500 * 100),

        // customer: "",
        // expand: undefined,
        // flow: "none",
        // mandate: undefined,
        // metadata: undefined,
        // original_source: "",
        // owner: undefined,
        // receiver: undefined,
        // redirect: undefined,
        // source_order: undefined,
        // statement_descriptor: "",
        // token: "",
        // usage: undefined
    }
};

export {
    getRandomSource
}