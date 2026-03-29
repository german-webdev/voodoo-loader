import type {
  MenuName,
  QueueSortBy,
  QueuePriority,
  SettingsState,
} from "../../../entities/queue/model/types";
import { Button } from "../../../shared/ui/button/Button";
import { NavBar } from "../../../shared/ui/nav-bar/NavBar";
import { NavLinkButton } from "../../../shared/ui/nav-link-button/NavLinkButton";
import { Title } from "../../../shared/ui/title/Title";
import headerLogo from "../../../shared/assets/branding/voodoo-loader-header-logo-cropped.png";
import styles from "./DownloaderHeader.module.css";

interface DownloaderHeaderProps {
  activeMenu: MenuName | null;
  settings: SettingsState;
  onToggleMenu: (menu: MenuName) => void;
  onCloseMenus: () => void;
  onImportFromTxtFile: () => Promise<void>;
  onExit: () => Promise<void>;
  onStartQueue: () => Promise<void>;
  onStopQueue: () => Promise<void>;
  onPreviewCurrentCommand: () => Promise<void>;
  onRetrySelected: () => Promise<void>;
  onRetryFailed: () => Promise<void>;
  onRemoveSelected: () => Promise<void>;
  onRemoveFailed: () => Promise<void>;
  onClearQueue: () => Promise<void>;
  onOpenSelectedFile: () => Promise<void>;
  onOpenSelectedFolder: () => Promise<void>;
  onSetSelectedPriority: (priority: QueuePriority) => Promise<void>;
  onToggleShowLogs: () => void;
  showLogs: boolean;
  onSortQueue: (sortBy: QueueSortBy) => Promise<void>;
  onOpenSettingsDialog: () => void;
  onSetLanguage: (language: "en" | "ru") => void;
  onOpenAboutDialog: () => void;
  onCheckUpdates: () => void;
}

export function DownloaderHeader({
  activeMenu,
  settings,
  onToggleMenu,
  onCloseMenus,
  onImportFromTxtFile,
  onExit,
  onStartQueue,
  onStopQueue,
  onPreviewCurrentCommand,
  onRetrySelected,
  onRetryFailed,
  onRemoveSelected,
  onRemoveFailed,
  onClearQueue,
  onOpenSelectedFile,
  onOpenSelectedFolder,
  onSetSelectedPriority,
  onToggleShowLogs,
  showLogs,
  onSortQueue,
  onOpenSettingsDialog,
  onSetLanguage,
  onOpenAboutDialog,
  onCheckUpdates,
}: DownloaderHeaderProps) {
  return (
    <header className={styles.topbar}>
      <NavBar className={styles.menuBar}>
        <div className={styles.menuItem}>
          <NavLinkButton type="button" onClick={() => onToggleMenu("file")}>
            File
          </NavLinkButton>
          {activeMenu === "file" ? (
            <div className={styles.menuPopup}>
              <Button type="button" onClick={() => void onImportFromTxtFile()}>
                Import .txt
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void onExit();
                  onCloseMenus();
                }}
              >
                Exit
              </Button>
            </div>
          ) : null}
        </div>

        <div className={styles.menuItem}>
          <NavLinkButton type="button" onClick={() => onToggleMenu("downloads")}>
            Downloads
          </NavLinkButton>
          {activeMenu === "downloads" ? (
            <div className={styles.menuPopup}>
              <Button type="button" onClick={() => void onStartQueue()}>
                Start
              </Button>
              <Button type="button" onClick={() => void onStopQueue()}>
                Stop
              </Button>
              <Button type="button" onClick={() => void onPreviewCurrentCommand()}>
                Preview command
              </Button>
              <Button type="button" onClick={() => void onRetrySelected()}>
                Retry selected
              </Button>
              <Button type="button" onClick={() => void onRetryFailed()}>
                Retry all failed/canceled
              </Button>
              <Button type="button" onClick={() => void onRemoveSelected()}>
                Remove selected
              </Button>
              <Button type="button" onClick={() => void onRemoveFailed()}>
                Remove failed/canceled
              </Button>
              <Button type="button" onClick={() => void onClearQueue()}>
                Clear queue
              </Button>
              <Button type="button" onClick={() => void onOpenSelectedFile()}>
                Open file
              </Button>
              <Button type="button" onClick={() => void onOpenSelectedFolder()}>
                Open folder
              </Button>
              <div className={styles.submenuItem}>
                <Button type="button">Priority &gt;</Button>
                <div className={styles.submenuPopup}>
                  <Button type="button" onClick={() => void onSetSelectedPriority("High")}>
                    High
                  </Button>
                  <Button type="button" onClick={() => void onSetSelectedPriority("Medium")}>
                    Medium
                  </Button>
                  <Button type="button" onClick={() => void onSetSelectedPriority("Low")}>
                    Low
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.menuItem}>
          <NavLinkButton type="button" onClick={() => onToggleMenu("view")}>
            View
          </NavLinkButton>
          {activeMenu === "view" ? (
            <div className={styles.menuPopup}>
              <Button type="button" onClick={onToggleShowLogs}>
                {showLogs ? "Hide logs" : "Show logs"}
              </Button>
              <Button type="button" onClick={() => void onSortQueue("added")}>
                Sort by date added
              </Button>
              <Button type="button" onClick={() => void onSortQueue("extension")}>
                Sort by extension
              </Button>
              <Button type="button" onClick={() => void onSortQueue("priority")}>
                Sort by priority
              </Button>
            </div>
          ) : null}
        </div>

        <div className={styles.menuItem}>
          <NavLinkButton type="button" onClick={() => onToggleMenu("settings")}>
            Settings
          </NavLinkButton>
          {activeMenu === "settings" ? (
            <div className={styles.menuPopup}>
              <Button type="button" onClick={onOpenSettingsDialog}>
                Open settings
              </Button>
              <div className={styles.submenuItem}>
                <Button type="button">Language &gt;</Button>
                <div className={styles.submenuPopup}>
                  <Button type="button" onClick={() => onSetLanguage("en")}>
                    {settings.language === "en" ? "* " : ""}
                    English
                  </Button>
                  <Button type="button" onClick={() => onSetLanguage("ru")}>
                    {settings.language === "ru" ? "* " : ""}
                    Russian
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.menuItem}>
          <NavLinkButton type="button" onClick={() => onToggleMenu("help")}>
            Help
          </NavLinkButton>
          {activeMenu === "help" ? (
            <div className={styles.menuPopup}>
              <Button type="button" onClick={onCheckUpdates}>
                Check Voodoo Loader updates
              </Button>
              <Button type="button" onClick={onOpenAboutDialog}>
                About
              </Button>
            </div>
          ) : null}
        </div>
      </NavBar>

      <Title as="h1" typography="page" className={styles.windowTitle}>
        <img src={headerLogo} alt="Voodoo Loader" className={styles.windowLogo} draggable={false} />
      </Title>
    </header>
  );
}
