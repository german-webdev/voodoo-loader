import { Button } from "../../../shared/ui/button/Button";
import { Input } from "../../../shared/ui/input/Input";
import styles from "./DestinationSection.module.css";

interface DestinationSectionProps {
  destination: string;
  fileName: string;
  onDestinationChange: (value: string) => void;
  onFileNameChange: (value: string) => void;
  onBrowseDestinationFolder: () => Promise<void>;
}

export function DestinationSection({
  destination,
  fileName,
  onDestinationChange,
  onFileNameChange,
  onBrowseDestinationFolder,
}: DestinationSectionProps) {
  return (
    <section className={`${styles.panel} ${styles.formGrid}`}>
      <div className={styles.field}>
        <label>Destination</label>
        <div className={styles.fieldInline}>
          <Input
            type="text"
            value={destination}
            onChange={(event) => onDestinationChange(event.currentTarget.value)}
          />
          <Button type="button" variant="ghost" onClick={onBrowseDestinationFolder}>
            Browse
          </Button>
        </div>
      </div>

      <div className={styles.field}>
        <label>Custom file name (single download only)</label>
        <Input
          type="text"
          placeholder="Optional file name"
          value={fileName}
          onChange={(event) => onFileNameChange(event.currentTarget.value)}
        />
      </div>
    </section>
  );
}
