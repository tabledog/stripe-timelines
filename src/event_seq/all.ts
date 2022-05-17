import * as customer_1 from "./all/customer_1";
import * as customer_source_1 from "./all/customer_source_1";
import * as customer_source_2 from "./all/customer_source_2";
import * as customer_payment_method_1 from "./all/customer_payment_method_1";
import * as customer_payment_method_2 from "./all/customer_payment_method_2";
import * as customer_setup_intent_1 from "./all/customer_setup_intent_1";
import * as customer_setup_intent_2 from "./all/customer_setup_intent_2";
import * as customer_payment_intent_1 from "./all/customer_payment_intent_1";
import * as charge_refund_1 from "./all/charge_refund_1";
import * as subscription_1 from "./all/subscription_1";
import * as discount_1 from "./all/discount_1";
import * as discount_2 from "./all/discount_2";
import * as discount_3 from "./all/discount_3";
// import * as discount_4 from "./all/discount_4";
import * as invoice_1 from "./all/invoice_1";
import * as invoice_2 from "./all/invoice_2";
import * as invoice_3 from "./all/invoice_3";
import * as credit_note_1 from "./all/credit_note_1";
import * as session_1 from "./all/session_1";
import * as tax_rate_1 from "./all/tax_rate_1";
import * as order_1 from "./all/order_1";


const all = {
    customer_1,
    customer_source_1,
    customer_source_2,
    customer_payment_method_1,
    customer_payment_method_2,
    customer_setup_intent_1,
    customer_setup_intent_2,
    customer_payment_intent_1,
    charge_refund_1,
    subscription_1,
    discount_1,
    discount_2,
    discount_3,
    // discount_4,
    invoice_1,
    invoice_2,
    invoice_3,
    credit_note_1,
    session_1,
    tax_rate_1,
    order_1
};


// Make it easy to include from a regular node CLI script (instead of import/require each one).
export {
    all
}