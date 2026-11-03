import type { ScreenId } from "@/types";

export const groups: { title: string; screens: [ScreenId, string][] }[] = [
  { title: "Onboarding", screens: [["T-00", "Splash"], ["T-01", "Language select"], ["T-02", "Permission guide"]] },
  { title: "Map & Audio Guide", screens: [["T-10", "Map home"], ["T-11", "Building list"], ["T-12", "Building detail"], ["T-13", "Arrival toast"], ["T-14", "Route recommendation input"], ["T-15", "Recommended route result"], ["T-16", "Navigation in progress"]] },
  { title: "Scan", screens: [["T-20", "Camera viewfinder"], ["T-21", "Single result"], ["T-22", "Low-confidence result"]] },
  { title: "Live Tour", screens: [["T-30", "Live Tour lobby"], ["T-31", "Live subtitle view"], ["T-32", "Session ended"]] },
  { title: "Ask", screens: [["T-40", "Ask start"], ["T-41", "Chat answer"], ["T-42", "No-evidence answer"], ["T-43", "Chat route"], ["T-44", "Nearby amenities"]] },
  { title: "Extras", screens: [["T-50", "Notices"], ["T-51", "Digital passport"]] },
  { title: "Hanbok Rental", screens: [["T-60", "Hanbok Rental Home"], ["T-61", "Hanbok Shop Detail"], ["T-62", "Hanbok Booking"], ["T-63", "Hanbok Payment"], ["T-64", "Booking Confirmation"], ["T-65", "My Hanbok Booking"], ["T-65A", "Hanbok Reservation QR"]] },
  { title: "Guide Mode", screens: [["G-00", "Guide Login"], ["G-01", "Create Interpretation Session"], ["G-02", "Session QR Share"], ["G-03", "Live Session Console"], ["G-04", "Session Summary"], ["G-05", "Guide Dashboard"]] },
  { title: "Edge States", screens: [["S-01", "Offline banner"], ["S-02", "Live subtitle reconnecting"], ["S-03", "Weak GPS"], ["S-04", "Guide mic off"], ["S-05", "Camera permission denied"], ["S-06", "Too many requests"]] },
];

export const mvp = new Set<ScreenId>(["T-60", "T-61", "T-62", "T-63", "T-64", "G-00", "T-10", "T-11", "T-12", "T-16", "T-31", "G-01", "G-02", "G-03", "T-40", "T-41", "T-42"]);
