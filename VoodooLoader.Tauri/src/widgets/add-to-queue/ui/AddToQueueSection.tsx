import { Button } from "../../../shared/ui/button/Button";
import { Input } from "../../../shared/ui/input/Input";
import styles from "./AddToQueueSection.module.css";

interface AddToQueueSectionProps {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  onPasteFromClipboard: () => Promise<void>;
  onAddToQueue: () => Promise<void>;
}

export function AddToQueueSection({
  urlInput,
  onUrlInputChange,
  onPasteFromClipboard,
  onAddToQueue,
}: AddToQueueSectionProps) {
  return (
    <section className={`${styles.panel} ${styles.addRow}`}>
      <Input
        type="text"
        placeholder="Paste direct URL here"
        className={styles.inputUrl}
        value={urlInput}
        onChange={(event) => onUrlInputChange(event.currentTarget.value)}
      />
      <Button type="button" variant="ghost" onClick={onPasteFromClipboard}>
        Paste
      </Button>
      <Button type="button" variant="primary" onClick={onAddToQueue}>
        Add to queue
      </Button>
    </section>
  );
}
