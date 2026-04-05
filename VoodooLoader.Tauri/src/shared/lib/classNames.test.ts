import { bem, cx } from "./classNames";

describe("classNames helpers", () => {
  test("cx joins truthy classes", () => {
    expect(cx("a", null, undefined, false, "b")).toBe("a b");
  });

  test("bem builds block and boolean modifiers", () => {
    const styles = {
      button: "button_h",
      "button--mini": "button_mini_h",
      custom: "custom_h",
    };

    expect(bem(styles, "button", { mini: true }, ["custom"])).toBe(
      "button_h button_mini_h custom_h",
    );
  });

  test("bem builds value modifiers", () => {
    const styles = {
      item: "item_h",
      "item--state-active": "item_state_active_h",
    };

    expect(bem(styles, "item", { state: "active" })).toBe("item_h item_state_active_h");
  });
});
