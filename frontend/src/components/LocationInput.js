import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

export const LocationInput = ({ label, value, onChange, placeholder }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid={`location-input-${label.toLowerCase().replace(' ', '-')}`}
          type="text"
          placeholder={placeholder || 'Enter location'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="pl-10 border-2 focus:border-[#007AFF] transition-colors"
        />
      </div>
    </div>
  );
};