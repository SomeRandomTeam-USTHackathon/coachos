import type { Creator, Issue, MockMember, Season, TwinConfig } from "./types";

export const CREATOR: Creator = {
  name: "Alex Carter",
  brand: "FORGE",
  tagline: "Strength & habit coaching that fits real life",
};

export const SEASONS: Season[] = [
  { id: "s1", title: "Season 1 — Foundations", month: "September 2026" },
  { id: "s2", title: "Season 2 — Momentum", month: "October 2026" },
];

export const ISSUES: Issue[] = [
  {
    id: "i1",
    seasonId: "s1",
    title: "The 2-Minute Start: Why Tiny Habits Beat Motivation",
    summary:
      "Motivation is unreliable. This issue shows how to shrink any habit to a two-minute on-ramp, anchor it to an existing cue, and protect the streak for the first 30 days.",
    keyPoints: [
      "Motivation is a mood, not a system — design beats willpower every time",
      "Shrink any habit until it takes less than two minutes to start",
      "Use implementation intentions: 'After X, I will do Y'",
      "Never miss twice — one slip is an accident, two is a new pattern",
      "Track the streak, not the outcome, for the first 30 days",
    ],
    body: [
      "Most habits fail in the first ten days because they start too big. A forty-minute workout requires motivation; a two-minute one requires almost nothing. The goal in week one is not fitness — it is proving to yourself that you are the kind of person who shows up.",
      "Use an implementation intention to remove the decision: 'After I pour my morning coffee, I will do ten squats.' Research on habit formation shows that anchoring a new behavior to an existing cue roughly doubles follow-through compared to relying on willpower.",
      "Make the first rep stupidly small. Want to run? Put on your shoes and step outside — that is the whole habit for the first week. Want to read more? One page. The two-minute version is not a compromise; it is the on-ramp that makes the full version possible.",
      "Track the streak, not the outcome, for the first thirty days. Weight, speed, and word counts lag; showing up leads. Put an X on a calendar every day you start, and protect the chain.",
      "And when you miss — because you will — apply the never-miss-twice rule. One skipped day is an accident; two is the start of a new pattern. The best habit builders are not the most disciplined; they are the fastest to restart.",
    ],
    access: "free",
    publishedAt: "2026-09-02",
    readMinutes: 4,
  },
  {
    id: "i2",
    seasonId: "s1",
    title: "Designing a Morning Routine You'll Actually Keep",
    summary:
      "A five-step morning chain — fixed wake time, water before caffeine, five minutes of movement, thirty phone-free minutes, one anchor cue — built to survive real life.",
    keyPoints: [
      "Wake at a fixed time seven days a week — consistency beats the time itself",
      "Drink a full glass of water before any caffeine",
      "Five minutes of movement beats a perfect hour that never happens",
      "No phone for the first 30 minutes of the day",
      "Anchor the whole chain to one cue until it runs on autopilot",
    ],
    body: [
      "A morning routine is won the night before. Set a fixed wake time and keep it seven days a week — your circadian rhythm does not know it is Saturday. Consistency of wake time matters more than the time itself.",
      "Drink a full glass of water before any caffeine. You wake up mildly dehydrated, and coffee on an empty, dry stomach is why so many people feel jittery by 10 a.m. Water first, coffee twenty minutes later.",
      "Move for five minutes before you look at any screen. Push-ups, a short walk, stretching — the point is to tell your nervous system the day has started on your terms. Five minutes of movement beats a perfect hour that never happens.",
      "Keep your phone outside arm's reach for the first thirty minutes. The moment you open notifications, you are reacting to other people's priorities. Protect the first half hour like it is a meeting with your future self.",
      "Anchor the whole chain to one cue: alarm rings, feet on floor, water, movement, then — and only then — phone. Same order every day until it runs on autopilot, usually three to four weeks.",
    ],
    access: "member",
    publishedAt: "2026-09-09",
    readMinutes: 4,
  },
  {
    id: "i3",
    seasonId: "s1",
    title: "Strength Basics: Squat, Hinge, Press",
    summary:
      "The three movement patterns every member masters first: bodyweight squat standards, the hip hinge behind the deadlift, and a ribs-down overhead press — plus sane progression.",
    keyPoints: [
      "Master twenty clean bodyweight squats before loading a barbell",
      "The hip hinge: push hips back, soft knees, flat back, weight in heels",
      "Overhead press with ribs down — no arching into a standing bench press",
      "Add 2.5 kg per week, not per session — small jumps compound",
      "Film one working set weekly from the side; the camera does not lie",
    ],
    body: [
      "Before you load a barbell, own the bodyweight squat. Feet shoulder-width, chest up, hips below knees, heels down. Twenty clean reps with control tells me more than a shaky hundred-kilo squat.",
      "The hip hinge is the pattern behind the deadlift and most athletic movement. Push your hips back like you are closing a car door, soft knees, flat back, weight in your heels. If you feel it in your lower back, reset and hinge again.",
      "For the overhead press, the secret is ribs down. Most people arch and turn it into a standing incline bench. Squeeze your glutes, tuck your ribs, and press in a straight line — the bar should finish over the middle of your foot.",
      "Progress by adding 2.5 kilos per week, not per session. Strength is built in months, and small jumps compound: 2.5 kilos a week is over a hundred kilos a year. Ego lifting stalls progress faster than any plateau.",
      "Film one working set every week from the side. Your body lies to you under load; the camera does not. Compare week to week and fix one cue at a time.",
    ],
    access: "member",
    publishedAt: "2026-09-16",
    readMinutes: 5,
  },
  {
    id: "i4",
    seasonId: "s2",
    title: "Recovery Is Training: Sleep, Deloads, and Walking",
    summary:
      "Why 7–9 hours of sleep, a half-volume deload every 4–6 weeks, and 8k daily steps will do more for your progress than any new workout program.",
    keyPoints: [
      "7–9 hours of sleep is the most legal performance enhancer in existence",
      "Deload every 4–6 weeks: same exercises, half the sets, half the weight",
      "Walk 8,000 steps daily, especially on rest days",
      "Soreness reflects novelty, not progress — track performance trends instead",
      "Schedule rest days like appointments, two per week minimum",
    ],
    body: [
      "Sleep is the most legal performance enhancer in existence. Seven to nine hours is not a suggestion — it is when growth hormone peaks and motor learning consolidates. One bad week of sleep can cut strength gains measurably.",
      "Every four to six weeks, take a deload: same exercises, half the sets, half the weight. It feels unproductive and it is the week that makes the next month possible. Fatigue masks fitness; deloads reveal it.",
      "Walk eight thousand steps a day, especially on rest days. Low-intensity movement increases blood flow without adding training stress, and it is the most underrated recovery tool you own.",
      "Stop using soreness as a scoreboard. Soreness mostly reflects novelty — new exercises, new ranges — not progress. The metrics that matter are performance trends: more reps, more load, better bar speed.",
      "Schedule rest days like appointments. 'I'll rest when I feel like it' turns into never resting, because training is fun and rest is boring. Two planned rest days a week beats five unplanned ones after you burn out.",
    ],
    access: "free",
    publishedAt: "2026-10-01",
    readMinutes: 4,
  },
  {
    id: "i5",
    seasonId: "s2",
    title: "Archive: The Original 30-Day Reset (2023)",
    summary:
      "The classic protocol that started this community: one habit, one lift, one walk, every day for thirty days — plus the two-line journal that keeps it honest.",
    keyPoints: [
      "The classic reset: one habit, one lift, one walk — every day for 30 days",
      "Pick exactly one keystone habit; the reset works because it is narrow",
      "Train one big pattern daily, even just bodyweight squats at home",
      "Twenty-minute walk outside, no podcast, no calls — boring is the point",
      "Two-line journal nightly, cohort check-in weekly, strict 30 days then flexible",
    ],
    body: [
      "This is the classic reset that started the whole community back in 2023, preserved here in the archive. The rules are deliberately simple: one habit, one lift, one walk — every single day for thirty days.",
      "One habit: pick exactly one keystone behavior — making your bed, ten minutes of reading, no sugar until dinner — and do it daily. One, not five. The reset works because it is narrow.",
      "One lift: train one of the big three patterns each day, even if it is just bodyweight squats in your living room. Intensity does not matter during the reset; the daily appointment with movement does.",
      "One walk: twenty minutes outside, no podcast, no phone calls. Boring walks are the point — this is where your brain processes the other twenty-three and a half hours.",
      "Write a two-line journal every night: one line on what you did, one line on tomorrow's plan. Then check in with your cohort every week. Strict for thirty days, flexible forever after.",
    ],
    access: "archive",
    publishedAt: "2026-10-02",
    readMinutes: 4,
  },
];

