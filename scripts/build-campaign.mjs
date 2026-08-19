// Builds public/hvb-campaign.json — Humans vs Billionaires campaign
// scaffold: "How the Billionaires Gained Power."
//
// Five history chapters (William the Conqueror, King Leopold, Gilded
// Age America, King of Chicago, Elon Musk) plus a raw-mechanics
// sandbox. Each chapter presets the levers to its era, runs the same
// Georgist machine, and draws Narraton commentary from its own pool.
// Scripted scene TEXT is Doug's — every [TODO] line is a placeholder
// marking where real writing goes. The engine selects; Doug writes.
//
// Run: npm run build:campaign
// Play: http://localhost:8080/theater?game=/hvb-campaign.json

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lines, setLines, actorEl, WORLD_BASE, SIM_RESET, ACTORS, SFX,
  machineHubScene, witnessScene, toyWitnessScenes, tuningScene,
} from './machine-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- chapters

const CHAPTERS = [
  {
    n: 1, id: 'william', title: 'WILLIAM THE CONQUEROR', year: 1066,
    // Conquest: violence becomes property, property becomes rent
    presets: { hierarchy: 90, repression: 80, education: 5, greed: 70, regulation: 5, speculation: 10 },
    introLines: [
      'Narrator: "1066. William takes England by the sword — and keeps it by the ledger."',
      'Narrator: "Violence becomes property. Property becomes rent. Fewer than two hundred men will hold all of England, every one of them holding it of the king."',
    ],
    poolScenes: [
      { id: 'ch1_domesday', name: 'Ch1: The King\'s Book', keys: { hoard: { target: 150, scale: 200 } },
        line: 'Narrator: "Thirteen thousand places, every holder, every value, written down so nothing escapes render. The English call it the Domesday Book — the book of the day of judgment, from which there is no appeal."' },
      { id: 'ch1_oath', name: 'Ch1: The Oath of Salisbury', keys: { prestige: { target: 60, scale: 100 } },
        line: 'Narrator: "Every landholder in England swears it directly to William: all land is held of the king. The barons get their cut and call it honor. The pyramid is complete."' },
      { id: 'ch1_geld', name: 'Ch1: The Geld', keys: { flareUps: { target: 4, scale: 6 }, repression: { target: 85, scale: 100 } },
        line: 'Witness: "The sheriffs ride out again for the land tax. The margin falls; the render does not. That is the whole design."' },
    ],
    finale: {
      requires: [{ variable: 'hoard', operator: '>', value: 300 }],
      lines: [
        'Narrator: "September 1087. The Conqueror is dying at Rouen, thrown against his own saddle. Orderic will write him a deathbed confession: \'I treated the native inhabitants with unreasonable severity... and caused the death of thousands by starvation.\'" ',
        'Narrator: "The historians doubt he said it. Nobody doubts the system survived him. The conquest has hardened into law — and the law is rent."',
      ],
    },
  },
  {
    n: 2, id: 'leopold', title: 'KING LEOPOLD', year: 1885,
    // Pure extraction: a colony run as a private estate
    presets: { greed: 100, repression: 95, education: 10, hierarchy: 80, regulation: 5, speculation: 20 },
    introLines: [
      'Narrator: "1885. The Berlin Conference hands Leopold the Second a million square miles of the Congo — not to Belgium. To him, personally. He will never set foot in it."',
      'Narrator: "The mask is a humanitarian society for suppressing the slave trade. The machine underneath is rubber quotas, enforced by the Force Publique, one severed hand per cartridge fired."',
    ],
    poolScenes: [
      { id: 'ch2_quota', name: 'Ch2: The Quota', keys: { wages: { target: 5, scale: 60 }, greed: { target: 100, scale: 100 } },
        line: 'Casement: "Two hundred and forty persons compelled to supply one ton of foodstuffs per week, receiving the princely sum of fifteen shillings tenpence. The quota is not a wage. It is a sentence."' },
      { id: 'ch2_kodak', name: 'Ch2: The Kodak', keys: { education: { target: 40, scale: 100 } },
        line: 'Witness: "Twain puts the words in the king\'s mouth: \'The kodak has been a sore calamity to us. The most powerful enemy that has confronted us, indeed.\'"' },
      { id: 'ch2_philanthropy', name: 'Ch2: The Philanthropist King', keys: { prestige: { target: 90, scale: 100 } },
        line: 'Witness: "Museums in Brussels, monuments in marble, a press syndicate on retainer — piety, as Twain has it, oozing from every pore. The shell is thick and the rubber keeps coming."' },
    ],
    finale: {
      requires: [{ variable: 'hoard', operator: '>', value: 500 }],
      lines: [
        'Narrator: "1908. The Casement Report, Morel\'s shipping ledgers, and the lantern slides have done what no army did: Belgium takes the Congo away from its king."',
        'Narrator: "He dies the next year. The crowds boo his funeral procession. The population of the Congo has fallen — the historians argue whether by five million or ten."',
      ],
    },
  },
  {
    n: 3, id: 'gilded', title: 'GILDED AGE AMERICA', year: 1879,
    // George's own era: speculation outruns production
    presets: { speculation: 85, greed: 80, education: 30, regulation: 10, hierarchy: 60, repression: 40 },
    introLines: [
      'Narrator: "1879. Railroads, land grants, panics — and a printer in San Francisco publishing the question of the age: why does poverty deepen as progress advances?"',
      'Narrator: "This is the era the machine was built to explain. You are the trust. The margin is yours to squeeze."',
    ],
    poolScenes: [
      { id: 'ch3_landgrant', name: 'Ch3: The Land Grant', keys: { speculation: { target: 90, scale: 100 } },
        line: 'Henry George: "Miles of granted land on either side of the rails, held empty, priced for the future. The settler cannot reach the margin without paying tribute first — and so wages fall everywhere."' },
      { id: 'ch3_gospel', name: 'Ch3: The Gospel of Wealth', keys: { prestige: { target: 80, scale: 100 } },
        line: 'Witness: "Mr. Carnegie preaches that the millionaire is a trustee for the poor. The mill runs twelve-hour shifts. The libraries are very fine."' },
      { id: 'ch3_george', name: 'Ch3: Progress and Poverty', keys: { education: { target: 60, scale: 100 } },
        line: 'Henry George: "There are only three ways any individual can get wealth — by work, by gift, or by theft. The tax upon land values is the taking, by the community, of that value which is the creation of the community."' },
    ],
    finale: {
      requires: [{ variable: 'crisis', operator: '==', value: 1 }],
      lines: [
        'Narrator: "The panic arrives exactly on schedule — land and rail priced on anticipation, crashing into what labor can actually produce. In \'93 nearly one worker in five will be idle."',
        'Henry George: "Depressions are not mysteries. They are the speculative price of land meeting the real product of labor. You have just watched it happen."',
      ],
    },
  },
  {
    n: 4, id: 'capone', title: 'KING OF CHICAGO', year: 1929,
    // The racket as rent: pay for permission to exist on the block
    presets: { repression: 60, greed: 75, regulation: 15, hierarchy: 60, education: 35, speculation: 50 },
    introLines: [
      'Narrator: "1929. Chicago. A hundred and five million dollars in a single year — Guinness will call it the highest private income ever recorded. The racket is just rent with a tommy gun."',
      'Narrator: "Pay for permission to exist on the block. That is the purest rent there is."',
    ],
    poolScenes: [
      { id: 'ch4_protection', name: 'Ch4: Protection', keys: { rent: { target: 30, scale: 40 } },
        line: 'Capone: "Some call it bootlegging. Some call it racketeering. I call it a business. I\'ve made my money supplying a popular demand."' },
      { id: 'ch4_cityhall', name: 'Ch4: City Hall', keys: { regulation: { target: 5, scale: 100 } },
        line: 'Capone: "Every policeman in Chicago gets some of his bread and butter from the taxes I pay. The law is not broken here. It is rented."' },
      { id: 'ch4_hawthorne', name: 'Ch4: The Hawthorne', keys: { flareUps: { target: 4, scale: 6 } },
        line: 'Witness: "Moran\'s cars roll past the Hawthorne and put a thousand rounds through the front of it. Competition among rentiers has turned kinetic."' },
    ],
    finale: {
      requires: [{ variable: 'hoard', operator: '>', value: 400 }],
      lines: [
        'Narrator: "October 17th, 1931. Not the bullets, not the Untouchables — the ledgers. Frank Wilson\'s accounting and a jury swapped at the last minute convict the king of Chicago of tax evasion. Eleven years."',
        'Wilson: "Rent leaves receipts. It always leaves receipts."',
      ],
    },
  },
  {
    n: 5, id: 'musk', title: 'ELON MUSK', year: 2026,
    // The simulation era: prestige as armor
    presets: { greed: 85, speculation: 70, education: 40, regulation: 20, hierarchy: 70, repression: 30 },
    // Musk-era prestige floor — respects a bigger carried legacy
    extraLines: ['[SET prestige = clamp(max(prestige, 80), 0, 100)]'],
    introLines: [
      'Narrator: "The 2020s. First person worth three hundred billion. Then four hundred. Briefly, a trillion. The hoard is priced on futures that do not exist yet."',
      'Narrator: "The prestige shell is no longer marble — it is a mission to save humanity, and nobody audits a mission."',
    ],
    poolScenes: [
      { id: 'ch5_memes', name: 'Ch5: The Feed', keys: { prestige: { target: 95, scale: 100 } },
        line: 'Witness: "The feed is the prestige machine now. The moderation is the repression budget. The timeline decides what the humans get to know."' },
      { id: 'ch5_mars', name: 'Ch5: Mars as Margin', keys: { speculation: { target: 90, scale: 100 } },
        line: 'Witness: "Mars is the ultimate speculative land: a margin that does not exist yet, already priced, already capitalized — while the humans who build the rockets log six times the industry injury rate."' },
      { id: 'ch5_walkout', name: 'Ch5: The Walkout', keys: { flareUps: { target: 4, scale: 6 }, education: { target: 60, scale: 100 } },
        line: 'Witness: "They can read the injury dashboard now. They can read the court filings. The shell corrodes fastest in daylight — that has not changed since the Congo."' },
    ],
    finale: {
      requires: [{ variable: 'prestige', operator: '>=', value: 95 }],
      lines: [
        'Narrator: "Peak prestige. The mission is the product; the humans are a line item. For twelve days in 2026 the hoard reads one trillion dollars — then the speculation corrects, because it always corrects."',
        'Narrator: "Nine hundred and sixty years since the Domesday Book, and the machine is unchanged: rent, hoard, shell. Only the fascism is current."',
      ],
    },
  },
];

