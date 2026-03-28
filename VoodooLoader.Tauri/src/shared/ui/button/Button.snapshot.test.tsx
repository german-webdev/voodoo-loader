import { render } from "@testing-library/react";
import { Button } from "./Button";

describe("Button snapshot", () => {
  test("matches primary variant snapshot", () => {
    const { asFragment } = render(<Button variant="primary">Snapshot</Button>);
    expect(asFragment()).toMatchSnapshot();
  });
});
