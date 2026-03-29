import { Title } from "../../../shared/ui/title/Title";
import styles from "./CommandPreviewSection.module.css";

interface CommandPreviewSectionProps {
  previewCommand: string;
}

export function CommandPreviewSection({ previewCommand }: CommandPreviewSectionProps) {
  if (!previewCommand) return null;

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHead}>
        <Title as="h2" typography="section">
          Command preview (masked)
        </Title>
      </div>
      <pre className={styles.commandPreview}>{previewCommand}</pre>
    </section>
  );
}
