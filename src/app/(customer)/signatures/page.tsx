"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PenTool,
  Copy,
  Check,
  Download,
  Plus,
  Trash2,
  Copy as DuplicateIcon,
  Sparkles,
  Inbox,
  Eye,
  Settings,
  Globe,
  Mail,
  Phone,
  MapPin,
  Lightbulb,
  Smartphone,
  Laptop,
  BookOpen,
  ChevronDown,
  Layers,
  Save,
  CheckCircle2,
  Users,
} from "lucide-react";
import { ExportGuidesModal } from "@/components/signatures/ExportGuidesModal";

export interface SignatureItem {
  id: string;
  name: string;
  templateId: string;
  signoff: string;
  fullName: string;
  jobTitle: string;
  company: string;
  department: string;
  email: string;
  phone: string;
  mobile: string;
  website: string;
  address: string;
  avatarUrl: string;
  avatarShape: "circle" | "rounded" | "square";
  accentColor: string;
  fontFamily: string;
  ctaText: string;
  ctaUrl: string;
  bannerUrl: string;
  bannerLink: string;
  showSocials: boolean;
  linkedinUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  whatsappUrl: string;
  githubUrl: string;
  showAppBadges: boolean;
  showDisclaimer: boolean;
  disclaimerText: string;
  showEcoNotice: boolean;
}

interface MailboxAccount {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  domain: string;
}

const TEMPLATES = [
  {
    id: "professional_outlook",
    name: "Professional Outlook",
    category: "Corporate",
    layout: "2-Column",
    badge: "Most Popular",
    desc: "Classic corporate balanced 2-column layout with circular photo, vertical accent line, and social icon bar.",
  },
  {
    id: "organized_outlook",
    name: "Organized Outlook",
    category: "Corporate",
    layout: "2-Column",
    badge: "Outlook Native",
    desc: "Top colored accent bar with structured corporate rows separating work phones, mobile, and web coordinates.",
  },
  {
    id: "big_and_bold",
    name: "Big and Bold",
    category: "Marketing",
    layout: "2-Column",
    badge: "High Impact",
    desc: "Bold high-contrast styling with bold title, large advertising banner, and prominent call-to-action button.",
  },
  {
    id: "on_the_wave",
    name: "On the Wave",
    category: "1-Column",
    layout: "1-Column",
    badge: "Flowing Design",
    desc: "Streamlined 1-column layout preventing recipients from scrolling, featuring a stylish wave accent bar.",
  },
  {
    id: "clear_division_3col",
    name: "Clear Division (3-Column)",
    category: "3-Column",
    layout: "3-Column",
    badge: "3 Columns",
    desc: "Three distinct vertical blocks: Column 1 photo, Column 2 name & role, Column 3 direct contact coordinates.",
  },
  {
    id: "corporate_3col_hub",
    name: "Corporate Hub (3-Column)",
    category: "3-Column",
    layout: "3-Column",
    badge: "Enterprise",
    desc: "Col 1 logo/avatar, Col 2 company branding and physical address, Col 3 direct phone and social channels.",
  },
  {
    id: "compact_design",
    name: "Compact Design",
    category: "Compact",
    layout: "Compact",
    badge: "Reply Friendly",
    desc: "Space-saving 2-line minimalist footprint optimized for email chains, fast replies, and mobile screens.",
  },
  {
    id: "compact_large_logo",
    name: "Compact with Large Logo",
    category: "Corporate",
    layout: "2-Column",
    badge: "Brand Focus",
    desc: "High-prominence square company logo on the left with streamlined 3-line contact details on the right.",
  },
  {
    id: "marketing_best_friend",
    name: "Marketing Best Friend",
    category: "Marketing",
    layout: "2-Column",
    badge: "Top Conversion",
    desc: "Equipped with booking CTA button, full marketing campaign banner, social links, and campaign tracking.",
  },
  {
    id: "balanced_marketing",
    name: "Balanced Marketing",
    category: "Marketing",
    layout: "2-Column",
    badge: "Lead Gen",
    desc: "Clean contact card on top paired with a full-width promotional graphic card and schedule call button below.",
  },
  {
    id: "tasty_banner",
    name: "Tasty Lifestyle & Retail",
    category: "Marketing",
    layout: "1-Column",
    badge: "Vibrant",
    desc: "Vibrant lifestyle layout with prominent promotional graphics, product badges, and social media pills.",
  },
  {
    id: "simple_informative",
    name: "Simple Yet Informative",
    category: "1-Column",
    layout: "1-Column",
    badge: "Clean Minimal",
    desc: "No-frills, balanced classic typography with subtle dividers, zero visual clutter, and pristine readability.",
  },
  {
    id: "corporate_gold",
    name: "Corporate Gold Simple",
    category: "Corporate",
    layout: "2-Column",
    badge: "Executive",
    desc: "Warm luxury styling with golden-amber accents, refined serif typography, and prestigious leadership flair.",
  },
  {
    id: "elegant_logo",
    name: "Elegant Logo Centered",
    category: "1-Column",
    layout: "1-Column",
    badge: "Luxury & Agency",
    desc: "Centered corporate identity branding with clean horizontal contact bar, ideal for boutiques and agencies.",
  },
  {
    id: "retro_minimalist",
    name: "Retro Minimalist",
    category: "Compact",
    layout: "Compact",
    badge: "Monospace",
    desc: "Typewriter monospace typography inside a crisp dashed frame with understated contact badges.",
  },
  {
    id: "law_firm_legal",
    name: "Law Firm & Legal Disclaimer",
    category: "Industry",
    layout: "2-Column",
    badge: "Compliance",
    desc: "Formal serif layout with scale insignia, direct line, bar credentials, and GDPR/confidentiality legal notice.",
  },
  {
    id: "creative_social",
    name: "Creative Studio & Social",
    category: "Corporate",
    layout: "2-Column",
    badge: "Design Agency",
    desc: "Dynamic layout for designers, studios, and agencies with bold title tags, portfolio button, and social pills.",
  },
  {
    id: "medical_doctor",
    name: "Doctor & Healthcare Clinic",
    category: "Industry",
    layout: "2-Column",
    badge: "Medical / MD",
    desc: "Healthcare layout featuring medical badge, clinic hours, emergency line, and patient portal button.",
  },
  {
    id: "real_estate_realtor",
    name: "Real Estate & Realtor",
    category: "Industry",
    layout: "2-Column",
    badge: "Realty MLS",
    desc: "Realtor portrait, license #, brokerage affiliation, and View Featured Listings call-to-action button.",
  },
  {
    id: "executive_ceo",
    name: "Executive CEO & Founder",
    category: "Corporate",
    layout: "2-Column",
    badge: "C-Suite",
    desc: "Prestige dark accent header, executive direct line, assistant contact, and digital signature stamp.",
  },
  {
    id: "eco_friendly_green",
    name: "Eco-Friendly Green",
    category: "1-Column",
    layout: "1-Column",
    badge: "Sustainability",
    desc: "Nature green branding, environmental tree badge, paperless email pledge, and eco printing advisory.",
  },
  {
    id: "mobile_first",
    name: "Mobile-First Compact",
    category: "Compact",
    layout: "Compact",
    badge: "iPhone / Android",
    desc: "Responsive single-column layout with touch-friendly links optimized for small smartphone screens.",
  },
  {
    id: "dark_tech_card",
    name: "Dark Tech Card",
    category: "Industry",
    layout: "2-Column",
    badge: "Developer",
    desc: "High-contrast dark-mode card with monospace tags, developer verification badge, and GitHub links.",
  },
  {
    id: "support_hero",
    name: "Customer Support Hero",
    category: "Industry",
    layout: "2-Column",
    badge: "Helpdesk",
    desc: "Helpdesk support agent layout with live status pill, ticket portal button, and satisfaction rating.",
  },
];

