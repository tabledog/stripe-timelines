/**
 * Take from https://stripe.com/docs/js/appendix/supported_browser,
 */
import _ from "lodash";

const supportedLocales = [
    "ar",
    "bg",
    "cs",
    "da",
    "de",
    "el",
    "en",
    "en-GB",
    "es",
    "es-419",
    "et",
    "fi",
    "fr",
    "fr-CA",
    "he",
    "hu",
    "id",
    "it",
    "ja",
    "lt",
    "lv",
    "ms",
    "mt",
    "nb",
    "nl",
    "pl",
    "pt-BR",
    "pt",
    "ro",
    "ru",
    "sk",
    "sl",
    "sv",
    "tr",
    "th",
    "zh",
    "zh-HK",
    "zh-TW"
];

const getRandomLocale = () => _.sample(supportedLocales);

export {
    getRandomLocale
}