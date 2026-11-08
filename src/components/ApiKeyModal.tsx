/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, Key, ExternalLink, ShieldCheck, Zap, Sparkles, AlertTriangle } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasKey: boolean;
  onSaveKey?: (key: string) => void;
}

export function ApiKeyModal({ isOpen, onClose, hasKey }: ApiKeyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-800 flex flex-col gap-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Google Maps Weather API Setup</h3>
              <p className="text-xs text-slate-500">Weather Map Tiles & Global Meteorological Services</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3.5 text-xs text-slate-600 leading-relaxed">
          
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-950 text-xs">Maps Demo Key Available (No Billing Required)</div>
              <div className="text-[11px] text-emerald-800/90 mt-0.5">
                Google provides a zero-cost Maps Demo Key for prototyping Weather Map tiles and forecasts without needing a Cloud project or credit card.
              </div>
            </div>
          </div>

          {/* ApiProjectMapError Troubleshooting */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
            <div className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Resolving "ApiProjectMapError"</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900">
              This error occurs when the API key provided in Secrets has restrictions that do not include the <strong>Maps JavaScript API</strong>.
            </p>
            <ol className="list-decimal list-inside text-[11px] space-y-1 text-amber-800 font-medium pl-1">
              <li>Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline font-bold text-amber-950 inline-flex items-center gap-0.5">Google Cloud Credentials <ExternalLink className="w-3 h-3 inline" /></a>.</li>
              <li>Click your API key. Under <strong>API restrictions</strong>, add <strong>Maps JavaScript API</strong> and <strong>Places API (New)</strong> (or choose "Don't restrict key").</li>
              <li>Under <strong>Enabled APIs &amp; Services</strong>, verify that <strong>Maps JavaScript API</strong> is enabled on your Cloud project.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Secrets configured in AI Studio:</h4>
            <div className="space-y-1.5 text-slate-600 pl-1">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-mono font-bold text-sky-700 text-[11px]">VITE_GOOGLE_MAPS_API_KEY</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Public Maps JavaScript API key used by the browser to render maps, terrain/satellite views, and Places autocomplete.</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-mono font-bold text-indigo-700 text-[11px]">GOOGLE_WEATHER_API_KEY</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Backend Web Services secret key used exclusively by the server proxy for Weather (minute/hourly/daily) and Places APIs. Never revealed to the client.</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" /> Supported Weather Tile Types
            </div>
            <ul className="list-disc list-inside text-slate-600 pl-1 space-y-0.5">
              <li><code className="text-sky-700 font-mono">US_PRECIPITATION_CURRENT</code>: High-resolution United States precipitation nowcast</li>
              <li><code className="text-sky-700 font-mono">EU_PRECIPITATION_CURRENT</code>: High-resolution European precipitation nowcast</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors shadow-sm"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
}
