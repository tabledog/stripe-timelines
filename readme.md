# Stripe Timelines

Generates test data for [tdog CLI](https://github.com/tabledog/tdog-cli) Rust tests.

- [table.dog](https://table.dog)
- [Sponsor development](https://github.com/sponsors/emadda)

## Writing test data to a Stripe account

- This repo has two uses:
	- (1) Write random data and graph connections to a Stripe account.
		- `./dist/index.js`
		- This is to generate a large set of data with a variety of types.
		- Similar to ["fuzzing"](https://en.wikipedia.org/wiki/Fuzzing).
	- (2) Write an exact timeline to a Stripe account.
        - `./dist/event_seq/cli.js`
        - These "timelines" are exact API interactions that the `tdog_core` Rust package expect.
        - They are recorded as dl.sqlite and events.json files in the `del` folder, and then copied to
          `tdog-cli/crates/tdog_core/src/tests/stripe/event_seq/data/`.
        - See [how-testing-works.md](https://github.com/tabledog/tdog-cli/blob/master/crates/tdog_core/src/tests/stripe/event_seq/notes/how-testing-works.md)

- Set your Stripe secret key before running:
	- `export TD_STRIPE_SECRET_KEY_TEST="rk_test_abc123"`
      