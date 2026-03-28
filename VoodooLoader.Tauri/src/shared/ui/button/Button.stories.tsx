import { Button } from "./Button";

const meta = {
  title: "Shared/Button",
  component: Button,
  args: {
    children: "Action",
    variant: "primary",
  },
};

export default meta;

export const Primary = {};
export const Ghost = {
  args: {
    variant: "ghost",
    children: "Secondary",
  },
};
export const Mini = {
  args: {
    variant: "mini",
    children: "Tiny",
  },
};
