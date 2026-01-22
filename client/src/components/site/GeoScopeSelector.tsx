import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Globe } from "lucide-react";

export interface GeoScopeValue {
  scope: 'local' | 'national';
  city?: string;
  state?: string;
  country?: string;
}

interface GeoScopeSelectorProps {
  value: GeoScopeValue;
  onChange: (value: GeoScopeValue) => void;
}

export function GeoScopeSelector({ value, onChange }: GeoScopeSelectorProps) {
  const handleScopeChange = (newScope: 'local' | 'national') => {
    onChange({
      scope: newScope,
      city: newScope === 'local' ? value.city : undefined,
      state: newScope === 'local' ? value.state : undefined,
      country: newScope === 'local' ? (value.country || 'United States') : undefined,
    });
  };

  const handleLocationChange = (field: 'city' | 'state' | 'country', fieldValue: string) => {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  return (
    <div className="space-y-6" data-testid="geo-scope-selector">
      <div className="space-y-2">
        <Label className="text-base font-medium text-slate-900">
          How should we evaluate your search rankings?
        </Label>
      </div>

      <RadioGroup
        value={value.scope}
        onValueChange={(v) => handleScopeChange(v as 'local' | 'national')}
        className="space-y-3"
      >
        <label
          htmlFor="scope-local"
          className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
            value.scope === 'local'
              ? 'border-violet-500 bg-violet-50/50'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <RadioGroupItem value="local" id="scope-local" className="mt-0.5" data-testid="radio-local" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-violet-600" />
              <span className="font-medium text-slate-900">Local</span>
              <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">
                Recommended for most businesses
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Use this if customers find you in a specific city or area.
            </p>
          </div>
        </label>

        <label
          htmlFor="scope-national"
          className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
            value.scope === 'national'
              ? 'border-violet-500 bg-violet-50/50'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <RadioGroupItem value="national" id="scope-national" className="mt-0.5" data-testid="radio-national" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-600" />
              <span className="font-medium text-slate-900">National</span>
            </div>
            <p className="text-sm text-slate-600">
              Use this if you serve customers across the entire country.
            </p>
          </div>
        </label>
      </RadioGroup>

      {value.scope === 'local' && (
        <div 
          className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200"
          data-testid="location-inputs"
        >
          <p className="text-sm font-medium text-slate-700">
            Enter your business location for accurate local ranking data:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm text-slate-600">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                type="text"
                placeholder="Orlando"
                value={value.city || ''}
                onChange={(e) => handleLocationChange('city', e.target.value)}
                className="bg-white"
                data-testid="input-city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm text-slate-600">
                State <span className="text-red-500">*</span>
              </Label>
              <Input
                id="state"
                type="text"
                placeholder="FL"
                value={value.state || ''}
                onChange={(e) => handleLocationChange('state', e.target.value)}
                className="bg-white"
                data-testid="input-state"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm text-slate-600">
                Country
              </Label>
              <Input
                id="country"
                type="text"
                placeholder="United States"
                value={value.country || 'United States'}
                onChange={(e) => handleLocationChange('country', e.target.value)}
                className="bg-white"
                data-testid="input-country"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