const DEFAULT_SIGNATURES: SignatureItem[] = [
  {
    id: "sig_default",
    name: "Corporate Primary",
    templateId: "professional_outlook",
    signoff: "Best regards,",
    fullName: "Henrik Ross",
    jobTitle: "Co-Founder & VP Operations",
    company: "Monogram Mail",
    department: "Executive",
    email: "henrik@monogrammail.com",
    phone: "+1 (555) 234-5678",
    mobile: "+1 (555) 876-5432",
    website: "monogrammail.com",
    address: "100 Montgomery St, Suite 400, San Francisco, CA",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80",
    avatarShape: "rounded",
    accentColor: "#4f46e5",
    fontFamily: "Arial, Helvetica, sans-serif",
    ctaText: "Book a 15-min call",
    ctaUrl: "https://calendly.com",
    bannerUrl: "",
    bannerLink: "",
    showSocials: true,
    linkedinUrl: "https://linkedin.com",
    twitterUrl: "https://twitter.com",
    facebookUrl: "",
    instagramUrl: "",
    whatsappUrl: "+15552345678",
    githubUrl: "",
    showAppBadges: false,
    showDisclaimer: true,
    disclaimerText: "IMPORTANT: The contents of this email and any attachments are confidential. If you received this by mistake, please notify the sender immediately.",
    showEcoNotice: true,
  },
  {
    id: "sig_sales",
    name: "Sales & Booking CTA",
    templateId: "marketing_best_friend",
    signoff: "Warm regards,",
    fullName: "Eleanor Waters",
    jobTitle: "Head of Client Solutions",
    company: "Monogram Mail",
    department: "Growth",
    email: "sales@monogrammail.com",
    phone: "+1 (555) 789-0123",
    mobile: "",
    website: "monogrammail.com/enterprise",
    address: "San Francisco, CA",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80",
    avatarShape: "circle",
    accentColor: "#059669",
    fontFamily: "Arial, Helvetica, sans-serif",
    ctaText: "Schedule a Live Demo",
    ctaUrl: "https://calendly.com",
    bannerUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500&auto=format&fit=crop&q=80",
    bannerLink: "https://monogrammail.com/features",
    showSocials: true,
    linkedinUrl: "https://linkedin.com",
    twitterUrl: "https://twitter.com",
    facebookUrl: "",
    instagramUrl: "",
    whatsappUrl: "",
    githubUrl: "",
    showAppBadges: true,
    showDisclaimer: false,
    disclaimerText: "",
    showEcoNotice: false,
  },
  {
    id: "sig_support",
    name: "Customer Support Minimal",
    templateId: "compact_design",
    signoff: "Cheers,",
    fullName: "Monogram Support Team",
    jobTitle: "Technical Support",
    company: "Monogram Mail",
    department: "Customer Success",
    email: "support@monogrammail.com",
    phone: "+1 (800) 555-MAIL",
    mobile: "",
    website: "monogrammail.com/help",
    address: "",
    avatarUrl: "",
    avatarShape: "square",
    accentColor: "#2563eb",
    fontFamily: "Arial, Helvetica, sans-serif",
    ctaText: "Open Help Center",
    ctaUrl: "https://monogrammail.com/help",
    bannerUrl: "",
    bannerLink: "",
    showSocials: false,
    linkedinUrl: "",
    twitterUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    whatsappUrl: "",
    githubUrl: "",
    showAppBadges: false,
    showDisclaimer: true,
    disclaimerText: "Ticket resolution powered by Monogram Mail SLA engine.",
    showEcoNotice: false,
  },
];

