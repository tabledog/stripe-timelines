// Taken from https://stripe.com/docs/testing

const all = {
    basic: [
        "pm_card_visa",
        "pm_card_visa_debit",
        "pm_card_mastercard",
        "pm_card_mastercard_debit",
        "pm_card_mastercard_prepaid",
        "pm_card_amex",
        "pm_card_discover",
        "pm_card_diners",
        "pm_card_jcb",
        "pm_card_unionpay"
    ],
    international: [
        "pm_card_au",
        "pm_card_cn",
        "pm_card_hk",
        "pm_card_in",
        "pm_card_jp",
        "pm_card_jcb",
        "pm_card_my",
        "pm_card_nz",
        "pm_card_sg"
    ],
    sca_setup_intent: [
        "pm_card_authenticationRequiredOnSetup",
        "pm_card_authenticationRequired",
        "pm_card_authenticationRequiredChargeDeclinedInsufficientFunds",
        "pm_card_authenticationRequiredSetupForOffSession",
    ],
    three_d_secure: [
        "pm_card_threeDSecure2Required",
        "pm_card_threeDSecureRequired",
        "pm_card_threeDSecureRequiredChargeDeclined",
        "pm_card_threeDSecureRequiredProcessingError",
        "pm_card_threeDSecureOptional",
        "pm_card_threeDSecureOptionalProcessingError",
        "pm_card_visa",
        "pm_card_amex_threeDSecureNotSupported",
    ],
    states: [
        "pm_card_bypassPending",
        "pm_card_bypassPendingInternational",
        "pm_card_domesticPricing",
        "pm_card_avsFail",
        "pm_card_avsLine1Fail",
        "pm_card_avsZipFail",
        "pm_card_avsUnchecked",
        "pm_card_refundFail",
        "pm_card_cvcCheckFail",
        "pm_card_chargeCustomerFail",
        "pm_card_riskLevelElevated",
        "pm_card_riskLevelHighest",
        "pm_card_chargeDeclined",
        "pm_card_chargeDeclinedInsufficientFunds",
        "pm_card_visa_chargeDeclinedLostCard",
        "pm_card_visa_chargeDeclinedStolenCard",
        "pm_card_chargeDeclinedFraudulent",
        "pm_card_chargeDeclinedIncorrectCvc",
        "pm_card_chargeDeclinedExpiredCard",
        "pm_card_chargeDeclinedProcessingError",
    ],
    disputes: [
        "pm_card_createDispute",
        "pm_card_createDisputeProductNotReceived",
        "pm_card_createDisputeInquiry",
    ]
};

const sepa = {
    // The PaymentIntent status transitions from processing to succeeded, but a dispute is immediately created.
    ends_203: "AT591904300235473203"
};



const tokens = {
    basic: [
        "tok_visa",
        "tok_visa_debit",
        "tok_mastercard",
        "tok_mastercard_debit",
        "tok_mastercard_prepaid",
        "tok_amex",
        // "tok_discover", Error: Not supported.
        // "tok_diners", Error: Not supported.
        // "tok_jcb", Error: Not supported.
        // "tok_unionpay", Error: Not supported.
    ],
    americas: [
        "tok_us",
        "tok_br",
        "tok_ca",
        "tok_mx",
        "tok_at",
    ],
    eu_me_af: [
        "tok_be",
        "tok_bg",
        "tok_cy",
        "tok_cz",
        "tok_dk",
        "tok_ee",
        "tok_fi",
        "tok_fr",
        "tok_de",
        "tok_gr",
        "tok_hu",
        "tok_ie",
        "tok_it",
        "tok_lv",
        "tok_lt",
        "tok_lu",
        "tok_mt",
        "tok_nl",
        "tok_no",
        "tok_pl",
        "tok_pt",
        "tok_ro",
        "tok_ru",
        "tok_si",
        "tok_sk",
        "tok_es",
        "tok_se",
        "tok_ch",
        "tok_gb",
        "tok_gb_debit",
    ],
    asia: [
        "tok_au",
        "tok_cn",
        "tok_hk",
        "tok_in",
        "tok_jp",
        // "tok_jcb", Error: Not supported.
        "tok_my",
        "tok_nz",
        "tok_sg",
    ]
};




export {
    all,
    sepa,
    tokens
}