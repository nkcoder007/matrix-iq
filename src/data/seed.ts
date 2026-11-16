/* Seed corpus for the Matrix demo.
   Two independent projects, each with its own sources, concepts and links.
   Scoping is enforced by Workspace.documentIds: a document, and everything
   extracted from it, is only ever visible inside its own project. */

import type {
  Cluster,
  Concept,
  Connection,
  Insight,
  KnowledgeDocument,
  Workspace,
} from '../types';

export const WORKSPACE = {
  owner: 'John Smith',
  initials: 'JS',
} as const;

export const WORKSPACES: Workspace[] = [
  {
    id: 'ws-atlas',
    name: 'Personal Atlas',
    description: 'Bees, computer science and one very old sourdough starter.',
    color: '#2563eb',
    createdAt: '2026-10-28',
    documentIds: ['doc-bees', 'doc-raft', 'doc-sourdough', 'doc-drainage', 'doc-systems'],
  },
  {
    id: 'ws-bookclub',
    name: 'Book Club',
    description: 'Shared reading notes on sleep, attention and traffic.',
    color: '#6d5bd0',
    createdAt: '2026-11-04',
    documentIds: ['doc-sleep', 'doc-traffic'],
  },
];

export const CLUSTERS: Cluster[] = [
  {
    id: 'colonies',
    label: 'Bee colonies',
    short: 'Bees',
    color: '#b7791f',
    description: 'How a hive makes decisions and holds itself steady.',
  },
  {
    id: 'consensus',
    label: 'Agreement & consensus',
    short: 'Consensus',
    color: '#2563eb',
    description: 'How computers agree without a central boss.',
  },
  {
    id: 'fermentation',
    label: 'Fermentation',
    short: 'Sourdough',
    color: '#b8455f',
    description: 'Keeping a living culture stable, fed and predictable.',
  },
  {
    id: 'resilience',
    label: 'Failure & recovery',
    short: 'Failure',
    color: '#6d5bd0',
    description: 'Buffers, backups and how small faults spread.',
  },
  {
    id: 'sleep',
    label: 'Sleep & habits',
    short: 'Sleep',
    color: '#0e7490',
    description: 'What sleep debt does to attention and memory.',
  },
  {
    id: 'traffic',
    label: 'Traffic & flow',
    short: 'Traffic',
    color: '#b45309',
    description: 'Why queues appear, spread and disappear.',
  },
];