// ---------------------------------------------------------------- orders
// The dramatic lever interface: you don't drag a slider, you give an
// order to someone. Each option is a directive scene that applies
// variable deltas and returns to the machine. Reaction lines are
// [TODO Doug] placeholders.

// Researched orders (docs/HVB_RESEARCH.md). Deltas target the
// INDEPENDENT variables only (rent/wages/margin are recomputed each
// tick, so research "rent +N" maps to greed/speculation). Reaction
// lines are first-pass text grounded in the sources — Doug polishes.
const ORDERS = {
  1: {
    prompt: 'The steward kneels. The conquest is won, sire. The ledger is not.',
    options: [
      { id: 'quota_north', label: 'Harry the North into famine', deltas: { repression: 20, greed: 10, hierarchy: 15 },
        line: 'The knights ride tonight, sire. By spring no smoke will rise between York and Durham.' },
      { id: 'survey', label: 'Survey every hide of land', deltas: { greed: 15, regulation: 10, hierarchy: 10 },
        line: 'The commissioners go out at dawn. Not one ox, not one acre, not one pig will escape the book.' },
      { id: 'barons', label: 'Grant the conquered land to your barons', deltas: { hierarchy: 15, greed: 10, speculation: 5 },
        line: 'Fewer than two hundred men will hold all England of you, sire. Every English lord dispossessed.' },
      { id: 'forest', label: 'Impose the forest law', deltas: { speculation: 10, repression: 10, greed: 10 },
        line: 'The New Forest is proclaimed. The commoners are barred the wood — no firewood, no pannage, no game.' },
      { id: 'abbey', label: 'Endow abbeys for your soul', deltas: { prestige: 15, hoard: -30 },
        line: 'Battle Abbey rises where Harold fell. The monks will pray the conquest into a blessing.' },
      { id: 'pardon', label: 'Pardon your enemies from the deathbed', deltas: { repression: -10, prestige: 5 },
        line: 'The prisoners are released, sire. Even Odo. The chroniclers are already writing your remorse.' },
    ],
  },
  2: {
    prompt: 'The agent of the Force Publique stands at attention, Majesty.',
    options: [
      { id: 'quota', label: 'Set impossible rubber quotas', deltas: { greed: 20, repression: 15 },
        line: 'The quotas are posted in every village, Majesty. The district officers understand what shortfall means.' },
      { id: 'hands', label: 'Account for every bullet with a hand', deltas: { repression: 20, greed: 10 },
        line: 'It is done, Majesty. No cartridge wasted. The proof arrives in baskets.' },
      { id: 'hostages', label: 'Take hostages until the rubber comes', deltas: { repression: 15, hierarchy: 10 },
        line: 'The women and children are held at the post. The men are in the forest, tapping.' },
      { id: 'concessions', label: 'Grant monopoly concessions', deltas: { greed: 15, regulation: -15 },
        line: 'ABIR and the Anversoise take their zones, with their own militias. Half the profit is yours.' },
      { id: 'philanthropy', label: 'Found the International African Association', deltas: { prestige: 20, regulation: -10 },
        line: 'Europe applauds your humanitarian society, Majesty. Berlin will hand you a million square miles.' },
      { id: 'inquiry', label: 'Appoint a Commission of Inquiry', deltas: { regulation: 10, repression: -5, prestige: 5 },
        line: 'The commission will confirm some abuses, recommend patience, and leave everything in your hands.' },
    ],
  },
  3: {
    prompt: 'Mr. Frick is on the wire. The Amalgamated will not take the cut.',
    options: [
      { id: 'cutwages', label: 'Cut wages and break the union', deltas: { greed: 20, repression: 15 },
        line: 'Eighteen percent, posted at the mill gate. The fence is going up around Homestead tonight.' },
      { id: 'pinkertons', label: 'Send the Pinkertons up the river', deltas: { repression: 20 },
        line: 'Three hundred men on barges, coming up the Monongahela before dawn.' },
      { id: 'gold', label: 'Corner the gold market', deltas: { speculation: 20, greed: 10 },
        line: 'Mr. Gould is buying, and the Treasury has been... spoken to. Gold goes up until it doesn\'t.' },
      { id: 'landgrant', label: 'Hold the railroad land off the market', deltas: { speculation: 20, greed: 5 },
        line: 'Every granted acre along the right-of-way stays empty until the price ripens. The settlers can rent.' },
      { id: 'libraries', label: 'Give away libraries', deltas: { prestige: 20, education: 5, hoard: -30 },
        line: 'Twenty-five hundred libraries, your name over every door. And books inside them, careless of you.' },
      { id: 'militia', label: 'Have the governor call the militia', deltas: { repression: 20, hierarchy: 10 },
        line: 'The troops entrain for Pittsburgh tonight. Mr. Scott suggests a rifle diet for the strikers.' },
    ],
  },
  4: {
    prompt: 'Your consigliere leans in close, boss.',
    options: [
      { id: 'corner', label: 'Corner the beer and liquor trade', deltas: { greed: 20, hierarchy: 10 },
        line: 'Every barrel in Cook County goes through us now. Cicero too.' },
      { id: 'payoff', label: 'Pay off the police and City Hall', deltas: { regulation: -20, prestige: 5 },
        line: 'The envelopes go out Thursday, same as always. Every cop gets his bread and butter from the taxes you pay.' },
      { id: 'northside', label: 'Settle it with the North Side', deltas: { repression: 20, greed: 5 },
        line: 'Clark Street garage, Thursday morning. Two of the boys will wear uniforms.' },
      { id: 'protection', label: 'Raise the protection rates', deltas: { greed: 15, repression: 10 },
        line: 'The block pays for permission to exist, boss. Rates up citywide, effective Monday.' },
      { id: 'soup', label: 'Open the soup kitchen', deltas: { prestige: 20, hoard: -30 },
        line: 'Free soup, coffee and doughnuts at 935 South State. The line goes right past police headquarters. Photographers welcome.' },
      { id: 'cicero', label: 'Take Cicero on election day', deltas: { repression: 15, hierarchy: 10 },
        line: 'The polls will be... supervised. Cicero votes right this time.' },
    ],
  },
  5: {
    prompt: 'Your chief of staff scrolls the feed, waiting.',
    options: [
      { id: 'linespeed', label: 'Run the line at maximum speed', deltas: { greed: 15, repression: 5, education: -5 },
        line: 'Targets are up. The injury dashboard is... we\'ve made the dashboard green.' },
      { id: 'mars', label: 'Push the Mars timeline over safety', deltas: { greed: 15, speculation: 10, repression: 5 },
        line: 'Saving humanity permeates every part of the company. Everything that stands in the way gets cast aside.' },
      { id: 'platform', label: 'Buy the platform, cut the staff', deltas: { greed: 15, repression: 10, education: -10 },
        line: 'Forty-four billion. Half the staff gone by the weekend. The bird is freed.' },
      { id: 'moderation', label: 'Disband Trust and Safety', deltas: { repression: 10, regulation: -10, education: -10, prestige: 5 },
        line: 'The council is dissolved, the banned accounts are back, and the algorithm learns what not to show.' },
      { id: 'mission', label: 'Brand the save-humanity mission', deltas: { prestige: 20, education: -5 },
        line: 'Not a company — a mission. Nobody audits a mission.' },
      { id: 'fines', label: 'Contest every safety fine', deltas: { regulation: -10, greed: 5 },
        line: 'The eighteen-thousand-dollar fine is under appeal. We expect four hundred seventy-five.' },
    ],
  },
};

