import { useState } from 'react';
import { Building, Building2, Check, Home, Hotel } from 'lucide-react';
import InputField from '../components/InputField';
import Button from '../components/Button';
import ScreenShell from '../components/ScreenShell';
import { LISTINGS } from '../data/listings';
import { SUBURBS } from '../data/suburbs';
import { distanceKm } from '../utils/geo';
import { formatAUDayMonth, parseISODate } from '../utils/dates';

const SUBURB_OPTIONS = SUBURBS.map((suburb) => ({ value: suburb.name, label: suburb.name }));

// Simple type → icon mapping so cards read as homes rather than photos.
const TYPE_ICONS = {
  Apartment: Hotel,
  Townhouse: Building2,
  Unit: Building,
  House: Home,
};

/**
 * ChooseHome
 * Screen 3 — "Choose a home". Eight fictional sample homes anchored to the
 * renter's current suburb: nearest first, with straight-line distances,
 * availability measured against their move-in date, and a view-only
 * selector for browsing near a different suburb. Selecting a card sets the
 * weekly rent used everywhere downstream. Continue stays disabled until a
 * home is picked.
 *
 * Props:
 * @param {string} currentSuburb - The suburb chosen on About you (default anchor).
 * @param {string} moveInDate - The move-in date chosen on About you (yyyy-mm-dd).
 * @param {object|null} selectedHome - The currently selected listing, owned by App.
 * @param {(listing: object) => void} onSelect - Lifts the selection up to App.
 * @param {() => void} onNext - Advances to Your finances (once a home is selected).
 * @param {() => void} onBack - Returns to About you.
 */
export default function ChooseHome({
  currentSuburb,
  moveInDate,
  selectedHome,
  onSelect,
  onNext,
  onBack,
}) {
  // View-only anchor: switching this re-sorts and re-measures, but never
  // overwrites the suburb the user gave on About you.
  const [referenceSuburb, setReferenceSuburb] = useState(currentSuburb || SUBURBS[0].name);
  const reference = SUBURBS.find((suburb) => suburb.name === referenceSuburb) || SUBURBS[0];

  const listingsWithDistance = LISTINGS.map((listing) => ({
    ...listing,
    distanceKmAway: distanceKm(reference.lat, reference.lng, listing.lat, listing.lng),
  })).sort((a, b) => a.distanceKmAway - b.distanceKmAway);

  return (
    <ScreenShell
      progress={1}
      footer="Sample homes only — not real listings, and nothing is saved."
    >
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Homes near {referenceSuburb}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Pick the home you'd like to apply for — its rent flows through to the rest of
          your application.
        </p>
      </div>

      <InputField
        label="Looking near a different suburb?"
        name="browseSuburb"
        type="select"
        options={SUBURB_OPTIONS}
        value={referenceSuburb}
        onChange={(_, value) => setReferenceSuburb(value)}
      />

      <div className="mt-4 space-y-3">
        {listingsWithDistance.map((listing) => {
          const Icon = TYPE_ICONS[listing.type] || Home;
          const isSelected = selectedHome?.id === listing.id;
          const availableByMoveIn =
            moveInDate && listing.availableFrom <= moveInDate;

          return (
            <button
              key={listing.id}
              type="button"
              onClick={() => onSelect(listing)}
              aria-pressed={isSelected}
              className={`w-full rounded-2xl border p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
                isSelected
                  ? 'border-teal-500 bg-teal-50/60 ring-1 ring-teal-500'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-teal-600 ring-1 ring-slate-200">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isSelected
                      ? 'border-teal-500 bg-teal-500 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" aria-hidden="true" />}
                </span>
              </div>

              <div className="mt-3 flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    Sample listing
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-slate-900">
                    {listing.suburb}
                  </p>
                  <p className="text-sm text-slate-500">
                    {listing.type} · {listing.bedrooms} bed{listing.bedrooms === 1 ? '' : 's'}
                  </p>
                </div>
                <p className="text-right text-lg font-bold text-slate-900">
                  ${listing.weeklyRent}
                  <span className="block text-[11px] font-medium text-slate-400">per week</span>
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2.5 text-xs">
                <span className="flex items-center gap-1 font-medium text-slate-500">
                  <span aria-hidden="true">📍</span>
                  {listing.distanceKmAway.toFixed(1)} km from {referenceSuburb}
                </span>
                {availableByMoveIn ? (
                  <span className="font-medium text-emerald-600">
                    Available by your move-in date
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Available from {formatAUDayMonth(parseISODate(listing.availableFrom))}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {listingsWithDistance.length === 0 && (
        <p className="mt-4 text-center text-sm text-slate-500">
          No sample homes listed near {referenceSuburb} yet — try another suburb.
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Button label="Back" onClick={onBack} variant="secondary" className="flex-1" />
        <Button
          label="Continue"
          onClick={onNext}
          variant="primary"
          disabled={!selectedHome}
          className="flex-[2]"
        />
      </div>
    </ScreenShell>
  );
}