export const CONCEPTS: Concept[] = [
  // Personal Atlas — bee colonies ------------------------------------------
  {
    id: 'colony-thermoregulation',
    label: 'Keeping the hive warm',
    clusterId: 'colonies',
    mentions: 14,
    documentIds: ['doc-bees', 'doc-systems'],
    definition:
      'Bees hold the nursery near 35 °C by fanning when it gets too hot and huddling together when it gets too cold.',
  },
  {
    id: 'quorum-selection',
    label: 'Swarm voting',
    clusterId: 'colonies',
    mentions: 11,
    documentIds: ['doc-bees', 'doc-raft'],
    definition:
      'Scout bees choose a new home only after enough of them have seen the same place — a vote, not one leader’s decision.',
  },
  {
    id: 'scout-recruitment',
    label: 'Scout bees',
    clusterId: 'colonies',
    mentions: 6,
    documentIds: ['doc-bees'],
    definition:
      'Scouts fly out to look for possible homes and advertise the ones they like by dancing for other scouts.',
  },
  {
    id: 'decentralised-coordination',
    label: 'Teamwork without a boss',
    clusterId: 'colonies',
    mentions: 9,
    documentIds: ['doc-bees', 'doc-raft', 'doc-systems'],
    definition:
      'Big things get done through many small local decisions instead of one queen or manager giving orders.',
  },
  {
    id: 'resource-allocation',
    label: 'Sharing limited energy',
    clusterId: 'colonies',
    mentions: 7,
    documentIds: ['doc-bees', 'doc-drainage'],
    definition:
      'The colony divides its workers and food between raising young, building comb and storing honey for winter.',
  },
  {
    id: 'homeostasis',
    label: 'Staying balanced',
    clusterId: 'colonies',
    mentions: 8,
    documentIds: ['doc-systems', 'doc-bees'],
    definition:
      'A system that keeps itself steady by correcting small changes as they happen, without needing a reset from outside.',
  },

  // Personal Atlas — agreement & consensus ---------------------------------
  {
    id: 'distributed-consensus',
    label: 'Computers agreeing',
    clusterId: 'consensus',
    mentions: 16,
    documentIds: ['doc-raft'],
    definition:
      'Several computers have to settle on the same answer even when some are slow, disconnected or broken.',
  },
  {
    id: 'raft-log',
    label: 'Shared written record',
    clusterId: 'consensus',
    mentions: 12,
    documentIds: ['doc-raft'],
    definition:
      'An ordered list of changes that every computer keeps, so they can all replay the same history.',
  },
  {
    id: 'leader-election',
    label: 'Choosing a leader',
    clusterId: 'consensus',
    mentions: 8,
    documentIds: ['doc-raft'],
    definition:
      'The group picks one member to make decisions until it stops answering, then picks a new one.',
  },
  {
    id: 'failure-detection',
    label: 'Noticing silence',
    clusterId: 'consensus',
    mentions: 10,
    documentIds: ['doc-raft', 'doc-drainage'],
    definition:
      'Deciding that a partner is gone because it stopped sending its regular check-in — always a guess based on a timeout.',
  },
  {
    id: 'eventual-consistency',
    label: 'Catching up later',
    clusterId: 'consensus',
    mentions: 7,
    documentIds: ['doc-raft'],
    definition:
      'Copies are allowed to disagree for a while, as long as they all end up the same once the updates stop.',
  },
  {
    id: 'commit-index',
    label: 'Point of no return',
    clusterId: 'consensus',
    mentions: 5,
    documentIds: ['doc-raft'],
    definition:
      'The moment a change counts as saved: enough copies have it that it will not be taken back.',
  },

  // Personal Atlas — fermentation ------------------------------------------
  {
    id: 'starter-culture',
    label: 'Sourdough starter',
    clusterId: 'fermentation',
    mentions: 13,
    documentIds: ['doc-sourdough'],
    definition:
      'A jar of wild yeast and bacteria kept alive with regular feeding. It is the living core of the bread.',
  },
  {
    id: 'feeding-cadence',
    label: 'Feeding schedule',
    clusterId: 'fermentation',
    mentions: 9,
    documentIds: ['doc-sourdough'],
    definition:
      'How often you add flour and water, which sets how fast the starter grows and how sour it becomes.',
  },
  {
    id: 'culture-stability',
    label: 'Bouncing back',
    clusterId: 'fermentation',
    mentions: 8,
    documentIds: ['doc-sourdough', 'doc-systems'],
    definition:
      'How quickly a starter returns to its normal rise after being ignored, chilled or overheated.',
  },
  {
    id: 'lactic-acid',
    label: 'Sourness from bacteria',
    clusterId: 'fermentation',
    mentions: 6,
    documentIds: ['doc-sourdough'],
    definition:
      'Bacteria in the starter make acid, which gives sourdough its tang and keeps mould and competitors away.',
  },
  {
    id: 'temperature-control',
    label: 'Keeping temperature steady',
    clusterId: 'fermentation',
    mentions: 7,
    documentIds: ['doc-sourdough', 'doc-bees'],
    definition:
      'Holding a living process inside the narrow range where it works best, using steady surroundings rather than quick fixes.',
  },

  // Personal Atlas — failure & recovery ------------------------------------
  {
    id: 'redundancy',
    label: 'Backup copies',
    clusterId: 'resilience',
    mentions: 9,
    documentIds: ['doc-drainage', 'doc-raft'],
    definition:
      'A second copy or a second route, so that one failure does not stop everything — as long as the copy can fail independently.',
  },
  {
    id: 'cascading-failure',
    label: 'One failure spreading',
    clusterId: 'resilience',
    mentions: 8,
    documentIds: ['doc-drainage'],
    definition:
      'A small local fault knocks out the next thing, which knocks out the next, until a whole district is affected.',
  },
  {
    id: 'headroom',
    label: 'Spare capacity',
    clusterId: 'resilience',
    mentions: 6,
    documentIds: ['doc-drainage', 'doc-systems'],
    definition:
      'The unused room a system has before it is completely full. Without it, a small surprise becomes a long queue.',
  },
  {
    id: 'feedback-loops',
    label: 'Feedback loops',
    clusterId: 'resilience',
    mentions: 10,
    documentIds: ['doc-systems', 'doc-bees'],
    definition:
      'When a result feeds back in and makes the next round stronger or weaker, for better or worse.',
  },
  {
    id: 'monitoring',
    label: 'Watching the numbers',
    clusterId: 'resilience',
    mentions: 7,
    documentIds: ['doc-drainage', 'doc-bees'],
    definition:
      'Measuring a system regularly so slow drift is visible before it turns into a failure.',
  },

  // Book Club — sleep & habits ---------------------------------------------
  {
    id: 'sleep-debt',
    label: 'Sleep debt',
    clusterId: 'sleep',
    mentions: 5,
    documentIds: ['doc-sleep'],
    definition:
      'The running total of sleep you have missed. It shows up in mood, memory and how fast you react.',
  },
  {
    id: 'memory-consolidation',
    label: 'Memory consolidation',
    clusterId: 'sleep',
    mentions: 4,
    documentIds: ['doc-sleep'],
    definition:
      'Sleep moves the day’s experiences into longer-term memory, which is why a short night makes yesterday fuzzy.',
  },
  {
    id: 'caffeine',
    label: 'Caffeine half-life',
    clusterId: 'sleep',
    mentions: 4,
    documentIds: ['doc-sleep'],
    definition:
      'Caffeine loses about half its strength every five hours, so an afternoon coffee is still working at bedtime.',
  },
  {
    id: 'reaction-time',
    label: 'Reaction time',
    clusterId: 'sleep',
    mentions: 6,
    documentIds: ['doc-sleep', 'doc-traffic'],
    definition:
      'How long it takes to respond to something, such as the brake lights of the car ahead.',
  },
  {
    id: 'habit-loop',
    label: 'Habit loops',
    clusterId: 'sleep',
    mentions: 3,
    documentIds: ['doc-sleep'],
    definition:
      'A cue triggers a routine that gives a reward, which makes the cue stronger next time. Late nights usually run on one of these.',
  },

  // Book Club — traffic & flow ---------------------------------------------
  {
    id: 'bottleneck',
    label: 'Bottlenecks',
    clusterId: 'traffic',
    mentions: 5,
    documentIds: ['doc-traffic'],
    definition:
      'The narrowest point in a flow sets the speed of everything behind it, no matter how wide the rest of the road is.',
  },
  {
    id: 'ripple-effect',
    label: 'Ripple effect',
    clusterId: 'traffic',
    mentions: 5,
    documentIds: ['doc-traffic'],
    definition:
      'A small slowdown travels backwards as a wave of braking, long after the original cause has driven away.',
  },
  {
    id: 'traffic-spare-capacity',
    label: 'Spare road space',
    clusterId: 'traffic',
    mentions: 4,
    documentIds: ['doc-traffic'],
    definition:
      'The gap between cars. Enough space absorbs small corrections; too little turns them into a traffic jam.',
  },
];

