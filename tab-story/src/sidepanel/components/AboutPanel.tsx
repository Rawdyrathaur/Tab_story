import { BugAntIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import brandIcon from "../assets/tab-story-brand.png?inline";
import { useI18n } from "../../i18n/useI18n";

export function AboutPanel() {
  const { t: tr } = useI18n();
  const version = chrome.runtime.getManifest().version;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <img src={brandIcon} loading="eager" width={64} height={64} style={{ borderRadius: "16px", marginBottom: "12px", objectFit: "contain", display: "block", marginLeft: "auto", marginRight: "auto" }} alt="Tab Story" />
        <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-color)" }}>{tr("localization.documentTitle")}</div>
        <div style={{ fontSize: "12px", color: "var(--placeholder-color)", marginTop: "4px" }}>{tr("about.version", { version })}</div>
      </div>

      <div style={{
        padding: "16px",
        borderRadius: "16px",
        background: "rgba(129, 140, 248, 0.08)",
        border: "1px solid rgba(129, 140, 248, 0.2)",
        lineHeight: "1.6",
        fontSize: "14px",
        color: "var(--text-color)"
      }}>
        {tr("about.description")}
      </div>

      <section style={{ color: "var(--text-color)", fontSize: "12px", lineHeight: 1.6 }}>
        <strong style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Your key, your control</strong>
        <p style={{ margin: 0 }}>Your API key stays in your browser session and is sent only to your chosen AI provider.</p>
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <a
          href="https://github.com/Rawdyrathaur/Tab_story"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(120,120,130,0.06)",
            border: "1px solid rgba(120,120,130,0.15)",
            color: "var(--text-color)",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
            transition: "background 0.15s ease",
          }}
        >
          {/* Official GitHub Icon */}
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ flexShrink: 0 }}
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>{tr("about.github")}</a>
        <a
          href="https://github.com/Rawdyrathaur/Tab_story/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(120,120,130,0.06)",
            border: "1px solid rgba(120,120,130,0.15)",
            color: "var(--text-color)",
            textDecoration: "none",
            minWidth: 0,
          }}
        >
          <BugAntIcon aria-hidden="true" style={{ width: "20px", height: "20px", flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            <span style={{ display: "block", fontSize: "14px", fontWeight: 600 }}>Help improve Tab Story</span>
            <span style={{ display: "block", fontSize: "12px", color: "var(--placeholder-color)", marginTop: "4px", lineHeight: 1.5 }}>Have a feature idea or found a bug? Open a GitHub issue.</span>
          </span>
          <ArrowTopRightOnSquareIcon aria-hidden="true" style={{ width: "16px", height: "16px", flexShrink: 0 }} />
        </a>
      </div>

      <div style={{
        marginTop: "auto",
        textAlign: "center",
        fontSize: "12px",
        color: "var(--placeholder-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px"
      }}>
        {tr("about.credit")}
      </div>
    </div>
  );
}
