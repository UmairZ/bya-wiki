/** A place chosen from Google Places autocomplete, reduced to the fields we
 *  store. */
export type PlacePick = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
};

/** The full set of location-related columns we write to draft_events. */
export type LocationFields = {
  location: string | null;
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_place_id: string | null;
};

/** Human-readable single line combining the official name and address.
 *  Falls back gracefully when one part is missing, and avoids "Name, Name…"
 *  when the formatted address already starts with the name. */
export function buildLocationString(name: string, address: string): string {
  const n = name.trim();
  const a = address.trim();
  if (n && a) {
    return a.startsWith(n) ? a : `${n}, ${a}`;
  }
  return n || a;
}

/** Build the DB field set from either a structured Google pick or raw free
 *  text. A pick fills the structured columns; free text clears them and stores
 *  only the trimmed `location` string (null when empty). */
export function toLocationFields(
  pick: PlacePick | null,
  rawText: string,
): LocationFields {
  if (pick) {
    return {
      location: buildLocationString(pick.name, pick.address),
      location_name: pick.name.trim() || null,
      location_address: pick.address.trim() || null,
      location_lat: pick.lat,
      location_lng: pick.lng,
      location_place_id: pick.placeId,
    };
  }
  const trimmed = rawText.trim();
  return {
    location: trimmed === "" ? null : trimmed,
    location_name: null,
    location_address: null,
    location_lat: null,
    location_lng: null,
    location_place_id: null,
  };
}