// Consequence scenes from the documented record (docs/HVB_RESEARCH.md).
// Narraton surfaces them when the state the orders created matches.
// `lines` is an array: [speaker-attributed dialogue lines].
const OUTCOMES = {
  1: [
    { suffix: 'harrying', name: 'Ch1: The Harrying of the North',
      requires: [{ variable: 'repression', operator: '>=', value: 80 }],
      keys: { flareUps: { target: 4, scale: 6 } },
      lines: [
        'Symeon of Durham: "No village remains inhabited between York and Durham. The land will lie waste nine years."',
        'Orderic Vitalis: "Famine follows the fire. The dead are counted in tens of thousands — the chroniclers say a hundred."',
      ] },
    { suffix: 'waste', name: 'Ch1: Written as Waste',
      requires: [{ variable: 'greed', operator: '>=', value: 70 }],
      keys: { marginHeight: { target: 20, scale: 100 } },
      lines: [
        'Narrator: "The commissioners reach Yorkshire seventeen years after the burning. Beside two of every three villages they write one word: vasta. Waste."',
      ] },
    { suffix: 'rebellion', name: 'Ch1: York Rises',
      requires: [{ variable: 'flareUps', operator: '>=', value: 3 }],
      keys: { repression: { target: 60, scale: 100 } },
      lines: [
        'Witness: "The Northumbrians rally to Edgar Ætheling, and Danish ships stand in the Humber. York is briefly English again."',
      ] },
    { suffix: 'chronicle', name: 'Ch1: The Chronicle Remembers',
      requires: [{ variable: 'education', operator: '>=', value: 25 }],
      keys: { prestige: { target: 40, scale: 100 } },
      lines: [
        'Narrator: "In a monastery, a hand keeps writing the English record: \'Truly, in his time men had much oppression and many injuries.\' The ink outlives the king."',
      ] },
  ],
  2: [
    { suffix: 'baskets', name: 'Ch2: The Baskets',
      requires: [{ variable: 'repression', operator: '>=', value: 80 }],
      keys: { greed: { target: 90, scale: 100 } },
      lines: [
        'Casement: "The soldiers must account for every cartridge. They account in hands. The baskets arrive smoked, so they keep."',
      ] },
    { suffix: 'nsala', name: 'Ch2: Nsala of Wala',
      requires: [{ variable: 'greed', operator: '>=', value: 80 }, { variable: 'repression', operator: '>=', value: 70 }],
      keys: { wages: { target: 5, scale: 60 } },
      lines: [
        'Narrator: "The village of Wala missed its rubber quota. A father named Nsala sits on the mission porch, looking at what the sentries left him of his five-year-old daughter, Boali."',
        'Narrator: "A missionary named Alice Seeley Harris raises a Kodak. The photograph will travel further than any army."',
      ] },
    { suffix: 'morel', name: 'Ch2: The Shipping Clerk',
      requires: [{ variable: 'education', operator: '>=', value: 30 }],
      keys: { prestige: { target: 60, scale: 100 } },
      lines: [
        'Morel: "The ships come home full of rubber and ivory. They sail out carrying guns and chains. That is not trade. Nothing is being bought. It is being taken."',
      ] },
    { suffix: 'report', name: 'Ch2: The Casement Report',
      requires: [{ variable: 'education', operator: '>=', value: 45 }],
      keys: { flareUps: { target: 3, scale: 6 } },
      lines: [
        'Casement: "Forty pages, with testimony appended. The facts are worse than the rumors. Parliament will have every name."',
        'Witness: "Twain writes, Conan Doyle writes, Booker T. Washington speaks. The shell is cracking in public."',
      ] },
  ],
  3: [
    { suffix: 'homestead', name: 'Ch3: Blood on the Monongahela',
      requires: [{ variable: 'repression', operator: '>=', value: 70 }, { variable: 'flareUps', operator: '>=', value: 3 }],
      keys: { greed: { target: 85, scale: 100 } },
      lines: [
        'Narrator: "July 6th, 1892. Three hundred Pinkertons come up the river on barges. The town is waiting on the bank. By nightfall ten men are dead and the Pinkertons surrender."',
        'Witness: "They will sing it in the mill towns: Father was killed by the Pinkerton men."',
      ] },
    { suffix: 'panic', name: 'Ch3: The Panic',
      requires: [{ variable: 'crisis', operator: '==', value: 1 }],
      keys: { speculation: { target: 90, scale: 100 } },
      lines: [
        'Narrator: "Jay Cooke and Company is closed. A quarter of the railroads follow it into bankruptcy. They will call the years that follow the Long Depression."',
        'Henry George: "Land priced on tomorrow crashed into today. The speculation did exactly what speculation does."',
      ] },
    { suffix: 'georgerun', name: 'Ch3: George for Mayor',
      requires: [{ variable: 'education', operator: '>=', value: 45 }],
      keys: { flareUps: { target: 2, scale: 6 } },
      lines: [
        'Narrator: "1886. Henry George polls sixty-eight thousand votes for mayor of New York — ahead of young Theodore Roosevelt — and Tammany men will whisper for years about what happened to the count."',
        'Henry George: "This movement is a revolt of the masses against social injustice."',
      ] },
    { suffix: 'rifle', name: 'Ch3: A Rifle Diet',
      requires: [{ variable: 'repression', operator: '>=', value: 70 }],
      keys: { wages: { target: 8, scale: 60 } },
      lines: [
        'Narrator: "The Pennsylvania Railroad\'s Mr. Scott has a suggestion for the hungry strikers: a rifle diet for a few days, and see how they like that kind of bread."',
        'Narrator: "In Pittsburgh the militia fires. Sixty-one dead. The roundhouse burns all night."',
      ] },
  ],
  4: [
    { suffix: 'massacre', name: 'Ch4: Clark Street',
      requires: [{ variable: 'repression', operator: '>=', value: 80 }],
      keys: { hierarchy: { target: 70, scale: 100 } },
      lines: [
        'Narrator: "February 14th, 1929. Seven men against the garage wall at 2122 North Clark. Two of the shooters wear police uniforms. Seventy rounds."',
        'Narrator: "Frank Gusenberg lives long enough to be asked who shot him. \'Nobody shot me,\' he says, fourteen bullets in him, and dies."',
      ] },
    { suffix: 'soupline', name: 'Ch4: The Soup Kitchen',
      requires: [{ variable: 'prestige', operator: '>=', value: 65 }],
      keys: { wages: { target: 10, scale: 60 } },
      lines: [
        'Narrator: "Thanksgiving 1930: five thousand fed at 935 South State. The line winds past police headquarters, where the host is Public Enemy Number One."',
        'Witness: "The Tribune counts a hundred twenty thousand meals. Nobody prints where the money came from — nobody has to."',
      ] },
    { suffix: 'wilson', name: 'Ch4: The Quiet Accountant',
      requires: [{ variable: 'education', operator: '>=', value: 40 }],
      keys: { hoard: { target: 400, scale: 200 } },
      lines: [
        'Wilson: "The racket leaves no bodies I can use. It leaves ledgers. Cashier\'s checks. A net worth with no declared income. That will be enough."',
      ] },
    { suffix: 'cicero', name: 'Ch4: Cicero Votes',
      requires: [{ variable: 'repression', operator: '>=', value: 60 }],
      keys: { regulation: { target: 10, scale: 100 } },
      lines: [
        'Witness: "Election day in Cicero. The polls are supervised by men with bulges in their coats. The town votes correctly."',
      ] },
  ],
  5: [
    { suffix: 'leblanc', name: 'Ch5: The Trailer at McGregor',
      requires: [{ variable: 'greed', operator: '>=', value: 70 }],
      keys: { wages: { target: 8, scale: 60 } },
      lines: [
        'Narrator: "June 2014. Lonnie LeBlanc, thirty-eight, a retired Marine, sits on a load of insulation to hold it down because there are no straps. The gust takes him headfirst off the trailer."',
        'Narrator: "The fine is seven thousand dollars. His family learns there was an investigation nine years later, from a reporter."',
      ] },
    { suffix: 'injuries', name: 'Ch5: The Dashboard Is Green',
      requires: [{ variable: 'greed', operator: '>=', value: 80 }],
      keys: { repression: { target: 60, scale: 100 } },
      lines: [
        'Reuters: "Brownsville logs 4.8 injuries per hundred workers — six times the industry average. A technician named Francisco Cabada is in a coma; the fine is under appeal, toward four hundred seventy-five dollars."',
        'Reuters: "His wife says: workers are just disposable to them."',
      ] },
    { suffix: 'pulitzer', name: 'Ch5: The Exposé',
      requires: [{ variable: 'education', operator: '>=', value: 50 }],
      keys: { prestige: { target: 70, scale: 100 } },
      lines: [
        'Narrator: "Reuters publishes six hundred documented injuries. The story wins the Pulitzer. The mission narrative meets the injury log."',
        'Witness: "The kodak has been a sore calamity to us — the king said that in 1905. It is still true."',
      ] },
    { suffix: 'diaz', name: 'Ch5: The Verdict',
      requires: [{ variable: 'hierarchy', operator: '>=', value: 65 }, { variable: 'education', operator: '>=', value: 35 }],
      keys: { flareUps: { target: 3, scale: 6 } },
      lines: [
        'Narrator: "A federal jury hears what the Fremont factory called Owen Diaz, and awards him one hundred thirty-seven million dollars. The number will shrink on appeal. The record will not."',
      ] },
  ],
};