export const DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-bees',
    title: 'Keeping a Rooftop Hive Warm',
    subtitle: 'A season of notes from one city beehive',
    kind: 'pdf',
    clusterId: 'colonies',
    source: 'Rooftop apiary · field notes',
    addedAt: '2026-11-02',
    words: 9340,
    pages: 28,
    originKey: 'bees',
    excerpt:
      'The nursery stayed at 35 °C while the roof was 12 °C. No single bee knows the average; each one just reacts to the air right next to her.',
    summary:
      'Eight months of watching one rooftop hive. The notes cover how the colony fans and huddles to hold its temperature, how scout bees talk the swarm into a new home, and why the whole thing works without a leader.',
    conceptIds: [
      'colony-thermoregulation',
      'quorum-selection',
      'scout-recruitment',
      'decentralised-coordination',
      'resource-allocation',
      'homeostasis',
      'temperature-control',
      'feedback-loops',
      'monitoring',
    ],
  },
  {
    id: 'doc-raft',
    title: 'How Computers Agree Without a Boss',
    subtitle: 'Plain-English notes on agreement, leaders and shared records',
    kind: 'markdown',
    clusterId: 'consensus',
    source: 'Reading notes · 14 sections',
    addedAt: '2026-11-05',
    words: 6120,
    pages: 14,
    originKey: 'raft',
    excerpt:
      'A computer becomes the leader as soon as a majority answers it. The group has not agreed on much yet — only on who decides next.',
    summary:
      'A summary of the Raft algorithm written for a talk at work. It covers how a leader is chosen, how the shared record is copied, and why “most of the machines have it” is enough to call a change saved.',
    conceptIds: [
      'quorum-selection',
      'decentralised-coordination',
      'distributed-consensus',
      'raft-log',
      'leader-election',
      'failure-detection',
      'eventual-consistency',
      'commit-index',
      'redundancy',
    ],
  },
  {
    id: 'doc-sourdough',
    title: 'The Sourdough Journal',
    subtitle: 'Eighteen months of feeding, temperature and recovery',
    kind: 'notes',
    clusterId: 'fermentation',
    source: 'Kitchen journal · 18 entries',
    addedAt: '2026-11-07',
    words: 2810,
    entries: 18,
    originKey: 'sourdough',
    excerpt:
      'Day 412. Left in the fridge for two days at 9 °C. Rise time went from 4h10 to 6h40, then back to 4h20 after three feeds. It remembers less than I fear.',
    summary:
      'A long log of one starter: feeds, room temperatures, rise times and the occasional disaster. The useful pattern is recovery — how many feeds it takes to get back to normal, and which mistakes it never recovers from.',
    conceptIds: [
      'starter-culture',
      'feeding-cadence',
      'culture-stability',
      'lactic-acid',
      'temperature-control',
    ],
  },
  {
    id: 'doc-drainage',
    title: 'Why the District 4 Drains Failed',
    subtitle: 'What a flood review found about backups that weren’t independent',
    kind: 'pdf',
    clusterId: 'resilience',
    source: 'After-action review · 36 pages',
    addedAt: '2026-11-10',
    words: 11480,
    pages: 36,
    excerpt:
      'The system did not fail because it lacked capacity. It failed because two of its three pumps shared the same electrical riser.',
    summary:
      'A review of a drainage network that flooded during a storm it was supposed to handle. It separates “we have backups” from “our backups can fail independently”, and shows how one broken riser took out a whole district.',
    conceptIds: [
      'resource-allocation',
      'failure-detection',
      'redundancy',
      'cascading-failure',
      'headroom',
      'monitoring',
    ],
  },
  {
    id: 'doc-systems',
    title: 'Notes on How Systems Stay Stable',
    subtitle: 'Reading notes on feedback, buffers and balance',
    kind: 'notes',
    clusterId: 'resilience',
    source: 'Reading notes · 9 entries',
    addedAt: '2026-11-12',
    words: 3260,
    entries: 9,
    excerpt:
      'A stock is a memory. A flow is a decision. Most arguments about a system are really arguments about which of the two we are looking at.',
    summary:
      'Notes collected across three books on systems thinking, organised around feedback, buffers and staying balanced. The recurring point: stability is something a system actively does, not something it simply has.',
    conceptIds: [
      'colony-thermoregulation',
      'decentralised-coordination',
      'homeostasis',
      'culture-stability',
      'headroom',
      'feedback-loops',
    ],
  },
  {
    id: 'doc-sleep',
    title: 'Why Sleep Changes Everything',
    subtitle: 'Notes from three books on sleep and attention',
    kind: 'notes',
    clusterId: 'sleep',
    source: 'Book club notes · 7 entries',
    addedAt: '2026-11-08',
    words: 2400,
    entries: 7,
    excerpt:
      'After four nights of six hours, my reaction test was 19% slower — about the same as two drinks. I felt fine, which is the unsettling part.',
    summary:
      'Reading notes on sleep debt, memory and caffeine, mixed with a week of simple reaction-time tests. The clear takeaway is that sleep loss hides itself: you adapt to feeling tired while your responses keep getting slower.',
    conceptIds: [
      'sleep-debt',
      'memory-consolidation',
      'caffeine',
      'reaction-time',
      'habit-loop',
    ],
  },
  {
    id: 'doc-traffic',
    title: 'How Traffic Jams Appear From Nowhere',
    subtitle: 'Notes on flow, bottlenecks and small delays',
    kind: 'markdown',
    clusterId: 'traffic',
    source: 'Book club notes · 9 sections',
    addedAt: '2026-11-11',
    words: 3800,
    pages: 9,
    excerpt:
      'Nobody braked hard. One driver lifted off the accelerator for a second, and an hour later the queue was still there.',
    summary:
      'Notes on how a full road turns a tiny correction into a wave of braking. Covers bottlenecks, the value of the gap between cars, and why adding road capacity sometimes fixes nothing.',
    conceptIds: ['bottleneck', 'ripple-effect', 'traffic-spare-capacity', 'reaction-time'],
  },
];