export default function SignaturesStudioPage() {
  const [signatures, setSignatures] = useState<SignatureItem[]>(DEFAULT_SIGNATURES);
  const [selectedSigId, setSelectedSigId] = useState<string>("sig_default");
  const [accountMapping, setAccountMapping] = useState<Record<string, string>>({}); // { [email]: signatureId }
  const [mailboxes, setMailboxes] = useState<MailboxAccount[]>([]);
  const [activeTab, setActiveTab] = useState<"templates" | "content" | "accounts" | "motivation">("templates");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<string>("All");

  // Load signatures and mailbox accounts
  useEffect(() => {
    try {
      const savedSigs = localStorage.getItem("monogram_multi_signatures");
      if (savedSigs) {
        const parsed = JSON.parse(savedSigs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSignatures(parsed);
          setSelectedSigId(parsed[0].id);
        }
      }

      const savedMapping = localStorage.getItem("monogram_account_signature_mapping");
      if (savedMapping) {
        setAccountMapping(JSON.parse(savedMapping));
      }
    } catch {}

    // Fetch live mailboxes
    fetch("/api/v1/mailboxes")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.mailboxes) {
          setMailboxes(data.mailboxes);
        }
      })
      .catch(() => {});
  }, []);

  // Currently active signature object
  const activeSig = useMemo(() => {
    return signatures.find((s) => s.id === selectedSigId) || signatures[0] || DEFAULT_SIGNATURES[0];
  }, [signatures, selectedSigId]);

  // Update current signature fields
  const updateActiveSig = (fields: Partial<SignatureItem>) => {
    setSignatures((prev) =>
      prev.map((s) => (s.id === selectedSigId ? { ...s, ...fields } : s))
    );
  };

  // Save all changes to localStorage
  const handleSaveAll = () => {
    try {
      localStorage.setItem("monogram_multi_signatures", JSON.stringify(signatures));
      localStorage.setItem("monogram_account_signature_mapping", JSON.stringify(accountMapping));
      // Also update active signature for webmail default
      localStorage.setItem("monogram_email_signature", JSON.stringify(activeSig));
      localStorage.setItem("monogram_email_signature_html", generateHtml(activeSig));

      setSavedStatus("All changes saved!");
      setTimeout(() => setSavedStatus(null), 2500);
    } catch {}
  };

  // Create new signature
  const handleCreateNew = () => {
    const newId = `sig_${Date.now()}`;
    const newSig: SignatureItem = {
      ...DEFAULT_SIGNATURES[0],
      id: newId,
      name: `Signature ${signatures.length + 1}`,
      templateId: "professional_outlook",
    };
    const next = [...signatures, newSig];
    setSignatures(next);
    setSelectedSigId(newId);
    setActiveTab("content");
  };

  // Duplicate active signature
  const handleDuplicate = () => {
    const newId = `sig_${Date.now()}`;
    const cloned: SignatureItem = {
      ...activeSig,
      id: newId,
      name: `${activeSig.name} (Copy)`,
    };
    setSignatures([...signatures, cloned]);
    setSelectedSigId(newId);
  };

  // Delete active signature
  const handleDelete = () => {
    if (signatures.length <= 1) {
      alert("You must keep at least one signature template.");
      return;
    }
    if (confirm(`Delete "${activeSig.name}"?`)) {
      const remaining = signatures.filter((s) => s.id !== activeSig.id);
      setSignatures(remaining);
      setSelectedSigId(remaining[0].id);
    }
  };

  // Map mailbox account to signature
  const handleMapAccount = (email: string, signatureId: string) => {
    const next = { ...accountMapping, [email]: signatureId };
    setAccountMapping(next);
    try {
      localStorage.setItem("monogram_account_signature_mapping", JSON.stringify(next));
    } catch {}
  };

  // Generate Email-Client Compatible HTML Table matching mail-signatures.com templates
  const generateHtml = (s: SignatureItem) => {
    // Backward compatibility normalization
    let tid = s.templateId;
    if (tid === "two_column_bar") tid = "professional_outlook";
    if (tid === "modern_minimal") tid = "simple_informative";
    if (tid === "sales_promo_banner") tid = "marketing_best_friend";
    if (tid === "legal_formal") tid = "law_firm_legal";
    if (tid === "creative_accent_header") tid = "creative_social";
    if (tid === "executive_portrait") tid = "executive_ceo";
    if (tid === "compact_reply") tid = "compact_design";

    const isDark = tid === "dark_tech_card";
    const bgCol = isDark ? "#0f172a" : "#ffffff";
    const textCol = isDark ? "#f8fafc" : "#1e293b";
    const subCol = isDark ? "#94a3b8" : "#64748b";
    const accent = tid === "corporate_gold" ? "#d97706" : tid === "eco_friendly_green" ? "#16a34a" : (s.accentColor || "#4f46e5");
    const cleanWeb = s.website ? s.website.replace(/^https?:\/\//, "") : "";
    const font = tid === "law_firm_legal" || tid === "corporate_gold" ? 'Georgia, "Times New Roman", serif' :
                 tid === "retro_minimalist" ? '"Courier New", Courier, monospace' :
                 (s.fontFamily || "Arial, Helvetica, sans-serif");

    const shape = s.avatarShape === "circle" ? "50%" : s.avatarShape === "rounded" ? "12px" : "4px";

    // Social Links
    const socialLinks: string[] = [];
    if (s.showSocials) {
      if (s.linkedinUrl) socialLinks.push(`<a href="${s.linkedinUrl}" style="display:inline-block; margin-right:5px; text-decoration:none;"><span style="display:inline-block; width:20px; height:20px; background-color:${accent}; color:#fff; border-radius:4px; text-align:center; font-size:10px; font-weight:bold; line-height:20px;">in</span></a>`);
      if (s.twitterUrl) socialLinks.push(`<a href="${s.twitterUrl}" style="display:inline-block; margin-right:5px; text-decoration:none;"><span style="display:inline-block; width:20px; height:20px; background-color:${accent}; color:#fff; border-radius:4px; text-align:center; font-size:10px; font-weight:bold; line-height:20px;">𝕏</span></a>`);
      if (s.facebookUrl) socialLinks.push(`<a href="${s.facebookUrl}" style="display:inline-block; margin-right:5px; text-decoration:none;"><span style="display:inline-block; width:20px; height:20px; background-color:${accent}; color:#fff; border-radius:4px; text-align:center; font-size:10px; font-weight:bold; line-height:20px;">f</span></a>`);
      if (s.instagramUrl) socialLinks.push(`<a href="${s.instagramUrl}" style="display:inline-block; margin-right:5px; text-decoration:none;"><span style="display:inline-block; width:20px; height:20px; background-color:${accent}; color:#fff; border-radius:4px; text-align:center; font-size:10px; font-weight:bold; line-height:20px;">ig</span></a>`);
      if (s.whatsappUrl) socialLinks.push(`<a href="https://wa.me/${s.whatsappUrl.replace(/[^0-9]/g, "")}" style="display:inline-block; margin-right:5px; text-decoration:none;"><span style="display:inline-block; width:20px; height:20px; background-color:#16a34a; color:#fff; border-radius:4px; text-align:center; font-size:10px; font-weight:bold; line-height:20px;">wa</span></a>`);
      if (s.githubUrl) socialLinks.push(`<a href="${s.githubUrl}" style="display:inline-block; margin-right:5px; text-decoration:none;"><span style="display:inline-block; width:20px; height:20px; background-color:#333; color:#fff; border-radius:4px; text-align:center; font-size:10px; font-weight:bold; line-height:20px;">gh</span></a>`);
    }
    const socialsHtml = socialLinks.length > 0 ? `<div style="margin-top:8px;">${socialLinks.join("")}</div>` : "";

    // CTA Button
    const ctaHtml = s.ctaText && s.ctaUrl
      ? `<div style="margin-top:10px;"><a href="${s.ctaUrl}" style="display:inline-block; background-color:${accent}; color:#ffffff; padding:6px 14px; font-size:11px; font-weight:bold; text-decoration:none; border-radius:6px;">${s.ctaText} →</a></div>`
      : "";

    // Marketing Banner
    const bannerHtml = s.bannerUrl
      ? `<tr><td style="padding-top:14px;"><a href="${s.bannerLink || "#"}"><img src="${s.bannerUrl}" alt="Promotion" width="480" style="display:block; width:100%; max-width:480px; height:auto; border-radius:8px;" /></a></td></tr>`
      : "";

    // Disclaimer
    const disclaimerHtml = s.showDisclaimer && s.disclaimerText
      ? `<tr><td style="padding-top:10px; font-size:10px; color:#94a3b8; line-height:1.3; border-top:1px solid #e2e8f0; margin-top:10px;">${s.disclaimerText}</td></tr>`
      : "";

    // Eco Notice
    const ecoHtml = s.showEcoNotice
      ? `<tr><td style="padding-top:6px; font-size:10px; color:#16a34a; font-style:italic;">🌱 Please consider the environment before printing this email.</td></tr>`
      : "";

    // Sign-off
    const signoffHtml = s.signoff
      ? `<tr><td style="padding-bottom:8px; font-style:italic; color:${subCol}; font-size:14px;">${s.signoff}</td></tr>`
      : "";

    // Layout Branch 1: 3-COLUMN LAYOUTS (clear_division_3col, corporate_3col_hub)
    if (tid === "clear_division_3col" || tid === "corporate_3col_hub") {
      return `<!-- Mail-Signatures.com [${s.name} - 3-Column] -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${font}; font-size: 13px; color: ${textCol}; line-height: 1.4; max-width: 580px; background-color: ${bgCol};">
  ${signoffHtml}
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <!-- Col 1: Photo / Logo -->
          <td valign="middle" style="padding-right: 14px;">
            ${s.avatarUrl ? `<img src="${s.avatarUrl}" alt="${s.fullName}" width="64" height="64" style="display:block; width:64px; height:64px; border-radius:${shape}; object-fit:cover;" />` : `<div style="width:56px; height:56px; border-radius:${shape}; background:${accent}15; color:${accent}; font-weight:bold; font-size:18px; text-align:center; line-height:56px;">${s.fullName.slice(0, 2).toUpperCase()}</div>`}
          </td>
          <!-- Divider 1 -->
          <td valign="middle" style="border-right: 2px solid ${accent}; padding-right: 14px;"></td>
          <!-- Col 2: Name & Role -->
          <td valign="middle" style="padding: 0 14px; min-width: 140px;">
            <div style="font-weight: bold; font-size: 15px; color: ${textCol};">${s.fullName}</div>
            <div style="font-size: 11px; color: ${accent}; font-weight: 700; text-transform: uppercase; margin-top: 2px;">${s.jobTitle}</div>
            <div style="font-size: 12px; color: ${subCol}; font-weight: 600; margin-top: 2px;">${s.company}</div>
            ${s.department ? `<div style="font-size: 11px; color: ${subCol}; font-style: italic;">${s.department}</div>` : ""}
          </td>
          <!-- Divider 2 -->
          <td valign="middle" style="border-right: 1px solid #e2e8f0; padding-right: 14px;"></td>
          <!-- Col 3: Coordinates & Socials -->
          <td valign="middle" style="padding-left: 14px; font-size: 11px; color: ${subCol};">
            ${s.email ? `<div><span style="color:${accent}; font-weight:bold;">✉</span> <a href="mailto:${s.email}" style="color:${subCol}; text-decoration:none;">${s.email}</a></div>` : ""}
            ${s.phone ? `<div><span style="color:${accent}; font-weight:bold;">📞</span> <a href="tel:${s.phone}" style="color:${subCol}; text-decoration:none;">${s.phone}</a></div>` : ""}
            ${s.website ? `<div><span style="color:${accent}; font-weight:bold;">🌐</span> <a href="https://${cleanWeb}" style="color:${accent}; text-decoration:none; font-weight:600;">${s.website}</a></div>` : ""}
            ${socialsHtml}
          </td>
        </tr>
      </table>
      ${ctaHtml}
    </td>
  </tr>
  ${bannerHtml}
  ${disclaimerHtml}
  ${ecoHtml}
</table>`;
    }

    // Layout Branch 2: COMPACT & MOBILE (compact_design, mobile_first)
    if (tid === "compact_design" || tid === "mobile_first") {
      return `<!-- Mail-Signatures.com [${s.name} - Compact] -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${font}; font-size: 12px; color: ${textCol}; line-height: 1.4; max-width: 460px; background-color: ${bgCol};">
  ${signoffHtml}
  <tr>
    <td style="padding-bottom: 2px;">
      <strong style="font-size: 13px; color: ${textCol};">${s.fullName}</strong>
      <span style="color: ${accent}; font-weight: 600;"> &bull; ${s.jobTitle}${s.company ? ` at ${s.company}` : ""}</span>
    </td>
  </tr>
  <tr>
    <td style="font-size: 11px; color: ${subCol};">
      <a href="mailto:${s.email}" style="color: ${subCol}; text-decoration: none;">${s.email}</a>
      ${s.phone ? ` &bull; <a href="tel:${s.phone}" style="color: ${subCol}; text-decoration: none;">${s.phone}</a>` : ""}
      ${s.website ? ` &bull; <a href="https://${cleanWeb}" style="color: ${accent}; text-decoration: none; font-weight: 600;">${s.website}</a>` : ""}
      ${s.address ? ` &bull; <span>${s.address}</span>` : ""}
    </td>
  </tr>
  ${ctaHtml ? `<tr><td>${ctaHtml}</td></tr>` : ""}
  ${disclaimerHtml}
  ${ecoHtml}
</table>`;
    }

    // Layout Branch 3: LARGE LOGO (compact_large_logo)
    if (tid === "compact_large_logo") {
      return `<!-- Mail-Signatures.com [${s.name} - Large Logo] -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${font}; font-size: 13px; color: ${textCol}; line-height: 1.4; max-width: 500px; background-color: ${bgCol};">
  ${signoffHtml}
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="top" style="padding-right: 16px;">
            ${s.avatarUrl ? `<img src="${s.avatarUrl}" alt="${s.company || s.fullName}" width="84" height="84" style="display:block; width:84px; height:84px; border-radius:8px; object-fit:cover; border:1px solid #e2e8f0;" />` : `<div style="width:84px; height:84px; border-radius:8px; background:${accent}; color:#fff; font-weight:bold; font-size:24px; text-align:center; line-height:84px;">${(s.company || s.fullName).slice(0, 2).toUpperCase()}</div>`}
          </td>
          <td valign="top" style="border-left: 2px solid ${accent}; padding-left: 14px;">
            <div style="font-weight: bold; font-size: 15px; color: ${textCol};">${s.fullName}</div>
            <div style="font-size: 12px; color: ${accent}; font-weight: 700;">${s.jobTitle} | ${s.company}</div>
            <div style="font-size: 11px; color: ${subCol}; margin-top: 4px; line-height: 1.5;">
              <div>✉ <a href="mailto:${s.email}" style="color:${subCol}; text-decoration:none;">${s.email}</a></div>
              ${s.phone ? `<div>📞 <a href="tel:${s.phone}" style="color:${subCol}; text-decoration:none;">${s.phone}</a></div>` : ""}
              ${s.website ? `<div>🌐 <a href="https://${cleanWeb}" style="color:${accent}; text-decoration:none;">${s.website}</a></div>` : ""}
            </div>
            ${socialsHtml}
          </td>
        </tr>
      </table>
      ${ctaHtml}
    </td>
  </tr>
  ${bannerHtml}
  ${disclaimerHtml}
  ${ecoHtml}
</table>`;
    }

    // Layout Branch 4: 1-COLUMN FLOWING (on_the_wave, simple_informative, elegant_logo, eco_friendly_green)
    if (tid === "on_the_wave" || tid === "simple_informative" || tid === "elegant_logo" || tid === "eco_friendly_green") {
      const isCentered = tid === "elegant_logo";
      return `<!-- Mail-Signatures.com [${s.name} - 1-Column] -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${font}; font-size: 13px; color: ${textCol}; line-height: 1.4; max-width: 500px; background-color: ${bgCol}; ${isCentered ? "text-align: center; margin: 0 auto;" : ""}">
  ${signoffHtml}
  ${
    tid === "on_the_wave"
      ? `<tr><td><div style="height: 4px; width: 100%; max-width: 320px; background: linear-gradient(90deg, ${accent}, #ec4899); border-radius: 2px; margin-bottom: 8px;"></div></td></tr>`
      : tid === "eco_friendly_green"
      ? `<tr><td><div style="height: 3px; width: 100%; max-width: 280px; background-color: #16a34a; margin-bottom: 8px;"></div></td></tr>`
      : ""
  }
  <tr>
    <td ${isCentered ? 'align="center"' : ""}>
      ${
        s.avatarUrl
          ? `<div style="margin-bottom: 8px;"><img src="${s.avatarUrl}" alt="${s.fullName}" width="58" height="58" style="display:inline-block; width:58px; height:58px; border-radius:${shape}; object-fit:cover;" /></div>`
          : ""
      }
      <div style="font-weight: bold; font-size: 16px; color: ${textCol}; letter-spacing: -0.2px;">
        ${tid === "eco_friendly_green" ? "🌿 " : ""}${s.fullName}
      </div>
      <div style="font-size: 12px; color: ${accent}; font-weight: 700; text-transform: uppercase; margin-top: 2px;">
        ${s.jobTitle} ${s.company ? `&bull; ${s.company}` : ""}
      </div>
      <div style="margin-top: 6px; font-size: 11px; color: ${subCol};">
        <a href="mailto:${s.email}" style="color:${subCol}; text-decoration:none;">${s.email}</a>
        ${s.phone ? ` &bull; <a href="tel:${s.phone}" style="color:${subCol}; text-decoration:none;">${s.phone}</a>` : ""}
        ${s.website ? ` &bull; <a href="https://${cleanWeb}" style="color:${accent}; text-decoration:none; font-weight:600;">${s.website}</a>` : ""}
      </div>
      ${s.address ? `<div style="font-size: 11px; color: ${subCol}; margin-top: 2px;">📍 ${s.address}</div>` : ""}
      ${socialsHtml}
      ${ctaHtml}
    </td>
  </tr>
  ${bannerHtml}
  ${disclaimerHtml}
  ${ecoHtml}
</table>`;
    }

    // Layout Branch 5: RETRO MINIMALIST (retro_minimalist)
    if (tid === "retro_minimalist") {
      return `<!-- Mail-Signatures.com [${s.name} - Retro Monospace] -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${font}; font-size: 12px; color: #334155; line-height: 1.4; max-width: 480px; border: 1px dashed #94a3b8; padding: 12px; border-radius: 6px; background-color: #f8fafc;">
  ${signoffHtml}
  <tr>
    <td>
      <div style="font-weight: bold; font-size: 14px; color: #0f172a;">// ${s.fullName}</div>
      <div style="font-size: 11px; color: ${accent}; font-weight: bold;">[${s.jobTitle} @ ${s.company}]</div>
      <div style="margin-top: 8px; font-size: 11px; color: #475569; line-height: 1.6;">
        <div>&gt; email : <a href="mailto:${s.email}" style="color:#0f172a; text-decoration:none;">${s.email}</a></div>
        ${s.phone ? `<div>&gt; phone : <a href="tel:${s.phone}" style="color:#0f172a; text-decoration:none;">${s.phone}</a></div>` : ""}
        ${s.website ? `<div>&gt; web   : <a href="https://${cleanWeb}" style="color:${accent}; text-decoration:none;">${s.website}</a></div>` : ""}
      </div>
      ${ctaHtml}
    </td>
  </tr>
  ${bannerHtml}
  ${disclaimerHtml}
  ${ecoHtml}
</table>`;
    }

    // Layout Branch 6: INDUSTRY SPECIALIZED (law_firm_legal, medical_doctor, real_estate_realtor, executive_ceo, support_hero, dark_tech_card)
    if (tid === "law_firm_legal" || tid === "medical_doctor" || tid === "real_estate_realtor" || tid === "executive_ceo" || tid === "support_hero" || tid === "dark_tech_card") {
      const badgeText = tid === "law_firm_legal" ? "⚖️ Attorney at Law &bull; Bar Certified" :
                        tid === "medical_doctor" ? "⚕️ Licensed Practitioner &bull; MD Clinic" :
                        tid === "real_estate_realtor" ? "🏡 Certified Realtor &bull; MLS Member" :
                        tid === "executive_ceo" ? "🏛️ Office of the Chief Executive" :
                        tid === "support_hero" ? "🟢 Support Specialist &bull; ★★★★★ Verified" :
                        "⚡ Verified Developer &bull; PGP / SSH";

      return `<!-- Mail-Signatures.com [${s.name} - Industry] -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${font}; font-size: 13px; color: ${textCol}; line-height: 1.4; max-width: 520px; background-color: ${bgCol}; ${isDark ? "padding: 16px; border-radius: 12px;" : ""}">
  ${signoffHtml}
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${
            s.avatarUrl
              ? `<td valign="top" style="padding-right: 14px;">
                  <img src="${s.avatarUrl}" alt="${s.fullName}" width="68" height="68" style="display: block; width: 68px; height: 68px; border-radius: ${shape}; object-fit: cover;" />
                </td>`
              : ""
          }
          <td valign="top" style="border-left: 3px solid ${accent}; padding-left: 12px;">
            <div style="font-size: 10px; font-weight: bold; color: ${accent}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
              ${badgeText}
            </div>
            <div style="font-weight: bold; font-size: 15px; color: ${textCol}; letter-spacing: -0.2px;">
              ${s.fullName}
            </div>
            <div style="font-size: 12px; color: ${subCol}; font-weight: 600; margin-top: 1px;">
              ${s.jobTitle} &bull; ${s.company}
            </div>
            <div style="margin-top: 6px; font-size: 11px; color: ${subCol};">
              ${s.email ? `<div><span style="color: ${accent};">✉</span> <a href="mailto:${s.email}" style="color: ${subCol}; text-decoration: none;">${s.email}</a></div>` : ""}
              ${s.phone ? `<div><span style="color: ${accent};">📞</span> <a href="tel:${s.phone}" style="color: ${subCol}; text-decoration: none;">${s.phone}</a></div>` : ""}
              ${s.website ? `<div><span style="color: ${accent};">🌐</span> <a href="https://${cleanWeb}" style="color: ${accent}; text-decoration: none; font-weight: 600;">${s.website}</a></div>` : ""}
              ${s.address ? `<div><span style="color: ${accent};">📍</span> ${s.address}</div>` : ""}
            </div>
            ${socialsHtml}
            ${ctaHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  ${bannerHtml}
  ${disclaimerHtml}
  ${ecoHtml}
</table>`;
    }

    // Default / Branch 7: BALANCED 2-COLUMN CORPORATE & OUTLOOK STANDARD
    // (professional_outlook, organized_outlook, big_and_bold, marketing_best_friend, balanced_marketing, tasty_banner, corporate_gold, creative_social)
    const isTopBorder = tid === "organized_outlook";
    return `<!-- Mail-Signatures.com [${s.name} - Standard] -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${font}; font-size: 13px; color: ${textCol}; line-height: 1.4; max-width: 520px; background-color: ${bgCol}; ${isTopBorder ? `border-top: 3px solid ${accent}; padding-top: 10px;` : ""}">
  ${signoffHtml}
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${
            s.avatarUrl
              ? `<td valign="top" style="padding-right: 14px;">
                  <img src="${s.avatarUrl}" alt="${s.fullName}" width="68" height="68" style="display: block; width: 68px; height: 68px; border-radius: ${shape}; object-fit: cover;" />
                </td>`
              : ""
          }
          <td valign="top" style="border-left: 3px solid ${accent}; padding-left: 12px;">
            <div style="font-weight: bold; font-size: 15px; color: ${textCol}; letter-spacing: -0.2px;">
              ${s.fullName}
            </div>
            <div style="font-size: 12px; color: ${accent}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">
              ${s.jobTitle} ${s.company ? `| ${s.company}` : ""}
            </div>
            <div style="margin-top: 6px; font-size: 12px; color: ${subCol};">
              ${s.email ? `<div><span style="color: ${accent};">✉</span> <a href="mailto:${s.email}" style="color: ${subCol}; text-decoration: none;">${s.email}</a></div>` : ""}
              ${s.phone ? `<div><span style="color: ${accent};">📞</span> <a href="tel:${s.phone}" style="color: ${subCol}; text-decoration: none;">${s.phone}</a></div>` : ""}
              ${s.website ? `<div><span style="color: ${accent};">🌐</span> <a href="https://${cleanWeb}" style="color: ${accent}; text-decoration: none; font-weight: 600;">${s.website}</a></div>` : ""}
              ${s.address ? `<div><span style="color: ${accent};">📍</span> ${s.address}</div>` : ""}
            </div>
            ${socialsHtml}
            ${ctaHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  ${bannerHtml}
  ${disclaimerHtml}
  ${ecoHtml}
</table>`;
  };

  const handleDownloadHtml = () => {
    const html = generateHtml(activeSig);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSig.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTemplates = useMemo(() => {
    if (templateFilter === "All") return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === templateFilter || t.layout === templateFilter);
  }, [templateFilter]);

  return (
    <div className="space-y-6 pb-16">
      {/* ── Top Bar: Signature Switcher, Actions, and Save ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Signature:
            </span>
            <select
              value={selectedSigId}
              onChange={(e) => setSelectedSigId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {signatures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreateNew}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Signature</span>
          </button>

          <button
            onClick={handleDuplicate}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs rounded-lg hover:bg-slate-100 transition-colors"
            title="Duplicate current signature"
          >
            <DuplicateIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            onClick={handleDelete}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-rose-500 hover:text-rose-700 text-xs rounded-lg hover:bg-rose-50 transition-colors"
            title="Delete current signature"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export & Guides</span>
          </button>

          <button
            onClick={handleSaveAll}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-600/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{savedStatus || "Save & Sync to Webmail"}</span>
          </button>
        </div>
      </div>

      {/* ── Studio Navigation Tabs ── */}
      <div className="flex items-center space-x-2 border-b border-slate-200 text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab("templates")}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === "templates"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Template Gallery (8 Styles)</span>
        </button>

        <button
          onClick={() => setActiveTab("content")}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === "content"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Edit Content & Design</span>
        </button>

        <button
          onClick={() => setActiveTab("accounts")}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === "accounts"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Account Rules & Mailbox Mapping</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold">
            {mailboxes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("motivation")}
          className={`pb-3 px-3 font-semibold border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
            activeTab === "motivation"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>Adoption Strategy</span>
        </button>
      </div>

      {/* ── Main Studio Grid: Left Controls & Right Live Preview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left Column (Editor / Gallery / Mapping) ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* TAB 1: TEMPLATE GALLERY */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Choose Design Template</h3>
                  <p className="text-xs text-slate-500">
                    Switching templates preserves your current contact and logo details.
                  </p>
                </div>

                {/* Category & Layout Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {["All", "Corporate", "Marketing", "1-Column", "2-Column", "3-Column", "Compact", "Industry"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setTemplateFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        templateFilter === cat
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredTemplates.map((t) => {
                  const isSelected = activeSig.templateId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => updateActiveSig({ templateId: t.id })}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <span className="text-sm font-bold text-slate-900 block">{t.name}</span>
                          <span className="text-[10px] font-semibold text-indigo-600 font-mono">{t.layout} &bull; {t.category}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase shrink-0">
                          {t.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3 leading-relaxed">{t.desc}</p>
                      <button
                        type="button"
                        className={`w-full py-1.5 px-3 text-xs font-bold rounded-lg transition-colors ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {isSelected ? "Active Layout" : "Select Template"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CONTENT & DESIGN EDITOR */}
          {activeTab === "content" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
              {/* Signature Name */}
              <div className="pb-4 border-b border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Signature Label (Internal Name)
                </label>
                <input
                  type="text"
                  value={activeSig.name}
                  onChange={(e) => updateActiveSig({ name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              {/* Personal Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Personal & Role Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sign-off Greeting</label>
                    <input
                      type="text"
                      value={activeSig.signoff}
                      onChange={(e) => updateActiveSig({ signoff: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={activeSig.fullName}
                      onChange={(e) => updateActiveSig({ fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={activeSig.jobTitle}
                      onChange={(e) => updateActiveSig({ jobTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Company / Organization</label>
                    <input
                      type="text"
                      value={activeSig.company}
                      onChange={(e) => updateActiveSig({ company: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Contact Coordinates
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={activeSig.email}
                      onChange={(e) => updateActiveSig({ email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={activeSig.phone}
                      onChange={(e) => updateActiveSig({ phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Website</label>
                    <input
                      type="text"
                      value={activeSig.website}
                      onChange={(e) => updateActiveSig({ website: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Physical Address</label>
                    <input
                      type="text"
                      value={activeSig.address}
                      onChange={(e) => updateActiveSig({ address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Call-to-Action Button & Promotional Banner */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Call-to-Action & Promotional Banner
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CTA Button Text</label>
                    <input
                      type="text"
                      placeholder="e.g. Schedule a 15-min call"
                      value={activeSig.ctaText}
                      onChange={(e) => updateActiveSig({ ctaText: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CTA Button Link</label>
                    <input
                      type="text"
                      placeholder="https://calendly.com/your-team"
                      value={activeSig.ctaUrl}
                      onChange={(e) => updateActiveSig({ ctaUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Promotional Banner Image URL (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="https://yourdomain.com/banner.png"
                      value={activeSig.bannerUrl}
                      onChange={(e) => updateActiveSig({ bannerUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Colors, Typography, & Avatar */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Branding & Media
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Accent Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={activeSig.accentColor}
                        onChange={(e) => updateActiveSig({ accentColor: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={activeSig.accentColor}
                        onChange={(e) => updateActiveSig({ accentColor: e.target.value })}
                        className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Font Family</label>
                    <select
                      value={activeSig.fontFamily}
                      onChange={(e) => updateActiveSig({ fontFamily: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="Arial, Helvetica, sans-serif">Arial / Standard</option>
                      <option value="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif">Segoe UI</option>
                      <option value="Georgia, serif">Georgia / Editorial</option>
                      <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                      <option value="'Courier New', monospace">Courier Monospace</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Avatar Shape</label>
                    <select
                      value={activeSig.avatarShape}
                      onChange={(e) => updateActiveSig({ avatarShape: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="circle">Circular</option>
                      <option value="rounded">Rounded Square</option>
                      <option value="square">Sharp Square</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Photo / Avatar Image URL</label>
                  <input
                    type="text"
                    value={activeSig.avatarUrl}
                    onChange={(e) => updateActiveSig({ avatarUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              {/* Compliance & Disclaimers */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Compliance & Footer Notices
                </h4>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center space-x-2 font-medium">
                    <input
                      type="checkbox"
                      checked={activeSig.showDisclaimer}
                      onChange={(e) => updateActiveSig({ showDisclaimer: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Include Legal Confidentiality Notice</span>
                  </label>
                  {activeSig.showDisclaimer && (
                    <textarea
                      rows={2}
                      value={activeSig.disclaimerText}
                      onChange={(e) => updateActiveSig({ disclaimerText: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                    />
                  )}

                  <label className="flex items-center space-x-2 font-medium">
                    <input
                      type="checkbox"
                      checked={activeSig.showEcoNotice}
                      onChange={(e) => updateActiveSig({ showEcoNotice: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Include Eco-friendly Print Advisory (🌱 Please consider the environment...)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT & MAILBOX ROUTING */}
          {activeTab === "accounts" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Per-Account Active Signature Assignment
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose which signature automatically appears when composing or replying from each email account.
                </p>
              </div>

              {mailboxes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  No mailboxes found. Provision mailboxes in the Mailboxes tab to configure per-account routing.
                </div>
              ) : (
                <div className="space-y-3">
                  {mailboxes.map((mb) => {
                    const currentAssignedSigId = accountMapping[mb.email] || "sig_default";
                    return (
                      <div
                        key={mb.id}
                        className="p-4 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs font-mono">{mb.email}</p>
                            <p className="text-[11px] text-slate-500">
                              {mb.firstName ? `${mb.firstName} ${mb.lastName || ""}` : mb.domain}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-slate-500 font-semibold">Active Signature:</span>
                          <select
                            value={currentAssignedSigId}
                            onChange={(e) => handleMapAccount(mb.email, e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            {signatures.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl text-xs text-indigo-900 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Instant Webmail Integration:</span>
                  <p className="text-slate-600 mt-0.5">
                    When opening Webmail, switching between accounts automatically loads the mapped signature into your compose window.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ADOPTION & MOTIVATION STRATEGY */}
          {activeTab === "motivation" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 text-slate-700 shadow-xs">
              <div className="flex items-center space-x-2.5 text-indigo-700">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">
                  How to Drive 90%+ Signature Adoption Across Your Organization
                </h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Why do users forget or skip email signatures? Because building HTML tables is tedious, mobile clients strip them, and users don&apos;t see the immediate personal value. Here is what world-class email platforms do:
              </p>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                  <h4 className="font-bold text-indigo-950 flex items-center space-x-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Zero-Click Default on Account Creation</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Never ask a user to start from a blank screen. When an account is created, automatically generate a ready-made signature with their name, organization, and verified domain pre-loaded.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                  <h4 className="font-bold text-emerald-950 flex items-center space-x-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Frame It as a Growth & Conversion Channel (ROI)</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Don&apos;t just call it a "sign-off". Show users that adding a Calendly link (&ldquo;Book 15 mins with me&rdquo;), a product launch banner, or an app download badge turns every single outbound email into a free meeting or referral.
                  </p>
                </div>

                <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
                  <h4 className="font-bold text-purple-950 flex items-center space-x-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Gentle In-Compose Nudge</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    If an email is drafted without a signature, show a subtle one-line badge inside the compose ribbon: <em>&ldquo;You haven&apos;t set a signature yet. Click to pick one in 5 seconds.&rdquo;</em>
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 flex items-center space-x-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>Organization-Wide Brand Governance (B2B Admin Superpower)</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Allow company admins in the Admin Panel to mandate a brand template across all employee mailboxes using dynamic tags (<code className="font-mono text-indigo-600">{"{{name}}"}</code>, <code className="font-mono text-indigo-600">{"{{title}}"}</code>, <code className="font-mono text-indigo-600">{"{{phone}}"}</code>). This guarantees 100% brand consistency without employees having to lift a finger.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: Live Multi-Device Email Canvas Preview ── */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>Live Email Canvas</span>
            </span>

            {/* Desktop / Mobile Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setPreviewDevice("desktop")}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center space-x-1 transition-colors ${
                  previewDevice === "desktop"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                onClick={() => setPreviewDevice("mobile")}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center space-x-1 transition-colors ${
                  previewDevice === "mobile"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          {/* Email Preview Card */}
          <div
            className={`bg-white rounded-3xl border border-slate-300 shadow-md overflow-hidden transition-all mx-auto ${
              previewDevice === "mobile" ? "max-w-[340px]" : "w-full"
            }`}
          >
            {/* Header Chrome */}
            <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 text-xs flex items-center justify-between text-slate-600">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="ml-1 text-[11px] font-semibold text-slate-500">
                  {previewDevice === "mobile" ? "Mail on iPhone" : "Outlook / Apple Mail"}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Preview</span>
            </div>

            {/* Email Message Mock Content */}
            <div className="p-5 space-y-4 bg-white min-h-[280px]">
              <p className="text-xs text-slate-600 leading-relaxed">
                Hi Alex,
                <br /><br />
                Thanks for your note. We have deployed the carrier-grade Postfix &amp; Dovecot cluster and verified all MX and SPF records. Looking forward to our launch next week!
              </p>

              {/* RENDERED SIGNATURE CONTAINER */}
              <div
                className="pt-3 border-t border-slate-100 overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: generateHtml(activeSig) }}
              />
            </div>
          </div>

          {/* Preview Quick Action Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
            <span className="font-mono text-[11px]">Active: {activeSig.name}</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setExportModalOpen(true)}
                className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center space-x-1"
              >
                <span>Export for Outlook / Apple Mail</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cross-Platform Export & Installation Modal ── */}
      <ExportGuidesModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        signatureHtml={generateHtml(activeSig)}
        signatureName={activeSig.name}
      />
    </div>
  );
}
