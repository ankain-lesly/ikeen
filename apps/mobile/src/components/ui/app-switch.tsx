import React from 'react';
import { Host, Switch } from '@expo/ui/jetpack-compose';

export interface AppSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function AppSwitch({ value, onValueChange, disabled }: AppSwitchProps) {
  return (
    <Host matchContents>
      <Switch
        value={value}
        onCheckedChange={onValueChange}
        enabled={!disabled}
      />
    </Host>
  );
}

export default AppSwitch;
