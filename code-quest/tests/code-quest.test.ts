import { describe, expect, test } from "claude-code/testing";

describe("code-quest", () => {
  test("the band shows level 1 with no XP", async ($, on) => {
    on("session.start", ($, e) => ({ cwd: e.cwd }));

    await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/work" } as any);
    const ui = await $.ui.mount({
      plugin: "code-quest",
      surface: "terminal",
      component: "AbovePrompt",
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 },
    } as any);
    expect(await ui.find({ type: "Text", text: /Lv1/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /0\/100 XP/ })).toBeDefined();
    await ui.unmount();
  });
});
