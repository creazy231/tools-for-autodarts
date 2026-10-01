/**
 * Tools' text in each language it speaks.
 *
 * English is the source. Every other language's files are checked against
 * it key for key (`Translation` in utils/i18n/types.ts), and `yarn i18n:check`
 * checks the rest: placeholders, tags, untranslated sentences, literal text
 * left in the code. How to add text: CLAUDE.md, "Translations".
 */

import de from "./de";
import en from "./en";
import nl from "./nl";

import type { Language } from "../utils/i18n/site-language";
import type { Translation } from "../utils/i18n/types";

export type Catalog = typeof en;

export const CATALOGS: Record<Language, Translation<Catalog>> = { en, de, nl };
