import Stripe from "stripe";
import _ from "lodash";
import {batch} from "../../../lib/util";
import {stripe} from "../../../config/stripe";

const getRandomPaymenIntent = (): Stripe.PaymentIntentCreateParams => {
    return {
        amount: _.random(10 * 100, 1000 * 100),
        currency: "usd",
        payment_method_types: ["card"],

        // application_fee_amount: 0,
        // capture_method: undefined,
        // confirm: false,
        // confirmation_method: undefined,
        //
        // customer: "",
        // description: "",
        // error_on_requires_action: false,
        // expand: undefined,
        // mandate: "",
        // mandate_data: undefined,
        // metadata: undefined,
        // off_session: undefined,
        // on_behalf_of: "",
        // payment_method: "",
        // payment_method_data: undefined,
        // payment_method_options: undefined,
        //
        // receipt_email: "",
        // return_url: "",
        // setup_future_usage: undefined,
        // shipping: undefined,
        // statement_descriptor: "",
        // statement_descriptor_suffix: "",
        // transfer_data: undefined,
        // transfer_group: "",
        // use_stripe_sdk: false
    }
};



const getRandomSetupIntent = (): Stripe.SetupIntentCreateParams => {
    return {
        payment_method_types: ["card"],
    }
};


const getRandomPaymentMethod = (): Stripe.PaymentMethodCreateParams => {
    // @todo/low Try all payment methods.

    return {
        type: "card",
        card: {
            cvc: "314",
            exp_month: 12,
            exp_year: 2024,
            number: "4242424242424242",
            // token: ""
        },
        // alipay: undefined,
        // au_becs_debit: undefined,
        // bacs_debit: undefined,
        // bancontact: undefined,
        // billing_details: undefined,
        // customer: "",
        // eps: undefined,
        // expand: undefined,
        // fpx: undefined,
        // giropay: undefined,
        // grabpay: undefined,
        // ideal: undefined,
        // interac_present: undefined,
        // metadata: undefined,
        // oxxo: undefined,
        // p24: undefined,
        // payment_method: "",
        // sepa_debit: undefined,
        // sofort: undefined
    }
};

const createSetupIntent = async (cid) => {

    // Step 1: `requires_payment_method`
    const i = getRandomSetupIntent();
    i.customer = cid;
    const {id} = await stripe.setupIntents.create(i);
    console.log(`Created SetupIntent: ${id}`);



    // Step 2: `requires_confirmation`
    // Confirm async to enable a gap for event processing to see.
    // await timeout(1000);
    const {id: pmId} = await stripe.paymentMethods.create(getRandomPaymentMethod());
    await stripe.setupIntents.confirm(id, {
        payment_method: pmId
    });

    // Note: Set the card as the default for the customer.
    // Avoid error: `This customer has no attached payment source`.
    // - When a customer has a successful setup intent with a payment method, subscriptions still fail unless the payment method is set to default.
    await stripe.customers.update(cid, {
        invoice_settings: {
            default_payment_method: pmId
        }
    });

    // Step 3: `requires_action` (E.g. 3D secure).
    // Step 4: `processing` (can take days for non-card methods).
    // Step 5: `succeeded`


    // @todo/next attach method to customer

    return {
        setup_intent: id,
        payment_method: pmId
    }
};


const createSetupIntentForAllCustomers = async (customers) => {
    return batch(async (cId) => {
        const {payment_method} = await createSetupIntent(cId);
        return {
            customer: cId,
            payment_method
        };
    }, customers);
};


export {
    getRandomPaymenIntent,
    getRandomPaymentMethod,
    getRandomSetupIntent,
    createSetupIntent,
    createSetupIntentForAllCustomers
}