type ConnectionSeed = Omit<Connection, 'isBridge'>;

const CONNECTION_SEEDS: ConnectionSeed[] = [
  // Cross-domain and within-domain links for Personal Atlas -----------------
  {
    id: 'c-quorum-consensus',
    from: 'quorum-selection',
    to: 'distributed-consensus',
    type: 'similar',
    strength: 0.9,
    confidence: 0.82,
    suggested: true,
    title: 'Same rule, different worlds',
    explanation:
      'Both groups wait for a fixed number of supporters before acting: scout bees for a new home, computers for a saved change. Neither needs a leader to count the votes.',
  },
  {
    id: 'c-quorum-commit',
    from: 'quorum-selection',
    to: 'commit-index',
    type: 'similar',
    strength: 0.82,
    confidence: 0.74,
    suggested: true,
    title: 'Two ways to end a debate',
    explanation:
      'Scouts stop dancing for a site once enough of them agree, just as a change becomes final once enough computers have copied it. Both are thresholds, not opinions.',
  },
  {
    id: 'c-scout-leader',
    from: 'scout-recruitment',
    to: 'leader-election',
    type: 'similar',
    strength: 0.72,
    confidence: 0.68,
    title: 'Campaigns and dances',
    explanation:
      'Both are popularity contests with a stopping rule: scouts advertise a good site, computers ask for votes, and support fades when the campaign stops.',
  },
  {
    id: 'c-scout-quorum',
    from: 'scout-recruitment',
    to: 'quorum-selection',
    type: 'leads',
    strength: 0.88,
    confidence: 0.87,
    title: 'Recruitment comes first',
    explanation:
      'Recruitment is the step before the vote: the more scouts dance for a site, the sooner the group reaches its threshold.',
  },
  {
    id: 'c-quorum-decentral',
    from: 'quorum-selection',
    to: 'decentralised-coordination',
    type: 'partOf',
    strength: 0.9,
    confidence: 0.88,
    title: 'One piece of a leaderless system',
    explanation:
      'Swarm voting is one mechanism inside the hive’s larger habit of deciding without a boss. It is a component, not a sibling, of teamwork without a boss.',
  },
  {
    id: 'c-decentral-consensus',
    from: 'decentralised-coordination',
    to: 'distributed-consensus',
    type: 'related',
    strength: 0.91,
    confidence: 0.9,
    title: 'Local rules, global agreement',
    explanation:
      'Both ask how a group settles on one answer with nobody in charge. The only real difference is that one group is made of bees and the other is made of servers.',
  },
  {
    id: 'c-decentral-homeo',
    from: 'decentralised-coordination',
    to: 'homeostasis',
    type: 'influences',
    strength: 0.74,
    confidence: 0.7,
    title: 'Steady states without a thermostat',
    explanation:
      'Many small local corrections add up to a steady whole, whether the system is a hive holding its temperature or a group of machines agreeing on one answer.',
  },
  {
    id: 'c-thermo-homeo',
    from: 'colony-thermoregulation',
    to: 'homeostasis',
    type: 'partOf',
    strength: 0.87,
    confidence: 0.86,
    title: 'One job inside a bigger one',
    explanation:
      'Keeping the nursery warm is one of the jobs that keeps the hive stable, so it belongs inside the broader idea of staying balanced.',
  },
  {
    id: 'c-feedback-thermo',
    from: 'feedback-loops',
    to: 'colony-thermoregulation',
    type: 'causes',
    strength: 0.85,
    confidence: 0.84,
    title: 'The loop holds the temperature',
    explanation:
      'Fanning cools the nest, which reduces the need to fan. That loop — not any single bee — is what actually keeps the nursery at 35 °C.',
  },
  {
    id: 'c-monitor-thermo',
    from: 'monitoring',
    to: 'colony-thermoregulation',
    type: 'influences',
    strength: 0.52,
    confidence: 0.49,
    title: 'Measuring changes what you manage',
    explanation:
      'Adding a thermometer to the hive changed which bee behaviours the keeper noticed and adjusted, which is the same effect telemetry has on any system.',
  },
  {
    id: 'c-thermo-temp',
    from: 'colony-thermoregulation',
    to: 'temperature-control',
    type: 'similar',
    strength: 0.75,
    confidence: 0.71,
    title: 'Two temperature keepers',
    explanation:
      'One is a hive and one is a proofing box, but both hold a living process inside a narrow temperature band using sensors and steady corrections.',
  },
  {
    id: 'c-thermo-lactic',
    from: 'colony-thermoregulation',
    to: 'lactic-acid',
    type: 'influences',
    strength: 0.62,
    confidence: 0.58,
    title: 'Warmth sets the speed',
    explanation:
      'Temperature sets the pace of both: warmer brood develops faster and warmer starter sours faster, until the heat starts killing the organisms doing the work.',
  },
  {
    id: 'c-resource-feed',
    from: 'resource-allocation',
    to: 'feeding-cadence',
    type: 'related',
    strength: 0.67,
    confidence: 0.64,
    title: 'Both are rationing problems',
    explanation:
      'One divides food and workers across a colony, the other divides flour and time across feeds. Both decide what to leave short so the core survives.',
  },
  {
    id: 'c-resource-headroom',
    from: 'resource-allocation',
    to: 'headroom',
    type: 'leads',
    strength: 0.61,
    confidence: 0.58,
    title: 'Reserve is a decision',
    explanation:
      'Choosing to keep capacity unused is what creates spare room later. Headroom is a decision made in advance, not luck.',
  },
  {
    id: 'c-starter-lactic',
    from: 'starter-culture',
    to: 'lactic-acid',
    type: 'causes',
    strength: 0.92,
    confidence: 0.9,
    title: 'The culture makes the sourness',
    explanation:
      'The bacteria living in the starter produce the acid. Remove them and the culture stops being sourdough and becomes flour and water.',
  },
  {
    id: 'c-feed-starter',
    from: 'feeding-cadence',
    to: 'starter-culture',
    type: 'influences',
    strength: 0.86,
    confidence: 0.83,
    title: 'The schedule sets the state',
    explanation:
      'How often you feed changes how fast the starter grows and how sour it gets, which is why a steady schedule matters more than the exact recipe.',
  },
  {
    id: 'c-feedback-feed',
    from: 'feedback-loops',
    to: 'feeding-cadence',
    type: 'influences',
    strength: 0.74,
    confidence: 0.72,
    title: 'Rise time is the feedback',
    explanation:
      'A starter that doubles too fast is underfed; one that barely moves is too sour. Bakers read rise time the way operators read queue length.',
  },
  {
    id: 'c-homeo-stability',
    from: 'homeostasis',
    to: 'culture-stability',
    type: 'similar',
    strength: 0.72,
    confidence: 0.69,
    title: 'Judged by the return, not the peak',
    explanation:
      'Both are measured by how quickly they return to normal after a disturbance, not by how good they look at their best moment.',
  },
  {
    id: 'c-failure-stability',
    from: 'failure-detection',
    to: 'culture-stability',
    type: 'similar',
    strength: 0.8,
    confidence: 0.77,
    suggested: true,
    title: 'Timeouts for living things',
    explanation:
      'A missed check-in and an ignored starter are both judged by a timeout. Set it too short and you react to noise; too long and you react too late.',
  },
  {
    id: 'c-cascade-stability',
    from: 'cascading-failure',
    to: 'culture-stability',
    type: 'similar',
    strength: 0.66,
    confidence: 0.63,
    title: 'Small neglect, large failure',
    explanation:
      'A missed feed lowers the acid balance, which slows the culture, which lets competitors in. It looks sudden but started days earlier.',
  },
  {
    id: 'c-redundancy-starter',
    from: 'redundancy',
    to: 'starter-culture',
    type: 'similar',
    strength: 0.55,
    confidence: 0.52,
    title: 'A backup that has to be independent',
    explanation:
      'A dried backup or a second jar is a spare copy of a living thing. It only helps if it was not raised from the same contaminated batch.',
  },
  {
    id: 'c-eventual-stability',
    from: 'eventual-consistency',
    to: 'culture-stability',
    type: 'similar',
    strength: 0.69,
    confidence: 0.66,
    title: 'Converging, not always correct',
    explanation:
      'Copies are allowed to disagree for a while and still end up the same, just as a neglected starter recovers its rhythm after a few feeds.',
  },
  {
    id: 'c-raft-starter',
    from: 'raft-log',
    to: 'starter-culture',
    type: 'related',
    strength: 0.58,
    confidence: 0.55,
    suggested: true,
    title: 'History as the useful artifact',
    explanation:
      'A shared record and a feeding journal are both written history. The current state is less useful than the ordered record of how it got there.',
  },
  {
    id: 'c-leader-raft',
    from: 'raft-log',
    to: 'leader-election',
    type: 'depends',
    strength: 0.93,
    confidence: 0.92,
    title: 'The record depends on one writer',
    explanation:
      'The shared record only stays in order while one leader at a time is allowed to write. Two writers would create two histories that cannot be merged.',
  },
  {
    id: 'c-failure-leader',
    from: 'failure-detection',
    to: 'leader-election',
    type: 'causes',
    strength: 0.81,
    confidence: 0.79,
    title: 'Silence starts the election',
    explanation:
      'Noticing that a leader has gone quiet is the event that starts the vote for a new one. Faster detection means faster recovery.',
  },
  {
    id: 'c-consensus-eventual',
    from: 'distributed-consensus',
    to: 'eventual-consistency',
    type: 'opposes',
    strength: 0.83,
    confidence: 0.81,
    title: 'Answer now or answer consistently',
    explanation:
      'Strong agreement refuses to answer while the network is split; eventual consistency answers anyway and accepts that copies differ for a while.',
  },
  {
    id: 'c-failure-cascade',
    from: 'failure-detection',
    to: 'cascading-failure',
    type: 'influences',
    strength: 0.78,
    confidence: 0.75,
    title: 'Detection limits the spread',
    explanation:
      'How fast a failure is noticed decides how far it spreads. Quick detection turns a district-wide outage into a local one.',
  },
  {
    id: 'c-redundancy-cascade',
    from: 'redundancy',
    to: 'cascading-failure',
    type: 'opposes',
    strength: 0.8,
    confidence: 0.78,
    title: 'A spare path breaks the chain',
    explanation:
      'A second route stops a cascade — but only if it does not share the same weak point as the original. Shared power was exactly how the District 4 pumps failed together.',
  },
  {
    id: 'c-headroom-monitor',
    from: 'headroom',
    to: 'monitoring',
    type: 'depends',
    strength: 0.64,
    confidence: 0.61,
    title: 'You cannot see spare room without numbers',
    explanation:
      'Free capacity is invisible until it is measured, so keeping headroom depends on watching the numbers regularly.',
  },
  {
    id: 'c-monitor-failure',
    from: 'monitoring',
    to: 'failure-detection',
    type: 'leads',
    strength: 0.89,
    confidence: 0.88,
    title: 'Watching the numbers leads to noticing silence',
    explanation:
      'Regular measurement is how a quiet partner gets noticed. The alert is the last step in the chain, not the first signal.',
  },
  {
    id: 'c-quorum-stability',
    from: 'quorum-selection',
    to: 'culture-stability',
    type: 'related',
    strength: 0.5,
    confidence: 0.47,
    title: 'Both wait for a threshold',
    explanation:
      'Both hinge on a threshold being crossed before anything changes, even though one is a vote and the other is chemistry.',
  },

  // Book Club --------------------------------------------------------------
  {
    id: 'c-sleep-reaction',
    from: 'sleep-debt',
    to: 'reaction-time',
    type: 'causes',
    strength: 0.86,
    confidence: 0.84,
    title: 'A short night shows up in the brake pedal',
    explanation:
      'After four short nights the reaction test slowed by about a fifth. That is enough to turn a comfortable gap into a near miss.',
  },
  {
    id: 'c-caffeine-debt',
    from: 'caffeine',
    to: 'sleep-debt',
    type: 'causes',
    strength: 0.81,
    confidence: 0.8,
    title: 'Coffee borrows from tonight',
    explanation:
      'A 3pm coffee still has a quarter of its caffeine at 1am, so it adds directly to tonight’s sleep debt.',
  },
  {
    id: 'c-reaction-ripple',
    from: 'reaction-time',
    to: 'ripple-effect',
    type: 'causes',
    strength: 0.84,
    confidence: 0.79,
    suggested: true,
    title: 'One slow reaction becomes a queue',
    explanation:
      'One driver reacts a second late, the next brakes a little harder, and the delay travels backwards. The sleep notes explain the first domino; the traffic notes explain the wave.',
  },
  {
    id: 'c-spare-bottleneck',
    from: 'traffic-spare-capacity',
    to: 'bottleneck',
    type: 'influences',
    strength: 0.76,
    confidence: 0.74,
    title: 'The gap decides whether the bottleneck bites',
    explanation:
      'The same narrow lane flows at 2am and jams at 8am. The bottleneck is not the road alone — it is the road with no spare room between cars.',
  },
  {
    id: 'c-spare-ripple',
    from: 'traffic-spare-capacity',
    to: 'ripple-effect',
    type: 'opposes',
    strength: 0.73,
    confidence: 0.72,
    title: 'Space absorbs the wave',
    explanation:
      'Room between cars soaks up small corrections. Once the space is gone, a single tap on the brake becomes a standing wave.',
  },
  {
    id: 'c-debt-memory',
    from: 'sleep-debt',
    to: 'memory-consolidation',
    type: 'opposes',
    strength: 0.83,
    confidence: 0.81,
    title: 'Short sleep blocks filing',
    explanation:
      'Deep sleep is when the day’s memories are filed away. Cutting sleep short removes the window consolidation depends on, which is why yesterday feels patchy.',
  },
  {
    id: 'c-habit-debt',
    from: 'habit-loop',
    to: 'sleep-debt',
    type: 'influences',
    strength: 0.7,
    confidence: 0.68,
    title: 'The cue moves bedtime',
    explanation:
      'The 10pm phone cue is what pushes bedtime to 1am. Changing the cue moves sleep debt more reliably than deciding to try harder.',
  },
  {
    id: 'c-bottleneck-ripple',
    from: 'bottleneck',
    to: 'ripple-effect',
    type: 'influences',
    strength: 0.75,
    confidence: 0.73,
    title: 'The narrow point starts the wave',
    explanation:
      'The narrowest point sets up the slowdown that then travels backwards. Remove the narrow point and the wave has nothing to grow from.',
  },
];

