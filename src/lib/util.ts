import _ from "lodash";


const fillWith = (times, fn) => {
    const o = [];
    for (let i = 0; i < times; i++) {
        o.push(fn());
    }
    return o;
};

const split = (pcA, a, b) => {
    if (Math.random() > 0.5) {
        return _.isFunction(a) ? a() : a;
    }
    return _.isFunction(b) ? b() : b;
};


const timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};


/**
 * Runs many async calls at the same time, but with a limit of `perBatch`.
 * - Prevent breaching API limits.
 * - Future: Process wide concurrent request config setting.
 *
 * Alternative: Global scheduler, code requests an async request, scheduler keeps "active=x" at any one time, regardless of where in the code the request is made.
 */
const batch = async (f, items, perBatch = 5) => {
    const complete = [];
    for(const c of _.chunk(items, perBatch)) {
        complete.push(await Promise.all(c.map(i => f(i))));
    }

    return complete.flat();
};


/**
 * Print JSON recursively, do not limit depth to 2 like `console.log`.
 */
const log = (o) => {
    console.dir(o, { depth: null });
};


export {
    fillWith,
    split,
    timeout,
    batch,
    log
}