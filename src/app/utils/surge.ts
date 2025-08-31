export const getSurgeMultiplier = (totalDriversNearBy: number, totalActiveRides: number): number => {
    if (totalDriversNearBy === 0) {
        return 3; //max surge
    }
    const ratio = totalActiveRides / totalDriversNearBy;
    if (ratio <= 1) return 1;
    if (ratio <= 2) return 1.5;
    if (ratio <= 3) return 2;
    return 2.5;
}

export const getTimeBasedSurge = (): number => {
  const now = new Date();
  const hour = now.getHours();

  // morning rush
  if (hour >= 7 && hour < 9) return 1.2;

  // evening rush
  if (hour >= 17 && hour < 19) return 1.2;

  return 1;
};