// @see https://stripe.com/docs/testing
// @see https://stripe.com/docs/payments/save-and-reuse#web-test-integration

const testCards = {
    "ok": {
        num: "4242424242424242",
        desc: "Succeeds and immediately processes the payment."
    },
    "auth_for_first_ok_rest": {
        num: "4000002500003155",
        desc: "Requires authentication for the initial purchase, but succeeds for subsequent payments (including off-session ones) as long as the num is setup with setup_future_usage."
    },
    "auth_for_first_fails_rest_with_authentication_required": {
        num: "4000002760003184",
        desc: "Requires authentication for the initial purchase, and fails for subsequent payments (including off-session ones) with an authentication_required decline code."
    },
    "auth_for_first_fails_rest_with_insufficient_funds": {
        num: "4000008260003178",
        desc: "Requires authentication for the initial purchase, but fails for subsequent payments (including off-session ones) with an insufficient_funds decline code."
    },
    "fails_with_insufficient_funds": {
        num: "4000000000009995",
        desc: "Always fails (including the initial purchase) with a decline code of insufficient_funds."
    },
};


export {
    testCards
}