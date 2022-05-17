import {performance} from 'perf_hooks';
import {strict as assert} from 'assert';
import fs from "fs";
import util from "util";
import tmp from "tmp";


import {config} from "./config";
import _ from "lodash";
import {getClientFromKeys} from "../config/stripe";
import {get_all_events, wait} from './util';
import {log} from "../lib/util";

const exec = util.promisify(require('child_process').exec);


const recur = {
    recursive: true
};

const isObj = (x) => {
    return (
        typeof x === 'object' && x !== null
    )
};


const writeSteps = async (dataDir, stripeSec, timelineKey, timeline, fast_mode) => {
    const targetDir = `${dataDir}/${timelineKey}`;

    if (!fast_mode) {
        // Remove previous runs data (if fast_mode keep it though so it does not need to be re-generated).
        // Assert: valid writable `dataDir`.
        if (fs.existsSync(targetDir)) {
            fs.rmdirSync(targetDir, recur);
        }
        fs.mkdirSync(targetDir, recur);
    }


    const dbs_and_events = await writeToStripe(stripeSec, timeline, fast_mode);

    if (fast_mode) {
        console.log(`fast_mode=true, so steps NOT written to data dir ${dataDir}`);
        return;
    }


    writeToDir(targetDir, dbs_and_events);
    console.log(`Steps written to data dir ${dataDir}`);
};

/**
 * Writes the db_files and events to files so that `cargo test` tests can operate against local files (instead of a remote Stripe account).
 */
const writeToDir = (targetDir, dbs_and_events) => {
    const {
        steps,
        events
    } = dbs_and_events;

    // Dirs
    fs.mkdirSync(`${targetDir}/downloads`, recur);
    for (const [i, step] of steps.entries()) {
        if (_.isObject(step.download)) {
            const destFile = `downloads/dl-step-${i}.sqlite`;
            fs.renameSync(step.download.file, `${targetDir}/${destFile}`);
            step.download.file = destFile;
        }
    }

    // Files
    fs.writeFileSync(`${targetDir}/meta.json`, JSON.stringify({steps}, null, 4));
    fs.writeFileSync(`${targetDir}/events.json`, JSON.stringify({events}, null, 4));
    const steps_md = getStepsAsMd(steps, events);
    fs.writeFileSync(`${targetDir}/steps.md`, steps_md);
};


const getStepsAsMd = (steps, events) => {
    const md = steps.map(({i: step_id, download, tags, event_indexes}) => {
        const eventsSet = event_indexes.map((ei) => ({i: ei, e: events[ei]}));

        let created = null;
        const eventsStr = eventsSet.map(({i, e}) => {
            created = e.created;
            return `- ${i}. \`${e.type}\`, \`${e.data.object.id}\`, \`${e.id}\``;
        });

        let tags_and_dl = [];
        if (tags.length > 0) {
            tags_and_dl.push(`${tags.join("-")}`);
        }

        if (_.isObject(download)) {
            tags_and_dl.push(`has_dl`);
        }

        const createdStr = created === null ? `` : (new Date(created * 1000)).toISOString();

        return [
            `--- step_id-${step_id}, ${tags_and_dl.join(", ")}, ${createdStr} ---`,
            eventsStr.join("\n"),
            "\n"
        ].join("\n");


    }).join("\n");
    return md;
}


/**
 * Writes the timeline to the given Stripe account.
 * - Downloads the account after each Stripe request to a temp SQLite file.
 *      - This allows writing tests that can test a starting download file at any point in the timeline.
 *
 * Tries to determine atomic groups of events (based on events have the same timestamp).
 */
