"use client";

import { useSyncExternalStore } from "react";
import { getStatus, subscribe, type NarratorStatus } from "../lib/narrator";

const IDLE: NarratorStatus = { state: "idle" };

/** The shared narrator's state, for buttons that start or stop speech. */
export function useNarratorStatus(): NarratorStatus {
  return useSyncExternalStore(subscribe, getStatus, () => IDLE);
}