// ---------------------------------------------------------------- era headlines
// Period headlines from the research, gated on economic state. Later
// entries beat earlier ones in the ticker, so escalate downward.

const NEWS = {
  1: [
    ["THE KING'S BOOK KNOWS EVERY OX AND ACRE", [['greed', '>=', 60]]],
    ['NEW FOREST CLEARED — COMMONERS BARRED FROM THE WOOD', [['speculation', '>=', 40]]],
    ['GELD RAISED AGAIN — SHERIFFS RIDE TO COLLECT', [['wages', '<=', 15]]],
    ['CASTLES RISE OVER EVERY BURNED TOWN', [['repression', '>=', 70]]],
    ['ELY HOLDS: HEREWARD DEFIES THE KING', [['flareUps', '>=', 3]]],
    ['THE NORTH LIES IN ASHES — NO SMOKE BETWEEN YORK AND DURHAM', [['repression', '>=', 85]]],
  ],
  2: [
    ['RUBBER SOARS — QUOTAS DOUBLE IN THE ABIR ZONE', [['greed', '>=', 70]]],
    ["KING'S PHILANTHROPY 'CIVILIZING' THE CONGO", [['prestige', '>=', 70]]],
    ['SHIPS RETURN FULL OF RUBBER, SAIL OUT FULL OF GUNS', [['education', '>=', 30]]],
    ['CONSUL CASEMENT: THE FACTS ARE WORSE THAN RUMOR', [['education', '>=', 50]]],
    ['THE HANDS OF THE CONGO: BASKETS OF PROOF', [['repression', '>=', 80]]],
  ],
  3: [
    ['CARNEGIE CUTS WAGES 18 PER CENT', [['greed', '>=', 70]]],
    ['SETTLERS PRICED OUT AS RAILROAD HOLDS ITS LAND', [['speculation', '>=', 70]]],
    ['A RIFLE DIET FOR THE HUNGRY, SAYS RAILROAD MAN', [['repression', '>=', 70]]],
    ['GEORGE POLLS 68,000 — LABOR SHAKES TAMMANY', [['education', '>=', 50]]],
    ['PINKERTONS REPULSED AT HOMESTEAD — WORKERS HOLD THE MILL', [['flareUps', '>=', 4]]],
    ["COOKE'S BANK FAILS — PANIC SWEEPS WALL STREET", [['crisis', '==', 1]]],
  ],
  4: [
    ["'I'M A BUSINESSMAN,' SAYS SCARFACE", [['greed', '>=', 70]]],
    ['CICERO VOTES AT GUNPOINT', [['repression', '>=', 60]]],
    ['LINES FOR SOUP STRETCH PAST POLICE HEADQUARTERS', [['wages', '<=', 10]]],
    ['CAPONE FEEDS 5,000 ON THANKSGIVING', [['prestige', '>=', 70]]],
    ['PUBLIC ENEMY NUMBER ONE', [['education', '>=', 50]]],
    ['SEVEN SLAIN IN CLARK STREET GARAGE', [['repression', '>=', 80]]],
  ],
  5: [
    ['TESLA INJURY RATE TOPS INDUSTRY AVERAGE', [['greed', '>=', 60]]],
    ['HALF OF THE STAFF CUT IN A WEEKEND', [['repression', '>=', 50]]],
    ['FIRST PERSON EVER WORTH $300 BILLION', [['hoard', '>', 300]]],
    ['HATE SPEECH RISES ON X, RESEARCHERS FIND', [['education', '<=', 20]]],
    ['PULITZER FOR THE SPACEX INJURY EXPOSÉ', [['education', '>=', 50]]],
    ["AT SPACEX, WORKER INJURIES SOAR IN THE RUSH TO MARS", [['greed', '>=', 80]]],
  ],
};