const writeToStripe = async (stripeSec, timeline, fast_mode) => {
    const stripe = getClientFromKeys(stripeSec);


    const get_last_event_id = async () => {
        const all = await stripe.events.list({limit: 1});
        return all.data.length === 0 ? null : all.data[0].id;
    };

    const get_events_after = async (ending_before) => {
        const opts = {limit: 100};
        if (_.isString(ending_before)) {
            // @ts-ignore
            opts.ending_before = ending_before;
        }

        const all = await stripe.events.list(opts);
        return all.data.reverse(); // Ordered `created asc`
    };

    const get_events_after_ts = async (date) => {
        const opts = {
            limit: 100,
            created: {gte: Math.floor(date.getTime() / 1000)}
        };

        const all = await stripe.events.list(opts);
        return all.data.reverse(); // Ordered `created asc`
    };


    const download_assert_no_events_during = async () => {
        const before = await get_last_event_id();
        const file = await rust_download_account_to_sqlite(stripeSec);
        const after = await get_last_event_id();

        assert.equal(before, after);

        return {
            file,
            last_event: after
        }

    };

    const wait_for_events_to_eq = async (wait_for, from_event_id, ensure_order = true, max_wait = 10000) => {
        const s = performance.now();
        let next_set = null;

        while ((performance.now() - s) < max_wait) {
            next_set = await get_events_after(from_event_id);

            const types = next_set.map(e => e.type);
            const wait_for_cp = [...wait_for];

            if (!ensure_order) {
                // Sort types by string to ignore the order when comparing.
                // - E.g. Some Stripe writes create more than two events and the order is not deterministic (E.g. setup intent states).
                // - When writing tests against events written with this option, the order cannot be relied on in assertion clauses (E.g. cannot just assert a write log is equal to the expected one).
                types.sort();
                wait_for_cp.sort();
            }


            if (_.isEqual(wait_for_cp, types)) {
                return next_set;
            }

            await wait(500);
        }

        await open_local_diff(
            {key: "wait_for", val: JSON.stringify(wait_for, null, 4)},
            {key: "next_set", val: JSON.stringify(next_set.map(e => e.type), null, 4)},
        );

        console.error(`Timed out waiting for events to trigger.`, {
            ensure_order,
            wait_for,
            next_set: next_set.map(e => e.type)
        });
        process.exit(1);
    };


    const itemType = (o) => {
        if ("tag" in o) {
            return "tag";
        }
        if ("assert" in o) {
            return "assert";
        }

        if (
            "events" in o &&
            "fn" in o
        ) {
            return "write";
        }
        console.error("Unknown timeline item type.");
        process.exit(1);
    };


    const steps = [];
    let next_tag = null;
    let last_write_ts = null;
    const state = {};
    const events_fast = [];

    const tl = await timeline.get_timeline(stripeSec);
    for (const item of tl) {


        const exec_step = async () => {
            const from = new Date();
            if (itemType(item) === "write") {

                // Is there a better way to encode a (events, js-fn) couple? E.g. (string, AST, edit in dl steps, eval).
                // Issue: the timelines are not as clear as they can be due to having to split a linear script into closures which breaks up the flow making it hard to read procedural scripts.
                // log(item.fn.toString());

                const ret = await item.fn(state);
                if (_.isObject(ret)) {
                    const {ids} = ret;
                    _.assign(state, ids);
                }
            }

            // Ensure no event groups fire on the same second (also it seems that the events stream is behind API writes by at least 500ms).
            await wait(3000);

            return await get_events_after_ts(from);
        };

        if (fast_mode) {
            events_fast.push(await exec_step());
            continue;
        }

        switch (itemType(item)) {
            case "tag":
                assert.equal(next_tag, null);
                next_tag = item.tag;
                break;
            case "assert":
                await item.assert(state);
                break;
            case "write":
                const {file, last_event} = await download_assert_no_events_during();

                if (_.isNumber(last_write_ts)) {
                    // Wait at least 1.1s before going on to the next timeline item.
                    // - Atomic groups are inferred by the second at which events happen at.
                    // - Prevent creating two unrelated events in the same second.
                    await wait(_.max([0, 1100 - (performance.now() - last_write_ts)]));
                }

                last_write_ts = performance.now();
                await exec_step();

                let ensure_order = true;
                if ("opts" in item) {
                    if ("ensure_order" in item.opts) {
                        ensure_order = item.opts.ensure_order;
                    }
                }

                const events = await wait_for_events_to_eq(item.events, last_event, ensure_order);

                const tags = [];
                if (_.isString(next_tag)) {
                    tags.push(next_tag);
                    console.log(`Tag: ${next_tag}, done.`);
                }

                steps.push({
                    i: steps.length,
                    download: {file},
                    tags,
                    event_indexes: events.map(e => e.id), // Replace with relative array index at the end.
                    event_types: events.map(e => e.type)
                });

                next_tag = null;

                break;
        }
    }

    if (fast_mode) {
        // Output events to enter them into the timeline quickly.
        const events_2 = events_fast.map(grp => grp.map(e => e.type));

        const events_3 = events_fast.map(grp => grp.map(e => [
            e.type, new Date(e.created * 1000).toISOString(), e.id, e.data.object.id
        ]));


        log({events_2});
        log({events_3});

        return {
            steps: [],
            events: []
        }
    }

    // Add download to the end that contains all previous writes and events.
    steps.push({
        i: steps.length,
        download: {file: (await download_assert_no_events_during()).file},
        tags: [],
        event_indexes: [],
        event_types: []
    });


    // Assert: Events collected equal events on server exactly.
    const total_events = _.sum(steps.map(ag => ag.event_indexes.length));
    const events = await get_all_events(stripe);
    assert.equal(total_events, events.length);

    const e_cp = [...events.entries()];
    for (const s of steps) {
        s.event_indexes = s.event_indexes.map(str_id => {
            const [i, {id}] = e_cp.shift();
            assert.equal(str_id, id);
            return i;
        });
    }

    return {
        steps,
        events
    }
};

const open_local_diff = async (a, b, ext = "json") => {
    const {name: a_target_file} = tmp.fileSync({mode: 0o644, prefix: `${a.key}-`, postfix: `.${ext}`});
    const {name: b_target_file} = tmp.fileSync({mode: 0o644, prefix: `${b.key}-`, postfix: `.${ext}`});
    fs.writeFileSync(a_target_file, a.val);
    fs.writeFileSync(b_target_file, b.val);


    const res = await exec(`webstorm diff ${a_target_file} ${b_target_file}`);
};

const last_4 = (x) => x.split("/").slice(-4).join("/");

const rust_download_account_to_sqlite = async (stripe_sec_key) => {
    const {name: target_file} = tmp.fileSync();

    try {
        {
            // Build Rust CLI
            console.log(`Building ${last_4(config.dev_bin)}`);
            const res = await exec(config.build_dev_sh);
            // console.log({res});

            const c = {
                cmd: {
                    fn: "download",
                    args: {
                        "from": {
                            "stripe": {
                                "secret_key": stripe_sec_key
                            }
                        },
                        "to": {
                            "sqlite": {
                                "file": target_file
                            }
                        },
                        "options": {
                            "watch": false,
                            "apply_events_after_one_shot_dl": false
                        }
                    }
                }
            };


            // Run Rust CLI
            console.log(`Running ${last_4(config.dev_bin)}`);
            await exec(`${config.dev_bin} --json '${JSON.stringify(c)}'`);
        }

        console.log(`Downloaded Stripe account to file ${target_file} using ${last_4(config.dev_bin)} at ${(new Date()).toISOString()}`);
        return target_file;
    } catch (e) {
        console.error({e});
        process.exit(1);
    }
}

export {
    writeSteps
}
