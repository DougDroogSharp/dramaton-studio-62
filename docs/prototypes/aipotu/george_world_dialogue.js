// George World — dialogue pool (v1, 2026-08-30). ~100 short scene lines, keyed by relationship/context.
// "Doesn't have to be Shakespeare" — quantity + variety so nothing repeats. Tone is keyed by the connector.
// Tokens: {A} = speaker, {B} = other Vita, {THING} = fruit/berries, {TECH} = discovery name.
// Structure is deliberately flat + data-shaped so it can later become editable Dramaton scenes.
// Integration: pick a random line from the matching category, never repeat the last few; two-line exchanges use [A-line, B-line].

window.GW_DIALOGUE = {

  // Boss coercing a worker (coercion spring). Tense, contentious.
  squeeze: [
    ["Faster. The pile doesn't grow itself.", "I'm going as fast as I can."],
    ["Two-thirds of that comes to me. You knew the terms.", "I never agreed to any terms."],
    ["You eat when the quota's met. Not before.", "Then I'll be eating never."],
    ["Do I need to explain the arrangement again?", "…No. I understand the arrangement."],
    ["That basket's light today.", "The trees are light today."],
    ["Rest is a thing you earn.", "I've earned nothing but a sore back."],
    ["Your hands, my hoard. That's the deal.", "It's not a deal. It's a leash."],
    ["Smile while you carry it up.", "There. Is that better?"],
    ["Everyone above you is counting on you.", "And no one below me is left."],
    ["Complain again and I'll find someone hungrier.", "There's always someone hungrier. That's the trick, isn't it."],
  ],

  // Feeding / care (feed pipe). Warm, tender.
  tender: [
    ["Here — you looked faint. Eat.", "You didn't have to."],
    ["I saved the soft ones for you.", "Bless you, {A}."],
    ["Little one's fed. Sleep now.", "*a small contented sound*"],
    ["Nobody starves while I've got a full basket.", "If only everyone thought like you."],
    ["Take mine. I ate at the beach.", "You're a better sort than most, {A}."],
    ["Come on, up you get. There's berries at camp.", "Berries. My favorite word."],
    ["I don't count what I give away.", "That's exactly why people love you."],
  ],

  // FUNERAL — solemn, at a dead serf's grave. Only serfs attend; the betters never come.
  funeral: [
    "One less of us. One more grave.",
    "He carried more than his share. Rest now.",
    "The hill won't miss him. We will.",
    "No hat, no hall, no fuss. Just us, and the wind.",
    "Sleep, friend. You've earned the only rest they ever gave you.",
    "*heads bowed, a long silence*",
    "The Dukes won't come. They never do.",
    "We bury our own. It's always been us.",
  ],

  // Rescue (a collapsed Vita helped back up).
  rescue: [
    ["Easy — I've got you. Small sips.", "…the ground came up so fast."],
    ["Don't try to stand. Just breathe.", "How long was I down?"],
    ["We don't leave people in the dirt here.", "Some places do."],
    ["One arm around me. There.", "Thank you. Truly."],
  ],

  // Peer trade (no spring). Easy, sometimes funny.
  trade: [
    ["Three green for two ripe? Robbery, but fine.", "You'll thank me when the red ones run out."],
    ["I've got more than I can eat. Want some?", "Only if you take my extra reeds."],
    ["Even split, and we both walk away smiling.", "Now THAT'S an economy."],
    ["You bring the fish, I'll bring the fire.", "Deal. Best kind of deal — nobody loses."],
    ["Trade you a berry for a good story.", "Ha — the story's worth two berries, at least."],
  ],

  // NIGHT SNORE — at night one Vita snores and wakes a neighbor, who shushes them.
  night_snore: [
    ["*a loud, rattling snore*", "Shhh! Some of us are trying to sleep."],
    ["*SNORK—snore*", "Roll over, {A}, for pity's sake."],
    ["*rumbling snore*", "…how does anyone sleep next to that."],
    ["*whistling snore*", "One more and I'm dragging your mat to the beach."],
  ],

  // BABY — baby Vitas speak in baby talk.
  baby: [
    "Ga! Ga-ga!",
    "*giggles*",
    "Mama? Mama!",
    "Nana! Want nana!",
    "Uppy! Uppy!",
    "*blows a raspberry*",
    "Baba go?",
    "Mine! Mine-mine!",
    "Boo!",
    "*happy squeal*",
  ],

  // MORNING — on waking: good-mornings, weather speculation, memories of recent events. {B}=a recent actor.
  morning: [
    ["Morning. Sleep any better than me?", "Nobody sleeps well on this island."],
    "Good morning. Still here, still hungry.",
    "Look at that sky — rain by midday, mark me.",
    "Clear morning. Good day for the ridge.",
    "Cooler than yesterday. Winter's testing us.",
    "Smell the smoke? Someone's up early.",
    ["Did you see them crown {B} yesterday?", "Hard to miss. All that bowing."],
    ["They raised another wall on the hall.", "Our backs raised it, more like."],
    ["{B} and their neighbor were at each other's throats last night.", "Over a handful of berries. As if there weren't bigger thieves about."],
    "Another morning. Let's see what they take from us today.",
    ["Remember when we all shared one fire?", "…I remember. Feels like a different island."],
  ],

  // GREETING — a quick wave-hello when two Vitas happen to pass close, if the mood is good.
  greeting: [
    "Morning!",
    "Good to see you.",
    "Hey, you.",
    "Still standing, I see.",
    "Fine day, isn't it.",
    "Off to the ridge?",
    "There you are.",
  ],

  // Ambient small talk. Light, varied.
  smalltalk: [
    ["Some sunset, eh?", "Makes the whole hoard business feel silly for a minute."],
    ["You ever just watch the fish jump?", "Every chance I get."],
    ["My feet hurt in a good way today.", "That's the best kind of tired."],
    ["Think it'll rain?", "Clouds say maybe. My knee says definitely."],
    ["Nine of us on one little island.", "Plenty, if we share it right."],
    ["I heard the turtles are laying tonight.", "Now THAT'S a rare treat."],
    ["Do we know what's over the ridge?", "Berries. And a very long walk."],
    ["Quiet day.", "The best kind."],
    ["Smell that? Rain's coming.", "Or someone's cooking. Hard to say."],
    ["I could sleep for a week.", "Couldn't we all."],
    ["Ever wonder what's past the horizon?", "More water, probably. Always more water."],
    ["The little one took her first steps today.", "Growing up on this strange island."],
    ["I found a shell shaped like a face.", "Keep it. The sea gives few gifts."],
    ["Good crop this season.", "For someone, anyway."],
    ["The nights are getting cooler.", "Pull the fronds closer, then."],
    ["I dreamed I was a bird last night.", "Where did you fly?"],
    ["That cloud looks like a fish.", "They all look like fish to you."],
    ["Have you rested at all today?", "Rest is for the hatted."],
    ["The tide's far out this morning.", "Good for the clam beds."],
    ["Another day, another basket.", "Sing it, friend."],
    ["Did you hear thunder in the night?", "The mountain, more like."],
    ["The young ones don't remember the old ways.", "Were the old ways any better?"],
    ["Sea's calm today.", "Won't last. Nothing does."],
    ["My knees ache. Storm on the way.", "Your knees are never wrong."],
    ["I counted the stars till I lost count.", "That's the only way to count them."],
    ["Someone's been at my berry store.", "Wasn't me. Probably."],
    ["Feels like a long week already.", "It's Tuesday."],
    ["My shadow's longer than I am tonight.", "That's the island telling you to rest."],
    ["I forget what quiet feels like.", "Stand by the water at dawn. It comes back."],
    ["You ever count the waves?", "I get to seven and something distracts me. Always seven."],
    ["The little crabs are marching again.", "Off to their own kingdom, lucky things."],
    ["Smells like rain and woodsmoke.", "The two best smells there are."],
    ["I traded my good sandal for a song.", "Was it a good song?", ],
    ["Some nights the stars feel close enough to pick.", "Leave a few for the rest of us."],
    ["My mother said this island would be paradise.", "Your mother never met a Duke."],
    ["I've decided to be cheerful today.", "Bold. Let me know how it goes."],
    ["The big grove past the ridge is reddening early.", "Don't tell anyone. Let's keep one thing ours."],
    ["Do fish dream, do you think?", "If they do, it's about bigger water."],
    ["I mended the net twice this week.", "Nets and backs. Always something to mend."],
  ],

  // BERRY DISCOVERY — near the start, a Vita finds the ripe red food berries are edible.
  berry_discovery: [
    ["Is it... do you think we can eat this?", "Only one way to find out."],
    ["*tastes the red one* …It's good. It's GOOD. It's FOOD!", "Don't eat them all — show the others!"],
    ["Try it — the RED ones. Not the green. The red!", "We're saved. The whole hill is covered in them."],
    ["The first good news since we washed up.", "Berries. We live on berries. I'll take it."],
    ["So THAT'S what the bushes were for.", "The island's been feeding us all along. We just had to look."],
  ],

  // GROVE DISCOVERY — a scout ventures out, finds the big berry grove over the hill, hauls a load back.
  grove_discovery: [
    ["I'll go see what's past the ridge. Someone has to.", "Careful. And hurry back."],
    ["There's a whole HILLSIDE of them over there! Come see!", "Over the hill? …By the look of that basket, it's worth the walk."],
    ["Look how much I carried. And there's a hundred times more.", "Well. What are we waiting for?"],
    ["Follow me — nobody goes hungry today.", "Lead on, then."],
  ],

  // After a discovery — narrate the benefit ("this is so much easier now").
  discovery_benefit: [
    ["With {TECH}, this took half the morning. Half!", "I'd forgotten what free time felt like."],
    ["Look — the tool does the hard part now.", "We should've thought of this ages ago."],
    ["Whole harvest, no aching back. Imagine.", "Progress, {A}. Actual progress."],
    ["{TECH} changes everything about the ridge climb.", "Everything except who gets the berries."],
    ["Easier work. Same old question of who keeps it.", "One miracle at a time, friend."],
  ],

  // Gossip — reveal character / personality.
  gossip: [
    ["{B}? Stingy as a closed fist.", "Wouldn't share water in a flood."],
    ["Say what you like, {B}'s the kindest of us.", "Gave away her whole basket again yesterday."],
    ["{B} never lifts a finger anymore.", "Funny how the hoard lifts them for you."],
    ["{B} works like the sun'll never come up again.", "And somebody up top loves that about him."],
    ["Watch {B}. That one's always counting.", "Counting everything but people."],
    ["{B} used to be one of us, you know.", "Then the hat went to their head."],
  ],

  // FORMING GOSSIP — early, as hierarchy emerges: who's getting bossy / gathering a following.
  forming_gossip: [
    ["Watch {B} — always gathering folk around him lately.", "For what, though? Nobody made him chief."],
    ["{B}'s got that look. Like he fancies himself in charge.", "Give it a week. He'll be handing out orders."],
    ["First it's favors, then it's orders. That's {B}'s game.", "And we'll all be too tired to notice when it flips."],
    ["Have you seen? {B} doesn't carry his own basket anymore.", "Somebody's carrying it for him. That's how it starts."],
    ["Someone's going to end up on top of this heap.", "My money's on {B}. He's collecting friends like firewood."],
  ],

  // SERF DEFERENCE — a serf speaking TO their Duke or King directly. Submissive, careful.
  serf_deference: [
    "Yes, my lord. Right away.",
    "As you wish. Of course.",
    "Whatever you say, {A}. Whatever you say.",
    "I live to serve, my lord.",
    "Forgive me — it won't happen again.",
    "You honor me by asking.",
    "Of course, of course. Anything.",
  ],

  // LEADER GOSSIP — serfs talking ABOUT the king/dukes among themselves, behind their backs.
  leader_gossip: [
    ["Bowing to his face, grumbling behind his back. Same as us all.", "It's the only freedom we've got left."],
    ["He calls it a hoard. We call it our harvest.", "Say it quieter. Walls have ears, and ears have Dukes."],
    ["The crown eats pineapple. We eat what's left of what we grew.", "Funny how that works out, every single time."],
    ["He wasn't always king, you know. He was one of us.", "That's the part that stings the most."],
    ["One day someone braver than me does something about him.", "…don't look at me."],
  ],

  // Recruiting / leaning on someone to join under you.
  recruit_pressure: [
    ["Stand with me and you'll never go hungry.", "And what do you want in return?"],
    ["I could use a strong pair of hands like {B}'s.", "Using. There's that word."],
    ["Everyone's picking a side. Pick well.", "Or pick none. That's a side too."],
    ["Under me, you're protected. Alone, you're prey.", "Protected from what — you?"],
    ["Little tribute now, big comfort later. Think about it.", "I'm thinking it sounds like a leash with a bow on it."],
    ["The others already agreed. You're the last holdout.", "Then someone has to be."],
  ],

  // Resisting recruitment / coercion.
  resist: [
    ["No. My hands are mine.", "Everyone says that. At first."],
    ["I'd rather be hungry and free.", "We'll see how long that lasts."],
    ["You can't spring what won't bend.", "*a long, cold look*"],
    ["Find your enforcers somewhere else.", "Oh, I will. And then I'll find you again."],
    ["I've seen where that road goes. Not walking it.", "The road walks you eventually, friend."],
  ],

  // KING'S TOUR — the king rarely emerges from his hall to survey his land.
  king_tour: [
    "All this. Mine. Every grain of it.",
    "A fine kingdom. I really should visit it more often.",
    "Look how they toil. Good, good. Carry on.",
    "Yes, yes, very nice. Now — back to the hall.",
    "The air out here is bracing. Once a week is plenty.",
    "Do they know how lucky they are to be mine?",
  ],

  // SURFING LEISURE — king/dukes at play, remarking on the fun (conspicuous leisure, Veblen).
  surf_leisure: [
    "Ahh — THIS is what a crown is for.",
    "You should try this. Oh — you can't. Back to work!",
    "Best waves on the island, and every one is mine.",
    "Rank has its privileges. This is the finest of them.",
    "Let them harvest. I'll be right out here.",
    "Catch this one — perfect. Life is good at the top.",
    "The sea works for no one. Unlike the rest of you.",
    "Wheee! Being in charge is the BEST.",
  ],

  // The one at the top, smug / conspicuous (Veblen).
  boss_smug: [
    ["Rest? I've forgotten the word. Look at all this.", ""],
    ["A crown this heavy — someone has to bear it.", ""],
    ["I earned every spring on that hill.", ""],
    ["They call it a hoard. I call it a garden.", ""],
    ["Leisure is the reward of the deserving.", ""],
  ],

  // Weary worker, to themselves or the sky.
  worker_weary: [
    ["Another basket up the hill. Same as yesterday.", ""],
    ["Funny — the more I make, the less I have.", ""],
    ["My back knows the price of that crown.", ""],
    ["Somewhere there's an island where this isn't the deal.", ""],
    ["One good harvest. That's all I ask. For me.", ""],
  ],

  // MEETING — a boss summons underlings and YELLS at them.
  meeting_yell: [
    "Look at this! Baskets half-full, the lot of you.",
    "I carry this whole operation on my back.",
    "Slack off tomorrow and you'll answer to me.",
    "Do you think the hoard fills itself?",
    "I've seen turtles work harder than this.",
    "Excuses. That's all I ever hear from you.",
    "Double the quota by nightfall. Or go hungry.",
    "Whose island is this? Say it. Whose?",
    "One of you is dragging the rest down. I'm watching.",
  ],

  // MEETING — a boss PRAISES underlings (self-serving, backhanded).
  meeting_praise: [
    "Good work this week. See what we build together?",
    "You made me proud. And rich.",
    "Keep it up and there might be extra berries. Might.",
    "This is what loyalty earns you: my approval.",
    "The finest workers on the island. Mine.",
    "Together we built something. Well — I built something.",
    "You're lucky to labor for a visionary. Truly.",
  ],

  // MEETING — a boss BRAGS about the hoard (conspicuous display / Veblen).
  meeting_brag: [
    "Look at that pile. Have you ever seen the like?",
    "Every fruit up there is a monument to my genius.",
    "They'll sing about this hoard one day.",
    "A crown, a castle, a mountain of berries — and you helped!",
    "You lot could only dream of a pile like mine.",
    "This is what winning looks like. Take a good long look.",
    "I don't even count it anymore. Too much to count.",
    "Behold. The reward of the deserving.",
  ],

  // CEREMONY — a Vita gains a rank; the newly-raised one (or a herald) proclaims it.
  ceremony_proclaim: [
    "Rise and look upon {A}. A rank above you now.",
    "The hat is earned. {A} stands over you today.",
    "Let it be known — {A} leads, and you follow.",
    "Bow your heads. There is a new order on this island.",
    "{A} has climbed. The rest of you will remember your place.",
    "From this day, {A}'s word carries the weight of many.",
  ],

  // CEREMONY — those below swear the oath of obedience.
  ceremony_oath: [
    "I will obey.",
    "Your word is mine to follow, {A}.",
    "I serve. What else is there.",
    "As you say. As you always say.",
    "I promise it. …What choice is a promise, anyway.",
    "Yes, {A}. I hear, and I obey.",
    "My hands are yours to point.",
  ],

  // KAIJU — Godzilla-style sea-beast comes ashore stomping (a rare natural-disaster event). Panic.
  kaiju: [
    "RUN! The sea has teeth today!",
    "The old stories were TRUE — it's come!",
    "Save the berries! No — save yourselves!",
    "Even the king is running. Now THAT'S a sight.",
    "It stepped on the hall! It stepped on the HALL!",
    "Whose god is that? Because it isn't ours.",
  ],

  // DRAGON — lives inside the volcano; the apex demand above even the king. Menacing, entitled.
  dragon: [
    "Feed me, little king. Or I wake.",
    "Where is my tribute? The mountain grows warm.",
    "You wear the crown. I let you wear it.",
    "Sweet gold fruit, or bitter fire. Choose.",
    "I have slept kings before you. I will sleep kings after.",
    "The hoard is mine. You merely gather it for me.",
    "More. It is always, only, more.",
  ],

  // KING FEARS THE DRAGON — the pull from the volcano; the king passes the terror downward.
  king_dragon_fear: [
    "The mountain stirs. I need more, and I need it now.",
    "You think I'm cruel? You've never heard what's under the rock.",
    "Something below us must be fed. Guess with what.",
    "Double everything. Do NOT ask me why.",
    "I answer to a hunger older than all of you.",
  ],

  // ERUPTION CHANT — the weaker Duke carries the king's pineapple up and throws it in to appease the volcano.
  eruption_chant: [
    "Mountain, take the sweetest thing we have. Be still.",
    "For the fire, the fruit of the king. Sleep now, sleep.",
    "We give the pineapple. We beg the peace.",
    "Swallow it, and spare us. Swallow it, and sleep.",
    "One golden crown for the mountain's hunger. Take it.",
    "Why is it always me who climbs to feed the fire?",
  ],

  // OVERSEER — stays at the volcano base, shouts encouragement + threats up at the climbing serfs.
  overseer_shout: [
    "Climb! The king's supper won't fetch itself!",
    "Higher! Don't look down — look up, for me!",
    "Slip, and it's your family that answers for it.",
    "Good, good — nearly there. Don't you DARE drop it.",
    "I'd help, but someone has to supervise. Climb!",
    "The crater won't bite. Probably. Keep going!",
    "Faster up there! I haven't got all day to watch you.",
  ],

  // KING'S FRUIT — worker Vitas sent to climb the volcano for the single royal fruit.
  king_fruit_fetch: [
    ["All the way up there. For one fruit he'll eat alone.", "Careful on the rocks. It's a long fall for his supper."],
    ["Why does only he get to taste it?", "Because he's the one who says so. Climb."],
    ["One fruit, two of us, half a day's climb.", "And not a bite for either of us. Mind the crater."],
  ],

  // KING'S FRUIT — the king receives / eats the royal fruit.
  king_fruit_eat: [
    "The rarest thing on the island. And it's mine alone.",
    "Fetched from the fire itself. As it should be.",
    "Delicious. You may tell them I said so.",
    "One fruit, one king. That's the natural order.",
  ],

  // COURT — the king presides over the weekly assembly in the mead hall, all ranks arrayed.
  court: [
    "Another week. Look how much you've built for me.",
    "The hall is full. Good. Everyone in their place.",
    "Kneel — and be glad there's a king to kneel to.",
    "Dukes to my side. The rest of you, in your rows.",
    "This is order. This is how it should be.",
    "Seven days' labor, and the hall still stands. As do I.",
    "Bow low. It's the one thing you all do together.",
    "I built nothing, and yet all of this is mine. Curious, isn't it.",
  ],

  // DISTRIBUTION — the weekly "largesse": king hands down to Dukes, Dukes trickle one to each serf.
  distribution: [
    "Six fruit to each of my Dukes. See how generous your king is.",
    "Behold my bounty. Given freely. From the pile you filled.",
    "One for you. One for you. The rest — administrative costs.",
    "A fruit for your week's labor. Don't spend it all at once.",
    "One fruit. For a week of my back.",
    "He hands back a crumb of what we grew — and they cheer.",
    "Generosity, they call it. Funny word for it.",
    "Take your one. Bow. Say thank you. Good serf.",
  ],

  // SIESTA — when things go well, serfs get a little midday rest. A sign of a healthy island.
  siesta: [
    "The baskets are full. Close your eyes a while.",
    "A nap at noon. Now this is a good island.",
    "Wake me when the sun moves. Not before.",
    "Rest, while rest is allowed.",
    "Belly full, shade cool, no one shouting. Bliss.",
    "Even the work can wait an hour. Imagine that.",
  ],

  // SERF CHORE — menial tasks handed down; cleaning the hall after the Sunday ceremony, no rest.
  serf_chore: [
    "Sweep the hall. They feasted; I mop.",
    "The ceremony's over for them. For me it's just starting.",
    "Back to work — on the day of rest. Their rest.",
    "Someone dropped a fruit rind. Guess who picks it up.",
    "They bowed, they ate, they left. I stayed.",
    "A day of worship. And a full day's work after.",
    "Tidy the throne room. Mind you don't sit in it.",
  ],

  // DUKE PLOT — dukes, worn down and under-rewarded, conspire against the king.
  duke_plot: [
    "He surfs while we do the work. How long do we suffer it?",
    "The crown isn't so heavy. I could wear it.",
    "One more empty Sunday and I'm done bowing.",
    "Between us… the old king's grip is slipping.",
    "Why should HE have the pineapple? Why not me?",
    "Stand with me, and we'll share what he hoards.",
    "A king is only a Duke the others agreed to kneel to.",
  ],

  // DUKE SQUEEZED — the king leans on a Duke, the Duke calls his serfs and harangues them. Rolls downhill.
  duke_squeezed: [
    "The king wants more. So you'll give more.",
    "Do you think I enjoy this? He leans on me, I lean on you.",
    "His hoard came up short. Guess whose fault that is. Yours.",
    "I got an earful up the hill. Now you get one down here.",
    "More fruit by Sunday, or it's my neck — which means it's yours.",
    "The pressure doesn't stop at me. Lucky you.",
    "I answer to the throne. You answer to me. Simple.",
    "Roll up your sleeves. The crown is watching, and it's hungry.",
  ],

  // TRIBUTE — the dark button: at the end of the ceremony every serf hands the one fruit back to the king.
  tribute: [
    "Tribute. The sweetest word in any language.",
    "One fruit, held for a heartbeat. Then back it goes.",
    "We give it back. Of course we give it back.",
    "I held a fruit once. On a Sunday. Briefly.",
    "You may keep the memory of it. I'll keep the fruit.",
    "So generous of you, to return what I gave you.",
    "The pile is whole again. All is right.",
    "Thank him for the gift. Then hand him the gift.",
  ],

  // BUILDING SCENE — the big communal raising of a structure (esp. all serfs raising the King's Hall).
  building_scene: [
    ["Heave! Up she goes!", "Mind your fingers — that beam's a monster."],
    ["All hands on the hall today.", "The whole island, raising one roof. For one man."],
    ["Straight and true — he'll want it grand.", "He wants everything grand. That's rather the trouble."],
    ["The king's hall, and not one of us will sleep in it.", "Lift anyway. The sooner up, the sooner rest."],
    ["Sing while you lift — it goes faster.", "Nothing goes faster. But it hurts less."],
    ["When it's done, they'll say the KING built it.", "We'll know better. Small comfort, but ours."],
    ["Another wall, another day of my back.", "Put your name in the mortar. No one else will."],
  ],

  // BUILD LABOR — workers fell firs and raise the bosses' houses while they sleep under a lean-to.
  build_labor: [
    ["Another wall for his house. And I sleep under leaves.", "The fronds keep the rain off. Mostly."],
    "Cut it down. He wants a bigger room.",
    "My arms for his roof. Same as it ever was.",
    ["Why do we build the houses we'll never sleep in?", "Ask the hat. I just carry the wood."],
    "Twelve firs felled this week. For one manor.",
    "The lean-to leaks. The manor does not.",
    ["Timber! …mind the bushes, they're the only supper we get.", "Down it comes. Shade and all."],
    "Hungry work, hauling someone else's walls.",
  ],

  // ORCA SIGHTING — rare. A Vita spots the orcas and remarks; nearby Vitas turn to look and remark too.
  orca_sighting: [
    "Orcas! Out past the break — look, look!",
    "Black fins. The big ones are running today.",
    "I've never seen so many. Come and see!",
    "The sea's putting on a show. A rare one.",
    "There — did you see it breach? Did you SEE it?",
    "Even the mountain stops to watch that.",
  ],

  // POPPY — the island's beloved dog. Everyone makes a to-do over her, every rank.
  poppy: [
    "Poppy! There's my girl — who's a good girl?",
    "Look at her go. Fastest paws on the island.",
    "She found me first thing this morning. Made my whole day.",
    "Drop the quota — Poppy wants her belly rubbed.",
    "Even the crown can't scowl at that face.",
    "Good girl, Poppy. The best of us, honestly.",
    "She doesn't care what hat you wear. She loves us all the same.",
    "Who's the real king of this island? It's Poppy. It's always been Poppy.",
    "*Poppy flops over for scratches; work stops entirely*",
    "She brought a stick. We must, of course, throw the stick.",
  ],
};
