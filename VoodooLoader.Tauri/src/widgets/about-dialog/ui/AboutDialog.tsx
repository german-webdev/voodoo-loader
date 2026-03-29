import { Button } from "../../../shared/ui/button/Button";
import { Title } from "../../../shared/ui/title/Title";
import styles from "./AboutDialog.module.css";

interface AboutDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutDialog({ visible, onClose }: AboutDialogProps) {
  if (!visible) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <section className={styles.aboutModal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.aboutHead}>
          <Title as="h3" typography="subsection">
            About Voodoo Loader
          </Title>
          <Button type="button" variant="ghost" className={styles.modalClose} onClick={onClose}>
            x
          </Button>
        </div>
        <div className={styles.aboutBody}>
          <div className={styles.aboutIcon}>i</div>
          <div>
            <div>Voodoo Loader</div>
            <div>Version: 0.2.0-alpha</div>
            <div className={styles.aboutSub}>Universal downloader powered by aria2.</div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <Button type="button" variant="primary" onClick={onClose}>
            OK
          </Button>
        </div>
      </section>
    </div>
  );
}
