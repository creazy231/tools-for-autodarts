import type en from "../en/soundFx";
import type { Translation } from "../../utils/i18n/types";

export default {
  // Never more lines than the English: the card's text sits in a column of two thirds of a card of fixed height.
  card: "Geluidseffecten afspelen bij een 180, checkout of gewonnen wedstrijd.",
  // The Caller is features.caller, in its possessive: "die van de Caller".
  intro: "Speelt geluidseffecten af bij gebeurtenissen in het spel, zoals gejuich bij een 180 of een kreun bij een bust. Elk geluid wordt afgespeeld bij de triggers die je eraan geeft. Laat ze beginnen met <code>{prefix}</code> om ze te onderscheiden van die van de Caller.",
  audioNotice: "Interageer met de pagina (klik, tik of druk op een toets) om het geluid voor de geluidseffecten in te schakelen.",
  sections: {
    options: "Opties",
  },
  gameModes: {
    description: "De spellen waarin geluiden worden afgespeeld. Lobby- en toernooigeluiden worden in elk spel afgespeeld.",
    intro: "Sound FX speelt alleen geluiden af in de spellen die hier aan staan.",
  },
  list: {
    emptyText: "Upload eigen geluiden, voeg er een toe via een link of genereer er een uit tekst.",
  },
  notifications: {
    // The site's own word for a configuration is configuratie (account.removeAccount.loseItems.boards).
    configNotLoaded: "Configuratie niet geladen",
    sorted: "De geluiden van Sound FX zijn op hun triggers gesorteerd",
    allDeleted: "Alle geluidseffecten zijn verwijderd",
  },
} satisfies Translation<typeof en>;
