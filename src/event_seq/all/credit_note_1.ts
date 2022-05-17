import Stripe from "stripe";
import {config} from "../../config/config";
import {getClientFromKeys} from "../../config/stripe";
import {strict as assert} from "assert";


const p1 = {
    type: "good",
    name: "P1 Milk chocolate",
    caption: "Chocolate",
    description: "Chocolate is an essential part of being human.",
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
                'customer.updated',
                'product.created',
                'price.created',
                'customer.updated',
                'invoiceitem.created',
                'invoiceitem.updated',
                'invoice.created',
                'payment_intent.created',
                'invoice.updated',
                'invoice.finalized'
            ],
            fn: async () => {
                const {id: c_1} = await stripe.customers.create({
                    name: "C1.customer_1 Test",
                    metadata: {tid: "c_1"}
                });

                // Avoid: Cannot charge a customer that has no active card
                const {id: pm_1} = await stripe.paymentMethods.create({
                    type: 'card',
                    card,
                    metadata: {tid: "pm_1"}
                });
                await stripe.paymentMethods.attach(pm_1, {customer: c_1});
                await stripe.customers.update(c_1, {invoice_settings: {default_payment_method: pm_1}});

                // @ts-ignore
                const {id: p_1} = await stripe.products.create(p1);

                const {id: pr_1} = await stripe.prices.create({
                    unit_amount: 2000,
                    currency: 'gbp',
                    // recurring: {interval: 'month'},  Error: The price specified is set to `type=recurring` but this field only accepts prices with `type=one_time`
                    product: p_1,
                    metadata: {
                        tid: "pr_1"
                    }
                });

                const {id: ii_1} = await stripe.invoiceItems.create({
                    customer: c_1,
                    price: pr_1,
                    quantity: 10,
                    metadata: {tid: "ii_1"}
                });

                const i_1_o = await stripe.invoices.create({
                    customer: c_1,
                });
                const i_1 = i_1_o.id;

                // Credit notes only exist on finalized invoices.
                await stripe.invoices.finalizeInvoice(i_1);


                return {
                    ids: {
                        i_1_o,
                        i_1,
                    }
                };
            }
        },
        {
            tag: "u"
        },
        {
            events: [
                'invoice.updated',
                'credit_note.created',
                'invoice.updated',
                'credit_note.voided',
                'charge.succeeded',
                'payment_intent.succeeded',
                'invoice.updated',
                'invoice.paid',
                'invoice.payment_succeeded',
                'charge.refunded',
                'invoice.updated',
                'customer.updated',
                'credit_note.created',
                'credit_note.updated'
            ],
            fn: async ({i_1, i_1_o}) => {
                // Docs:
                // - For a status=open invoice, a credit note reduces its amount_due
                // - For a status=paid invoice, a credit note does not affect its amount_due (will be a refund, credit_amount or out_of_band_amount).
                const {id: cn_1} = await stripe.creditNotes.create({
                    invoice: i_1,
                    lines: [
                        {
                            type: 'invoice_line_item',
                            invoice_line_item: i_1_o.lines.data[0].id,
                            quantity: 1
                        },
                    ],
                    memo: "This is a memo",
                    reason: "order_change",
                    metadata: {tid: "cn_1"}
                });

                // Error: You can only void a credit note if the associated invoice is open.
                await stripe.creditNotes.voidCreditNote(cn_1);


                await stripe.invoices.pay(i_1);

                const {id: cn_2} = await stripe.creditNotes.create({
                    invoice: i_1,
                    lines: [
                        {
                            type: 'custom_line_item',
                            unit_amount: 100,
                            quantity: 1,
                            description: "Custom Line Item for cn_2"
                        },
                        {
                            type: 'custom_line_item',
                            unit_amount: 100,
                            quantity: 2,
                            description: "Custom Line Item for cn_2"
                        },
                        {
                            type: 'custom_line_item',
                            unit_amount: 100,
                            quantity: 3,
                            description: "Custom Line Item for cn_2"
                        },
                    ],
                    //  Error: The sum of credit amount, refund amount and out of band amount (£1.00) must equal the credit note amount (£2.00).
                    refund_amount: 100,
                    credit_amount: 200,
                    out_of_band_amount: 300,
                    reason: "order_change",
                    metadata: {tid: "cn_2"}
                });


                await stripe.creditNotes.update(cn_2, {
                    // Note: cannot update lines (so inferring deletes by detecting missing line items probably not needed?)
                    // lines: [],
                    memo: "Update 1",
                    metadata: {tid: "cn_2", update: "u1"}
                });


            }
        },
        {
            tag: "d"
        },
        {
            events: [
                'charge.refunded',
                'invoice.updated',
                'customer.updated',
                'credit_note.created'
            ],
            fn: async ({i_1}) => {

                const lines = Array.from(Array(15).keys()).map(() => {
                    return {
                        type: 'custom_line_item',
                        unit_amount: 1,
                        quantity: 1,
                        description: "Custom Line Item for cn_2"
                    }
                });


                const {id: cn_3} = await stripe.creditNotes.create({
                    invoice: i_1,
                    // @ts-ignore
                    lines,
                    refund_amount: 2,
                    credit_amount: 4,
                    out_of_band_amount: 9,
                    reason: "order_change",
                    metadata: {tid: "cn_3"}
                });
            }
        }
    ];

}

export {
    get_timeline
}