import { type IGameData } from "@/utils/game-data-storage";

/**
 * Whose names a win's effects are looked up under, in order: a leg's the player
 * who checked out and then their team, a match's the team first
 * (utils/teams.ts `legWinCallNames`, `matchWinCallNames`).
 */
export interface WinNames {
  leg: readonly string[];
  match: readonly string[];
}

/** The first `event_<name>` that has an effect, each name as typed and with underscores for its spaces. */
function namedWin(event: "gameshot" | "matchshot", names: readonly string[], triggerPresentCB: (trigger: string) => boolean): string | null {
  for (const name of names) {
    const lower = name.toLowerCase();
    for (const spelling of new Set([ lower, lower.replace(/\s+/g, "_") ])) {
      if (triggerPresentCB(`${event}_${spelling}`)) return `${event}_${spelling}`;
    }
  }
  return null;
}

export async function gameDataProcessor(
  gameData: IGameData,
  oldGameData: IGameData,
  fromWebSocket: boolean = false,
  triggerPresentCB: (trigger: string) => boolean,
  names?: WinNames,
): Promise<string | null> {
  if (!gameData.match) return null;

  let trigger: string | null = null;

  const winner: boolean = gameData.match.gameWinner >= 0;
  const winnerMatch: boolean = gameData.match.winner >= 0;
  // Without the Teams names, the seat's own, as before.
  const seatName = gameData.match.players?.[gameData.match.player]?.name;
  const own = seatName ? [ seatName ] : [];

  if (winnerMatch) {
    const effect = namedWin("matchshot", names?.match ?? own, triggerPresentCB);
    if (effect) return effect;
    if (triggerPresentCB("matchshot")) return "matchshot";
  }
  if (winner) {
    const effect = namedWin("gameshot", names?.leg ?? own, triggerPresentCB);
    if (effect) return effect;
    if (triggerPresentCB("gameshot")) return "gameshot";
  }

  switch (gameData.match!.variant) {
    case "X01":
      trigger = await processX01Data(gameData, oldGameData, fromWebSocket, triggerPresentCB);
      break;
    case "cricket":
      trigger = await processCricketData(gameData, oldGameData, fromWebSocket, triggerPresentCB);
      break;
    case "ATC": // Around The Clock
    case "RTW": // Round The World
    case "Shanghai":
    case "Bob's 27":
      trigger = await processAtcRtwShanghaiData(gameData, oldGameData, fromWebSocket, triggerPresentCB);
      break;
    default:
      console.log(
        `Autodarts Tools: WLED: unhandled game variant ${gameData?.match?.variant} using X01 processor`
      );
      break;
  }

  // fall back to X01 processor when no effect was found
  if (trigger === null && gameData.match!.variant != "X01")
    trigger = await processX01Data(gameData, oldGameData, fromWebSocket, triggerPresentCB);

  return trigger;
}

async function processX01Data(
  gameData: IGameData,
  oldGameData: IGameData,
  fromWebSocket: boolean = false,
  triggerPresentCB: (trigger: string) => boolean
): Promise<string | null> {
  if (!gameData.match) return null;

  const currentThrow = gameData.match.turns[0].throws[gameData.match.turns[0].throws.length - 1];
  if (!currentThrow) return null;

  const isLastThrow: boolean = gameData.match.turns[0].throws.length >= 3;
  let throwName: string = currentThrow.segment.name.toLowerCase();
  const winner: boolean = gameData.match.gameWinner >= 0;
  const winnerMatch: boolean = gameData.match.winner >= 0;
  const busted: boolean = gameData.match.turns[0].busted;
  const points: string = gameData.match.turns[0].points.toString();
  const combinedThrows: string = gameData.match.turns[0].throws
    .map((t) => t.segment.name.toLowerCase())
    .join("_");

  if (throwName === "25" && currentThrow.segment.bed.startsWith("Single")) throwName = "s25";

  // Autodarts never names a dart "Outside". One that lands beside a number is
  // named after it — "M17" — and one entered with the keypad's Miss button or
  // corrected to a bouncer is plain "Miss"; the site's own stats count both.
  // Nothing here matched the documented `outside` trigger, so every miss fell
  // through to `gameon`. The Caller, Sound FX and Animations already map both
  // onto `outside`.
  const missed: boolean = throwName === "miss" || /^m\d{1,2}$/.test(throwName);

  if (winnerMatch && triggerPresentCB("matchshot+" + throwName)) return "matchshot+" + throwName;
  if (winner && triggerPresentCB("gameshot+" + throwName)) return "gameshot+" + throwName;
  // A checkout Teams' partner rule takes back (utils/teams.ts `teamView`).
  if (busted && gameData.match.adtTeams?.bust && triggerPresentCB("partner_rule")) return "partner_rule";
  if (busted && triggerPresentCB("busted")) return "busted";
  if (isLastThrow && triggerPresentCB(combinedThrows)) return combinedThrows;
  if (!busted && isLastThrow && triggerPresentCB(points)) return points;
  if (triggerPresentCB(throwName)) return throwName;
  // After the exact segment, so an effect set up on `m17` or `miss` keeps it.
  if (missed && triggerPresentCB("outside")) return "outside";

  return null;
}

async function processCricketData(
  gameData: IGameData,
  oldGameData: IGameData,
  fromWebSocket: boolean = false,
  triggerPresentCB: (trigger: string) => boolean
): Promise<string | null> {
  return null;
}

async function processAtcRtwShanghaiData(
  gameData: IGameData,
  oldGameData: IGameData,
  fromWebSocket: boolean = false,
  triggerPresentCB: (trigger: string) => boolean
): Promise<string | null> {
  const winner: boolean = gameData.match!.gameWinner >= 0
  const winnerMatch: boolean = gameData.match!.winner >= 0
  if (winnerMatch && triggerPresentCB('matchshot')) return 'matchshot';
  if (winner && triggerPresentCB('gameshot')) return 'gameshot';

  const player: number = gameData.match!.player
  const round: number | string = gameData.match!.round
  var targetField: string | number = 0
  switch (gameData.match!.variant) {
    case 'ATC':
      targetField = gameData.match!.state.targets[player][gameData.match!.state.currentTargets[player]].number
      if (targetField === 25 && ['Double', 'Triple'].some((v) => v === gameData.match!.settings.mode)) {
        targetField = 'bull'
      }
      break;
    case 'RTW':
      targetField = gameData.match!.state.targets[round - 1].number
      break;
    case 'Shanghai':
      targetField = gameData.match!.state.targets[round - 1]
      break;
    case 'Bob\'s 27':
      targetField = round
      break;
  }
  const trigger = `target${targetField}`
  console.log(`Autodarts Tools: WLED: current target ${targetField}`)
  if (triggerPresentCB(trigger)) return trigger
  return null
}
