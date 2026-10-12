/** Who is making a request. Keys are stable and never contain raw IPs. */
export type Identity = { kind: "user"; userId: string; key: string } | { kind: "anonymous"; key: string };

export function userIdentity(userId: string): Identity {
  return { kind: "user", userId, key: `u:${userId}` };
}

export function anonymousIdentity(ipHash: string): Identity {
  return { kind: "anonymous", key: `ip:${ipHash}` };
}
