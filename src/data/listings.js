/**
 * listings.js
 * Eight fictional sample homes for the Choose a home screen, spread across
 * Melbourne. Coordinates are approximate suburb centres; "available from"
 * dates are always calculated from TODAY at app load (1 to 8 weeks out) so
 * they never go stale. Four rents are pinned to $380 / $420 / $450 / $480
 * so the affordability tiers demo cleanly.
 */
import { TODAY, addWeeks, toISODate } from '../utils/dates';

const SAMPLE_LISTINGS = [
  { id: 'coburg-1b', suburb: 'Coburg', type: 'Apartment', bedrooms: 1, weeklyRent: 310, lat: -37.744, lng: 144.966, availableInWeeks: 1 },
  { id: 'sunshine-1b', suburb: 'Sunshine', type: 'Unit', bedrooms: 1, weeklyRent: 350, lat: -37.79, lng: 144.832, availableInWeeks: 1 },
  { id: 'footscray-2b', suburb: 'Footscray', type: 'Townhouse', bedrooms: 2, weeklyRent: 380, lat: -37.799, lng: 144.9, availableInWeeks: 2 },
  { id: 'brunswick-2b', suburb: 'Brunswick', type: 'Apartment', bedrooms: 2, weeklyRent: 420, lat: -37.766, lng: 144.962, availableInWeeks: 3 },
  { id: 'preston-3b', suburb: 'Preston', type: 'Townhouse', bedrooms: 3, weeklyRent: 395, lat: -37.674, lng: 145.0, availableInWeeks: 4 },
  { id: 'bentleigh-2b', suburb: 'Bentleigh', type: 'Unit', bedrooms: 2, weeklyRent: 450, lat: -37.925, lng: 145.04, availableInWeeks: 5 },
  { id: 'brighton-2b', suburb: 'Brighton', type: 'House', bedrooms: 2, weeklyRent: 480, lat: -37.917, lng: 144.99, availableInWeeks: 6 },
  { id: 'werribee-3b', suburb: 'Werribee', type: 'House', bedrooms: 3, weeklyRent: 520, lat: -37.9, lng: 144.66, availableInWeeks: 8 },
];

export const LISTINGS = SAMPLE_LISTINGS.map((listing) => ({
  ...listing,
  availableFrom: toISODate(addWeeks(TODAY, listing.availableInWeeks)),
}));