export const MEMBERS: MockMember[] = [
  { id: "m1", name: "Maya", weeklyXp: 640 },
  { id: "m2", name: "Jordan", weeklyXp: 520 },
  { id: "m3", name: "Priya", weeklyXp: 470 },
  { id: "m4", name: "Sam", weeklyXp: 390 },
  { id: "m5", name: "Elena", weeklyXp: 340 },
  { id: "m6", name: "Chris", weeklyXp: 260 },
  { id: "m7", name: "Nora", weeklyXp: 180 },
  { id: "m8", name: "Dev", weeklyXp: 95 },
];

export const DEFAULT_TWIN: TwinConfig = {
  name: "Twin Alex",
  tone: "energetic",
  greeting:
    "Hey! I'm Twin Alex — trained on every issue Alex has published. Ask me about habits, morning routines, training, or recovery, and I'll point you at the right material.",
  trainedIssueIds: ISSUES.map((i) => i.id),
  trainedAt: "2026-10-02T09:00:00.000Z",
};

export const SAMPLE_TRANSCRIPT = `[Intro music] Um, okay so, welcome back to the show everyone. Today, uh, we are talking about evening routines, and honestly this might be more important than the morning stuff we covered last month.

So here's the thing, right? Your morning routine actually starts the night before. If you go to bed at 1 a.m. scrolling, no morning routine on earth is going to save you.

The single highest-leverage habit is a fixed shutdown ritual. Pick a time, like 9:30 p.m., and that's when work ends, laptop closes, every single day. It sounds simple but, like, almost nobody does it.

Next one — dim the lights about an hour before bed. Your brain takes light as a signal, and bright overhead lighting at 11 p.m. is basically telling your body it's noon. Lamps, candles, whatever works.

Uh, what else... oh, screens. I'm not going to say no phones, because that's not realistic for most people. But here's the rule: no doom-scrolling in bed. Bed is for sleeping. If you want to scroll, sit in a chair, and you'll notice you get bored of it way faster.

And the last piece, which people always skip, is a two-minute brain dump. Write down the three things swirling in your head and one thing you'll do first tomorrow. That's it. It offloads the loop so your brain can actually shut down.

So to recap — fixed shutdown time, dim lights, no scrolling in bed, two-minute brain dump. Do those four things for two weeks and I guarantee your mornings get easier.`;
