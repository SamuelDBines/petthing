/** UK responsible person (GPSR) — override via env for legal updates without code deploy. */
export const GPSR_RESPONSIBLE_PERSON = {
  name: process.env.GPSR_RESPONSIBLE_PERSON_NAME?.trim() || "Bishop Co Tech Limited",
  address:
    process.env.GPSR_RESPONSIBLE_PERSON_ADDRESS?.trim() ||
    "14 Riverside Walk, Ashford, Kent TN23 4AR, United Kingdom",
};
