import { render } from "@testing-library/react";
import { Input } from "./Input";

describe("Input snapshot", () => {
  test("matches default input snapshot", () => {
    const { asFragment } = render(<Input value="snapshot" onChange={() => undefined} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
