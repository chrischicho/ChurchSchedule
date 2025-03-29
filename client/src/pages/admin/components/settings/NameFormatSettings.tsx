import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChurchLoader } from "@/components/church-loader";
import { NameFormat, Settings } from "@shared/schema";

interface NameFormatSettingsProps {
  settings: Settings | undefined;
  isLoading: boolean;
  onNameFormatChange: (format: NameFormat) => void;
  isUpdating: boolean;
}

export function NameFormatSettings({
  settings,
  isLoading,
  onNameFormatChange,
  isUpdating
}: NameFormatSettingsProps) {

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Name Display Format</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <ChurchLoader type="users" size="sm" text="Loading settings..." />
        </CardContent>
      </Card>
    );
  }

  const currentFormat = settings?.nameFormat || 'full';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Name Display Format</CardTitle>
        <CardDescription>
          Control how member names appear throughout the app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={currentFormat}
          onValueChange={(value) => onNameFormatChange(value as NameFormat)}
          className="space-y-4"
          disabled={isUpdating}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="full" id="format-full" />
            <Label htmlFor="format-full" className="flex-1 cursor-pointer">
              <div className="font-medium">Full Name</div>
              <div className="text-muted-foreground text-sm">
                Display both first and last name (e.g., John Smith)
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="first" id="format-first" />
            <Label htmlFor="format-first" className="flex-1 cursor-pointer">
              <div className="font-medium">First Name Only</div>
              <div className="text-muted-foreground text-sm">
                Display only first name (e.g., John)
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="last" id="format-last" />
            <Label htmlFor="format-last" className="flex-1 cursor-pointer">
              <div className="font-medium">Last Name Only</div>
              <div className="text-muted-foreground text-sm">
                Display only last name (e.g., Smith)
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="initials" id="format-initials" />
            <Label htmlFor="format-initials" className="flex-1 cursor-pointer">
              <div className="font-medium">Initials Only</div>
              <div className="text-muted-foreground text-sm">
                Display only initials (e.g., JS)
              </div>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}