import { useState, useEffect } from "react";
import {
  SparklesIcon,
  KeyIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  EyeSlashIcon,
  BoltIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { aiRequest } from "../../ai/service";

import { providers } from '../../ai/providers';
const AI_PROVIDERS = Object.entries(providers).map(([id, provider]) => ({ id, ...provider, requiresKey: true }));

interface Props {
  onSuccess?: (connection: { provider: string; providerId: string; model: string }) => void;
  compact?: boolean;
  initialTab?: "api" | "pro";
}

export function AISettingsCard({ onSuccess, compact = false, initialTab = "api" }: Props) {
  const [activeTab, setActiveTab] = useState<"api" | "pro">(initialTab);
  const [selectedProviderId, setSelectedProviderId] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(false);
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null);
  const [proModalOpen, setProModalOpen] = useState(false);

  const selectedProvider =
    AI_PROVIDERS.find((p) => p.id === selectedProviderId) || AI_PROVIDERS[0];

  useEffect(() => {
    void aiRequest("status")
      .then((res) => {
        setConfigured(res.configured);
        if (res.configured && res.provider) {
          setConnectedProvider(res.provider);
          if (res.providerId) {
            setSelectedProviderId(res.providerId);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleConnect = async () => {
    const sanitizedKey = apiKey.trim().replace(/^["']|["']$/g, "");
    if (selectedProvider.requiresKey && !sanitizedKey) {
      setError("Please paste a valid API key.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await aiRequest("connect", {
        provider: selectedProviderId,
        key: sanitizedKey,
      });
      const selectedModel = typeof res?.selectedModel === "string" ? res.selectedModel : "";
      if (!selectedModel) {
        throw new Error("Connected but no compatible model was found.");
      }

      setConfigured(true);
      setConnectedProvider(selectedProvider.name);
      // Immediately wipe the plain API key from component memory for maximum security
      setApiKey("");
      onSuccess?.({
        provider: selectedProvider.name,
        providerId: selectedProvider.id,
        model: selectedModel,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed. Please check your key.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await aiRequest("forget");
      setConfigured(false);
      setConnectedProvider(null);
      setApiKey("");
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "14px",
        padding: compact ? "12px" : "16px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      {/* Top Pill Switcher: Free API vs Pro Plan */}
      <div
        style={{
          display: "flex",
          background: "rgba(120, 120, 130, 0.08)",
          borderRadius: "9px",
          padding: "3px",
          gap: "3px",
        }}
      >
        <button
          onClick={() => setActiveTab("api")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "7px",
            border: "none",
            fontSize: "11.5px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeTab === "api" ? "var(--bg-color)" : "transparent",
            color: activeTab === "api" ? "var(--text-color)" : "var(--placeholder-color)",
            boxShadow: activeTab === "api" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.12s ease",
          }}
        >
          <KeyIcon style={{ width: "13px", height: "13px", color: "var(--ai-accent)" }} />
          API key
        </button>

        <button
          onClick={() => setActiveTab("pro")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "7px",
            border: "none",
            fontSize: "11.5px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeTab === "pro" ? "var(--bg-color)" : "transparent",
            color: activeTab === "pro" ? "#a855f7" : "var(--placeholder-color)",
            boxShadow: activeTab === "pro" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.12s ease",
          }}
        >
          <BoltIcon style={{ width: "13px", height: "13px", color: "#a855f7" }} />
          Pro
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "7px 10px",
            borderRadius: "8px",
            background: "var(--ai-tint)",
            border: "1px solid var(--ai-border)",
            color: "var(--ai-accent)",
            fontSize: "11.5px",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* TAB 1: FREE API KEYS */}
      {activeTab === "api" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Active Connection Status Banner */}
          {configured && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: "9px",
                background: "rgba(52, 211, 153, 0.1)",
                border: "1px solid rgba(52, 211, 153, 0.25)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#34d399" }} />
                <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#34d399" }}>
                  Connected to {connectedProvider || "AI Provider"}
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={busy}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "11px",
                  color: "var(--ai-accent)",
                  cursor: "pointer",
                  fontWeight: 600,
                  padding: "2px 5px",
                }}
              >
                Disconnect
              </button>
            </div>
          )}

          {/* Provider Selection */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-color)", letterSpacing: "0.02em" }}>
              AI Provider
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", minWidth: 0 }}>
              <select
                aria-label="AI Provider"
                value={selectedProviderId}
                onChange={(e) => {
                  setSelectedProviderId(e.target.value);
                  setApiKey(""); setShowKey(false);
                  setError("");
                }}
                disabled={busy}
                style={{
                  flex: "1 1 100%",
                  minWidth: 0,
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--input-border)",
                  background: "var(--input-bg)",
                  color: "var(--text-color)",
                  fontSize: "12px",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {AI_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.badge}
                  </option>
                ))}
              </select>

              {/* Direct Get Free API Key Link Button */}
              {selectedProvider.keyUrl && (
                <a
                  href={selectedProvider.keyUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`Get ${selectedProvider.name} API Key`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: "var(--ai-tint)",
                    border: "1px solid var(--ai-border)",
                    color: "var(--ai-accent)",
                    fontSize: "11px",
                    fontWeight: 700,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "all 0.12s ease",
                  }}
                >
                  <span>Get API key</span>
                  <ArrowTopRightOnSquareIcon style={{ width: "12px", height: "12px" }} />
                </a>
              )}
            </div>
            <span style={{ fontSize: "10.5px", color: "var(--placeholder-color)" }}>
              {selectedProvider.description}
            </span>
          </div>

          {/* API Key Input */}
          {selectedProvider.requiresKey ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-color)" }}>
                  API Key
                </label>
                {configured && connectedProvider === selectedProvider.name && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#10b981",
                    }}
                  >
                    <ShieldCheckIcon style={{ width: "11px", height: "11px" }} />
                    Active &amp; Masked
                  </span>
                )}
              </div>

              {configured && connectedProvider === selectedProvider.name && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    fontSize: "11px",
                    color: "#10b981",
                    fontWeight: 600,
                  }}
                >
                  <ShieldCheckIcon style={{ width: "13px", height: "13px", flexShrink: 0 }} />
                  <span>Key available only for this browser session</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid var(--input-border)",
                  borderRadius: "8px",
                  background: "var(--input-bg)",
                  padding: "0 8px",
                }}
              >
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    configured && connectedProvider === selectedProvider.name
                      ? "Paste new key to replace existing..."
                      : `Paste your ${selectedProvider.name} API key...`
                  }
                  disabled={busy}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-color)",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
                {apiKey.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--placeholder-color)",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    {showKey ? (
                      <EyeSlashIcon style={{ width: "14px", height: "14px" }} />
                    ) : (
                      <EyeIcon style={{ width: "14px", height: "14px" }} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {/* Connect Action Button */}
          <button
            onClick={handleConnect}
            disabled={busy || !apiKey.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "none",
              background: "#fbbf24",
              color: "#29200a",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: busy ? "wait" : "pointer",
              transition: "opacity 0.12s ease",
              marginTop: "2px",
            }}
          >
            <CheckIcon style={{ width: "14px", height: "14px" }} />
            {busy ? "Connecting…" : configured ? "Update key" : "Connect"}
          </button>

          {/* Minimal Privacy Note */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "10px",
              color: "var(--placeholder-color)",
              justifyContent: "center",
              marginTop: "2px",
            }}
          >
            <ShieldCheckIcon style={{ width: "12px", height: "12px", color: "#34d399" }} />
            <span>Session only · Sent to {selectedProvider.name}</span>
          </div>
        </div>
      )}

      {/* TAB 2: TAB STORY PRO (BUSINESS / NO-SETUP PLAN) */}
      {activeTab === "pro" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "4px 2px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-color)" }}>
                Tab Story Pro
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "2px 7px",
                  borderRadius: "12px",
                  background: "rgba(168, 85, 247, 0.15)",
                  color: "#a855f7",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  textTransform: "uppercase",
                }}
              >
                No API Keys Needed
              </span>
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--placeholder-color)", margin: 0, lineHeight: 1.4 }}>
              A managed plan is being prepared for people who do not want to configure an API key.
            </p>
          </div>

          {/* Pro Benefits List */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              background: "rgba(120, 120, 130, 0.06)",
              borderRadius: "10px",
              padding: "10px",
            }}
          >
            {[
              "No personal API-key setup",
              "Managed usage and billing",
              "Priority availability",
              "Planned for a future release",
            ].map((feature, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px" }}>
                <CheckIcon style={{ width: "12px", height: "12px", color: "#34d399", flexShrink: 0 }} />
                <span style={{ color: "var(--text-color)" }}>{feature}</span>
              </div>
            ))}
          </div>

          {/* Price & Upgrade Button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
            <div>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-color)" }}>Coming soon</span>
            </div>

            <button
              onClick={() => setProModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "9px 14px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #a855f7 0%, #fbbf24 100%)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(168, 85, 247, 0.35)",
              }}
            >
              <SparklesIcon style={{ width: "13px", height: "13px" }} />
              Learn more
            </button>
          </div>

          {proModalOpen && (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                background: "rgba(168, 85, 247, 0.12)",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                fontSize: "11px",
                color: "var(--text-color)",
                lineHeight: 1.4,
              }}
            >
              🎉 <strong>Early Supporter Pass:</strong> Tab Story Pro subscriptions are rolling out! For now, you can connect your free API key on the left to enjoy all AI features for free.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
