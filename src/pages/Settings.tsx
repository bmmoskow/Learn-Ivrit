import SettingsUI from '../components/Settings/SettingsUI';
import { useSettings } from '../components/Settings/useSettings';

export default function Settings() {
  const settingsHook = useSettings();

  if (!settingsHook.user) {
    return null;
  }

  return <SettingsUI {...settingsHook} user={settingsHook.user} />;
}