const conceptCluster = new Map(CONCEPTS.map((concept) => [concept.id, concept.clusterId]));

export const CONNECTIONS: Connection[] = CONNECTION_SEEDS.map((connection) => ({
  ...connection,
  isBridge: conceptCluster.get(connection.from) !== conceptCluster.get(connection.to),
}));

export const INSIGHTS: Insight[] = [
  {
    id: 'ins-quorum',
    kind: 'bridge',
    title: 'The same voting rule in two worlds',
    summary:
      'Scout bees and servers both end a debate with a count, but only one of them tunes the count to the cost of being wrong.',
    rationale:
      'The hive settles when roughly 12 of 15 observed scouts agree on one cavity: a high, fixed threshold that prefers a good-enough home over speed. Raft saves a change with a bare majority. Comparing the two suggests a threshold that rises when a wrong answer is expensive to undo.',
    conceptIds: ['quorum-selection', 'distributed-consensus', 'commit-index'],
    confidence: 0.84,
    edgeId: 'c-quorum-commit',
    createdAt: '2026-11-13',
  },
  {
    id: 'ins-heartbeat',
    kind: 'bridge',
    title: 'How long do you wait before calling something dead?',
    summary:
      'A starter that missed a feed is not dead. A server that missed one check-in might be. Both are decided by a timeout you chose in advance.',
    rationale:
      'Failure detection is a timeout problem: too short and you act on noise, too long and everything stalls. The journal shows the same asymmetry — the starter survives 48 hours of neglect but not a cold snap to 5 °C. Writing the wait time down turns it into a decision instead of a reflex.',
    conceptIds: ['failure-detection', 'culture-stability'],
    confidence: 0.77,
    edgeId: 'c-failure-stability',
    createdAt: '2026-11-13',
  },
  {
    id: 'ins-headroom',
    kind: 'bridge',
    title: 'Spare room is chosen in advance',
    summary:
      'Drains, hives and starter jars all fail the same way: they run out of buffer before they run out of function.',
    rationale:
      'The District 4 review found the network was not under-built, it was under-measured. The apiary notes make the same point about the hive’s energy budget. Neither source treats remaining buffer as a number, only the absence of failure as a state.',
    conceptIds: ['headroom', 'resource-allocation', 'colony-thermoregulation'],
    confidence: 0.68,
    edgeId: 'c-resource-headroom',
    createdAt: '2026-11-14',
  },
  {
    id: 'ins-gap-leader',
    kind: 'gap',
    title: 'Nothing connects choosing a leader to sharing resources',
    summary:
      'One source explains how a leader is chosen; another explains how work is divided. No concept links the two.',
    rationale:
      'Choosing a leader changes which machine gets the busy share of the work, which is a resource problem in disguise. A small concept connecting the two would fill a real hole in this project.',
    conceptIds: ['leader-election', 'resource-allocation'],
    confidence: 0.62,
    createdAt: '2026-11-14',
  },
  {
    id: 'ins-gap-monitoring',
    kind: 'gap',
    title: 'Nothing asks what happens when the monitor fails too',
    summary:
      'Both sources measure their systems, and both assume the measuring equipment sits safely outside them.',
    rationale:
      'The hive sensors and the drain telemetry are both treated as observers. During the District 4 flood the telemetry shared the failing power riser, so the dashboard stayed green while the pumps were under water. This is the clearest blind spot across both documents.',
    conceptIds: ['monitoring', 'cascading-failure', 'headroom'],
    confidence: 0.58,
    createdAt: '2026-11-12',
  },
  {
    id: 'ins-tension-quorum',
    kind: 'tension',
    title: 'Two different voting thresholds',
    summary:
      'Scout bees essentially require a supermajority; computers commit with a bare majority. Both call themselves safe.',
    rationale:
      'The disagreement is not an error — it reflects a different cost of being wrong. A bad nest is expensive to undo; a bad log entry can be overwritten. Recording the cost of reversal next to each threshold would turn the contradiction into a design choice.',
    conceptIds: ['quorum-selection', 'commit-index', 'distributed-consensus'],
    confidence: 0.71,
    edgeId: 'c-quorum-consensus',
    createdAt: '2026-11-11',
  },
  {
    id: 'ins-gap-recovery',
    kind: 'gap',
    title: 'No source says how to confirm a recovery',
    summary:
      'Recovery is described three times, but nobody describes how they check that it actually happened.',
    rationale:
      'The journal tracks rise time, the review tracks pump throughput and the notes track lag — all stand-ins. None of the sources defines a recovery criterion, which is why the same argument keeps resurfacing. This is the highest-value missing concept in the corpus.',
    conceptIds: ['culture-stability', 'failure-detection', 'monitoring'],
    confidence: 0.64,
    createdAt: '2026-11-09',
  },
  {
    id: 'ins-commute',
    kind: 'bridge',
    title: 'Your commute runs on last night’s sleep',
    summary:
      'A delayed reaction in one car becomes a five-minute queue. Two documents from different shelves describe the same second.',
    rationale:
      'The sleep notes measured a 19% slower reaction after four short nights. The traffic notes show that a one-second correction at speed is enough to start a backward wave. Put together, a bad night’s sleep is a traffic intervention with no roadworks and no signage.',
    conceptIds: ['reaction-time', 'ripple-effect', 'sleep-debt'],
    confidence: 0.79,
    edgeId: 'c-reaction-ripple',
    createdAt: '2026-11-14',
  },
  {
    id: 'ins-sleep-recovery',
    kind: 'gap',
    title: 'Nothing covers recovering from a bad night',
    summary:
      'The notes are clear about what sleep debt costs, and silent about how to pay it back.',
    rationale:
      'There is plenty on caffeine, habit loops and reaction time, but no entry tests recovery: extra sleep, earlier bedtimes or a nap. Adding one would turn the reading notes into a usable routine.',
    conceptIds: ['sleep-debt', 'habit-loop'],
    confidence: 0.61,
    createdAt: '2026-11-13',
  },
  {
    id: 'ins-pattern-stability',
    kind: 'pattern',
    title: 'Nothing stays steady by standing still',
    summary:
      'Hives, sourdough and computer clusters all keep their balance by correcting constantly, not by holding still.',
    rationale:
      'Across three unrelated sources the same shape appears: a target, a measurement, and a small correction repeated forever. The hive fans in bursts, the starter rises and falls, the cluster re-checks its leader. None of them is stable because nothing changes — they are stable because something is always being adjusted.',
    conceptIds: ['homeostasis', 'feedback-loops', 'culture-stability'],
    confidence: 0.74,
    createdAt: '2026-11-14',
  },
  {
    id: 'ins-pattern-threshold',
    kind: 'pattern',
    title: 'Every group waits for a number before it moves',
    summary:
      'Bees, servers and bakers all decide in the same order: measure, reach a threshold, then act together.',
    rationale:
      'The three sources describe very different decisions — a new home, a saved change, a feeding schedule — but each one waits for a count before committing. Recognising the pattern makes it easier to ask the useful question: is this threshold set for the cost of being wrong, or just inherited?',
    conceptIds: ['quorum-selection', 'distributed-consensus', 'feeding-cadence'],
    confidence: 0.7,
    createdAt: '2026-11-15',
  },
  {
    id: 'ins-pattern-compound',
    kind: 'pattern',
    title: 'Small delays compound into big ones',
    summary:
      'A slow reaction and a late bedtime both look trivial alone; in traffic and in sleep, they stack.',
    rationale:
      'The traffic notes show one second of hesitation becoming a five-minute queue. The sleep notes show short nights accumulating into a reaction-time deficit. Both documents describe the same arithmetic: small, repeated delays are not averaged out, they are added up.',
    conceptIds: ['ripple-effect', 'sleep-debt', 'reaction-time'],
    confidence: 0.72,
    createdAt: '2026-11-15',
  },
];

