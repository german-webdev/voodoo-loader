import { render, screen } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  test("renders placeholder", () => {
    render(<Input placeholder="URL here" value="" onChange={() => undefined} />);
    expect(screen.getByPlaceholderText("URL here")).toBeInTheDocument();
  });
});
