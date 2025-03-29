import { NameFormatSettings } from "./NameFormatSettings";
import { DeadlineSettings } from "./DeadlineSettings";
import { useSettings } from "./useSettings";

export function AdminSettings() {
  const {
    // Data
    settings,
    isLoading,
    
    // Handlers
    handleNameFormatChange,
    handleDeadlineDayChange,
    
    // Mutation states
    isUpdatingNameFormat,
    isUpdatingDeadline
  } = useSettings();

  return (
    <div className="space-y-6">
      <NameFormatSettings
        settings={settings}
        isLoading={isLoading}
        onNameFormatChange={handleNameFormatChange}
        isUpdating={isUpdatingNameFormat}
      />
      
      <DeadlineSettings
        settings={settings}
        isLoading={isLoading}
        onDeadlineDayChange={handleDeadlineDayChange}
        isUpdating={isUpdatingDeadline}
      />
    </div>
  );
}