const newsBlock = ([text, reqs]) => [
  ...reqs.map(([v, op, val]) => `[IF ${v} ${op} ${val}]`),
  `[SET_TEXT news_ticker "${text}"]`,
  ...reqs.map(() => '[ENDIF]'),
];

const chapterNewsLines = (n) => (NEWS[n] || []).flatMap(newsBlock);

// ---------------------------------------------------------------- scene builders

// Per-era state that never carries between chapters
const TRANSIENT_RESET = {
  product: 0,
  rent: 0,
  wages: 30,
  interest: 9,
  marginHeight: 100,
  flareUps: 0,
  crisis: 0,
  wheelAngle: 0,
  commentaryTimer: 0,
  collapseTimer: 0,
  reconTimer: 0,
  singleTax: 0, // each era must re-win the lever
};

const chapterIntro = (ch) => {
  // education is continuity-aware; the other presets are plain levers
  const { education: presetEdu, ...leverPresets } = ch.presets;
  const carry = ch.n > 1
    ? [
        '# CONTINUITY: arriving from the previous chapter carries the',
        '# legacy — the fortune crosses the century. Any other entry',
        '# (menu jump) plays this era fresh and standalone.',
        `[IF chapter == ${ch.n - 1}]`,
        '[SET hoard = hoard * c_legacyHoard]',
        '[SET prestige = clamp(prestige * c_legacyPrestige, 10, 100)]',
        `[SET education = clamp(max(education * c_legacyEdu, ${presetEdu}), 0, 100)]`,
        '[SET publicFund = publicFund * 0.25]',
        '# productivity carries untouched: progress does not regress',
        'Narrator: "The fortune crosses the century. The hoard endures. The humans forget — but not everything."',
        '[ENDIF]',
        `[IF chapter != ${ch.n - 1}]`,
        '[SET hoard = 0]',
        '[SET prestige = 20]',
        '[SET productivity = 1.5]',
        `[SET education = ${presetEdu}]`,
        '[SET publicFund = 0]',
        '[ENDIF]',
      ]
    : [
        '# Chapter 1 always starts the ledger empty',
        '[SET hoard = 0]',
        '[SET prestige = 20]',
        '[SET productivity = 1.5]',
        `[SET education = ${presetEdu}]`,
        '[SET publicFund = 0]',
      ];

  return {
    id: `ch${ch.n}_intro`,
    name: `Chapter ${ch.n}: ${ch.title}`,
    sceneType: 'AGENCY',
    dropId: null,
    stage: [],
    script: lines(
      `# ============ CHAPTER ${ch.n} — ${ch.title} (${ch.year}) ============`,
      '# Era lever presets + legacy continuity. Numbers are guesses: tune live.',
      '',
      '# Re-entering the chapter you are already in resumes it untouched',
      '# (menu round-trips, tuning trips)',
      `[IF chapter == ${ch.n}]`,
      `[SCENE ch${ch.n}_machine]`,
      '[ENDIF]',
      '',
      setLines(TRANSIENT_RESET),
      '',
      carry,
      '',
      setLines(leverPresets),
      ch.extraLines || [],
      `[SET chapter = ${ch.n}]`,
      '',
      ch.introLines,
      '[CHOICE]',
      `- "Take command of the machine" -> ch${ch.n}_manual`,
      `- "Let the century run itself" -> ch${ch.n}_auto`,
      '[/CHOICE]',
    ),
    status: 'work',
  };
};

