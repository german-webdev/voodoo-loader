import type { AuthMode, SettingsState } from "../../../entities/queue/model/types";
import { Button } from "../../../shared/ui/button/Button";
import { Checkbox } from "../../../shared/ui/checkbox/Checkbox";
import { Input } from "../../../shared/ui/input/Input";
import { Select } from "../../../shared/ui/select/Select";
import { Textarea } from "../../../shared/ui/textarea/Textarea";
import { Title } from "../../../shared/ui/title/Title";
import styles from "./SettingsDialog.module.css";

interface SettingsDialogProps {
  dialogSettings: SettingsState | null;
  onClose: () => void;
  onApply: () => void;
  onUpdateDraft: (patch: Partial<SettingsState>) => void;
  onBrowseCustomAria2Path: () => Promise<void>;
  onApplyPreset: (settings: SettingsState, preset: string) => Partial<SettingsState>;
  onClampNonNegative: (value: number, fallback: number) => number;
}

export function SettingsDialog({
  dialogSettings,
  onClose,
  onApply,
  onUpdateDraft,
  onBrowseCustomAria2Path,
  onApplyPreset,
  onClampNonNegative,
}: SettingsDialogProps) {
  if (!dialogSettings) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <section className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHead}>
          <Title as="h2" typography="section">
            Settings
          </Title>
          <Button type="button" variant="ghost" className={styles.modalClose} onClick={onClose}>
            x
          </Button>
        </div>

        <div className={styles.modalBody}>
          <fieldset className={styles.settingsGroup}>
            <legend>Speed presets / aria2</legend>
            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label>Preset</label>
                <Select
                  className={styles.controlInput}
                  value={dialogSettings.speedPreset}
                  onChange={(event) =>
                    onUpdateDraft(onApplyPreset(dialogSettings, event.currentTarget.value))
                  }
                >
                  <option>Safe</option>
                  <option>Balanced</option>
                  <option>Fast</option>
                  <option>Aggressive</option>
                  <option>Very large files</option>
                  <option>Manual</option>
                </Select>
              </div>

              <div className={styles.field}>
                <label>Connections (-x)</label>
                <Input
                  type="number"
                  min={1}
                  className={styles.controlInput}
                  value={dialogSettings.connections}
                  onChange={(event) =>
                    onUpdateDraft({
                      connections: onClampNonNegative(Number(event.currentTarget.value), 16),
                    })
                  }
                />
              </div>
            </div>

            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label>Splits (-s)</label>
                <Input
                  type="number"
                  min={1}
                  className={styles.controlInput}
                  value={dialogSettings.splits}
                  onChange={(event) =>
                    onUpdateDraft({
                      splits: onClampNonNegative(Number(event.currentTarget.value), 16),
                    })
                  }
                />
              </div>

              <div className={styles.field}>
                <label>Chunk size (-k)</label>
                <Input
                  type="text"
                  className={styles.controlInput}
                  value={dialogSettings.chunkSize}
                  onChange={(event) => onUpdateDraft({ chunkSize: event.currentTarget.value })}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.toggleRow}>
                <Checkbox
                  checked={dialogSettings.continueDownload}
                  onChange={(event) =>
                    onUpdateDraft({ continueDownload: event.currentTarget.checked })
                  }
                />
                Enable continue/resume (-c)
              </label>
              <small className={styles.fieldNote}>
                If enabled, aria2 continues partial downloads instead of restarting from zero when
                possible.
              </small>
            </div>

            <div className={styles.field}>
              <label>User-Agent</label>
              <Input
                type="text"
                className={styles.controlInput}
                value={dialogSettings.userAgent}
                onChange={(event) => onUpdateDraft({ userAgent: event.currentTarget.value })}
              />
            </div>
          </fieldset>

          <fieldset className={styles.settingsGroup}>
            <legend>Queue</legend>
            <div className={styles.field}>
              <label>Max simultaneous downloads (0 = unlimited)</label>
              <Input
                type="number"
                min={0}
                className={styles.controlInput}
                value={dialogSettings.maxSimultaneousDownloads}
                onChange={(event) =>
                  onUpdateDraft({
                    maxSimultaneousDownloads: onClampNonNegative(
                      Number(event.currentTarget.value),
                      0,
                    ),
                  })
                }
              />
            </div>
          </fieldset>

          <fieldset className={styles.settingsGroup}>
            <legend>aria2 provisioning</legend>
            <div className={styles.field}>
              <label className={styles.toggleRow}>
                <Checkbox
                  checked={dialogSettings.autoProvisionAria2}
                  onChange={(event) =>
                    onUpdateDraft({ autoProvisionAria2: event.currentTarget.checked })
                  }
                />
                Auto-download aria2 if missing
              </label>
            </div>
            <div className={styles.field}>
              <label>Custom aria2 path</label>
              <div className={styles.inlineField}>
                <Input
                  type="text"
                  className={styles.controlInput}
                  placeholder="Optional custom path to aria2c.exe"
                  value={dialogSettings.customAria2Path}
                  onChange={(event) =>
                    onUpdateDraft({ customAria2Path: event.currentTarget.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void onBrowseCustomAria2Path()}
                >
                  Browse
                </Button>
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.settingsGroup}>
            <legend>Authentication</legend>
            <div className={styles.field}>
              <label>Auth mode</label>
              <Select
                className={styles.controlInput}
                value={dialogSettings.authMode}
                onChange={(event) =>
                  onUpdateDraft({ authMode: event.currentTarget.value as AuthMode })
                }
              >
                <option value="none">No auth</option>
                <option value="token">Token + headers</option>
                <option value="basic">Login/password</option>
              </Select>
            </div>

            {dialogSettings.authMode === "token" ? (
              <div className={styles.field}>
                <label>Token</label>
                <Input
                  type="password"
                  className={styles.controlInput}
                  value={dialogSettings.token}
                  onChange={(event) => onUpdateDraft({ token: event.currentTarget.value })}
                />
              </div>
            ) : null}

            {dialogSettings.authMode === "basic" ? (
              <div className={styles.twoCol}>
                <div className={styles.field}>
                  <label>Username</label>
                  <Input
                    type="text"
                    className={styles.controlInput}
                    value={dialogSettings.username}
                    onChange={(event) => onUpdateDraft({ username: event.currentTarget.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>Password</label>
                  <Input
                    type="password"
                    className={styles.controlInput}
                    value={dialogSettings.password}
                    onChange={(event) => onUpdateDraft({ password: event.currentTarget.value })}
                  />
                </div>
              </div>
            ) : null}

            <div className={styles.field}>
              <label>Headers</label>
              <Textarea
                className={styles.controlInput}
                value={dialogSettings.extraHeaders}
                onChange={(event) => onUpdateDraft({ extraHeaders: event.currentTarget.value })}
              />
            </div>

            <div className={styles.field}>
              <label>Max connections per server (0 = unlimited)</label>
              <Input
                type="number"
                min={0}
                className={styles.controlInput}
                value={dialogSettings.maxConnectionsPerServer}
                onChange={(event) =>
                  onUpdateDraft({
                    maxConnectionsPerServer: onClampNonNegative(
                      Number(event.currentTarget.value),
                      0,
                    ),
                  })
                }
              />
            </div>
          </fieldset>
        </div>

        <div className={styles.modalActions}>
          <Button type="button" variant="primary" onClick={onApply}>
            OK
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </section>
    </div>
  );
}
