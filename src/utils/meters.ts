import { MeterMeaning } from '@/types';

// What the Georgist variables mean, in words.
//
// A gauge that moves teaches nothing on its own — "rent 62" is a number
// about a stranger. Each meter says what its movement means twice:
// once in general terms, once concretely, in a life.
//
// A game can override or extend these through GameData.meters; anything
// not described here simply does not appear in the panel, which is the
// point — an unmoved or unexplained gauge is noise.

export const DEFAULT_METERS: MeterMeaning[] = [
  {
    variable: 'rent',
    label: 'Rent',
    rising: 'The owners of land take a larger share of everything produced, without producing more themselves.',
    falling: 'More of what is made stays with the people who made it.',
    concrete: 'The same week of work buys less bread, and the difference goes to whoever holds the deed.',
    risingIsHarm: true,
  },
  {
    variable: 'wages',
    label: 'Wages',
    rising: 'Labour keeps more of what labour makes.',
    falling: 'Work is worth less, though the work has not changed.',
    concrete: 'A day at the same bench, and less on the table at the end of it.',
    risingIsHarm: false,
  },
  {
    variable: 'hoard',
    label: 'The Hoard',
    rising: 'Wealth is piling up where it will not be spent — out of the economy, into a position.',
    falling: 'The pile is being drawn down or shared out.',
    concrete: 'Money that could be wages sits still, and stillness is what makes it powerful.',
    risingIsHarm: true,
  },
  {
    variable: 'shared',
    label: 'Shared',
    rising: 'More of the common product reaches the people who made it.',
    falling: 'The commons is being enclosed — the shared portion shrinks.',
    concrete: 'A road, a school, a granary that everyone paid for and everyone can use.',
    risingIsHarm: false,
  },
  {
    variable: 'squeeze',
    label: 'Squeeze',
    rising: 'More is being taken from each worker for the same work.',
    falling: 'The grip loosens.',
    concrete: 'Longer hours, the same pay, and a supervisor with a clipboard.',
    risingIsHarm: true,
  },
  {
    variable: 'heat',
    label: 'Heat',
    rising: 'People are angry, and the anger is beginning to organize.',
    falling: 'The temperature drops — through relief, or through fear.',
    concrete: 'Talk in the yard stops when the foreman walks past. Then one day it does not stop.',
    risingIsHarm: false,
  },
  {
    variable: 'spine',
    label: 'Spine',
    rising: 'People are readier to refuse.',
    falling: 'Refusal is getting more expensive than obedience.',
    concrete: 'Whether the man at the front of the line says "no" or looks at his boots.',
    risingIsHarm: false,
  },
  {
    variable: 'aim',
    label: 'Aim',
    rising: 'The force that was pointed outward is turning inward, at the people it was meant to protect.',
    falling: 'The guns point away from the crowd again.',
    concrete: 'The same soldier, the same rifle, a different direction.',
    risingIsHarm: true,
  },
  {
    variable: 'education',
    label: 'Education',
    rising: 'More people can read the arrangement they are inside of.',
    falling: 'Fewer people are equipped to name what is happening to them.',
    concrete: 'A child who can read a contract grows into an adult who asks about one.',
    risingIsHarm: false,
  },
  {
    variable: 'health',
    label: 'Health',
    rising: 'People are stronger, and live longer to enjoy it.',
    falling: 'Bodies are being spent faster than they are being repaired.',
    concrete: 'The cough that goes around the works in winter, and who can afford to stay home with it.',
    risingIsHarm: false,
  },
  {
    variable: 'trust',
    label: 'Trust',
    rising: 'People believe the story they are being told.',
    falling: 'The official account is losing its grip.',
    concrete: 'Whether the newspaper on the table gets read or gets laughed at.',
    risingIsHarm: true,
  },
  {
    variable: 'exposure',
    label: 'Exposure',
    rising: 'What was done in private is becoming known.',
    falling: 'The story is being bought back, buried, or simply outlasted.',
    concrete: 'A photograph that cannot be explained away, in a paper that cannot be bought.',
    risingIsHarm: false,
  },
  {
    variable: 'ruthless',
    label: 'Ruthlessness',
    rising: 'The cost of the strategy is being paid by other people, and that is being accepted.',
    falling: 'Restraint is being chosen, or forced.',
    concrete: 'The order given without asking who is standing where it lands.',
    risingIsHarm: true,
  },
  {
    variable: 'breadPrice',
    label: 'Bread',
    rising: 'The price of the cheapest food is climbing — the first tax the poor pay on everything going wrong.',
    falling: 'Bread is cheaper. The margin between a wage and hunger widens a little.',
    concrete: 'A loaf costs {breadPrice:money}. What a labourer earns in a day has not moved.',
    risingIsHarm: true,
  },
  {
    variable: 'climate',
    label: 'The Land',
    rising: 'The ground, the air and the water are recovering — habitat rescued, damage repaired.',
    falling: 'The commons everyone depends on is being spent: more fires, harder storms, thinner soil.',
    concrete: 'Whether the season arrives when it used to, and whether the river still comes back down.',
    risingIsHarm: false,
  },
  {
    variable: 'plague',
    label: 'Sickness',
    rising: 'Disease is moving through people who cannot afford to stop working.',
    falling: 'The sickness is receding — treated, or survived.',
    concrete: 'The cough that goes around the works, and who can afford to stay home with it.',
    risingIsHarm: true,
  },
  {
    variable: 'care',
    label: 'Care',
    rising: 'More people can be treated when they are ill, whether or not they can pay.',
    falling: 'Treatment is becoming something you buy rather than something you get.',
    concrete: 'A broken arm, and whether the question is "where does it hurt" or "how will you pay".',
    risingIsHarm: false,
  },
  {
    variable: 'singleTax',
    label: 'The Single Tax',
    rising: 'The value the community creates is being collected by the community.',
    falling: 'Land value is flowing back to private hands again.',
    concrete: "George's answer: tax the ground, not the building; the location, not the labour.",
    risingIsHarm: false,
    min: 0,
    max: 1,
  },
];

/** Meters a game declares, on top of (and overriding) the defaults. */
export function metersFor(gameMeters?: MeterMeaning[]): Map<string, MeterMeaning> {
  const byVar = new Map<string, MeterMeaning>();
  for (const m of DEFAULT_METERS) byVar.set(m.variable, m);
  for (const m of gameMeters ?? []) byVar.set(m.variable, m);
  return byVar;
}