// Mode scenes: manual command vs autopilot spectating
const modeScenes = (ch) => [
  {
    id: `ch${ch.n}_manual`,
    name: `Ch${ch.n}: Take Command`,
    sceneType: 'AGENCY',
    dropId: null,
    stage: [],
    script: lines(
      '[SET autopilot = 0]',
      '[AUTOPLAY off]',
      `[SCENE ch${ch.n}_machine]`,
    ),
    status: 'work',
  },
  {
    id: `ch${ch.n}_auto`,
    name: `Ch${ch.n}: Autopilot`,
    sceneType: 'WITNESS',
    dropId: null,
    stage: [],
    script: lines(
      '[SET autopilot = 1]',
      '[AUTOPLAY on]',
      `[SCENE ch${ch.n}_machine]`,
    ),
    status: 'work',
  },
];

// The dramatic lever interface: ORDERS button -> your lieutenant waits
// -> a directive applies its deltas and returns to the machine.
const ordersScenes = (ch) => {
  const spec = ORDERS[ch.n];
  const hub = `ch${ch.n}_machine`;
  const menuScene = {
    id: `ch${ch.n}_orders`,
    name: `Ch${ch.n}: Give Orders`,
    sceneType: 'AGENCY',
    dropId: null,
    stage: [actorEl('lieutenant_figure', 'lieutenant', 50, 55, { scale: 1.5 })],
    script: lines(
      `Lieutenant: "${spec.prompt}"`,
      '[CHOICE]',
      spec.options.map(o => `- "${o.label}" -> ch${ch.n}_order_${o.id}`),
      `- "Not now — back to the machine" -> ${hub}`,
      '[/CHOICE]',
    ),
    status: 'work',
  };
  const directives = spec.options.map(o => ({
    id: `ch${ch.n}_order_${o.id}`,
    name: `Ch${ch.n}: ${o.label}`,
    sceneType: 'AGENCY',
    dropId: null,
    stage: [actorEl('lieutenant_figure', 'lieutenant', 50, 55, { scale: 1.5 })],
    script: lines(
      Object.entries(o.deltas).map(([k, v]) =>
        // hoard runs 0..600+; everything else clamps to 0..100
        k === 'hoard'
          ? `[SET hoard = max(hoard + ${v}, 0)]`
          : `[SET ${k} = clamp(${k} + ${v}, 0, 100)]`),
      `Lieutenant: "${o.line}"`,
      `[SCENE ${hub}]`,
    ),
    status: 'work',
  }));
  return [menuScene, ...directives];
};

