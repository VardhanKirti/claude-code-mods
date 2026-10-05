// Code Quest: XP, levels, quests and achievements for your coding session.

const QUEST = { plugin: "code-quest", key: "quest" };
const QUEST_REWARD = 250;
const MAX_REWARDS = 4;

const EMPTY = {
  xp: 0,
  objective: null,
  reads: 0,
  edits: 0,
  testsPassed: 0,
  commits: 0,
  questsDone: 0,
  rewards: [],
  achievements: [],
};

const ACHIEVEMENTS = [
  { id: "first-blood", name: "First Blood", hint: "Make your first edit", has: (q) => q.edits >= 1 },
  { id: "test-enjoyer", name: "Test Enjoyer", hint: "Pass 25 test runs", has: (q) => q.testsPassed >= 25 },
  { id: "committed", name: "Committed", hint: "Make 5 commits", has: (q) => q.commits >= 5 },
  { id: "quest-giver", name: "Quest Complete", hint: "Complete a quest", has: (q) => q.questsDone >= 1 },
  { id: "veteran", name: "Veteran", hint: "Reach level 5", has: (q) => levelOf(q.xp).level >= 5 },
];

const TEST_COMMAND = /\b(test|pytest|jest|vitest|phpunit|mocha|rspec)\b/i;
const COMMIT_COMMAND = /\bgit\s+commit\b/i;

// Level n needs n * 100 XP to finish, so level 1 ends at 100, level 2 at 300, ...
function levelOf(xp) {
  let level = 1;
  let left = xp;
  while (left >= level * 100) {
    left -= level * 100;
    level += 1;
  }
  return { level, into: left, size: level * 100 };
}

let queue = Promise.resolve();

// Serialized read-modify-write, so parallel tool calls can't lose an update.
function change($, fn) {
  queue = queue.then(async () => {
    const { value } = await $.state.get(QUEST);
    const before = { ...EMPTY, ...value };
    const after = fn({ ...before, rewards: [...before.rewards], achievements: [...before.achievements] });
    if (levelOf(after.xp).level > levelOf(before.xp).level) {
      $.ui.toast(`LEVEL UP! You reached level ${levelOf(after.xp).level}`);
    }
    for (const a of ACHIEVEMENTS) {
      if (!after.achievements.includes(a.id) && a.has(after)) {
        after.achievements.push(a.id);
        $.ui.toast(`Achievement unlocked: ${a.name}`);
      }
    }
    await $.state.set(QUEST, after);
  });
  return queue;
}

function reward(q, xp, label) {
  return { ...q, xp: q.xp + xp, rewards: [...q.rewards, { xp, label }].slice(-MAX_REWARDS) };
}

export function register(on) {
  on("session.start", async ($, e, next) => {
    // Commands register inside a hook: `$` only exists there.
    await $.command.register({ name: "quest", description: "Code Quest: status, set <objective>, complete, abandon" });
    return next(e);
  });

  // Pick up the first prompt as the quest, unless one is already set.
  on("prompt.submit", async ($, e, next) => {
    const text = String(e.text ?? "").trim();
    if (text && !text.startsWith("/")) {
      await change($, (q) => (q.objective === null ? { ...q, objective: text.slice(0, 60) } : q));
    }
    return next(e);
  });

  on("tool.call", async ($, e, next) => {
    const ran = await next(e);
    if (ran.deny !== undefined) return ran;
    const hasFailed = ran.isError === true;

    if (e.tool === "Read" && !hasFailed) {
      await change($, (q) => ({ ...reward(q, 5, `Read ${base(e.file_path)}`), reads: q.reads + 1 }));
    } else if ((e.tool === "Edit" || e.tool === "Write" || e.tool === "MultiEdit") && !hasFailed) {
      await change($, (q) => ({ ...reward(q, 10, `Modified ${base(e.file_path)}`), edits: q.edits + 1 }));
    } else if (e.tool === "Bash" && !hasFailed) {
      const command = String(e.command ?? "");
      if (COMMIT_COMMAND.test(command)) {
        await change($, (q) => ({ ...reward(q, 30, "Git commit"), commits: q.commits + 1 }));
      } else if (TEST_COMMAND.test(command)) {
        await change($, (q) => ({ ...reward(q, 25, "Tests passed"), testsPassed: q.testsPassed + 1 }));
      }
    }
    return ran;
  });

  on("command.run", { command: "quest" }, async ($, e) => {
    const args = String(e.args ?? "").trim();
    const [sub, ...rest] = args.split(/\s+/);

    if (sub === "set" && rest.length > 0) {
      await change($, (q) => ({ ...q, objective: rest.join(" ").slice(0, 60) }));
    } else if (sub === "complete") {
      const { value } = await $.state.get(QUEST);
      if (!value?.objective) return { text: "No active quest to complete. Try /quest set <objective>." };
      await change($, (q) => ({ ...reward(q, QUEST_REWARD, "Quest complete"), objective: null, questsDone: q.questsDone + 1 }));
    } else if (sub === "abandon") {
      await change($, (q) => ({ ...q, objective: null }));
    }

    const { value } = await $.state.get(QUEST);
    return { text: statusText({ ...EMPTY, ...value }) };
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e);
    const { value } = await $.state.get(QUEST);
    const q = { ...EMPTY, ...value };
    const { level, into, size } = levelOf(q.xp);
    const { Box, Text } = $.ui.resolve(e);
    const last = q.rewards[q.rewards.length - 1];

    return Box({
      flexDirection: "column",
      paddingX: 1,
      children: [
        Box({
          flexDirection: "row",
          gap: 1,
          children: [
            Text({ bold: true, color: "yellow", children: `⚔ Lv${level}` }),
            Text({ color: "yellow", children: bar(into, size, 16) }),
            Text({ dimColor: true, children: `${into}/${size} XP` }),
            last
              ? Text({ color: "green", children: `+${last.xp} ${last.label}` })
              : Text({ dimColor: true, children: "no rewards yet" }),
          ],
        }),
        Text({ dimColor: true, children: q.objective ? `Quest: ${q.objective}` : "No active quest. /quest set <objective>" }),
      ],
    });
  });
}

function statusText(q) {
  const { level, into, size } = levelOf(q.xp);
  const lines = [
    "⚔ CODE QUEST",
    "",
    `Level ${level}   XP ${into}/${size}   ${bar(into, size, 20)}`,
    `Quest: ${q.objective ?? "none (use /quest set <objective>)"}`,
    "",
    `Files read ${q.reads}   Files modified ${q.edits}   Tests passed ${q.testsPassed}   Commits ${q.commits}   Quests done ${q.questsDone}`,
    "",
    "Recent rewards",
    ...(q.rewards.length ? q.rewards.slice().reverse().map((r) => `  +${r.xp}  ${r.label}`) : ["  none yet"]),
    "",
    "Achievements",
    ...ACHIEVEMENTS.map((a) => `  [${q.achievements.includes(a.id) ? "x" : " "}] ${a.name} - ${a.hint}`),
  ];
  return lines.join("\n");
}

function bar(into, size, width) {
  const filled = Math.max(0, Math.min(width, Math.round((into / size) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function base(path) {
  return String(path ?? "file").split(/[\\/]/).pop();
}
