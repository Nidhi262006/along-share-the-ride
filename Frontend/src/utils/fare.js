export function splitFareInPaise(totalPaise, people) {
  if (!Number.isSafeInteger(totalPaise) || totalPaise < 0 || !Number.isSafeInteger(people) || people < 1) {
    throw new Error("A non-negative paise total and positive whole-person count are required");
  }
  const baseShare = Math.floor(totalPaise / people);
  const remainder = totalPaise % people;
  return [
    ...(remainder ? [{ people: remainder, eachPaise: baseShare + 1 }] : []),
    ...(people - remainder ? [{ people: people - remainder, eachPaise: baseShare }] : []),
  ];
}