// Consequence scenes join the chapter's Narraton pool at weight 2:
// when the state the orders created matches, the outcome surfaces.
const outcomeScenes = (ch) =>
  OUTCOMES[ch.n].map(spec => witnessScene(
    `ch${ch.n}_${spec.suffix}`,
    spec.name,
    {
      pool: `ch${ch.n}`,
      requires: spec.requires,
      keys: spec.keys,
      repeatable: true,
      weight: 2,
    },
    `ch${ch.n}_machine`,
    ...spec.lines,
  ));

const chapterPoolScene = (ch, spec) => witnessScene(
  spec.id,
  spec.name,
  {
    pool: `ch${ch.n}`,
    ...(spec.requires ? { requires: spec.requires } : {}),
    keys: spec.keys,
    repeatable: true,
  },
  `ch${ch.n}_machine`,
  `Witness: "${spec.line}"`,
);

const chapterFinale = (ch) => {
  const next = ch.n < 5 ? `ch${ch.n + 1}_intro` : 'menu';
  return witnessScene(
    `ch${ch.n}_finale`,
    `Ch${ch.n} Finale`,
    {
      pool: `ch${ch.n}`,
      requires: ch.finale.requires,
      repeatable: false,
      weight: 5, // when eligible, the finale should usually win
    },
    next,
    ...ch.finale.lines,
    ...(ch.n < 5
      ? ['Narrator: "The fortune crosses the century..."']
      : []),
  );
};

const chapterHub = (ch) => machineHubScene({
  id: `ch${ch.n}_machine`,
  name: `${ch.title} — The Machine`,
  pool: `ch${ch.n}`,
  endings: true,
  buttons: ['tune_button', 'menu_button'],
  ordersButton: `ch${ch.n}_orders_button`,
  panel: 'drama',    // levers move through ORDERS, not sliders
  autopilot: true,   // the billionaire can run it himself
  newsExtra: chapterNewsLines(ch.n),
});

// ---------------------------------------------------------------- fixed scenes

const menu = {
  id: 'menu',
  name: 'Chapter Select',
  sceneType: 'AGENCY',
  dropId: null,
  stage: [],
  script: lines(
    'Narrator: "HUMANS VS BILLIONAIRES — How the Billionaires Gained Power"',
    'Narrator: "Same machine. Nine centuries. [TODO Doug: manifesto hook — Who wins? Billionaires or humans?]"',
    '[CHOICE]',
    '- "1066 — William the Conqueror" -> ch1_intro',
    '- "1885 — King Leopold" -> ch2_intro',
    '- "1879 — Gilded Age America" -> ch3_intro',
    '- "1929 — King of Chicago" -> ch4_intro',
    '- "2026 — Elon Musk" -> ch5_intro',
    '- "Sandbox — the raw machine" -> sandbox_intro',
    '[/CHOICE]',
  ),
  status: 'work',
};

const sandboxIntro = {
  id: 'sandbox_intro',
  name: 'Sandbox Intro',
  sceneType: 'AGENCY',
  dropId: null,
  stage: [],
  script: lines(
    '# Sandbox: default levers, full panel, no endings — the pure toy',
    setLines(SIM_RESET),
    setLines({ greed: 50, speculation: 30, education: 20, regulation: 30, hierarchy: 50, repression: 20 }),
    '[SET chapter = 0]',
    'Narrator: "The raw machine. No century, no story pressure. Pull the levers and watch the theory move."',
    '[SCENE sandbox_machine]',
  ),
  status: 'work',
};

const sandboxHub = machineHubScene({
  id: 'sandbox_machine',
  name: 'Sandbox — The Machine',
  pool: 'witness',
  endings: false,
  buttons: ['tune_button', 'menu_button'],
});

const endingCollapse = {
  id: 'ending_collapse',
  name: 'Ending: COLLAPSE',
  sceneType: 'WITNESS',
  dropId: null,
  stage: [],
  script: lines(
    'Narrator: "COLLAPSE."',
    'Witness: "Wages pinned at survival. Every district burning. The hoard is enormous and it is buying nothing, because there is nothing left to buy — no one below can produce."',
    'Henry George: "This is how Rome went. Not conquered — hollowed. The rent devoured the margin, the margin devoured the wages, and when the humans could no longer stand, the whole structure stood on nothing."',
    'Narrator: "The Conqueror\'s body burst at its own funeral. Leopold\'s crowds booed his casket. Capone\'s ledgers convicted him. The hoard never saves its keeper. It only decides how far there is to fall."',
    '[CHOICE]',
    '- "Begin again" -> menu',
    '[/CHOICE]',
  ),
  status: 'work',
};

