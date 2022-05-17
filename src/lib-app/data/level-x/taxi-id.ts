import _ from "lodash";

/**
 * Tax codes must be in the correct format.
 *
 * Data copied from: https://stripe.com/docs/billing/customer/tax-ids
 * - Search/replace:
 *      - ^(.+?)    (.+?)    (.+)?    (.+?)$
 *      - {key: "$2", title: "$1", desc: "$3", example:"$4
 */



// Taken from TS def.
const allIds = [
    'ae_trn', 'au_abn', 'br_cnpj', 'br_cpf', 'ca_bn', 'ca_qst', 'ch_vat', 'cl_tin', 'es_cif', 'eu_vat', 'hk_br', 'id_npwp', 'in_gst', 'jp_cn', 'jp_rn', 'kr_brn', 'li_uid', 'mx_rfc', 'my_frp', 'my_itn', 'my_sst', 'no_vat', 'nz_gst', 'ru_inn', 'ru_kpp', 'sa_vat', 'sg_gst', 'sg_uen', 'th_vat', 'tw_vat', 'us_ein', 'za_vat'
];


// Note: only the example values or an actual tax code will work - each region has its own unique validation.
const data = [
    {key: "ae_trn", title: "United Arab Emirates", desc: "United Arab Emirates TRN", example: "123456789012345"},
    {key: "au_abn", title: "Australia", desc: "Australian Business Number (AU ABN)", example: "12345678912"},
    {key: "br_cnpj", title: "Brazil", desc: "Brazilian CNPJ number", example: "01.234.456/5432-10"},
    {key: "br_cpf", title: "Brazil", desc: "Brazilian CPF number", example: "123.456.789-87"},
    {key: "ca_bn", title: "Canada", desc: "Canadian BN", example: "123456789"},
    {key: "ca_qst", title: "Canada", desc: "Canadian QST number", example: "1234567890TQ1234"},
    {key: "ch_vat", title: "Switzerland", desc: "Switzerland VAT number", example: "CHE-123.456.789 MWST"},
    {key: "cl_tin", title: "Chile", desc: "Chilean TIN", example: "12.345.678-K"},
    {key: "es_cif", title: "Spain", desc: "Spanish CIF number", example: "A12345678"},
    {key: "eu_vat", title: "Austria", desc: "European VAT number", example: "ATU12345678"},
    {key: "eu_vat", title: "Belgium", desc: "European VAT number", example: "BE0123456789"},
    {key: "eu_vat", title: "Bulgaria", desc: "European VAT number", example: "BG0123456789"},
    {key: "eu_vat", title: "Cyprus", desc: "European VAT number", example: "CY12345678Z"},
    {key: "eu_vat", title: "Czech Republic", desc: "European VAT number", example: "CZ1234567890"},
    {key: "eu_vat", title: "Germany", desc: "European VAT number", example: "DE123456789"},
    {key: "eu_vat", title: "Denmark", desc: "European VAT number", example: "DK12345678"},
    {key: "eu_vat", title: "Estonia", desc: "European VAT number", example: "EE123456789"},
    {key: "eu_vat", title: "Spain", desc: "European VAT number", example: "ESA1234567Z"},
    {key: "eu_vat", title: "Finland", desc: "European VAT number", example: "FI12345678"},
    {key: "eu_vat", title: "France", desc: "European VAT number", example: "FRAB123456789"},
    {key: "eu_vat", title: "United Kingdom", desc: "European VAT number", example: "GB123456789"},
    {key: "eu_vat", title: "Greece", desc: "European VAT number", example: "EL123456789"},
    {key: "eu_vat", title: "Croatia", desc: "European VAT number", example: "HR12345678912"},
    {key: "eu_vat", title: "Hungary", desc: "European VAT number", example: "HU12345678912"},
    {key: "eu_vat", title: "Ireland", desc: "European VAT number", example: "IE1234567AB"},
    {key: "eu_vat", title: "Italy", desc: "European VAT number", example: "IT12345678912"},
    {key: "eu_vat", title: "Lithuania", desc: "European VAT number", example: "LT123456789123"},
    {key: "eu_vat", title: "Luxembourg", desc: "European VAT number", example: "LU12345678"},
    {key: "eu_vat", title: "Latvia", desc: "European VAT number", example: "LV12345678912"},
    {key: "eu_vat", title: "Malta", desc: "European VAT number", example: "MT12345678"},
    {key: "eu_vat", title: "Netherlands", desc: "European VAT number", example: "NL123456789B12"},
    {key: "eu_vat", title: "Poland", desc: "European VAT number", example: "PL1234567890"},
    {key: "eu_vat", title: "Portugal", desc: "European VAT number", example: "PT123456789"},
    {key: "eu_vat", title: "Romania", desc: "European VAT number", example: "RO1234567891"},
    {key: "eu_vat", title: "Sweden", desc: "European VAT number", example: "SE123456789123"},
    {key: "eu_vat", title: "Slovenia", desc: "European VAT number", example: "SI12345678"},
    {key: "eu_vat", title: "Slovakia", desc: "European VAT number", example: "SK1234567891"},
    {key: "hk_br", title: "Hong Kong", desc: "Hong Kong BR number", example: "12345678"},
    {key: "id_npwp", title: "Indonesia", desc: "Indonesian NPWP number", example: "12.345.678.9-012.345"},
    {key: "in_gst", title: "India", desc: "Indian GST number", example: "12ABCDE3456FGZH"},
    {key: "jp_cn", title: "Japan", desc: "Japanese Corporate Number (Hōjin Bangō)", example: "1234567891234"},
    {
        key: "jp_rn",
        title: "Japan",
        desc: "Japanese Registered Foreign Businesses’ Registration Number (Tōroku Kokugai Jigyōsha no Tōroku Bangō)",
        example: "12345"
    },
    {key: "kr_brn", title: "Korea, Republic of", desc: "Korean BRN", example: "123-45-67890"},
    {key: "li_uid", title: "Liechtenstein", desc: "Liechtensteinian UID number", example: "CHE123456789"},
    {key: "mx_rfc", title: "Mexico", desc: "Mexican RFC number", example: "ABC010203AB9"},
    {key: "my_frp", title: "Malaysia", desc: "Malaysian FRP number", example: "12345678"},
    {key: "my_itn", title: "Malaysia", desc: "Malaysian ITN", example: "C 1234567890"},
    {key: "my_sst", title: "Malaysia", desc: "Malaysian SST number", example: "A12-3456-78912345"},
    {key: "no_vat", title: "Norway", desc: "Norwegian VAT number", example: "123456789MVA"},
    {key: "nz_gst", title: "New Zealand", desc: "New Zealand GST number", example: "123456789"},
    {key: "ru_inn", title: "Russian Federation", desc: "Russian INN", example: "1234567891"},
    {key: "ru_kpp", title: "Russian Federation", desc: "Russian KPP", example: "123456789"},
    {key: "sa_vat", title: "Saudi Arabia", desc: "Saudi Arabia VAT", example: "123456789012345"},
    {key: "sg_gst", title: "Singapore", desc: "Singaporean GST", example: "M12345678X"},
    {key: "sg_uen", title: "Singapore", desc: "Singaporean UEN", example: "123456789F"},
    {key: "th_vat", title: "Thailand", desc: "Thai VAT", example: "1234567891234"},
    {key: "tw_vat", title: "Taiwan", desc: "Taiwanese VAT", example: "12345678"},
    {key: "us_ein", title: "United States", desc: "United States EIN", example: "12-3456789"},
    {key: "za_vat", title: "South Africa", desc: "South African VAT number", example: "4123456789"}
];

const getRandomTaxId = () => {
    const {key: type, example: value} = _.sample(data);

    return {
        type,
        value
    }
};


export {
    getRandomTaxId
}