import {stripe} from "./../config/stripe";
import _ from "lodash";

/**
 * Async generator to iterate over Stripes pagination pages.
 */
async function* pageIter(f) {
    let has_more = true;
    let starting_after = undefined;
    while (has_more) {
        const res = await f(starting_after);
        if (res.object !== "list") {
            throw Error("f() must return a Stripe pagination list object.");
        }
        has_more = res.has_more;
        if (has_more) {
            starting_after = _.last(res.data).id;
        }
        yield res.data;
    }
}

const deleteAllOfType = async (typeName, typeObj, limit = 100, perBatch = 10) => {
    const f = (starting_after) => typeObj.list({limit, starting_after});
    let batch = [];
    for await(const page of pageIter(f)) {
        for (const {id} of page) {
            const p = async () => {
                await typeObj.del(id);
                console.log(`Deleted ${typeName} ${id}.`);
            };
            batch.push(p());
            if (batch.length === perBatch) {
                await Promise.all(batch);
                batch = [];
            }
        }
    }
    await Promise.all(batch);
};


/**
 * Deletes everything in the Stripe account (assumed to be a test account) to clear the stage.
 * - E.g. When creating a graph of products, prices, subscriptions and customers, each vertex has a reference to another via ID.
 *      - Joins between table/rows are only valid for a entire set of data.
 *      - Alternative: Re-read the state of Stripe and re-continue the timeline.
 *          - Allow stopping and starting the process.
 *
 * Note: This can be done from the web UI, but it is still async.
 */
const deleteAll = async () => {

    await deleteAllOfType("customer", stripe.customers);


    // Note: Cannot delete products after prices are attached (but they can be archived).
    // await deleteAllOfType("product", stripe.products);



    // Can be "detached" from customer but not deleted.
    // await deleteAllOfType("source", stripe.sources);

    // These can be "cancelled" if they are in a certain status.
    // await deleteAllOfType("paymentIntent", stripe.paymentIntents);
    // await deleteAllOfType("paymentMethod", stripe.paymentMethods);

};


export {
    pageIter,
    deleteAll
}