const endingReconstitution = {
  id: 'ending_reconstitution',
  name: 'Ending: RECONSTITUTION',
  sceneType: 'WITNESS',
  dropId: null,
  stage: [],
  script: lines(
    'Narrator: "RECONSTITUTION."',
    'Witness: "The lever held. Education kept climbing. The machine still runs — but the rent flows back to the people whose existence creates it. The Charter of the Forest. The Congo reform. The single tax, finally pulled."',
    'Narrator: "THE TEN LITMUS TESTS — ask them of any economy, any century:"',
    'Narrator: "One. Who collects the rent — the community that creates the value, or a private hoard?"',
    'Narrator: "Two. Can ordinary labor still reach the margin without first paying tribute to an owner?"',
    'Narrator: "Three. What share of your life goes to permission-to-exist?"',
    'Narrator: "Four. Is wealth taxed where it is earned — or is labor taxed while rent runs free?"',
    'Narrator: "Five. Is land — or its modern equivalent — withheld on purpose, priced for tomorrow instead of used today?"',
    'Narrator: "Six. Who pays for the enforcers, and whom do they protect?"',
    'Narrator: "Seven. Can the truth be published and read? Does an exposé still corrode prestige?"',
    'Narrator: "Eight. Does philanthropy substitute for justice?"',
    'Narrator: "Nine. When the crash comes, who is protected — the hoard, or the humans?"',
    'Narrator: "Ten. Does the law bend to bribery — or does it hold?"',
    'Witness: "Who wins? That was always the question. Billionaires — or humans."',
    '[CHOICE]',
    '- "Begin again" -> menu',
    '[/CHOICE]',
  ),
  status: 'work',
};

// ---------------------------------------------------------------- game

const chapterScenes = CHAPTERS.flatMap(ch => [
  chapterIntro(ch),
  ...modeScenes(ch),
  chapterHub(ch),
  ...ordersScenes(ch),
  ...ch.poolScenes.map(s => chapterPoolScene(ch, s)),
  ...outcomeScenes(ch),
  chapterFinale(ch),
]);

const sandboxWitness = toyWitnessScenes('sandbox_machine');

const allScenes = [
  menu,
  ...chapterScenes,
  sandboxIntro,
  sandboxHub,
  ...sandboxWitness,
  endingCollapse,
  endingReconstitution,
  tuningScene({ backButton: 'back_button' }),
];

const game = {
  info: {
    title: 'Humans vs Billionaires',
    author: 'Doug Sharp',
    styleGuide: null,
    worldState: { ...WORLD_BASE },
    gameMode: 'INTERACTIVE',
    titleSceneId: 'menu',
    enableAutosave: true,
    customPoses: ['Overworked', 'FlareUp'],
  },
  actors: ACTORS,
  scenes: allScenes,
  drops: [],
  items: [],
  sfx: SFX,
  buttons: [
    // Top-center strip: clear of the gauges (left) and sliders (right)
    {
      id: 'tune_button', name: 'Tune', label: 'TUNE',
      x: 40, y: 4, width: 9, height: 6,
      targetSceneId: 'machine_tuning', status: 'work',
    },
    {
      id: 'back_button', name: 'Back', label: 'BACK',
      x: 50, y: 97, width: 9, height: 5,
      targetSceneId: 'menu', status: 'work',
    },
    {
      id: 'menu_button', name: 'Chapters', label: 'CHAPTERS',
      x: 53, y: 4, width: 12, height: 6,
      targetSceneId: 'menu', status: 'work',
    },
    // Per-chapter ORDERS buttons (button targets are fixed, so one each)
    ...CHAPTERS.map(ch => ({
      id: `ch${ch.n}_orders_button`, name: `Ch${ch.n} Orders`, label: 'ORDERS',
      x: 27, y: 4, width: 10, height: 6,
      targetSceneId: `ch${ch.n}_orders`, status: 'work', style: 'primary',
    })),
  ],
  episodes: [
    ...CHAPTERS.map(ch => ({
      id: `ep_ch${ch.n}`,
      name: `Chapter ${ch.n}: ${ch.title}`,
      description: `${ch.year} — [TODO Doug: chapter description]`,
      sceneIds: [
        `ch${ch.n}_intro`, `ch${ch.n}_manual`, `ch${ch.n}_auto`, `ch${ch.n}_machine`,
        `ch${ch.n}_orders`, ...ORDERS[ch.n].options.map(o => `ch${ch.n}_order_${o.id}`),
        ...ch.poolScenes.map(s => s.id),
        ...OUTCOMES[ch.n].map(o => `ch${ch.n}_${o.suffix}`),
        `ch${ch.n}_finale`,
      ],
      status: 'work',
    })),
    {
      id: 'ep_sandbox',
      name: 'Sandbox',
      description: 'The raw machine: full panel, witness commentary, no endings.',
      sceneIds: ['sandbox_intro', 'sandbox_machine', ...sandboxWitness.map(s => s.id)],
      status: 'work',
    },
    {
      id: 'ep_frame',
      name: 'Frame',
      description: 'Menu, endings, tuning cockpit.',
      sceneIds: ['menu', 'ending_collapse', 'ending_reconstitution', 'machine_tuning'],
      status: 'work',
    },
  ],
};

const outPath = resolve(here, '..', 'public', 'hvb-campaign.json');
writeFileSync(outPath, JSON.stringify(game, null, 2) + '\n', 'utf8');
console.log(`Wrote ${outPath} (${game.scenes.length} scenes)`);
console.log('Play: http://localhost:8080/theater?game=/hvb-campaign.json');
