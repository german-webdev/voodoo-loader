import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  test("renders button text and variant class", () => {
    render(<Button variant="primary">Start</Button>);
    const button = screen.getByRole("button", { name: "Start" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("button");
    expect(button).toHaveClass("primary");
  });
});
