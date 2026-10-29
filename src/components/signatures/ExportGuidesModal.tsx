"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Laptop,
  Smartphone,
  Mail,
  Shield,
  Layers,
} from "lucide-react";

interface ExportGuidesModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatureHtml: string;
  signatureName: string;
}

export function ExportGuidesModal({
  isOpen,
  onClose,
  signatureHtml,
  signatureName,
}: ExportGuidesModalProps) {
  const [activeClient, setActiveClient] = useState<"outlook" | "apple" | "gmail" | "thunderbird">("outlook");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(signatureHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([signatureHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${signatureName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_signature.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Export & Install Signature: <span className="text-indigo-600">{signatureName}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Follow step-by-step setup guides for your preferred email application.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action Banner */}
        <div className="p-4 bg-indigo-50/60 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-indigo-900 font-medium">
            Ready to paste your signature into an email client?
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied to Clipboard!" : "Copy Formatted HTML"}</span>
            </button>
            <button
              onClick={handleDownloadHtml}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download .HTML</span>
            </button>
          </div>
        </div>

        {/* Client Selection Tabs */}
        <div className="px-6 pt-4 border-b border-slate-100 flex items-center space-x-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: "outlook", label: "Microsoft Outlook", icon: "📧" },
            { id: "apple", label: "Apple Mail (Mac & iOS)", icon: "🍏" },
            { id: "gmail", label: "Gmail / Workspace", icon: "🔴" },
            { id: "thunderbird", label: "Mozilla Thunderbird", icon: "🦅" },
          ].map((client) => (
            <button
              key={client.id}
              onClick={() => setActiveClient(client.id as any)}
              className={`pb-3 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                activeClient === client.id
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{client.icon}</span>
              <span>{client.label}</span>
            </button>
          ))}
        </div>

        {/* Instructions Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          {activeClient === "outlook" && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1">Outlook for Windows / Mac Desktop:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                  <li>In Outlook, click <strong>File</strong> &gt; <strong>Options</strong> &gt; <strong>Mail</strong> &gt; <strong>Signatures</strong> (or on Mac: <strong>Outlook</strong> &gt; <strong>Settings</strong> &gt; <strong>Signatures</strong>).</li>
                  <li>Click <strong>New</strong>, enter a name (e.g. <em>&quot;{signatureName}&quot;</em>).</li>
                  <li>Click <strong>Copy Formatted HTML</strong> above, then paste directly into the signature edit box (<kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px]">Ctrl+V</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px]">Cmd+V</kbd>).</li>
                  <li>Select your email account under <strong>Choose default signature</strong> and click <strong>OK</strong>.</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1">Outlook on the Web (Office 365):</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                  <li>Click the <strong>Gear / Settings</strong> icon in the top right.</li>
                  <li>Go to <strong>Mail</strong> &gt; <strong>Compose and reply</strong>.</li>
                  <li>Under <strong>Email signature</strong>, click <strong>+ New signature</strong>.</li>
                  <li>Paste the copied signature directly into the editor and click <strong>Save</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {activeClient === "apple" && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1">Apple Mail on macOS:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                  <li>Open <strong>Mail</strong> &gt; <strong>Settings...</strong> (or <strong>Preferences</strong>) &gt; <strong>Signatures</strong> tab.</li>
                  <li>Select your email account in the left column and click the <strong>+</strong> button to create a signature.</li>
                  <li>Uncheck <strong>&quot;Always match my default message font&quot;</strong> (essential to preserve HTML styling).</li>
                  <li>Click <strong>Copy Formatted HTML</strong> above, highlight and paste into the preview box.</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1">iPhone &amp; iPad (iOS):</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                  <li>Send an email containing this signature to yourself.</li>
                  <li>On your iPhone, copy the rendered signature.</li>
                  <li>Go to <strong>Settings</strong> &gt; <strong>Mail</strong> &gt; <strong>Signature</strong>, select your account, and paste.</li>
                  <li>Shake your phone and tap <strong>Undo Change Attributes</strong> to restore original HTML formatting!</li>
                </ol>
              </div>
            </div>
          )}

          {activeClient === "gmail" && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900">Gmail &amp; Google Workspace:</h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                <li>In Gmail, click the <strong>Gear icon</strong> (Settings) &gt; <strong>See all settings</strong>.</li>
                <li>On the <strong>General</strong> tab, scroll down to the <strong>Signature</strong> section.</li>
                <li>Click <strong>+ Create new</strong>, name your signature.</li>
                <li>Click <strong>Copy Formatted HTML</strong> above, then paste directly into the text box.</li>
                <li>Under <strong>Signature defaults</strong>, select your new signature for <em>For new emails use</em> and <em>On reply/forward use</em>.</li>
                <li>Scroll to the bottom of the page and click <strong>Save Changes</strong>.</li>
              </ol>
            </div>
          )}

          {activeClient === "thunderbird" && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900">Mozilla Thunderbird:</h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                <li>Click <strong>Download .HTML</strong> above to save the signature file to your computer.</li>
                <li>In Thunderbird, open <strong>Account Settings</strong> (click the gear or menu in bottom left).</li>
                <li>Under your email account, locate <strong>Signature text</strong>.</li>
                <li>Check the box <strong>&quot;Attach the signature from a file instead (text, HTML, or image)&quot;</strong>.</li>
                <li>Click <strong>Choose...</strong>, select the downloaded HTML file, and click OK.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Powered by Monogram Mail Brand Identity Engine
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
