/**
 * suburbs.js
 * 30 well-known Melbourne suburbs with approximate coordinates for each
 * suburb's centre (accurate to within a few hundred metres — plenty for
 * "nearest suburb" and "3.2 km away" purposes). Alphabetical by name so
 * the select renders in order without extra sorting. No external map or
 * location service is ever used.
 */
export const SUBURBS = [
  { name: 'Bentleigh', lat: -37.925, lng: 145.04 },
  { name: 'Box Hill', lat: -37.819, lng: 145.122 },
  { name: 'Brunswick', lat: -37.766, lng: 144.962 },
  { name: 'Camberwell', lat: -37.841, lng: 145.062 },
  { name: 'Caulfield', lat: -37.882, lng: 145.028 },
  { name: 'Coburg', lat: -37.744, lng: 144.966 },
  { name: 'Collingwood', lat: -37.8, lng: 144.988 },
  { name: 'Dandenong', lat: -37.988, lng: 145.214 },
  { name: 'Doncaster', lat: -37.784, lng: 145.124 },
  { name: 'Elsternwick', lat: -37.886, lng: 144.995 },
  { name: 'Essendon', lat: -37.811, lng: 144.917 },
  { name: 'Fitzroy', lat: -37.798, lng: 144.978 },
  { name: 'Footscray', lat: -37.799, lng: 144.9 },
  { name: 'Glen Waverley', lat: -37.883, lng: 145.166 },
  { name: 'Hawthorn', lat: -37.823, lng: 145.034 },
  { name: 'Heidelberg', lat: -37.757, lng: 145.072 },
  { name: 'Kew', lat: -37.813, lng: 145.037 },
  { name: 'Malvern', lat: -37.884, lng: 145.04 },
  { name: 'Melbourne CBD', lat: -37.813, lng: 144.963 },
  { name: 'Moonee Ponds', lat: -37.762, lng: 144.922 },
  { name: 'Mount Waverley', lat: -37.874, lng: 145.121 },
  { name: 'Northcote', lat: -37.769, lng: 144.999 },
  { name: 'Preston', lat: -37.674, lng: 145.0 },
  { name: 'Reservoir', lat: -37.712, lng: 145.006 },
  { name: 'Richmond', lat: -37.823, lng: 145.0 },
  { name: 'St Kilda', lat: -37.867, lng: 144.971 },
  { name: 'Sunshine', lat: -37.79, lng: 144.832 },
  { name: 'Thornbury', lat: -37.758, lng: 144.999 },
  { name: 'Werribee', lat: -37.9, lng: 144.66 },
  { name: 'Yarraville', lat: -37.812, lng: 144.886 },
];