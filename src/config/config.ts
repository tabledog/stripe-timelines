const config = {
    stripe: {
        defaultAccount: {
            secret_key: process.env.TD_STRIPE_SECRET_KEY_TEST
        }
    },
};


export {
    config,
}