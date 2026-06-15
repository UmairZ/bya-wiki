"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buildLocationString, type PlacePick } from "@/lib/places/place-pick";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type Suggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  prediction: google.maps.places.PlacePrediction;
};

// Cache the places-library load across every instance of the component.
let placesLibPromise: Promise<google.maps.PlacesLibrary> | null = null;

function loadPlacesLib(): Promise<google.maps.PlacesLibrary> | null {
  if (!MAPS_API_KEY) return null;
  if (!placesLibPromise) {
    const loader = new Loader({ apiKey: MAPS_API_KEY, version: "weekly" });
    placesLibPromise = loader.importLibrary("places");
  }
  return placesLibPromise;
}

export function PlacesAutocomplete({
  inputId,
  initialText,
  placeholder,
  onTextChange,
  onPick,
  onEnter,
  autoFocus,
}: {
  inputId: string;
  initialText: string;
  placeholder?: string;
  /** Fired when the user types (free text). Clears any prior pick upstream. */
  onTextChange: (text: string) => void;
  /** Fired when the user selects a Google suggestion. */
  onPick: (pick: PlacePick) => void;
  /** Fired on Enter when no suggestion is highlighted (commit free text). */
  onEnter: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(initialText);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function fetchSuggestions(input: string) {
    const lib = await loadPlacesLib();
    if (!lib) return; // Degraded mode: no key → plain text input, no list.
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new lib.AutocompleteSessionToken();
    }
    const seq = ++seqRef.current;
    const { suggestions: results } =
      await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ["us"],
      });
    if (seq !== seqRef.current) return; // A newer keystroke superseded this.
    const mapped: Suggestion[] = results
      .map((s) => s.placePrediction)
      .filter((p): p is google.maps.places.PlacePrediction => p != null)
      .map((p) => ({
        placeId: p.placeId,
        primary: p.mainText?.text ?? p.text.text,
        secondary: p.secondaryText?.text ?? "",
        prediction: p,
      }));
    setSuggestions(mapped);
    setActiveIndex(-1);
  }

  function handleChange(value: string) {
    setText(value);
    onTextChange(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => void fetchSuggestions(value), 300);
  }

  async function handleSelect(s: Suggestion) {
    const place = s.prediction.toPlace();
    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "location", "id"],
    });
    const pick: PlacePick = {
      name: place.displayName ?? s.primary,
      address: place.formattedAddress ?? s.secondary,
      lat: place.location?.lat() ?? 0,
      lng: place.location?.lng() ?? 0,
      placeId: place.id ?? s.placeId,
    };
    // End the billing session after a selection.
    sessionTokenRef.current = null;
    setText(buildLocationString(pick.name, pick.address));
    setSuggestions([]);
    setActiveIndex(-1);
    onPick(pick);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length > 0 && e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
      return;
    }
    if (suggestions.length > 0 && e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (e.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        void handleSelect(suggestions[activeIndex]);
      } else {
        onEnter();
      }
    }
  }

  return (
    <div className="relative">
      <Input
        id={inputId}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
          {suggestions.map((s, i) => (
            <li key={s.placeId}>
              <button
                type="button"
                // onMouseDown (not onClick) so it fires before the input blur.
                onMouseDown={(e) => {
                  e.preventDefault();
                  void handleSelect(s);
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  i === activeIndex ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <MapPin
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-foreground">
                    {s.primary}
                  </span>
                  {s.secondary && (
                    <span className="truncate text-xs text-muted-foreground">
                      {s.secondary}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
