import React from "react";
import { getAppSettings } from "@/lib/config";
import { CustomerSettingsClient } from "@/components/settings/CustomerSettingsClient";

export default async function SettingsPage() {
  const settings = await getAppSettings();

  return <CustomerSettingsClient mailSettings={settings} />;
}
