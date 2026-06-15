import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLocationString, toLocationFields } from "./place-pick";

test("buildLocationString joins name and address", () => {
  assert.equal(
    buildLocationString("Bilal Masjid", "123 Main St, Hayward, CA"),
    "Bilal Masjid, 123 Main St, Hayward, CA",
  );
});

test("buildLocationString avoids duplicating the name when the address starts with it", () => {
  assert.equal(
    buildLocationString("Bilal Masjid", "Bilal Masjid, 123 Main St"),
    "Bilal Masjid, 123 Main St",
  );
});

test("buildLocationString handles a missing part", () => {
  assert.equal(buildLocationString("", "123 Main St"), "123 Main St");
  assert.equal(buildLocationString("Bilal Masjid", ""), "Bilal Masjid");
  assert.equal(buildLocationString("  ", "  "), "");
});

test("toLocationFields with a pick fills structured columns", () => {
  const f = toLocationFields(
    { name: "Bilal Masjid", address: "123 Main St", lat: 37.6, lng: -122.0, placeId: "abc" },
    "ignored",
  );
  assert.equal(f.location, "Bilal Masjid, 123 Main St");
  assert.equal(f.location_name, "Bilal Masjid");
  assert.equal(f.location_address, "123 Main St");
  assert.equal(f.location_lat, 37.6);
  assert.equal(f.location_lng, -122.0);
  assert.equal(f.location_place_id, "abc");
});

test("toLocationFields with free text clears structured columns", () => {
  const f = toLocationFields(null, "  Main Hall  ");
  assert.equal(f.location, "Main Hall");
  assert.equal(f.location_name, null);
  assert.equal(f.location_address, null);
  assert.equal(f.location_lat, null);
  assert.equal(f.location_lng, null);
  assert.equal(f.location_place_id, null);
});

test("toLocationFields with empty free text nulls location", () => {
  const f = toLocationFields(null, "   ");
  assert.equal(f.location, null);
});
