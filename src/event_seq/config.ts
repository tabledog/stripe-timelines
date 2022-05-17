
const td_cli_cargo_root = __dirname.replace(/stripe-simulator.+$/, "tdog-cli");

// Ensure Rust env is the same to avoid rebuilding cached deps.
const build_dev_sh = `${td_cli_cargo_root}/cli/sh/build-dev.sh`;

const dev_bin = `${td_cli_cargo_root}/target/debug/cli`;

const config = {
    build_dev_sh,
    dev_bin
};

export {
    config
}

