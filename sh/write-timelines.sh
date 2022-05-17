real=$(realpath "$(dirname "$0")");
data_dir=$real/../del/data;

# Delete previous failed attempts.
find $data_dir -type d -empty -delete;


read -r -d '' DATA <<EOM
{
    "data_dir": "$data_dir",
    "stripe_sec_key": "$TD_STRIPE_SECRET_KEY_TEST",
    "event_seq_key": "*",
    "fast_mode": false
}
EOM

NODE_TLS_REJECT_UNAUTHORIZED='0' \
    http_proxy='http://localhost:8888' \
    node ./dist/event_seq/cli.js --data="$DATA";
