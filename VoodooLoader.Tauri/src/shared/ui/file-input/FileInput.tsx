import { forwardRef, type InputHTMLAttributes } from "react";

type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  function FileInput(props, ref) {
    return <input {...props} ref={ref} type="file" />;
  },
);
